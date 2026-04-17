import React, { useState } from 'react';
import { C } from '../../data/theme.js';
import { SERIES_CONFIG } from '../../data/seriesConfig.js';
import PopoSpeech from '../common/PopoSpeech.jsx';

// ── 半期グラフコンポーネント ──
// 元HTML 3477-3650行。
export default function HalfYearBlock({ months, kanshi, data, currentMonth, popoText }) {
  const [activeSeries, setActiveSeries] = useState(['total']);
  const [tooltip, setTooltip] = useState(null);

  const W = 580, H = 200, PAD = { top: 16, right: 20, bottom: 40, left: 36 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const n = months.length;
  const xPos = (i) => PAD.left + (i / (n - 1)) * innerW;

  // データ全体の最小値・最大値から余裕を持ったY軸レンジを動的計算
  const allVals = [...(data.total || []), ...(data.love || []), ...(data.work || []), ...(data.money || [])];
  const dataMin = Math.min(...allVals);
  const dataMax = Math.max(...allVals);
  const yFloor = Math.max(0,   Math.floor((dataMin - 10) / 10) * 10);
  const yCeil  = Math.min(100, Math.ceil( (dataMax + 10) / 10) * 10);
  const yRange = yCeil - yFloor || 60;
  const yPos = (v) => PAD.top + innerH - ((v - yFloor) / yRange) * innerH;

  const toggle = (k) => setActiveSeries((prev) =>
    prev.includes(k)
      ? (prev.length > 1 ? prev.filter((x) => x !== k) : prev)
      : [...prev, k],
  );

  const makePolyline = (vals) =>
    vals.map((v, i) => `${xPos(i)},${yPos(v)}`).join(' ');

  const makeArea = (vals) => {
    const top = vals.map((v, i) => `${xPos(i)},${yPos(v)}`).join(' L ');
    const bottom = `L ${xPos(n - 1)},${PAD.top + innerH} L ${xPos(0)},${PAD.top + innerH} Z`;
    return `M ${top} ${bottom}`;
  };

  return (
    <div>
      {/* 凡例 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
        {SERIES_CONFIG.map((s) => (
          <button key={s.key} onClick={() => toggle(s.key)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 20, cursor: 'pointer',
            background: activeSeries.includes(s.key) ? 'rgba(255,255,255,0.05)' : 'transparent',
            border: `1px solid ${activeSeries.includes(s.key) ? s.color : 'rgba(255,255,255,0.1)'}`,
            color: activeSeries.includes(s.key) ? s.color : 'rgba(240,230,208,0.3)',
            fontSize: 12, transition: 'all 0.2s',
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: activeSeries.includes(s.key) ? s.color : 'rgba(255,255,255,0.1)',
              flexShrink: 0,
            }} />
            {s.label}
          </button>
        ))}
        <button
          onClick={() => setActiveSeries((prev) => prev.length === 4 ? ['total'] : ['total', 'love', 'work', 'money'])}
          style={{
            padding: '5px 10px', borderRadius: 20, cursor: 'pointer',
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(240,230,208,0.3)', fontSize: 11, transition: 'all 0.2s',
          }}
        >
          {activeSeries.length === 4 ? '絞る' : '全表示'}
        </button>
      </div>

      {/* SVGグラフ */}
      <div style={{ overflowX: 'auto', marginBottom: 16 }}>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ minWidth: 320 }}>
          <defs>
            {SERIES_CONFIG.map((s) => (
              <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity="0.25" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>

          {/* グリッドライン */}
          {Array.from({ length: 5 }, (_, i) => Math.round(yFloor + (i / 4) * yRange)).map((v) => (
            <g key={v}>
              <line
                x1={PAD.left} y1={yPos(v)} x2={PAD.left + innerW} y2={yPos(v)}
                stroke="rgba(255,255,255,0.05)" strokeWidth={1}
              />
              <text
                x={PAD.left - 8} y={yPos(v) + 1}
                textAnchor="end" dominantBaseline="middle"
                fill="rgba(240,230,208,0.25)" fontSize={10}
              >{v}</text>
            </g>
          ))}

          {/* 現在月の縦線 */}
          {currentMonth !== null && months.indexOf(`${currentMonth}月`) >= 0 && (
            <line
              x1={xPos(months.indexOf(`${currentMonth}月`))}
              y1={PAD.top}
              x2={xPos(months.indexOf(`${currentMonth}月`))}
              y2={PAD.top + innerH}
              stroke="rgba(201,168,76,0.4)" strokeWidth={1.5} strokeDasharray="4 3"
            />
          )}

          {/* エリア＆ライン */}
          {SERIES_CONFIG.filter((s) => activeSeries.includes(s.key)).map((s, idx, arr) => (
            <g key={s.key}>
              {arr.length === 1 && (
                <path d={makeArea(data[s.key])} fill={`url(#grad-${s.key})`} />
              )}
              {/* 影レイヤー */}
              <polyline
                points={makePolyline(data[s.key])}
                fill="none" stroke="rgba(0,0,0,0.5)"
                strokeWidth={s.sw + 3}
                strokeLinejoin="round" strokeLinecap="round"
              />
              <polyline
                points={makePolyline(data[s.key])}
                fill="none" stroke={s.color}
                strokeWidth={s.sw}
                strokeDasharray={s.dash}
                strokeLinejoin="round" strokeLinecap="round"
                style={{ filter: arr.length === 1 ? `drop-shadow(0 0 6px ${s.color})` : `drop-shadow(0 0 2px ${s.color})` }}
              />
              {data[s.key].map((v, i) => (
                <g key={i}>
                  <circle cx={xPos(i)} cy={yPos(v)} r={s.dot + 2} fill="rgba(0,0,0,0.6)" stroke="none" />
                  <circle
                    cx={xPos(i)} cy={yPos(v)} r={s.dot}
                    fill={C.bg} stroke={s.color} strokeWidth={2}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setTooltip({ i, key: s.key, v, label: s.label, x: xPos(i), y: yPos(v), color: s.color })}
                    onMouseLeave={() => setTooltip(null)}
                  />
                </g>
              ))}
            </g>
          ))}

          {/* ツールチップ */}
          {tooltip && (
            <g>
              <rect
                x={tooltip.x - 32} y={tooltip.y - 46}
                width={64} height={38} rx={6}
                fill="rgba(20,14,8,0.92)" stroke={tooltip.color} strokeWidth={1.5}
              />
              <text
                x={tooltip.x} y={tooltip.y - 30}
                textAnchor="middle" fill={tooltip.color}
                fontSize={10} fontFamily="'Noto Sans JP',sans-serif"
              >{tooltip.label}</text>
              <text
                x={tooltip.x} y={tooltip.y - 15}
                textAnchor="middle" fill={tooltip.color}
                fontSize={14} fontFamily="'Shippori Mincho',serif" fontWeight="700"
              >{tooltip.v}</text>
            </g>
          )}

          {/* X軸 月ラベル */}
          {months.map((m, i) => (
            <g key={i}>
              <text
                x={xPos(i)} y={PAD.top + innerH + 16}
                textAnchor="middle"
                fill={currentMonth !== null && m === `${currentMonth}月` ? C.gold : 'rgba(240,230,208,0.35)'}
                fontSize={11} fontFamily="'Noto Sans JP',sans-serif"
              >{m}</text>
              <text
                x={xPos(i)} y={PAD.top + innerH + 30}
                textAnchor="middle" fill="rgba(240,230,208,0.2)" fontSize={9}
              >{kanshi[i]}</text>
            </g>
          ))}
        </svg>
      </div>

      {/* 月別スコア一覧 */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${months.length}, 1fr)`, gap: 6, marginBottom: 18 }}>
        {months.map((m, i) => {
          const isCurrent = currentMonth !== null && m === `${currentMonth}月`;
          const avg = Math.round(SERIES_CONFIG.reduce((s, c) => s + data[c.key][i], 0) / SERIES_CONFIG.length);
          return (
            <div key={i} style={{
              textAlign: 'center', padding: '10px 4px', borderRadius: 10,
              background: isCurrent ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${isCurrent ? 'rgba(201,168,76,0.35)' : 'rgba(255,255,255,0.06)'}`,
            }}>
              <p style={{ fontSize: 10, color: isCurrent ? C.gold : C.textMuted, marginBottom: 4 }}>{m}</p>
              <p style={{ fontFamily: "'Shippori Mincho',serif", fontSize: 18, fontWeight: 700, color: isCurrent ? C.gold : C.textSub }}>{avg}</p>
              <p style={{ fontSize: 9, color: C.textMuted, marginTop: 2 }}>{kanshi[i]}</p>
            </div>
          );
        })}
      </div>

      <PopoSpeech text={popoText} />
    </div>
  );
}
