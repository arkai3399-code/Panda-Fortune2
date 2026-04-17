// ══════════════════════════════════════════════════════════════
//  PANDA FORTUNE — 相性スコア計算ロジック
//  元HTML 3704-3845行。
//
//  元実装の依存:
//    - window._MEISHIKI_CALC    → 呼び出し側で calc を渡す形に変更
//    - window._calcMeishiki     → import した calcMeishiki に置換
//    - window.MBTI_ENGINE_READY → 不要（常にエンジンを使う）
//    - window.calcMbtiScore     → import した calcMbtiScore に置換
// ══════════════════════════════════════════════════════════════

import { calcMeishiki } from '../engines/meishikiEngine.js';
import { calcMbtiScore } from '../engines/mbtiEngine.js';
import { KOKU_MAP } from '../data/mbtiNames.js';

const JIKKAN_F  = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const JUNISHI_F = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const GOGYO_F   = ['木','木','火','火','土','土','金','金','水','水'];
const SEI_F     = { 木:'火', 火:'土', 土:'金', 金:'水', 水:'木' };
const KOKU_F    = { 木:'土', 火:'金', 土:'水', 金:'木', 水:'火' };
const SHIGOU_F  = { 子:'丑', 丑:'子', 寅:'亥', 亥:'寅', 卯:'戌', 戌:'卯', 辰:'酉', 酉:'辰', 巳:'申', 申:'巳', 午:'未', 未:'午' };
const ROKUCHUU_F = { 子:'午', 午:'子', 丑:'未', 未:'丑', 寅:'申', 申:'寅', 卯:'酉', 酉:'卯', 辰:'戌', 戌:'辰', 巳:'亥', 亥:'巳' };
const KANGO_F = { 甲:'己', 己:'甲', 乙:'庚', 庚:'乙', 丙:'辛', 辛:'丙', 丁:'壬', 壬:'丁', 戊:'癸', 癸:'戊' };

/**
 * 完全相性スコア計算（React内でリアルタイム実行）。
 * 元HTML 3704-3831行 calcFullCompatScore。
 *
 * @param {Object} partner - パートナー入力（CompatTabのEMPTY_PARTNER形式）
 * @param {Object} myCalc  - 自分の calcMeishiki 結果。必須。
 * @returns {Object|null}  - 相性スコア情報。失敗時は null
 */
export function calcFullCompatScore(partner, myCalc) {
  try {
    if (!myCalc || !partner) return null;

    // 相手の命式を計算
    const genderMap = { '女性': 'f', '男性': 'm', 'その他': 'x' };
    const ptHourRaw = partner.hour !== undefined
      ? partner.hour
      : (partner.hourInput !== undefined ? partner.hourInput : 'わからない');
    let ptHourInput = -1;
    if (ptHourRaw in KOKU_MAP) {
      ptHourInput = KOKU_MAP[ptHourRaw];
    } else {
      const parsed = Number(ptHourRaw);
      ptHourInput = isNaN(parsed) ? -1 : parsed;
    }
    const ptCalc = calcMeishiki({
      year:      parseInt(partner.year)  || 0,
      month:     parseInt(partner.month) || 0,
      day:       parseInt(partner.day)   || 0,
      hourInput: ptHourInput,
      gender:    genderMap[partner.gender] || partner.gender || 'f',
      longitude: partner.longitude !== undefined ? Number(partner.longitude) : 135,
      mbti:      partner.mbti || '',
    });

    // ① 五行相性（日主）
    const myG = myCalc.pillars?.day?.kan ? (GOGYO_F[JIKKAN_F.indexOf(myCalc.pillars.day.kan)] || '水') : '水';
    const ptG = ptCalc.pillars?.day?.kan ? (GOGYO_F[JIKKAN_F.indexOf(ptCalc.pillars.day.kan)] || '木') : '木';
    let baseScore = 65;
    if (SEI_F[myG] === ptG || SEI_F[ptG] === myG) baseScore = 82;
    else if (myG === ptG)                          baseScore = 72;
    else if (KOKU_F[myG] === ptG || KOKU_F[ptG] === myG) baseScore = 52;
    let score_gogyo = baseScore;

    // ② 日柱相性
    let score_day = baseScore;
    const myDS = myCalc.pillars?.day?.shi, ptDS = ptCalc.pillars?.day?.shi;
    const myDK = myCalc.pillars?.day?.kan, ptDK = ptCalc.pillars?.day?.kan;
    if (myDS && ptDS) {
      if (SHIGOU_F[myDS] === ptDS) score_day = Math.min(99, score_day + 10);
      else if (ROKUCHUU_F[myDS] === ptDS) score_day = Math.max(20, score_day - 12);
    }
    if (myDK && ptDK && KANGO_F[myDK] === ptDK) score_day = Math.min(99, score_day + 8);

    // ③ 月柱相性
    let score_month = baseScore;
    const myMS = myCalc.pillars?.month?.shi, ptMS = ptCalc.pillars?.month?.shi;
    const myMK = myCalc.pillars?.month?.kan, ptMK = ptCalc.pillars?.month?.kan;
    if (myMS && ptMS) {
      if (SHIGOU_F[myMS] === ptMS) score_month = Math.min(99, score_month + 10);
      else if (ROKUCHUU_F[myMS] === ptMS) score_month = Math.max(20, score_month - 10);
    }
    if (myMK && ptMK && KANGO_F[myMK] === ptMK) score_month = Math.min(99, score_month + 6);
    if (SEI_F[myG] === ptG || SEI_F[ptG] === myG) score_month = Math.min(99, score_month + 5);

    // ④ 年柱相性
    let score_year = baseScore;
    const myYK = myCalc.pillars?.year?.kan, ptYK = ptCalc.pillars?.year?.kan;
    const myYG = myYK ? GOGYO_F[JIKKAN_F.indexOf(myYK)] : null;
    const ptYG = ptYK ? GOGYO_F[JIKKAN_F.indexOf(ptYK)] : null;
    if (myYG && ptYG) {
      if (SEI_F[myYG] === ptYG || SEI_F[ptYG] === myYG) score_year = Math.min(99, score_year + 8);
      else if (myYG === ptYG) score_year = Math.min(99, score_year + 3);
    }
    const myYS = myCalc.pillars?.year?.shi, ptYS = ptCalc.pillars?.year?.shi;
    if (myYS && ptYS && SHIGOU_F[myYS] === ptYS) score_year = Math.min(99, score_year + 5);

    // ⑤ 時柱相性
    let score_hour = baseScore;
    const myHS = myCalc.pillars?.hour?.shi, ptHS = ptCalc.pillars?.hour?.shi;
    if (myHS && ptHS) {
      if (SHIGOU_F[myHS] === ptHS) score_hour = Math.min(99, score_hour + 8);
      else if (ROKUCHUU_F[myHS] === ptHS) score_hour = Math.max(20, score_hour - 8);
    }

    const birthCompatScore = Math.max(20, Math.min(99, Math.round(
      score_gogyo * 0.35 + score_day * 0.25 + score_month * 0.20 + score_year * 0.10 + score_hour * 0.10
    )));

    // ⑥ 引き合う力（支合・干合）
    const hasShigou  = myDS && SHIGOU_F[myDS] === ptDS;
    const hasKango   = myDK && KANGO_F[myDK] === ptDK;
    const hasMShigou = myMS && SHIGOU_F[myMS] === ptMS;
    let hikiai = baseScore;
    if (hasShigou)  hikiai = Math.min(99, hikiai + 18);
    if (hasKango)   hikiai = Math.min(99, hikiai + 12);
    if (hasMShigou) hikiai = Math.min(99, hikiai + 6);
    hikiai = Math.max(20, Math.min(99, hikiai));

    // ⑦ MBTI相性
    let mbtiScore = 70;
    const myMbti = myCalc.mbti || myCalc.input?.mbti || '';
    const ptMbti = partner.mbti || '';
    if (myMbti && ptMbti && myMbti !== 'わからない' && ptMbti !== 'わからない') {
      mbtiScore = calcMbtiScore(myMbti, ptMbti);
    }

    // ⑧ 総合スコア（正規化後の加重平均）
    const normalizeScore = (val, vmin, vmax) =>
      Math.max(0, Math.min(100, ((val - vmin) / (vmax - vmin)) * 100));
    const bcs_n = normalizeScore(birthCompatScore, 55, 95);
    const hik_n = normalizeScore(hikiai, 20, 99);
    const mbt_n = normalizeScore(mbtiScore, 48, 95);
    const total = Math.round(bcs_n * 0.60 + hik_n * 0.25 + mbt_n * 0.15);
    const loveScore = Math.min(99, Math.round(bcs_n * 0.60 + hik_n * 0.25 + mbt_n * 0.15 + (hasShigou ? 8 : 0)));
    const compatType = SEI_F[myG] === ptG ? '相生型'
      : SEI_F[ptG] === myG ? '相生型'
      : myG === ptG ? '比和型'
      : (KOKU_F[myG] === ptG || KOKU_F[ptG] === myG) ? '相剋型'
      : '中和型';
    const typeLabel = total >= 88 ? '特別な縁'
      : total >= 80 ? '深い相性'
      : total >= 70 ? 'よい相性'
      : total >= 60 ? '補い合える'
      : '刺激し合う';

    return {
      total, birthCompatScore, hikiai, mbtiScore, loveScore,
      compatType, typeLabel, hasShigou, hasKango, myG, ptG,
    };
  } catch (e) {
    return null;
  }
}

/**
 * 簡易相性スコア計算（日主の天干 index のみで判定）。
 * 元HTML 3833-3845行 calcCompatScore。
 * @param {number} myKanIdx
 * @param {number} partnerKanIdx
 */
export function calcCompatScore(myKanIdx, partnerKanIdx) {
  // 日主同士の五行相性マトリクス（水=8,9 金=6,7 木=0,1 火=2,3 土=4,5）
  const gogyoOf = (i) => i <= 1 ? '木' : i <= 3 ? '火' : i <= 5 ? '土' : i <= 7 ? '金' : '水';
  const myG = gogyoOf(myKanIdx % 10);
  const ptG = gogyoOf(partnerKanIdx % 10);
  const SEI  = { 木:'水', 火:'木', 土:'火', 金:'土', 水:'金' };
  const KOKU = { 木:'土', 火:'金', 土:'水', 金:'木', 水:'火' };

  if (SEI[myG] === ptG || SEI[ptG] === myG) {
    return {
      total: 85,
      base:  '相生',
      desc:  'お互いを自然に引き出し合える組み合わせンダ。エネルギーが循環して、一緒にいるほど成長できる関係ンダよ。',
    };
  }
  if (myG === ptG) {
    return {
      total: 78,
      base:  '比和',
      desc:  '同じ気質同士ンダ。価値観が近くて居心地がいい反面、同じ弱点も共有しやすいんダよ。',
    };
  }
  if (KOKU[myG] === ptG) {
    return {
      total: 58,
      base:  '相剋',
      desc:  'エネルギーの方向性がぶつかりやすい組み合わせンダ。摩擦があるぶん、お互いを鍛え合う関係にもなれるんダよ。',
    };
  }
  return {
    total: 68,
    base:  '中和',
    desc:  '際立った相性の強さも弱さもない、バランス型の組み合わせンダ。お互いの努力次第でいくらでも深まれるんダよ。',
  };
}
