// ══════════════════════════════════════════════════════════════
//  PANDA FORTUNE — 運勢スコア計算・コメント生成ロジック
//  元HTML 2375-2774行。
//
//  元実装では getLuckyLevel / getKaiUnRank の第2引数 calcOverride が
//  省略されたら window._MEISHIKI_CALC を参照していたが、ES Module 化に
//  あたり calc を必須引数に変更（呼び出し側で明示的に渡す）。
//
//  textColor: C.textMuted の参照はインライン RGBA 文字列に置換している。
// ══════════════════════════════════════════════════════════════

export function getLuckyLevel(stem, calcOverride) {
  const calc = calcOverride;
  const stemGogyo = ['木','木','火','火','土','土','金','金','水','水'][stem];
  if (calc.kishin.includes(stemGogyo)) {
    const dayGogyo = ['木','木','火','火','土','土','金','金','水','水'][
      ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'].indexOf(calc.pillars.day.kan)
    ];
    return stemGogyo === dayGogyo ? 5 : 4;
  }
  if (calc.kijin.includes(stemGogyo)) return calc.kijin[0] === stemGogyo ? 0 : 1;
  return 3;
}

// 総合開運ランク（四柱推命 × 六曜）
export function getKaiUnRank(stem, rokuyo, calcOverride) {
  const lucky = getLuckyLevel(stem, calcOverride);
  const ryBonus = rokuyo === "大安" ? 2 : rokuyo === "友引" ? 1 : rokuyo === "仏滅" || rokuyo === "赤口" ? -1 : 0;
  const total = lucky + ryBonus;
  if (total >= 6) return { rank: "超開運", stars: 3, bg: "rgba(201,168,76,0.22)", border: "rgba(201,168,76,0.7)", textColor: "#e8c97a" };
  if (total >= 5) return { rank: "大開運", stars: 2, bg: "rgba(201,168,76,0.12)", border: "rgba(201,168,76,0.45)", textColor: "#C9A84C" };
  if (total >= 4) return { rank: "吉",     stars: 1, bg: "rgba(100,180,100,0.08)", border: "rgba(100,180,100,0.3)", textColor: "rgba(130,200,130,0.9)" };
  if (total <= 1) return { rank: "凶",     stars: 0, bg: "rgba(140,40,30,0.08)", border: "rgba(140,40,30,0.25)", textColor: "rgba(180,80,70,0.8)" };
  return { rank: "", stars: -1, bg: "transparent", border: "rgba(255,255,255,0.05)", textColor: "rgba(240,230,208,0.45)" };
}

// 日本の暦の特別日
const SPECIAL_DAYS_2026 = {
  "2026-3-3":  { label: "上巳", icon: "🎎" },
  "2026-3-20": { label: "春分", icon: "🌸" },
  "2026-4-1":  { label: "新年度", icon: "🌱" },
  "2026-4-29": { label: "昭和の日", icon: "🎌" },
  "2026-5-3":  { label: "憲法記念", icon: "🎌" },
  "2026-5-5":  { label: "こどもの日", icon: "🎏" },
};

// ── 流月干支計算（運勢スコア用） ──────────────────────────────
export function getFlowMonthKanshi(year, month) {
  const GOKORTON_F = {甲:['丙','丁','戊','己','庚','辛','壬','癸','甲','乙','丙','丁'],己:['丙','丁','戊','己','庚','辛','壬','癸','甲','乙','丙','丁'],乙:['戊','己','庚','辛','壬','癸','甲','乙','丙','丁','戊','己'],庚:['戊','己','庚','辛','壬','癸','甲','乙','丙','丁','戊','己'],丙:['庚','辛','壬','癸','甲','乙','丙','丁','戊','己','庚','辛'],辛:['庚','辛','壬','癸','甲','乙','丙','丁','戊','己','庚','辛'],丁:['壬','癸','甲','乙','丙','丁','戊','己','庚','辛','壬','癸'],壬:['壬','癸','甲','乙','丙','丁','戊','己','庚','辛','壬','癸'],戊:['甲','乙','丙','丁','戊','己','庚','辛','壬','癸','甲','乙'],癸:['甲','乙','丙','丁','戊','己','庚','辛','壬','癸','甲','乙']};
  const JIKKAN_F  = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  const JUNISHI_F = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  const JIKKAN_GOGYO_F  = ['木','木','火','火','土','土','金','金','水','水'];
  const JUNISHI_GOGYO_F = ['水','土','木','木','土','火','火','土','金','金','土','水'];
  function _jd(y,m,d,h){if(m<=2){y--;m+=12;}const A=Math.floor(y/100);const B=2-A+Math.floor(A/4);return Math.floor(365.25*(y+4716))+Math.floor(30.6001*(m+1))+d+h/24+B-1524.5;}
  function _sl(jd){const T=(jd-2451545)/36525;let L0=280.46646+36000.76983*T+0.0003032*T*T;L0=((L0%360)+360)%360;let M2=357.52911+35999.05029*T-0.0001537*T*T;M2=((M2%360)+360)%360;const Mr=M2*Math.PI/180;const C=(1.914602-0.004817*T-0.000014*T*T)*Math.sin(Mr)+(0.019993-0.000101*T)*Math.sin(2*Mr)+0.000289*Math.sin(3*Mr);const sl=L0+C;const om=125.04-1934.136*T;return(((sl-0.00569-0.00478*Math.sin(om*Math.PI/180))%360)+360)%360;}
  const sl = _sl(_jd(year, month, 15, 3));
  const shiIdx = ((Math.floor(((sl-315+360)%360)/30)+2)%12);
  const yKanIdx = ((year-4)%10+10)%10;
  const yKan = JIKKAN_F[yKanIdx];
  const monthIdx = (shiIdx-2+12)%12;
  const kanStr = GOKORTON_F[yKan][monthIdx];
  const kanIdx = JIKKAN_F.indexOf(kanStr);
  return { kan: kanStr, shi: JUNISHI_F[shiIdx], kanIdx, shiIdx, gogyoKan: JIKKAN_GOGYO_F[kanIdx], gogyoShi: JUNISHI_GOGYO_F[shiIdx] };
}

export function calcMonthlyScore(calc, year, month) {
  const JIKKAN_GOGYO_F = ['木','木','火','火','土','土','金','金','水','水'];
  const JUNISHI_GOGYO_F= ['水','土','木','木','土','火','火','土','金','金','土','水'];
  const SEI_F  = {木:'火',火:'土',土:'金',金:'水',水:'木'};
  const KOKU_F = {木:'土',火:'金',土:'水',金:'木',水:'火'};
  const SHIGOU_F = {子:'丑',丑:'子',寅:'亥',亥:'寅',卯:'戌',戌:'卯',辰:'酉',酉:'辰',巳:'申',申:'巳',午:'未',未:'午'};
  const ROKUCHUU_F = {子:'午',午:'子',丑:'未',未:'丑',寅:'申',申:'寅',卯:'酉',酉:'卯',辰:'戌',戌:'辰',巳:'亥',亥:'巳'};
  const KANGO_F = {甲:'己',己:'甲',乙:'庚',庚:'乙',丙:'辛',辛:'丙',丁:'壬',壬:'丁',戊:'癸',癸:'戊'};
  const {kishin, kijin, pillars, currentDaiun} = calc;
  const fm = getFlowMonthKanshi(year, month);
  const nichiShi = pillars.day.shi;
  let base = 60;
  if (kishin.includes(fm.gogyoKan)) base += 12;
  if (kijin.includes(fm.gogyoKan))  base -= 15;
  if (kishin.includes(fm.gogyoShi)) base += 8;
  if (kijin.includes(fm.gogyoShi))  base -= 10;
  if (SHIGOU_F[fm.shi] === nichiShi) base += 8;
  else if (ROKUCHUU_F[fm.shi] === nichiShi) base -= 12;
  if (currentDaiun && KANGO_F[currentDaiun.kan] === fm.kan) base += 6;
  if (currentDaiun && SHIGOU_F[currentDaiun.shi] === fm.shi) base += 4;
  if (currentDaiun && ROKUCHUU_F[currentDaiun.shi] === fm.shi) base -= 6;
  base = Math.max(20, Math.min(95, base));
  // 恋愛
  let love = base;
  if (SHIGOU_F[fm.shi] === nichiShi) love += 10;
  if (ROKUCHUU_F[fm.shi] === nichiShi) love -= 8;
  love = Math.max(20, Math.min(95, love));
  // 仕事
  const JIKKAN_F2 = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  const ni = JIKKAN_F2.indexOf(pillars.day.kan);
  const mi = JIKKAN_F2.indexOf(fm.kan);
  function _jis(niI,tiI){const ng=JIKKAN_GOGYO_F[niI],tg=JIKKAN_GOGYO_F[tiI],s=(niI%2)===(tiI%2);if(ng===tg)return s?'比肩':'劫財';if(SEI_F[ng]===tg)return s?'食神':'傷官';if(KOKU_F[ng]===tg)return s?'偏財':'正財';if(SEI_F[tg]===ng)return s?'偏官':'正官';if(KOKU_F[tg]===ng)return s?'偏印':'正印';return'比肩';}
  let work = base;
  const wj = ni>=0&&mi>=0 ? _jis(ni,mi) : '';
  if (['食神','偏官','正官'].includes(wj)) work += 8;
  if (['比肩','劫財'].includes(wj)) work += 4;
  work = Math.max(20, Math.min(95, work));
  // 金運
  let money = base;
  if (['偏財','正財'].includes(wj)) money += 12;
  if (wj==='偏財') money += 4;
  money = Math.max(20, Math.min(95, money));
  return { total: Math.round(base), love: Math.round(love), work: Math.round(work), money: Math.round(money), kanshi: fm.kan+fm.shi };
}

export function calcDailyScore(calc, date) {
  const JIKKAN_F        = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  const JUNISHI_F       = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  const JIKKAN_GOGYO_F  = ['木','木','火','火','土','土','金','金','水','水'];
  const JUNISHI_GOGYO_F = ['水','土','木','木','土','火','火','土','金','金','土','水'];
  const SEI_F   = {木:'火',火:'土',土:'金',金:'水',水:'木'};
  const KOKU_F  = {木:'土',火:'金',土:'水',金:'木',水:'火'};
  const SG_F    = {子:'丑',丑:'子',寅:'亥',亥:'寅',卯:'戌',戌:'卯',辰:'酉',酉:'辰',巳:'申',申:'巳',午:'未',未:'午'};
  const RK_F    = {子:'午',午:'子',丑:'未',未:'丑',寅:'申',申:'寅',卯:'酉',酉:'卯',辰:'戌',戌:'辰',巳:'亥',亥:'巳'};
  const KANGO_F = {甲:'己',己:'甲',乙:'庚',庚:'乙',丙:'辛',辛:'丙',丁:'壬',壬:'丁',戊:'癸',癸:'戊'};
  // 自刑（自分と同じ地支がぶつかる地支）
  const JIKEI_F = new Set(['午','寅','酉','亥']);

  // ① 今日の干支を計算
  function _jdn(y,m,d){if(m<=2){y--;m+=12;}const A=Math.floor(y/100);const B=2-A+Math.floor(A/4);return Math.floor(365.25*(y+4716))+Math.floor(30.6001*(m+1))+d+B-1524;}
  const y=date.getFullYear(), mo=date.getMonth()+1, d=date.getDate();
  const diff = _jdn(y,mo,d) - 2415021;
  const ki = ((diff%10)+10)%10, si = ((diff+10)%12+12)%12;
  const dayKan = JIKKAN_F[ki], dayShi = JUNISHI_F[si];
  const dkG = JIKKAN_GOGYO_F[ki], dsG = JUNISHI_GOGYO_F[si];

  // ② 命式から必要な情報を取得
  const {kishin, kijin, pillars, currentDaiun} = calc;
  const nichiShi  = pillars.day.shi;   // 日支（配偶者宮）
  const tsukiShi  = pillars.month.shi; // 月支（社会・仕事宮）
  const nenShi    = pillars.year.shi;  // 年支（財宮）
  const ni = JIKKAN_F.indexOf(pillars.day.kan); // 日主インデックス

  // ③ 十神を計算（今日の天干 × 日主）
  function _jis(niI, tiI) {
    const ng = JIKKAN_GOGYO_F[niI], tg = JIKKAN_GOGYO_F[tiI];
    const s = (niI%2) === (tiI%2);
    if(ng===tg)           return s ? '比肩' : '劫財';
    if(SEI_F[ng]===tg)    return s ? '食神' : '傷官';
    if(KOKU_F[ng]===tg)   return s ? '偏財' : '正財';
    if(SEI_F[tg]===ng)    return s ? '偏官' : '正官';
    if(KOKU_F[tg]===ng)   return s ? '偏印' : '正印';
    return '比肩';
  }
  const jisshin = ni >= 0 ? _jis(ni, ki) : '';

  // ④ 地支の特殊関係を先に判定（各運勢計算で使う）
  const sgNichi  = SG_F[dayShi] === nichiShi;   // 流日地支 × 日支 支合
  const rkNichi  = RK_F[dayShi] === nichiShi;   // 流日地支 × 日支 六冲
  const sgTsuki  = SG_F[dayShi] === tsukiShi;   // 流日地支 × 月支 支合
  const rkTsuki  = RK_F[dayShi] === tsukiShi;   // 流日地支 × 月支 六冲
  const sgNen    = SG_F[dayShi] === nenShi;      // 流日地支 × 年支 支合

  // 自刑：流年地支 × 日支（例：丙午年 × 日支午 = 午午自刑）
  // 流年地支は日付の年柱地支として簡易計算
  const ryunenSi = (((_jdn(y,1,1) - 2415021) % 12) + 12) % 12;
  const ryunenShi = JUNISHI_F[ryunenSi];
  const jikei = (ryunenShi === nichiShi && JIKEI_F.has(nichiShi)); // 自刑フラグ

  // ⑤ 基本点（55点スタート）
  // ── 喜忌神の影響（天干・地支それぞれ独立で計算し、合算に上限を設ける）
  let base = 55;
  const kiHitKan = kishin && kishin.includes(dkG);
  const kjHitKan = kijin  && kijin.includes(dkG);
  const kiHitShi = kishin && kishin.includes(dsG);
  const kjHitShi = kijin  && kijin.includes(dsG);
  let kishinBonus = 0;
  if(kiHitKan) kishinBonus += 10; if(kjHitKan) kishinBonus -= 14;
  if(kiHitShi) kishinBonus += 7;  if(kjHitShi) kishinBonus -= 9;
  // 喜神ダブルヒット時の膨らみを抑制（上限+14、下限-20）
  kishinBonus = Math.max(-20, Math.min(14, kishinBonus));
  base += kishinBonus;

  // ── 十神の基本的な吉凶を base に反映（小幅）
  const jisBaseAdj = {
    '食神': 5, '正財': 4, '正官': 4, '正印': 3,
    '偏財': 3, '傷官': 1, '偏官': 0, '比肩': 1,
    '偏印': -2, '劫財': -6,
  };
  base += (jisBaseAdj[jisshin] || 0);

  // ── 大運との関係
  if(currentDaiun && KANGO_F[currentDaiun.kan] === dayKan) base += 4;
  if(currentDaiun && SG_F[currentDaiun.shi]    === dayShi) base += 3;
  if(currentDaiun && RK_F[currentDaiun.shi]    === dayShi) base -= 5;

  // ── 自刑によるベース消耗
  if(jikei) base -= 5;

  base = Math.max(10, Math.min(99, Math.round(base)));

  // ⑥ 恋愛運
  // ─ 古典理論：食傷（表現・魅力）、正官/偏財/正財（異性縁）が吉
  //              偏印（内向き・孤立）、劫財（消耗・競争）が凶
  //              日支（配偶者宮）の支合 → 最吉、六冲 → 最凶
  let love = base;
  const loveAdj = {
    '食神': 8, '傷官': 6, '正官': 10, '偏財': 8, '正財': 7,
    '正印': 4, '偏官': 2, '比肩': -2,
    '偏印': -8, '劫財': -10,
  };
  love += (loveAdj[jisshin] || 0);
  if(sgNichi)  love += 12;
  if(rkNichi) { love -= 22; love = Math.min(love, 58); } // 配偶者宮六冲は最重要凶
  if(sgTsuki)  love += 5;
  if(jikei)    love -= 6; // 自刑：感情の消耗
  love = Math.max(10, Math.min(99, Math.round(love)));

  // ⑦ 仕事運
  // ─ 古典理論：正官（評価）、食神（才能発揮）、偏官（突破）が吉
  //              傷官（発想）、正印（学習・サポート）は中吉
  //              偏印（内省・アウトプット出にくい）は中立〜やや凶
  //              劫財（妨害・競争）が凶
  //              月支（仕事宮）の支合 → 吉、六冲 → 凶
  let work = base;
  const workAdj = {
    '正官': 15, '食神': 12, '偏官': 8,
    '傷官': 5, '正印': 6, '偏財': 3, '正財': 2, '比肩': 2,
    '偏印': -4,  // 内省・学習の日。成果・アウトプットは出にくい
    '劫財': -10,
  };
  work += (workAdj[jisshin] || 0);
  if(sgTsuki) work += 10;
  if(rkTsuki) work -= 10;
  if(jikei)   work -= 4; // 自刑：集中力の消耗
  work = Math.max(10, Math.min(99, Math.round(work)));

  // ⑧ 金運
  // ─ 古典理論：偏財（臨時・大きな動き）、正財（堅実）、食神（財を生む）が吉
  //              傷官（食傷生財）も中吉
  //              偏印・正印は「印克食傷→食傷が財を生む力が弱まる」で凶
  //              劫財（散財）、比肩（財を食う）が凶
  //              年支（財の根）の支合 → 吉
  let money = base;
  const moneyAdj = {
    '偏財': 15, '正財': 12, '食神': 8, '傷官': 5,
    '正官': 2, '偏官': -5,
    '偏印': -9,  // 印克食傷→財生力が弱まる（最重要凶）
    '正印': -5,  // 同上、陰干分やや軽め
    '比肩': -6, '劫財': -12,
  };
  money += (moneyAdj[jisshin] || 0);
  if(sgNen)    money += 6;
  if(rkNichi)  money -= 5; // 配偶者宮六冲は財の根も揺らす
  if(jikei)    money -= 3;
  money = Math.max(10, Math.min(99, Math.round(money)));

  // ⑨ 総合点 = 恋愛・仕事・金運の加重平均（仕事をやや重く）
  const total = Math.round(love * 0.32 + work * 0.36 + money * 0.32);

  // 六曜
  const DOW = ['日','月','火','水','木','金','土'];
  const SHUO = [new Date(2026,1,17),new Date(2026,2,19),new Date(2026,3,17),new Date(2026,4,17),new Date(2026,5,15),new Date(2026,6,14),new Date(2026,7,13),new Date(2026,8,11),new Date(2026,9,11),new Date(2026,10,9),new Date(2026,11,9)];
  const RY = ['先勝','友引','先負','仏滅','大安','赤口'];
  let lm=1, ld=1;
  for(let i=0; i<SHUO.length; i++){
    const df = Math.round((date - SHUO[i]) / 86400000);
    if(df >= 0){ lm=i+1; ld=df+1; } else break;
  }
  const rokuyo = RY[((((lm-1)%6)+(ld-1))%6+6)%6];
  const dateStr = `${y}年${mo}月${d}日（${DOW[date.getDay()]}）`;

  return {total, love, work, money, base, jisshin, dayKan, dayShi, kanshi: dayKan+dayShi, dateStr, rokuyo, rkNichi, sgNichi, jikei};
}

export function genComment(score, type, jisshin, extra) {
  var j   = jisshin || '';
  var kiH = extra && extra.kiH;
  var kjH = extra && extra.kjH;
  var sgH = extra && extra.sgH;
  var rkH = extra && extra.rkH;

  // ── 恋愛運 ──────────────────────────────────────────────────────────
  if (type === 'love') {
    // 六冲はスコアに関係なく最優先で判定
    if (rkH) return '感情が揺れやすい日💔 大事な話や告白は今日じゃない方がうまくいくんダよ。';
    if (score >= 80) {
      if (sgH)         return 'ずっと気になっていた相手に連絡するなら今日が一番いい💕 縁がつながりやすい特別な流れが来ているんダよ。';
      if (j==='正官')  return '正直な気持ちをそのまま伝えて大丈夫な日💕 誠実さが一番の武器になるんダよ。';
      if (j==='食神')  return '飾らない自分でいることが一番の魅力になる日💕 頑張りすぎず、ありのままでいてほしいんダよ。';
      if (j==='傷官')  return '感性が磨かれていて、気持ちを言葉にしやすい日💕 思っていることを素直に言葉にしてみてほしいんダよ。';
      if (j==='偏財')  return '新しい出会いや縁が動きやすい日💕 いつもより少しだけ外に出てみると面白いことが起きるんダよ。';
      if (j==='正財')  return '長く続く縁を育てるのに向いた日💕 安定した気持ちで相手と向き合えるタイミングンダよ。';
      if (j==='偏官')  return '胸がドキドキするような感情が湧きやすい日💕 勢いで動いた方が上手くいくかもしれないんダよ。';
      if (j==='正印')  return '相手の気持ちを深く受け取れる日💕 聞き役に回るほど、お互いの理解が深まるんダよ。';
      return '恋愛の気が上向いている日💕 気持ちを素直に出してみるといいんダよ。';
    }
    if (score >= 65) {
      if (j==='正官')  return 'じっくり信頼を積み重ねる日💕 焦らず誠実に関わり続けることが、長い目で見て一番強いんダよ。';
      if (j==='食神')  return '一緒にいて自然体でいられる日💕 特別なことをしなくても、いつも通りのあなたがいちばん魅力的なんダよ。';
      if (j==='傷官')  return '言葉や表現で気持ちが伝わりやすい日💕 ただし少し感情的になりやすいから、言い方には気をつけてほしいんダよ。';
      if (j==='偏財')  return '縁はあるけど流れが速い日💕 じっくり育てるより、今感じていることを素直に出した方がいいんダよ。';
      if (j==='正財')  return '安心感と居心地のよさが育ちやすい日💕 派手さより誠実さが相手の心に届くんダよ。';
      if (j==='偏官')  return 'ときめきはあるけど衝動的になりやすい日💕 気持ちが高まったら、一息置いてから行動するといいんダよ。';
      if (j==='正印')  return '相手の話を丁寧に聞ける日💕 「ちゃんと見ている」という姿勢が、じわじわと心を開かせるんダよ。';
      if (j==='偏印')  return '直感が冴えていて、相手の気持ちを感じ取りやすい日💕 言葉より雰囲気で伝わることがある日なんダよ。';
      if (j==='比肩')  return '自分を大切にしながら関係を育てる日💕 依存せず対等でいることが、長続きする関係の基礎になるんダよ。';
      if (j==='劫財')  return '感情が動きやすい日💕 嫉妬や焦りが出てきたとしたら、相手への気持ちが本物の証拠かもしれないんダよ。';
      return '恋愛をゆっくり育てる日💕 焦らず相手のペースに寄り添うと、関係が自然と深まっていくんダよ。';
    }
    if (rkH)         return '気持ちがすれ違いやすい日💕 大事な話は今日じゃなく、もう少し落ち着いた日にした方がうまくいくんダよ。';
    if (j==='劫財')  return '嫉妬や焦りが出やすい日💕 感情的になりそうなときは、少し距離を置いて一息つくといいんダよ。';
    if (j==='偏官')  return '感情が激しく動きやすい日💕 「好き」も「怒り」も増幅されやすいから、大事な場面では一呼吸してほしいんダよ。';
    if (j==='傷官')  return '言葉が少し鋭くなりやすい日💕 正直すぎて相手を傷つけてしまうことがあるから、言い方に少し気をつけてほしいんダよ。';
    if (j==='比肩')  return '一人の時間が心地よい日💕 恋愛を無理に進めようとせず、自分を整えることに使う日にするといいんダよ。';
    if (j==='偏印')  return '頭の中で考えすぎて、気持ちが伝わりにくい日💕 言葉より行動で示す方が、今日は伝わりやすいんダよ。';
    if (kjH)         return '恋愛の流れが向かい風の日💕 動くより待つ方が、今日はいい結果につながるんダよ。';
    return '感情が揺れやすい日💕 大切な話や告白は、気持ちが落ち着いた日に持ち越した方がうまくいくんダよ。';
  }

  // ── 仕事運 ──────────────────────────────────────────────────────────
  if (type === 'work') {
    if (score >= 80) {
      if (j==='正官')  return '今日の頑張りはちゃんと上の人に届く日💼 提案・報告・アピールをするなら今がベストタイミングンダよ。';
      if (j==='食神')  return '得意なことをやればやるほど評価が上がる日💼 自分のやり方を貫いていいんダよ。';
      if (j==='偏官')  return '難しい仕事にぶつかるエネルギーが高まっている日💼 思い切って挑戦してほしいんダよ。';
      if (j==='傷官')  return '独自のアイデアや個性が一番光る日💼 「普通のやり方」より「自分らしいやり方」を選んでいいんダよ。';
      if (j==='偏財')  return '新しい取引や人脈が動きやすい日💼 積極的に動いた人ほど面白い流れが来るんダよ。';
      if (j==='正財')  return '丁寧な仕事が一番評価される日💼 地道にやってきた積み重ねが結果に出やすいタイミングンダよ。';
      if (j==='正印')  return '上の人やベテランから学べることが多い日💼 素直に教わる姿勢が、後から大きな武器になるんダよ。';
      if (kiH)         return '今日の仕事は追い風が吹いている日💼 先延ばしにしていたことを動かすのに最高のタイミングンダよ。';
      return '仕事全体の流れがいい日💼 動いた分だけ結果がついてくるんダよ。';
    }
    if (score >= 65) {
      if (j==='正官')  return '信頼をコツコツ積み重ねる日💼 目立つ成果より「この人に任せたい」と思われる行動が大切なんダよ。';
      if (j==='食神')  return '好きな仕事・得意な作業に集中できる日💼 クリエイティブなことほど、今日はうまくいくんダよ。';
      if (j==='偏官')  return '行動力はあるけど空回りしやすい日💼 何でもやろうとせず、今日は一つに絞ってやり切る方がいいんダよ。';
      if (j==='傷官')  return '鋭い分析や独自の視点が出やすい日💼 会議や打ち合わせでの発言が、思わぬところで評価されることがあるんダよ。';
      if (j==='偏財')  return '予定外の仕事や頼まれ事が入りやすい日💼 柔軟に対応できると、信頼が上がるんダよ。';
      if (j==='正財')  return '確実に、丁寧に進める日💼 スピードより正確さを優先した方が、後の手戻りが減るんダよ。';
      if (j==='正印')  return '情報収集や学びにエネルギーが向く日💼 今日インプットしたことは、後から意外な形で役立つんダよ。';
      if (j==='偏印')  return '直感とひらめきが仕事に活きる日💼 「なんとなくこっちの方がいい気がする」という感覚を大切にしてほしいんダよ。';
      if (j==='比肩')  return '自分のペースで進められる日💼 周りに合わせすぎず、自分のやり方を守った方が今日は成果が出やすいんダよ。';
      if (j==='劫財')  return '競争や横やりが入りやすい日💼 大切な交渉や決断は、別の日に持ち越した方が安全なんダよ。';
      return 'コツコツ積み上げることが一番の近道の日💼 特別な出来事がなくても、着実な一日が後から力になるんダよ。';
    }
    if (j==='劫財')  return '邪魔や競争が入りやすい日💼 今日は守りに徹して、大事な仕事は明日以降に動かすといいんダよ。';
    if (j==='偏官')  return 'やる気はあるのに空回りしやすい日💼 力を入れすぎると消耗するから、今日は7割の力で丁寧に進めてほしいんダよ。';
    if (j==='傷官')  return '言葉が少しきつくなりやすい日💼 正論でも、今日は言い方に気をつけた方がいい結果になるんダよ。';
    if (j==='比肩')  return '孤独感や「やってもやっても報われない」感が出やすい日💼 今日の頑張りは見えにくいだけで、ちゃんと積み重なっているんダよ。';
    if (j==='偏印')  return '気が散って集中しにくい日💼 やることを1〜2個に絞って、それだけ終わらせれば今日は十分ンダよ。';
    if (kjH)         return '仕事のエネルギーが消耗しやすい日💼 必要なことだけに絞って、頑張りすぎないことが今日の正解ンダよ。';
    return '確認しながら慎重に進む日💼 焦って動くより、一つひとつ丁寧にやった方が後悔が少ない日ンダよ。';
  }

  // ── 金運 ──────────────────────────────────────────────────────────
  if (type === 'money') {
    if (score >= 80) {
      if (j==='偏財')  return '動けば動くほどお金が引き寄せられる日💰 今日の積極的な行動は、後からちゃんとお金に返ってくるんダよ。';
      if (j==='正財')  return 'コツコツ積み上げてきたことが収入に変わりやすい日💰 地道な仕事ほど今日は報われるタイミングンダよ。';
      if (j==='食神')  return '好きなことや得意なことからお金が流れてくる日💰 自分の強みを活かした行動が一番の金運アップになるんダよ。';
      if (j==='正官')  return '信頼が直接収入につながりやすい日💰 真面目に積み上げてきた評価が、形になって返ってくるタイミングンダよ。';
      if (j==='偏官')  return '思い切った行動がお金の流れを変える日💰 ためらっていたことに踏み出すと、予想外のリターンが来るかもしれないんダよ。';
      if (j==='傷官')  return '独自の視点やアイデアが収入に直結しやすい日💰 「自分にしかできないこと」を前面に出してほしいんダよ。';
      return '金運が上向きな日💰 思わぬところからいい話が来るかもしれないんダよ。';
    }
    if (score >= 65) {
      if (j==='偏財')  return '縁を大切にすると後でお金になって返ってくる日💰 今日は人との関係にエネルギーを使うといいんダよ。';
      if (j==='正財')  return '計画通りに積み立てたり、節約したりするのに向いた日💰 じっくり蓄える行動が今日の正解ンダよ。';
      if (j==='食神')  return '好きなものへの小さな投資が後から活きてくる日💰 学びや趣味に使うお金は、今日は無駄にならないんダよ。';
      if (j==='正印')  return '知識や技術への投資が後からしっかり返ってくる日💰 資格や学びにお金をかけるなら今日は吉ンダよ。';
      if (j==='偏印')  return '直感で「これはいい」と感じたものへの出費は大丈夫な日💰 ただし衝動買いとの区別は慎重にしてほしいんダよ。';
      if (j==='比肩')  return '財が散りやすい日💰 友達への奢りや見栄のための出費は、今日は控えめにしておくといいんダよ。';
      if (j==='劫財')  return '横から話が入りやすい日💰 「これは絶対いい話」と持ちかけられたら、一晩置いてから判断してほしいんダよ。';
      if (j==='偏官')  return '予定外の出費が入りやすい日💰 急な出費に備えて、財布の動きをきちんと把握しておくといいんダよ。';
      return '金運は普通の日💰 大きな買い物や投資は少し様子を見てからにするといいんダよ。';
    }
    if (j==='劫財')  return '散財・衝動買いのスイッチが入りやすい日💰 「今すぐ欲しい」という気持ちが湧いたら、明日まで待ってほしいんダよ。';
    if (j==='比肩')  return 'お金が出ていきやすい日💰 今日は意識して「使わない」を選ぶことが、金運を守る一番の方法ンダよ。';
    if (j==='偏官')  return '急な出費が入りやすい日💰 大きな買い物や契約は今日じゃない方がいい結果になるんダよ。';
    if (j==='傷官')  return '気持ちの勢いでお金を動かしやすい日💰 感情が高ぶっているときの出費は、後から後悔しやすいんダよ。';
    if (j==='偏財')  return '流れが速くてつかみにくい日💰 今日はお金を動かすより「どう使うか計画する日」にした方がいいんダよ。';
    if (kjH)         return 'お金の流れが向かい風の日💰 大きな決断や出費は、数日後に持ち越した方が賢明ンダよ。';
    return '大きなお金の動きを控える日💰 じっくり考えてから使うことが、今日の金運を守るいちばんのポイントンダよ。';
  }

  // ── 総合運 ──────────────────────────────────────────────────────────
  if (type === 'total') {
    if (score >= 80) {
      if (kiH)         return 'あなたにとって追い風の気が来ている日🐼 何かを動かすなら今日がチャンスンダよ。';
      if (sgH)         return '縁が開きやすい特別な日🐼 人との出会いや再会が意味を持ちやすいんダよ。';
      if (j==='正官')  return '頑張りや誠実さが人に届きやすい日🐼 真剣に取り組んだことが報われるタイミングンダよ。';
      if (j==='食神')  return '自分らしく動けば動くほどいい流れが来る日🐼 得意なことに全力を出してほしいんダよ。';
      if (j==='偏財')  return '積極的に動いた人にいいことが起きる日🐼 一歩踏み出す勇気が大事ンダよ。';
      if (j==='偏官')  return 'エネルギーがみなぎっている日🐼 難しいことに挑戦するなら今日がいいタイミングンダよ。';
      if (j==='傷官')  return 'あなたの個性が一番輝く日🐼 自分らしさを出せた瞬間が、今日一番の正解なんダよ。';
      return '全体的に流れがいい日🐼 直感を信じて動いていくといいんダよ。';
    }
    if (score >= 65) {
      if (j==='正印' || j==='偏印') return '知識を吸収したり、じっくり考えたりするのに向いた日🐼 大きく動くより準備する日ンダよ。';
      if (j==='比肩')  return '自分のペースを守って進める日🐼 誰かに合わせすぎず、自分軸で動くといいんダよ。';
      if (j==='傷官')  return '感性と個性が光る日🐼 ユニークなアイデアや表現が自然と出てきやすいんダよ。';
      if (j==='正財')  return '地道な積み上げが報われやすい日🐼 派手な動きより誠実な行動が今日の正解ンダよ。';
      if (j==='劫財')  return '余計な競争は避けた方がいい日🐼 自分のことに集中すると、ちゃんと前に進めるんダよ。';
      return '穏やかに流れる日🐼 コツコツ積み上げたことがちゃんと力になっていくんダよ。';
    }
    if (kjH)         return '少し向かい風の気が来ている日🐼 無理に攻めず、今日は守りに徹するといいんダよ。';
    if (rkH)         return '感情が揺れやすい日🐼 大事な決断や話し合いは別の日に持ち越すのが吉ンダよ。';
    if (j==='劫財')  return '競争や消耗が起きやすい日🐼 余計な争いは避けて、自分のことに集中するといいんダよ。';
    if (j==='偏官')  return '行動力が上がるけど疲れやすい日🐼 やり切ったら早めに休んでほしいんダよ。';
    if (j==='傷官')  return '感情や言葉が強く出やすい日🐼 大事な場面では一呼吸置いてから動くといいんダよ。';
    if (j==='比肩')  return '自分時間を作るのに向いた日🐼 誰かに合わせるより自分を整えることに使うといいんダよ。';
    return '無理に動かず、自分を整える日にするといいンダ🐼 こういう日の休息が次の活力になるんダよ。';
  }
  return '';
}
