// ==========================================================
// 日柱ランキング — 動画自動投稿ワークフロー用
// ==========================================================
// 既存ロジック (calcMeishiki, calcDailyScore, calcMonthlyScore) を使い、
// 60日柱をスコア順にランキングする。既存ファイルのロジックは一切変更しない。
//
// 各日柱について「その日柱が実際に出現する日付」を基準日として calcMeishiki を呼び、
// 完全な四柱(年柱・月柱・時柱含む)を持つリアルな命式を生成する。
// これにより同一天干の日柱でも地支・月柱・年柱が異なり、スコアにバリエーションが出る。
//
// 使い方:
//   import { calcDayPillarRanking, calcDayPillarRankingMonthly } from './dayPillarRanking.js';
//   const top3 = calcDayPillarRanking('money', new Date('2026-04-28'), { top: 3 });
//   const top3m = calcDayPillarRankingMonthly('money', 2026, 4, { top: 3 });

import { JIKKAN, JUNISHI, calcMeishiki } from '../engines/meishikiEngine.js';
import { calcDailyScore, calcMonthlyScore } from './fortuneCalc.js';

// ── 60日柱 → 基準日付のマッピング生成 ──
// 2020-01-01 (= 癸卯日) を起点に、各日柱が初めて出現する日付を算出。
// 60日柱は60日周期で繰り返すので、オフセット 0-59 で全60種が一意に決まる。
function _buildKanshiDateMap() {
  function _jdn(y, m, d) {
    if (m <= 2) { y--; m += 12; }
    const A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524;
  }
  const baseDiff = _jdn(2020, 1, 1) - 2415021;
  const baseKi = ((baseDiff % 10) + 10) % 10;
  const baseSi = ((baseDiff + 10) % 12 + 12) % 12;

  const map = [];
  for (let i = 0; i < 60; i++) {
    const targetKi = i % 10;
    const targetSi = i % 12;
    for (let o = 0; o < 60; o++) {
      if ((baseKi + o) % 10 === targetKi && (baseSi + o) % 12 === targetSi) {
        const d = new Date(2020, 0, 1 + o);
        map.push({
          idx: i,
          kan: JIKKAN[targetKi],
          shi: JUNISHI[targetSi],
          kanIdx: targetKi,
          shiIdx: targetSi,
          refYear: d.getFullYear(),
          refMonth: d.getMonth() + 1,
          refDay: d.getDate(),
        });
        break;
      }
    }
  }
  return map;
}

const KANSHI_60 = _buildKanshiDateMap();

// ── 命式キャッシュ(モジュールレベル) ──
const _meishikiCache = new Map();

/**
 * 指定の日柱に対して、実際にその日柱が出現する日付から calcMeishiki を呼び、
 * 完全な命式オブジェクトを生成する。
 *
 * @param {string} kan - 日柱の天干 (例: '庚')
 * @param {string} shi - 日柱の地支 (例: '申')
 * @returns {Object} calcDailyScore / calcMonthlyScore 互換の calc オブジェクト
 */
export function createNeutralMeishiki(kan, shi) {
  const key = kan + shi;
  if (_meishikiCache.has(key)) return _meishikiCache.get(key);

  const entry = KANSHI_60.find(e => e.kan === kan && e.shi === shi);
  if (!entry) throw new Error(`Unknown day pillar: ${key}`);

  const calc = calcMeishiki({
    year: entry.refYear,
    month: entry.refMonth,
    day: entry.refDay,
    hourInput: 12,
    gender: 'x',
    longitude: 135,
    mbti: '',
  });

  _meishikiCache.set(key, calc);
  return calc;
}

// ── 共通ソートロジック ──
// 1次: 指定カテゴリのスコア
// 2次: 残り3カテゴリのスコア合計(同点解消)
// 3次: KANSHI_60 インデックス(確定的な順序保証)
const ALL_CATEGORIES = ['total', 'love', 'work', 'money'];

function _sortResults(results, category, direction) {
  const others = ALL_CATEGORIES.filter(c => c !== category);
  results.sort((a, b) => {
    // 1次キー
    const d1 = direction === 'desc' ? b.score - a.score : a.score - b.score;
    if (d1 !== 0) return d1;
    // 2次キー: 残り3カテゴリ合計
    const aOther = others.reduce((sum, c) => sum + a.scoreBreakdown[c], 0);
    const bOther = others.reduce((sum, c) => sum + b.scoreBreakdown[c], 0);
    const d2 = direction === 'desc' ? bOther - aOther : aOther - bOther;
    if (d2 !== 0) return d2;
    // 3次キー: KANSHI_60 インデックス(常に昇順)
    return a.kanIdx * 12 + a.shiIdx - (b.kanIdx * 12 + b.shiIdx);
  });
}

function _validateCategory(category) {
  if (!ALL_CATEGORIES.includes(category)) {
    throw new Error(`Invalid category: ${category}. Must be one of: ${ALL_CATEGORIES.join(', ')}`);
  }
}

/**
 * 指定日・指定カテゴリで日柱60種を日運ランキングする。
 *
 * @param {'total'|'love'|'work'|'money'} category
 * @param {Date} date
 * @param {Object} [options]
 * @param {number} [options.top=3]
 * @param {'desc'|'asc'} [options.direction='desc']
 * @returns {Array<{rank, dayPillar, kan, shi, kanIdx, shiIdx, score, scoreBreakdown}>}
 */
export function calcDayPillarRanking(category, date, options = {}) {
  const { top = 3, direction = 'desc' } = options;
  _validateCategory(category);

  const results = KANSHI_60.map(({ kan, shi, kanIdx, shiIdx }) => {
    const calc = createNeutralMeishiki(kan, shi);
    const s = calcDailyScore(calc, date);
    return {
      dayPillar: kan + shi,
      kan, shi, kanIdx, shiIdx,
      score: s[category],
      scoreBreakdown: { total: s.total, love: s.love, work: s.work, money: s.money },
    };
  });

  _sortResults(results, category, direction);

  return results.slice(0, top).map((r, i) => ({ rank: i + 1, ...r }));
}

/**
 * 指定年月・指定カテゴリで日柱60種を月運ランキングする。
 *
 * @param {'total'|'love'|'work'|'money'} category
 * @param {number} year
 * @param {number} month (1-12)
 * @param {Object} [options]
 * @param {number} [options.top=3]
 * @param {'desc'|'asc'} [options.direction='desc']
 * @returns {Array<{rank, dayPillar, kan, shi, kanIdx, shiIdx, score, scoreBreakdown}>}
 */
export function calcDayPillarRankingMonthly(category, year, month, options = {}) {
  const { top = 3, direction = 'desc' } = options;
  _validateCategory(category);

  const results = KANSHI_60.map(({ kan, shi, kanIdx, shiIdx }) => {
    const calc = createNeutralMeishiki(kan, shi);
    const s = calcMonthlyScore(calc, year, month);
    return {
      dayPillar: kan + shi,
      kan, shi, kanIdx, shiIdx,
      score: s[category],
      scoreBreakdown: { total: s.total, love: s.love, work: s.work, money: s.money },
    };
  });

  _sortResults(results, category, direction);

  return results.slice(0, top).map((r, i) => ({ rank: i + 1, ...r }));
}
