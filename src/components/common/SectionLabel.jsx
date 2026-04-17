import React from 'react';
import { C } from '../../data/theme.js';

// ── セクション見出し ──
// 元HTML 2258-2263行。
export default function SectionLabel({ en, ja }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ fontSize: 10, letterSpacing: '0.4em', color: C.gold, fontFamily: 'sans-serif', marginBottom: 6, opacity: 0.8 }}>{en}</p>
      <h2 style={{ fontFamily: "'Shippori Mincho', serif", fontSize: 22, color: C.text, fontWeight: 700 }}>{ja}</h2>
    </div>
  );
}
