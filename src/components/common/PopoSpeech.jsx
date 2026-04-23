import React from 'react';
import { C } from '../../data/theme.js';
import PandaIcon, { PANDA_IMG_HTML } from './PandaIcon.jsx';

// ── ポポの吹き出し ──
// 元HTML 5602-5620行。
export default function PopoSpeech({ text, delay = 0 }) {
  // 絵文字 🐼 をインライン画像に置換
  const html = (text || '').replace(/🐼/g, PANDA_IMG_HTML);
  return (
    <div className="pf-popo" style={{
      display: 'flex', gap: 14, alignItems: 'flex-start',
      background: 'rgba(201,168,76,0.04)',
      border: '1px solid rgba(201,168,76,0.12)',
      borderRadius: 14, padding: '16px 18px',
      animation: `fadeUp 0.6s ${delay}s ease both`,
    }}>
      <PandaIcon size={32} />
      <p
        className="pf-popo-text"
        style={{
          fontFamily: "'Shippori Mincho', serif",
          fontSize: 15, lineHeight: 1.9, color: C.textSub, fontWeight: 400,
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
