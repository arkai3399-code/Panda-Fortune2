// ══════════════════════════════════════════════════════════════
//  PANDA FORTUNE — 60干支テーブル + 日付→干支 ヘルパー
//  元HTML 2309-2328行。
//
//  meishikiEngine.js 側にも JIKKAN/JUNISHI 相当の配列があるが、
//  こちらは「日付→干支」変換のユーティリティ専用モジュール。
//  UIから軽く呼び出したいときに使う。
// ══════════════════════════════════════════════════════════════

export const KAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
export const SHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

export const KANSHI_60 = Array.from({ length: 60 }, (_, i) => KAN[i % 10] + SHI[i % 12]);

/**
 * 指定日付の干支 index（0-59）を返す。
 * 基準: 2000年1月1日 = 戊午 = index 54
 * @param {number} year
 * @param {number} month - 1〜12
 * @param {number} day
 * @returns {number} 0-59
 */
export function getKanshiIndex(year, month, day) {
  const base = new Date(2000, 0, 1);
  const target = new Date(year, month - 1, day);
  const diff = Math.round((target - base) / 86400000);
  return ((54 + diff) % 60 + 60) % 60;
}

/** 干支文字列（例 "戊午"）を返す */
export function getKanshi(year, month, day) {
  return KANSHI_60[getKanshiIndex(year, month, day)];
}

/** 日干 index（0-9）を返す */
export function getStem(year, month, day) {
  return getKanshiIndex(year, month, day) % 10;
}

/** 日支 index（0-11）を返す */
export function getBranch(year, month, day) {
  return getKanshiIndex(year, month, day) % 12;
}
