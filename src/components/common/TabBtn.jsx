import React from 'react';
import { C } from '../../data/theme.js';

// ── タブボタン ──
// 元HTML 2288-2302行。
export default function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: '9px 18px',
      borderRadius: 8,
      border: `1px solid ${active ? C.borderHover : 'rgba(255,255,255,0.08)'}`,
      background: active ? 'rgba(201,168,76,0.12)' : 'transparent',
      color: active ? C.gold : C.textMuted,
      fontSize: 13,
      fontFamily: "'Noto Sans JP', sans-serif",
      fontWeight: active ? 500 : 300,
      cursor: 'pointer',
      transition: 'all 0.2s',
      letterSpacing: '0.05em',
    }}>
      {children}
    </button>
  );
}
