// ══════════════════════════════════════════════════════════════
//  PANDA FORTUNE — 相性詳細計算ロジック (compatCalcFull)
//  compatScript.js の20セクションを純粋な計算ロジックとして抽出。
//  DOM操作は一切行わず、result オブジェクトにすべての結果を格納する。
// ══════════════════════════════════════════════════════════════

import {
  GOGYO, SEI, KOKU, SHIGOU, ROKUCHUU, KANGO,
  SNAME, SNAME_FULL, JIKKAN,
  NIKCHU_PROFILES, GOGYO_PERSONA, GOGYO_HOWSEE,
  ADV_BY_TYPE,
  MBTI_32_COMPAT, MBTI_PAIR_TEXTS_528, MBTI_PROFILES,
  COGNITIVE_STACK, SUBTYPE_COMBO_DESC,
  SCORE_MAP, AXIS_LABELS, AXIS_DESC,
  TSUHEN_MBTI_MAP, KISHIN_ENV_MAP,
  GOGYO_MBTI_PROFILE, GOGYO_REL_DESC,
  GOGYO_MBTI_AFFINITY, CF_DESC,
} from '../data/compatData.js';
import SYNTHESIS_DICT_JA, {
  fillTemplate as _synFill,
  getTopGodPair as _synGetTopGodPair,
  getSpecialStarPair as _synGetSpecialStarPair,
} from '../data/synthesisDictionary.js';
import { getGenmei as _synGetGenmei } from '../data/genmeiText.js';

// ── 三合・三刑・天地徳合 定数 ────────────────────────────────
// 三合: 3つの地支が揃うと強力なエネルギーを生む
const SANGOU = [
  ['申','子','辰'], // 水局
  ['亥','卯','未'], // 木局
  ['寅','午','戌'], // 火局
  ['巳','酉','丑'], // 金局
];

// 三刑タイプ判定（2支ペアキー → 種類名）
const SANKEI_TYPE = {
  '子卯':'礼なき刑', '卯子':'礼なき刑',
  '寅巳':'恃勢の刑', '巳申':'恃勢の刑', '申寅':'恃勢の刑',
  '巳寅':'恃勢の刑', '申巳':'恃勢の刑', '寅申':'恃勢の刑',
  '丑戌':'恩なき刑', '戌未':'恩なき刑', '未丑':'恩なき刑',
  '戌丑':'恩なき刑', '未戌':'恩なき刑', '丑未':'恩なき刑',
};

// 六十干支リスト（天地徳合の有効チェック用）
const ROKUJUKANSHI = (function(){
  var KAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  var SHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  var list = [];
  for (var i = 0; i < 60; i++) list.push(KAN[i%10] + SHI[i%12]);
  return list;
})();

// ── Helper functions ──────────────────────────────────────────
function remapTo(val, srcMin, srcMax) {
  return Math.max(48, Math.min(95, (val - srcMin) / (srcMax - srcMin) * (95 - 48) + 48));
}

function normalizeScore(val, vmin, vmax) {
  return Math.max(48, Math.min(95, (val - vmin) / (vmax - vmin) * (95 - 48) + 48));
}

function badge(score, type) {
  if (type === 'caution') return '<span class="sbadge caution">注意</span>';
  if (score >= 88) return '<span class="sbadge great">最高</span>';
  if (score >= 78) return '<span class="sbadge good">良好</span>';
  if (score >= 68) return '<span class="sbadge good">普通</span>';
  if (score >= 55) return '<span class="sbadge caution">要注意</span>';
  return '<span class="sbadge caution">厳しい</span>';
}

function scoreColor(s) {
  return s >= 85 ? 'var(--gold)' : s >= 72 ? 'var(--blue)' : s >= 60 ? 'var(--green)' : 'rgba(200,110,90,.9)';
}

/**
 * スコア帯に応じて占星術項目の文章にトーン調整を加える
 * @param {number} score - 項目スコア
 * @param {string} positiveDesc - 75点以上用のベース文
 * @param {string} neutralDesc  - 60-74点用のベース文
 * @param {string} cautiousDesc - 59点以下用のベース文
 * @returns {string}
 */
function tonedAstroDesc(score, positiveDesc, neutralDesc, cautiousDesc) {
  if (score >= 75) return positiveDesc;
  if (score >= 60) return neutralDesc;
  return cautiousDesc;
}

function getBaseType(mbti) {
  return mbti ? mbti.replace(/-(A|T)$/, '').replace(/[AT]$/, '').toUpperCase() : '';
}

function getSubtype(mbti) {
  if (!mbti) return null;
  var m = mbti.toUpperCase();
  if (m.endsWith('-A') || m.endsWith('A')) return 'A';
  if (m.endsWith('-T') || m.endsWith('T')) return 'T';
  return null;
}

function toKey(mbti) {
  if (!mbti || mbti === 'わからない') return null;
  var base = getBaseType(mbti);
  var sub = getSubtype(mbti);
  return sub ? base + '-' + sub : base + '-A';
}


// 【性別トーン調整の設計思想】
// - 異性は相性が悪くてもお互い優しくしやすいため、低スコアでも同性より柔らかく表現
// - 同性は相性が悪いとより嫌いになりやすいため、低スコアは強めに警告
// - 同性で相性が良い場合は特別な共鳴として強調する

/**
 * 性別ペアのトーン分類を返す
 * @param {string} myGender  - 'f','m','x','' など
 * @param {string} ptGender  - '女性','男性','その他','' など
 * @returns {'same'|'diff'|'neutral'}
 */
function getGenderTone(myGender, ptGender) {
  var normMy = (myGender === 'f' || myGender === '女性') ? 'f'
             : (myGender === 'm' || myGender === '男性') ? 'm' : '';
  var normPt = (ptGender === 'f' || ptGender === '女性') ? 'f'
             : (ptGender === 'm' || ptGender === '男性') ? 'm' : '';
  if (!normMy || !normPt) return 'neutral';
  return normMy === normPt ? 'same' : 'diff';
}

/**
 * スコア + 性別トーンに基づいてラベルテキストを返す
 * @param {number} score
 * @param {'same'|'diff'|'neutral'} tone
 * @param {string} ptName
 * @returns {string}
 */
function getTonedLabel(score, tone, ptName) {
  // ── 同性（男×男・女×女）──
  if (tone === 'same') {
    if (score >= 88) return '魂レベルで共鳴する、唯一無二の関係ンダ✨✨ これほどの縁はめったにないんダよ🐼';
    if (score >= 75) return '同じ気質だからこそ深く響き合える、特別な相性ンダ✨';
    if (score >= 56) return 'バランスの取れた関係ンダ🐼';
    return '⚠ 同じ気質が衝突しやすい組み合わせンダ。意識的に相手を尊重する努力が必要ンダよ🐼';
  }
  // ── 異性（男×女・女×男）──
  if (tone === 'diff') {
    if (score >= 88) return '運命的な縁で結ばれた、特別な2人ンダ✨✨';
    if (score >= 75) return '一緒にいるほど、お互いが成長できる関係ンダ✨';
    if (score >= 56) return '普段の関わり方を少し意識するだけで、もっと良くなれる関係ンダ🐼';
    return '焦らず、お互いのペースを尊重しながらゆっくり関係を育てていくといいンダよ🐼';
  }
  // ── neutral（性別未設定・その他）──
  if (score >= 88) return '2人は特別な縁で結ばれているンダ✨';
  if (score >= 75) return '一緒にいるほど、お互いが成長できる関係';
  if (score >= 56) return 'バランスの取れたよい関係ンダ';
  return '刺激し合うことで成長できる関係ンダ';
}

// ══════════════════════════════════════════════════════════════
//  SYNTHESIS sections builder (Phase 1)
//  仕様書: docs/phase1-compatCalcFull-spec.md (synthesisDictionary.md)
//  辞書:    src/data/synthesisDictionary.js
//
//  入力 {myCalc, ptCalc, myBase, ptBase, myGogyo, ptGogyo, gogyo_rel}
//  から、SYNTHESIS_DICT_JA を引いて 8 セクションのデータ配列を返す。
//  各セクション: { id, title, body, meta }
// ══════════════════════════════════════════════════════════════

// MBTI相性タイプ判定（モジュールスコアに hoisted・複数箇所で再利用）
function _getMbtiCompatType(a, b) {
  if (!a || !b) return { label: '─', desc: '─' };
  const aE = a[0] === 'E', bE = b[0] === 'E';
  const aN = a[1] === 'N', bN = b[1] === 'N';
  const aF = a[2] === 'F', bF = b[2] === 'F';
  const aJ = a[3] === 'J', bJ = b[3] === 'J';
  const same_ei = aE === bE, same_nb = aN === bN, same_tf = aF === bF, same_jp = aJ === bJ;
  const score = (same_ei ? 1 : 0) + (same_nb ? 2 : 0) + (same_tf ? 2 : 0) + (same_jp ? 1 : 0);
  if (score >= 5) return { label: '鏡型', desc: '価値観・思考パターンが非常に近い。理解し合いやすい反面、同じ盲点を持つこともある' };
  if (same_nb && same_tf) return { label: '共鳴型', desc: 'ものの見方と判断軸が一致している。深い話で自然に通じ合える関係' };
  if (!same_nb && !same_tf) return { label: '補完型', desc: '視点と判断軸が異なる。お互いの見えていない部分を補い合える関係' };
  if (same_nb && !same_tf) return { label: '共感型', desc: '世界の見方は似ているが、判断の仕方が違う。刺激的で学び合える関係' };
  return { label: '中和型', desc: '共通点と違いがバランス良く混在している。状況に応じて相性が変わる' };
}

// 十二運星 → エネルギー強度（synthesisDictionary.md エネルギー強度マップ）
const _JUNIU_ENERGY = {
  '帝旺': 100, '臨官': 85, '建禄': 85, '冠帯': 75, '長生': 70,
  '衰': 60, '養': 55, '沐浴': 50,
  '病': 40, '胎': 35, '墓': 30, '死': 20, '絶': 10,
};

// 十二運星ペアタイプ判定
function _judgeTwelveStagePairType(selfStage, partnerStage) {
  const a = _JUNIU_ENERGY[selfStage];
  const b = _JUNIU_ENERGY[partnerStage];
  if (typeof a !== 'number' || typeof b !== 'number') return 'imbalanced';
  if (a >= 70 && b >= 70) return 'equal_strong';
  if (a < 40 && b < 40) return 'equal_weak';
  if (Math.abs(a - b) >= 40) return 'complementary';
  return 'imbalanced';
}

// 喜神ペアタイプ判定
function _judgeKishinPairType(selfKishin, partnerKishin) {
  if (!Array.isArray(selfKishin) || !Array.isArray(partnerKishin)
      || selfKishin.length === 0 || partnerKishin.length === 0) return 'neutral';
  const overlap = selfKishin.filter(g => partnerKishin.indexOf(g) >= 0);
  if (overlap.length === selfKishin.length && overlap.length === partnerKishin.length) return 'identical';
  if (overlap.length === 0) return 'opposite';
  if (overlap.length > 0) return 'partial';
  return 'neutral';
}

// ==========================================================
// 恋人・配偶者向けスコア加点要素(4 関数 + 統合関数)
// ==========================================================

/**
 * 要素 1: 干合化気補完(+12)
 * 2 人の日干が干合し、化気五行が片方の命式で欠損(≤0.5)している場合に加点。
 */
function _calcKangoKakiFukkan(myCalc, ptCalc) {
  const myKan = myCalc && myCalc.pillars && myCalc.pillars.day && myCalc.pillars.day.kan;
  const ptKan = ptCalc && ptCalc.pillars && ptCalc.pillars.day && ptCalc.pillars.day.kan;
  if (!myKan || !ptKan) return { points: 0, matched: false, reason: '日干不明' };

  const KANGO_KAKI = {
    '甲己': '土', '己甲': '土',
    '乙庚': '金', '庚乙': '金',
    '丙辛': '水', '辛丙': '水',
    '丁壬': '木', '壬丁': '木',
    '戊癸': '火', '癸戊': '火',
  };
  const kaki = KANGO_KAKI[myKan + ptKan];
  if (!kaki) return { points: 0, matched: false, reason: '干合不成立' };

  const myVal = (myCalc.gokyo && myCalc.gokyo[kaki]) || 0;
  const ptVal = (ptCalc.gokyo && ptCalc.gokyo[kaki]) || 0;
  if (myVal <= 0.5 || ptVal <= 0.5) {
    return {
      points: 12, matched: true, kaki,
      reason: `干合化気 ${myKan}${ptKan}→${kaki}、欠損補完(self=${myVal}, pt=${ptVal})`,
    };
  }
  return {
    points: 0, matched: false, kaki,
    reason: `干合成立だが化気 ${kaki} は欠損なし(self=${myVal}, pt=${ptVal})`,
  };
}

/**
 * 日干→日干 の通変星を求めるヘルパー。
 */
function _getTsuhenseiFromKan(selfKan, targetKan) {
  const TABLE = {
    '甲': {'甲':'比肩','乙':'劫財','丙':'食神','丁':'傷官','戊':'偏財','己':'正財','庚':'偏官','辛':'正官','壬':'偏印','癸':'印綬'},
    '乙': {'甲':'劫財','乙':'比肩','丙':'傷官','丁':'食神','戊':'正財','己':'偏財','庚':'正官','辛':'偏官','壬':'印綬','癸':'偏印'},
    '丙': {'甲':'偏印','乙':'印綬','丙':'比肩','丁':'劫財','戊':'食神','己':'傷官','庚':'偏財','辛':'正財','壬':'偏官','癸':'正官'},
    '丁': {'甲':'印綬','乙':'偏印','丙':'劫財','丁':'比肩','戊':'傷官','己':'食神','庚':'正財','辛':'偏財','壬':'正官','癸':'偏官'},
    '戊': {'甲':'偏官','乙':'正官','丙':'偏印','丁':'印綬','戊':'比肩','己':'劫財','庚':'食神','辛':'傷官','壬':'偏財','癸':'正財'},
    '己': {'甲':'正官','乙':'偏官','丙':'印綬','丁':'偏印','戊':'劫財','己':'比肩','庚':'傷官','辛':'食神','壬':'正財','癸':'偏財'},
    '庚': {'甲':'偏財','乙':'正財','丙':'偏官','丁':'正官','戊':'偏印','己':'印綬','庚':'比肩','辛':'劫財','壬':'食神','癸':'傷官'},
    '辛': {'甲':'正財','乙':'偏財','丙':'正官','丁':'偏官','戊':'印綬','己':'偏印','庚':'劫財','辛':'比肩','壬':'傷官','癸':'食神'},
    '壬': {'甲':'食神','乙':'傷官','丙':'偏財','丁':'正財','戊':'偏官','己':'正官','庚':'偏印','辛':'印綬','壬':'比肩','癸':'劫財'},
    '癸': {'甲':'傷官','乙':'食神','丙':'正財','丁':'偏財','戊':'正官','己':'偏官','庚':'印綬','辛':'偏印','壬':'劫財','癸':'比肩'},
  };
  return (TABLE[selfKan] && TABLE[selfKan][targetKan]) || null;
}

/**
 * 要素 2: 配偶者星相互成立(+5 正財×正官 / +3 偏財×偏官)
 * gender は '男性'/'女性' を想定(不明/同性時は双方向チェック)。
 */
function _calcHaiguushaSeiritsu(myCalc, ptCalc) {
  const myKan = myCalc && myCalc.pillars && myCalc.pillars.day && myCalc.pillars.day.kan;
  const ptKan = ptCalc && ptCalc.pillars && ptCalc.pillars.day && ptCalc.pillars.day.kan;
  if (!myKan || !ptKan) return { points: 0, matched: false, reason: '日干不明' };

  const myToPt = _getTsuhenseiFromKan(myKan, ptKan);
  const ptToMy = _getTsuhenseiFromKan(ptKan, myKan);
  const myGender = myCalc.input && myCalc.input.gender;
  const ptGender = ptCalc.input && ptCalc.input.gender;
  const isMale = (g) => g === '男' || g === '男性';
  const isFemale = (g) => g === '女' || g === '女性';

  let femaleTo = null, maleTo = null;
  if (isFemale(myGender) && isMale(ptGender)) { femaleTo = myToPt; maleTo = ptToMy; }
  else if (isMale(myGender) && isFemale(ptGender)) { femaleTo = ptToMy; maleTo = myToPt; }

  if (femaleTo && maleTo) {
    if (femaleTo === '正財' && maleTo === '正官') return { points: 5, matched: true, reason: '正財×正官 相互成立' };
    if (femaleTo === '偏財' && maleTo === '偏官') return { points: 3, matched: true, reason: '偏財×偏官 相互成立' };
    return { points: 0, matched: false, reason: `配偶者星不成立(女→男=${femaleTo}, 男→女=${maleTo})` };
  }
  if ((myToPt === '正財' && ptToMy === '正官') || (myToPt === '正官' && ptToMy === '正財')) {
    return { points: 5, matched: true, reason: '正財×正官 相互成立(双方向)' };
  }
  if ((myToPt === '偏財' && ptToMy === '偏官') || (myToPt === '偏官' && ptToMy === '偏財')) {
    return { points: 3, matched: true, reason: '偏財×偏官 相互成立(双方向)' };
  }
  return { points: 0, matched: false, reason: `配偶者星不成立(${myToPt}×${ptToMy})` };
}

/**
 * 要素 3: 五行補完(+4) - 干合化気補完と重複排除
 */
function _calcGogyoFukkan(myCalc, ptCalc, kangoKakiMatched) {
  if (kangoKakiMatched) {
    return { points: 0, matched: false, reason: '干合化気補完と重複のため加点なし' };
  }
  const elements = ['木', '火', '土', '金', '水'];
  const matched = [];
  for (const el of elements) {
    const myVal = (myCalc.gokyo && myCalc.gokyo[el]) || 0;
    const ptVal = (ptCalc.gokyo && ptCalc.gokyo[el]) || 0;
    if (myVal <= 0.5 && ptVal >= 2) matched.push(`${el}(pt→self)`);
    if (ptVal <= 0.5 && myVal >= 2) matched.push(`${el}(self→pt)`);
  }
  if (matched.length > 0) {
    return { points: 4, matched: true, reason: `五行補完成立: ${matched.join(', ')}` };
  }
  return { points: 0, matched: false, reason: '五行補完なし' };
}

/**
 * 要素 4: 暗合(+3) - 日支の蔵干同士が天干五合を形成
 */
function _calcAngou(myCalc, ptCalc) {
  const myShi = myCalc && myCalc.pillars && myCalc.pillars.day && myCalc.pillars.day.shi;
  const ptShi = ptCalc && ptCalc.pillars && ptCalc.pillars.day && ptCalc.pillars.day.shi;
  if (!myShi || !ptShi) return { points: 0, matched: false, reason: '日支不明' };

  const ZOUKAN = {
    '子': ['壬', '癸'], '丑': ['己', '癸', '辛'], '寅': ['甲', '丙', '戊'],
    '卯': ['乙'], '辰': ['戊', '乙', '癸'], '巳': ['丙', '戊', '庚'],
    '午': ['丁', '己'], '未': ['己', '丁', '乙'], '申': ['庚', '戊', '壬'],
    '酉': ['辛'], '戌': ['戊', '辛', '丁'], '亥': ['壬', '甲'],
  };
  const KANGO_PAIRS = new Set(['甲己','己甲','乙庚','庚乙','丙辛','辛丙','丁壬','壬丁','戊癸','癸戊']);

  const myZ = ZOUKAN[myShi] || [];
  const ptZ = ZOUKAN[ptShi] || [];
  const matches = [];
  for (const mk of myZ) for (const pk of ptZ) {
    if (KANGO_PAIRS.has(mk + pk)) matches.push(`${mk}×${pk}`);
  }
  if (matches.length > 0) {
    return { points: 3, matched: true, reason: `日支蔵干暗合: ${myShi}中×${ptShi}中 = ${matches.join(', ')}` };
  }
  return { points: 0, matched: false, reason: '暗合なし' };
}

/**
 * 恋人・配偶者向け加点総計
 * 対象 4 続柄のみ適用(恋人・パートナー / 配偶者・婚約者 / 気になる人 / 元交際相手)。
 */
function _calcCoupleBonus(myCalc, ptCalc, relation) {
  const TARGET = ['恋人・パートナー', '配偶者', '気になる人', '元交際相手'];
  if (!TARGET.includes(relation)) {
    return { totalBonus: 0, applied: false, reason: `対象外続柄(${relation})`, details: {} };
  }
  const kangoKaki = _calcKangoKakiFukkan(myCalc, ptCalc);
  const haiguusha = _calcHaiguushaSeiritsu(myCalc, ptCalc);
  const gogyoFukkan = _calcGogyoFukkan(myCalc, ptCalc, kangoKaki.matched);
  const angou = _calcAngou(myCalc, ptCalc);
  const totalBonus = kangoKaki.points + haiguusha.points + gogyoFukkan.points + angou.points;
  return {
    totalBonus, applied: true, relation,
    details: { kangoKaki, haiguusha, gogyoFukkan, angou },
  };
}

/**
 * 日支の和合判定(正統派四柱推命の六合・三合)
 *
 * @param {string} s1 - 自分の日支(例: '子', '丑' ... '亥')
 * @param {string} s2 - 相手の日支
 * @returns {boolean} 六合または三合の関係なら true
 *
 * 古典: 地支六合 / 地支三合局
 *   六合: 子丑・寅亥・卯戌・辰酉・巳申・午未
 *   三合: 申子辰(水局)・亥卯未(木局)・寅午戌(火局)・巳酉丑(金局)
 */
function _isShiHarmony(s1, s2) {
  if (!s1 || !s2) return false;
  if (s1 === s2) return false;  // 同じ日支は比和(和合ではない)

  // 六合(地支六合)
  const rokugo = {
    '子': '丑', '丑': '子',
    '寅': '亥', '亥': '寅',
    '卯': '戌', '戌': '卯',
    '辰': '酉', '酉': '辰',
    '巳': '申', '申': '巳',
    '午': '未', '未': '午',
  };
  if (rokugo[s1] === s2) return true;

  // 三合(三合局)
  const sango = [
    ['申', '子', '辰'],  // 水局
    ['亥', '卯', '未'],  // 木局
    ['寅', '午', '戌'],  // 火局
    ['巳', '酉', '丑'],  // 金局
  ];
  for (const group of sango) {
    if (group.includes(s1) && group.includes(s2)) return true;
  }

  return false;
}

/**
 * 正統派四柱推命に基づく conclusion 判定
 *
 * 判定順序(優先度高→低):
 *   1. fast_bond(天地徳合的な強い引き合い)
 *      - 相生型 × MBTI良 × (日支和合 or 喜神一致)
 *      - 比和型 × MBTI良
 *   2. cyclic(循環型の縁)
 *      - 比和型 / 相生型(fast_bond 条件外)/ 喜神完全逆
 *   3. slow_burn(相剋型:ぶつかりから深まる縁)
 *   4. フォールバック: cyclic(中庸)
 *
 * @param {string} gogyoRel - 五行関係
 * @param {string} mbtiCompatLabel - MBTI 相性ラベル
 * @param {object} extraContext - { selfShi, partnerShi, kishinMatch }
 * @returns {string} 'fast_bond' | 'slow_burn' | 'cyclic'
 */
function _judgeConclusionType(gogyoRel, mbtiCompatLabel, extraContext) {
  const ctx = extraContext || {};
  const selfShi = ctx.selfShi;
  const partnerShi = ctx.partnerShi;
  const kishinMatch = ctx.kishinMatch;

  const mbtiGood = (mbtiCompatLabel === '鏡型' || mbtiCompatLabel === '共鳴型');
  const shiHarmony = _isShiHarmony(selfShi, partnerShi);
  const kishinGood = (kishinMatch === 'identical' || kishinMatch === 'partial');

  // === fast_bond(天地徳合・強い引き合い)===
  if (gogyoRel === '相生型' && mbtiGood && (shiHarmony || kishinGood)) return 'fast_bond';
  if (gogyoRel === '比和型' && mbtiGood) return 'fast_bond';

  // === cyclic(循環型の縁)===
  if (gogyoRel === '比和型') return 'cyclic';
  if (gogyoRel === '相生型') return 'cyclic';
  if (kishinMatch === 'opposite') return 'cyclic';

  // === slow_burn(ぶつかりから深まる縁)===
  if (gogyoRel === '相剋型') return 'slow_burn';

  // === フォールバック: 中庸 ===
  return 'cyclic';
}

// 五行バランス関係タイプ判定（gokyo オブジェクト：{木,火,土,金,水}）
function _judgeElementBalanceType(myGokyo, ptGokyo) {
  if (!myGokyo || !ptGokyo) return 'neutral';
  const elems = ['木', '火', '土', '金', '水'];
  let myWeak = 0, ptWeak = 0, opposite = 0, similar = 0;
  for (const e of elems) {
    const a = myGokyo[e] || 0, b = ptGokyo[e] || 0;
    if (a < 0.5) myWeak++;
    if (b < 0.5) ptWeak++;
    // 自分が弱く相手が強い（補完）
    if (a < 0.5 && b >= 1.0) opposite++;
    if (b < 0.5 && a >= 1.0) opposite++;
    // 似た値
    if (Math.abs(a - b) < 1.0) similar++;
  }
  if (opposite >= 3) return 'complementary';
  if (similar >= 4) return 'similar';
  if (opposite >= 1) return 'partial';
  return 'neutral';
}

// 特殊星ペアの最適選択（最優先：両者が持つ命名一致 > 強い星 > default）
function _pickSpecialStarPair(selfStars, partnerStars) {
  const D = SYNTHESIS_DICT_JA.specialStarPair || {};
  if (!Array.isArray(selfStars) || !Array.isArray(partnerStars)
      || selfStars.length === 0 || partnerStars.length === 0) {
    return { selfStar: null, partnerStar: null, data: D.default };
  }
  // 1. 辞書に明示的に定義されているペアを探す（双方向）
  for (const s of selfStars) {
    for (const p of partnerStars) {
      if (D[s + '_' + p]) return { selfStar: s, partnerStar: p, data: D[s + '_' + p] };
      if (D[p + '_' + s]) return { selfStar: s, partnerStar: p, data: D[p + '_' + s] };
    }
  }
  // 2. フォールバック：先頭ペア
  return { selfStar: selfStars[0], partnerStar: partnerStars[0], data: D.default };
}

// MBTIアラインメント (一致型/ギャップ型) を判定
function _judgeMbtiAlignment(gogyo, mbtiBase) {
  if (!gogyo || !mbtiBase) return null;
  const prof = GOGYO_MBTI_PROFILE[gogyo];
  if (!prof || !Array.isArray(prof.affinity_mbti)) return null;
  return prof.affinity_mbti.indexOf(mbtiBase) >= 0 ? 'match' : 'gap';
}

// 五行ペアタイプ判定（同一/相生/相剋）
//   same: 同じ五行
//   sheng: self → partner を生む（相生 順方向）
//   sheng_reverse: partner → self を生む（相生 逆方向）
//   ke: self → partner を剋す（相剋 順方向）
//   ke_reverse: partner → self を剋す（相剋 逆方向）
function _judgeFiveElementType(self, partner) {
  if (!self || !partner) return null;
  if (self === partner) return 'same';
  // _SEI: 木→火→土→金→水→木
  const SEI_REL = { 木:'火', 火:'土', 土:'金', 金:'水', 水:'木' };
  const KOKU_REL = { 木:'土', 火:'金', 土:'水', 金:'木', 水:'火' };
  if (SEI_REL[self] === partner) return 'sheng';
  if (SEI_REL[partner] === self) return 'sheng_reverse';
  if (KOKU_REL[self] === partner) return 'ke';
  if (KOKU_REL[partner] === self) return 'ke_reverse';
  return null;
}

// 年干支から年支のみ算出（year - 4 を 12 で割った剰余）
const _ANN_SHI_TBL = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const _ANN_SHI_GOGYO = { 子:'水', 丑:'土', 寅:'木', 卯:'木', 辰:'土', 巳:'火', 午:'火', 未:'土', 申:'金', 酉:'金', 戌:'土', 亥:'水' };
function _yearToShi(year) {
  return _ANN_SHI_TBL[((year - 4) % 12 + 12) % 12];
}
function _yearToShiGogyo(year) {
  return _ANN_SHI_GOGYO[_yearToShi(year)] || null;
}

/**
 * 流年（annualFortune）解析
 *   基準年-1〜+8 の10年分を解析。各年について年支の五行と
 *   両者の喜神/忌神との関係で type を決定し、テンプレで生成。
 *   さらに deepBondYears / tensionYears / voidPeriod を抽出。
 *
 * @remarks
 *   現状は **未使用** (Synthesis から切り離し済 / 2026-04)。
 *   将来「流年タイムライン」を Synthesis とは別の独立セクション/タブとして
 *   実装する際に呼び出す前提で保持している。**削除しないこと**。
 *   復活時は本関数 + synthesisDictionary.js に annualFortune キー再追加 +
 *   独立 UI 側で `_analyzeAnnualFortune(myCalc, ptCalc)` を呼出す。
 *
 * @param {Object} myCalc  本人の calcMeishiki 結果 (kishin/kijin/voidYearsUpcoming 必須)
 * @param {Object} ptCalc  相手の calcMeishiki 結果
 * @returns {{ yearNotes: Array, deepBondYears: number[], tensionYears: number[], voidPeriod: ?{startYear,endYear,target} }}
 */
// eslint-disable-next-line no-unused-vars
function _analyzeAnnualFortune(myCalc, ptCalc) {
  const D = SYNTHESIS_DICT_JA;
  const myKishin = (myCalc.kishin || []);
  const myKijin  = (myCalc.kijin  || []);
  const ptKishin = (ptCalc.kishin || []);
  const ptKijin  = (ptCalc.kijin  || []);
  const baseYear = new Date().getFullYear();
  const yearNotes = [];
  const deepBondYears = [];
  const tensionYears = [];

  for (let y = baseYear - 1; y <= baseYear + 8; y++) {
    const elem = _yearToShiGogyo(y);
    if (!elem) continue;
    const myIsKi = myKishin.indexOf(elem) >= 0;
    const myIsKj = myKijin.indexOf(elem)  >= 0;
    const ptIsKi = ptKishin.indexOf(elem) >= 0;
    const ptIsKj = ptKijin.indexOf(elem)  >= 0;

    let type = null, text = null;
    if (myIsKi && ptIsKi) {
      type = 'deep_bond';
      text = _synFill(D.annualFortune.deep_bond_year, { year: y, element: elem });
      deepBondYears.push(y);
    } else if (myIsKj && ptIsKj) {
      type = 'tension';
      text = _synFill(D.annualFortune.tension_year, { year: y, element: elem });
      tensionYears.push(y);
    } else if (myIsKi && !ptIsKj) {
      type = 'asymmetric_self';
      text = _synFill(D.annualFortune.kishin_year, { year: y, element: elem, target: 'あなた' });
    } else if (ptIsKi && !myIsKj) {
      type = 'asymmetric_partner';
      text = _synFill(D.annualFortune.kishin_year, { year: y, element: elem, target: '相手' });
    } else if (myIsKj && !ptIsKi) {
      type = 'imushin_self';
      text = _synFill(D.annualFortune.imushin_year, { year: y, element: elem, target: 'あなた' });
    } else if (ptIsKj && !myIsKi) {
      type = 'imushin_partner';
      text = _synFill(D.annualFortune.imushin_year, { year: y, element: elem, target: '相手' });
    }
    if (type) yearNotes.push({ year: y, type, text });
  }

  // 空亡期: self.voidYearsUpcoming から該当範囲（baseYear-1〜+8）を抽出し、
  //         連続する範囲が見つかれば期間として表示（self 側のみ。互いの空亡は重なりが稀のため）
  let voidPeriod = null;
  const myVoid = Array.isArray(myCalc.voidYearsUpcoming) ? myCalc.voidYearsUpcoming.slice().sort((a,b)=>a-b) : [];
  const inRange = myVoid.filter(y => y >= baseYear - 1 && y <= baseYear + 8);
  if (inRange.length > 0) {
    voidPeriod = { startYear: inRange[0], endYear: inRange[inRange.length - 1], target: 'あなた' };
    const txt = _synFill(D.annualFortune.void_period, {
      startYear: voidPeriod.startYear, endYear: voidPeriod.endYear, target: voidPeriod.target,
    });
    yearNotes.push({ year: voidPeriod.startYear, type: 'void_period_self', text: txt });
  }

  // partner side void period も対称に
  const ptVoid = Array.isArray(ptCalc.voidYearsUpcoming) ? ptCalc.voidYearsUpcoming.slice().sort((a,b)=>a-b) : [];
  const ptInRange = ptVoid.filter(y => y >= baseYear - 1 && y <= baseYear + 8);
  if (ptInRange.length > 0) {
    const ptVoidPeriod = { startYear: ptInRange[0], endYear: ptInRange[ptInRange.length - 1], target: '相手' };
    const txt = _synFill(D.annualFortune.void_period, ptVoidPeriod);
    yearNotes.push({ year: ptVoidPeriod.startYear, type: 'void_period_partner', text: txt });
  }

  // 年順にソート
  yearNotes.sort((a, b) => a.year - b.year);
  return { yearNotes, deepBondYears, tensionYears, voidPeriod };
}

// 通変星名の正規化:
//   engine は '正印' を返す (五行学派の表記) が、synthesisDictionary は伝統名 '印綬' をキーにしている。
//   両者を辞書ヒットさせるため、辞書アクセス前に '正印' → '印綬' に正規化する。
function _normalizeTsuhenForDict(name) {
  if (name === '正印') return '印綬';
  return name;
}

// 8セクションを構築（Object 形式）
function _buildSynthesisSections(args) {
  const D = SYNTHESIS_DICT_JA;
  const {
    myCalc, ptCalc,
    myBase, ptBase,
    myMbtiFull, ptMbtiFull, // 'INFP-T' のフル形式
    myGogyo, ptGogyo,
    gogyoRel, mbtiCompatLabel,
  } = args;

  const sections = {};

  // ── 共通算出: 元命(getGenmei) ──────────────────────
  // ⚠ self / partner / topGodPair の 3 セクションで同一の元命値を参照させ、
  //    ユーザーから見て「軸となる通変星」が表示箇所によってブレない構造にする。
  //    正統派四柱推命で「軸となる先天的気質」とされる月支元命を統一採用。
  //    算出失敗時は null を返し、各セクション側でフォールバック処理。
  const selfGenmei = (() => {
    try {
      return _synGetGenmei(
        myCalc?.pillars?.day?.kan,
        myCalc?.pillars?.month?.shi,
        myCalc?.pillars?.month?.daysFromSetsu
      );
    } catch (e) {
      console.warn('[synthesis] selfGenmei calc error:', e);
      return null;
    }
  })();
  const partnerGenmei = (() => {
    try {
      return _synGetGenmei(
        ptCalc?.pillars?.day?.kan,
        ptCalc?.pillars?.month?.shi,
        ptCalc?.pillars?.month?.daysFromSetsu
      );
    } catch (e) {
      console.warn('[synthesis] partnerGenmei calc error:', e);
      return null;
    }
  })();

  // ── 1. self ─────────────────────────────────────────
  try {
    const dayKan = myCalc.pillars.day.kan;
    const topGod = myCalc.topGod;            // 全柱集計の最頻通変星 (debug用に保持)
    // 元命 = 月支元命: 月柱蔵干 (節入り日数で 余気/中気/本気 から1つ選定) × 日干 → 通変星
    //   四柱推命の正統な格局判定は月支元命が主 (複数流派一致)。
    //   genmei は '比肩'〜'印綬' を返す (genmeiText._tsuhenStar は '印綬' を返すので正規化不要)
    const genmei = selfGenmei;  // 関数冒頭で共通算出済を再利用
    const identity = (myMbtiFull && myMbtiFull.indexOf('-') >= 0)
      ? myMbtiFull.split('-')[1].charAt(0) : null;
    const alignment = _judgeMbtiAlignment(myGogyo, myBase);

    // 格局: 3段階 fallback で辞書を引く（基準を topGod → genmei に変更）
    //   ① genmei + '格' (例: '印綬' → '印綬格')   — 元命ベース個別化 10種
    //   ② engine.kakukyoku.name (例: '普通格局' / '従旺格(◯旺)' → '従旺格')
    //   ③ default (安全網)
    const genmeiKey = genmei ? (genmei + '格') : null;
    let engineKakuName = (myCalc.kakukyoku && myCalc.kakukyoku.name) || null;
    let engineKakuKey  = engineKakuName;
    if (engineKakuKey && engineKakuKey.indexOf('従旺') >= 0) engineKakuKey = '従旺格';
    const kkEntry =
      (genmeiKey && D.kakukyoku[genmeiKey])
      || (engineKakuKey && D.kakukyoku[engineKakuKey])
      || D.kakukyoku.default;
    const kkLabel = (genmeiKey && D.kakukyoku[genmeiKey]) ? genmeiKey
                  : (engineKakuKey && D.kakukyoku[engineKakuKey]) ? engineKakuKey
                  : (engineKakuName || '普通格局');
    const kkBasis = (genmeiKey && D.kakukyoku[genmeiKey]) ? 'genmei'
                  : (engineKakuKey && D.kakukyoku[engineKakuKey]) ? 'engineKakukyoku'
                  : 'default';

    const dmEntry = D.dayMaster[dayKan];
    // [動機] も元命ベースに変更（他セクションと一貫性確保）
    const tgEntry = genmei ? (D.topGod[genmei] || D.topGod.default) : null;
    const mbtiEntry = (myBase && alignment) ? D.mbtiAlignment[myBase + '_' + alignment] : null;
    const idEntry = (identity && alignment) ? D.identityModifier[identity + '_' + alignment] : null;

    const parts = [];
    // [0] 日主
    if (dmEntry) parts.push(dmEntry.nature + ' ' + dmEntry.trait);
    // [1] 格局 (元命ベース 3段 fallback)
    if (kkEntry) {
      const suffix = (engineKakuName && engineKakuName !== kkLabel) ? ('(' + engineKakuName + ')') : '';
      parts.push('あなたの格局は「' + kkLabel + '」' + suffix + '──' + kkEntry.essence + ' ' + kkEntry.scene);
    }
    // [2] 動機 (元命ベース。「最強通変星」表記は維持しつつ元命を採用)
    if (tgEntry && genmei) {
      parts.push('最強通変星は「' + genmei + '」ンダ。' + tgEntry.motivation + ' ' + tgEntry.behavior);
    }
    // [3] MBTI × 命式
    if (mbtiEntry) {
      let mbtiPart = 'MBTIは「' + (myMbtiFull || myBase) + '」── ' + mbtiEntry.summary;
      if (mbtiEntry.strength) mbtiPart += ' ' + mbtiEntry.strength;
      if (mbtiEntry.detail) mbtiPart += ' ' + mbtiEntry.detail;
      if (idEntry) mbtiPart += ' ' + idEntry;
      parts.push(mbtiPart);
    }

    sections.self = {
      title: 'あなたの命式 × MBTI',
      body: parts.join('\n'),
      meta: {
        dayMaster: dayKan,
        genmei,                         // 元命 (月支元命) — 格局/動機の判定基準
        topGod,                         // 全柱集計最頻通変星 (debug 用に保持)
        kakukyoku: kkLabel,             // 採用された格局ラベル
        engineKakukyoku: engineKakuName, // engine 出力 (普通格局/従旺格)
        kakukyokuBasis: kkBasis,        // どの fallback 段で決まったか ('genmei' | 'engineKakukyoku' | 'default')
        mbti: myBase,
        identity,
        alignment,
      },
    };
  } catch (e) { console.warn('[synthesis] self section error:', e); }

  // ── 2. partner ──────────────────────────────────────
  try {
    const dayKan = ptCalc.pillars.day.kan;
    const topGod = ptCalc.topGod;
    const genmei = partnerGenmei;  // 関数冒頭で共通算出済を再利用
    const identity = (ptMbtiFull && ptMbtiFull.indexOf('-') >= 0)
      ? ptMbtiFull.split('-')[1].charAt(0) : null;
    const alignment = _judgeMbtiAlignment(ptGogyo, ptBase);

    // 格局: 3段階 fallback (self と同じ仕様、元命ベース)
    const genmeiKey = genmei ? (genmei + '格') : null;
    let engineKakuName = (ptCalc.kakukyoku && ptCalc.kakukyoku.name) || null;
    let engineKakuKey  = engineKakuName;
    if (engineKakuKey && engineKakuKey.indexOf('従旺') >= 0) engineKakuKey = '従旺格';
    const kkEntry =
      (genmeiKey && D.kakukyoku[genmeiKey])
      || (engineKakuKey && D.kakukyoku[engineKakuKey])
      || D.kakukyoku.default;
    const kkLabel = (genmeiKey && D.kakukyoku[genmeiKey]) ? genmeiKey
                  : (engineKakuKey && D.kakukyoku[engineKakuKey]) ? engineKakuKey
                  : (engineKakuName || '普通格局');
    const kkBasis = (genmeiKey && D.kakukyoku[genmeiKey]) ? 'genmei'
                  : (engineKakuKey && D.kakukyoku[engineKakuKey]) ? 'engineKakukyoku'
                  : 'default';

    const dmEntry = D.dayMaster[dayKan];
    const tgEntry = genmei ? (D.topGod[genmei] || D.topGod.default) : null;
    const mbtiEntry = (ptBase && alignment) ? D.mbtiAlignment[ptBase + '_' + alignment] : null;
    const idEntry = (identity && alignment) ? D.identityModifier[identity + '_' + alignment] : null;

    const parts = [];
    if (dmEntry) parts.push(dmEntry.nature + ' ' + dmEntry.trait);
    if (kkEntry) {
      const suffix = (engineKakuName && engineKakuName !== kkLabel) ? ('(' + engineKakuName + ')') : '';
      parts.push('相手の格局は「' + kkLabel + '」' + suffix + '──' + kkEntry.essence + ' ' + kkEntry.scene);
    }
    if (tgEntry && genmei) {
      parts.push('相手の最強通変星は「' + genmei + '」ンダ。' + tgEntry.motivation + ' ' + tgEntry.behavior);
    }
    if (mbtiEntry) {
      let mbtiPart = '相手のMBTIは「' + (ptMbtiFull || ptBase) + '」── ' + mbtiEntry.summary;
      if (mbtiEntry.strength) mbtiPart += ' ' + mbtiEntry.strength;
      if (mbtiEntry.detail) mbtiPart += ' ' + mbtiEntry.detail;
      if (idEntry) mbtiPart += ' ' + idEntry;
      parts.push(mbtiPart);
    }

    sections.partner = {
      title: '相手の命式 × MBTI',
      body: parts.join('\n'),
      meta: {
        dayMaster: dayKan,
        genmei,
        topGod,
        kakukyoku: kkLabel,
        engineKakukyoku: engineKakuName,
        kakukyokuBasis: kkBasis,
        mbti: ptBase,
        identity,
        alignment,
      },
    };
  } catch (e) { console.warn('[synthesis] partner section error:', e); }

  // ── 3. fiveElement ──────────────────────────────────
  try {
    const pairKey = (myGogyo && ptGogyo) ? (myGogyo + '_' + ptGogyo) : null;
    const pair = pairKey ? D.fiveElementPair[pairKey] : null;
    const balanceType = _judgeElementBalanceType(myCalc.gokyo, ptCalc.gokyo);
    const balanceData = D.elementBalance[balanceType];
    // Phase 3b: elementBalance は { core, nature, depth, caution, practice } の 5 フィールド
    // object 構造に拡充された。\n\n で連結して 5 段落の balanceText を作る。
    // 旧 string 構造にも後方互換フォールバックあり。
    const balanceText = (balanceData && typeof balanceData === 'object')
      ? [balanceData.core, balanceData.nature, balanceData.depth, balanceData.caution, balanceData.practice]
          .filter(Boolean)
          .join('\n')
      : String(balanceData || '');
    const fiveType = _judgeFiveElementType(myGogyo, ptGogyo);

    // Phase 3b: fiveElementPair も { core, nature, depth, caution, practice } の
    // 5 フィールド object 構造に拡充。core の有無で新旧を判別して連結する。
    // 旧 { intro, detail } 2 フィールド構造にも後方互換フォールバックあり。
    let pairText = '';
    if (pair && typeof pair === 'object') {
      if (pair.core) {
        pairText = [pair.core, pair.nature, pair.depth, pair.caution, pair.practice]
          .filter(Boolean)
          .join('\n');
      } else {
        pairText = [pair.intro, pair.detail].filter(Boolean).join('\n');
      }
    }

    const parts = [];
    if (pairText) parts.push(pairText);
    if (balanceText) parts.push(balanceText);

    sections.fiveElement = {
      title: '五行ペア',
      body: parts.join('\n'),
      meta: { selfElement: myGogyo, partnerElement: ptGogyo, pairKey, balanceType, balanceData, fiveType, fePairData: pair },
    };
  } catch (e) { console.warn('[synthesis] fiveElement section error:', e); }

  // ── 4. twelveStage ──────────────────────────────────
  // Phase 3b: twelveStagePair 辞書が { core, nature, depth, caution, practice } の
  // 5 フィールド object 構造に拡充された。\n\n で連結して 5 段落の body を作る。
  // 旧 string 構造にも後方互換フォールバックあり。
  try {
    const selfStage = myCalc.pillars.day.juniunsei;
    const partnerStage = ptCalc.pillars.day.juniunsei;
    const stageType = _judgeTwelveStagePairType(selfStage, partnerStage);
    const stageData = D.twelveStagePair[stageType];
    const stageBody = (stageData && typeof stageData === 'object')
      ? [stageData.core, stageData.nature, stageData.depth, stageData.caution, stageData.practice]
          .filter(Boolean)
          .join('\n')
      : String(stageData || '');
    sections.twelveStage = {
      title: '十二運星ペア',
      body: stageBody,
      meta: { selfStage, partnerStage, type: stageType,
              selfEnergy: _JUNIU_ENERGY[selfStage], partnerEnergy: _JUNIU_ENERGY[partnerStage],
              data: stageData },
    };
  } catch (e) { console.warn('[synthesis] twelveStage section error:', e); }

  // ── 5. topGodPair ──────────────────────────────────
  // ⚠ self/partner 双方の【月支元命】(selfGenmei/partnerGenmei)で統一。
  //    sections.self/partner と同じ概念で揃え、表示上の矛盾を排除。
  //    元命取得失敗時のみ jisshinCount top をフォールバック。
  try {
    const selfTg = selfGenmei || _normalizeTsuhenForDict(myCalc.topGod);
    const partnerTg = partnerGenmei || _normalizeTsuhenForDict(ptCalc.topGod);
    const data = (selfTg && partnerTg)
      ? _synGetTopGodPair(selfTg, partnerTg)
      : (D.topGodPair && D.topGodPair.default);
    // Phase 3b: topGodPair 辞書が { core, nature, depth, caution, practice } の
    // 5 フィールド object 構造に拡充された。旧 { core, detail, warning } にも
    // 後方互換でフォールバック(nature/caution 不在時に detail/warning を使用)。
    const parts = [];
    if (data) {
      if (data.core) parts.push(data.core);
      if (data.nature) parts.push(data.nature);
      else if (data.detail) parts.push(data.detail);  // 旧構造フォールバック
      if (data.depth) parts.push(data.depth);
      if (data.caution) parts.push(data.caution);
      else if (data.warning) parts.push(data.warning); // 旧構造フォールバック
      if (data.practice) parts.push(data.practice);
    }
    sections.topGodPair = {
      title: '通変星ペア',
      body: parts.join('\n'),
      meta: {
        selfTopGod: selfTg,              // 採用された通変星(元命優先、失敗時のみ jisshinCount top)
        partnerTopGod: partnerTg,
        selfGenmei,                      // 元命算出結果(null の場合あり)
        partnerGenmei,
        selfJisshinTop: _normalizeTsuhenForDict(myCalc.topGod),    // jisshinCount top(参考情報)
        partnerJisshinTop: _normalizeTsuhenForDict(ptCalc.topGod),
        basis: (selfGenmei && partnerGenmei) ? 'genmei' : 'jisshinTop_fallback',
        data,
      },
    };
  } catch (e) { console.warn('[synthesis] topGodPair section error:', e); }

  // ── 6. kishin ───────────────────────────────────────
  // Phase 3b: kishinPair 辞書が { core, nature, depth, caution, practice } の
  // 5 フィールド object 構造に拡充された。\n\n で連結して 5 段落の body を作る。
  // 旧 string 構造にも後方互換フォールバックあり。
  try {
    const selfKishin = (myCalc.kishin || []);
    const partnerKishin = (ptCalc.kishin || []);
    const kishinType = _judgeKishinPairType(selfKishin, partnerKishin);
    const kishinData = D.kishinPair[kishinType];
    const kishinBody = (kishinData && typeof kishinData === 'object')
      ? [kishinData.core, kishinData.nature, kishinData.depth, kishinData.caution, kishinData.practice]
          .filter(Boolean)
          .join('\n')
      : String(kishinData || '');
    sections.kishin = {
      title: '喜神ペア',
      body: kishinBody,
      meta: { selfKishin, partnerKishin, type: kishinType, data: kishinData },
    };
  } catch (e) { console.warn('[synthesis] kishin section error:', e); }

  // ── 7. specialStar ─────────────────────────────────
  // Phase 3b: specialStarPair 辞書が { core, nature, depth, caution, practice } の
  // 5 フィールド object 構造に拡充された。\n\n で連結して 5 段落の body を作る。
  // 旧 { intro, synergy } 2 フィールド構造にも後方互換フォールバックあり
  // (core が無ければ intro/synergy を使用)。
  try {
    const selfStars = myCalc.tokuseiboshi || [];
    const partnerStars = ptCalc.tokuseiboshi || [];
    const picked = _pickSpecialStarPair(selfStars, partnerStars);
    const data = picked.data || (D.specialStarPair && D.specialStarPair.default);
    const parts = [];
    if (data) {
      if (data.core) {
        // 新構造(5 フィールド)
        if (data.core) parts.push(data.core);
        if (data.nature) parts.push(data.nature);
        if (data.depth) parts.push(data.depth);
        if (data.caution) parts.push(data.caution);
        if (data.practice) parts.push(data.practice);
      } else {
        // 旧構造フォールバック(2 フィールド)
        if (data.intro) parts.push(data.intro);
        if (data.synergy) parts.push(data.synergy);
      }
    }
    sections.specialStar = {
      title: '特殊星ペア',
      body: parts.join('\n'),
      meta: { selfStars, partnerStars,
              pickedSelf: picked.selfStar, pickedPartner: picked.partnerStar, data },
    };
  } catch (e) { console.warn('[synthesis] specialStar section error:', e); }

  // ── 8. annualFortune ───────────────────────────────
  // ⚠ Synthesis から切り離し済 (2026-04)。流年タイムラインは将来「独立セクション/タブ」として
  //    実装する方針。データ生成ロジック (_analyzeAnnualFortune) と辞書テンプレを使う未来の
  //    実装で本ブロックを復活させる予定なので、削除ではなくコメントアウトで保持。
  /*
  try {
    const af = _analyzeAnnualFortune(myCalc, ptCalc);
    const body = af.yearNotes.map(n => n.text).filter(Boolean).join('\n');
    sections.annualFortune = {
      title: 'これから巡る運勢期',
      body,
      meta: {
        yearNotes: af.yearNotes,
        deepBondYears: af.deepBondYears,
        tensionYears: af.tensionYears,
        voidPeriod: af.voidPeriod,
      },
      // 利便のためトップにも公開（仕様書 3節）
      deepBondYears: af.deepBondYears,
      tensionYears: af.tensionYears,
      voidPeriod: af.voidPeriod,
    };
  } catch (e) { console.warn('[synthesis] annualFortune section error:', e); }
  */

  // ── 9. conclusion ──────────────────────────────────
  // Phase 3b + 正統派判定ロジック:
  //   辞書は { core, nature, depth, caution, practice } の 5 フィールド構造。
  //   判定は日支六合/三合 + 喜神一致度を加味して fast_bond/cyclic/slow_burn を
  //   バランス良く分布させる。
  try {
    // 拡張判定要素: 日支・喜神一致度(kishin セクションは別 try scope なので再計算)
    const selfShi = (myCalc.pillars && myCalc.pillars.day) ? myCalc.pillars.day.shi : null;
    const partnerShi = (ptCalc.pillars && ptCalc.pillars.day) ? ptCalc.pillars.day.shi : null;
    const kishinMatch = _judgeKishinPairType(myCalc.kishin || [], ptCalc.kishin || []);

    const concType = _judgeConclusionType(gogyoRel, mbtiCompatLabel, {
      selfShi,
      partnerShi,
      kishinMatch,
    });
    const concData = D.conclusion[concType] || D.conclusion.slow_burn;
    const concBody = (concData && typeof concData === 'object')
      ? [concData.core, concData.nature, concData.depth, concData.caution, concData.practice]
          .filter(Boolean)
          .join('\n')
      : String(concData || '');
    sections.conclusion = {
      title: '結論',
      body: concBody,
      meta: {
        type: concType,
        gogyoRel,
        mbtiCompatLabel,
        selfShi,
        partnerShi,
        shiHarmony: _isShiHarmony(selfShi, partnerShi),
        kishinMatch,
        data: concData,
      },
    };
  } catch (e) { console.warn('[synthesis] conclusion section error:', e); }

  return sections;
}

// トップレベル meta（判定サマリ） — Phase 3 UI バッジ表示用ショートカット
function _buildSynthesisMeta(sections) {
  const m = {
    selfAlignment:    sections.self        && sections.self.meta        ? sections.self.meta.alignment        : null,
    partnerAlignment: sections.partner     && sections.partner.meta     ? sections.partner.meta.alignment     : null,
    fiveElementType:  sections.fiveElement && sections.fiveElement.meta ? sections.fiveElement.meta.fiveType  : null,
    stagePairType:    sections.twelveStage && sections.twelveStage.meta ? sections.twelveStage.meta.type      : null,
    kishinRelation:   sections.kishin      && sections.kishin.meta      ? sections.kishin.meta.type           : null,
    conclusionType:   sections.conclusion  && sections.conclusion.meta  ? sections.conclusion.meta.type       : null,
  };
  return m;
}

// ══════════════════════════════════════════════════════════════
//  Main export function
// ══════════════════════════════════════════════════════════════
export function calcCompatDetail(myCalc, ptCalc, partner, myInput, opts) {
  // ── Input validation ──
  if (!myCalc || !ptCalc || !partner) {
    console.error('[compatCalcFull] Missing required args: myCalc, ptCalc, or partner');
    return null;
  }

  var result = {};

  // ══════════════════════════════════════════════════════════════
  //  Section 1: 五行ベーススコア・相性タイプ
  // ══════════════════════════════════════════════════════════════
  try {
    var myKanIdx = JIKKAN.indexOf(myCalc.pillars.day.kan);
    var ptKanIdx = JIKKAN.indexOf(ptCalc.pillars.day.kan);
    var myGogyo = GOGYO[myKanIdx];
    var ptGogyo = GOGYO[ptKanIdx];

    var baseScore = 68;
    var compat_type = '中和型';
    if (SEI[myGogyo] === ptGogyo || SEI[ptGogyo] === myGogyo) { baseScore = 82; compat_type = '相生型'; }
    else if (myGogyo === ptGogyo) { baseScore = 75; compat_type = '比和型'; }
    else if (KOKU[myGogyo] === ptGogyo || KOKU[ptGogyo] === myGogyo) { baseScore = 55; compat_type = '相剋型'; }

    var loveScore = Math.min(100, baseScore + 3);
    var trustScore = Math.min(100, baseScore - 2);
    var growthScore = Math.min(100, baseScore + (compat_type === '相剋型' ? 12 : -2));

    var scoreLabel = baseScore >= 80 ? 'とても強い相性ンダ ✨' : baseScore >= 70 ? 'よい相性ンダ🐼' : baseScore >= 60 ? 'お互いを高め合える関係ンダ' : '刺激し合える関係ンダ';
    var vsLabel = compat_type === '相生型' ? '引き合うタイプ' : compat_type === '比和型' ? '似た者同士タイプ' : compat_type === '相剋型' ? '刺激し合うタイプ' : 'バランスタイプ';

    result.baseScore = baseScore;
    result.compat_type = compat_type;
    result.loveScore = loveScore;
    result.trustScore = trustScore;
    result.growthScore = growthScore;
    result.scoreLabel = scoreLabel;
    result.vsLabel = vsLabel;
    result.myGogyo = myGogyo;
    result.ptGogyo = ptGogyo;
    result.myKanIdx = myKanIdx;
    result.ptKanIdx = ptKanIdx;
  } catch (e) {
    console.error('[compatCalcFull] Section 1 error:', e);
  }

  // ══════════════════════════════════════════════════════════════
  //  Section 2: 本人/相手MBTI・名前・生年月日
  // ══════════════════════════════════════════════════════════════
  try {
    // P1-A: 本人MBTIを32通り対応 — myCalc.input.mbti を優先
    var _rawMyMbti = (myCalc && myCalc.input && myCalc.input.mbti)
      ? myCalc.input.mbti
      : (myInput.mbti || '');
    var myMbti = (_rawMyMbti && _rawMyMbti !== 'わからない') ? _rawMyMbti : '';
    // A/T なしの場合は -A を付与してマトリクスにヒットさせる
    if (myMbti && !myMbti.match(/-(A|T)$/) && !myMbti.endsWith('A') && !myMbti.endsWith('T')) {
      myMbti = myMbti + '-A';
    }
    var ptMbti = partner.mbti && partner.mbti !== 'わからない' ? partner.mbti : '';
    var _rawName = (partner.name || 'お相手').trim();
    var ptName = _rawName.endsWith('さん') ? _rawName : _rawName + 'さん';
    var myBirth = myInput.year + '.' + myInput.month + '.' + myInput.day;
    var ptBirth = partner.year + '.' + partner.month + '.' + partner.day;
    var ptGender = partner.gender || '';

    result.myMbti = myMbti;
    result.ptMbti = ptMbti;
    result.ptName = ptName;
    result.myBirth = myBirth;
    result.ptBirth = ptBirth;
    result.ptGender = ptGender;
    result.myGender = (myInput && myInput.gender) || '';
    result.genderTone = getGenderTone(result.myGender, ptGender);
    // Section 1 の scoreLabel を性別トーンで上書き
    result.scoreLabel = getTonedLabel(result.baseScore, result.genderTone, ptName);
  } catch (e) {
    console.error('[compatCalcFull] Section 2 error:', e);
  }

  // ══════════════════════════════════════════════════════════════
  //  Section 3: 引き合う力（支合・六冲・干合）＋MBTIスコア
  // ══════════════════════════════════════════════════════════════
  try {
    var myDayShi = myCalc.pillars.day.shi;
    var ptDayShi = ptCalc.pillars.day.shi;
    var hikiai = result.baseScore;
    if (SHIGOU[myDayShi] === ptDayShi) hikiai = Math.min(100, hikiai + 10);
    if (ROKUCHUU[myDayShi] === ptDayShi) hikiai = Math.max(20, hikiai - 12);
    // 干合＋大吉縁判定（陽干男性 × 陰干女性）
    if (KANGO[myCalc.pillars.day.kan] === ptCalc.pillars.day.kan) {
      var YOGAN3 = ['甲','丙','戊','庚','壬'];
      var INGAN3 = ['乙','丁','己','辛','癸'];
      var myGender3 = (myCalc.input && myCalc.input.gender) || '';
      var ptGender3 = (ptCalc.input && ptCalc.input.gender) || '';
      var _isDK3 = (myGender3 === 'm' && ptGender3 === 'f' &&
                    YOGAN3.indexOf(myCalc.pillars.day.kan) >= 0 &&
                    INGAN3.indexOf(ptCalc.pillars.day.kan) >= 0);
      hikiai = Math.min(100, hikiai + (_isDK3 ? 15 : 8));
    }

    // MBTI スコア（16×16ベース + A/Tサブタイプ補正）
    var mbtiScore = 70; // MBTI未設定時のデフォルト
    if (opts.mbtiEngineReady && result.myMbti && result.ptMbti && result.myMbti !== 'わからない' && result.ptMbti !== 'わからない') {
      mbtiScore = opts.calcMbtiScore(result.myMbti, result.ptMbti);
      // A/Tサブタイプ補正（実質32×32対応）
      var mySub = result.myMbti.match(/-(A|T)$/);
      var ptSub = result.ptMbti.match(/-(A|T)$/);
      var myAT = mySub ? mySub[1] : 'A';
      var ptAT = ptSub ? ptSub[1] : 'A';
      if (myAT === 'A' && ptAT === 'A') mbtiScore = Math.min(100, mbtiScore + 3);       // 安定×安定
      else if (myAT === 'T' && ptAT === 'T') mbtiScore = Math.max(20, mbtiScore - 3);  // 感情的×感情的
      // A×T / T×A は±0（バランス型）
    }

    result.hikiai = hikiai;
    result.mbtiScore = mbtiScore;
  } catch (e) {
    console.error('[compatCalcFull] Section 3 error:', e);
  }

  // ══════════════════════════════════════════════════════════════
  //  Section 4: 生年月日相性スコア = 5要素加重平均
  // ══════════════════════════════════════════════════════════════
  try {
    // 要素1: 五行相性（日主）
    var score_gogyo = result.baseScore;

    // 要素2: 日柱の干支相性（支合+干合+大吉縁判定）
    var score_day = result.baseScore;
    // 大吉縁・干合タイプの結果を保持する変数（後でresultに格納）
    var _kangoType = null;
    var _isDaikichien = false;
    if (myCalc && ptCalc) {
      if (SHIGOU[myCalc.pillars.day.shi] === ptCalc.pillars.day.shi) score_day = Math.min(100, score_day + 10);
      else if (ROKUCHUU[myCalc.pillars.day.shi] === ptCalc.pillars.day.shi) score_day = Math.max(20, score_day - 12);

      var _mDK = myCalc.pillars.day.kan;
      var _pDK = ptCalc.pillars.day.kan;
      if (KANGO[_mDK] === _pDK) {
        // 大吉縁判定: 男性が陽干・女性が陰干
        var YOGAN = ['甲','丙','戊','庚','壬']; // 陽干
        var INGAN = ['乙','丁','己','辛','癸']; // 陰干
        var myGender4 = (myCalc.input && myCalc.input.gender) || '';
        var ptGender4 = (ptCalc.input && ptCalc.input.gender) || '';
        // gender は 'm'(男性)/'f'(女性)/'x'(その他) の形式
        _isDaikichien = (myGender4 === 'm' && ptGender4 === 'f' &&
                          YOGAN.indexOf(_mDK) >= 0 && INGAN.indexOf(_pDK) >= 0);
        if (_isDaikichien) {
          score_day = Math.min(100, score_day + 15); // 大吉縁ボーナス
        } else {
          score_day = Math.min(100, score_day + 8);  // 通常の干合
        }
        // 干合タイプ名の判定
        var KANGO_NAMES = {
          '甲己':'中正の合','己甲':'中正の合',
          '乙庚':'仁義の合','庚乙':'仁義の合',
          '丙辛':'威制の合','辛丙':'威制の合',
          '丁壬':'淫匿の合','壬丁':'淫匿の合',
          '戊癸':'無情の合','癸戊':'無情の合',
        };
        _kangoType = KANGO_NAMES[_mDK + _pDK] || null;
      }
    }

    // ── 七冲の拡張（日支以外） ──
    var _chuuTypes = [];
    if (myCalc && ptCalc) {
      // 月支同士の冲
      if (ROKUCHUU[myCalc.pillars.month.shi] === ptCalc.pillars.month.shi) {
        score_day = Math.max(20, score_day - 8);
        _chuuTypes.push('月支冲');
      }
      // 年支同士の冲
      if (ROKUCHUU[myCalc.pillars.year.shi] === ptCalc.pillars.year.shi) {
        score_day = Math.max(20, score_day - 5);
        _chuuTypes.push('年支冲');
      }
      // 日支と月支の冲（クロス）
      if (ROKUCHUU[myCalc.pillars.day.shi] === ptCalc.pillars.month.shi ||
          ROKUCHUU[myCalc.pillars.month.shi] === ptCalc.pillars.day.shi) {
        score_day = Math.max(20, score_day - 5);
        _chuuTypes.push('日月クロス冲');
      }
    }

    // ── 三刑の判定 ──
    // 優先順位: 支合成立または七冲成立の場合は三刑をスキップ
    var _sankeiType = null;
    if (myCalc && ptCalc) {
      var _myDS4 = myCalc.pillars.day.shi;
      var _ptDS4 = ptCalc.pillars.day.shi;
      var _hasShigouDay = (SHIGOU[_myDS4] === _ptDS4);
      var _hasChuurDay = (ROKUCHUU[_myDS4] === _ptDS4);
      if (!_hasShigouDay && !_hasChuurDay) {
        _sankeiType = SANKEI_TYPE[_myDS4 + _ptDS4] || null;
        if (_sankeiType === '礼なき刑') {
          score_day = Math.max(20, score_day - 8);
        } else if (_sankeiType) {
          // 恃勢の刑・恩なき刑
          score_day = Math.max(20, score_day - 6);
        }
      }
    }

    // ── 天地徳合の判定（干合+支合で、六十干支内の正規ペア）──
    var _isTenchitokugo = false;
    if (myCalc && ptCalc) {
      var _mDK2 = myCalc.pillars.day.kan;
      var _pDK2 = ptCalc.pillars.day.kan;
      var _mDS2 = myCalc.pillars.day.shi;
      var _pDS2 = ptCalc.pillars.day.shi;
      var _hasKangoD = (KANGO[_mDK2] === _pDK2);
      var _hasShigouD = (SHIGOU[_mDS2] === _pDS2);
      var _myKanshi = _mDK2 + _mDS2;
      var _ptKanshi = _pDK2 + _pDS2;
      _isTenchitokugo = _hasKangoD && _hasShigouD
        && ROKUJUKANSHI.indexOf(_myKanshi) >= 0
        && ROKUJUKANSHI.indexOf(_ptKanshi) >= 0;
      if (_isTenchitokugo) {
        score_day = Math.min(100, score_day + 20);
      }
    }

    // 最終clamp
    score_day = Math.max(20, Math.min(100, score_day));

    result.kangoType = _kangoType;
    result.isDaikichien = _isDaikichien;
    result.chuuTypes = _chuuTypes;
    result.sankeiType = _sankeiType;
    result.isTenchitokugo = _isTenchitokugo;

    // 要素3: 月柱相性（感情リズム）
    var score_month = result.baseScore;
    if (myCalc && ptCalc) {
      if (SHIGOU[myCalc.pillars.month.shi] === ptCalc.pillars.month.shi) score_month = Math.min(100, score_month + 10);
      else if (ROKUCHUU[myCalc.pillars.month.shi] === ptCalc.pillars.month.shi) score_month = Math.max(20, score_month - 10);
      if (KANGO[myCalc.pillars.month.kan] === ptCalc.pillars.month.kan) score_month = Math.min(100, score_month + 6);
      var myMG2 = result.myGogyo, ptMG2 = result.ptGogyo;
      if (SEI[myMG2] === ptMG2 || SEI[ptMG2] === myMG2) score_month = Math.min(100, score_month + 5);
    }

    // 要素4: 年柱相性（根本の気質）
    var score_year = result.baseScore;
    if (myCalc && ptCalc) {
      var myYearGogyo = GOGYO[JIKKAN.indexOf(myCalc.pillars.year.kan)];
      var ptYearGogyo = GOGYO[JIKKAN.indexOf(ptCalc.pillars.year.kan)];
      if (myYearGogyo && ptYearGogyo) {
        if (SEI[myYearGogyo] === ptYearGogyo || SEI[ptYearGogyo] === myYearGogyo) score_year = Math.min(100, score_year + 8);
        else if (myYearGogyo === ptYearGogyo) score_year = Math.min(100, score_year + 3);
      }
      if (SHIGOU[myCalc.pillars.year.shi] === ptCalc.pillars.year.shi) score_year = Math.min(100, score_year + 5);
    }

    // 要素5: 時柱相性（行動リズム）— 不明時はbaseScoreで代用
    var score_hour = result.baseScore;
    if (myCalc && ptCalc && myCalc.pillars.hour && ptCalc.pillars.hour) {
      var hourLabel = myCalc.pillars.hour.jisshin;
      if (hourLabel && hourLabel !== '─（日主）' && hourLabel !== '─') {
        if (SHIGOU[myCalc.pillars.hour.shi] === ptCalc.pillars.hour.shi) score_hour = Math.min(100, score_hour + 8);
        else if (ROKUCHUU[myCalc.pillars.hour.shi] === ptCalc.pillars.hour.shi) score_hour = Math.max(20, score_hour - 8);
      }
    }

    // birthCompatScore = 5要素の加重平均
    var birthCompatScore = Math.round(
      score_gogyo * 0.35 +
      score_day * 0.25 +
      score_month * 0.20 +
      score_year * 0.10 +
      score_hour * 0.10
    );
    birthCompatScore = Math.max(20, Math.min(100, birthCompatScore));

    result.score_gogyo = score_gogyo;
    result.score_day = score_day;
    result.score_month = score_month;
    result.score_year = score_year;
    result.score_hour = score_hour;
    result.birthCompatScore = birthCompatScore;
  } catch (e) {
    console.error('[compatCalcFull] Section 4 error:', e);
  }

  // ══════════════════════════════════════════════════════════════
  //  Section 5: 正規化スコア
  // ══════════════════════════════════════════════════════════════
  try {
    var meishikiScore = result.birthCompatScore;
    var bcs_n = remapTo(meishikiScore, 55, 95);
    var hik_n = remapTo(result.hikiai, 20, 99);
    // MBTIスコアに A/T サブタイプ補正を適用して総合スコアに反映
    var mbt_n = result.mbtiScore;
    var _myMbtiStr = result.myMbti || '';
    var _ptMbtiStr = result.ptMbti || '';
    var _myAT5 = /-(A|T)$/.test(_myMbtiStr) ? _myMbtiStr.slice(-1) : null;
    var _ptAT5 = /-(A|T)$/.test(_ptMbtiStr) ? _ptMbtiStr.slice(-1) : null;
    if (_myAT5 === 'A' && _ptAT5 === 'A') mbt_n = Math.min(100, mbt_n + 3);
    else if (_myAT5 === 'T' && _ptAT5 === 'T') mbt_n = Math.max(20, mbt_n - 3);

    result.bcs_n = bcs_n;
    result.hik_n = hik_n;
    result.mbt_n = mbt_n;
  } catch (e) {
    console.error('[compatCalcFull] Section 5 error:', e);
  }

  // ══════════════════════════════════════════════════════════════
  //  Section 6: 続柄グループ別ウェイト + 十神スコア
  // ══════════════════════════════════════════════════════════════
  try {
    var rel = (partner && partner.relation) || '恋人・パートナー';
    var LOVE_RELS = ['恋人・パートナー', '気になる人', '配偶者', '婚約者', '元交際相手'];
    var isLoveGroup = LOVE_RELS.indexOf(rel) >= 0;

    // ── 十神スコア計算（LOVEグループのみ使用） ──
    var jisshinScore = 64;
    if (isLoveGroup && myCalc && ptCalc) {
      var _JIKKAN_IDX = { 甲: 0, 乙: 1, 丙: 2, 丁: 3, 戊: 4, 己: 5, 庚: 6, 辛: 7, 壬: 8, 癸: 9 };
      var _GY = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水'];
      var _SE = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
      var _KO = { 木: '土', 火: '金', 土: '水', 金: '木', 水: '火' };
      function _jis10(niI, tiI) {
        var ng = _GY[niI], tg = _GY[tiI], s = (niI % 2) === (tiI % 2);
        // _SE=生む先, _KO=剋す先  生我→印, 克我→官 (修正: 旧コードは官/印が逆転していた)
        if (ng === tg) return s ? '比肩' : '劫財';
        if (_SE[ng] === tg) return s ? '食神' : '傷官';
        if (_KO[ng] === tg) return s ? '偏財' : '正財';
        if (_SE[tg] === ng) return s ? '偏印' : '正印';
        if (_KO[tg] === ng) return s ? '偏官' : '正官';
        return '比肩';
      }
      var myKanI = _JIKKAN_IDX[myCalc.pillars.day.kan];
      var ptKanI = _JIKKAN_IDX[ptCalc.pillars.day.kan];
      var myGender = (myInput && myInput.gender) || '';
      var ptGender6 = (partner && partner.gender) || '';
      var my2pt = (myKanI !== undefined && ptKanI !== undefined) ? _jis10(myKanI, ptKanI) : '';
      var pt2my = (myKanI !== undefined && ptKanI !== undefined) ? _jis10(ptKanI, myKanI) : '';
      var ZAISEI = ['正財', '偏財'];
      var KANSEI = ['正官', '偏官'];
      var KICHI = ['食神', '正印', '偏印'];
      function isSpouseStar(jis, gender) {
        if (gender === '男性') return ZAISEI.indexOf(jis) >= 0;
        if (gender === '女性') return KANSEI.indexOf(jis) >= 0;
        return ZAISEI.indexOf(jis) >= 0 || KANSEI.indexOf(jis) >= 0;
      }
      var mySpouse = isSpouseStar(my2pt, myGender);
      var ptSpouse = isSpouseStar(pt2my, ptGender6);
      var myKichi = KICHI.indexOf(my2pt) >= 0;
      var ptKichi = KICHI.indexOf(pt2my) >= 0;
      if (mySpouse && ptSpouse) jisshinScore = 95;
      else if (mySpouse || ptSpouse) jisshinScore = 79;
      else if (myKichi && ptKichi) jisshinScore = 64;
      else if (my2pt === '比肩' || my2pt === '劫財') jisshinScore = 56;
      else jisshinScore = 48;
    }

    // ── 続柄別ウェイト（宿命の縁wB / 引き合う力wH / MBTIwM / 恋愛運wL） ──
    var wB, wH, wM, wL, wJ = 0;
    var weightLabel = '';
    if (rel === '恋人・パートナー') {
      wB = 0.25; wH = 0.25; wM = 0.25; wL = 0.25;
      weightLabel = '宿命の縁25% + 引き合う力25% + MBTI25% + 恋愛運25% + 恋愛補完加点';
    } else if (rel === '気になる人') {
      wB = 0.25; wH = 0.35; wM = 0.15; wL = 0.25;
      weightLabel = '宿命の縁25% + 引き合う力35% + MBTI15% + 恋愛運25% + 恋愛補完加点';
    } else if (rel === '元交際相手') {
      wB = 0.25; wH = 0.45; wM = 0.05; wL = 0.25;
      weightLabel = '宿命の縁25% + 引き合う力45% + MBTI5% + 恋愛運25% + 恋愛補完加点';
    } else if (rel === '配偶者' || rel === '婚約者') {
      wB = 0.30; wH = 0.20; wM = 0.30; wL = 0.20;
      weightLabel = '宿命の縁30% + 引き合う力20% + MBTI30% + 恋愛運20% + 恋愛補完加点';
    } else if (rel === '友人') {
      wB = 0.35; wH = 0.25; wM = 0.40; wL = 0;
      weightLabel = '宿命の縁35% + 引き合う力25% + MBTI40%';
    } else if (rel === '職場の人') {
      wB = 0.25; wH = 0.20; wM = 0.55; wL = 0;
      weightLabel = '宿命の縁25% + 引き合う力20% + MBTI55%';
    } else if (rel === '家族') {
      wB = 0.60; wH = 0.25; wM = 0.15; wL = 0;
      weightLabel = '宿命の縁60% + 引き合う力25% + MBTI15%';
    } else {
      wB = 0.30; wH = 0.25; wM = 0.25; wL = 0.20;
      weightLabel = '宿命の縁30% + 引き合う力25% + MBTI25% + 恋愛運20% + 恋愛補完加点';
    }

    result.rel = rel;
    result.isLoveGroup = isLoveGroup;
    result.jisshinScore = jisshinScore;
    result.wB = wB;
    result.wH = wH;
    result.wM = wM;
    result.wL = wL;
    result.wJ = wJ;
    result.weightLabel = weightLabel;
  } catch (e) {
    console.error('[compatCalcFull] Section 6 error:', e);
  }

  // ══════════════════════════════════════════════════════════════
  //  Section 7: 引き合う力スコア (attractScore) + 三合/半会判定
  // ══════════════════════════════════════════════════════════════
  try {
    var attractScore = result.baseScore;
    var _sangouResult = null;
    var _hangouResult = null;
    if (myCalc && ptCalc) {
      if (SHIGOU[myCalc.pillars.month.shi] === ptCalc.pillars.month.shi) attractScore = Math.min(100, attractScore + 10);
      var _myMG = GOGYO[result.myKanIdx], _ptMG = GOGYO[result.ptKanIdx];
      if (SEI[_myMG] === _ptMG || SEI[_ptMG] === _myMG) attractScore = Math.min(100, attractScore + 8);

      // 三合・半会: 2人の日支・月支・年支（計6つ）
      var _allShis7 = [
        myCalc.pillars.day.shi, myCalc.pillars.month.shi, myCalc.pillars.year.shi,
        ptCalc.pillars.day.shi, ptCalc.pillars.month.shi, ptCalc.pillars.year.shi
      ];
      for (var _i = 0; _i < SANGOU.length; _i++) {
        var _group = SANGOU[_i];
        var _matchCount = 0;
        for (var _j = 0; _j < _group.length; _j++) {
          if (_allShis7.indexOf(_group[_j]) >= 0) _matchCount++;
        }
        if (_matchCount === 3) {
          _sangouResult = _group;
          break;
        } else if (_matchCount === 2 && !_sangouResult && !_hangouResult) {
          _hangouResult = _group;
        }
      }
      if (_sangouResult) {
        attractScore = Math.min(100, attractScore + 12);
      } else if (_hangouResult) {
        attractScore = Math.min(100, attractScore + 6);
      }
    }
    attractScore = Math.max(20, Math.min(100, attractScore));
    result.attractScore = attractScore;
    result.sangou = _sangouResult;
    result.hangou = _hangouResult;
  } catch (e) {
    console.error('[compatCalcFull] Section 7 error:', e);
  }

  // ══════════════════════════════════════════════════════════════
  //  Section 8: ASTROLOGY COMPATIBILITY 5項目 + birthCompatScore再計算
  // ══════════════════════════════════════════════════════════════
  try {
    var astroItems = [];
    var myGogyo8 = result.myGogyo;
    var ptGogyo8 = result.ptGogyo;
    var compat_type8 = result.compat_type;
    var baseScore8 = result.baseScore;
    var ptName8 = result.ptName;

    // ── 項目1: 五行相性（日主の相生・比和・相剋・中和）── スコア帯で文調変化
    var s1 = result.score_gogyo;
    var gogyo_title, gogyo_desc, gogyo_icon;
    if (compat_type8 === '相生型') {
      var seier = SEI[myGogyo8] === ptGogyo8 ? myGogyo8 : ptGogyo8;
      var seied = SEI[myGogyo8] === ptGogyo8 ? ptGogyo8 : myGogyo8;
      gogyo_icon = '💧';
      gogyo_title = 'エネルギーの流れ：' + ptName8 + 'がそばにいると' + seied + 'の気が高まる';
      gogyo_desc = tonedAstroDesc(s1,
        seier + 'の気が' + seied + 'の気を高める相生の関係ンダ。' + ptName8 + 'がそばにいるとあなたのエネルギーが自然と安定し、長く付き合っても消耗しにくい理想的な組み合わせンダ🐼',
        seier + 'の気が' + seied + 'の気を高める関係ではあるが、他の五行のバランス次第ではその恩恵を十分に受けにくい面もあるンダ。意識的に一緒にいる時間を増やすことで、相生の力がより活きてくるんダよ🐼',
        seier + 'と' + seied + 'は本来相生の関係だが、現時点では他の要因がその力を弱めているンダ。相性を良くするには、2人の五行バランスを意識した過ごし方がカギになるんダよ🐼'
      );
    } else if (compat_type8 === '比和型') {
      gogyo_icon = '🌀';
      gogyo_title = '同じ「' + myGogyo8 + 'の気」を持つ同士の共鳴';
      gogyo_desc = tonedAstroDesc(s1,
        'あなたも' + ptName8 + 'も「' + myGogyo8 + 'の気」ンダ。同じ気質だから話の前提が合いやすく「この人はわかってくれる」という感覚が自然に生まれる、深い共鳴を持つ組み合わせンダ🐼',
        '同じ「' + myGogyo8 + 'の気」を持つ2人ンダ。共感しやすい反面、弱点も共有しているため、同じ壁にぶつかりやすい面があるンダ。お互いの弱点を補い合う意識が大切ンダよ🐼',
        '同じ「' + myGogyo8 + 'の気」同士だが、似すぎているがゆえにエネルギーが停滞しやすい状態ンダ。意識して新しい刺激を取り入れないと、関係がマンネリ化しやすいから注意ンダよ🐼'
      );
    } else if (compat_type8 === '相剋型') {
      var ctrl = KOKU[myGogyo8] === ptGogyo8 ? myGogyo8 : ptGogyo8;
      var ctrlby = KOKU[myGogyo8] === ptGogyo8 ? ptGogyo8 : myGogyo8;
      gogyo_icon = '🔥';
      gogyo_title = 'エネルギーがぶつかり合い、互いを鍛える';
      gogyo_desc = tonedAstroDesc(s1,
        ctrl + 'と' + ctrlby + 'の気は相剋の関係だが、他の要素がそれを上回る強い結びつきを作っているンダ。摩擦を乗り越えた先にある絆は非常に強く、お互いを鍛え合える貴重な組み合わせンダ🐼',
        ctrl + 'の気が' + ctrlby + 'の気に作用する相剋の関係ンダ。摩擦は生まれやすいが、乗り越えるほどに絆が深まるタイプの相性ンダよ。' + ptName8 + 'との衝突を「成長のきっかけ」として受け取ることがカギンダ🐼',
        ctrl + 'と' + ctrlby + 'のエネルギーが大きくぶつかり合う組み合わせンダ。摩擦は避けられないが、それが2人を鍛え合う力にもなるんダよ。感情的になったときは一度立ち止まることが大切ンダ🐼'
      );
    } else {
      gogyo_icon = '⚖️';
      gogyo_title = 'バランスのとれた安定した気質の組み合わせ';
      gogyo_desc = tonedAstroDesc(s1,
        myGogyo8 + 'と' + ptGogyo8 + 'は直接的な相生・相剋の関係ではないが、安定した土台のうえにしっかりとした関係を築けている組み合わせンダ。努力が報われやすい理想的な状態ンダよ🐼',
        myGogyo8 + 'と' + ptGogyo8 + 'は直接的な引力や反発がないンダ。大きな衝突も起きにくいが、意識して関係を深める努力が必要な組み合わせンダよ🐼',
        myGogyo8 + 'と' + ptGogyo8 + 'はお互いに作用しにくい組み合わせンダ。放っておくと関係が薄まりやすいから、意識して一緒にいる時間を作り、関わりを続けることが大切ンダよ🐼'
      );
    }
    astroItems.push({ icon: gogyo_icon, title: gogyo_title, badgeHtml: badge(s1), subtitle: '生年月日の五行 · スコア ' + s1 + '/100', desc: gogyo_desc, score: s1, isAttractRow: false });

    // ── 項目2: 日柱相性 ── スコア帯で文調変化
    var s2 = result.score_day;
    var day_title, day_desc, day_icon;
    var mDS = myCalc.pillars.day.shi, pDS = ptCalc.pillars.day.shi;
    var mDK = myCalc.pillars.day.kan, pDK = ptCalc.pillars.day.kan;
    if (SHIGOU[mDS] === pDS) {
      day_icon = '🔗';
      day_title = '生まれ日の地支が支合 — 深い縁がある';
      day_desc = tonedAstroDesc(s2,
        '「' + (SNAME[mDS]||mDS) + '」と「' + (SNAME[pDS]||pDS) + '」の支合が成立しているンダ。2人の生活リズムが自然と噛み合い、一緒にいるだけで「なんか合う」と感じられる、とても強い縁ンダよ🐼',
        '支合の関係はあるが、他の五行要素がその力を部分的に打ち消しているンダ。「合う」と感じる瞬間と「ズレる」瞬間が混在するかもしれないが、支合の根本は確かにあるンダよ🐼',
        '支合の関係があるものの、現時点では他の干渉が強くその恩恵を感じにくい状態ンダ。日常の過ごし方を意識的に揃えることで、支合の力を引き出せるようになるンダよ🐼'
      );
    } else if (ROKUCHUU[mDS] === pDS) {
      day_icon = '⚡';
      day_title = '生まれ日の地支が六冲 — 行動パターンが衝突しやすい';
      day_desc = tonedAstroDesc(s2,
        '六冲の関係だが、他の要素がそれを補っていて衝突は起きにくいンダ。違いを「面白い」と感じられるだけの土台がしっかりある組み合わせンダよ🐼',
        '「' + (SNAME[mDS]||mDS) + '」と「' + (SNAME[pDS]||pDS) + '」は六冲の関係ンダ。行動リズムや判断のタイミングで「なぜ？」が起きやすいンダよ。話し合う習慣を持つことが大切ンダ🐼',
        '六冲の衝突が強く出やすい状態ンダ。2人の行動パターンが真っ向からぶつかりやすく、些細なことで摩擦が生まれるンダよ。お互いの「当たり前」が違うことを前提に、冷静に話し合う努力が必要ンダ🐼'
      );
    } else if (mDS === pDS) {
      day_icon = '🔗';
      day_title = '生まれ日の地支が一致 — 生活リズムが近い';
      day_desc = tonedAstroDesc(s2,
        '同じ地支「' + (SNAME[mDS]||mDS) + '」を持つ2人ンダ。生活リズムや行動パターンが非常に近く、一緒にいて違和感がほとんどない、居心地の良い関係ンダよ🐼',
        '同じ地支を持つが、天干の組み合わせ次第では「似ているのに噛み合わない」面も出やすいンダ。似ている部分を活かしつつ、違いにも目を向けるといいンダよ🐼',
        '同じ地支だが、他の要素との兼ね合いで安定しにくい面があるンダ。「似ているはずなのにわかり合えない」と感じたら、表面的な一致の奥にある違いに目を向けてみてほしいンダよ🐼'
      );
    } else if (KANGO[mDK] === pDK) {
      day_icon = '🌟';
      day_title = '生まれ日の天干が干合 — 根本的な性質が引き合う';
      day_desc = tonedAstroDesc(s2,
        '日干「' + mDK + '」と「' + pDK + '」の干合が深いところで2人を引き合わせているンダ。一緒にいると自然と落ち着ける、本物の引力を持つ関係ンダよ🐼',
        '干合の関係はあるが、五行のぶつかりが影響して引力と摩擦が混在する状態ンダ。「落ち着く」と感じる瞬間と「ぶつかる」瞬間の両方があるかもしれないが、干合の根本は確かンダよ🐼',
        '干合の関係があるものの、現時点では他の要因がその引力を大きく弱めているンダ。「落ち着く」感覚よりも緊張感の方が強く出やすい時期かもしれない。焦らず関係を育てていくことが大切ンダよ🐼'
      );
    } else {
      day_icon = '🔗';
      day_title = '生まれ日の干支（' + mDK + mDS + ' × ' + pDK + pDS + '）の組み合わせ';
      day_desc = tonedAstroDesc(s2,
        '特別な支合・干合はないが、他の要素が良い関係を作っているンダ。お互いの個性を尊重しながら自然に寄り添える、安定した組み合わせンダよ🐼',
        '特別な支合・干合の関係ではないンダ。お互いの「普通」が違う場面が出やすいが、その違いを面白がれるかどうかがこの関係のカギンダよ🐼',
        '特別な引力がなく、かつ他の要素も噛み合いにくい状態ンダ。意識して歩み寄る努力をしないと距離が開きやすい組み合わせンダよ。ただしその分、努力した分だけ確実に関係が深まるタイプンダ🐼'
      );
    }
    astroItems.push({ icon: day_icon, title: day_title, badgeHtml: badge(s2), subtitle: '生まれ日の相性 · ' + mDK + mDS + ' × ' + pDK + pDS, desc: day_desc, score: s2, isAttractRow: false });

    // ── 項目3: 引き合う力（支合・干合の統合スコア） ──
    var s3 = Math.max(20, Math.min(100, result.attractScore));
    var attr_title, attr_desc, attr_icon;
    var hasShigou = SHIGOU[mDS] === pDS;
    var hasKango = KANGO[mDK] === pDK;
    var hasMShigou = SHIGOU[myCalc.pillars.month.shi] === ptCalc.pillars.month.shi;
    if (hasShigou && hasKango) {
      attr_icon = '💫';
      attr_title = '日支支合＋日干干合 — 二重の引力がある';
      attr_desc = tonedAstroDesc(s3,
        '日支の支合と日干の干合が同時に成立しているンダ。命式の中でも最も強い引力で、初対面から気になり、一緒にいると妙に落ち着く——その両方を感じられる特別な組み合わせンダよ🐼',
        '二重の引力があるが、他の要因が部分的に打ち消しているンダ。「気になる」と「ぶつかる」が交互に来やすいが、引力の根本は非常に強いンダよ🐼',
        '支合と干合の二重構造があるものの、現時点では他の干渉が強くその引力を感じにくい状態ンダ。焦らず時間をかけて関係を深めることで、この引力が徐々に目覚めてくるンダよ🐼'
      );
    } else if (hasShigou) {
      attr_icon = '✨';
      attr_title = '日支が支合 — 出会った瞬間から気になりやすい';
      attr_desc = tonedAstroDesc(s3,
        '「' + (SNAME[mDS]||mDS) + '」と「' + (SNAME[pDS]||pDS) + '」の支合が強く作用しているンダ。出会った瞬間から理由なく惹かれる、確かな引力を持つ関係ンダよ🐼',
        '支合の引力はあるが、他の要素がそれを部分的に弱めているンダ。「気になる」と感じつつも距離感に迷うことがあるかもしれないンダよ🐼',
        '支合の関係はあるが、現時点では引力よりも他の摩擦の方が強く出ているンダ。関係を続ける中で支合の力が徐々に表れてくる可能性があるンダよ🐼'
      );
    } else if (hasKango) {
      attr_icon = '🌟';
      attr_title = '日干が干合 — 深いところで惹かれ合う';
      attr_desc = tonedAstroDesc(s3,
        '日干「' + mDK + '」と「' + pDK + '」の干合が深いところで2人を結びつけているンダ。一緒にいると自然と落ち着ける、本物の引力ンダよ🐼',
        '干合の引力はあるが、表層的な相性が必ずしも良いとは限らないンダ。「落ち着く」感覚と「合わない」感覚が混在する時期かもしれないが、干合の根はしっかりあるンダよ🐼',
        '干合の関係はあるが、現時点では他の干渉が強く「落ち着く」よりも緊張感を覚えやすい状態ンダ。時間をかけてお互いを知っていくことで、干合の力が目覚めてくるンダよ🐼'
      );
    } else if (hasMShigou) {
      attr_icon = '🌙';
      attr_title = '月支が支合 — 感情のテンポが合いやすい';
      attr_desc = tonedAstroDesc(s3,
        '月支の支合が感情のリズムを自然に揃えてくれているンダ。「この人と話すと気持ちが楽」という感覚が確かにある、心地よい引力ンダよ🐼',
        '月支の支合はあるが、日柱の影響で感情が揃う場面と揃わない場面が混在するンダ。話すタイミングを意識するだけでぐっと楽になるンダよ🐼',
        '月支の支合はあるものの、他の衝突要因が強くその恩恵を感じにくい状態ンダ。感情のリズムを合わせるには意識的な努力が必要ンダよ🐼'
      );
    } else if (compat_type8 === '相生型') {
      attr_icon = '⚡';
      attr_title = '五行の相生 — エネルギーが自然に高め合う';
      attr_desc = tonedAstroDesc(s3,
        '五行の相生がしっかり機能しているンダ。一緒にいるだけでお互いのエネルギーが高まる、長く付き合うほど感じる確かな引力ンダよ🐼',
        '相生の関係だが、引力はゆるやかンダ。派手な引き合いではないが、長く一緒にいるほどじわじわと効いてくるタイプの力ンダよ🐼',
        '相生の関係はあるが、現時点では引力が十分に発揮されていないンダ。一緒に過ごす時間を意識的に増やすことで、相生の力が目覚めやすくなるンダよ🐼'
      );
    } else {
      attr_icon = '🔗';
      attr_title = '命式上の強い引力は今回は見当たらない';
      attr_desc = tonedAstroDesc(s3,
        '支合・干合はないが、他の要素が良い関係を築いているンダ。引力に頼らず実力で深まった関係は、実はとても強いンダよ🐼',
        '命式上の強い引力は見当たらないンダ。ただこれは悪いことではなく、引力がないぶん摩擦も少ない安定した関係を築きやすいンダよ🐼',
        '命式上の引力が見当たらず、かつ他の要素も噛み合いにくい状態ンダ。関係を深めるには意識的な努力が必要だが、努力した分だけ確実に返ってくる「育てる縁」ンダよ🐼'
      );
    }

    // Build attract row HTML for the renderer
    var attractBadgeCls = (hasShigou || hasKango || hasMShigou || compat_type8 === '相生型') ? 'sbadge good' : 'sbadge';
    var attractBadgeText = (hasShigou || hasKango || hasMShigou || compat_type8 === '相生型') ? 'あり' : 'なし';
    var attractRowHtml = '<div id="pf-attract-row" class="item-row">'
      + '<div class="item-icon" id="pf-attract-icon">' + attr_icon + '</div>'
      + '<div class="item-body">'
      + '<div class="item-title" id="pf-attract-title">' + attr_title + '<span id="pf-attract-badge" class="' + attractBadgeCls + '">' + attractBadgeText + '</span></div>'
      + '<div class="item-subtitle" id="pf-attract-subtitle">磁力的な引き合い</div>'
      + '<div id="pf-attract-desc" class="item-desc">' + attr_desc + '</div>'
      + '</div>'
      + '<div class="item-score"><div id="pf-attract-score" class="is-val" style="color:' + scoreColor(s3) + ';">' + s3 + '</div><div class="is-lbl">/100</div></div>'
      + '</div>';

    astroItems.push({ icon: attr_icon, title: attr_title, badgeHtml: '<span class="' + attractBadgeCls + '">' + attractBadgeText + '</span>', subtitle: '磁力的な引き合い', desc: attr_desc, score: s3, isAttractRow: true, attractRowHtml: attractRowHtml });

    // ── 項目4: 喜神の一致（運気への影響） ──
    var myKs = myCalc.kishin || [];
    var ptKs = ptCalc.kishin || [];
    var ptGogyoInMyKs = myKs.indexOf(ptGogyo8) >= 0;
    var myGogyoInPtKs = ptKs.indexOf(myGogyo8) >= 0;
    var s4_base = baseScore8;
    var kishin_icon, kishin_title, kishin_desc, s4;
    if (ptGogyoInMyKs && myGogyoInPtKs) {
      s4 = Math.min(100, s4_base + 20);
      kishin_icon = '⭐';
      kishin_title = ptName8 + 'とあなたが「互いの運気アップの存在」';
    } else if (ptGogyoInMyKs) {
      s4 = Math.min(100, s4_base + 15);
      kishin_icon = '⚖️';
      kishin_title = ptName8 + 'があなたの「運気アップの存在」';
    } else if (myGogyoInPtKs) {
      s4 = Math.min(100, s4_base + 10);
      kishin_icon = '⚖️';
      kishin_title = 'あなたが' + ptName8 + 'の「運気アップの存在」';
    } else {
      s4 = s4_base;
      kishin_icon = '🌿';
      kishin_title = '喜神の特別な一致はないが安定した関係';
    }
    s4 = Math.max(20, Math.min(100, s4));
    // スコア帯で文調変化
    if (ptGogyoInMyKs && myGogyoInPtKs) {
      kishin_desc = tonedAstroDesc(s4,
        'お互いの五行が相手の喜神と一致する非常に珍しい組み合わせンダ。2人でいるだけで運気が上がり合う、命式的に見ても最高レベルの縁ンダよ🐼',
        'お互いの喜神に相手の五行が一致しているが、他の要素が影響してその恩恵がフルに出にくい面もあるンダ。一緒にいる時間を増やすことで運気の相乗効果が高まるンダよ🐼',
        '喜神の一致はあるが、他の衝突要因が運気の相乗効果を打ち消している状態ンダ。お互いの良い面を意識的に認め合うことで、喜神の力を引き出せるようになるンダよ🐼'
      );
    } else if (ptGogyoInMyKs) {
      kishin_desc = tonedAstroDesc(s4,
        ptName8 + 'の五行があなたの喜神と一致しているンダ。' + ptName8 + 'と一緒にいる時間が長いほど、あなたの調子が自然と上がっていく、とても良い縁ンダよ🐼',
        ptName8 + 'の五行があなたの喜神と一致しているが、効果はゆるやかンダ。意識して一緒にいる時間を作ると、運気アップの恩恵をより感じやすくなるンダよ🐼',
        '喜神の一致はあるが、他の要因が強くその恩恵を感じにくい状態ンダ。焦らず長い目で関係を育てていくことが大切ンダよ🐼'
      );
    } else if (myGogyoInPtKs) {
      kishin_desc = tonedAstroDesc(s4,
        'あなたの五行が' + ptName8 + 'の喜神と一致しているンダ。あなたがそばにいるだけで' + ptName8 + 'の運気が上がる、' + ptName8 + 'にとって特別な存在ンダよ🐼',
        'あなたの五行が' + ptName8 + 'の喜神と一致しているが、効果はまだ十分に出ていないンダ。' + ptName8 + 'の支えになることを意識すると関係がさらに深まるンダよ🐼',
        '喜神の一致はあるが、現時点では他の要因が影響してその力が弱まっているンダ。長い目で見て関係を育てることが大切ンダよ🐼'
      );
    } else {
      kishin_desc = tonedAstroDesc(s4,
        '喜神の直接的な一致はないが、他の要素が良い関係を支えているンダ。運気に頼らず実力で築いた関係は、実はとても安定しているンダよ🐼',
        '喜神の一致は見当たらないンダ。特別な運気アップ効果はないが、衝突もしにくいバランスのとれた関係ンダよ🐼',
        '喜神の一致がなく、かつ他の要素も噛み合いにくい状態ンダ。お互いの運気の波が違う時期にサポートし合う意識が大切ンダよ🐼'
      );
    }
    astroItems.push({ icon: kishin_icon, title: kishin_title, badgeHtml: badge(s4), subtitle: '運気への影響 · あなたの喜神:' + (myKs.join('/') || '─'), desc: kishin_desc, score: s4, isAttractRow: false });

    // ── 項目5: 大運の流れ（長期的な相性の波） ──
    var myD = myCalc.currentDaiun, ptD = ptCalc.currentDaiun;
    var daiun_icon, daiun_title, daiun_desc, s5;
    var myDG = myD ? GOGYO[JIKKAN.indexOf(myD.kan)] : null;
    var ptDG = ptD ? GOGYO[JIKKAN.indexOf(ptD.kan)] : null;
    if (myD && ptD && ROKUCHUU[myD.shi] === ptD.shi) {
      s5 = Math.max(20, baseScore8 - 10);
      daiun_icon = '⚡';
      daiun_title = '今の大運が六冲 — この時期は慎重に';
      daiun_desc = tonedAstroDesc(s5,
        '大運は六冲の関係だが、他の要素がそれを補っていて実際の影響は限定的ンダ。慎重さを持ちつつも前向きに動ける時期ンダよ🐼',
        '現在の大運（あなた「' + myD.kan + myD.shi + '」、' + ptName8 + '「' + ptD.kan + ptD.shi + '」）が六冲の関係ンダ。この時期は2人の方向性がすれ違いやすく、大きな決断のときは丁寧に話し合うことが大切ンダよ🐼',
        '大運の六冲が強く出ている時期ンダ。2人の人生の方向性が真っ向からぶつかりやすく、重要な決断は特に慎重にしてほしいンダよ。この時期を乗り越えれば絆は確実に強くなるンダ🐼'
      );
    } else if (myD && ptD && (SEI[myDG] === ptDG || SEI[ptDG] === myDG)) {
      s5 = Math.min(100, baseScore8 + 10);
      daiun_icon = '🌊';
      daiun_title = '今の大運の流れが相生 — この時期は追い風';
      daiun_desc = tonedAstroDesc(s5,
        '現在の大運が相生の関係で、2人の運気が同じ方向に強く流れているンダ。一緒に動くと自然と物事がうまく進む、最高の追い風ンダよ🐼',
        '大運が相生の関係ンダ。追い風はあるが、その恩恵を最大限活かすには意識的に一緒に行動することが大切ンダよ🐼',
        '大運は相生の関係だが、他の要因がその追い風を弱めているンダ。意識して一緒に動く時間を作ると、相生の力が徐々に感じられるようになるンダよ🐼'
      );
    } else if (myD && ptD && myDG === ptDG) {
      s5 = Math.min(100, baseScore8 + 5);
      daiun_icon = '🌊';
      daiun_title = '今の大運が比和 — 似た流れの中にいる';
      daiun_desc = tonedAstroDesc(s5,
        '2人の大運が同じ五行で、今まさに同じテーマを共有している時期ンダ。共感が自然に生まれ、一緒に動くと相乗効果が出やすい追い風ンダよ🐼',
        '大運が同じ五行で似た流れの中にいるンダ。共感は生まれやすいが、同じ壁にぶつかりやすい面もあるンダよ。お互いの視点を交換する意識が大切ンダ🐼',
        '大運が同じ五行だが、他の要因でその共鳴が活かしきれていないンダ。似た課題を抱えている分、協力すれば乗り越えやすくなるンダよ🐼'
      );
    } else {
      s5 = baseScore8;
      daiun_icon = '🌊';
      daiun_title = '今の大運の流れ（' + (myD ? myD.kan + myD.shi : '不明') + ' × ' + (ptD ? ptD.kan + ptD.shi : '不明') + '）';
      daiun_desc = tonedAstroDesc(s5,
        '大運に特別な関係はないが、安定した流れの中で着実に関係を深められる時期ンダ。地に足のついた穏やかな運気ンダよ🐼',
        '大運に特別な相生・六冲は見当たらないンダ。お互いの運気の流れはそれぞれ独立しているから、無理に合わせず尊重し合える時期ンダよ🐼',
        '大運の流れがお互いに作用しにくく、運気的なサポートが薄い時期ンダ。意識して相手を気にかけることが、この時期を乗り越えるカギンダよ🐼'
      );
    }
    s5 = Math.max(20, Math.min(100, s5));
    astroItems.push({ icon: daiun_icon, title: daiun_title, badgeHtml: badge(s5, s5 < baseScore8 ? 'caution' : ''), subtitle: '長期の運気の流れ · ' + (myD ? myD.ageFrom + '〜' + myD.ageTo + '歳の大運' : '大運不明'), desc: daiun_desc, score: s5, isAttractRow: false });

    // ── birthCompatScore を5つのスコアで再計算 ──
    var newBirth = Math.round(s1 * 0.35 + s2 * 0.25 + s3 * 0.20 + s4 * 0.10 + s5 * 0.10);
    newBirth = Math.max(20, Math.min(100, newBirth));
    var newBirth_n = remapTo(newBirth, 55, 95);
    result.bcs_n = newBirth_n;

    var bcs_n8 = newBirth_n;
    var hik_n8 = result.hik_n;
    var mbt_n8 = result.mbt_n;
    var wB8 = result.wB, wH8 = result.wH, wM8 = result.wM, wL8 = result.wL || 0;

    // 恋愛運スコアを先に計算（totalWeightedの要素として使うため）
    var newLove = Math.min(100, Math.round(bcs_n8 * 0.60 + hik_n8 * 0.25 + mbt_n8 * 0.15));
    if (compat_type8 === '相生型') newLove = Math.min(100, newLove + 5);
    if (compat_type8 === '相剋型') newLove = Math.max(30, newLove - 5);

    // 総合スコア = 4要素加重平均（恋愛運なしの続柄は wL=0 なので影響しない）
    var newTotal = Math.round(bcs_n8 * wB8 + hik_n8 * wH8 + mbt_n8 * wM8 + newLove * wL8);
    var newLabel = getTonedLabel(newTotal, result.genderTone, result.ptName);

    result.astroItems = astroItems;
    result.newBirth = newBirth;
    result.newTotal = newTotal;
    result.newLabel = newLabel;
    result.newLove = newLove;
    result.hasShigou = hasShigou;
    result.hasKango = hasKango;
    result.hasMShigou = hasMShigou;
  } catch (e) {
    console.error('[compatCalcFull] Section 8 error:', e);
  }

  // ══════════════════════════════════════════════════════════════
  //  Section 9: 総合加重平均 + タグテキスト
  // ══════════════════════════════════════════════════════════════
  try {
    var loveW = result.newLove || result.loveScore || 60;
    var totalWeightedBase = Math.round(result.bcs_n * result.wB + result.hik_n * result.wH + result.mbt_n * result.wM + loveW * (result.wL || 0));
    var loveWeighted = loveW;

    // ── 恋人・配偶者向け加点(4 要素)──
    var _relation9 = (partner && partner.relation) || result.rel || null;
    var _coupleBonus = _calcCoupleBonus(myCalc, ptCalc, _relation9);
    var _bonusPoints = _coupleBonus.totalBonus || 0;
    var totalWeighted = Math.min(100, totalWeightedBase + _bonusPoints);

    // newTotal にも同じ加点を反映(UI 表示側が newTotal を参照するため整合)
    if (typeof result.newTotal === 'number') {
      result.newTotal = Math.min(100, result.newTotal + _bonusPoints);
      result.newLabel = getTonedLabel(result.newTotal, result.genderTone, result.ptName);
    }

    var tagText = getTonedLabel(totalWeighted, result.genderTone, result.ptName);

    result.totalWeighted = totalWeighted;
    result.tagText = tagText;
    result.loveWeighted = loveWeighted;
    result.coupleBonus = {
      baseTotal: totalWeightedBase,
      bonusPoints: _bonusPoints,
      finalTotal: totalWeighted,
      capped: (totalWeightedBase + _bonusPoints) > 100,
      applied: _coupleBonus.applied,
      reason: _coupleBonus.reason || null,
      details: _coupleBonus.details,
    };
  } catch (e) {
    console.error('[compatCalcFull] Section 9 error:', e);
  }

  // ══════════════════════════════════════════════════════════════
  //  Section 10: サブスコア正規化 + 恋愛スコア
  // ══════════════════════════════════════════════════════════════
  try {
    var birthScore10 = result.baseScore;
    if (myCalc && ptCalc) {
      if (SHIGOU[myCalc.pillars.day.shi] === ptCalc.pillars.day.shi) birthScore10 = Math.min(100, birthScore10 + 10);
      else if (ROKUCHUU[myCalc.pillars.day.shi] === ptCalc.pillars.day.shi) birthScore10 = Math.max(20, birthScore10 - 10);
      if (KANGO[myCalc.pillars.day.kan] === ptCalc.pillars.day.kan) birthScore10 = Math.min(100, birthScore10 + 8);
    }

    var mbtiScore10 = 70;
    if (opts.mbtiEngineReady && result.myMbti && result.ptMbti && result.myMbti !== 'わからない' && result.ptMbti !== 'わからない') {
      mbtiScore10 = opts.calcMbtiScore(result.myMbti, result.ptMbti);
    }

    var birthScore_n = remapTo(birthScore10, 55, 95);
    var attractScore_n = remapTo(result.attractScore, 20, 99);
    var mbtiScore_ss_n = mbtiScore10;
    var loveScore2 = Math.min(100, Math.round((birthScore_n * 0.5 + attractScore_n * 0.3 + mbtiScore_ss_n * 0.2)));
    if (result.compat_type === '相生型') loveScore2 = Math.min(100, loveScore2 + 5);
    if (result.compat_type === '相剋型') loveScore2 = Math.max(30, loveScore2 - 5);

    var _ssInfo = (opts.mbtiEngineReady && result.myMbti && result.ptMbti && result.myMbti !== 'わからない' && result.ptMbti !== 'わからない')
      ? opts.getMbtiInfo(result.myMbti, result.ptMbti) : null;

    result.birthScore_n = birthScore_n;
    result.attractScore_n = attractScore_n;
    result.mbtiScore_ss_n = mbtiScore_ss_n;
    result.loveScore2 = loveScore2;
    result._ssInfo = _ssInfo;
  } catch (e) {
    console.error('[compatCalcFull] Section 10 error:', e);
  }

  // ══════════════════════════════════════════════════════════════
  //  Section 11: 引き合う組み合わせの具体的表示 (attractDetail)
  // ══════════════════════════════════════════════════════════════
  try {
    var finds11 = [];
    var scoreBonus11 = 0;

    if (SHIGOU[myCalc.pillars.day.shi] === ptCalc.pillars.day.shi) {
      finds11.push({
        icon: '💫', label: '日支が支合',
        detail: 'あなたの日支「' + (SNAME_FULL[myCalc.pillars.day.shi] || myCalc.pillars.day.shi) + '」と相手の日支「' + (SNAME_FULL[ptCalc.pillars.day.shi] || ptCalc.pillars.day.shi) + '」が支合している',
        why: '支合とは十二支の中で「陰陽が補い合う黄金のペア」のことンダ。日支どうしが支合するとき、2人が会うたびに自然とお互いのエネルギーが高まるんダよ。出会った瞬間から「なんかこの人気になる」と感じる引力はここから生まれているんダ🐼',
        bonus: '+10点',
      });
      scoreBonus11 += 10;
    }

    if (KANGO[myCalc.pillars.day.kan] === ptCalc.pillars.day.kan) {
      finds11.push({
        icon: '🌟', label: '日干が干合',
        detail: 'あなたの日干「' + myCalc.pillars.day.kan + '」と相手の日干「' + ptCalc.pillars.day.kan + '」が干合している',
        why: '干合とは十干の中で「陰陽が引き合う組み合わせ」ンダ。日干どうしが干合するとき、2人の根本的な性質が深いところで惹かれ合うんダよ。理屈ではなく「この人と一緒にいると落ち着く」という感覚の源ンダ🐼',
        bonus: '+8点',
      });
      scoreBonus11 += 8;
    }

    if (SHIGOU[myCalc.pillars.month.shi] === ptCalc.pillars.month.shi) {
      finds11.push({
        icon: '🌙', label: '月支が支合',
        detail: 'あなたの月支「' + (SNAME_FULL[myCalc.pillars.month.shi] || myCalc.pillars.month.shi) + '」と相手の月支「' + (SNAME_FULL[ptCalc.pillars.month.shi] || ptCalc.pillars.month.shi) + '」が支合している',
        why: '月柱は感情のリズムを示しているんダ。月支が支合するとき、2人の感情のテンポが自然と合いやすく「この人と話すと気持ちが楽」という感覚が生まれやすいんダよ🐼',
        bonus: '+6点',
      });
      scoreBonus11 += 6;
    }

    if (SEI[result.myGogyo] === result.ptGogyo || SEI[result.ptGogyo] === result.myGogyo) {
      var seier11 = SEI[result.myGogyo] === result.ptGogyo ? result.myGogyo : result.ptGogyo;
      var seied11 = SEI[result.myGogyo] === result.ptGogyo ? result.ptGogyo : result.myGogyo;
      finds11.push({
        icon: '⚡', label: '日主が相生',
        detail: '「' + seier11 + 'の気が' + seied11 + 'の気を育てる」関係にある',
        why: '命式の中心である日主が相生の関係にあるんダ。相生とは一方のエネルギーがもう一方を自然に高め合う関係のことンダよ。一緒にいるだけでお互いの運気が上がりやすい、命式的にとても良い縁ンダ🐼',
        bonus: result.baseScore >= 80 ? '+12点' : '+8点',
      });
      scoreBonus11 += result.baseScore >= 80 ? 12 : 8;
    }

    result.attractDetail = {
      finds: finds11,
      scoreBonus: scoreBonus11,
      findScore: finds11.length > 0 ? Math.min(100, result.attractScore + scoreBonus11) : 68,
    };
  } catch (e) {
    console.error('[compatCalcFull] Section 11 error:', e);
  }

  // ══════════════════════════════════════════════════════════════
  //  Section 12: PERSONALITY セクション (partnerPersona)
  // ══════════════════════════════════════════════════════════════
  try {
    var JISSHIN_LABEL = {
      '比肩': '同調の星', '劫財': '競争の星', '食神': '表現の星', '傷官': '革新の星',
      '偏財': '行動の星', '正財': '安定の星', '偏官': '挑戦の星', '正官': '誠実の星',
      '偏印': '直感の星', '正印': '知性の星', '─（日主）': '本命 ★'
    };
    var GOGYO_NAMES2 = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水'];

    var myDayGogyo12 = GOGYO_NAMES2[result.myKanIdx];
    var myPersona12 = GOGYO_PERSONA[myDayGogyo12] || GOGYO_PERSONA['水'];

    var ptDayGogyo12 = GOGYO_NAMES2[result.ptKanIdx];
    var ptPersona12 = GOGYO_PERSONA[ptDayGogyo12] || GOGYO_PERSONA['火'];

    var ptNikchu = ptCalc.pillars.day.kan + ptCalc.pillars.day.shi;
    var ptKakuType = (ptCalc.kakukyoku && ptCalc.kakukyoku.name && ptCalc.kakukyoku.name.indexOf('従旺') >= 0) ? '従旺格' : '普通格局';
    var ptProfileKey = ptNikchu + '_' + ptKakuType;
    var ptProfileText = NIKCHU_PROFILES[ptProfileKey] || NIKCHU_PROFILES[ptNikchu + '_普通格局'] || ptPersona12.descThem;

    var ptKK = ptCalc.kakukyoku && ptCalc.kakukyoku.name ? ptCalc.kakukyoku.name : '';
    var ptKishinStr = ptCalc.kishin ? ptCalc.kishin.join('・') : '';
    var ptPillarDesc = result.ptName + 'の日主は「' + ptCalc.pillars.day.kan + ptCalc.pillars.day.shi + '」ンダ。' + (ptKK ? '格局は「' + ptKK + '」で、' : '') + ptDayGogyo12 + 'の気質を持つ人ンダよ。' + (ptKishinStr ? '喜神「' + ptKishinStr + '」の流れに乗ったとき本領を発揮するんダ🐼' : '');

    // Pillar definitions for rendering
    var pp12 = ptCalc.pillars;
    var pillarDefs = [
      { label: '生まれ年', p: pp12.year, isDay: false },
      { label: '生まれ月', p: pp12.month, isDay: false },
      { label: '本命 ★', p: pp12.day, isDay: true },
      { label: pp12.hour ? '生まれ時間' : '時間不明', p: pp12.hour, isDay: false },
    ];

    result.partnerPersona = {
      myDayGogyo: myDayGogyo12,
      myPersona: myPersona12,
      ptDayGogyo: ptDayGogyo12,
      ptPersona: ptPersona12,
      ptProfileText: ptProfileText,
      ptPillarDesc: ptPillarDesc,
      pillarDefs: pillarDefs,
      JISSHIN_LABEL: JISSHIN_LABEL,
    };
  } catch (e) {
    console.error('[compatCalcFull] Section 12 error:', e);
  }

  // ══════════════════════════════════════════════════════════════
  //  Section 13: 命式ベースの注意点 (cautionPoints)
  // ══════════════════════════════════════════════════════════════
  try {
    var points13 = [];

    // 日支六冲
    if (ROKUCHUU[myCalc.pillars.day.shi] === ptCalc.pillars.day.shi) {
      points13.push({
        level: 'high', icon: '⚡',
        title: '日支が六冲 — 行動リズムがぶつかりやすい',
        body: 'あなたの日支「' + myCalc.pillars.day.shi + '」と相手の日支「' + ptCalc.pillars.day.shi + '」は六冲の関係にあるんダ。六冲とは十二支の中で真っ向から対立するペアのことンダよ。日常の行動パターンや生活リズムで「なんでそうするの？」というすれ違いが起きやすいんダ。悪い相性ではないけれど、お互いの「当たり前」が違うことを前提に話し合う習慣が大切ンダ🐼',
      });
    }

    // 月支六冲
    if (ROKUCHUU[myCalc.pillars.month.shi] === ptCalc.pillars.month.shi) {
      points13.push({
        level: 'mid', icon: '🌊',
        title: '月支が六冲 — 感情の波のタイミングがずれやすい',
        body: '2人の月支（「' + myCalc.pillars.month.shi + '」と「' + ptCalc.pillars.month.shi + '」）が六冲の関係ンダ。月柱は感情のリズムや、人との関わり方の傾向を示しているんダよ。あなたが「話したい」と感じるタイミングで相手が「一人でいたい」と感じる、またはその逆が起きやすいんダ。意識的にお互いのタイミングを確認し合うといいんダよ🐼',
      });
    }

    // 相剋型
    if (result.compat_type === '相剋型') {
      var who_controls = KOKU[result.myGogyo] === result.ptGogyo ? 'あなたの' + result.myGogyo + 'の気' : '相手の' + result.ptGogyo + 'の気';
      var who_ctrl_by = KOKU[result.myGogyo] === result.ptGogyo ? '相手の' + result.ptGogyo + 'の気' : 'あなたの' + result.myGogyo + 'の気';
      points13.push({
        level: 'mid', icon: '🔥',
        title: '日主が相剋 — エネルギーがぶつかり合いやすい',
        body: 'あなたの日主「' + result.myGogyo + '」と相手の日主「' + result.ptGogyo + '」は相剋の関係ンダ。' + who_controls + 'が' + who_ctrl_by + 'と衝突する方向性を持っているんダよ。これは決して「悪い相性」ではなく、摩擦が2人を鍛え合い、乗り越えるほどに絆が深まるタイプの相性ンダ。ただし「なぜこんなにわかり合えないんだろう」と感じる場面では、一度立ち止まることが大事ンダよ🐼',
      });
    }

    // 大運の六冲
    var myD13 = myCalc.currentDaiun, ptD13 = ptCalc.currentDaiun;
    if (myD13 && ptD13 && ROKUCHUU[myD13.shi] === ptD13.shi) {
      points13.push({
        level: 'low', icon: '⏳',
        title: '現在の大運が六冲 — 今この時期は少し注意',
        body: '今の大運（あなたは「' + myD13.kan + myD13.shi + '」、相手は「' + ptD13.kan + ptD13.shi + '」）が六冲の関係にあるんダ。大運は約10年単位の運気の流れを示していて、この時期はお互いの人生の方向性がすれ違いやすい傾向があるんダよ。大きな決断をするときは特に丁寧に話し合うことが大切ンダ🐼',
      });
    }

    // 年支六冲
    if (ROKUCHUU[myCalc.pillars.year.shi] === ptCalc.pillars.year.shi) {
      points13.push({
        level: 'low', icon: '🌱',
        title: '年支が六冲 — 育った環境・価値観の根本が違う',
        body: '2人の年支（「' + myCalc.pillars.year.shi + '」と「' + ptCalc.pillars.year.shi + '」）が六冲の関係ンダ。年柱は育った環境や、価値観の根っこを示しているんダよ。「なんでそんなことが当たり前なの？」という根本的な驚きが時々起きやすいんダ。違いを否定せず、「なるほどそういう育ち方をしたんだ」と好奇心を持って接することが、この関係を豊かにするカギンダ🐼',
      });
    }

    var LEVEL_STYLE = {
      high: { bg: 'rgba(200,80,60,.06)', bd: 'rgba(200,80,60,.2)', tc: 'rgba(210,100,80,.9)', ic: 'rgba(210,100,80,.7)' },
      mid: { bg: 'rgba(220,150,50,.05)', bd: 'rgba(220,150,50,.18)', tc: 'rgba(220,160,60,.9)', ic: 'rgba(220,160,60,.65)' },
      low: { bg: 'rgba(180,160,100,.04)', bd: 'rgba(180,160,100,.15)', tc: 'rgba(200,185,130,.8)', ic: 'rgba(200,185,130,.55)' },
    };

    result.cautionPoints = {
      points: points13,
      LEVEL_STYLE: LEVEL_STYLE,
    };
  } catch (e) {
    console.error('[compatCalcFull] Section 13 error:', e);
  }

  // ══════════════════════════════════════════════════════════════
  //  Section 14: HOW THEY SEE YOU (howTheySeeYou)
  // ══════════════════════════════════════════════════════════════
  try {
    var GN = {
      木: '木（創造・感受性）', 火: '火（情熱・行動力）',
      土: '土（安定・誠実さ）', 金: '金（意志・鋭さ）', 水: '水（直感・包容力）'
    };
    var GN_SHORT = { 木: '創造性', 火: '行動力', 土: '安定感', 金: '意志力', 水: '包容力' };

    var gogyoKey14 = (result.myGogyo || '水') + '_' + (result.ptGogyo || '火');
    var thinkData14 = GOGYO_HOWSEE[gogyoKey14];

    if (!thinkData14) {
      var defaultBody1 = {
        '相生型': result.ptName + 'にとって、あなたは自分を自然にパワーアップさせてくれる存在なんダよ🐼 生年月日の占いで「相生」の関係が出ていて、一緒にいるだけでお互いのエネルギーが高まり、気づけばお互いにとって欠かせない存在になっていく関係ンダ。あなたが意識していなくても、そばにいるだけで' + result.ptName + 'の中の何かが動き出すんダよ。',
        '比和型': result.ptName + 'にとって、あなたは「自分の鏡」のような存在なんダよ🐼 同じ気質を持つ者同士、言葉にしなくても通じ合える稀有な感覚があるんダ。「この人はわかってくれる」という確信が、' + result.ptName + 'をあなたのそばに引き寄せているんダよ。長く一緒にいるほど、この共鳴はより深まっていくんダ。',
        '相剋型': result.ptName + 'にとって、あなたは「刺激的で目が離せない存在」として映っているんダよ🐼 エネルギーの方向が違うから摩擦はあるけど、それが逆にお互いを強くしているんダ。対立を乗り越えるたびに絆が深まる、時間をかけて本物の信頼を育てられる関係ンダよ。',
        '中和型': result.ptName + 'にとって、あなたは「安心して隣にいられる存在」として映っているんダよ🐼 バランスが取れた組み合わせで、無理せず自然体でいられるんダ。お互いの努力次第でどこまでも深まれる、可能性に満ちた関係ンダよ。',
      };
      var defaultBody2 = {
        '相生型': result.ptName + 'はあなたの持つ' + GN_SHORT[result.myGogyo || '水'] + 'に、自分が求めていたものを感じているんダ🐼 意識しているかどうかに関わらず、あなたがそばにいることで' + result.ptName + 'の調子が上がり、自分の力が最大限に引き出される感覚があるはずンダ。長い時間をかけるほど、この感覚はより確かになっていくんダよ。',
        '比和型': result.ptName + 'はあなたの「同じ気質の深さと純粋さ」に、世界で最も理解してくれる存在を見ているんダ🐼 外から見えない部分を、あなたなら説明しなくても受け取ってくれると確信しているはずンダよ。',
        '相剋型': result.ptName + 'はあなたとのやりとりを経て、いつも「少し強くなった自分」に気づいているんダ🐼 簡単ではない関係だからこそ、乗り越えた先に本物の絆が生まれているんダよ。',
        '中和型': result.ptName + 'はあなたといると穏やかな気持ちになれるんダ🐼 大きな波はないけど、だからこそ長く続く関係を築けるんダよ。丁寧に関係を育てていくほど、2人の絆は深くなっていくはずンダ。',
      };
      var defaultChips1 = {
        '相生型': ['エネルギーをもらえる', '一緒にいると調子が上がる', '自然に引き合う', '長くいるほど深まる'],
        '比和型': ['気持ちが通じ合う', '価値観が近い', '一緒にいて楽', '安心できる存在'],
        '相剋型': ['刺激し合える', '成長させてくれる', '気になる存在', '引き付けられる'],
        '中和型': ['安心できる', 'バランスがいい', '一緒にいて自然', '長続きしやすい'],
      };
      var defaultChips2 = {
        '相生型': ['才能を引き出してくれる', '自然と高め合える', '居心地がいい', 'かけがえない'],
        '比和型': ['共感しやすい', '同じ感覚を持つ', '一緒に成長できる', '本物の理解者'],
        '相剋型': ['違いが魅力になる', '化学反応がある', '磨き合える', '乗り越えるほど深まる'],
        '中和型': ['安定した関係', 'お互いを尊重', 'ゆっくり深まる', '丁寧に育てられる'],
      };
      thinkData14 = {
        body1: defaultBody1[result.compat_type] || defaultBody1['中和型'],
        chips1: defaultChips1[result.compat_type] || defaultChips1['中和型'],
        body2: defaultBody2[result.compat_type] || defaultBody2['中和型'],
        chips2: defaultChips2[result.compat_type] || defaultChips2['中和型'],
      };
    }

    // P3-B: 命式情報で body1 を補強
    var addOn14 = '';
    if (ptCalc) {
      var ptKs14 = ptCalc.kishin || [];
      var ptKk14 = (ptCalc.kakukyoku && ptCalc.kakukyoku.name) ? ptCalc.kakukyoku.name : '';
      var ptDaiun14 = ptCalc.currentDaiun;

      if (ptKs14.length > 0 && ptKs14.indexOf(result.myGogyo) >= 0) {
        addOn14 += ' 命式から見ると、あなたの' + result.myGogyo + 'の気質はちょうど' + result.ptName + 'の喜神（運気が上がる要素）にあたるんダよ🌟 あなたがそばにいるだけで' + result.ptName + 'の運気が自然と上がる、命式的に見ても「吉の存在」として映っているんダ。';
      }
      if (ptKk14) {
        if (ptKk14.indexOf('従旺') >= 0) {
          addOn14 += ' ' + result.ptName + 'の格局は「' + ptKk14 + '」で、自分のペースと世界観を強く持つタイプンダ。あなたがその世界観を否定せず受け入れるとき、' + result.ptName + 'はあなたを「本当にわかってくれる人」として特別視するんダよ。';
        } else {
          addOn14 += ' ' + result.ptName + 'の格局は「' + ptKk14 + '」で、バランスを大切にするタイプんダ。あなたの持つエネルギーが' + result.ptName + 'のバランスを支える役割を自然と担っているんダよ。';
        }
      }
      if (ptDaiun14) {
        var ptDaiunGogyo_k = GOGYO[JIKKAN.indexOf(ptDaiun14.kan)];
        if (ptDaiunGogyo_k && (SEI[result.myGogyo] === ptDaiunGogyo_k || SEI[ptDaiunGogyo_k] === result.myGogyo)) {
          addOn14 += ' さらに' + result.ptName + 'の今の大運（' + ptDaiun14.kan + ptDaiun14.shi + '）とあなたの五行が相生の関係にあるから、この時期は特にあなたへの引力が強くなりやすいんダよ。';
        }
      }
    }

    var fullBody1 = (thinkData14.body1 || '') + addOn14;

    // chips1 にエクストラチップを追加
    var baseChips14 = (thinkData14.chips1 || ['引き合う']).slice();
    var extraChips14 = [];
    if (ptCalc && ptCalc.kishin && ptCalc.kishin.indexOf(result.myGogyo) >= 0) {
      extraChips14.push('運気を上げてくれる存在');
    }
    if (myCalc && ptCalc && SHIGOU[myCalc.pillars.day.shi] === ptCalc.pillars.day.shi) {
      extraChips14.push('出会った瞬間から気になる');
    }
    if (myCalc && ptCalc && KANGO[myCalc.pillars.day.kan] === ptCalc.pillars.day.kan) {
      extraChips14.push('一緒にいると落ち着く');
    }
    var allChips14 = baseChips14.slice();
    extraChips14.forEach(function (c) { if (allChips14.indexOf(c) < 0) allChips14.push(c); });
    allChips14 = allChips14.slice(0, 5);

    result.howTheySeeYou = {
      body1: fullBody1,
      chips1: allChips14,
      body2: thinkData14.body2 || '',
      chips2: thinkData14.chips2 || [],
      GN: GN,
      GN_SHORT: GN_SHORT,
    };
  } catch (e) {
    console.error('[compatCalcFull] Section 14 error:', e);
  }

  // ══════════════════════════════════════════════════════════════
  //  Section 15: 強み・注意点 (advByType) + 最終ポポコメント
  // ══════════════════════════════════════════════════════════════
  try {
    var adv15 = ADV_BY_TYPE[result.compat_type] || ADV_BY_TYPE['中和型'];

    var finalText15 = {
      '相生型': '総合的に見て、あなたと' + result.ptName + 'の相性は「一緒にいるほどお互いが成長できる、深い縁」ンダ✨ 生年月日の占いで「相生」の組み合わせが出ていて、' + result.ptName + 'はあなたの運気そのものを上げてくれる存在なんダよ。長く関係を続けるほど2人ともよくなっていく可能性が高いんダ🐼',
      '比和型': '総合的に見て、あなたと' + result.ptName + 'は「似た者同士で居心地のいい」組み合わせンダ🐼 同じ気質だからこそわかり合いやすく、安心して本音を話せる関係を築けるんダよ。お互いの弱点も共有しやすいから、補い合う意識を持つことが長続きのカギンダ✨',
      '相剋型': '総合的に見て、あなたと' + result.ptName + 'は「刺激し合って成長できる」組み合わせンダ✨ エネルギーの方向性が違うから摩擦はあるけど、それがお互いを一番鍛え合う関係でもあるんダよ。乗り越えるほどに絆が深まるタイプだから、簡単に諦めないことが大切ンダ🐼',
      '中和型': '総合的に見て、あなたと' + result.ptName + 'は「バランスのとれた」組み合わせンダ🐼 際立った強さも弱さもないからこそ、お互いの努力次第でいくらでも深まれる関係なんダよ。丁寧に関係を育てていくことが、2人の絆を強くするカギになるんダ✨',
    }[result.compat_type] || '総合的に見て、あなたと' + result.ptName + 'の相性をしっかり読み解いたんダ🐼 2人の命式の流れを大切にして、お互いを尊重しながら関係を育てていくといいんダよ✨';

    result.advByType = adv15;
    result.finalPopoComment = finalText15;
  } catch (e) {
    console.error('[compatCalcFull] Section 15 error:', e);
  }

  // ══════════════════════════════════════════════════════════════
  //  Section 16: BEST TIMING（月別相性スコア）
  // ══════════════════════════════════════════════════════════════
  try {
    var JIKKAN_V = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
    var JUNISHI_V = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    var JIKKAN_GOGYO_V = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水'];
    var JUNISHI_GOGYO_V = ['水', '土', '木', '木', '土', '火', '火', '土', '金', '金', '土', '水'];
    var SEI_V = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
    var KOKU_V = { 木: '土', 火: '金', 土: '水', 金: '木', 水: '火' };
    var SHIGOU_V = { 子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯', 辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午' };
    var ROKUCHUU_V = { 子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅', 卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳' };
    var KANGO_V = { 甲: '己', 己: '甲', 乙: '庚', 庚: '乙', 丙: '辛', 辛: '丙', 丁: '壬', 壬: '丁', 戊: '癸', 癸: '戊' };
    var GOKORTON_V = { 甲: ['丙', '丁', '戊', '己', '庚', '辛', '壬', '癸', '甲', '乙', '丙', '丁'], 己: ['丙', '丁', '戊', '己', '庚', '辛', '壬', '癸', '甲', '乙', '丙', '丁'], 乙: ['戊', '己', '庚', '辛', '壬', '癸', '甲', '乙', '丙', '丁', '戊', '己'], 庚: ['戊', '己', '庚', '辛', '壬', '癸', '甲', '乙', '丙', '丁', '戊', '己'], 丙: ['庚', '辛', '壬', '癸', '甲', '乙', '丙', '丁', '戊', '己', '庚', '辛'], 辛: ['庚', '辛', '壬', '癸', '甲', '乙', '丙', '丁', '戊', '己', '庚', '辛'], 丁: ['壬', '癸', '甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'], 壬: ['壬', '癸', '甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'], 戊: ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸', '甲', '乙'], 癸: ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸', '甲', '乙'] };

    function getFlowMonth(year, month) {
      function _jd(y, m, d, h) { if (m <= 2) { y--; m += 12; } var A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4); return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + h / 24 + B - 1524.5; }
      function _sl(jd) { var T = (jd - 2451545) / 36525; var L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T; L0 = ((L0 % 360) + 360) % 360; var M2 = 357.52911 + 35999.05029 * T - 0.0001537 * T * T; M2 = ((M2 % 360) + 360) % 360; var Mr = M2 * Math.PI / 180; var C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mr) + (0.019993 - 0.000101 * T) * Math.sin(2 * Mr) + 0.000289 * Math.sin(3 * Mr); var sl = L0 + C, om = 125.04 - 1934.136 * T; return (((sl - 0.00569 - 0.00478 * Math.sin(om * Math.PI / 180)) % 360) + 360) % 360; }
      var sl = _sl(_jd(year, month, 15, 3));
      var shiIdx = ((Math.floor(((sl - 315 + 360) % 360) / 30) + 2) % 12);
      var yKanIdx = ((year - 4) % 10 + 10) % 10;
      var yKan = JIKKAN_V[yKanIdx];
      var monthIdx = (shiIdx - 2 + 12) % 12;
      var kanStr = GOKORTON_V[yKan][monthIdx];
      var kanIdx = JIKKAN_V.indexOf(kanStr);
      return { kan: kanStr, shi: JUNISHI_V[shiIdx], kanIdx: kanIdx, shiIdx: shiIdx, gogyoKan: JIKKAN_GOGYO_V[kanIdx], gogyoShi: JUNISHI_GOGYO_V[shiIdx] };
    }

    function monthScore(calc, year, month) {
      var fm = getFlowMonth(year, month);
      var ks = calc.kishin, kj = calc.kijin, daiun = calc.currentDaiun;
      var nichiShi = calc.pillars.day.shi, nichiKan = calc.pillars.day.kan;
      var base = 60;
      if (ks.indexOf(fm.gogyoKan) >= 0) base += 12; if (kj.indexOf(fm.gogyoKan) >= 0) base -= 15;
      if (ks.indexOf(fm.gogyoShi) >= 0) base += 8; if (kj.indexOf(fm.gogyoShi) >= 0) base -= 10;
      if (SHIGOU_V[fm.shi] === nichiShi) base += 8;
      else if (ROKUCHUU_V[fm.shi] === nichiShi) base -= 12;
      if (daiun && KANGO_V[daiun.kan] === fm.kan) base += 6;
      if (daiun && SHIGOU_V[daiun.shi] === fm.shi) base += 4;
      if (daiun && ROKUCHUU_V[daiun.shi] === fm.shi) base -= 6;
      var ptShi = ptCalc.pillars.day.shi, ptKan = ptCalc.pillars.day.kan;
      if (SHIGOU_V[fm.shi] === ptShi || SHIGOU_V[ptShi] === fm.shi) base += 5;
      if (KANGO_V[fm.kan] === ptKan) base += 4;
      return Math.max(20, Math.min(95, Math.round(base)));
    }

    var compatBonus16 = result.compat_type === '相生型' ? 6 : result.compat_type === '比和型' ? 3 : result.compat_type === '相剋型' ? -4 : 0;

    var now = new Date();
    var curYear = now.getFullYear();
    var curMonth = now.getMonth() + 1;

    var months16 = [];
    for (var m = 1; m <= 12; m++) {
      var myS = monthScore(myCalc, curYear, m);
      var ptS = monthScore(ptCalc, curYear, m);
      var combined = Math.round((myS + ptS) / 2) + compatBonus16;
      combined = Math.max(20, Math.min(95, combined));
      var fm16 = getFlowMonth(curYear, m);
      months16.push({ month: m, myScore: myS, ptScore: ptS, combined: combined, fm: fm16 });
    }

    var maxM = months16.reduce(function (a, b) { return a.combined > b.combined ? a : b; });
    var minM = months16.reduce(function (a, b) { return a.combined < b.combined ? a : b; });
    var topTwo = months16.slice().sort(function (a, b) { return b.combined - a.combined; }).slice(0, 2);

    function makeDesc16(mo) {
      var s = mo.combined;
      var fm = mo.fm;
      var myKs16 = myCalc.kishin, ptKs16 = ptCalc.kishin;
      var reasons = [];
      if (myKs16.indexOf(fm.gogyoKan) >= 0)
        reasons.push(fm.kan + '（' + fm.gogyoKan + '）の月はあなたの喜神が強まる時期');
      if (ptKs16.indexOf(fm.gogyoKan) >= 0)
        reasons.push(fm.kan + 'の気が' + result.ptName + 'の運気を押し上げる月');
      if (SHIGOU_V[fm.shi] === myCalc.pillars.day.shi || SHIGOU_V[fm.shi] === ptCalc.pillars.day.shi)
        reasons.push(fm.shi + 'の月は2人のどちらかの日支と支合し、縁が強まりやすい');
      if (ROKUCHUU_V[fm.shi] === myCalc.pillars.day.shi || ROKUCHUU_V[fm.shi] === ptCalc.pillars.day.shi)
        reasons.push(fm.shi + 'の月は六冲が発生しやすく、感情の波に注意');
      if (KANGO_V[fm.kan] === ptCalc.pillars.day.kan)
        reasons.push(fm.kan + '月は' + result.ptName + 'の日干と干合し、' + result.ptName + 'の調子が特に上がる月');
      if (KANGO_V[fm.kan] === myCalc.pillars.day.kan)
        reasons.push(fm.kan + '月はあなたの日干と干合し、あなたの魅力が特に輝く月');

      if (reasons.length === 0) {
        if (s >= 80) reasons.push('2人の五行エネルギーが自然と高まり合う時期');
        else if (s >= 70) reasons.push('落ち着いた良い流れが続く安定した時期');
        else if (s < 50) reasons.push('それぞれの運気の流れに差が出やすい時期。無理せず自分のペースを大切に');
        else reasons.push('穏やかな時期。日常の小さなことを大切にするといいンダ');
      }
      return reasons[0];
    }

    var MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

    var timingMonths = months16.map(function (mo) {
      var s = mo.combined;
      var isCurrent = mo.month === curMonth;
      var isPastRaw = mo.month < curMonth;
      var isBestOrSecond = (mo.month === maxM.month) || (topTwo.length > 1 && mo.month === topTwo[1].month);
      var isPast = isPastRaw && !isCurrent && !isBestOrSecond;
      var isBest = mo.month === maxM.month;
      var isSecondBest = topTwo.length > 1 && mo.month === topTwo[1].month;
      var isWorst = mo.month === minM.month && s < 55;
      var isCaution = s < 55 && !isBest;

      var stars;
      if (isBest) stars = '★★★★★';
      else if (isSecondBest) stars = '★★★★☆';
      else if (s >= 70) stars = '★★★★☆';
      else if (isCaution || s < 55) stars = '★★☆☆☆';
      else stars = '★★★☆☆';

      return {
        month: mo.month,
        monthName: MONTH_NAMES[mo.month - 1],
        myScore: mo.myScore,
        ptScore: mo.ptScore,
        combined: mo.combined,
        fm: mo.fm,
        isCurrent: isCurrent,
        isPast: isPast,
        isBest: isBest,
        isSecondBest: isSecondBest,
        isWorst: isWorst,
        isCaution: isCaution,
        stars: stars,
        desc: makeDesc16(mo),
      };
    });

    var bestMonthText16 = topTwo.map(function (m) { return MONTH_NAMES[m.month - 1]; }).join('と');
    var finalBase16 = {
      '相生型': '総合的に見て、あなたと' + result.ptName + 'の相性は「一緒にいるほどお互いが成長できる、深い縁」ンダ✨',
      '比和型': '総合的に見て、あなたと' + result.ptName + 'は「似た者同士で居心地のいい」組み合わせンダ🐼',
      '相剋型': '総合的に見て、あなたと' + result.ptName + 'は「刺激し合って成長できる」組み合わせンダ✨',
      '中和型': '総合的に見て、あなたと' + result.ptName + 'は「バランスのとれた」組み合わせンダ🐼',
    }[result.compat_type] || '';
    var finalPopoWithTiming = finalBase16 + ' 大事なことを話し合うなら' + bestMonthText16 + 'がベストンダよ🐼 2人の命式と今年の流れを合わせて計算した結果ンダ。';

    result.bestTiming = {
      months: timingMonths,
      maxMonth: maxM,
      minMonth: minM,
      topTwo: topTwo,
      bestMonthText: bestMonthText16,
      finalPopoWithTiming: finalPopoWithTiming,
      MONTH_NAMES: MONTH_NAMES,
      curYear: curYear,
      curMonth: curMonth,
    };
  } catch (e) {
    console.error('[compatCalcFull] Section 16 error:', e);
  }

  // ══════════════════════════════════════════════════════════════
  //  Section 17: MBTI相性 (mbtiCompat)
  // ══════════════════════════════════════════════════════════════
  try {
    var myKey17 = toKey(result.myMbti);
    var ptKey17 = toKey(result.ptMbti);
    var myBase17 = getBaseType(result.myMbti);
    var ptBase17 = getBaseType(result.ptMbti);
    var mySub17 = getSubtype(result.myMbti);
    var ptSub17 = getSubtype(result.ptMbti);

    var mbtiRawScore17 = 3;
    if (myKey17 && ptKey17 && MBTI_32_COMPAT[myKey17] && MBTI_32_COMPAT[myKey17][ptKey17] !== undefined) {
      mbtiRawScore17 = MBTI_32_COMPAT[myKey17][ptKey17];
      if (mySub17 === 'T' && ptSub17 === 'T' && mbtiRawScore17 <= 2) mbtiRawScore17 = Math.max(1, mbtiRawScore17 - 1);
    }
    var mbtiScore17 = SCORE_MAP[mbtiRawScore17] || 74;

    var myProfile17 = myBase17 ? MBTI_PROFILES[myBase17] : null;
    var ptProfile17 = ptBase17 ? MBTI_PROFILES[ptBase17] : null;

    // Score tag info
    var _tagInfo17 = (opts.mbtiEngineReady && result.myMbti && result.ptMbti && result.myMbti !== 'わからない' && result.ptMbti !== 'わからない')
      ? opts.getMbtiInfo(result.myMbti, result.ptMbti) : null;
    var sLabel17, sColor17;
    if (_tagInfo17) {
      var _LEVEL_LABELS = ['相性に差がある', 'まあまあの相性', '良い相性', 'とても相性が良い'];
      var _LEVEL_COLORS = ['rgba(220,80,80,.85)', 'rgba(220,180,60,.85)', 'rgba(100,190,130,.85)', 'rgba(80,140,240,.85)'];
      sLabel17 = _LEVEL_LABELS[_tagInfo17.level] || '─';
      sColor17 = _LEVEL_COLORS[_tagInfo17.level] || 'rgba(180,150,240,.85)';
    }

    // Subtype combo
    var comboKey17 = (mySub17 && ptSub17) ? mySub17 + '-' + ptSub17 : null;
    var combo17 = comboKey17 ? SUBTYPE_COMBO_DESC[comboKey17] : null;

    result.mbtiCompat = {
      myKey: myKey17,
      ptKey: ptKey17,
      myBase: myBase17,
      ptBase: ptBase17,
      mySub: mySub17,
      ptSub: ptSub17,
      mbtiRawScore: mbtiRawScore17,
      mbtiScore: mbtiScore17,
      myProfile: myProfile17,
      ptProfile: ptProfile17,
      tagInfo: _tagInfo17,
      sLabel: sLabel17,
      sColor: sColor17,
      combo: combo17,
      bothMbti: !!(result.myMbti && result.ptMbti),
    };
  } catch (e) {
    console.error('[compatCalcFull] Section 17 error:', e);
  }

  // ══════════════════════════════════════════════════════════════
  //  Section 18: MBTIペア固有テキスト (mbtiPairTexts)
  // ══════════════════════════════════════════════════════════════
  try {
    var mc = result.mbtiCompat || {};
    var pairData18 = null;
    if (mc.myBase && mc.ptBase && MBTI_PAIR_TEXTS_528) {
      var _mk18 = mc.myKey || (mc.myBase + '-A');
      var _pk18 = mc.ptKey || (mc.ptBase + '-A');
      var pairKey32 = _mk18 + '_' + _pk18;
      var pairKeyRev = _pk18 + '_' + _mk18;
      pairData18 = MBTI_PAIR_TEXTS_528[pairKey32] || MBTI_PAIR_TEXTS_528[pairKeyRev];
    }
    result.mbtiPairTexts = pairData18;
  } catch (e) {
    console.error('[compatCalcFull] Section 18 error:', e);
  }

  // ══════════════════════════════════════════════════════════════
  //  Section 19: MBTI 4軸分析 (mbtiAxisAnalysis)
  // ══════════════════════════════════════════════════════════════
  try {
    var mc19 = result.mbtiCompat || {};
    var axes = null;
    if (mc19.myBase && mc19.ptBase && mc19.myBase.length === 4 && mc19.ptBase.length === 4) {
      axes = ['EI', 'NS', 'FT', 'JP'].map(function (axisKey, i) {
        var youChar = mc19.myBase[i];
        var themChar = mc19.ptBase[i];
        var ax = AXIS_LABELS[axisKey];
        var youData = ax[youChar] || { label: youChar, cls: 'same' };
        var themData = ax[themChar] || { label: themChar, cls: 'same' };
        var same = youChar === themChar;
        var descSet = AXIS_DESC[axisKey];
        var desc;
        if (same) desc = descSet['same_' + youChar] || descSet['same_E'] || '';
        else desc = descSet['diff'] || '';
        return {
          axisKey: axisKey,
          youChar: youChar,
          themChar: themChar,
          youData: youData,
          themData: themData,
          same: same,
          matchLabel: same ? 'ぴったり一致' : '補い合う',
          matchCls: same ? 'm' : 'd',
          desc: desc,
        };
      });
    }
    result.mbtiAxisAnalysis = axes;
  } catch (e) {
    console.error('[compatCalcFull] Section 19 error:', e);
  }

  // ══════════════════════════════════════════════════════════════
  //  Section 20: 四柱推命 × MBTI 深化考察 (gogyoMbtiSynthesis)
  // ══════════════════════════════════════════════════════════════
  try {
    var mc20 = result.mbtiCompat || {};
    var myBase20 = mc20.myBase;
    var ptBase20 = mc20.ptBase;
    var myGogyo20 = result.myGogyo;
    var ptGogyo20 = result.ptGogyo;
    var ptName20 = result.ptName;
    var compat_type20 = result.compat_type;

    var myGProf20 = myGogyo20 ? GOGYO_MBTI_PROFILE[myGogyo20] : null;
    var ptGProf20 = ptGogyo20 ? GOGYO_MBTI_PROFILE[ptGogyo20] : null;
    var gogyo_rel20 = compat_type20 || '中和型';
    var relDesc20 = GOGYO_REL_DESC[gogyo_rel20] || 'バランスを保つ';

    // Individual gogyo x MBTI analysis
    var myIsHarmony20 = myGProf20 ? myGProf20.affinity_mbti.indexOf(myBase20) >= 0 : false;
    var ptIsHarmony20 = ptGProf20 ? ptGProf20.affinity_mbti.indexOf(ptBase20) >= 0 : false;

    var youTitle20 = null, youBody20 = null, youGapLabel20 = null, youIsHarmony20 = false;
    if (myGProf20 && myBase20) {
      youIsHarmony20 = myIsHarmony20;
      youTitle20 = myGogyo20 + '（' + myGProf20.core + '） × ' + myBase20;
      youGapLabel20 = youIsHarmony20 ? '✓ 一致型' : '⚡ ギャップ型';
      var youBodyText20 = 'あなたの命式は「' + myGogyo20 + '」の気質——' + myGProf20.drive + 'タイプンダ。';
      if (youIsHarmony20) {
        youBodyText20 += 'MBTIの' + myBase20 + 'はこの気質と自然に一致している。命式とMBTIが同じ方向を向いている「一致型」だから、行動パターンと内面の動機が一貫していて、「自分らしく生きている」という感覚が強くなりやすいんダよ。';
      } else {
        youBodyText20 += 'MBTIの' + myBase20 + 'は命式の気質と異なる方向を向いている「ギャップ型」ンダ。これはあなたの内側（命式の本質）と外側（MBTIの行動スタイル）が違うことを意味していて、自分でも「なぜこう動いてしまうのか」と感じる場面があるかもしれない。だがこのギャップがあなたの複雑な魅力と深みを作っているんダよ。';
      }
      youBody20 = youBodyText20;
    }

    var themTitle20 = null, themBody20 = null, themGapLabel20 = null, themIsHarmony20 = false;
    if (ptGProf20 && ptBase20) {
      themIsHarmony20 = ptIsHarmony20;
      themTitle20 = ptGogyo20 + '（' + ptGProf20.core + '） × ' + ptBase20;
      themGapLabel20 = themIsHarmony20 ? '✓ 一致型' : '⚡ ギャップ型';
      var themBodyText20 = '相手の命式は「' + ptGogyo20 + '」の気質——' + ptGProf20.drive + 'タイプんダ。';
      if (themIsHarmony20) {
        themBodyText20 += 'MBTIの' + ptBase20 + 'もその気質と一致している「一致型」だから、相手は言ってることとやってることが非常に整合している人ンダよ。相手の本質を理解するとき、命式とMBTIのどちらで見ても同じ結論に行き着くはずンダ。';
      } else {
        themBodyText20 += 'MBTIの' + ptBase20 + 'は命式の気質とズレている「ギャップ型」だから、「外から見える相手の印象」と「相手の内側の本音」が違う場面があるんダよ。相手が時々矛盾して見えるとしたら、この2つのギャップが理由かもしれないんダ。';
      }
      themBody20 = themBodyText20;
    }

    // ── 統合鑑定文 ──
    var synthesisText = null;
    if (myBase20 && ptBase20) {
      try {
        // 最強通変星 (topGod) はエンジンが計算済み (calcMeishiki の戻り値)
        // 古い実装は calcCompatDetail 内に _calcTsuhen をローカル定義していたが、
        // 蔵干分野表の重み付けが反映されないため、エンジン側 SSOT に集約済み。
        var myTsuhen = (myCalc && myCalc.topGod) || null;
        var ptTsuhen = (ptCalc && ptCalc.topGod) || null;
        var myKishin20 = myCalc ? (myCalc.kishin || []) : [];
        var ptKishin20 = ptCalc ? (ptCalc.kishin || []) : [];
        var sharedKishin20 = myKishin20.filter(function (g) { return ptKishin20.indexOf(g) >= 0; });

        // MBTI相性タイプマッピング
        var getMbtiCompatType = function (a, b) {
          if (!a || !b) return { label: '─', desc: '─' };
          var aE = a[0] === 'E', bE = b[0] === 'E';
          var aN = a[1] === 'N', bN = b[1] === 'N';
          var aF = a[2] === 'F', bF = b[2] === 'F';
          var aJ = a[3] === 'J', bJ = b[3] === 'J';
          var same_ei = aE === bE, same_nb = aN === bN, same_tf = aF === bF, same_jp = aJ === bJ;
          var score = (same_ei ? 1 : 0) + (same_nb ? 2 : 0) + (same_tf ? 2 : 0) + (same_jp ? 1 : 0);
          if (score >= 5) return { label: '鏡型', desc: '価値観・思考パターンが非常に近い。理解し合いやすい反面、同じ盲点を持つこともある' };
          if (same_nb && same_tf) return { label: '共鳴型', desc: 'ものの見方と判断軸が一致している。深い話で自然に通じ合える関係' };
          if (!same_nb && !same_tf) return { label: '補完型', desc: '視点と判断軸が異なる。お互いの見えていない部分を補い合える関係' };
          if (same_nb && !same_tf) return { label: '共感型', desc: '世界の見方は似ているが、判断の仕方が違う。刺激的で学び合える関係' };
          return { label: '中和型', desc: '共通点と違いがバランス良く混在している。状況に応じて相性が変わる' };
        };

        var mbtiCompat20 = getMbtiCompatType(myBase20, ptBase20);
        var gogyoPositive20 = ['相生型', '比和型'].indexOf(gogyo_rel20) >= 0;
        var mbtiPositive20 = ['鏡型', '共鳴型', '補完型'].indexOf(mbtiCompat20.label) >= 0;

        // MBTIの外見スタイルを詳細に言語化
        var mbtiOuterStyle = function (m) {
          if (!m) return '';
          var ei = m[0] === 'E' ? '外向き・社交的で行動から始める' : '内向き・内省的で考えてから動く';
          var sn = m[1] === 'S' ? '現実・感覚重視でリアルな情報を大切にする' : '直感・未来重視でパターンや可能性を重視する';
          var tf = m[2] === 'F' ? '共感・感情重視で人の気持ちを優先する' : '論理・思考重視で理由と一貫性を重視する';
          var jp = m[3] === 'J' ? '計画的・決断が早い' : '柔軟・即興的で流れに乗る';
          return ei + '、' + sn + '、' + tf + '、' + jp + 'タイプ';
        };

        // 五行×MBTIのギャップを「共感される具体的描写」で言語化
        var describeGap = function (gogyo, mbti, who) {
          if (!gogyo || !mbti) return '';
          var isE = mbti[0] === 'E';
          var isN = mbti[1] === 'N';
          var isF = mbti[2] === 'F';
          var isJ = mbti[3] === 'J';
          var subj = who === 'you' ? 'あなた' : '相手';
          var possessive = who === 'you' ? 'あなたの' : '相手の';

          if (gogyo === '水' && isE) {
            return possessive + '不思議なところは、大人数の場ではいちばん明るく場を盛り上げるのに、2人きりになると急に深くて静かな話をしてくるところンダ。あのテンションはどこへ行った？と思うかもしれないが、どちらも本物——賑やかな場では' + mbti + 'の行動力が出て、信頼できる相手の前では水の命式が持つ深い感受性が出てくるんダよ。';
          }
          if (gogyo === '水' && !isF) {
            return possessive + '不思議なところは、普段はクールで合理的な判断をするのに、ふとした瞬間に相手の感情を誰よりも正確に読んでいることンダ。本人が気づいていないくらい自然に——それが水の命式の深い共感力で、' + mbti + 'の論理的な外見の裏に静かに宿っているんダよ。';
          }
          if (gogyo === '木' && isE) {
            return possessive + '面白いところは、社交的で次々と行動しているように見えて、実はひとりで新しいものを生み出したり、誰も気づいていないことを深く考えている時間を大切にしているところンダ。外の賑やかさと内の創造性、どちらも本物なんダよ。';
          }
          if (gogyo === '木' && !isF) {
            return possessive + '特徴的なのは、感情より事実と論理で話すのに、新しいものや変化に対してだけは誰よりも早く反応するところンダ。クールに見えて実は誰より感性が鋭い——それが木の命式と' + mbti + 'が作り出す独特の組み合わせなんダよ。';
          }
          if (gogyo === '火' && !isE) {
            return possessive + '意外なところは、普段は落ち着いて見えるのに、何か「これだ」と思ったことに対しては突然エンジンがかかって誰より行動が早くなるところンダ。その熱量のギャップに驚いた人もいるんじゃないか——それが' + mbti + 'の静かな外見と、火の命式が持つ内なる情熱のぶつかりなんダよ。';
          }
          if (gogyo === '火' && isF) {
            return possessive + '魅力的なところは、情熱的で行動力があるのに、相手への気遣いや共感も忘れないところンダ。「グイグイ引っ張るのに、気づいたら全員の気持ちを拾っている」——そのバランスは、火の命式と' + mbti + 'が組み合わさった稀なタイプにしか出せないんダよ。';
          }
          if (gogyo === '土' && isN && !isJ) {
            return possessive + '面白いところは、「いつも同じ場所にいてほしい」と思わせる安心感があるのに、話してみると意外と自由で変化を楽しんでいるところンダ。「こんな人だと思ってなかった」と言われることが多いかもしれない——それが土の命式の安定感と' + mbti + 'の柔軟さが生み出す独特の空気なんダよ。';
          }
          if (gogyo === '土' && !isF) {
            return possessive + '特徴的なのは、感情より論理で話すのに、長く付き合えばつき合うほど「この人は絶対に裏切らない」という安心感が増してくるところンダ。それは' + mbti + 'のクールな外見の奥に、土の命式が持つ誠実さと信頼を積み上げる力が静かに動いているからなんダよ。';
          }
          if (gogyo === '金' && isE) {
            return possessive + '意外なところは、社交的でノリが良さそうに見えるのに、「これだけは譲れない」というラインが人より明確にあるところンダ。そこを超えると急に冷たくなったと感じるかもしれないが、それは金の命式が持つ意志の強さが出ているだけで、外向きな' + mbti + 'の顔の裏に揺るがない軸があるんダよ。';
          }
          if (gogyo === '金' && isF) {
            return possessive + '魅力的なのは、人の気持ちに寄り添える優しさを持ちながら、その優しさが媚びやブレとは全く違うところンダ。芯のある優しさ——それが金の命式の意志の強さと' + mbti + 'の共感力が融合した、この人にしかない強みなんダよ。';
          }
          return possessive + '場合、命式（' + gogyo + '）とMBTI（' + mbti + '）が異なる方向を向いているんダ。普段見せる顔と、信頼した相手にだけ見せる顔が違う——そのギャップに気づいた人だけが、この人の本当の深さに触れられるんダよ。';
        };

        var text20 = '';

        // 1. 五行相性の導入
        if (myGogyo20 === ptGogyo20) {
          text20 += '2人とも命式は「' + myGogyo20 + '」——' + myGProf20.core + 'を持つ気質で、五行的には「' + gogyo_rel20 + '（' + relDesc20 + '）」の関係ンダ。同じ気質同士だから、お互いの「深さ」や「動き方」を直感的に感じ取れる稀な縁ンダよ。';
        } else {
          text20 += '2人の命式は「' + myGogyo20 + '」と「' + ptGogyo20 + '」——五行的には「' + gogyo_rel20 + '（' + relDesc20 + '）」の関係ンダ。';
          if (gogyoPositive20) {
            text20 += 'エネルギーが自然に引き合う組み合わせンダよ。';
          } else {
            text20 += 'ぶつかる部分もあるが、それが刺激になって互いを高め合う関係ンダよ。';
          }
        }

        // 2. 命式×MBTI気質の一致/ギャップ
        if (myIsHarmony20 && ptIsHarmony20) {
          text20 += ' 2人とも命式とMBTIが同じ方向を向いている「一致型」ンダ。あなたは' + myGogyo20 + '（' + myGProf20.core + '）の命式とMBTI（' + myBase20 + '）が一致していて、相手も' + ptGogyo20 + 'の命式とMBTI（' + ptBase20 + '）が一致している。内面と行動がズレていない者同士だから、お互いに「この人は本物だ」という感覚を持ちやすく、言葉にしなくても伝わる部分が多い関係ンダよ。';
        } else if (myIsHarmony20 && !ptIsHarmony20) {
          text20 += ' あなたは' + myGogyo20 + 'の命式とMBTI（' + myBase20 + '）が一致している「一致型」で、内面と行動が読みやすいんダ。一方で相手の' + ptGogyo20 + 'の命式とMBTI（' + ptBase20 + '）の間にはギャップがあるんダ。' + describeGap(ptGogyo20, ptBase20, 'them') + '';
        } else if (!myIsHarmony20 && ptIsHarmony20) {
          text20 += ' ' + describeGap(myGogyo20, myBase20, 'you') + ' 一方で相手は' + ptGogyo20 + 'の命式とMBTI（' + ptBase20 + '）が一致している「一致型」。相手はわかりやすく、あなたのほうが相手を読みやすい立場になりやすいんダよ。自分の内側と外側のギャップを意識することで、むしろこの関係で自分の深みを活かせるんダ。';
        } else {
          text20 += ' 2人ともそれぞれ命式とMBTIの間にギャップを持っているんダ。' + describeGap(myGogyo20, myBase20, 'you') + ' そして相手も同じく——' + describeGap(ptGogyo20, ptBase20, 'them') + ' お互いの「外から見える姿」と「内側の本音」が違う部分があるからこそ、表面的な付き合いだけでは本質が見えにくい。時間をかけて深く知り合えた先に、互いの本当の姿が見えてくる稀な関係ンダよ。';
        }

        // 3. 通変星×MBTI
        if (myTsuhen && ptTsuhen) {
          var TSUHEN_FAM = [['比肩', '劫財'], ['食神', '傷官'], ['偏財', '正財'], ['偏官', '正官'], ['偏印', '正印']];
          var sameFam = TSUHEN_FAM.some(function (g) { return g.indexOf(myTsuhen) >= 0 && g.indexOf(ptTsuhen) >= 0; });
          if (sameFam) {
            text20 += ' 最強通変星はあなたが「' + myTsuhen + '」・相手が「' + ptTsuhen + '」で同じ系統ンダ。行動の動機が似ているから、「なぜそう動くか」が言わなくても伝わる関係になりやすいんダよ。';
          } else {
            text20 += ' 最強通変星はあなたが「' + myTsuhen + '」・相手が「' + ptTsuhen + '」で異なる系統ンダ。動機の方向が違うから、相手の行動に「なぜ？」と感じることもあるかもしれないが、お互いが持っていないものを持ち合える補完関係にもなりやすいんダ。';
          }
        }

        // 4. 喜神×環境
        if (sharedKishin20.length > 0) {
          text20 += ' 喜神が「' + sharedKishin20.join('・') + '」で2人一致しているから、この五行が強まる時期や場所が2人同時に追い風になるんダよ。一緒に動くなら、この流れが来ているときを狙うといいンダ。';
        } else if (myKishin20.length > 0 && ptKishin20.length > 0) {
          text20 += ' 2人の喜神が異なる（あなた:' + myKishin20.join('・') + '、相手:' + ptKishin20.join('・') + '）から、追い風のタイミングがずれることもある。どちらかが低調なとき、もう一方がサポートできる理想的な補完関係ンダよ。';
        }

        // 5. 総合締め
        if (gogyoPositive20 && mbtiPositive20) {
          text20 += ' 命式（' + gogyo_rel20 + '）もMBTI（' + mbtiCompat20.label + '）も両方の相性が良好なんダ。この組み合わせは出会う確率自体が低い、本物の縁の可能性が高いんダよ🐼';
        } else if (gogyoPositive20 && !mbtiPositive20) {
          text20 += ' 命式のエネルギーは引き合っているが、コミュニケーションのスタイルに工夫が必要な組み合わせンダ。「伝え方の違い」を意識するだけで、グッと深まる関係ンダよ🐼';
        } else if (!gogyoPositive20 && mbtiPositive20) {
          text20 += ' 話は合いやすいがエネルギーのぶつかりがある「成長型」の縁ンダ。摩擦を乗り越えた先に深い絆が生まれるんダよ🐼';
        } else {
          text20 += ' 特別な吉縁でも強い摩擦でもない、ゼロから関係を育てられる自由度の高い組み合わせンダ。どう育てるかがこの縁の鍵ンダよ🐼';
        }

        synthesisText = text20;
      } catch (e2) {
        console.warn('[compatCalcFull] Synthesis error:', e2);
      }
    }

    // ── Phase 1+2: セクション Object + 流年 + トップレベル meta ──
    var synthSections20 = {};
    var synthMeta20 = null;
    try {
      synthSections20 = _buildSynthesisSections({
        myCalc: myCalc,
        ptCalc: ptCalc,
        myBase: myBase20,
        ptBase: ptBase20,
        myMbtiFull: (myInput && myInput.mbti) || (myCalc && myCalc.mbti) || myBase20,
        ptMbtiFull: (partner && partner.mbti) || (ptCalc && ptCalc.mbti) || ptBase20,
        myGogyo: myGogyo20,
        ptGogyo: ptGogyo20,
        gogyoRel: gogyo_rel20,
        mbtiCompatLabel: (myBase20 && ptBase20)
          ? (function(){
              try { return _getMbtiCompatType(myBase20, ptBase20).label; }
              catch(e){ return null; }
            })()
          : null,
      });
      synthMeta20 = _buildSynthesisMeta(synthSections20);
      // トップレベルの result に mbtiCompatLabel を露出(AI プロンプト送信用)
      try {
        result.mbtiCompatLabel = (myBase20 && ptBase20)
          ? _getMbtiCompatType(myBase20, ptBase20).label
          : null;
      } catch(_){ result.mbtiCompatLabel = null; }
    } catch (eSect) {
      console.warn('[compatCalcFull] _buildSynthesisSections error:', eSect);
      synthSections20 = {};
      synthMeta20 = null;
    }

    // ⚠ Synthesis から annualFortune を切り離したため、旧 synthesisText への
    //    流年要約追記もコメントアウト。将来「独立セクション/タブ」で復活する際は
    //    ここではなく独立 UI 側で表示する。
    /*
    if (synthesisText && synthSections20.annualFortune && synthSections20.annualFortune.body) {
      synthesisText = synthesisText + '\n\n' + '【これから巡る運勢期】\n' + synthSections20.annualFortune.body;
    }
    */

    result.gogyoMbtiSynthesis = {
      myGProf: myGProf20,
      ptGProf: ptGProf20,
      gogyo_rel: gogyo_rel20,
      relDesc: relDesc20,
      youTitle: youTitle20,
      youBody: youBody20,
      youGapLabel: youGapLabel20,
      youIsHarmony: youIsHarmony20,
      themTitle: themTitle20,
      themBody: themBody20,
      themGapLabel: themGapLabel20,
      themIsHarmony: themIsHarmony20,
      // 後方互換: 既存の synthesisText (1本の文字列) を維持＋annualFortune 段落を追加
      synthesisText: synthesisText,
      // Phase 1+2 (4a 適用後): セクション Object 形式 (8セクション: self/partner/fiveElement/twelveStage/topGodPair/kishin/specialStar/conclusion)
      // ※ annualFortune は将来の独立セクション実装まで切り離し中
      sections: synthSections20,
      // Phase 2: トップレベル meta (UI バッジ等のショートカット)
      meta: synthMeta20,
    };
  } catch (e) {
    console.error('[compatCalcFull] Section 20 error:', e);
  }

  // ══════════════════════════════════════════════════════════════
  //  Section 21: 空亡（くうぼう）相性判定
  // ══════════════════════════════════════════════════════════════
  try {
    var myYearShi21 = myCalc.pillars.year.shi;
    var ptYearShi21 = ptCalc.pillars.year.shi;
    var myKuubou21 = Array.isArray(myCalc.kuubou) ? myCalc.kuubou : [];
    var ptKuubou21 = Array.isArray(ptCalc.kuubou) ? ptCalc.kuubou : [];

    // 互換空亡（最優先・最も稀）: 互いが相手の空亡の年に生まれている
    var isGokanKuubou = myKuubou21.length >= 2 && ptKuubou21.length >= 2
      && myKuubou21.indexOf(ptYearShi21) >= 0
      && ptKuubou21.indexOf(myYearShi21) >= 0;

    // 片空亡: 片方だけ空亡の年に生まれている
    var isKataKuubou = !isGokanKuubou && (
      (myKuubou21.indexOf(ptYearShi21) >= 0)
      || (ptKuubou21.indexOf(myYearShi21) >= 0)
    );

    // 同一空亡: 同じ空亡を持つ者同士
    var isDoubleKuubou = !isGokanKuubou
      && myKuubou21.length >= 1 && ptKuubou21.length >= 1
      && myKuubou21[0] === ptKuubou21[0];

    var kuubouType = isGokanKuubou ? '互換空亡'
      : isKataKuubou ? '片空亡'
      : isDoubleKuubou ? '同一空亡'
      : 'なし';

    var kuubouDesc = '';
    if (isGokanKuubou) {
      kuubouDesc = '2人は「互換空亡」——非常に稀な縁の組み合わせんダ。お互いが相手の空亡の年に生まれているという不思議な縁で、大吉か大凶かどちらに転ぶかわからない極端な相性んダよ。この2人が惹かれ合うとき、それは運命的な意味を持っている可能性が高い。ただし関係が悪化した場合のダメージも大きいから、丁寧に関係を育てることが大切んダ🐼';
    } else if (isKataKuubou) {
      kuubouDesc = '2人は「片空亡」の関係んダ。空亡の年に相手が生まれているという縁で、純粋な恋愛や友情ではうまくいきやすいが、一緒に仕事をしたりお金が絡む場面では肝心なときに助けになりにくいことがあるんダよ。感情だけで大きな決断をするのは慎重にしてほしいんダ🐼';
    } else if (isDoubleKuubou) {
      kuubouDesc = '2人は「同一空亡」——同じ空亡を持つ者同士んダ。一緒にいて違和感がなく、バイオリズムが似ているから「なんかこの人と話しやすい」という感覚が自然に生まれるんダよ。ただしいい時も悪い時も同時に来やすいから、2人同時に低調になると共倒れになりやすいんダ。意識的に外からのサポートを求めることが大切んダよ🐼';
    } else {
      kuubouDesc = '2人の空亡に特別な関係は見当たらないんダ。空亡による特別な引力も反発もない、安定した縁んダよ🐼';
    }

    result.kuubouCompat = {
      myKuubou: myKuubou21,
      ptKuubou: ptKuubou21,
      myKuubouType: myCalc.kuubouType || '',
      ptKuubouType: ptCalc.kuubouType || '',
      type: kuubouType,          // '互換空亡' | '片空亡' | '同一空亡' | 'なし'
      isGokanKuubou: isGokanKuubou,
      isKataKuubou: isKataKuubou,
      isDoubleKuubou: isDoubleKuubou,
      desc: kuubouDesc,
    };
  } catch (e) {
    console.error('[compatCalcFull] Section 21 error:', e);
  }

  return result;
}
