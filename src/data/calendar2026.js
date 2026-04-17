// ══════════════════════════════════════════════════════════════
//  PANDA FORTUNE — 2026年 暦データ（六曜・特別日）
//  元HTML 2331-2411行。
// ══════════════════════════════════════════════════════════════

/**
 * 2026年の旧暦新月（朔日）概算。
 * 六曜（先勝/友引/先負/仏滅/大安/赤口）計算の基準となる。
 * 元HTML 2332-2344行。
 */
export const SHUO_2026 = [
  new Date(2026, 1, 17),  // 旧暦1月1日 = 2/17（春節）
  new Date(2026, 2, 19),  // 旧暦2月1日 = 3/19
  new Date(2026, 3, 17),  // 旧暦3月1日 = 4/17
  new Date(2026, 4, 17),  // 旧暦4月1日 = 5/17
  new Date(2026, 5, 15),  // 旧暦5月1日 = 6/15
  new Date(2026, 6, 14),  // 旧暦6月1日 = 7/14
  new Date(2026, 7, 13),  // 旧暦7月1日 = 8/13
  new Date(2026, 8, 11),  // 旧暦8月1日 = 9/11
  new Date(2026, 9, 11),  // 旧暦9月1日 = 10/11
  new Date(2026, 10, 9),  // 旧暦10月1日 = 11/9
  new Date(2026, 11, 9),  // 旧暦11月1日 = 12/9
];

export const ROKUYO_NAMES = ['先勝', '友引', '先負', '仏滅', '大安', '赤口'];

export const ROKUYO_COLORS = {
  '大安': '#4a9a5a',
  '友引': '#5a7aaa',
  '先勝': '#8a7a3a',
  '先負': '#6a6a7a',
  '仏滅': '#7a3a3a',
  '赤口': '#9a4a3a',
};

/**
 * 指定日付の旧暦月日を返す（2026年向け概算）。
 */
export function getLunarMonthDay(year, month, day) {
  const d = new Date(year, month - 1, day);
  let lm = 1, ld = 1;
  for (let i = 0; i < SHUO_2026.length; i++) {
    const diff = Math.round((d - SHUO_2026[i]) / 86400000);
    if (diff >= 0) { lm = i + 1; ld = diff + 1; }
    else break;
  }
  return { lm, ld };
}

/**
 * 指定日付の六曜を返す。
 * 元HTML 2365-2369行。
 */
export function getRokuyo(year, month, day) {
  const { lm, ld } = getLunarMonthDay(year, month, day);
  return ROKUYO_NAMES[(((lm - 1) % 6) + (ld - 1)) % 6];
}

/**
 * 日本の暦の特別日（節句・祝日など）。
 * キー形式: "YYYY-M-D"
 * 元HTML 2401-2408行。
 */
export const SPECIAL_DAYS_2026 = {
  '2026-3-3':  { label: '上巳',       icon: '🎎' },
  '2026-3-20': { label: '春分',       icon: '🌸' },
  '2026-4-1':  { label: '新年度',     icon: '🌱' },
  '2026-4-29': { label: '昭和の日',   icon: '🎌' },
  '2026-5-3':  { label: '憲法記念',   icon: '🎌' },
  '2026-5-5':  { label: 'こどもの日', icon: '🎏' },
};
