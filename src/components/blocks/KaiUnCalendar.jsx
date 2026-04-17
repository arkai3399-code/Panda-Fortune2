import React, { useState } from 'react';
import { C } from '../../data/theme.js';
import { KAN, SHI, getStem, getBranch, getKanshi } from '../../data/kanshi.js';
import { getRokuyo, ROKUYO_COLORS, SPECIAL_DAYS_2026 } from '../../data/calendar2026.js';
import { getLuckyLevel, getKaiUnRank } from '../../logic/fortuneCalc.js';

// ── 開運日カレンダー ──
// 元HTML 2777-3092行。
export default function KaiUnCalendar({ calc }) {
  const _today = new Date();
  const TODAY = { y: _today.getFullYear(), m: _today.getMonth() + 1, d: _today.getDate() };
  const [viewYear, setViewYear]   = useState(TODAY.y);
  const [viewMonth, setViewMonth] = useState(TODAY.m);
  const [selected, setSelected]   = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [tooltip, setTooltip]     = useState(null);

  const prevMonth = () => {
    if (viewMonth === 1) { setViewYear((y) => y - 1); setViewMonth(12); }
    else setViewMonth((m) => m - 1);
    setSelected(null);
  };
  const nextMonth = () => {
    if (viewMonth === 12) { setViewYear((y) => y + 1); setViewMonth(1); }
    else setViewMonth((m) => m + 1);
    setSelected(null);
  };

  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const firstDow    = new Date(viewYear, viewMonth - 1, 1).getDay(); // 0=日

  // 月の干支情報
  const monthKanshi = getKanshi(viewYear, viewMonth, 1);

  // 今月の開運日リスト（rank超開運・大開運のみ）
  const kaiUnDays = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const stem = getStem(viewYear, viewMonth, d);
    const ry   = getRokuyo(viewYear, viewMonth, d);
    const ks   = getKanshi(viewYear, viewMonth, d);
    const rank = getKaiUnRank(stem, ry, calc);
    if (rank.stars >= 2) kaiUnDays.push({ d, ks, ry, rank });
  }

  const BG    = '#1a0c02';
  const GOLD  = '#C9A84C';
  const GOLD2 = '#e8c97a';
  const MUTED = 'rgba(232,228,217,0.35)';
  const SUB   = 'rgba(232,228,217,0.6)';

  return (
    <div style={{ background: BG, borderRadius: 16, padding: '20px 16px', border: '1px solid rgba(201,168,76,0.15)' }}>
      {/* ヘッダー */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <p style={{ fontSize: 10, letterSpacing: '0.4em', color: GOLD, marginBottom: 4, fontWeight: 600, opacity: 0.8 }}>LUCKY DAY CALENDAR</p>
          <h3 style={{ fontFamily: "'Shippori Mincho',serif", fontSize: 20, color: GOLD2, fontWeight: 700 }}>
            {viewYear}年 {viewMonth}月
            <span style={{ fontSize: 13, color: MUTED, fontWeight: 400, marginLeft: 10 }}>{monthKanshi}月</span>
          </h3>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={prevMonth} style={{ padding: '6px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: SUB, cursor: 'pointer', fontSize: 16 }}>‹</button>
          <button onClick={() => { setViewYear(TODAY.y); setViewMonth(TODAY.m); }} style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.4)', color: GOLD, cursor: 'pointer', fontSize: 11, letterSpacing: '0.05em', fontWeight: 600 }}>今月</button>
          <button onClick={nextMonth} style={{ padding: '6px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: SUB, cursor: 'pointer', fontSize: 16 }}>›</button>
        </div>
      </div>

      {/* 凡例 */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
        {[
          { bg: '#C9A84C', label: '超開運日（大安＋壬・癸）' },
          { bg: '#8a7040', label: '大開運日（庚・辛＋大安など）' },
          { bg: '#3a7a3a', label: '吉日' },
          { bg: '#7a2a2a', label: '要注意日' },
        ].map((l, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: MUTED }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: l.bg, display: 'inline-block', flexShrink: 0 }} />
            {l.label}
          </div>
        ))}
      </div>

      {/* カレンダーグリッド */}
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 340 }}>
          {/* 曜日ヘッダー */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 4 }}>
            {['日', '月', '火', '水', '木', '金', '土'].map((w, i) => (
              <div key={i} style={{
                textAlign: 'center', padding: '6px 2px', fontSize: 11, fontWeight: 700,
                color: i === 0 ? 'rgba(220,100,90,0.9)' : i === 6 ? 'rgba(100,160,220,0.9)' : 'rgba(232,228,217,0.45)',
                letterSpacing: '0.1em',
              }}>{w}</div>
            ))}
          </div>

          {/* 日付グリッド */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
            {/* 空白 */}
            {Array.from({ length: firstDow }, (_, i) => <div key={`e${i}`} />)}

            {/* 日付セル */}
            {Array.from({ length: daysInMonth }, (_, idx) => {
              const d    = idx + 1;
              const dow  = (firstDow + idx) % 7;
              const stem = getStem(viewYear, viewMonth, d);
              const ry   = getRokuyo(viewYear, viewMonth, d);
              const ks   = getKanshi(viewYear, viewMonth, d);
              const rank = getKaiUnRank(stem, ry, calc);
              const isToday = viewYear === TODAY.y && viewMonth === TODAY.m && d === TODAY.d;
              const isSel   = selected === d;
              const specKey = `${viewYear}-${viewMonth}-${d}`;
              const special = SPECIAL_DAYS_2026[specKey];

              // セルの背景・ボーダー
              let cellBg, cellBorder, dateColor;
              if (isToday) {
                cellBg = 'linear-gradient(135deg, #1a1a2e 0%, #2d2d5a 100%)';
                cellBorder = '2.5px solid #e8c96a';
                dateColor = '#e8c96a';
              } else if (isSel) {
                cellBg = rank.bg || 'rgba(184,146,42,0.08)';
                cellBorder = `2px solid ${rank.border || '#b8922a'}`;
                dateColor = rank.textColor !== C.textMuted ? rank.textColor : '#1a1a2e';
              } else if (rank.stars === 3) {
                cellBg = 'rgba(184,146,42,0.12)';
                cellBorder = '1px solid rgba(184,146,42,0.5)';
                dateColor = '#7d5d0a';
              } else if (rank.stars === 2) {
                cellBg = 'rgba(138,112,64,0.1)';
                cellBorder = '1px solid rgba(138,112,64,0.4)';
                dateColor = '#5a4a20';
              } else if (rank.stars === 1) {
                cellBg = 'rgba(58,122,58,0.08)';
                cellBorder = '1px solid rgba(58,122,58,0.3)';
                dateColor = '#2a6a2a';
              } else if (rank.stars === 0 && rank.rank) {
                cellBg = 'rgba(138,42,42,0.08)';
                cellBorder = '1px solid rgba(138,42,42,0.25)';
                dateColor = '#8a2a2a';
              } else {
                cellBg = 'rgba(255,255,255,0.03)';
                cellBorder = '1px solid #e8e4d8';
                dateColor = dow === 0 ? '#c0392b' : dow === 6 ? '#2471a3' : '#333';
              }

              return (
                <div
                  key={d}
                  onClick={() => setSelected(isSel ? null : d)}
                  style={{
                    borderRadius: 10, padding: '8px 4px 6px',
                    background: cellBg,
                    border: cellBorder,
                    cursor: 'pointer', position: 'relative',
                    transition: 'all 0.18s',
                    boxShadow: isToday
                      ? '0 0 0 3px rgba(232,201,106,0.4), 0 4px 16px rgba(26,26,46,0.35)'
                      : isSel ? '0 2px 8px rgba(0,0,0,0.12)' : 'none',
                    minHeight: 72,
                    transform: isToday ? 'scale(1.04)' : 'scale(1)',
                    zIndex: isToday ? 2 : 1,
                  }}
                >
                  {/* 超開運バッジ */}
                  {rank.stars === 3 && (
                    <div style={{
                      position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)',
                      background: 'linear-gradient(135deg,#b8922a,#e8c97a)',
                      borderRadius: 10, padding: '1px 7px', fontSize: 8, color: '#fff', fontWeight: 800,
                      whiteSpace: 'nowrap', zIndex: 2, boxShadow: '0 2px 6px rgba(184,146,42,0.5)',
                    }}>✦超開運</div>
                  )}
                  {rank.stars === 2 && (
                    <div style={{
                      position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)',
                      background: '#8a7040',
                      borderRadius: 10, padding: '1px 7px', fontSize: 8, color: '#fff',
                      fontWeight: 700, whiteSpace: 'nowrap', zIndex: 2,
                    }}>★大開運</div>
                  )}

                  {/* 今日マーカー */}
                  {isToday && (
                    <div style={{
                      position: 'absolute', top: 4, right: 5, width: 6, height: 6,
                      borderRadius: '50%', background: '#e8c96a',
                      boxShadow: '0 0 6px #e8c96a',
                    }} />
                  )}

                  {/* 日付数字 */}
                  <p style={{
                    textAlign: 'center', fontSize: isToday ? 18 : 16,
                    fontFamily: "'Shippori Mincho',serif", fontWeight: 800, lineHeight: 1,
                    color: isToday ? '#e8c96a'
                      : dow === 0 ? 'rgba(220,100,90,0.9)'
                      : dow === 6 ? 'rgba(100,160,220,0.9)'
                      : dateColor,
                    marginBottom: 2,
                  }}>{d}</p>

                  {/* 今日ラベル */}
                  {isToday && (
                    <p style={{ textAlign: 'center', fontSize: 8, color: '#e8c96a', fontWeight: 700, letterSpacing: '0.05em', marginBottom: 1 }}>TODAY</p>
                  )}

                  {/* 六曜 */}
                  <p style={{
                    textAlign: 'center', fontSize: 9, lineHeight: 1.2,
                    color: isToday ? (ROKUYO_COLORS[ry] || '#aaa') : (ROKUYO_COLORS[ry] || '#888'),
                    marginBottom: 2,
                  }}>{ry}</p>

                  {/* 干支 */}
                  <p style={{
                    textAlign: 'center', fontSize: 9,
                    color: isToday ? 'rgba(232,201,106,0.75)'
                      : getLuckyLevel(stem, calc) >= 4 ? '#C9A84C'
                      : getLuckyLevel(stem, calc) === 0 ? 'rgba(180,80,80,0.8)'
                      : 'rgba(232,228,217,0.3)',
                    fontFamily: "'Shippori Mincho',serif", letterSpacing: '0.05em',
                  }}>{ks}</p>

                  {/* 特別日アイコン */}
                  {special && (
                    <p style={{ textAlign: 'center', fontSize: 10, marginTop: 2 }} title={special.label}>{special.icon}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 選択した日の詳細 */}
      {selected && (() => {
        const stem   = getStem(viewYear, viewMonth, selected);
        const branch = getBranch(viewYear, viewMonth, selected);
        const ry     = getRokuyo(viewYear, viewMonth, selected);
        const ks     = getKanshi(viewYear, viewMonth, selected);
        const rank   = getKaiUnRank(stem, ry, calc);
        // eslint-disable-next-line no-unused-vars
        const stemName = KAN[stem];
        // eslint-disable-next-line no-unused-vars
        const branchName = SHI[branch];
        const specKey = `${viewYear}-${viewMonth}-${selected}`;
        const special = SPECIAL_DAYS_2026[specKey];

        const adviceMap = {
          5: '壬・癸の水日ンダ。日主と同じ水気で最もエネルギーが高まる日。重要な決断・告白・交渉に最適ンダよ🐼',
          4: '庚・辛の金日ンダ。喜神の金が水を生む流れで吉。新しいことを始めたり、契約・手続きに向いているんダ。',
          3: '甲・乙の木日ンダ。中立的な日だけど、食神の木が想像力を高めるんダよ。クリエイティブな作業に向いているンダ。',
          1: '丙・丁の火日ンダ。忌神の火は水を剋すため少し慎重に。感情的になりやすいから大きな決断は避けるといいんダ。',
          0: '戊・己の土日ンダ。最忌神の土が水を止めてしまうんダよ。この日はのんびり休むのが一番。無理に動かないことンダ🐼',
        };
        const lv = getLuckyLevel(stem, calc);

        return (
          <div style={{
            marginTop: 16, padding: '18px 16px', borderRadius: 14,
            background: rank.bg || 'rgba(255,255,255,0.04)',
            border: `1.5px solid ${rank.border || 'rgba(255,255,255,0.1)'}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center', minWidth: 64 }}>
                <p style={{
                  fontFamily: "'Shippori Mincho',serif", fontSize: 34, fontWeight: 800,
                  color: rank.textColor !== C.textMuted ? rank.textColor : 'rgba(232,228,217,0.8)', lineHeight: 1,
                }}>{selected}</p>
                <p style={{ fontSize: 11, color: 'rgba(232,228,217,0.35)' }}>日</p>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                  <span style={{
                    fontSize: 13, fontFamily: "'Shippori Mincho',serif",
                    color: rank.textColor !== C.textMuted ? rank.textColor : 'rgba(232,228,217,0.8)', fontWeight: 700,
                  }}>{ks}日</span>
                  <span style={{
                    fontSize: 12, padding: '2px 10px', borderRadius: 20,
                    background: `${ROKUYO_COLORS[ry]}22`, border: `1px solid ${ROKUYO_COLORS[ry]}80`,
                    color: ROKUYO_COLORS[ry],
                  }}>{ry}</span>
                  {rank.rank && (
                    <span style={{
                      fontSize: 11, padding: '2px 10px', borderRadius: 20,
                      background: rank.bg, border: `1px solid ${rank.border}`,
                      color: rank.textColor !== C.textMuted ? rank.textColor : 'rgba(232,228,217,0.8)',
                    }}>{rank.rank}</span>
                  )}
                  {special && (
                    <span style={{
                      fontSize: 11, padding: '2px 10px', borderRadius: 20,
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(232,228,217,0.55)',
                    }}>{special.icon} {special.label}</span>
                  )}
                </div>
                <p style={{
                  fontSize: 13, color: 'rgba(232,228,217,0.65)', lineHeight: 1.8,
                  fontFamily: "'Shippori Mincho',serif",
                }}>{adviceMap[lv]}</p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 今月の開運日まとめ */}
      {kaiUnDays.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <p style={{ fontSize: 11, color: '#C9A84C', letterSpacing: '0.2em', marginBottom: 12, fontWeight: 700 }}>✦ 今月の開運日まとめ</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {kaiUnDays.map(({ d, ks, ry, rank }) => (
              <button key={d} onClick={() => setSelected(d)} style={{
                padding: '8px 12px', borderRadius: 10, cursor: 'pointer',
                background: rank.stars === 3 ? 'rgba(201,168,76,0.15)'
                  : rank.stars === 2 ? 'rgba(138,112,64,0.12)' : 'rgba(255,255,255,0.03)',
                border: `1.5px solid ${rank.stars >= 2 ? rank.border : 'rgba(255,255,255,0.08)'}`,
                color: rank.textColor !== C.textMuted ? rank.textColor : 'rgba(232,228,217,0.7)',
                fontFamily: "'Shippori Mincho',serif",
                fontSize: 13, transition: 'all 0.2s',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              }}>
                <span style={{ fontWeight: 800 }}>{d}日</span>
                <span style={{ fontSize: 10, opacity: 0.8 }}>{ks}</span>
                <span style={{ fontSize: 10, color: ROKUYO_COLORS[ry] || 'rgba(232,228,217,0.4)' }}>{ry}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
