/**
 * mbti-engine.js
 * PANDA FORTUNE — MBTIエンジン
 *
 * mypersonality.net/compatibility の相性表に基づく
 * 16タイプ × 16タイプの4段階相性判定モジュール
 *
 * 依存なし・DOM操作なし・純粋な判定ロジックのみ
 *
 * ———————————————————————————————————————————————————————
 * エクスポートする関数：
 *   getMbtiCompatibility(typeA, typeB)  → MbtiResult
 *   getMbtiLevel(typeA, typeB)          → number (0-3)
 *   getAllMbtiTypes()                   → string[]
 *   getMbtiCompatChart(typeA)           → { type, level, label }[]
 *   getMbtiScoreForCompat(typeA, typeB) → number (0-99)
 *   calcMbtiScore(typeA, typeB)         → number (PANDA FORTUNE ブリッジ)
 *   getMbtiInfo(typeA, typeB)           → MbtiResult + scoreCustom
 *
 * MbtiResult = {
 *   typeA:      string,   // "INTJ" etc.
 *   typeB:      string,
 *   level:      number,   // 0=incompatible, 1=somewhat, 2=compatible, 3=very
 *   label:      string,   // "とても相性が良い" etc.
 *   labelEn:    string,   // "Very compatible" etc.
 *   score:      number,   // 数値スコア (0-99) compat-logic.js 連携用
 *   color:      string,   // 表示用カラー
 *   emoji:      string,   // 表示用絵文字
 *   description:string,   // 日本語の説明文
 * }
 * ———————————————————————————————————————————————————————
 * データソース: https://mypersonality.net/compatibility
 * 4段階: Very compatible / Compatible / Somewhat compatible / Incompatible
 * ———————————————————————————————————————————————————————
 */

// ════════════════════════════════════════════════════════
// 16タイプ定義（マトリクスのインデックス順）
// ════════════════════════════════════════════════════════

// NOTE: 元HTML 247行の MBTI_TYPES を MBTI_TYPES_16 にリネーム。
// 3696行の MBTI_TYPES（後方互換配列）と衝突しないようにするため。
export const MBTI_TYPES_16 = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',   // NT（分析家）
  'INFJ', 'INFP', 'ENFJ', 'ENFP',   // NF（外交官）
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',   // SJ（番人）
  'ISTP', 'ISFP', 'ESTP', 'ESFP',   // SP（探検家）
];

// タイプ文字列 → インデックス（高速検索用）
const TYPE_INDEX = {};
MBTI_TYPES_16.forEach((t, i) => { TYPE_INDEX[t] = i; });

// ════════════════════════════════════════════════════════
// 4段階レベル定義
// ════════════════════════════════════════════════════════

/**
 * レベル値:
 *   3 = Very compatible    （とても相性が良い）
 *   2 = Compatible          （相性が良い）
 *   1 = Somewhat compatible （まあまあの相性）
 *   0 = Incompatible        （相性が悪い）
 */
export const LEVEL_META = [
  {
    level: 0,
    label:   '相性が悪い',
    labelEn: 'Incompatible',
    score:   35,
    color:   'rgba(220, 80, 80, 0.85)',
    emoji:   '⚡',
    description: '価値観やコミュニケーションの違いが大きく、お互いの理解には相当な努力が必要です。',
  },
  {
    level: 1,
    label:   'まあまあの相性',
    labelEn: 'Somewhat compatible',
    score:   55,
    color:   'rgba(220, 180, 60, 0.85)',
    emoji:   '🔸',
    description: '共通点はあるものの違いも多く、妥協と歩み寄りが必要です。',
  },
  {
    level: 2,
    label:   '相性が良い',
    labelEn: 'Compatible',
    score:   77,
    color:   'rgba(100, 190, 130, 0.85)',
    emoji:   '🔹',
    description: '互いの違いを補い合える良好な関係を築きやすい組み合わせです。',
  },
  {
    level: 3,
    label:   'とても相性が良い',
    labelEn: 'Very compatible',
    score:   92,
    color:   'rgba(80, 140, 240, 0.85)',
    emoji:   '💎',
    description: '価値観やコミュニケーションが自然に噛み合い、深い絆を育みやすい最高の組み合わせです。',
  },
];

// ════════════════════════════════════════════════════════
// 16×16 相性マトリクス
// mypersonality.net/compatibility から全ペアを収集
//
// 行・列の順序は MBTI_TYPES_16 と同一:
//   INTJ INTP ENTJ ENTP INFJ INFP ENFJ ENFP
//   ISTJ ISFJ ESTJ ESFJ ISTP ISFP ESTP ESFP
//
// 値: 3=Very, 2=Compatible, 1=Somewhat, 0=Incompatible
// 対称行列（A-B の相性 = B-A の相性）
// ════════════════════════════════════════════════════════

const COMPAT_MATRIX = [
  //       INTJ INTP ENTJ ENTP INFJ INFP ENFJ ENFP ISTJ ISFJ ESTJ ESFJ ISTP ISFP ESTP ESFP
  /* INTJ */[2,  1,   3,   3,   2,   1,   3,   3,   1,   1,   1,   0,   1,   0,   2,   0],
  /* INTP */[1,  3,   3,   3,   3,   3,   1,   3,   1,   0,   0,   0,   1,   1,   1,   0],
  /* ENTJ */[3,  3,   3,   3,   2,   0,   3,   3,   1,   1,   1,   1,   1,   0,   0,   0],
  /* ENTP */[3,  3,   3,   3,   1,   1,   1,   3,   1,   1,   1,   0,   1,   1,   3,   1],
  /* INFJ */[2,  3,   2,   1,   3,   3,   3,   3,   1,   3,   0,   1,   0,   1,   0,   1],
  /* INFP */[1,  3,   0,   1,   3,   1,   3,   3,   0,   1,   0,   2,   1,   3,   0,   1],
  /* ENFJ */[3,  1,   3,   1,   3,   3,   3,   3,   1,   2,   0,   3,   0,   3,   1,   1],
  /* ENFP */[3,  3,   3,   3,   3,   3,   3,   3,   1,   1,   1,   1,   0,   1,   1,   1],
  /* ISTJ */[1,  1,   1,   1,   1,   0,   1,   1,   3,   3,   3,   2,   2,   2,   3,   3],
  /* ISFJ */[1,  0,   1,   1,   3,   1,   2,   1,   3,   3,   2,   2,   1,   2,   1,   3],
  /* ESTJ */[1,  0,   1,   1,   0,   0,   0,   1,   3,   2,   3,   2,   1,   1,   2,   1],
  /* ESFJ */[0,  0,   1,   0,   1,   2,   3,   1,   2,   2,   2,   3,   1,   2,   3,   2],
  /* ISTP */[1,  1,   1,   1,   0,   1,   0,   0,   2,   1,   1,   1,   3,   1,   3,   3],
  /* ISFP */[0,  1,   0,   1,   1,   3,   3,   1,   2,   2,   1,   2,   1,   1,   1,   2],
  /* ESTP */[2,  1,   0,   3,   0,   0,   1,   1,   3,   1,   2,   3,   3,   1,   3,   2],
  /* ESFP */[0,  0,   0,   1,   1,   1,   1,   1,   3,   3,   1,   2,   3,   2,   2,   3],
];

// ════════════════════════════════════════════════════════
// MBTIタイプ・グループ情報
// ════════════════════════════════════════════════════════

export const MBTI_GROUPS = {
  NT: { label: '分析家', types: ['INTJ','INTP','ENTJ','ENTP'], color: '#7B68EE' },
  NF: { label: '外交官', types: ['INFJ','INFP','ENFJ','ENFP'], color: '#3CB371' },
  SJ: { label: '番人',   types: ['ISTJ','ISFJ','ESTJ','ESFJ'], color: '#4682B4' },
  SP: { label: '探検家', types: ['ISTP','ISFP','ESTP','ESFP'], color: '#DAA520' },
};

/**
 * タイプからグループキーを返す
 * @param {string} type "INTJ" etc.
 * @returns {'NT'|'NF'|'SJ'|'SP'|null}
 */
export function getMbtiGroup(type) {
  for (const [key, g] of Object.entries(MBTI_GROUPS)) {
    if (g.types.includes(type)) return key;
  }
  return null;
}

// ════════════════════════════════════════════════════════
// 公開API
// ════════════════════════════════════════════════════════

/**
 * 入力文字列を正規化する（大文字化、-A/-T除去）
 * @param {string} raw "infp-T" → "INFP"
 * @returns {string|null}
 */
export function normalizeMbtiType(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const cleaned = raw.trim().toUpperCase().replace(/-[AT]$/, '');
  return TYPE_INDEX[cleaned] !== undefined ? cleaned : null;
}

/**
 * 2タイプ間の相性レベル（0-3）を返す
 * @param {string} typeA
 * @param {string} typeB
 * @returns {number} 0-3, 無効な入力なら -1
 */
export function getMbtiLevel(typeA, typeB) {
  const a = normalizeMbtiType(typeA);
  const b = normalizeMbtiType(typeB);
  if (a === null || b === null) return -1;
  return COMPAT_MATRIX[TYPE_INDEX[a]][TYPE_INDEX[b]];
}

/**
 * 2タイプ間の詳細な相性情報を返す
 * @param {string} typeA "INTJ", "infp-T" 等（正規化される）
 * @param {string} typeB
 * @returns {MbtiResult|null}
 */
export function getMbtiCompatibility(typeA, typeB) {
  const a = normalizeMbtiType(typeA);
  const b = normalizeMbtiType(typeB);
  if (a === null || b === null) return null;

  const level = COMPAT_MATRIX[TYPE_INDEX[a]][TYPE_INDEX[b]];
  const meta  = LEVEL_META[level];

  return {
    typeA:       a,
    typeB:       b,
    groupA:      getMbtiGroup(a),
    groupB:      getMbtiGroup(b),
    level:       meta.level,
    label:       meta.label,
    labelEn:     meta.labelEn,
    score:       meta.score,
    color:       meta.color,
    emoji:       meta.emoji,
    description: meta.description,
  };
}

/**
 * 指定タイプと全16タイプとの相性一覧を返す
 * @param {string} type
 * @returns {{ type: string, level: number, label: string }[]|null}
 */
export function getMbtiCompatChart(type) {
  const a = normalizeMbtiType(type);
  if (a === null) return null;

  return MBTI_TYPES_16.map(b => {
    const level = COMPAT_MATRIX[TYPE_INDEX[a]][TYPE_INDEX[b]];
    return { type: b, level, label: LEVEL_META[level].label };
  });
}

/**
 * 全16タイプの配列を返す
 * @returns {string[]}
 */
export function getAllMbtiTypes() {
  return [...MBTI_TYPES_16];
}

// ════════════════════════════════════════════════════════
// PANDA FORTUNE ブリッジ（旧 compat-logic.js 連携）
// ════════════════════════════════════════════════════════

const _MBTI_SCORE_MAP_4 = { 0: 48, 1: 64, 2: 79, 3: 95 };

/**
 * レベル値（0-3）を compat-logic.js 用の数値スコア（0-99）に変換する
 * @param {string} typeA
 * @param {string} typeB
 * @returns {number} 0-99
 */
export function getMbtiScoreForCompat(typeA, typeB) {
  const level = getMbtiLevel(typeA, typeB);
  if (level < 0) return 70; // デフォルト（compat-logic.js と同じ）
  return LEVEL_META[level].score;
}

/**
 * calcMbtiScore: compat-logic.js 互換の MBTI スコア計算（カスタムテーブル版）
 * @param {string} typeA
 * @param {string} typeB
 * @returns {number}
 */
export function calcMbtiScore(typeA, typeB) {
  const level = getMbtiLevel(typeA, typeB);
  if (level < 0) return 70;
  return _MBTI_SCORE_MAP_4[level];
}

/**
 * getMbtiInfo: 詳細情報 + scoreCustom（カスタムスコア）を付加
 * @param {string} typeA
 * @param {string} typeB
 * @returns {(MbtiResult & { scoreCustom: number })|null}
 */
export function getMbtiInfo(typeA, typeB) {
  const result = getMbtiCompatibility(typeA, typeB);
  if (!result) return null;
  result.scoreCustom = _MBTI_SCORE_MAP_4[result.level];
  return result;
}
