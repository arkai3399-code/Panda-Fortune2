import React from 'react';
import { C } from '../../data/theme.js';

// ── カードラッパー ──
// 元HTML 2266-2285行。
export default function Card({ children, style = {}, glow = false }) {
  return (
    <div style={{
      background: `linear-gradient(160deg, ${C.card} 0%, #150909 100%)`,
      border: `1px solid ${C.border}`,
      borderRadius: 16,
      padding: '28px 24px',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: glow
        ? '0 0 40px rgba(201,168,76,0.08), 0 4px 24px rgba(0,0,0,0.5)'
        : '0 4px 24px rgba(0,0,0,0.4)',
      ...style,
    }}>
      {glow && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: `linear-gradient(to right, transparent, ${C.goldDim}, transparent)`,
        }} />
      )}
      {children}
    </div>
  );
}
