import React from 'react';

// ── 円形スコア ──
// 元HTML 3138-3154行。
export default function RadialScore({ value, color, size = 90 }) {
  const r = 36, cx = 45, cy = 45;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <svg width={size} height={size} viewBox="0 0 90 90">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
      <circle
        cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 45 45)"
        style={{
          filter: `drop-shadow(0 0 6px ${color})`,
          transition: 'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1) 0.3s',
        }}
      />
      <text
        x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
        fill={color} fontSize="18" fontFamily="'Shippori Mincho',serif" fontWeight="800"
      >{value}</text>
    </svg>
  );
}
