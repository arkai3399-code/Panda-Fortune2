// ==========================================================
// 十干(天干)SVG アイコンデータ
// ==========================================================
// 使い方:
//   import { TENKAN_ICONS, getTenkanIcon, getTenkanYomi } from '@/data/tenkanIcons';
//   const svg = getTenkanIcon('壬');
//   element.innerHTML = svg;

export const TENKAN_YOMI = {
  '甲': 'きのえ',
  '乙': 'きのと',
  '丙': 'ひのえ',
  '丁': 'ひのと',
  '戊': 'つちのえ',
  '己': 'つちのと',
  '庚': 'かのえ',
  '辛': 'かのと',
  '壬': 'みずのえ',
  '癸': 'みずのと',
};

// SVG は viewBox="-30 -30 60 60" で統一。
// 呼び出し側で width/height を指定して使用する。

export const TENKAN_ICONS = {
  // 甲 きのえ - 大樹
  '甲': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-30 -30 60 60">
    <rect x="-4" y="10" width="8" height="20" fill="#6b4423"/>
    <circle cx="0" cy="0" r="22" fill="#3d6b3a"/>
    <circle cx="-12" cy="-5" r="14" fill="#4a7a48"/>
    <circle cx="12" cy="-5" r="14" fill="#4a7a48"/>
    <circle cx="0" cy="-15" r="12" fill="#5a8a58"/>
    <path d="M -8 30 L -12 34 M 0 30 L 0 34 M 8 30 L 12 34" stroke="#6b4423" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,

  // 乙 きのと - 蔓・草花
  '乙': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-30 -30 60 60">
    <ellipse cx="-15" cy="12" rx="12" ry="4" fill="#4a7a4a" opacity="0.7"/>
    <path d="M 0 0 Q -12 -8, -8 -18 Q 0 -14, 0 0 Z" fill="#e8a8c8" opacity="0.8"/>
    <path d="M 0 0 Q 12 -8, 8 -18 Q 0 -14, 0 0 Z" fill="#e8a8c8" opacity="0.8"/>
    <path d="M 0 0 Q -8 -12, 0 -22 Q 8 -12, 0 0 Z" fill="#f5c0d8"/>
    <path d="M 0 0 Q -6 -6, -10 -2 Q -4 2, 0 0 Z" fill="#d888a8"/>
    <path d="M 0 0 Q 6 -6, 10 -2 Q 4 2, 0 0 Z" fill="#d888a8"/>
    <circle cx="0" cy="-5" r="2" fill="#f5d83a"/>
    <path d="M 0 0 L 0 12" stroke="#4a7a4a" stroke-width="1.5"/>
  </svg>`,

  // 丙 ひのえ - 太陽
  '丙': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-30 -30 60 60">
    <g stroke="#d4692a" stroke-width="2" stroke-linecap="round">
      <line x1="0" y1="-28" x2="0" y2="-18"/>
      <line x1="0" y1="18" x2="0" y2="28"/>
      <line x1="-28" y1="0" x2="-18" y2="0"/>
      <line x1="18" y1="0" x2="28" y2="0"/>
      <line x1="-20" y1="-20" x2="-13" y2="-13"/>
      <line x1="13" y1="-13" x2="20" y2="-20"/>
      <line x1="-20" y1="20" x2="-13" y2="13"/>
      <line x1="13" y1="13" x2="20" y2="20"/>
    </g>
    <circle cx="0" cy="0" r="15" fill="#e88a3a"/>
    <circle cx="0" cy="0" r="12" fill="#f5a847"/>
    <circle cx="-3" cy="-3" r="4" fill="#ffcb70" opacity="0.8"/>
  </svg>`,

  // 丁 ひのと - ろうそく・灯火
  '丁': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-30 -30 60 60">
    <path d="M -12 18 L -8 22 L 8 22 L 12 18 L 6 14 L -6 14 Z" fill="#7a5a3a"/>
    <ellipse cx="0" cy="14" rx="6" ry="2" fill="#5a4020"/>
    <rect x="-3" y="-2" width="6" height="18" fill="#f0e0c0"/>
    <ellipse cx="0" cy="-2" rx="3" ry="1" fill="#e0d0a8"/>
    <rect x="-0.3" y="-6" width="0.6" height="5" fill="#3a2a1a"/>
    <path d="M 0 -6 Q -4 -10, -2 -16 Q 0 -20, 2 -16 Q 4 -10, 0 -6 Z" fill="#f5a83a"/>
    <path d="M 0 -8 Q -2 -11, -1 -15 Q 0 -17, 1 -15 Q 2 -11, 0 -8 Z" fill="#f5d870"/>
    <circle cx="0" cy="-12" r="10" fill="#f5a83a" opacity="0.15"/>
  </svg>`,

  // 戊 つちのえ - 山
  '戊': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-30 -30 60 60">
    <path d="M -28 22 L -8 -20 L 12 10 L 28 -5 L 28 22 Z" fill="#6a5a4a"/>
    <path d="M -28 22 L -5 -15 L 18 22 Z" fill="#8a7a6a"/>
    <path d="M -5 -15 L -10 -5 L 0 -5 Z" fill="#d4c8b8"/>
    <g transform="translate(-18, 18)">
      <path d="M 0 0 L -3 -8 L 3 -8 Z" fill="#3d5a3a"/>
      <rect x="-0.5" y="0" width="1" height="3" fill="#4a3020"/>
    </g>
  </svg>`,

  // 己 つちのと - 田園
  '己': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-30 -30 60 60">
    <g fill="#6a4a2a">
      <path d="M -26 16 L -24 8 L 24 8 L 26 16 Z"/>
      <path d="M -24 8 L -22 0 L 22 0 L 24 8 Z" opacity="0.8"/>
    </g>
    <g fill="#5a8a3a">
      <path d="M -18 16 L -20 10 L -18 12 L -18 16 Z"/>
      <path d="M -12 16 L -14 10 L -12 12 L -12 16 Z"/>
      <path d="M -6 16 L -8 10 L -6 12 L -6 16 Z"/>
      <path d="M 0 16 L -2 10 L 0 12 L 0 16 Z"/>
      <path d="M 6 16 L 4 10 L 6 12 L 6 16 Z"/>
      <path d="M 12 16 L 10 10 L 12 12 L 12 16 Z"/>
      <path d="M 18 16 L 16 10 L 18 12 L 18 16 Z"/>
      <circle cx="-15" cy="4" r="1.5"/>
      <circle cx="-5" cy="4" r="1.5"/>
      <circle cx="5" cy="4" r="1.5"/>
      <circle cx="15" cy="4" r="1.5"/>
    </g>
    <circle cx="15" cy="-15" r="5" fill="#e8a43a" opacity="0.5"/>
  </svg>`,

  // 庚 かのえ - 鋼・鍛冶
  '庚': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-30 -30 60 60">
    <path d="M -20 10 L -15 -2 L 15 -2 L 20 10 Z" fill="#3a3a3a"/>
    <rect x="-10" y="-2" width="20" height="3" fill="#2a2a2a"/>
    <path d="M -20 10 L -12 10 L -14 18 L -22 18 Z" fill="#2a2a2a"/>
    <g transform="translate(-2, -15) rotate(-25)">
      <rect x="-2" y="-8" width="4" height="20" fill="#5a3a1a"/>
      <rect x="-8" y="-12" width="16" height="8" fill="#5a5a5a"/>
      <rect x="-8" y="-12" width="16" height="3" fill="#7a7a7a"/>
    </g>
    <g stroke="#f5b840" stroke-width="1" fill="#f5b840">
      <circle cx="3" cy="-5" r="1.5"/>
      <path d="M 8 -3 L 12 -6 M 6 -8 L 10 -12 M 10 0 L 14 2" stroke-linecap="round"/>
    </g>
  </svg>`,

  // 辛 かのと - 宝石・ダイヤ
  '辛': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-30 -30 60 60">
    <path d="M -18 -5 L -10 -18 L 10 -18 L 18 -5 L 0 18 Z" fill="#a8c8d8"/>
    <path d="M -18 -5 L -10 -18 L -4 -5 Z" fill="#c8dce8"/>
    <path d="M -10 -18 L 10 -18 L 4 -5 L -4 -5 Z" fill="#d8e8f0"/>
    <path d="M 10 -18 L 18 -5 L 4 -5 Z" fill="#c8dce8"/>
    <path d="M -18 -5 L -4 -5 L 0 18 Z" fill="#88a8b8"/>
    <path d="M 18 -5 L 4 -5 L 0 18 Z" fill="#88a8b8"/>
    <path d="M -4 -5 L 4 -5 L 0 18 Z" fill="#98b8c8"/>
    <path d="M -6 -14 L -2 -14 L -4 -8 Z" fill="#ffffff" opacity="0.7"/>
    <g fill="#ffffff">
      <path d="M 14 -20 L 15 -18 L 17 -17 L 15 -16 L 14 -14 L 13 -16 L 11 -17 L 13 -18 Z"/>
    </g>
  </svg>`,

  // 壬 みずのえ - 大海・波
  '壬': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-30 -30 60 60">
    <path d="M -28 8 Q -18 -5, -8 4 Q 2 13, 12 4 Q 22 -5, 28 4 L 28 22 L -28 22 Z" fill="#2a5a7a"/>
    <path d="M -28 14 Q -18 4, -8 12 Q 2 20, 12 12 Q 22 4, 28 12 L 28 22 L -28 22 Z" fill="#3a6a8a"/>
    <path d="M -20 0 Q -15 -4, -10 -1" fill="none" stroke="#a8c8dc" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M 10 0 Q 15 -4, 20 -1" fill="none" stroke="#a8c8dc" stroke-width="1.5" stroke-linecap="round"/>
    <circle cx="-18" cy="-8" r="1.5" fill="#a8c8dc"/>
    <circle cx="0" cy="-10" r="1" fill="#a8c8dc"/>
    <circle cx="15" cy="-10" r="1.5" fill="#a8c8dc"/>
  </svg>`,

  // 癸 みずのと - 雨・雲
  '癸': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-30 -30 60 60">
    <g fill="#6a7a8a" opacity="0.6">
      <ellipse cx="-8" cy="-12" rx="8" ry="5"/>
      <ellipse cx="4" cy="-14" rx="9" ry="6"/>
      <ellipse cx="12" cy="-10" rx="6" ry="4"/>
    </g>
    <g fill="#7ab8dc">
      <path d="M -10 -2 Q -12 2, -10 5 Q -8 2, -10 -2 Z"/>
      <path d="M 0 0 Q -2 4, 0 7 Q 2 4, 0 0 Z"/>
      <path d="M 10 -2 Q 8 2, 10 5 Q 12 2, 10 -2 Z"/>
    </g>
    <ellipse cx="0" cy="18" rx="20" ry="3" fill="#3a5a7a" opacity="0.5"/>
    <ellipse cx="0" cy="18" rx="14" ry="2" fill="#7ab8dc" opacity="0.6"/>
    <ellipse cx="-8" cy="17" rx="3" ry="0.8" fill="none" stroke="#a8c8dc" stroke-width="0.5"/>
    <ellipse cx="8" cy="19" rx="3" ry="0.8" fill="none" stroke="#a8c8dc" stroke-width="0.5"/>
  </svg>`,
};

/**
 * 天干の SVG アイコンを取得する
 * @param {string} kan - 天干(例: '壬')
 * @returns {string} SVG 文字列(見つからない場合は空文字列)
 */
export function getTenkanIcon(kan) {
  return TENKAN_ICONS[kan] || '';
}

/**
 * 天干の訓読みを取得する
 * @param {string} kan - 天干(例: '壬')
 * @returns {string} 訓読み(例: 'みずのえ')
 */
export function getTenkanYomi(kan) {
  return TENKAN_YOMI[kan] || '';
}
