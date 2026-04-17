import React from 'react';
import { GOGYO_ICON, GOGYO_KEYWORD } from '../../data/gogyo.js';

// ── 五行バー ──
// 元HTML 2219-2255行。
export default function GokyoBar({ label, value, max = 6, color }) {
  const filled = Math.round(value);
  const total  = max;
  const intVal = Math.round(value);
  const rank = value === 0
    ? '─ なし'
    : value >= max * 0.65 ? '◎ 強い'
    : value >= max * 0.35 ? '○ 普通'
    : '△ 少ない';
  const rankColor = value === 0
    ? 'rgba(255,255,255,0.15)'
    : value >= max * 0.65 ? color
    : value >= max * 0.35 ? 'rgba(255,255,255,0.45)'
    : 'rgba(255,255,255,0.25)';
  const icon = GOGYO_ICON[label] || '';
  const keyword = GOGYO_KEYWORD[label] || '';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16,
      padding: '10px 14px', borderRadius: 12,
      background: filled > 0 ? `${color}0d` : 'transparent',
      border: filled > 0 ? `1px solid ${color}30` : '1px solid transparent',
    }}>
      {/* アイコン + ラベル */}
      <div style={{ width: 52, flexShrink: 0, textAlign: 'center' }}>
        <div style={{ fontSize: 22, lineHeight: 1, marginBottom: 3 }}>{icon}</div>
        <span style={{
          fontSize: 14, fontFamily: "'Shippori Mincho',serif", fontWeight: 700,
          color: filled > 0 ? color : 'rgba(255,255,255,0.2)',
        }}>{label}</span>
      </div>
      {/* バー + キーワード */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.04em' }}>{keyword}</p>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 12, borderRadius: 4,
              background: i < filled ? color : 'rgba(255,255,255,0.06)',
              boxShadow: i < filled ? `0 0 6px ${color}66` : 'none',
              transition: `background 0.4s ease ${i * 0.07}s`,
            }} />
          ))}
        </div>
      </div>
      {/* 右側: 整数 + ランク */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
        width: 52, flexShrink: 0, gap: 3,
      }}>
        <span style={{
          fontSize: 22, fontFamily: "'Shippori Mincho',serif", fontWeight: 700,
          color: filled > 0 ? color : 'rgba(255,255,255,0.15)', lineHeight: 1,
        }}>{intVal}</span>
        <span style={{ fontSize: 10, color: rankColor, fontWeight: 600, letterSpacing: '0.03em' }}>{rank}</span>
      </div>
    </div>
  );
}
