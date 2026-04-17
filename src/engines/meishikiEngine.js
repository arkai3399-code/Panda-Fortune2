// ══════════════════════════════════════════════════════════════
//  PANDA FORTUNE — 四柱推命計算エンジン
//  高島暦準拠・定気法・日柱切り替え0時
//  提供ロジック (meishiki-engine.js) に基づき再実装
// ══════════════════════════════════════════════════════════════

// ── 基礎テーブル ────────────────────────────────────────────
export const JIKKAN         = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
export const JUNISHI        = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
export const JIKKAN_GOGYO   = ['木','木','火','火','土','土','金','金','水','水'];
export const JUNISHI_GOGYO  = ['水','土','木','木','土','火','火','土','金','金','土','水'];

const _SEI  = { 木:'火', 火:'土', 土:'金', 金:'水', 水:'木' };
const _KOKU = { 木:'土', 火:'金', 土:'水', 金:'木', 水:'火' };

const _ZOKAN = {
  子:['壬','癸'], 丑:['己','癸','辛'], 寅:['甲','丙','戊'], 卯:['乙'],
  辰:['戊','乙','癸'], 巳:['丙','庚','戊'], 午:['丁','己'], 未:['己','丁','乙'],
  申:['庚','壬','戊'], 酉:['辛'], 戌:['戊','辛','丁'], 亥:['壬','甲'],
};

// 十二運星テーブル [日干][地支index]
const _JUNIU_TBL = {
  甲:['沐浴','冠帯','建禄','帝旺','衰','病','死','墓','絶','胎','養','長生'],
  乙:['病','衰','帝旺','建禄','冠帯','沐浴','長生','養','胎','絶','墓','死'],
  丙:['胎','養','長生','沐浴','冠帯','建禄','帝旺','衰','病','死','墓','絶'],
  丁:['絶','墓','死','病','衰','帝旺','建禄','冠帯','沐浴','長生','養','胎'],
  戊:['胎','養','長生','沐浴','冠帯','建禄','帝旺','衰','病','死','墓','絶'],
  己:['絶','墓','死','病','衰','帝旺','建禄','冠帯','沐浴','長生','養','胎'],
  庚:['死','墓','絶','胎','養','長生','沐浴','冠帯','建禄','帝旺','衰','病'],
  辛:['長生','養','胎','絶','墓','死','病','衰','帝旺','建禄','冠帯','沐浴'],
  壬:['建禄','衰','病','死','墓','絶','胎','養','長生','沐浴','冠帯','帝旺'],
  癸:['帝旺','建禄','冠帯','沐浴','長生','養','胎','絶','墓','死','病','衰'],
};

// 月柱天干テーブル（五虎遁）[年干][月支step 0=寅月…11=丑月]
const _GOKORTON = {
  甲:['丙','丁','戊','己','庚','辛','壬','癸','甲','乙','丙','丁'],
  己:['丙','丁','戊','己','庚','辛','壬','癸','甲','乙','丙','丁'],
  乙:['戊','己','庚','辛','壬','癸','甲','乙','丙','丁','戊','己'],
  庚:['戊','己','庚','辛','壬','癸','甲','乙','丙','丁','戊','己'],
  丙:['庚','辛','壬','癸','甲','乙','丙','丁','戊','己','庚','辛'],
  辛:['庚','辛','壬','癸','甲','乙','丙','丁','戊','己','庚','辛'],
  丁:['壬','癸','甲','乙','丙','丁','戊','己','庚','辛','壬','癸'],
  壬:['壬','癸','甲','乙','丙','丁','戊','己','庚','辛','壬','癸'],
  戊:['甲','乙','丙','丁','戊','己','庚','辛','壬','癸','甲','乙'],
  癸:['甲','乙','丙','丁','戊','己','庚','辛','壬','癸','甲','乙'],
};

// 時柱天干テーブル（五鼠遁）[日干][時支index]
const _GORATON = {
  甲:['甲','乙','丙','丁','戊','己','庚','辛','壬','癸','甲','乙'],
  己:['甲','乙','丙','丁','戊','己','庚','辛','壬','癸','甲','乙'],
  乙:['丙','丁','戊','己','庚','辛','壬','癸','甲','乙','丙','丁'],
  庚:['丙','丁','戊','己','庚','辛','壬','癸','甲','乙','丙','丁'],
  丙:['戊','己','庚','辛','壬','癸','甲','乙','丙','丁','戊','己'],
  辛:['戊','己','庚','辛','壬','癸','甲','乙','丙','丁','戊','己'],
  丁:['庚','辛','壬','癸','甲','乙','丙','丁','戊','己','庚','辛'],
  壬:['庚','辛','壬','癸','甲','乙','丙','丁','戊','己','庚','辛'],
  戊:['壬','癸','甲','乙','丙','丁','戊','己','庚','辛','壬','癸'],
  癸:['壬','癸','甲','乙','丙','丁','戊','己','庚','辛','壬','癸'],
};

const _TENICHI = {
  甲:['丑','未'], 戊:['丑','未'], 庚:['丑','未'],
  乙:['子','申'], 己:['子','申'],
  丙:['亥','酉'], 丁:['亥','酉'],
  辛:['寅','午'],
  壬:['卯','巳'], 癸:['卯','巳'],
};
const _BUNCHOU = { 甲:'巳',乙:'午',丙:'申',丁:'酉',戊:'申',己:'酉',庚:'亥',辛:'子',壬:'寅',癸:'卯' };
const _KOUYEN  = { 甲:'午',乙:'午',丙:'寅',丁:'未',戊:'辰',己:'辰',庚:'戌',辛:'酉',壬:'子',癸:'申' };

// ── 都道府県→経度マップ ─────────────────────────────────────
export const PLACE_LON = {
  '北海道':141.35,'青森県':140.74,'岩手県':141.15,'宮城県':140.87,'秋田県':140.10,
  '山形県':140.36,'福島県':140.47,'茨城県':140.45,'栃木県':139.88,'群馬県':139.06,
  '埼玉県':139.65,'千葉県':140.12,'東京都':139.76,'神奈川県':139.64,'新潟県':139.02,
  '富山県':137.21,'石川県':136.63,'福井県':136.22,'山梨県':138.57,'長野県':138.19,
  '岐阜県':136.72,'静岡県':138.38,'愛知県':136.91,'三重県':136.51,'滋賀県':136.01,
  '京都府':135.77,'大阪府':135.52,'兵庫県':135.18,'奈良県':135.83,'和歌山県':135.17,
  '鳥取県':134.24,'島根県':133.05,'岡山県':133.93,'広島県':132.46,'山口県':131.47,
  '徳島県':134.56,'香川県':134.05,'愛媛県':132.77,'高知県':133.55,'福岡県':130.42,
  '佐賀県':130.30,'長崎県':129.87,'熊本県':130.74,'大分県':131.61,'宮崎県':131.42,
  '鹿児島県':130.56,'沖縄県':127.68,
};

// ── 計算ヘルパー ────────────────────────────────────────────
function _dateToJD(y, m, d, h) {
  if (h === undefined) h = 12;
  if (m <= 2) { y--; m += 12; }
  const A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + h / 24 + B - 1524.5;
}

function _getSolarLon(jd) {
  const T = (jd - 2451545) / 36525;
  let L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T; L0 = ((L0 % 360) + 360) % 360;
  let M  = 357.52911 + 35999.05029 * T - 0.0001537 * T * T; M  = ((M  % 360) + 360) % 360;
  const Mr = M * Math.PI / 180;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mr)
          + (0.019993 - 0.000101 * T) * Math.sin(2 * Mr)
          + 0.000289 * Math.sin(3 * Mr);
  const sl = L0 + C, om = 125.04 - 1934.136 * T;
  return (((sl - 0.00569 - 0.00478 * Math.sin(om * Math.PI / 180)) % 360) + 360) % 360;
}

function _dateToJDN(y, m, d) {
  if (m <= 2) { y--; m += 12; }
  const A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524;
}

// ── 各柱計算 ─────────────────────────────────────────────────

// 日柱: 0時切り替え（カレンダー日付をそのまま使用）
function _calcDayPillar(date) {
  const y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate();
  const diff = _dateToJDN(y, m, d) - 2415021;
  const ki = ((diff % 10) + 10) % 10, si = ((diff + 10) % 12 + 12) % 12;
  return { kan: JIKKAN[ki], shi: JUNISHI[si], kanIdx: ki, shiIdx: si };
}

// 年柱: 定気法（立春=黄経315°で切り替え）
function _calcYearPillar(y, m, d, hUTC) {
  const sl = _getSolarLon(_dateToJD(y, m, d, hUTC));
  let yAdj = y;
  if (m === 1 || (m === 2 && sl < 315)) yAdj--;
  const ki = ((yAdj - 4) % 10 + 10) % 10, si = ((yAdj - 4) % 12 + 12) % 12;
  return { kan: JIKKAN[ki], shi: JUNISHI[si], kanIdx: ki, shiIdx: si };
}

// 月柱: 定気法
// ★修正: GOKORTON は 0=寅月 の index → step をそのまま使用
//        月支の JUNISHI index には (step+2)%12 を使用（別変数に分離）
function _calcMonthPillar(y, m, d, hUTC, yKan) {
  const sl = _getSolarLon(_dateToJD(y, m, d, hUTC));
  const step = Math.floor(((sl - 315 + 360) % 360) / 30); // 0=寅月, 1=卯月...
  const shiIdx = (step + 2) % 12;                          // JUNISHI index (2=寅, 3=卯...)
  const monthKans = _GOKORTON[yKan];
  const kanIdx = JIKKAN.indexOf(monthKans[step]);          // GOKORTONはstepで引く
  return { kan: JIKKAN[kanIdx], shi: JUNISHI[shiIdx], kanIdx, shiIdx };
}

// 時柱
function _calcHourPillar(hourInput, dayKan) {
  if (hourInput < 0) return null;
  const shiIdx = Math.floor((hourInput + 1) / 2) % 12;
  const kanIdx = JIKKAN.indexOf(_GORATON[dayKan][shiIdx]);
  return { kan: JIKKAN[kanIdx], shi: JUNISHI[shiIdx], kanIdx, shiIdx };
}

// ── 十神・十二運星 ───────────────────────────────────────────
function _getJisshin(niIdx, tiIdx) {
  const ng = JIKKAN_GOGYO[niIdx], tg = JIKKAN_GOGYO[tiIdx], s = (niIdx % 2) === (tiIdx % 2);
  if (ng === tg) return s ? '比肩' : '劫財';
  if (_SEI[ng]  === tg) return s ? '食神' : '傷官';
  if (_KOKU[ng] === tg) return s ? '偏財' : '正財';
  if (_SEI[tg]  === ng) return s ? '偏官' : '正官';
  if (_KOKU[tg] === ng) return s ? '偏印' : '正印';
  return '比肩';
}

export function _getJuniunsei(nKan, shiIdx) {
  return (_JUNIU_TBL[nKan] && _JUNIU_TBL[nKan][shiIdx]) || '不明';
}

// ── 五行バランス ─────────────────────────────────────────────
function _calcGokyo(pillarsArr) {
  const sc = { 木:0, 火:0, 土:0, 金:0, 水:0 };
  for (const p of pillarsArr) {
    sc[JIKKAN_GOGYO[p.kanIdx]] += 1;
    sc[JUNISHI_GOGYO[p.shiIdx]] += 1;
    const zk = _ZOKAN[JUNISHI[p.shiIdx]] || [];
    if (zk[0]) sc[JIKKAN_GOGYO[JIKKAN.indexOf(zk[0])]] += 0.5;
    if (zk[1]) sc[JIKKAN_GOGYO[JIKKAN.indexOf(zk[1])]] += 0.3;
    if (zk[2]) sc[JIKKAN_GOGYO[JIKKAN.indexOf(zk[2])]] += 0.2;
  }
  return {
    木: Math.round(sc['木'] * 10) / 10,
    火: Math.round(sc['火'] * 10) / 10,
    土: Math.round(sc['土'] * 10) / 10,
    金: Math.round(sc['金'] * 10) / 10,
    水: Math.round(sc['水'] * 10) / 10,
  };
}

// ── 格局・喜忌神 ─────────────────────────────────────────────
function _calcKakukyoku(gokyo, nKan) {
  const dg = JIKKAN_GOGYO[JIKKAN.indexOf(nKan)];
  const tot = Object.values(gokyo).reduce((a, b) => a + b, 0);
  const r = gokyo[dg] / tot;
  const SEI_REV  = { 木:'水', 火:'木', 土:'火', 金:'土', 水:'金' };
  const KOKU_REV = { 木:'金', 火:'水', 土:'木', 金:'火', 水:'土' };
  const kG = KOKU_REV[dg];
  if (r >= 0.45 && gokyo[kG] <= 1.0) {
    return {
      name: `従旺格（${dg}旺）`,
      kishin: [...new Set([dg, SEI_REV[dg]])],
      kijin:  [...new Set([kG, SEI_REV[kG]])],
    };
  }
  return {
    name: '普通格局',
    kishin: [...new Set([SEI_REV[dg], dg])],
    kijin:  [...new Set([kG, SEI_REV[kG]])],
  };
}

// ── 特殊星 ───────────────────────────────────────────────────
function _calcTokuseiboshi(nKan, allShis) {
  const s = [];
  if (_TENICHI[nKan] && _TENICHI[nKan].some(x => allShis.includes(x))) s.push('天乙貴人');
  if (allShis.includes(_BUNCHOU[nKan])) s.push('文昌星');
  if (allShis.includes(_KOUYEN[nKan]))  s.push('紅艷星');
  return s;
}

// ── 大運計算 ─────────────────────────────────────────────────
function _calcDaiunList(mKi, mSi, yKan, gender) {
  const iny = JIKKAN.indexOf(yKan) % 2 === 0 ? '+' : '-';
  const fwd = (gender === 'm' && iny === '+') || (gender === 'f' && iny === '-');
  return Array.from({ length: 8 }, (_, i) => {
    const o = fwd ? i + 1 : -(i + 1);
    const ki = ((mKi + o) % 10 + 10) % 10, si = ((mSi + o) % 12 + 12) % 12;
    const af = 6 + i * 10;
    return { kan: JIKKAN[ki], shi: JUNISHI[si], kanIdx: ki, shiIdx: si, ageFrom: af, ageTo: af + 9 };
  });
}

// ── 地方真太陽時補正 ─────────────────────────────────────────
function _correctToLocalSolarTime(hourJST, y, m, d, lon) {
  const cm = (lon - 135) * 4;
  const start = new Date(y, 0, 0), date = new Date(y, m - 1, d);
  const doy = Math.floor((date - start) / 86400000);
  const B = (2 * Math.PI * (doy - 81)) / 364;
  const eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  const tm = cm + eot;
  return { correctedHour: hourJST + tm / 60, correctionMin: Math.round(tm) };
}

// ══════════════════════════════════════════════════════════════
//  メイン計算関数
// ══════════════════════════════════════════════════════════════

/**
 * 四柱推命の命式を計算する
 * @param {Object} input
 * @param {number} input.year
 * @param {number} input.month
 * @param {number} input.day
 * @param {number} input.hourInput    -1=わからない, 0-23=時刻
 * @param {'m'|'f'|'x'} input.gender
 * @param {number} [input.longitude=135]
 * @param {string} [input.mbti='']
 * @returns {Object} calc 結果オブジェクト
 */
export function calcMeishiki(input) {
  const { year, month, day, hourInput, gender } = input;
  const lon   = input.longitude !== undefined ? input.longitude : 135;
  const mbti  = input.mbti || '';
  const hourJST = hourInput >= 0 ? hourInput : 12;
  const birthHourUTC = hourJST - 9;
  const { correctedHour, correctionMin } = lon !== 135
    ? _correctToLocalSolarTime(hourJST, year, month, day, lon)
    : { correctedHour: hourJST, correctionMin: 0 };

  // 各柱（定気法・0時切り替え）
  const yP = _calcYearPillar(year, month, day, birthHourUTC);
  const mP = _calcMonthPillar(year, month, day, birthHourUTC, yP.kan);
  const dP = _calcDayPillar(new Date(year, month - 1, day));  // 0時切り替え
  const hP = hourInput >= 0 ? _calcHourPillar(hourInput, dP.kan) : null;

  const arr = [yP, mP, dP, ...(hP ? [hP] : [])];
  const gokyo = _calcGokyo(arr);
  const enriched = arr.map((p, i) => ({
    ...p,
    jisshin:   i === 2 ? '─（日主）' : _getJisshin(dP.kanIdx, p.kanIdx),
    juniunsei: _getJuniunsei(dP.kan, p.shiIdx),
    zokan:     _ZOKAN[JUNISHI[p.shiIdx]] || [],
    gogyoKan:  JIKKAN_GOGYO[p.kanIdx],
    gogyoShi:  JUNISHI_GOGYO[p.shiIdx],
  }));
  const { name: kkName, kishin, kijin } = _calcKakukyoku(gokyo, dP.kan);
  const allShis = arr.map(p => p.shi);
  const tokuseiboshi = _calcTokuseiboshi(dP.kan, allShis);
  const daiunList = _calcDaiunList(mP.kanIdx, mP.shiIdx, yP.kan, gender);
  const currentAge = new Date().getFullYear() - year;
  const currentDaiun = daiunList.find(d => currentAge >= d.ageFrom && currentAge <= d.ageTo) || daiunList[0];

  return {
    input: {
      year, month, day, hourInput, gender, longitude: lon, mbti,
      correctedHour: Math.round(correctedHour * 100) / 100,
      correctionMin,
    },
    pillars: {
      year:  { ...enriched[0], label: '年柱' },
      month: { ...enriched[1], label: '月柱' },
      day:   { ...enriched[2], label: '日柱' },
      hour:  hP ? { ...enriched[3], label: '時柱' } : null,
    },
    gokyo,
    kakukyoku: { name: kkName },
    kishin,
    kijin,
    kanshin: [],
    daiunList,
    currentDaiun,
    tokuseiboshi,
    mbti,
  };
}

// ══════════════════════════════════════════════════════════════
//  初期入力のロード（sessionStorage / URL / デフォルト）
// ══════════════════════════════════════════════════════════════

/**
 * 既存HTMLの初期化ブロック（元: 行2055-2073）と等価な初期入力を返す。
 * ブラウザ環境でのみ呼び出すこと。
 * @returns {Object} fortune_input
 */
export function loadInitialFortuneInput() {
  let ui = null;
  // ① sessionStorageから読み込み（LP→決済→有料ページの遷移で引き継がれる）
  try {
    const s = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('fortune_input') : null;
    ui = s ? JSON.parse(s) : null;
  } catch (e) { ui = null; }

  // ② URLパラメータにfortune_inputが含まれる場合（決済サービスがstate等で渡す場合の保険）
  if (!ui) {
    try {
      const params = new URLSearchParams(window.location.search);
      const enc = params.get('fi');
      if (enc) ui = JSON.parse(decodeURIComponent(atob(enc)));
    } catch (e) {}
  }

  // ③ デフォルト値（フォールバック）
  if (!ui) {
    ui = {
      year: 1996, month: 10, day: 12,
      hourInput: 19, gender: 'f',
      longitude: 139.76, mbti: 'INFP',
      placeName: '東京都', lastName: '', firstName: '',
    };
  }

  // plan情報もsessionStorageから取得
  try {
    const plan = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('pf_plan') : null;
    if (plan) ui.plan = plan;
  } catch (e) {}

  return ui;
}
