// ==========================================================
// 地支(十二支)SVG アイコンデータ
// ==========================================================
// 使い方:
//   import { CHISHI_ICONS, getChishiIcon, getChishiYomi } from '@/data/chishiIcons';
//   const svg = getChishiIcon('午');
//   element.innerHTML = svg;

export const CHISHI_YOMI = {
  '子': 'ね',
  '丑': 'うし',
  '寅': 'とら',
  '卯': 'う',
  '辰': 'たつ',
  '巳': 'み',
  '午': 'うま',
  '未': 'ひつじ',
  '申': 'さる',
  '酉': 'とり',
  '戌': 'いぬ',
  '亥': 'い',
};

// SVG は viewBox="-60 -60 120 120" で統一(天干より少し大きいキャンバス)

export const CHISHI_ICONS = {
  // 子 ね - ネズミ(正面顔)
  '子': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-60 -60 120 120">
    <circle cx="-35" cy="-35" r="22" fill="#8a8a8a"/>
    <circle cx="35" cy="-35" r="22" fill="#8a8a8a"/>
    <circle cx="-35" cy="-35" r="14" fill="#d8a0a0"/>
    <circle cx="35" cy="-35" r="14" fill="#d8a0a0"/>
    <ellipse cx="0" cy="0" rx="40" ry="38" fill="#8a8a8a"/>
    <ellipse cx="0" cy="18" rx="18" ry="14" fill="#a8a8a8"/>
    <circle cx="-15" cy="-5" r="5" fill="#1a0a00"/>
    <circle cx="15" cy="-5" r="5" fill="#1a0a00"/>
    <circle cx="-13" cy="-7" r="1.5" fill="#fff"/>
    <circle cx="17" cy="-7" r="1.5" fill="#fff"/>
    <ellipse cx="0" cy="15" rx="3" ry="2.5" fill="#1a0a00"/>
    <path d="M 5 18 L 25 15 M 5 22 L 25 26 M -5 18 L -25 15 M -5 22 L -25 26" stroke="#3a3a3a" stroke-width="1" stroke-linecap="round"/>
    <rect x="-3" y="25" width="3" height="6" fill="#fff" stroke="#8a8a8a" stroke-width="0.5"/>
    <rect x="0" y="25" width="3" height="6" fill="#fff" stroke="#8a8a8a" stroke-width="0.5"/>
  </svg>`,

  // 丑 うし - 牛(正面顔)
  '丑': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-60 -60 120 120">
    <path d="M -35 -35 Q -55 -50, -50 -60" stroke="#d8c8a0" stroke-width="8" fill="none" stroke-linecap="round"/>
    <path d="M 35 -35 Q 55 -50, 50 -60" stroke="#d8c8a0" stroke-width="8" fill="none" stroke-linecap="round"/>
    <ellipse cx="-45" cy="-20" rx="15" ry="10" fill="#e8dcc8" transform="rotate(-30 -45 -20)"/>
    <ellipse cx="45" cy="-20" rx="15" ry="10" fill="#e8dcc8" transform="rotate(30 45 -20)"/>
    <ellipse cx="0" cy="-5" rx="42" ry="45" fill="#e8dcc8"/>
    <ellipse cx="-20" cy="-20" rx="12" ry="10" fill="#3a2a1a"/>
    <ellipse cx="25" cy="5" rx="10" ry="8" fill="#3a2a1a"/>
    <ellipse cx="0" cy="25" rx="25" ry="18" fill="#d8a0a0"/>
    <circle cx="-15" cy="-10" r="5" fill="#1a0a00"/>
    <circle cx="15" cy="-10" r="5" fill="#1a0a00"/>
    <circle cx="-13" cy="-12" r="1.5" fill="#fff"/>
    <circle cx="17" cy="-12" r="1.5" fill="#fff"/>
    <ellipse cx="-8" cy="25" rx="3" ry="4" fill="#1a0a00"/>
    <ellipse cx="8" cy="25" rx="3" ry="4" fill="#1a0a00"/>
    <path d="M -8 38 Q 0 42, 8 38" fill="none" stroke="#3a2a10" stroke-width="1.5"/>
  </svg>`,

  // 寅 とら - 虎(正面顔)
  '寅': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-60 -60 120 120">
    <path d="M -40 -35 L -50 -55 L -25 -40 Z" fill="#e8a040"/>
    <path d="M 40 -35 L 50 -55 L 25 -40 Z" fill="#e8a040"/>
    <path d="M -38 -35 L -42 -48 L -30 -38 Z" fill="#3a2010"/>
    <path d="M 38 -35 L 42 -48 L 30 -38 Z" fill="#3a2010"/>
    <circle cx="0" cy="0" r="48" fill="#e8a040"/>
    <ellipse cx="0" cy="20" rx="25" ry="18" fill="#f5e8d0"/>
    <path d="M -25 -30 L -20 -15 M -10 -38 L -8 -22 M 10 -38 L 8 -22 M 25 -30 L 20 -15" stroke="#3a2010" stroke-width="4" stroke-linecap="round"/>
    <path d="M -45 0 L -32 3 M -45 12 L -32 12" stroke="#3a2010" stroke-width="3" stroke-linecap="round"/>
    <path d="M 45 0 L 32 3 M 45 12 L 32 12" stroke="#3a2010" stroke-width="3" stroke-linecap="round"/>
    <text x="0" y="-20" text-anchor="middle" font-family="serif" font-size="14" font-weight="bold" fill="#3a2010">王</text>
    <ellipse cx="-15" cy="-5" rx="5" ry="6" fill="#1a0a00"/>
    <ellipse cx="15" cy="-5" rx="5" ry="6" fill="#1a0a00"/>
    <circle cx="-13" cy="-7" r="1.5" fill="#f5c840"/>
    <circle cx="17" cy="-7" r="1.5" fill="#f5c840"/>
    <path d="M -5 12 L 5 12 L 0 18 Z" fill="#1a0a00"/>
    <path d="M 0 18 L 0 25 M 0 25 Q -8 32, -15 28 M 0 25 Q 8 32, 15 28" fill="none" stroke="#3a2010" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M 12 20 L 30 18 M 12 25 L 30 28 M -12 20 L -30 18 M -12 25 L -30 28" stroke="#3a2010" stroke-width="0.8" stroke-linecap="round"/>
  </svg>`,

  // 卯 う - うさぎ
  '卯': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-60 -60 120 120">
    <ellipse cx="-20" cy="-55" rx="10" ry="35" fill="#b8b0a0"/>
    <ellipse cx="20" cy="-55" rx="10" ry="35" fill="#b8b0a0"/>
    <ellipse cx="-20" cy="-55" rx="5" ry="25" fill="#f5c8c8"/>
    <ellipse cx="20" cy="-55" rx="5" ry="25" fill="#f5c8c8"/>
    <circle cx="0" cy="0" r="42" fill="#b8b0a0"/>
    <ellipse cx="0" cy="8" rx="24" ry="22" fill="#d8d0c0"/>
    <ellipse cx="-15" cy="-5" rx="6" ry="7" fill="#1a0a00"/>
    <ellipse cx="15" cy="-5" rx="6" ry="7" fill="#1a0a00"/>
    <circle cx="-13" cy="-8" r="2" fill="#fff"/>
    <circle cx="17" cy="-8" r="2" fill="#fff"/>
    <path d="M 0 12 L -4 16 L 4 16 Z" fill="#d898a0"/>
    <path d="M 0 16 L 0 20 M 0 20 Q -5 24, -8 22 M 0 20 Q 5 24, 8 22" fill="none" stroke="#3a2a10" stroke-width="1.2" stroke-linecap="round"/>
    <circle cx="-25" cy="10" r="6" fill="#f5a0a0" opacity="0.5"/>
    <circle cx="25" cy="10" r="6" fill="#f5a0a0" opacity="0.5"/>
    <rect x="-3" y="20" width="3" height="5" fill="#fff" stroke="#8a8a8a" stroke-width="0.4"/>
    <rect x="0" y="20" width="3" height="5" fill="#fff" stroke="#8a8a8a" stroke-width="0.4"/>
  </svg>`,

  // 辰 たつ - 龍(正面顔)
  '辰': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-60 -60 120 120">
    <path d="M -25 -40 Q -35 -55, -40 -70 M -32 -55 L -42 -55" stroke="#d8c8a0" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M 25 -40 Q 35 -55, 40 -70 M 32 -55 L 42 -55" stroke="#d8c8a0" stroke-width="4" fill="none" stroke-linecap="round"/>
    <ellipse cx="0" cy="0" rx="40" ry="42" fill="#5aa870"/>
    <ellipse cx="0" cy="20" rx="25" ry="16" fill="#4a9060"/>
    <circle cx="-20" cy="-20" r="3" fill="#4a8a5a"/>
    <circle cx="20" cy="-20" r="3" fill="#4a8a5a"/>
    <circle cx="-25" cy="0" r="3" fill="#4a8a5a"/>
    <circle cx="25" cy="0" r="3" fill="#4a8a5a"/>
    <path d="M -25 25 Q -35 35, -30 45" stroke="#8a6a2a" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M 25 25 Q 35 35, 30 45" stroke="#8a6a2a" stroke-width="2" fill="none" stroke-linecap="round"/>
    <ellipse cx="-15" cy="-8" rx="6" ry="7" fill="#f5d840"/>
    <ellipse cx="15" cy="-8" rx="6" ry="7" fill="#f5d840"/>
    <ellipse cx="-15" cy="-8" rx="2.5" ry="6" fill="#1a0a00"/>
    <ellipse cx="15" cy="-8" rx="2.5" ry="6" fill="#1a0a00"/>
    <path d="M -22 -18 L -10 -15" stroke="#2a5a3a" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M 22 -18 L 10 -15" stroke="#2a5a3a" stroke-width="2.5" stroke-linecap="round"/>
    <ellipse cx="-6" cy="20" rx="2.5" ry="4" fill="#1a0a00"/>
    <ellipse cx="6" cy="20" rx="2.5" ry="4" fill="#1a0a00"/>
    <path d="M -18 32 Q 0 38, 18 32" fill="none" stroke="#3a2010" stroke-width="1.5"/>
    <path d="M -10 33 L -10 36 M 10 33 L 10 36" stroke="#fff" stroke-width="1.5"/>
  </svg>`,

  // 巳 み - 蛇(全身とぐろ)
  '巳': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-60 -60 120 120">
    <ellipse cx="0" cy="35" rx="50" ry="14" fill="#7aa858"/>
    <ellipse cx="-5" cy="15" rx="42" ry="12" fill="#8ab868"/>
    <ellipse cx="5" cy="-5" rx="35" ry="11" fill="#7aa858"/>
    <ellipse cx="-5" cy="-22" rx="25" ry="9" fill="#8ab868"/>
    <ellipse cx="5" cy="-40" rx="14" ry="11" fill="#9ac878"/>
    <path d="M -45 38 Q 0 43, 45 38" stroke="#c8d8a0" stroke-width="2" fill="none" opacity="0.7"/>
    <path d="M -38 18 Q 0 23, 35 18" stroke="#c8d8a0" stroke-width="2" fill="none" opacity="0.6"/>
    <g fill="#5a8a38" opacity="0.6">
      <ellipse cx="-25" cy="35" rx="2.5" ry="1.5"/>
      <ellipse cx="0" cy="38" rx="2.5" ry="1.5"/>
      <ellipse cx="25" cy="35" rx="2.5" ry="1.5"/>
      <ellipse cx="-20" cy="15" rx="2.5" ry="1.5"/>
      <ellipse cx="15" cy="14" rx="2.5" ry="1.5"/>
    </g>
    <path d="M -45 45 Q -55 50, -55 42" stroke="#7aa858" stroke-width="4" fill="none" stroke-linecap="round"/>
    <ellipse cx="0" cy="-43" rx="2.5" ry="3.5" fill="#f5c040"/>
    <ellipse cx="11" cy="-43" rx="2.5" ry="3.5" fill="#f5c040"/>
    <ellipse cx="0" cy="-43" rx="0.8" ry="3" fill="#1a0a00"/>
    <ellipse cx="11" cy="-43" rx="0.8" ry="3" fill="#1a0a00"/>
    <ellipse cx="3" cy="-34" rx="0.6" ry="1" fill="#1a0a00"/>
    <ellipse cx="8" cy="-34" rx="0.6" ry="1" fill="#1a0a00"/>
    <path d="M 0 -30 Q 5 -28, 11 -30" fill="none" stroke="#3a2010" stroke-width="1"/>
    <path d="M 5 -28 L 9 -22 L 7 -18 M 9 -22 L 11 -18" stroke="#d04848" stroke-width="1.2" fill="none" stroke-linecap="round"/>
  </svg>`,

  // 午 うま - 馬(正面顔)
  '午': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-60 -60 120 120">
    <path d="M -30 -35 Q -25 -55, -10 -45 Q 0 -55, 10 -45 Q 25 -55, 30 -35 Q 35 -20, 30 -10 L -30 -10 Q -35 -20, -30 -35 Z" fill="#5a3a1a"/>
    <path d="M -25 -35 L -30 -55 L -15 -40 Z" fill="#a0724a"/>
    <path d="M 25 -35 L 30 -55 L 15 -40 Z" fill="#a0724a"/>
    <ellipse cx="0" cy="5" rx="35" ry="50" fill="#a0724a"/>
    <ellipse cx="0" cy="35" rx="22" ry="18" fill="#8a5a34"/>
    <path d="M 0 -5 Q -3 10, 0 25 Q 3 10, 0 -5 Z" fill="#e8d8c0" opacity="0.7"/>
    <ellipse cx="-15" cy="0" rx="5" ry="7" fill="#1a0a00"/>
    <ellipse cx="15" cy="0" rx="5" ry="7" fill="#1a0a00"/>
    <circle cx="-13" cy="-2" r="1.5" fill="#fff"/>
    <circle cx="17" cy="-2" r="1.5" fill="#fff"/>
    <ellipse cx="-7" cy="35" rx="3" ry="4" fill="#1a0a00"/>
    <ellipse cx="7" cy="35" rx="3" ry="4" fill="#1a0a00"/>
    <path d="M -10 48 Q 0 52, 10 48" fill="none" stroke="#3a2010" stroke-width="1.5"/>
  </svg>`,

  // 未 ひつじ - 羊(正面顔)
  '未': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-60 -60 120 120">
    <circle cx="-40" cy="-25" r="18" fill="#f5f0e8"/>
    <circle cx="40" cy="-25" r="18" fill="#f5f0e8"/>
    <circle cx="-45" cy="10" r="16" fill="#f5f0e8"/>
    <circle cx="45" cy="10" r="16" fill="#f5f0e8"/>
    <circle cx="-25" cy="-40" r="14" fill="#f5f0e8"/>
    <circle cx="25" cy="-40" r="14" fill="#f5f0e8"/>
    <circle cx="0" cy="-45" r="15" fill="#f5f0e8"/>
    <path d="M -18 -45 Q -35 -50, -38 -30 Q -30 -25, -22 -32" fill="#d8a858" stroke="#a87830" stroke-width="1"/>
    <path d="M 18 -45 Q 35 -50, 38 -30 Q 30 -25, 22 -32" fill="#d8a858" stroke="#a87830" stroke-width="1"/>
    <ellipse cx="0" cy="5" rx="28" ry="35" fill="#e8dcc0"/>
    <ellipse cx="-28" cy="-5" rx="10" ry="7" fill="#e8dcc0" transform="rotate(-30 -28 -5)"/>
    <ellipse cx="28" cy="-5" rx="10" ry="7" fill="#e8dcc0" transform="rotate(30 28 -5)"/>
    <ellipse cx="-10" cy="0" rx="4" ry="5" fill="#1a0a00"/>
    <ellipse cx="10" cy="0" rx="4" ry="5" fill="#1a0a00"/>
    <circle cx="-9" cy="-1" r="1" fill="#fff"/>
    <circle cx="11" cy="-1" r="1" fill="#fff"/>
    <ellipse cx="0" cy="18" rx="4" ry="3" fill="#1a0a00"/>
    <path d="M 0 22 L 0 26 M 0 26 Q -5 30, -8 28 M 0 26 Q 5 30, 8 28" fill="none" stroke="#3a2a10" stroke-width="1.2" stroke-linecap="round"/>
  </svg>`,

  // 申 さる - 猿(正面顔)
  '申': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-60 -60 120 120">
    <circle cx="-45" cy="-10" r="12" fill="#8a5a3a"/>
    <circle cx="45" cy="-10" r="12" fill="#8a5a3a"/>
    <circle cx="-45" cy="-10" r="7" fill="#d8a870"/>
    <circle cx="45" cy="-10" r="7" fill="#d8a870"/>
    <circle cx="0" cy="0" r="42" fill="#8a5a3a"/>
    <ellipse cx="0" cy="5" rx="28" ry="30" fill="#e8b878"/>
    <path d="M -15 -30 Q -5 -42, 0 -38 Q 5 -42, 15 -30" fill="#5a3a1a"/>
    <ellipse cx="-12" cy="-5" rx="5" ry="7" fill="#1a0a00"/>
    <ellipse cx="12" cy="-5" rx="5" ry="7" fill="#1a0a00"/>
    <circle cx="-11" cy="-7" r="1.5" fill="#fff"/>
    <circle cx="13" cy="-7" r="1.5" fill="#fff"/>
    <path d="M -20 -12 Q -12 -15, -5 -12" stroke="#6a3a1a" stroke-width="1.5" fill="none"/>
    <path d="M 20 -12 Q 12 -15, 5 -12" stroke="#6a3a1a" stroke-width="1.5" fill="none"/>
    <ellipse cx="-4" cy="12" rx="2" ry="2.5" fill="#3a2010"/>
    <ellipse cx="4" cy="12" rx="2" ry="2.5" fill="#3a2010"/>
    <path d="M -15 22 Q 0 30, 15 22" fill="none" stroke="#3a2010" stroke-width="1.8" stroke-linecap="round"/>
  </svg>`,

  // 酉 とり - 鶏(正面顔)
  '酉': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-60 -60 120 120">
    <path d="M -20 -45 L -15 -55 L -10 -45 L -5 -58 L 0 -45 L 5 -58 L 10 -45 L 15 -55 L 20 -45 Z" fill="#d84040"/>
    <circle cx="0" cy="-10" r="35" fill="#f5f0e8"/>
    <path d="M 0 10 L -8 5 L 0 25 L 8 5 Z" fill="#e8a040"/>
    <path d="M 0 10 L -8 5 L 0 20 L 8 5 Z" fill="#f5c460"/>
    <circle cx="-13" cy="-15" r="6" fill="#fff"/>
    <circle cx="13" cy="-15" r="6" fill="#fff"/>
    <circle cx="-13" cy="-15" r="3.5" fill="#1a0a00"/>
    <circle cx="13" cy="-15" r="3.5" fill="#1a0a00"/>
    <circle cx="-12" cy="-16" r="1" fill="#fff"/>
    <circle cx="14" cy="-16" r="1" fill="#fff"/>
    <path d="M -6 22 Q -10 30, -6 35 Q 0 32, 6 35 Q 10 30, 6 22" fill="#d84040"/>
    <path d="M -25 20 Q -35 30, -25 40 Q -15 30, -25 20" fill="#c8a048"/>
    <path d="M 25 20 Q 35 30, 25 40 Q 15 30, 25 20" fill="#c8a048"/>
  </svg>`,

  // 戌 いぬ - 犬(正面顔)
  '戌': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-60 -60 120 120">
    <ellipse cx="-38" cy="-10" rx="15" ry="28" fill="#8a5a2a" transform="rotate(-15 -38 -10)"/>
    <ellipse cx="38" cy="-10" rx="15" ry="28" fill="#8a5a2a" transform="rotate(15 38 -10)"/>
    <ellipse cx="0" cy="0" rx="40" ry="42" fill="#c88a50"/>
    <ellipse cx="0" cy="15" rx="22" ry="20" fill="#e8b078"/>
    <path d="M 0 -30 Q -3 -10, 0 10 Q 3 -10, 0 -30 Z" fill="#f5e8d0" opacity="0.6"/>
    <ellipse cx="-15" cy="-10" rx="5" ry="6" fill="#1a0a00"/>
    <ellipse cx="15" cy="-10" rx="5" ry="6" fill="#1a0a00"/>
    <circle cx="-13" cy="-12" r="1.5" fill="#fff"/>
    <circle cx="17" cy="-12" r="1.5" fill="#fff"/>
    <ellipse cx="0" cy="12" rx="5" ry="4" fill="#1a0a00"/>
    <path d="M 0 18 L 0 24 M 0 24 Q -8 30, -12 25 M 0 24 Q 8 30, 12 25" fill="none" stroke="#3a2010" stroke-width="1.5" stroke-linecap="round"/>
    <ellipse cx="0" cy="32" rx="4" ry="5" fill="#d84858"/>
  </svg>`,

  // 亥 い - 猪(正面顔)
  '亥': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-60 -60 120 120">
    <path d="M -30 -30 L -35 -48 L -20 -35 Z" fill="#5a3a22"/>
    <path d="M 30 -30 L 35 -48 L 20 -35 Z" fill="#5a3a22"/>
    <ellipse cx="0" cy="0" rx="38" ry="42" fill="#5a3a22"/>
    <ellipse cx="0" cy="25" rx="20" ry="18" fill="#3a2212"/>
    <path d="M -15 -38 L -12 -45 M -5 -42 L -3 -50 M 5 -42 L 3 -50 M 15 -38 L 12 -45" stroke="#2a1a0a" stroke-width="2" stroke-linecap="round"/>
    <path d="M -8 32 Q -12 45, -15 42" stroke="#f5f0e0" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M 8 32 Q 12 45, 15 42" stroke="#f5f0e0" stroke-width="3" fill="none" stroke-linecap="round"/>
    <ellipse cx="-15" cy="-8" rx="4" ry="5" fill="#f5c040"/>
    <ellipse cx="15" cy="-8" rx="4" ry="5" fill="#f5c040"/>
    <circle cx="-15" cy="-8" r="2" fill="#1a0a00"/>
    <circle cx="15" cy="-8" r="2" fill="#1a0a00"/>
    <ellipse cx="-7" cy="25" rx="3" ry="4" fill="#1a0a00"/>
    <ellipse cx="7" cy="25" rx="3" ry="4" fill="#1a0a00"/>
    <path d="M -12 36 Q 0 40, 12 36" fill="none" stroke="#1a0a00" stroke-width="1.5"/>
  </svg>`,
};

/**
 * 地支の SVG アイコンを取得する
 * @param {string} shi - 地支(例: '午')
 * @returns {string} SVG 文字列
 */
export function getChishiIcon(shi) {
  return CHISHI_ICONS[shi] || '';
}

/**
 * 地支の訓読みを取得する
 * @param {string} shi - 地支(例: '午')
 * @returns {string} 訓読み(例: 'うま')
 */
export function getChishiYomi(shi) {
  return CHISHI_YOMI[shi] || '';
}
