// ══════════════════════════════════════════════════════════════
//  PANDA FORTUNE — MBTI 表示用定数
//  元HTML 3655-3700行。CompatTab・EditModal 等で使用。
//
//  mbtiEngine.js の MBTI_TYPES_16 は「判定ロジック用の16タイプ配列」、
//  こちらは「UIドロップダウン用の32通り（16タイプ × A/T） + わからない」。
//  役割が違うので別モジュールに分離している。
// ══════════════════════════════════════════════════════════════

/** 16タイプの日本語愛称 */
export const MBTI_NAMES = {
  INTJ: '建築家',  INTP: '論理学者', ENTJ: '指揮官', ENTP: '討論者',
  INFJ: '提唱者',  INFP: '仲介者',   ENFJ: '主人公', ENFP: '広報活動家',
  ISTJ: '管理者',  ISFJ: '擁護者',   ESTJ: '幹部',   ESFJ: '領事',
  ISTP: '巨匠',   ISFP: '冒険家',   ESTP: '起業家', ESFP: 'エンターテイナー',
};

/** ドロップダウン用: わからない + 16×2 = 33 エントリ */
export const MBTI_TYPES_32 = [
  { value: 'わからない', label: 'わからない' },
  { value: 'INTJ-A', label: 'INTJ-A（建築家・自信型）' },
  { value: 'INTJ-T', label: 'INTJ-T（建築家・慎重型）' },
  { value: 'INTP-A', label: 'INTP-A（論理学者・自信型）' },
  { value: 'INTP-T', label: 'INTP-T（論理学者・慎重型）' },
  { value: 'ENTJ-A', label: 'ENTJ-A（指揮官・自信型）' },
  { value: 'ENTJ-T', label: 'ENTJ-T（指揮官・慎重型）' },
  { value: 'ENTP-A', label: 'ENTP-A（討論者・自信型）' },
  { value: 'ENTP-T', label: 'ENTP-T（討論者・慎重型）' },
  { value: 'INFJ-A', label: 'INFJ-A（提唱者・自信型）' },
  { value: 'INFJ-T', label: 'INFJ-T（提唱者・慎重型）' },
  { value: 'INFP-A', label: 'INFP-A（仲介者・自信型）' },
  { value: 'INFP-T', label: 'INFP-T（仲介者・慎重型）' },
  { value: 'ENFJ-A', label: 'ENFJ-A（主人公・自信型）' },
  { value: 'ENFJ-T', label: 'ENFJ-T（主人公・慎重型）' },
  { value: 'ENFP-A', label: 'ENFP-A（広報活動家・自信型）' },
  { value: 'ENFP-T', label: 'ENFP-T（広報活動家・慎重型）' },
  { value: 'ISTJ-A', label: 'ISTJ-A（管理者・自信型）' },
  { value: 'ISTJ-T', label: 'ISTJ-T（管理者・慎重型）' },
  { value: 'ISFJ-A', label: 'ISFJ-A（擁護者・自信型）' },
  { value: 'ISFJ-T', label: 'ISFJ-T（擁護者・慎重型）' },
  { value: 'ESTJ-A', label: 'ESTJ-A（幹部・自信型）' },
  { value: 'ESTJ-T', label: 'ESTJ-T（幹部・慎重型）' },
  { value: 'ESFJ-A', label: 'ESFJ-A（領事・自信型）' },
  { value: 'ESFJ-T', label: 'ESFJ-T（領事・慎重型）' },
  { value: 'ISTP-A', label: 'ISTP-A（巨匠・自信型）' },
  { value: 'ISTP-T', label: 'ISTP-T（巨匠・慎重型）' },
  { value: 'ISFP-A', label: 'ISFP-A（冒険家・自信型）' },
  { value: 'ISFP-T', label: 'ISFP-T（冒険家・慎重型）' },
  { value: 'ESTP-A', label: 'ESTP-A（起業家・自信型）' },
  { value: 'ESTP-T', label: 'ESTP-T（起業家・慎重型）' },
  { value: 'ESFP-A', label: 'ESFP-A（エンターテイナー・自信型）' },
  { value: 'ESFP-T', label: 'ESFP-T（エンターテイナー・慎重型）' },
];

/** 旧 MBTI_TYPES（後方互換） 33要素の value 配列。元HTML 3696行。 */
export const MBTI_TYPE_VALUES = MBTI_TYPES_32.map((m) => m.value);

/** 時刻プルダウンの選択肢（十二刻）。元HTML 3697行。 */
export const HOURS = [
  'わからない',
  '子の刻 23:00-01:00',
  '丑の刻 01:00-03:00',
  '寅の刻 03:00-05:00',
  '卯の刻 05:00-07:00',
  '辰の刻 07:00-09:00',
  '巳の刻 09:00-11:00',
  '午の刻 11:00-13:00',
  '未の刻 13:00-15:00',
  '申の刻 15:00-17:00',
  '酉の刻 17:00-19:00',
  '戌の刻 19:00-21:00',
  '亥の刻 21:00-23:00',
];

/** 相性タブで選べる関係性。元HTML 3698行。 */
export const RELATIONS = ['恋人・パートナー', '気になる人', '配偶者', '友人', '職場の人', '家族'];

/** 新規パートナー登録フォームの初期値。元HTML 3700行。 */
export const EMPTY_PARTNER = {
  name: '',
  year: '',
  month: '',
  day: '',
  hour: 'わからない',
  gender: '女性',
  mbti: 'わからない',
  relation: '恋人・パートナー',
  birthPlace: '',
  resolvedLon: null,
  geoStatus: '',
};

/**
 * CompatTab・compatCalc 共通で使う
 * 「子の刻 23:00-01:00」→ 0 のようなマッピング。
 * 元HTML 3719-3725行。
 */
export const KOKU_MAP = {
  'わからない': -1,
  '子の刻 23:00-01:00': 0,
  '丑の刻 01:00-03:00': 2,
  '寅の刻 03:00-05:00': 4,
  '卯の刻 05:00-07:00': 6,
  '辰の刻 07:00-09:00': 8,
  '巳の刻 09:00-11:00': 10,
  '午の刻 11:00-13:00': 12,
  '未の刻 13:00-15:00': 14,
  '申の刻 15:00-17:00': 16,
  '酉の刻 17:00-19:00': 18,
  '戌の刻 19:00-21:00': 20,
  '亥の刻 21:00-23:00': 22,
};
