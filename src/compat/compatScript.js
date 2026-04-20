// ══════════════════════════════════════════════════════════════
// PANDA FORTUNE — compat-detail 動的書き換え/ビュー切替スクリプト
// 元 panda-fortune-paid.html 8657-12038 行 + 12040-12078 行を ESM 化
// ・_pfRunCompatScript / _pfShowCompat / _pfShowMain を window に登録
// ・ランタイムエラーを画面に表示するオーバーレイも含む
//
// Phase: 計算層分離 — calcCompatDetail を並行実行し、結果を window._pfCompatData に保存
// DOM描画は既存コードがそのまま動作。段階的に data.* 参照に移行予定。
// ══════════════════════════════════════════════════════════════
import { calcCompatDetail } from '../logic/compatCalcFull.js';
import { MBTI_32_COMPAT, MBTI_PAIR_TEXTS_528, getMbtiIntro } from '../data/compatData.js';
import { _getJuniunsei } from '../engines/meishikiEngine.js';
import { GENMEI_TEXTS, getGenmei, getGenmeiTextsByLang } from '../data/genmeiText.js';
import { NIKCHU_PROFILES_KR } from '../data/compatDataKr.js';
import * as CSK from '../data/compatScriptKr.js';

// 外部参照互換
window.MBTI_32_COMPAT = MBTI_32_COMPAT;

// ── ビュー切り替え関数 ──────────────────────────
// _pfShowCompat / _pfShowMain は Babel 側（上）で定義済み。
// ここでは _pfRunCompatScript のみ定義する。
// （重複定義によるBabel版上書きを防ぐ）

// ── compat-detail の動的書き換えロジック ─────────
window._pfRunCompatScript = function() {
  var my, partner;
  try {
    var ms = sessionStorage.getItem('fortune_input');
    my = ms ? JSON.parse(ms) : null;
  } catch(e) {}
  // window変数を優先（sessionStorageより確実）
  partner = window._pfCompatPartner || null;
  if (!partner) {
    try { var ps = sessionStorage.getItem('compat_partner'); partner = ps ? JSON.parse(ps) : null; } catch(e) {}
  }
  if (!my) my = window._FORTUNE_INPUT || null;
  if (!my || !partner) return;

  // ── 本人・相手を同一エンジン（window._calcMeishiki）で計算 ──
  var GOGYO = ['木','木','火','火','土','土','金','金','水','水'];
  var myCalc, ptCalc;
  try {
    myCalc = window._MEISHIKI_CALC || window._calcMeishiki({
      year: my.year, month: my.month, day: my.day,
      hourInput: my.hourInput !== undefined ? Number(my.hourInput) : -1,
      gender: my.gender || 'f',
      longitude: my.longitude !== undefined ? my.longitude : 135,
      mbti: my.mbti || ''
    });
    var genderMap = {'女性':'f','男性':'m','その他':'x'};
    var ptYear  = parseInt(partner.year)   || 0;
    var ptMonth = parseInt(partner.month)  || 0;
    var ptDay   = parseInt(partner.day)    || 0;
    // partner.hour は「子の刻 23:00-01:00」形式の文字列 → 代表時に変換
    var KOKU_MAP = {
      'わからない':-1,
      '子の刻 23:00-01:00':0,'丑の刻 01:00-03:00':2,'寅の刻 03:00-05:00':4,
      '卯の刻 05:00-07:00':6,'辰の刻 07:00-09:00':8,'巳の刻 09:00-11:00':10,
      '午の刻 11:00-13:00':12,'未の刻 13:00-15:00':14,'申の刻 15:00-17:00':16,
      '酉の刻 17:00-19:00':18,'戌の刻 19:00-21:00':20,'亥の刻 21:00-23:00':22
    };
    var ptHourRaw = partner.hour !== undefined ? partner.hour : (partner.hourInput !== undefined ? partner.hourInput : 'わからない');
    var ptHourInput = -1;
    if (ptHourRaw in KOKU_MAP) {
      ptHourInput = KOKU_MAP[ptHourRaw];
    } else if (ptHourRaw !== '' && ptHourRaw !== null && ptHourRaw !== undefined) {
      var parsed = Number(ptHourRaw);
      ptHourInput = isNaN(parsed) ? -1 : parsed;
    }
    var ptLon = (partner.longitude !== undefined && !isNaN(Number(partner.longitude))) ? Number(partner.longitude) : 135;
    if (!ptYear || !ptMonth || !ptDay || isNaN(ptYear) || isNaN(ptMonth) || isNaN(ptDay)) return;
    ptCalc = window._calcMeishiki({
      year:      ptYear,
      month:     ptMonth,
      day:       ptDay,
      hourInput: ptHourInput,
      gender:    genderMap[partner.gender] || 'f',
      longitude: ptLon,
      mbti:      partner.mbti || ''
    });
  } catch(e) { return; }

  // ── 計算層（calcCompatDetail）を並行実行して結果を保存 ──
  // 現時点ではDOMは既存コードが描画。calcCompatDetailの結果はデバッグ用に window に公開。
  try {
    var _calcData = calcCompatDetail(myCalc, ptCalc, partner, my, {
      mbtiEngineReady: !!window.MBTI_ENGINE_READY,
      calcMbtiScore: window.calcMbtiScore,
      getMbtiInfo: window.getMbtiInfo,
    });
    window._pfCompatData = _calcData;
    if (_calcData) {
      console.log('[compatScript] calcCompatDetail 成功: totalWeighted=' + _calcData.totalWeighted + ', compat_type=' + _calcData.compat_type);
    } else {
      console.warn('[compatScript] calcCompatDetail が null を返しました');
    }
  } catch(e) {
    console.error('[compatScript] calcCompatDetail 呼び出しエラー:', e);
  }

  var myKanIdx = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'].indexOf(myCalc.pillars.day.kan);
  var ptKanIdx = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'].indexOf(ptCalc.pillars.day.kan);
  var myGogyo  = GOGYO[myKanIdx];
  var ptGogyo  = GOGYO[ptKanIdx];

  var SEI  = {木:'火',火:'土',土:'金',金:'水',水:'木'};
  var KOKU = {木:'土',火:'金',土:'水',金:'木',水:'火'};
  var baseScore = 68; var compat_type = '中和型';
  if (SEI[myGogyo]===ptGogyo || SEI[ptGogyo]===myGogyo) { baseScore=82; compat_type='相生型'; }
  else if (myGogyo===ptGogyo)                             { baseScore=75; compat_type='比和型'; }
  else if (KOKU[myGogyo]===ptGogyo || KOKU[ptGogyo]===myGogyo) { baseScore=55; compat_type='相剋型'; }
  var loveScore   = Math.min(99, baseScore + 3);
  var trustScore  = Math.min(99, baseScore - 2);
  var growthScore = Math.min(99, baseScore + (compat_type==='相剋型'?12:-2));

  var scoreLabel = baseScore>=80?'とても強い相性ンダ ✨':baseScore>=70?'よい相性ンダ🐼':baseScore>=60?'お互いを高め合える関係ンダ':'刺激し合える関係ンダ';
  var vsLabel = compat_type==='相生型'?'引き合うタイプ':compat_type==='比和型'?'似た者同士タイプ':compat_type==='相剋型'?'刺激し合うタイプ':'バランスタイプ';

  // P1-A: 本人MBTIを32通り対応 — _MEISHIKI_CALC.input.mbti を優先
  var _rawMyMbti = (window._MEISHIKI_CALC && window._MEISHIKI_CALC.input && window._MEISHIKI_CALC.input.mbti)
    ? window._MEISHIKI_CALC.input.mbti
    : (my.mbti || '');
  var myMbti = (_rawMyMbti && _rawMyMbti !== 'わからない') ? _rawMyMbti : '';
  // A/T なしの場合は -A を付与してマトリクスにヒットさせる
  if (myMbti && !myMbti.match(/-(A|T)$/) && !myMbti.endsWith('A') && !myMbti.endsWith('T')) {
    myMbti = myMbti + '-A';
  }
  var ptMbti  = partner.mbti && partner.mbti!=='わからない' ? partner.mbti : '';
  var _rawName = (partner.name || 'お相手').trim();
  var ptName = _rawName.endsWith('さん') ? _rawName : _rawName + 'さん';
  var myBirth = my.year+'.'+my.month+'.'+my.day;
  var ptBirth = partner.year+'.'+partner.month+'.'+partner.day;
  var ptGender= partner.gender || '';
  var cv = document.getElementById('pf-compat-view');

  function setText(el, txt) { if(el) el.textContent = txt; }
  function q(sel)  { return cv.querySelector(sel); }
  function qa(sel) { return cv.querySelectorAll(sel); }

  setText(q('.t-main'), 'あなた × ' + ptName + 'の相性');
  setText(q('.t-chip'), '生年月日占い'+(myMbti?'（'+myMbti+'）':'')+' × '+ptName+(ptMbti?'（'+ptMbti+'）':'')+' · '+vsLabel);
  document.title = 'PANDA FORTUNE - ' + ptName + 'との相性詳細鑑定';

  var pnames = qa('.p-name'), psubs = qa('.p-sub'), pmbti = qa('.p-mbti');
  if(pnames[0]) setText(pnames[0], 'あなた');
  if(psubs[0])  setText(psubs[0],  myBirth+(my.gender==='f'?' · 女性':my.gender==='m'?' · 男性':''));
  if(pmbti[0] && myMbti) setText(pmbti[0], myMbti);
  // 本人MBTIバッジ
  var elMyMbtiBadge = document.getElementById('pf-compat-my-mbti');
  if(elMyMbtiBadge) {
    if(myMbti) { elMyMbtiBadge.textContent = myMbti; elMyMbtiBadge.style.display = ''; }
    else { elMyMbtiBadge.style.display = 'none'; }
  }
  if(pmbti[0]) pmbti[0].style.display = myMbti ? '' : 'none';
  if(pnames[1]) setText(pnames[1], ptName);
  if(psubs[1])  setText(psubs[1],  ptBirth+(ptGender?' · '+ptGender:''));
  // 相手MBTIバッジ
  var elThemMbtiBadge = document.getElementById('pf-compat-them-mbti');
  if(elThemMbtiBadge) {
    if(ptMbti) { elThemMbtiBadge.textContent = ptMbti; elThemMbtiBadge.style.display = ''; }
    else { elThemMbtiBadge.style.display = 'none'; }
  }
  if(pmbti[1]) { pmbti[1].style.display = ptMbti ? '' : 'none'; if(ptMbti) setText(pmbti[1], ptMbti); }
  var avThem = q('.avatar.them');
  if(avThem) setText(avThem, partner.name ? partner.name[0] : 'A');
  setText(q('.vs-label'), vsLabel);

  setText(document.getElementById('pf-score-big'), String(baseScore));
  var elScoreMyName = document.getElementById('pf-score-myname');
  var elScorePtName = document.getElementById('pf-score-ptname');
  if(elScoreMyName) elScoreMyName.textContent = 'あなた';
  if(elScorePtName) elScorePtName.textContent = ptName || 'お相手';
  setText(document.getElementById('pf-score-label'), scoreLabel);

  // ── サブスコアをエンジン計算値で更新 ──────────────────────
  // MBTI相性スコア（簡易マトリクス）
  // ── 旧16×16は削除。32×32 MBTI_32_COMPAT を使用（後述）──

  // 支合・六冲によるボーナス/ペナルティ
  var SHIGOU  = {子:'丑',丑:'子',寅:'亥',亥:'寅',卯:'戌',戌:'卯',辰:'酉',酉:'辰',巳:'申',申:'巳',午:'未',未:'午'};
  var ROKUCHUU= {子:'午',午:'子',丑:'未',未:'丑',寅:'申',申:'寅',卯:'酉',酉:'卯',辰:'戌',戌:'辰',巳:'亥',亥:'巳'};
  var myDayShi = myCalc.pillars.day.shi;
  var ptDayShi = ptCalc.pillars.day.shi;
  var hikiai = baseScore;
  if (SHIGOU[myDayShi]===ptDayShi)   hikiai = Math.min(99, hikiai + 10);
  if (ROKUCHUU[myDayShi]===ptDayShi) hikiai = Math.max(20, hikiai - 12);
  // 干合
  var KANGO = {甲:'己',己:'甲',乙:'庚',庚:'乙',丙:'辛',辛:'丙',丁:'壬',壬:'丁',戊:'癸',癸:'戊'};
  if (KANGO[myCalc.pillars.day.kan]===ptCalc.pillars.day.kan) hikiai = Math.min(99, hikiai + 8);

  // MBTI スコア（MBTI_32_COMPAT + SCORE_MAP 経路で統一。バッジと同じロジック）
  var mbtiScore = 70; // デフォルト
  if (myMbti && ptMbti && myMbti !== 'わからない' && ptMbti !== 'わからない') {
    var _SCORE_MAP_M1 = {1:48,2:65,3:74,4:82,5:95};
    var _mbBaseM1 = function(m){ return m ? m.replace(/-(A|T)$/,'').replace(/[AT]$/,'').toUpperCase() : ''; };
    var _mbSubM1  = function(m){ if(!m)return null; var s=m.toUpperCase(); if(s.endsWith('-A')||s.endsWith('A'))return 'A'; if(s.endsWith('-T')||s.endsWith('T'))return 'T'; return null; };
    var _myKeyM1 = _mbBaseM1(myMbti) + '-' + (_mbSubM1(myMbti) || 'A');
    var _ptKeyM1 = _mbBaseM1(ptMbti) + '-' + (_mbSubM1(ptMbti) || 'A');
    var _rawM1 = 3;
    if (window.MBTI_32_COMPAT && window.MBTI_32_COMPAT[_myKeyM1] && window.MBTI_32_COMPAT[_myKeyM1][_ptKeyM1] !== undefined) {
      _rawM1 = window.MBTI_32_COMPAT[_myKeyM1][_ptKeyM1];
    }
    mbtiScore = _SCORE_MAP_M1[_rawM1] || 74;
  }

  // P1-C: 生年月日相性スコア = 5要素加重平均
  var SHIGOU_M  = {子:'丑',丑:'子',寅:'亥',亥:'寅',卯:'戌',戌:'卯',辰:'酉',酉:'辰',巳:'申',申:'巳',午:'未',未:'午'};
  var ROKUCHUU_M= {子:'午',午:'子',丑:'未',未:'丑',寅:'申',申:'寅',卯:'酉',酉:'卯',辰:'戌',戌:'辰',巳:'亥',亥:'巳'};
  var KANGO_M   = {甲:'己',己:'甲',乙:'庚',庚:'乙',丙:'辛',辛:'丙',丁:'壬',壬:'丁',戊:'癸',癸:'戊'};
  var SEI_M     = {木:'火',火:'土',土:'金',金:'水',水:'木'};

  // 要素1: 五行相性（日主）
  var score_gogyo = baseScore;

  // 要素2: 日柱の干支相性（支合+干合）
  var score_day = baseScore;
  if(myCalc && ptCalc){
    if(SHIGOU_M[myCalc.pillars.day.shi]===ptCalc.pillars.day.shi)      score_day=Math.min(99,score_day+10);
    else if(ROKUCHUU_M[myCalc.pillars.day.shi]===ptCalc.pillars.day.shi) score_day=Math.max(20,score_day-12);
    if(KANGO_M[myCalc.pillars.day.kan]===ptCalc.pillars.day.kan)        score_day=Math.min(99,score_day+8);
  }

  // 要素3: 月柱相性（感情リズム）
  var score_month = baseScore;
  if(myCalc && ptCalc){
    if(SHIGOU_M[myCalc.pillars.month.shi]===ptCalc.pillars.month.shi)       score_month=Math.min(99,score_month+10);
    else if(ROKUCHUU_M[myCalc.pillars.month.shi]===ptCalc.pillars.month.shi) score_month=Math.max(20,score_month-10);
    if(KANGO_M[myCalc.pillars.month.kan]===ptCalc.pillars.month.kan)         score_month=Math.min(99,score_month+6);
    var myMG2=myGogyo, ptMG2=ptGogyo;
    if(SEI_M[myMG2]===ptMG2||SEI_M[ptMG2]===myMG2) score_month=Math.min(99,score_month+5);
  }

  // 要素4: 年柱相性（根本の気質）
  var score_year = baseScore;
  if(myCalc && ptCalc){
    var myYearGogyo = ['木','木','火','火','土','土','金','金','水','水'][['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'].indexOf(myCalc.pillars.year.kan)];
    var ptYearGogyo = ['木','木','火','火','土','土','金','金','水','水'][['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'].indexOf(ptCalc.pillars.year.kan)];
    if(myYearGogyo && ptYearGogyo){
      if(SEI_M[myYearGogyo]===ptYearGogyo||SEI_M[ptYearGogyo]===myYearGogyo) score_year=Math.min(99,score_year+8);
      else if(myYearGogyo===ptYearGogyo) score_year=Math.min(99,score_year+3);
    }
    if(SHIGOU_M[myCalc.pillars.year.shi]===ptCalc.pillars.year.shi) score_year=Math.min(99,score_year+5);
  }

  // 要素5: 時柱相性（行動リズム）— 不明時はbaseScoreで代用
  var score_hour = baseScore;
  if(myCalc && ptCalc && myCalc.pillars.hour && ptCalc.pillars.hour){
    var hourLabel = myCalc.pillars.hour.jisshin;
    if(hourLabel && hourLabel!=='─（日主）' && hourLabel!=='─'){
      if(SHIGOU_M[myCalc.pillars.hour.shi]===ptCalc.pillars.hour.shi) score_hour=Math.min(99,score_hour+8);
      else if(ROKUCHUU_M[myCalc.pillars.hour.shi]===ptCalc.pillars.hour.shi) score_hour=Math.max(20,score_hour-8);
    }
  }

  // birthCompatScore = 5要素の加重平均
  var birthCompatScore = Math.round(
    score_gogyo  * 0.35 +
    score_day    * 0.25 +
    score_month  * 0.20 +
    score_year   * 0.10 +
    score_hour   * 0.10
  );
  birthCompatScore = Math.max(20, Math.min(99, birthCompatScore));

  // 全コンポーネントを 48〜95 にリマップ（同一スケールで加重平均）
  function remapTo(val, srcMin, srcMax) {
    return Math.max(48, Math.min(95, (val - srcMin) / (srcMax - srcMin) * (95 - 48) + 48));
  }
  // 旧関数との後方互換（IIFE内で使われている箇所があるため残す）
  function normalizeScore(val, vmin, vmax) {
    return Math.max(48, Math.min(95, (val - vmin) / (vmax - vmin) * (95 - 48) + 48));
  }

  var meishikiScore = birthCompatScore;
  var bcs_n = remapTo(meishikiScore, 55, 95);  // 55〜95 → 48〜95
  var hik_n = remapTo(hikiai,        20, 99);  // 20〜99 → 48〜95
  // MBTIスコアは A/T サブタイプ補正を含めて総合スコアに反映
  var mbt_n = mbtiScore;                        // 48〜95 raw
  // myMbti/ptMbti は '-A' / '-T' のサフィックスを持つ（例: 'INFP-A'）
  var _myAT = (myMbti && /-(A|T)$/.test(myMbti)) ? myMbti.slice(-1) : null;
  var _ptAT = (ptMbti && /-(A|T)$/.test(ptMbti)) ? ptMbti.slice(-1) : null;
  // A×T/T×A → 補完関係で +3 / T×T → 共倒れで -3 / A×A → 淡白で ±0
  if ((_myAT === 'A' && _ptAT === 'T') || (_myAT === 'T' && _ptAT === 'A')) mbt_n = Math.min(99, mbt_n + 3);
  else if (_myAT === 'T' && _ptAT === 'T') mbt_n = Math.max(20, mbt_n - 3);

  // 続柄グループ別ウェイト
  var rel = (partner && partner.relation) || '恋人・パートナー';
  var LOVE_RELS = ['恋人・パートナー','気になる人','配偶者','婚約者','元交際相手'];
  var isLoveGroup = LOVE_RELS.indexOf(rel) >= 0;

  // ── 十神スコア計算（LOVEグループのみ使用） ──────────────────────
  var jisshinScore = 64; // デフォルト（吉神）
  if (isLoveGroup && myCalc && ptCalc) {
    var _JIKKAN_IDX = {甲:0,乙:1,丙:2,丁:3,戊:4,己:5,庚:6,辛:7,壬:8,癸:9};
    var _GY = ['木','木','火','火','土','土','金','金','水','水'];
    var _SE = {木:'火',火:'土',土:'金',金:'水',水:'木'};
    var _KO = {木:'土',火:'金',土:'水',金:'木',水:'火'};
    function _jis10(niI, tiI) {
      var ng=_GY[niI], tg=_GY[tiI], s=(niI%2)===(tiI%2);
      if(ng===tg) return s?'比肩':'劫財';
      if(_SE[ng]===tg) return s?'食神':'傷官';
      if(_KO[ng]===tg) return s?'偏財':'正財';
      if(_SE[tg]===ng) return s?'偏官':'正官';
      if(_KO[tg]===ng) return s?'偏印':'正印';
      return '比肩';
    }
    var myKanI  = _JIKKAN_IDX[myCalc.pillars.day.kan];
    var ptKanI  = _JIKKAN_IDX[ptCalc.pillars.day.kan];
    var myGender = (my && my.gender) || '';
    var ptGender = (partner && partner.gender) || '';
    // 自分→相手・相手→自分の十神を算出
    var my2pt = (myKanI !== undefined && ptKanI !== undefined) ? _jis10(myKanI, ptKanI) : '';
    var pt2my = (myKanI !== undefined && ptKanI !== undefined) ? _jis10(ptKanI, myKanI) : '';
    var ZAISEI = ['正財','偏財'];
    var KANSEI = ['正官','偏官'];
    var KICHI  = ['食神','正印','偏印'];
    // 性別考慮の配偶者星判定
    function isSpouseStar(jis, gender) {
      if (gender === '男性') return ZAISEI.indexOf(jis) >= 0;
      if (gender === '女性') return KANSEI.indexOf(jis) >= 0;
      // 性別不明：財または官なら配偶者星とみなす
      return ZAISEI.indexOf(jis) >= 0 || KANSEI.indexOf(jis) >= 0;
    }
    var mySpouse = isSpouseStar(my2pt, myGender);
    var ptSpouse = isSpouseStar(pt2my, ptGender);
    var myKichi  = KICHI.indexOf(my2pt) >= 0;
    var ptKichi  = KICHI.indexOf(pt2my) >= 0;
    if (mySpouse && ptSpouse)       jisshinScore = 95; // 双方で配偶者星が成立
    else if (mySpouse || ptSpouse)  jisshinScore = 79; // 片方のみ
    else if (myKichi  && ptKichi)   jisshinScore = 64; // 双方とも吉神
    else if (my2pt === '比肩' || my2pt === '劫財') jisshinScore = 56; // 同質・競合
    else                            jisshinScore = 48; // 凶星（傷官など）
  }

  // ── 続柄別ウェイト（宿命の縁wB / 引き合う力wH / MBTIwM / 恋愛運wL）──
  var wB, wH, wM, wL = 0, wJ = 0;
  var weightLabel = '';
  var _wlIsKr = CSK.getLang() === 'kr';
  var _wlT = _wlIsKr
    ? { syk:'숙명의 인연', hka:'끌어당기는 힘', love:'연애운', lover:'연인', care:'관심 있는 사람', ex:'전 교제 상대', friend:'친구', work:'직장인', family:'가족', open:'(', close:')' }
    : { syk:'宿命の縁', hka:'引き合う力', love:'恋愛運', lover:'恋人', care:'気になる人', ex:'元交際相手', friend:'友人', work:'職場の人', family:'家族', open:'（', close:'）' };
  function _wlMake(parts, suffix) {
    return parts.join(' + ') + (suffix ? _wlT.open + suffix + _wlT.close : '');
  }
  if (rel === '恋人・パートナー') {
    wB = 0.25; wH = 0.25; wM = 0.25; wL = 0.25;
    weightLabel = _wlMake([_wlT.syk+'25%', _wlT.hka+'25%', 'MBTI25%', _wlT.love+'25%'], _wlT.lover);
  } else if (rel === '気になる人') {
    wB = 0.25; wH = 0.35; wM = 0.15; wL = 0.25;
    weightLabel = _wlMake([_wlT.syk+'25%', _wlT.hka+'35%', 'MBTI15%', _wlT.love+'25%'], _wlT.care);
  } else if (rel === '元交際相手') {
    wB = 0.25; wH = 0.45; wM = 0.05; wL = 0.25;
    weightLabel = _wlMake([_wlT.syk+'25%', _wlT.hka+'45%', 'MBTI5%', _wlT.love+'25%'], _wlT.ex);
  } else if (rel === '配偶者' || rel === '婚約者') {
    wB = 0.30; wH = 0.20; wM = 0.30; wL = 0.20;
    weightLabel = _wlMake([_wlT.syk+'30%', _wlT.hka+'20%', 'MBTI30%', _wlT.love+'20%'], _wlIsKr ? (rel==='配偶者'?'배우자':'약혼자') : rel);
  } else if (rel === '友人') {
    wB = 0.35; wH = 0.25; wM = 0.40; wL = 0;
    weightLabel = _wlMake([_wlT.syk+'35%', _wlT.hka+'25%', 'MBTI40%'], _wlT.friend);
  } else if (rel === '職場の人') {
    wB = 0.25; wH = 0.20; wM = 0.55; wL = 0;
    weightLabel = _wlMake([_wlT.syk+'25%', _wlT.hka+'20%', 'MBTI55%'], _wlT.work);
  } else if (rel === '家族') {
    wB = 0.60; wH = 0.25; wM = 0.15; wL = 0;
    weightLabel = _wlMake([_wlT.syk+'60%', _wlT.hka+'25%', 'MBTI15%'], _wlT.family);
  } else {
    wB = 0.30; wH = 0.25; wM = 0.25; wL = 0.20;
    weightLabel = _wlMake([_wlT.syk+'30%', _wlT.hka+'25%', 'MBTI25%', _wlT.love+'20%'], '');
  }

  // ── 4枚目カードの表示切り替え ────────────────────────────────────
  var elLoveCard = document.getElementById('pf-ss-love-card');
  var elLegendJ  = document.getElementById('pf-legend-jisshin');
  var elLegendM  = document.getElementById('pf-legend-mbti');
  if (elLoveCard) elLoveCard.style.display = isLoveGroup ? 'flex' : 'none';
  if (elLegendJ)  { elLegendJ.style.display = isLoveGroup ? 'flex' : 'none'; }

  // 引き合う力（月柱・日柱の組み合わせ）— IIFE内の s3 で参照するためここで事前計算
  var attractScore = baseScore;
  if(myCalc && ptCalc){
    var _SHIGOU_AT = {子:'丑',丑:'子',寅:'亥',亥:'寅',卯:'戌',戌:'卯',辰:'酉',酉:'辰',巳:'申',申:'巳',午:'未',未:'午'};
    var _SEI_AT = {木:'火',火:'土',土:'金',金:'水',水:'木'};
    if(_SHIGOU_AT[myCalc.pillars.month.shi]===ptCalc.pillars.month.shi) attractScore=Math.min(99,attractScore+10);
    var _myMG=GOGYO[myKanIdx], _ptMG=GOGYO[ptKanIdx];
    if(_SEI_AT[_myMG]===_ptMG||_SEI_AT[_ptMG]===_myMG) attractScore=Math.min(99,attractScore+8);
  }

  // ══ ASTROLOGY COMPATIBILITY 5項目を動的生成 ══
  (function(){
    var container = document.getElementById('pf-astro-items');
    if(!container || !myCalc || !ptCalc) return;

    var SG_A  = {子:'丑',丑:'子',寅:'亥',亥:'寅',卯:'戌',戌:'卯',辰:'酉',酉:'辰',巳:'申',申:'巳',午:'未',未:'午'};
    var RK_A  = {子:'午',午:'子',丑:'未',未:'丑',寅:'申',申:'寅',卯:'酉',酉:'卯',辰:'戌',戌:'辰',巳:'亥',亥:'巳'};
    var KG_A  = {甲:'己',己:'甲',乙:'庚',庚:'乙',丙:'辛',辛:'丙',丁:'壬',壬:'丁',戊:'癸',癸:'戊'};
    var SEI_A = {木:'火',火:'土',土:'金',金:'水',水:'木'};
    var KOKU_A= {木:'土',火:'金',土:'水',金:'木',水:'火'};
    var GOGYO_JA = {木:'木',火:'火',土:'土',金:'金',水:'水'};
    var SNAME = {子:'子（ね）',丑:'丑（うし）',寅:'寅（とら）',卯:'卯（う）',辰:'辰（たつ）',巳:'巳（み）',午:'午（うま）',未:'未（ひつじ）',申:'申（さる）',酉:'酉（とり）',戌:'戌（いぬ）',亥:'亥（い）'};

    function badge(score, type){
      if(type==='caution') return '<span class="sbadge caution">▲ 注意</span>';
      if(score>=88) return '<span class="sbadge great">✦ 最高</span>';
      if(score>=78) return '<span class="sbadge good">◎ 良好</span>';
      if(score>=68) return '<span class="sbadge neutral">○ 普通</span>';
      if(score>=55) return '<span class="sbadge caution-light">△ 要注意</span>';
      return '<span class="sbadge caution">▲ 注意</span>';
    }
    function scoreColor(s){
      return s>=85?'var(--gold)':s>=72?'var(--blue)':s>=60?'var(--green)':'rgba(200,110,90,.9)';
    }
    // row関数（新レイアウト）
    // category : カテゴリ名（大・ゴールド・16px・600）
    // headline : 従来のタイトル文（サブタイトル位置・13px・グレー系）+ バッジ
    function row(icon, category, headline, badgeHtml, desc, score, isLast){
      return '<div class="item-row"'+(isLast?' style="border-bottom:none;"':'')+'>'
        +'<div class="item-icon">'+icon+'</div>'
        +'<div class="item-body">'
        +'<div class="item-title" style="font-size:16px;color:var(--gold-l);font-weight:600;">'+category+'</div>'
        +'<div class="item-subtitle" style="font-size:13px;color:rgba(232,228,217,.65);font-weight:400;margin-top:4px;">'+headline+badgeHtml+'</div>'
        +'<div class="item-desc">'+desc+'</div>'
        +'</div>'
        +'<div class="item-score">'
        +'<div class="is-val" style="color:'+scoreColor(score)+';">'+score+'</div>'
        +'<div class="is-lbl">/100</div>'
        +'</div></div>';
    }

    // ── 項目1: 五行相性（日主の相生・比和・相剋・中和） ──
    // トーンは baseScore（compat_type）で決定
    var s1 = score_gogyo;
    var gogyo_title, gogyo_desc, gogyo_icon;
    if(compat_type==='相生型'){
      gogyo_icon = '💧';
      gogyo_title = 'エネルギーが高め合う相生の関係';
      gogyo_desc  = '水が木を育て、木が火を燃やすように——2人の五行は一方のエネルギーがもう一方を自然に高める関係んダ。一緒にいるだけでお互いの運気が上がりやすく、「この人といると調子がいい」という感覚が自然に生まれてくるんダよ。強制しなくても流れが合う、命式的に見ても恵まれた縁んダ🐼';
    } else if(compat_type==='比和型'){
      gogyo_icon = '🌀';
      gogyo_title = '同じ気質を持つ者同士の共鳴';
      gogyo_desc  = '2人の五行は同じ気質を持つ者同士んダ。似た価値観・似たエネルギーの動き方を持っているから、一緒にいて居心地がいいと感じやすい。ただし同じ弱点も共有しているから、どちらかが低調なときに引っ張り合えないことがあるんダよ。似ているからこそ、意識的に違う視点を取り入れることが大切んダ🐼';
    } else if(compat_type==='相剋型'){
      gogyo_icon = '🔥';
      gogyo_title = 'エネルギーがぶつかり合う関係';
      gogyo_desc  = '水が火を消し、金が木を切るように——2人の五行はエネルギーの方向性が真っ向からぶつかり合う関係んダ。「なんでそう動くの？」という根本的なズレが日常の中で繰り返されやすいんダよ。ただしこの摩擦は2人を鍛え合う力にもなる。相剋の縁を乗り越えた2人の絆は、相生よりも深くなることがあるんダ🐼';
    } else {
      gogyo_icon = '⚖️';
      gogyo_title = 'バランスのとれた中立の関係';
      gogyo_desc  = '2人の五行は特別な相生でも相剋でもない、中立の関係んダ。大きな衝突も強い引力も目立たない分、関係の深さはお互いの努力と選択次第んダよ。命式上の強制がない分、自由度が高い——どう育てるかが2人の縁の鍵になるんダ🐼';
    }

    // ── 項目2: 日柱相性（日支・日干の組み合わせ） ──
    // トーンは baseScore（compat_type）で決定、要素の組み合わせで文章を選ぶ
    var s2 = score_day;
    var day_title, day_desc, day_icon;
    var mDS = myCalc.pillars.day.shi, pDS = ptCalc.pillars.day.shi;
    var mDK = myCalc.pillars.day.kan, pDK = ptCalc.pillars.day.kan;
    var hasShigouD = (SG_A[mDS]===pDS);
    var hasRokuchuuD = (RK_A[mDS]===pDS);
    var hasKangoD = (KG_A[mDK]===pDK);
    var isPositive = (compat_type==='相生型' || compat_type==='比和型');

    // ── 干合タイプ名と大吉縁の判定 ──
    var KANGO_TYPE_NAMES_D2 = {
      '甲己':'中正の合','己甲':'中正の合',
      '乙庚':'仁義の合','庚乙':'仁義の合',
      '丙辛':'威制の合','辛丙':'威制の合',
      '丁壬':'淫匿の合','壬丁':'淫匿の合',
      '戊癸':'無情の合','癸戊':'無情の合',
    };
    var kangoTypeName = hasKangoD ? (KANGO_TYPE_NAMES_D2[mDK + pDK] || null) : null;
    // 大吉縁判定: 男性が陽干 × 女性が陰干
    var YOGAN_D2 = ['甲','丙','戊','庚','壬'];
    var INGAN_D2 = ['乙','丁','己','辛','癸'];
    var myGenderD2 = (myCalc.input && myCalc.input.gender) || '';
    var ptGenderD2 = (ptCalc.input && ptCalc.input.gender) || '';
    var isDaikichienD2 = (hasKangoD &&
      myGenderD2 === 'm' && ptGenderD2 === 'f' &&
      YOGAN_D2.indexOf(mDK) >= 0 && INGAN_D2.indexOf(pDK) >= 0);

    // 干合タイプ別テキスト
    var KANGO_TYPE_TEXTS_D2 = {
      '中正の合':'2人の日干は「中正の合」——大樹と大地のような組み合わせんダ。甲のまっすぐなエネルギーを、己が大地のようにやさしく包み込む。誠実さと安定が2人の縁の核になるんダよ🐼',
      '仁義の合':'2人の日干は「仁義の合」——草花と刃のような組み合わせんダ。庚の鋭さが乙の可能性を引き出し、乙の柔軟さが庚を和らげる。義理と信頼で深まっていく縁んダよ🐼',
      '威制の合':'2人の日干は「威制の合」——太陽と宝石のような組み合わせんダ。丙の明るさが辛の輝きを最大限に引き出し、辛の繊細さが丙をより洗練させる。お互いの才能を引き出し合える縁んダよ🐼',
      '淫匿の合':'2人の日干は「淫匿の合」——灯火と海のような組み合わせんダ。正反対のエネルギーを持ちながら、深いところで強烈に引き合う。理屈を超えた縁の引力がある組み合わせんダよ🐼',
      '無情の合':'2人の日干は「無情の合」——山と雨のような組み合わせんダ。戊のどっしりとした安心感と、癸のやさしい潤いが合わさって穏やかな空気を作り出す。感情より現実で深まっていく縁んダよ🐼',
    };
    var kangoTypeText = kangoTypeName ? (KANGO_TYPE_TEXTS_D2[kangoTypeName] || '') : '';
    var daikichienText = isDaikichienD2 ? 'さらに男性が陽干・女性が陰干という組み合わせは、命式の上で夫婦の星が完全に一致する「大吉縁」んダ。伝統的な四柱推命で最高の縁とされる、稀な組み合わせんダよ✨' : '';
    // 干合接頭文（タイプテキスト + 大吉縁テキスト）
    var kangoPrefix = '';
    if (kangoTypeText) {
      kangoPrefix += kangoTypeText;
      if (daikichienText) kangoPrefix += ' ' + daikichienText;
      kangoPrefix += ' ';
    }

    if (isPositive) {
      // ── 相生/比和ベース（ポジティブトーン）──
      if (hasShigouD && hasKangoD) {
        day_icon = isDaikichienD2 ? '✨' : '💫';
        day_title = isDaikichienD2 ? '日支支合＋日干干合 — 大吉縁' : '日支支合＋日干干合 — 二重の引力';
        day_desc  = kangoPrefix + '生まれた日の地支が支合・天干が干合——2重の引力が働いている稀な組み合わせんダ。出会った瞬間から「なんかこの人気になる」という感覚が生まれやすく、一緒にいると理由なく落ち着ける。命式の中でも特に強い縁を示す組み合わせんダよ🐼';
      } else if (hasShigouD) {
        day_icon = '🔗';
        day_title = '日支が支合 — 陰陽が補い合う';
        day_desc  = '生まれた日の地支が支合の関係んダ。支合とは十二支の中で「陰陽が補い合う黄金のペア」のことで、2人が出会ったとき自然とエネルギーが高まりやすい。「初めて会った気がしない」という感覚が生まれやすいのはこれが理由んダよ🐼';
      } else if (hasKangoD) {
        day_icon = isDaikichienD2 ? '✨' : '🌟';
        day_title = isDaikichienD2 ? '日干が干合 — 大吉縁' : '日干が干合 — 根本的な性質が引き合う';
        day_desc  = kangoPrefix + '生まれた日の天干が干合の関係んダ。干合とは十干の中で「陰陽が引き合う組み合わせ」で、2人の根本的な性質が深いところで惹かれ合っているんダよ。理屈ではなく「なぜかこの人といると落ち着く」という感覚の正体はこれんダ🐼';
      } else if (hasRokuchuuD && hasKangoD) {
        day_icon = isDaikichienD2 ? '✨' : '⚡';
        day_title = isDaikichienD2 ? '日支六冲＋日干干合 — 大吉縁だが複雑' : '日支六冲＋日干干合 — 複雑な縁';
        day_desc  = kangoPrefix + '生まれた日の地支が六冲・天干が干合——引き合いながらもぶつかり合う、複雑な縁んダ。「好きなのになぜかすれ違う」「気になるのに衝突する」という感覚が繰り返されやすいんダよ。この矛盾した引力を理解することが、2人の関係を深める鍵になるんダ🐼';
      } else if (hasRokuchuuD) {
        day_icon = '⚡';
        day_title = '日支が六冲 — 行動リズムが対立';
        day_desc  = '生まれた日の地支が六冲の関係んダ。六冲とは十二支の中で真っ向から対立するペアのことで、2人の行動リズムや生活パターンが根本的にぶつかりやすいんダよ。根本の流れは良いため、意識的なすり合わせで乗り越えられる縁んダ🐼';
      } else {
        day_icon = '🔗';
        day_title = '特別な支合・干合はない組み合わせ';
        day_desc  = '生まれた日の干支に特別な支合・干合・六冲は見当たらないんダ。命式上の強制的な引力も反発もない、自由度の高い関係んダよ。2人の縁の深さはお互いの選択と積み重ね次第——どう育てるかがこの縁の鍵になるんダ🐼';
      }
    } else {
      // ── 相剋/中和ベース（ネガティブトーン）──
      if (hasShigouD && hasKangoD) {
        day_icon = isDaikichienD2 ? '✨' : '💫';
        day_title = isDaikichienD2 ? '日支支合＋日干干合 — 大吉縁だが五行がぶつかる' : '日支支合＋日干干合はあるが、五行がぶつかる';
        day_desc  = kangoPrefix + '生まれた日に支合・干合の両方があるんダ。引き合く力は確かにある——でも五行全体のエネルギーがぶつかり合っているため、この引力が「惹かれるのに近づくと消耗する」という複雑な感情を生みやすいんダよ。引力が強いだけに、すれ違ったときのダメージも大きくなりやすいんダ。';
      } else if (hasShigouD) {
        day_icon = '🔗';
        day_title = '日支支合はあるが、五行がぶつかる';
        day_desc  = '生まれた日の地支に支合はあるんダ。感情のリズムが合う要素は存在する——でも五行のエネルギーがぶつかり合っているため、その感覚がいつも安定するわけではないんダよ。気持ちが合う日と全くかみ合わない日の差が大きくなりやすいんダ。';
      } else if (hasKangoD) {
        day_icon = isDaikichienD2 ? '✨' : '🌟';
        day_title = isDaikichienD2 ? '日干が干合 — 大吉縁だが五行がぶつかる' : '日干干合はあるが、五行がぶつかる';
        day_desc  = kangoPrefix + '生まれた日の天干に干合はあるんダ。深いところで引き合う要素は存在する——でも五行全体のエネルギーがぶつかり合っているため、その引力が表に出にくい状態んダよ。「好きなのになぜかしんどい」「惹かれるのに一緒にいると消耗する」という感覚が出やすいんダ。';
      } else if (hasRokuchuuD && hasKangoD) {
        day_icon = isDaikichienD2 ? '✨' : '⚡';
        day_title = isDaikichienD2 ? '日支六冲＋日干干合 — 大吉縁だが摩擦が二重' : '日支六冲＋日干干合 — 摩擦が二重';
        day_desc  = kangoPrefix + '生まれた日の地支が六冲・天干が干合——惹かれ合いながら激しくぶつかり合う組み合わせんダ。五行のエネルギーも衝突しているため、摩擦が二重になりやすいんダよ。「一緒にいたいのに一緒にいると疲れる」という感覚が繰り返されやすい。この縁は乗り越えるのに相当な覚悟と理解が必要んダよ。';
      } else if (hasRokuchuuD) {
        day_icon = '⚡';
        day_title = '日支六冲 — 行動パターンが根本的に衝突';
        day_desc  = '生まれた日の地支が六冲んダ。2人の行動リズム・生活パターン・判断のタイミングが根本的にぶつかり合っているんダよ。五行のエネルギーも衝突しているため、日常のあらゆる場面で「なんでそうするの？」が積み重なりやすい。悪意がないのにすれ違い続ける——それがこの組み合わせの難しさんダ。';
      } else {
        day_icon = '🔗';
        day_title = '特別な縁が薄い組み合わせ';
        day_desc  = '生まれた日の干支に支合・干合・六冲は見当たらないんダ。命式上の特別な縁は薄い状態んダよ。さらに五行のエネルギーもぶつかり合っているため、自然に深まっていくことは期待しにくいんダ。意識的な努力なしには関係が深まりにくい組み合わせんダよ。';
      }
    }

    // ── 天地徳合・拡張冲・三刑の追加情報 ──
    try {
      var _dataExt = window._pfCompatData || {};
      var _isTenchi = !!_dataExt.isTenchitokugo;
      var _chuuList = Array.isArray(_dataExt.chuuTypes) ? _dataExt.chuuTypes : [];
      var _sankei = _dataExt.sankeiType || null;

      // 天地徳合の場合、タイトル・本文・アイコンを上書き（大吉縁より上位）
      if (_isTenchi) {
        day_icon = '✨';
        day_title = '日柱が天地徳合 — 最高の縁';
        day_desc = '2人の日柱は「天地徳合」——天干が干合し地支が支合する、四柱推命で最高の縁んダ。命式の上で天（精神）と地（行動）の両方が完全に調和している稀有な組み合わせんダよ。魂のレベルで引き合い、一緒にいることで2人の世界が広がっていく——運命的な縁んダ✨';
      }

      // 拡張冲（月支冲・年支冲・日月クロス冲）のテキスト追加
      var _chuuTextMap = {
        '月支冲':'2人の月柱の地支が「冲」の関係にあるんダ。感情のリズムや人との関わり方のテンポが根本的にずれやすく、気持ちが合う日と全く合わない日の差が大きくなりやすいんダよ。',
        '年支冲':'2人の年柱の地支が「冲」の関係にあるんダ。価値観や人生の方向性が根本的にずれやすいんダよ。',
        '日月クロス冲':'2人の日支と月支が「冲」の関係にあるんダ。生活リズムと感情リズムの噛み合いが時期によって大きく変わりやすいんダよ。',
      };
      if (_chuuList.length > 0) {
        var _chuuTexts = [];
        for (var _ci = 0; _ci < _chuuList.length; _ci++) {
          if (_chuuTextMap[_chuuList[_ci]]) _chuuTexts.push(_chuuTextMap[_chuuList[_ci]]);
        }
        if (_chuuTexts.length > 0) day_desc += ' ' + _chuuTexts.join(' ');
      }

      // 三刑のテキスト追加（天地徳合でない場合のみ）
      if (_sankei && !_isTenchi) {
        var _sankeiTexts = {
          '礼なき刑':'2人の日支に「礼なき刑」があるんダ。刑の中でも凶意が強く、お互いに無意識に相手の心を傷つけてしまいやすいんダよ。悪意はないのに言葉や行動が刺さってしまうことが繰り返されやすいんダ。意識的に言葉を選ぶことが大切んダよ。',
          '恃勢の刑':'2人の日支に「恃勢の刑」があるんダ。お互いが自分のペースで突き進もうとするあまり衝突しやすい組み合わせんダよ。どちらも悪くないが、相手のやり方を認める余裕が大切んダ。',
          '恩なき刑':'2人の日支に「恩なき刑」があるんダ。よかれと思ってしたことが裏目に出たり、恩が伝わらなかったりしやすいんダよ。感謝を言葉にして伝える習慣が、この縁をうまく保つカギんダ。',
        };
        if (_sankeiTexts[_sankei]) day_desc += ' ' + _sankeiTexts[_sankei];
      }
    } catch (_eExt) { console.error('[compatScript] 項目2拡張エラー:', _eExt); }

    // ── 項目3: 引き合う力（月支支合・日主相生ベース）──
    // トーンは baseScore（compat_type）で決定、要素の組み合わせで文章を選ぶ
    var s3 = Math.max(20, Math.min(99, attractScore));
    var attr_title, attr_desc, attr_icon;
    var hasShigou  = SG_A[mDS]===pDS;
    var hasKango   = KG_A[mDK]===pDK;
    var hasMShigou = SG_A[myCalc.pillars.month.shi]===ptCalc.pillars.month.shi;
    var hasSousei  = (SEI_A[myGogyo]===ptGogyo || SEI_A[ptGogyo]===myGogyo);

    if (compat_type==='相生型') {
      if (hasMShigou) {
        attr_icon = '💫';
        attr_title = '日主相生＋月支支合 — 強い引力';
        attr_desc  = '日主の五行が相生・さらに月支も支合の関係んダ。根本のエネルギーが高め合う流れに加えて、感情のリズムまで自然と合いやすい。「なんかこの人といると調子がいい」という感覚が日常の中で何度も生まれてくる、強い引力を持つ縁んダよ🐼';
      } else {
        attr_icon = '⚡';
        attr_title = '日主の相生 — エネルギーが自然に高め合う';
        attr_desc  = '日主の五行が相生の関係んダ。一方のエネルギーがもう一方を自然に高める流れがあって、一緒にいるだけでお互いの調子が上がりやすいんダよ。長く続くほど心地よさが増していく縁んダ🐼';
      }
    } else if (compat_type==='比和型') {
      if (hasMShigou) {
        attr_icon = '🌙';
        attr_title = '日主比和＋月支支合 — 居心地のよい縁';
        attr_desc  = '日主が比和・さらに月支も支合んダ。似た気質同士で感情のリズムまで合いやすい、居心地の良い組み合わせんダよ。「一緒にいて疲れない」という感覚が自然に生まれてくる縁んダ🐼';
      } else {
        attr_icon = '🌀';
        attr_title = '日主が比和 — 似た気質の共鳴';
        attr_desc  = '日主の五行が同じ気質を持つ者同士んダ。似たエネルギーの動き方をしているから、一緒にいて「なんか落ち着くな」という感覚が生まれやすいんダよ🐼';
      }
    } else if (compat_type==='中和型') {
      if (hasMShigou) {
        attr_icon = '🌙';
        attr_title = '月支支合 — 感情のリズムが合う';
        attr_desc  = '日主は中和の関係だが、月支に支合があるんダ。根本的なエネルギーの流れは中立だが、感情のリズムが合いやすいという引力があるんダよ。「話しやすい」「気持ちが楽」という感覚がこの縁の引力になっているんダ🐼';
      } else {
        attr_icon = '⚖️';
        attr_title = '中立の関係 — 強制的な引力はない';
        attr_desc  = '日主の五行に特別な相生も相剋もない、中立の関係んダ。強い引力も反発もないため、関係の深さはお互いの意志と選択次第んダよ🐼';
      }
    } else {
      // 相剋型
      if (hasMShigou && hasSousei) {
        attr_icon = '💥';
        attr_title = '月支支合＋相生はあるが、日主は相剋';
        attr_desc  = '日主は相剋だが、月支支合と相生の両方があるんダ。引き合う要素は確かにある——でも根本のエネルギーがぶつかり合っているため、惹かれれば惹かれるほど消耗しやすい状態んダよ。表面的には相性が良く見えるのに、長く付き合うほど摩擦を感じる——それがこの縁の特徴んダよ。';
      } else if (hasMShigou) {
        attr_icon = '🌙';
        attr_title = '月支支合はあるが、日主は相剋';
        attr_desc  = '日主は相剋だが、月支に支合があるんダ。根本のエネルギーはぶつかり合っているのに、感情のリズムは合いやすいという複雑な縁んダよ。「話しやすいのになぜかすれ違う」「気持ちは通じるのに行動がかみ合わない」という感覚が繰り返されやすいんダ。';
      } else if (hasSousei) {
        attr_icon = '⚡';
        attr_title = '相生の流れはあるが、日主は相剋';
        attr_desc  = '日主は相剋だが、五行に相生の流れもあるんダ。ぶつかり合いながら同時に引き合うという矛盾した力が働いているんダよ。「好きなのにしんどい」「離れたいのに気になる」という感覚が出やすい縁んダ。';
      } else {
        attr_icon = '🔥';
        attr_title = '日主が相剋 — 根本的な衝突';
        attr_desc  = '日主の五行が相剋の関係んダ。根本のエネルギーがぶつかり合っているため、日常の中で「なんでそう動くの？」が繰り返されやすいんダよ。意識的に歩み寄らないと距離が縮まりにくい組み合わせんダ。';
      }
    }

    // ── 三合・半会の追加テキスト（attr_desc の冒頭に前置）──
    try {
      var _dataS3 = window._pfCompatData || {};
      if (_dataS3.sangou) {
        var _sgLabel = _dataS3.sangou.join('・');
        attr_desc = '2人の命式に「三合（' + _sgLabel + '）」が成立しているんダ。三合とは3つの地支が合わさって強力なエネルギーを生み出す、支合よりもさらに強い縁のことんダよ。2人が出会うことで、それぞれが単独では出せない大きなエネルギーが生まれるんダ🐼 ' + attr_desc;
        attr_icon = '💫';
      } else if (_dataS3.hangou) {
        var _hgLabel = _dataS3.hangou.join('・');
        attr_desc = '2人の命式に「半会（' + _hgLabel + 'のうち2支）」の縁があるんダ。三合には一歩届かないが、互いの地支が共鳴し合う縁を持っているんダよ🐼 ' + attr_desc;
      }
    } catch (_eS3) { console.error('[compatScript] 三合表示エラー:', _eS3); }

    // ── 項目4: 喜神の一致（運気への影響） ──────────────────────────
    var myKs = myCalc.kishin || [];
    var ptKs = ptCalc.kishin || [];
    var ptGogyoInMyKs = myKs.indexOf(ptGogyo)>=0;
    var myGogyoInPtKs = ptKs.indexOf(myGogyo)>=0;
    var s4_base = baseScore;
    var kishin_icon, kishin_title, kishin_desc, s4;
    if(ptGogyoInMyKs && myGogyoInPtKs){
      s4 = Math.min(99, s4_base + 20);
      kishin_icon = '⭐';
      if (isPositive) {
        kishin_title = '互いの喜神が一致 — 運気が高め合う関係';
        kishin_desc  = '2人の喜神が互いに一致しているんダ。喜神とはその人の運気を上げる五行のことで、2人が同じ流れに乗っているとき自然とお互いの運気が上がり合う関係んダよ。一緒に動くと物事がうまく進みやすく、「この人といると運が向いてくる」という感覚が生まれやすい縁んダ🐼';
      } else {
        kishin_title = '互いの喜神は一致するが、五行がぶつかる';
        kishin_desc  = '喜神の一致はあるんダ。運気の方向性は合っている——ただし五行の根本がぶつかり合っているため、一緒にいても運気アップの効果が打ち消されやすい状態んダよ。せっかくの喜神の縁を活かすには、根本的なエネルギーのぶつかりを意識的に和らげる努力が必要んダ。';
      }
    } else if(ptGogyoInMyKs){
      s4 = Math.min(99, s4_base + 15);
      kishin_icon = '⚖️';
      if (isPositive) {
        kishin_title = '相手があなたの運気アップの存在';
        kishin_desc  = '相手の日主五行があなたの喜神に含まれているんダ。相手がそばにいるだけであなたの運気が上がりやすい、命式的に見ても良い縁んダよ。相手の存在があなたの力を引き出してくれる関係んダ🐼';
      } else {
        kishin_title = '相手は運気アップの存在だが、五行がぶつかる';
        kishin_desc  = '相手の五行はあなたの喜神に含まれているんダ。運気アップの要素はあるが、五行の根本がぶつかり合っているため効果が安定しないんダよ。相手といると運気が上がる場面と消耗する場面が混在しやすい状態んダ。';
      }
    } else if(myGogyoInPtKs){
      s4 = Math.min(99, s4_base + 10);
      kishin_icon = '⚖️';
      if (isPositive) {
        kishin_title = 'あなたが相手の運気アップの存在';
        kishin_desc  = 'あなたの日主五行が相手の喜神に含まれているんダ。あなたがそばにいるだけで相手の運気が上がりやすい関係んダよ。あなたの存在が相手の力を引き出す——命式的に見ても意味のある縁んダ🐼';
      } else {
        kishin_title = 'あなたは運気アップの存在だが、五行がぶつかる';
        kishin_desc  = 'あなたの五行は相手の喜神に含まれているんダ。あなたが相手の運気を上げる要素はあるが、五行の根本がぶつかり合っているため、その効果が一方通行になりやすいんダよ。あなたが相手のために消耗しやすい状態には注意が必要んダ。';
      }
    } else {
      s4 = s4_base;
      kishin_icon = '🌿';
      if (isPositive) {
        kishin_title = '喜神の一致はないが安定した関係';
        kishin_desc  = '2人の喜神に特別な一致は見当たらないんダ。運気アップの特別な効果はないけれど、衝突もしにくいバランスのとれた関係んダよ。特別な追い風はないが、自分たちの力で着実に関係を育てていける縁んダ🐼';
      } else {
        kishin_title = '喜神の一致がなく、五行もぶつかる';
        kishin_desc  = '喜神の一致は見当たらないんダ。運気アップの要素がない上に、五行の根本もぶつかり合っているんダよ。命式的に見ると追い風が少ない組み合わせんダ。意識的な努力なしには関係を深めにくい状態んダよ。';
      }
    }
    s4 = Math.max(20, Math.min(99, s4));

    // ── 項目5: 大運の流れ（長期的な相性の波） ─────────────────────
    var myD = myCalc.currentDaiun, ptD = ptCalc.currentDaiun;
    var daiun_icon, daiun_title, daiun_desc, s5;
    var myDG = myD ? ['木','木','火','火','土','土','金','金','水','水'][['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'].indexOf(myD.kan)] : null;
    var ptDG = ptD ? ['木','木','火','火','土','土','金','金','水','水'][['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'].indexOf(ptD.kan)] : null;
    // スコアロジックは維持、トーンは baseScore + 大運パターンで決定
    if (myD && ptD && RK_A[myD.shi]===ptD.shi) {
      s5 = Math.max(20, baseScore - 10);
      daiun_icon = '⚡';
      if (isPositive) {
        daiun_title = '今の大運が六冲 — この時期はすれ違いやすい';
        daiun_desc  = '今この時期、2人の大運の地支が六冲の関係にあるんダ。それぞれの人生の方向性がすれ違いやすい時期で、「なんで今そっちに動くの？」という場面が増えやすいんダよ。根本の相性は悪くないため、この時期さえ乗り越えれば関係は深まっていくんダ。大きな決断は慎重に話し合ってほしいんダよ🐼';
      } else {
        daiun_title = '今の大運が六冲 — 摩擦が二重になりやすい';
        daiun_desc  = '今の大運の地支が六冲んダ。五行の根本がぶつかり合っている上に、今この時期は2人の人生の方向性までずれやすい状態んダよ。摩擦が二重になりやすい難しい時期んダ。大きな決断・重要な話し合いはこの時期を避けるか、十分に時間をかけて慎重に進めてほしいんダ。';
      }
    } else if (myD && ptD && (SEI_A[myDG]===ptDG||SEI_A[ptDG]===myDG)) {
      s5 = Math.min(99, baseScore + 10);
      daiun_icon = '🌊';
      if (isPositive) {
        daiun_title = '今の大運の流れが相生 — この時期は追い風';
        daiun_desc  = '今この時期、2人の大運の流れが相生の関係にあるんダ。大運とは約10年単位で変わる運気の大きな流れで、今は2人の流れが自然と高め合う方向を向いているんダよ。一緒に動くと物事がうまく進みやすく、今この時期に2人の関係を深めることに追い風が吹いているんダ🐼';
      } else {
        daiun_title = '大運は相生だが、五行がぶつかる';
        daiun_desc  = '今の大運の流れは相生だが、五行の根本がぶつかり合っているんダ。この時期に追い風はあるが、根本的なエネルギーのぶつかりが解消されるわけではないんダよ。今の時期を活かしつつも、根本的なすれ違いには引き続き意識的に向き合う必要があるんダ。';
      }
    } else if (myD && ptD && myDG===ptDG) {
      s5 = Math.min(99, baseScore + 5);
      daiun_icon = '🌊';
      if (isPositive) {
        daiun_title = '今の大運が比和 — 似た流れの中にいる';
        daiun_desc  = '今この時期、2人の大運の流れが似た方向を向いているんダ。同じような課題や転換点を同時期に経験しているため、「今の気持ちがわかる」という共感が生まれやすいんダよ。同じ流れの中にいる者同士として、自然と絆が深まりやすい時期んダ🐼';
      } else {
        daiun_title = '大運は比和だが、五行がぶつかる';
        daiun_desc  = '今の大運の流れは似た方向を向いているんダ。共感は生まれやすいが、五行の根本がぶつかり合っているため、同じ課題を抱えながら補い合えない状態になりやすいんダよ。お互いが低調なときに引っ張り合えない、難しい時期んダ。';
      }
    } else {
      s5 = baseScore;
      daiun_icon = '🌊';
      if (isPositive) {
        daiun_title = '今の大運は安定した時期';
        daiun_desc  = '今この時期、2人の大運の流れに特別な相生も六冲もないんダ。特別な追い風も向かい風もない、安定した時期んダよ。今の関係を丁寧に積み重ねることが、この時期の正解んダ🐼';
      } else {
        daiun_title = '大運に追い風なし、五行もぶつかる';
        daiun_desc  = '今の大運の流れに特別な相生も六冲もないんダ。追い風がない状態で五行の根本もぶつかり合っているため、関係が自然に深まることは期待しにくいんダよ。意識的な努力と歩み寄りなしには前に進みにくい時期んダ。焦らず、小さな積み重ねを大切にしてほしいんダよ。';
      }
    }
    s5 = Math.max(20, Math.min(99, s5));

    // ── birthCompatScore を5つのスコアで再計算 ──────────────────────
    var newBirth = Math.round(s1*0.35 + s2*0.25 + s3*0.20 + s4*0.10 + s5*0.10);
    newBirth = Math.max(20, Math.min(99, newBirth));
    // 表示は生値（カードの加重平均そのまま）、内部計算はremapTo後
    var newBirth_n = remapTo(newBirth, 55, 95);
    bcs_n = newBirth_n; // 外側スコープの bcs_n を更新（加重平均用）
    var elM = document.getElementById('pf-ss-meishiki');
    var elMBar = document.getElementById('pf-ss-meishiki-bar');
    if(elM)    elM.textContent = String(newBirth);          // 生値を表示
    if(elMBar) elMBar.style.width = Math.round(newBirth_n)+'%'; // バー幅はremapTo後
    // 恋愛相性を先に計算（総合スコアの要素として使うため）
    var newLove = Math.min(99, Math.round(newBirth_n*0.60 + hik_n*0.25 + mbt_n*0.15));
    if(compat_type==='相生型') newLove=Math.min(99,newLove+5);
    if(compat_type==='相剋型') newLove=Math.max(30,newLove-5);
    // 総合点の再計算（4要素加重平均、恋愛運なしの続柄は wL=0）
    var newTotal = Math.round(newBirth_n * wB + hik_n * wH + mbt_n * wM + newLove * wL);
    var elBig = document.getElementById('pf-score-big');
    if(elBig) elBig.textContent = String(newTotal);
    // score-label も更新
    var newLabel = newTotal>=88?'2人は特別な縁で結ばれているンダ✨':newTotal>=80?'一緒にいるほど、お互いが成長できる関係':newTotal>=70?'バランスの取れたよい関係ンダ':newTotal>=60?'お互いを高め合える関係ンダ':'刺激し合うことで成長できる関係ンダ';
    var elLabel = document.getElementById('pf-score-label');
    if(elLabel) elLabel.textContent = newLabel;
    // 計算根拠の注釈を表示
    var elWeightNote = document.getElementById('pf-weight-note');
    if(!elWeightNote && elLabel && elLabel.parentNode) {
      elWeightNote = document.createElement('div');
      elWeightNote.id = 'pf-weight-note';
      elWeightNote.style.cssText = 'text-align:center;font-size:10px;color:rgba(255,255,255,.25);letter-spacing:.04em;padding-bottom:12px;font-family:serif;';
      elLabel.parentNode.insertBefore(elWeightNote, elLabel.nextSibling);
    }
    if(elWeightNote) elWeightNote.textContent = (CSK.getLang()==='kr' ? '종합 점수 = ' : '総合スコア = ') + weightLabel;
    // pf-score-summary（まとめ文）も newTotal で更新
    var elSummaryNew = document.getElementById('pf-score-summary');
    if(elSummaryNew) elSummaryNew.textContent = _ptNameShort + 'との相性：' + newLabel;
    var elLoveEl = document.getElementById('pf-ss-love');
    var elLoveBar = document.getElementById('pf-ss-love-bar');
    if(elLoveEl)  elLoveEl.textContent = String(newLove);
    if(elLoveBar) elLoveBar.style.width = newLove+'%';

    // 項目③ 引き合う力バッジ: 5段階判定
    var hasRokuchuu = RK_A[mDS]===pDS;
    var attractBadgeHtml;
    if (hasShigou && hasKango) {
      attractBadgeHtml = '<span class="sbadge great">✦ 強い引力</span>';
    } else if (hasShigou || hasKango) {
      attractBadgeHtml = '<span class="sbadge good">◎ 引力あり</span>';
    } else if (compat_type === '相生型') {
      attractBadgeHtml = '<span class="sbadge neutral">○ 穏やかな引力</span>';
    } else if (hasRokuchuu) {
      attractBadgeHtml = '<span class="sbadge caution">▲ 反発あり</span>';
    } else {
      attractBadgeHtml = '<span class="sbadge caution-light">△ 引力は弱め</span>';
    }

    // ── HTML組み立て（新レイアウト: category・headline・badge の3層）──
    var html = ''
      + row(gogyo_icon, '生年月日の五行', gogyo_title, badge(s1), gogyo_desc, s1, false)
      + row(day_icon,   '生まれ日の相性 · '+mDK+mDS+' × '+pDK+pDS, day_title, ((window._pfCompatData && window._pfCompatData.isTenchitokugo) ? '<span class="sbadge great">✦ 天地徳合</span>' : (isDaikichienD2 ? '<span class="sbadge great">✦ 大吉縁</span>' : badge(s2))), day_desc, s2, false)
      + '<div id="pf-attract-row" class="item-row">'
        +'<div class="item-icon" id="pf-attract-icon">'+attr_icon+'</div>'
        +'<div class="item-body">'
        +'<div class="item-title" style="font-size:16px;color:var(--gold-l);font-weight:600;">磁力的な引き合い</div>'
        +'<div class="item-subtitle" id="pf-attract-subtitle" style="font-size:13px;color:rgba(232,228,217,.65);font-weight:400;margin-top:4px;"><span id="pf-attract-title">'+attr_title+'</span>'+attractBadgeHtml+'</div>'
        +'<div id="pf-attract-desc" class="item-desc">'+attr_desc+'</div>'
        +'</div>'
        +'<div class="item-score"><div id="pf-attract-score" class="is-val" style="color:'+scoreColor(s3)+';">'+s3+'</div><div class="is-lbl">/100</div></div>'
        +'</div>'
      + row(kishin_icon, '運気への影響 · あなたの喜神:'+(myKs.join('/')||'─'), kishin_title, badge(s4), kishin_desc, s4, false)
      + row(daiun_icon,  '長期の運気の流れ · '+(myD?myD.ageFrom+'〜'+myD.ageTo+'歳の大運':'大運不明'), daiun_title, badge(s5, s5<baseScore?'caution':''), daiun_desc, s5, true);

    // ── 空亡（くうぼう）相性判定を最下段に追加 ──
    try {
      var kuubouData = window._pfCompatData && window._pfCompatData.kuubouCompat;
      if (kuubouData) {
        var kuubouIcon = kuubouData.isGokanKuubou ? '💫'
          : kuubouData.isKataKuubou ? '⚠️'
          : kuubouData.isDoubleKuubou ? '🔗'
          : '🌿';
        var kuubouBadgeCls, kuubouBadgeText;
        if (kuubouData.isGokanKuubou) {
          kuubouBadgeCls = 'sbadge great'; kuubouBadgeText = '✦ 互換空亡';
        } else if (kuubouData.isKataKuubou) {
          kuubouBadgeCls = 'sbadge caution-light'; kuubouBadgeText = '△ 片空亡';
        } else if (kuubouData.isDoubleKuubou) {
          kuubouBadgeCls = 'sbadge good'; kuubouBadgeText = '◎ 同一空亡';
        } else {
          kuubouBadgeCls = 'sbadge neutral'; kuubouBadgeText = '○ 関係なし';
        }
        var kuubouTitle = kuubouData.type === 'なし'
          ? '空亡の特別な関係はない'
          : kuubouData.type + ' — ' + (kuubouData.isGokanKuubou ? '運命的な稀な縁' : kuubouData.isKataKuubou ? '感情の縁が強い' : '似たバイオリズム');
        var kuubouSubtitle = '空亡 · あなた：' + (kuubouData.myKuubouType || '─')
          + ' / 相手：' + (kuubouData.ptKuubouType || '─');
        var kuubouHtml = '<div class="item-row" style="border-bottom:none;">'
          + '<div class="item-icon">' + kuubouIcon + '</div>'
          + '<div class="item-body">'
          + '<div class="item-title" style="font-size:16px;color:var(--gold-l);font-weight:600;">空亡の縁</div>'
          + '<div class="item-subtitle" style="font-size:13px;color:rgba(232,228,217,.65);font-weight:400;margin-top:4px;">' + kuubouTitle + '<span class="' + kuubouBadgeCls + '">' + kuubouBadgeText + '</span></div>'
          + '<div class="item-subtitle" style="font-size:11px;color:rgba(232,228,217,.45);margin-top:2px;">' + kuubouSubtitle + '</div>'
          + '<div class="item-desc">' + kuubouData.desc + '</div>'
          + '</div>'
          + '</div>';
        html += kuubouHtml;
      }
    } catch(eKu) { console.error('[compatScript] 空亡表示エラー:', eKu); }

    container.innerHTML = html;
  })();

  var loveWeighted  = loveScore || 60;
  var totalWeighted = Math.round(bcs_n * wB + hik_n * wH + mbt_n * wM + loveWeighted * wL);

  // 星の数
  // P1-B: 星評価削除済み
  var tagText = totalWeighted>=88?'2人は特別な縁で結ばれているンダ✨':totalWeighted>=80?'一緒にいるほど、お互いが成長できる関係':totalWeighted>=70?'バランスの取れたよい関係ンダ':totalWeighted>=60?'お互いを高め合える関係ンダ':'刺激し合うことで成長できる関係ンダ';

  // DOM更新
  var elMeishiki = document.getElementById('pf-ss-meishiki');
  var elHikiai   = document.getElementById('pf-ss-hikiai');
  var elMbti     = document.getElementById('pf-ss-mbti');
  var elLove     = document.getElementById('pf-ss-love');
  // var elScoreTag removed (P1-B)
  if(elMeishiki) { elMeishiki.textContent = Math.round(meishikiScore); document.getElementById('pf-ss-meishiki-bar').style.width = Math.round(bcs_n)+'%'; } // 表示は生値、バー幅はremapTo後
  if(elHikiai)   { elHikiai.textContent   = Math.round(hik_n); document.getElementById('pf-ss-hikiai-bar').style.width   = Math.round(hik_n)+'%'; }
  if(elMbti)     { elMbti.textContent     = Math.round(mbt_n); document.getElementById('pf-ss-mbti-bar').style.width = Math.round(mbt_n)+'%'; }
  // MBTIバー行：両方入力済みのときのみ表示。片方でも欠ければ非表示＆スコア50点
  var elMbtiRow = document.getElementById('pf-ss-mbti-row');
  var bothMbti = !!(myMbti && ptMbti);
  if(elMbtiRow) elMbtiRow.style.display = bothMbti ? 'flex' : 'none';
  if(!bothMbti) {
    mbt_n = 50; // 不明時は50点固定
    if(elMbti) elMbti.textContent = '50';
    var elMbtiBarEl = document.getElementById('pf-ss-mbti-bar');
    if(elMbtiBarEl) elMbtiBarEl.style.width = '50%';
  }
  if(elLove)     { elLove.textContent     = loveWeighted;  document.getElementById('pf-ss-love-bar').style.width     = loveWeighted+'%'; }
  // P1-B: pf-score-tag更新削除済み
  // 総合スコアも加重平均で上書き
  setText(document.getElementById('pf-score-big'), String(totalWeighted));

  // SVG円グラフ（totalWeightedで正しく描画）
  var arcEl = document.getElementById('pf-score-arc');
  if(arcEl){
    var r2 = parseFloat(arcEl.getAttribute('r')) || 82;
    var circ2 = 2 * Math.PI * r2;
    var filled = (totalWeighted / 100) * circ2;
    arcEl.setAttribute('stroke-dasharray', filled.toFixed(1) + ' ' + circ2.toFixed(1));
    arcEl.setAttribute('stroke-dashoffset', '0');
  }

  // 相手の日付テキストを書き換え
  // テキストノードを全走査して「Aさん」「A さん」を一括置換
  var ptBirthStr = partner.year+'年'+partner.month+'月'+partner.day+'日';
  var walker = document.createTreeWalker(cv, NodeFilter.SHOW_TEXT, null, false);
  var node;
  while ((node = walker.nextNode())) {
    var t = node.nodeValue;
    if (!t || !t.trim()) continue;
    t = t.replace(/A さん/g, ptName);
    t = t.replace(/Aさん/g, ptName);
    t = t.replace(/1990年11月18日/g, ptBirthStr);
    if (t !== node.nodeValue) node.nodeValue = t;
  }

  var ptHead = q('.pers-card.pink .pc-head');
  var youHead = q('.pers-card.blue .pc-head');
  if(ptHead)  setText(ptHead,  'PARTNER · '+ptName+(ptMbti?' （'+ptMbti+'）':''));
  if(youHead) setText(youHead, 'YOU · あなた'+(myMbti?' （'+myMbti+'）':''));

  var popoTxs = qa('.popo-tx');
  if(popoTxs[0]){
    var popoText = CSK.getLang() === 'kr'
      ? CSK.buildCompatPopoText_KR(ptName, compat_type)
      : CSK.buildCompatPopoText_JA(ptName, compat_type);
    setText(popoTxs[0], popoText);
  }

  // ══ サブスコア更新 ══
  var SHIGOU  = {子:'丑',丑:'子',寅:'亥',亥:'寅',卯:'戌',戌:'卯',辰:'酉',酉:'辰',巳:'申',申:'巳',午:'未',未:'午'};
  var ROKUCHUU= {子:'午',午:'子',丑:'未',未:'丑',寅:'申',申:'寅',卯:'酉',酉:'卯',辰:'戌',戌:'辰',巳:'亥',亥:'巳'};

  // 生年月日相性（五行スコアベース）
  var birthScore = baseScore;
  // 日支の支合・六冲で補正
  if(myCalc && ptCalc){
    if(SHIGOU[myCalc.pillars.day.shi]===ptCalc.pillars.day.shi) birthScore=Math.min(99,birthScore+10);
    else if(ROKUCHUU[myCalc.pillars.day.shi]===ptCalc.pillars.day.shi) birthScore=Math.max(20,birthScore-10);
    // 干合
    var KANGO={甲:'己',己:'甲',乙:'庚',庚:'乙',丙:'辛',辛:'丙',丁:'壬',壬:'丁',戊:'癸',癸:'戊'};
    if(KANGO[myCalc.pillars.day.kan]===ptCalc.pillars.day.kan) birthScore=Math.min(99,birthScore+8);
  }
  // 引き合う力（月柱・日柱の組み合わせ）— IIFEの後で使うため後続で再定義済み
  // MBTI スコア（MBTI_32_COMPAT + SCORE_MAP 経路で統一。バッジと同じロジック）
  var mbtiScore = 70;
  if (myMbti && ptMbti && myMbti !== 'わからない' && ptMbti !== 'わからない') {
    var _SCORE_MAP_SS = {1:48,2:65,3:74,4:82,5:95};
    // サブタイプを含むキーを生成（例: INFP-A）
    var _mbBase = function(m){ return m ? m.replace(/-(A|T)$/,'').replace(/[AT]$/,'').toUpperCase() : ''; };
    var _mbSub  = function(m){ if(!m)return null; var s=m.toUpperCase(); if(s.endsWith('-A')||s.endsWith('A'))return 'A'; if(s.endsWith('-T')||s.endsWith('T'))return 'T'; return null; };
    var _myKeyS = _mbBase(myMbti) + '-' + (_mbSub(myMbti) || 'A');
    var _ptKeyS = _mbBase(ptMbti) + '-' + (_mbSub(ptMbti) || 'A');
    var _rawS = 3;
    if (window.MBTI_32_COMPAT && window.MBTI_32_COMPAT[_myKeyS] && window.MBTI_32_COMPAT[_myKeyS][_ptKeyS] !== undefined) {
      _rawS = window.MBTI_32_COMPAT[_myKeyS][_ptKeyS];
    }
    mbtiScore = _SCORE_MAP_SS[_rawS] || 74;
  }
  // サブスコアを正規化
  var birthScore_n = remapTo(birthScore, 55, 95);
  var attractScore_n = remapTo(attractScore, 20, 99);
  // MBTIサブスコアにも A/T 補正を適用（バッジ・総合スコアと統一）
  var mbtiScore_ss_n = mbtiScore;  // 48〜95 raw
  var _myATss = (myMbti && /-(A|T)$/.test(myMbti)) ? myMbti.slice(-1) : null;
  var _ptATss = (ptMbti && /-(A|T)$/.test(ptMbti)) ? ptMbti.slice(-1) : null;
  // A×T/T×A → 補完関係で +3 / T×T → 共倒れで -3 / A×A → 淡白で ±0
  if ((_myATss === 'A' && _ptATss === 'T') || (_myATss === 'T' && _ptATss === 'A')) mbtiScore_ss_n = Math.min(99, mbtiScore_ss_n + 3);
  else if (_myATss === 'T' && _ptATss === 'T') mbtiScore_ss_n = Math.max(20, mbtiScore_ss_n - 3);
  // 恋愛相性（正規化後）
  var loveScore2 = Math.min(99, Math.round((birthScore_n*0.5 + attractScore_n*0.3 + mbtiScore_ss_n*0.2)));
  if(compat_type==='相生型') loveScore2=Math.min(99,loveScore2+5);
  if(compat_type==='相剋型') loveScore2=Math.max(30,loveScore2-5);

  function setSubScore(id, barId, val){
    var el=cv.getElementById ? null : document.getElementById(id);
    var bar=cv.getElementById ? null : document.getElementById(barId);
    if(!el) el=document.getElementById(id);
    if(!bar) bar=document.getElementById(barId);
    if(el) el.textContent=String(val);
    if(bar) bar.style.width=val+'%';
  }
  setSubScore('pf-ss-birth',   'pf-ss-birth-bar',   Math.round(birthScore_n));
  setSubScore('pf-ss-attract', 'pf-ss-attract-bar', Math.round(attractScore_n));
  setSubScore('pf-ss-mbti',    'pf-ss-mbti-bar',    Math.round(mbtiScore_ss_n));
  // エンジンレベルラベルをサブスコアエリアにも反映
  var _ssInfo = (window.MBTI_ENGINE_READY && myMbti && ptMbti && myMbti!=='わからない' && ptMbti!=='わからない')
    ? window.getMbtiInfo(myMbti, ptMbti) : null;
  if(_ssInfo){
    var _LL=['相性に差がある','まあまあ','良い相性','とても良い'];
    // 行全体のコンテナ → 最初の列(ラベル) → span
    var elSsMbtiRow = document.querySelector('#pf-ss-mbti')?.closest('[style*="display:flex;align-items:center;padding"]');
    var elSsMbtiLabel = elSsMbtiRow ? elSsMbtiRow.querySelector('span[style*="letter-spacing"]') : null;
    if(elSsMbtiLabel) elSsMbtiLabel.textContent = 'MBTI相性';
  }
  setSubScore('pf-ss-love',    'pf-ss-love-bar',    Math.round(loveScore2));

  // ══ P2-C: 引き合う組み合わせの具体的表示 ══
  (function(){
    var SG2  = {子:'丑',丑:'子',寅:'亥',亥:'寅',卯:'戌',戌:'卯',辰:'酉',酉:'辰',巳:'申',申:'巳',午:'未',未:'午'};
    var KG2  = {甲:'己',己:'甲',乙:'庚',庚:'乙',丙:'辛',辛:'丙',丁:'壬',壬:'丁',戊:'癸',癸:'戊'};
    var SEI3 = {木:'火',火:'土',土:'金',金:'水',水:'木'};

    var SHIGOU_NAME = {子:'子（ねずみ）',丑:'丑（うし）',寅:'寅（とら）',卯:'卯（うさぎ）',辰:'辰（たつ）',巳:'巳（へび）',午:'午（うま）',未:'未（ひつじ）',申:'申（さる）',酉:'酉（とり）',戌:'戌（いぬ）',亥:'亥（いのしし）'};

    if(!myCalc||!ptCalc){return;}

    var finds = [];   // 見つかった引力の組み合わせ
    var scoreBonus = 0;

    // 日支の支合（最強の引力）
    if(SG2[myCalc.pillars.day.shi]===ptCalc.pillars.day.shi){
      finds.push({
        icon:'💫', label:'日支が支合',
        detail: 'あなたの日支「'+(SHIGOU_NAME[myCalc.pillars.day.shi]||myCalc.pillars.day.shi)+'」と相手の日支「'+(SHIGOU_NAME[ptCalc.pillars.day.shi]||ptCalc.pillars.day.shi)+'」',
        why: '支合とは十二支の中で「陰陽が補い合う黄金のペア」のことンダ。日支どうしが支合するとき、2人が会うたびに自然とお互いのエネルギーが高まるんダよ。出会った瞬間から「なんかこの人、気になる」と感じるのはこれが理由ンダ🐼',
        bonus: '+10点',
      });
      scoreBonus += 10;
    }

    // 日干の干合（深い絆の引力）
    if(KG2[myCalc.pillars.day.kan]===ptCalc.pillars.day.kan){
      finds.push({
        icon:'🌟', label:'日干が干合',
        detail: 'あなたの日干「'+myCalc.pillars.day.kan+'」と相手の日干「'+ptCalc.pillars.day.kan+'」',
        why: '干合とは十干の中で「陰陽が引き合う組み合わせ」ンダ。日干どうしが干合するとき、2人の根本的な性質が深いところで惹かれ合うんダよ。理屈ではなく「なんかこの人と一緒にいると落ち着く」という感覚が生まれやすいんダ🐼',
        bonus: '+8点',
      });
      scoreBonus += 8;
    }

    // 月支の支合（感情リズムの共鳴）
    if(SG2[myCalc.pillars.month.shi]===ptCalc.pillars.month.shi){
      finds.push({
        icon:'🌙', label:'月支が支合',
        detail: 'あなたの月支「'+(SHIGOU_NAME[myCalc.pillars.month.shi]||myCalc.pillars.month.shi)+'」と相手の月支「'+(SHIGOU_NAME[ptCalc.pillars.month.shi]||ptCalc.pillars.month.shi)+'」',
        why: '月柱は感情のリズムや、人との関わり方の傾向を示しているんダ。月支が支合するとき、2人の感情のテンポが自然と合いやすく、「この人と話すと気持ちが楽になる」という感覚が生まれやすいんダよ🐼',
        bonus: '+6点',
      });
      scoreBonus += 6;
    }

    // 五行の相生（根本的なエネルギーの補完）
    if(SEI3[myGogyo]===ptGogyo||SEI3[ptGogyo]===myGogyo){
      var seier = SEI3[myGogyo]===ptGogyo ? myGogyo : ptGogyo;
      var seied  = SEI3[myGogyo]===ptGogyo ? ptGogyo : myGogyo;
      finds.push({
        icon:'⚡', label:'日主五行が相生',
        detail: '「'+seier+'（'+['木','火','土','金','水'].find(function(g){return g===seier?g:null})+')が'+seied+'を育てる」関係',
        why: '命式の中心である日主（生まれた日の干の五行）が相生の関係にあるんダ。相生とは一方のエネルギーがもう一方を自然に高め合う関係のことンダよ。一緒にいるだけでお互いの運気が上がりやすい、命式的にとても良い縁ンダ🐼',
        bonus: baseScore>=80?'+12点':'+8点',
      });
      scoreBonus += baseScore>=80?12:8;
    }

    var elTitle    = document.getElementById('pf-attract-title');
    var elSubtitle = document.getElementById('pf-attract-subtitle');
    var elDesc     = document.getElementById('pf-attract-desc');
    var elScore    = document.getElementById('pf-attract-score');
    var elBadge    = document.getElementById('pf-attract-badge');
    var elIcon     = document.getElementById('pf-attract-icon');

    if(finds.length === 0){
      // 引き合う要素なし
      if(elTitle)    elTitle.innerHTML    = '命式上の強い引力は見当たらないんダ<span class="sbadge" style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.35);">なし</span>';
      if(elSubtitle) elSubtitle.textContent = '磁力的な引き合い';
      if(elDesc)     elDesc.textContent   = '2人の命式を見ると、干合・支合といった「磁石のような引力」は今回は見当たらないんダ。ただしこれは決して悪いことではないんダよ🐼 引力がないぶん、摩擦も少ない安定した関係を築きやすいんダ。お互いの努力と選択で深めていく「育てる縁」ンダ。';
      if(elScore)    elScore.textContent  = '68';
      if(elIcon)     elIcon.textContent   = '🔗';
      return;
    }

    // 引き合う要素あり
    var findScore = Math.min(99, attractScore + scoreBonus);
    if(elScore) { elScore.textContent = String(findScore); }
    if(elBadge) { elBadge.textContent = 'あり'; elBadge.className = 'sbadge good'; }
    if(elIcon)  { elIcon.textContent = '✨'; }

    var labelStr = finds.map(function(f){return f.label;}).join('・');
    if(elTitle)    elTitle.innerHTML    = '「'+labelStr+'」で自然と引き合う<span class="sbadge good">あり</span>';
    if(elSubtitle) elSubtitle.textContent = '磁力的な引き合い';

    if(elDesc){
      var descParts = finds.map(function(f){
        return '<div style="margin-bottom:10px;">'
          +'<div style="font-size:11px;letter-spacing:.1em;color:rgba(201,168,76,.65);margin-bottom:4px;">'+f.icon+' '+f.label+' '+f.bonus+'</div>'
          +'<div style="font-size:12px;color:rgba(232,228,217,.55);margin-bottom:4px;">'+f.detail+'</div>'
          +'<div style="font-size:12px;color:rgba(232,228,217,.75);line-height:1.85;font-family:serif;">'+f.why+'</div>'
          +'</div>';
      });
      elDesc.innerHTML = descParts.join('<div style="height:1px;background:rgba(255,255,255,.05);margin:8px 0;"></div>');
    }
  })();

  // ══ P2-C: 引き合う組み合わせの具体的表示 ══
  (function(){
    var SG2  = {子:'丑',丑:'子',寅:'亥',亥:'寅',卯:'戌',戌:'卯',辰:'酉',酉:'辰',巳:'申',申:'巳',午:'未',未:'午'};
    var KG2  = {甲:'己',己:'甲',乙:'庚',庚:'乙',丙:'辛',辛:'丙',丁:'壬',壬:'丁',戊:'癸',癸:'戊'};
    var SEI3 = {木:'火',火:'土',土:'金',金:'水',水:'木'};
    var SNAME = {子:'子（ねずみ）',丑:'丑（うし）',寅:'寅（とら）',卯:'卯（うさぎ）',辰:'辰（たつ）',巳:'巳（へび）',午:'午（うま）',未:'未（ひつじ）',申:'申（さる）',酉:'酉（とり）',戌:'戌（いぬ）',亥:'亥（いのしし）'};
    if(!myCalc||!ptCalc) return;
    var finds=[], scoreBonus=0;
    if(SG2[myCalc.pillars.day.shi]===ptCalc.pillars.day.shi){
      finds.push({icon:'💫',label:'日支が支合',detail:'あなたの日支「'+(SNAME[myCalc.pillars.day.shi]||myCalc.pillars.day.shi)+'」と相手の日支「'+(SNAME[ptCalc.pillars.day.shi]||ptCalc.pillars.day.shi)+'」が支合している',why:'支合とは十二支の中で「陰陽が補い合う黄金のペア」のことンダ。日支どうしが支合するとき、2人が会うたびに自然とお互いのエネルギーが高まるんダよ。出会った瞬間から「なんかこの人気になる」と感じる引力はここから生まれているんダ🐼',bonus:'+10点'});
      scoreBonus+=10;
    }
    if(KG2[myCalc.pillars.day.kan]===ptCalc.pillars.day.kan){
      finds.push({icon:'🌟',label:'日干が干合',detail:'あなたの日干「'+myCalc.pillars.day.kan+'」と相手の日干「'+ptCalc.pillars.day.kan+'」が干合している',why:'干合とは十干の中で「陰陽が引き合う組み合わせ」ンダ。日干どうしが干合するとき、2人の根本的な性質が深いところで惹かれ合うんダよ。理屈ではなく「この人と一緒にいると落ち着く」という感覚の源ンダ🐼',bonus:'+8点'});
      scoreBonus+=8;
    }
    if(SG2[myCalc.pillars.month.shi]===ptCalc.pillars.month.shi){
      finds.push({icon:'🌙',label:'月支が支合',detail:'あなたの月支「'+(SNAME[myCalc.pillars.month.shi]||myCalc.pillars.month.shi)+'」と相手の月支「'+(SNAME[ptCalc.pillars.month.shi]||ptCalc.pillars.month.shi)+'」が支合している',why:'月柱は感情のリズムを示しているんダ。月支が支合するとき、2人の感情のテンポが自然と合いやすく「この人と話すと気持ちが楽」という感覚が生まれやすいんダよ🐼',bonus:'+6点'});
      scoreBonus+=6;
    }
    if(SEI3[myGogyo]===ptGogyo||SEI3[ptGogyo]===myGogyo){
      var seier=SEI3[myGogyo]===ptGogyo?myGogyo:ptGogyo, seied=SEI3[myGogyo]===ptGogyo?ptGogyo:myGogyo;
      finds.push({icon:'⚡',label:'日主が相生',detail:'「'+seier+'の気が'+seied+'の気を育てる」関係にある',why:'命式の中心である日主が相生の関係にあるんダ。相生とは一方のエネルギーがもう一方を自然に高め合う関係のことンダよ。一緒にいるだけでお互いの運気が上がりやすい、命式的にとても良い縁ンダ🐼',bonus:baseScore>=80?'+12点':'+8点'});
      scoreBonus+=baseScore>=80?12:8;
    }
    var elTitle=document.getElementById('pf-attract-title'),elSubtitle=document.getElementById('pf-attract-subtitle'),elDesc=document.getElementById('pf-attract-desc'),elScore=document.getElementById('pf-attract-score'),elBadge=document.getElementById('pf-attract-badge'),elIcon=document.getElementById('pf-attract-icon');
    if(finds.length===0){
      if(elTitle)    elTitle.innerHTML='命式上の強い引力は見当たらないんダ<span class="sbadge" style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.35);">なし</span>';
      if(elSubtitle) elSubtitle.textContent='磁力的な引き合い';
      if(elDesc)     elDesc.textContent='2人の命式を見ると、干合・支合といった「磁石のような引力」は今回は見当たらないんダ。ただこれは決して悪いことではないんダよ🐼 引力がないぶん摩擦も少ない安定した関係を築きやすいんダ。お互いの努力と選択で深めていく「育てる縁」ンダ。';
      if(elScore)    elScore.textContent='68';
      if(elIcon)     elIcon.textContent='🔗';
      return;
    }
    var findScore=Math.min(99,attractScore+scoreBonus);
    if(elScore)    elScore.textContent=String(findScore);
    if(elBadge)  { elBadge.textContent='あり'; elBadge.className='sbadge good'; }
    if(elIcon)     elIcon.textContent='✨';
    var labelStr=finds.map(function(f){return f.label;}).join('・');
    if(elTitle)    elTitle.innerHTML='「'+labelStr+'」で自然と引き合う<span class="sbadge good">あり</span>';
    if(elSubtitle) elSubtitle.textContent='磁力的な引き合い';
    if(elDesc){
      var parts=finds.map(function(f){
        return '<div style="margin-bottom:10px;">'
          +'<div style="font-size:11px;letter-spacing:.1em;color:rgba(201,168,76,.65);margin-bottom:4px;">'+f.icon+' '+f.label+' <span style=\"color:rgba(100,200,80,.7)\">'+f.bonus+'</span></div>'
          +'<div style="font-size:11px;color:rgba(232,228,217,.45);margin-bottom:4px;">'+f.detail+'</div>'
          +'<div style="font-size:12px;color:rgba(232,228,217,.75);line-height:1.85;font-family:serif;">'+f.why+'</div>'
          +'</div>';
      });
      elDesc.innerHTML=parts.join('<div style="height:1px;background:rgba(255,255,255,.05);margin:6px 0;"></div>');
    }
  })();

  // ── 日柱×格局 120通りプロフィール ──────────────────────────────
  var NIKCHU_PROFILES = {
    '甲子_普通格局': '表面は穏やかで知的な印象を与えますが、内側には揺るぎない芯を持つ人物です。甲子の日主は「大木が水の上に根を張る」命式で、知性と実行力を兼ね備えています。人当たりが柔らかく信頼を集めやすい一方、一度決めたことは頑として曲げない頑固さもあります。恋愛では相手をじっくり観察してから心を開くタイプ。誠実で長期的な関係を好みます。周囲からは頼りがいがある存在として慕われますが、完璧主義が出ると自分を追い詰めることもあるでしょう。',
    '甲子_従旺格': '命式全体に木の気が満ちており、その流れに乗ったとき圧倒的な存在感を放つ人物です。内に秘めたエネルギーは静水に映る大樹のごとく深く、外からはクールに見えても情熱は人一倍です。知的探求心が強く、一つのことを極めようとする集中力は並外れています。恋愛では相手の知性と誠実さを最も重視し、感情より信念で動くタイプ。自分の世界観を大切にするあまり、周囲との折り合いに苦労する場面もあるでしょう。',
    '乙丑_普通格局': 'しなやかで上品、人を包み込む温かさを持つ人物です。乙丑の命式は「草木が肥沃な大地に根付く」イメージで、地道な努力を積み重ねる力があります。表面はおとなしく従順に見えますが、内には強い美意識と信念があります。恋愛では相手を支え守ることに喜びを感じ、深く愛する人には細やかな気遣いを惜しみません。ただし優しすぎるがゆえに自分の本音を出せず、知らぬうちに我慢を抱え込みやすい面があるでしょう。',
    '乙丑_従旺格': '命式全体に木の気が満ちており、柔軟性の中に鉄のような意志を秘めた人物です。表面はしなやかで穏やかですが、自分の価値観や美意識においては一切妥協しません。忍耐強く、どんな困難な環境でも静かに力を蓄えながら前進します。恋愛では一度惚れると深く献身的になりますが、相手の言動を敏感に察知するため傷つきやすい一面もあります。大地に根を張る草のように、長い時間をかけて確かな絆を育む人です。',
    '丙寅_普通格局': '太陽のような明るさと力強さを持ち、いる場所を自然と温める人物です。丙寅の命式は「太陽が山の中から昇る」姿で、行動力と向上心を備えています。人を引きつけるカリスマ性があり、リーダーとして周囲をまとめる素質があります。恋愛では積極的で、気になった相手には真っ直ぐにアプローチするタイプ。感情が豊かで情熱的ですが、少しせっかちで冷静さを欠く場面もあるでしょう。',
    '丙寅_従旺格': '命式全体に火の気がみなぎり、その存在そのものが周囲を照らす太陽のような人物です。エネルギーが全方位に向かい、何事にも全力で取り組む姿勢は周囲を圧倒します。行動力と直感力に優れ、大きなビジョンを描いて突き進む力があります。恋愛では情熱的で独占欲も強く、愛した相手にはすべてを捧げます。ただし自分のペースを周囲に求めすぎる面があり、相手との温度差を感じることもあるでしょう。',
    '丁卯_普通格局': '内側に静かな炎を灯す、繊細で温かみのある人物です。丁卯の命式は「灯火が柔らかな草木の中で揺れる」イメージで、芸術的感性と共感力に恵まれています。控えめに見えても内面の感情は豊かで、大切な人への思いやりは深いです。恋愛では相手の気持ちを察することが得意で、空気を読んだ優しい対応ができます。傷つきやすく、ネガティブな言葉を心の奥まで引きずる面があるでしょう。',
    '丁卯_従旺格': '命式全体に火の気が満ちながらも、木の気と調和して内省的な深みを持つ人物です。外からは穏やかに見えますが、内側には消えることのない情熱の炎があります。直感が鋭く、人の本音や場の空気を瞬時に感じ取る力があります。恋愛では相手への感情移入が深く、魂レベルのつながりを求めます。ただし感情が揺れやすく、ひとつの言葉や出来事を深読みしすぎることがあるでしょう。',
    '戊辰_普通格局': '大地のような包容力と安定感を持つ、信頼の厚い人物です。戊辰の命式は「山の土が龍の気に抱かれる」イメージで、変化の中でも揺るがない芯の強さがあります。どっしりと構えた存在感があり、周囲の人が自然と集まってきます。恋愛では慎重に関係を深め、一度心を許した相手にはとことん尽くします。変化を嫌う保守的な面があり、新しいことへの適応に時間がかかる場合もあるでしょう。',
    '戊辰_従旺格': '命式全体に土の気が際立ち、山のような不動の存在感を放つ人物です。困難に直面しても揺るがない精神的な強さがあり、周囲の人の拠り所になります。慎重で堅実、信頼を最も大切にする価値観を持っています。恋愛では時間をかけて関係を築くタイプで、軽い関係よりも深い絆を重視します。頑固さが出ると相手の意見を受け入れにくくなることもあり、柔軟性を意識することで関係が深まるでしょう。',
    '己巳_普通格局': '柔らかな親しみやすさの中に確かな意志を持つ人物です。己巳の命式は「肥沃な土地が燃える太陽の気を受ける」イメージで、表面の従順さと内側の強さが共存しています。細かい気配りができ、人間関係を丁寧に育てる力があります。恋愛では誠実で真剣、相手に尽くすことで愛情を表現します。気遣いが行き過ぎて自分の本音を伝えられず、後から不満が積もることがあるでしょう。',
    '己巳_従旺格': '命式全体に土の気が充満し、その存在が場全体を落ち着かせる不思議な力を持つ人物です。表面は謙虚で穏やかですが、内側には揺るぎない価値観と誇りがあります。面倒見がよく、弱い立場の人を自然にサポートする側に回ります。恋愛では安定と誠実さを重視し、パートナーに深い安心感を与えます。ただし自分の感情表現が苦手で、愛しているのに伝わらないと感じる場面もあるでしょう。',
    '庚午_普通格局': '強さと情熱を兼ね備えた、アクティブでカリスマ的な人物です。庚午の命式は「鋼の意志が情熱の炎に鍛えられる」イメージで、実行力と競争心が際立っています。どんな困難も正面突破しようとするエネルギーがあり、人を鼓舞する力があります。恋愛では積極的でストレートにアプローチし、思いきった行動で相手を引きつけます。白黒つけたがる性質がやや強く、グレーゾーンを許せないことがあるでしょう。',
    '庚午_従旺格': '命式全体に金の気が満ち、情熱の火にさらに磨かれた刃のような鋭さを持つ人物です。信念と意志の強さは圧倒的で、一度目標を定めると何があっても突き進みます。義侠心が強く、不正を見ると黙っていられない正義感の持ち主です。恋愛では対等な関係を好み、お互いが高め合えるパートナーシップを理想とします。プライドが高いため素直に謝れない場面があり、言葉より行動で誠意を見せるタイプです。',
    '辛未_普通格局': '繊細な美意識と内に秘めた強さを持つ、上品な印象の人物です。辛未の命式は「宝石が大地の気に育まれる」イメージで、磨かれた感性と堅実な実力があります。外見や環境への美意識が高く、細部へのこだわりが際立ちます。恋愛では完璧な関係を求めるため、理想と現実のギャップに悩むこともあります。一度心を許した相手には繊細で深い愛情を注ぎ、長期的な関係を大切にする人です。',
    '辛未_従旺格': '命式全体に金の気が充満し、磨き抜かれた宝石のような孤高の輝きを持つ人物です。鋭い観察眼と分析力があり、本質を瞬時に見抜く力があります。表面はクールで感情を出しませんが、親しい人への思いやりは深く、大切な関係を一生涯守ろうとします。恋愛では慎重で理想が高く、本当に信頼できる相手にしか心を開きません。感情より理性が先に動くため、温かみが伝わりにくいと感じさせることがあるでしょう。',
    '壬申_普通格局': '広い視野と柔軟な思考を持つ、知的で社交的な人物です。壬申の命式は「大河が山の麓を流れる」イメージで、知性と実行力が高いレベルで融合しています。周囲の空気を読む力が高く、どんな環境にも自然に溶け込めます。恋愛では相手の知性と自由さを重視し、束縛を嫌います。思考と感情の間で揺れることが多く、決断に時間がかかる場面もあるでしょう。',
    '壬申_従旺格': '命式全体に水の気が満ちており、知の深さが際立つ探求者のような人物です。表面は穏やかで流れるように人に合わせますが、内側には深海のような思考の世界があります。洞察力と分析力に優れ、物事の本質を静かに観察し続けます。恋愛では精神的なつながりを最も重視し、会話の中で心が通じ合う瞬間に喜びを感じます。感情の波が大きく、気持ちが揺れているときほど自分の殻に閉じこもりやすいでしょう。',
    '癸酉_普通格局': '繊細な感受性と磨かれた美意識を持つ、芸術肌の人物です。癸酉の命式は「清らかな水が宝石を磨く」イメージで、洗練された感性と内省的な深みがあります。表面はクールで自立して見えますが、内面には豊かな感情があり、信頼した相手にだけ見せる温かさがあります。恋愛では感覚的に合う相手かどうかを重視し、直感で動くタイプです。傷つきやすく、批判に対して必要以上に敏感になることがあるでしょう。',
    '癸酉_従旺格': '命式全体に水の気が充満しており、清らかな知性と直感の鋭さを持つ人物です。静水のように見えても底知れぬ深さがあり、表面からは読めない複雑な内面世界を持っています。芸術や精神世界への造詣が深く、見えないものを感じ取る力があります。恋愛では魂が通じ合う関係を求め、軽薄な付き合いには興味を持てません。自分の感情を整理するのに時間がかかり、思っていることをうまく言語化できないことがあるでしょう。',
    '甲戌_普通格局': '行動力と堅実さを兼ね備えた、誠実で頼りになる人物です。甲戌の命式は「大木が乾いた大地に立つ」イメージで、逆境でも揺るがない強さがあります。責任感が強く、任されたことは最後まで全力でやり遂げます。恋愛では真剣で誠実、軽い付き合いを好まず深い絆を求めます。義務感が強いため、自分を犠牲にしてでも相手のために動こうとする面があるでしょう。',
    '甲戌_従旺格': '命式全体に木の気が圧倒的に満ちており、乾いた大地でも折れずに立つ大木のような不屈の精神を持つ人物です。信念が強く、周囲に流されない独立心があります。自分の目指す道を静かに、しかし確実に歩み続ける意志の強さが際立ちます。恋愛では対等で自立した関係を望み、依存し合うより共に成長できるパートナーを求めます。意固地になりすぎると関係が硬直するため、素直さを意識することが大切です。',
    '乙亥_普通格局': '柔らかな包容力と深い共感力を持つ、心の広い人物です。乙亥の命式は「草花が水の上に映る」イメージで、感受性と直感力に恵まれています。人の痛みに敏感で、困っている人を自然にサポートする優しさがあります。恋愛では深いつながりを求め、相手の感情に寄り添うことが得意です。自分の境界線が曖昧になりやすく、相手のペースに飲まれてしまうことがあるでしょう。',
    '乙亥_従旺格': '命式全体に木の気が満ちており、水の深みに根を張る草花のような柔軟な強さを持つ人物です。直感力と感受性が特に鋭く、言葉にならないものを感じ取る霊感的なセンスがあります。人間関係において真のつながりを何より大切にし、表面的な関係には興味を持ちません。恋愛では相手の内面を深く愛し、魂レベルの絆を求めます。感情の揺れが大きく、気持ちが落ち込むと立ち直るまでに時間がかかることがあるでしょう。',
    '丙子_普通格局': '情熱と知性が高次元で融合した、行動力のある人物です。丙子の命式は「太陽の光が水面に輝く」イメージで、明るさと洞察力を兼ね備えています。どんな環境でも明るく前向きに取り組み、周囲に活気をもたらします。恋愛では情熱的ですが、同時に相手の気持ちを敏感に察します。感情の起伏が大きく、喜びも悲しみも人より強く感じるため、情緒が不安定に見られる場合もあるでしょう。',
    '丙子_従旺格': '命式全体に火の気が充満し、水の鏡に映る太陽のような輝きを持つ人物です。内外ともにエネルギーがあふれ、その存在が場の空気を変える力があります。知的好奇心と行動力が同時に高く、思いついたら即実行するタイプです。恋愛では全力で愛し、相手に同じ熱量を求めます。感情の熱が冷めるのも早いため、持続的な関係を築くには意識的に安定を選ぶことが大切でしょう。',
    '丁丑_普通格局': '穏やかで包み込むような温かさと、内側の静かな情熱を持つ人物です。丁丑の命式は「灯火が肥沃な大地の中で燃える」イメージで、継続力と安定感があります。じっくり時間をかけて信頼関係を築き、長期的なコミットメントを大切にします。恋愛では誠実で地道、相手の小さな変化に気づく細やかさがあります。保守的な面があり、変化より安定を優先するため、新しいことへの挑戦に躊躇することがあるでしょう。',
    '丁丑_従旺格': '命式全体に火の気が充満しており、大地の中で静かに燃え続ける炉のような、揺るぎない情熱と意志を持つ人物です。表面は穏やかですが、内側には誰も消せない強い信念があります。一つのことを極めようとする集中力と持続力が際立ちます。恋愛では対等で誠実な関係を求め、パートナーを深く大切にします。自分の価値観に正直すぎるあまり、他者の意見を受け入れるのに時間がかかることがあるでしょう。',
    '戊寅_普通格局': '力強さと行動力を持ち、周囲を自然にリードする頼もしい人物です。戊寅の命式は「大山が虎の気に抱かれる」イメージで、存在感と実行力が際立っています。困難を恐れずに前進する勇気があり、周囲に安心感と活気を与えます。恋愛では積極的でストレート、相手を守り支えることに喜びを感じます。自信が強く出ると相手を無意識に支配しようとする面があるため、相手の自主性を尊重する意識が大切です。',
    '戊寅_従旺格': '命式全体に土の気が満ちており、山岳地帯の大地のような圧倒的な存在感を放つ人物です。どんな状況でも揺るがない安定感があり、その場にいるだけで人々が落ち着きます。行動と責任が伴う重厚な人格を持ち、信頼されることを最も大切にします。恋愛では守る側に自然と立ち、パートナーに安心感を与えます。頑固さが出ると自分のやり方を押し通そうとするため、相手の気持ちを聞く姿勢を忘れないようにしましょう。',
    '己卯_普通格局': '繊細な感受性と内側の芯の強さが共存する、バランスのとれた人物です。己卯の命式は「柔らかな大地が草木の気に包まれる」イメージで、人の感情を受け止める力に恵まれています。人当たりが良く、誰とでも自然に打ち解けられる社交性があります。恋愛では相手に合わせる柔軟さがありながら、大切なことについては信念を曲げません。気を遣いすぎて自分を後回しにする癖があり、時には自分の願いを素直に伝えることが大切です。',
    '己卯_従旺格': '命式全体に土の気が充満し、柔らかな大地に草木が豊かに育つような、包容力と生命力を持つ人物です。他者の感情に敏感で、誰の心もやわらかく受け止める能力があります。内側の信念は強く、外柔内剛の典型です。恋愛では相手を深く受け入れ、長期的な関係を大切に育てます。八方美人になりやすい面があり、誰にでも優しくしすぎることで本命の人への特別感が薄れることがあるでしょう。',
    '庚辰_普通格局': '知性と実行力が高いレベルで融合した、信頼できる人物です。庚辰の命式は「鋼が大地の霊気を受ける」イメージで、論理的思考と忍耐力が際立っています。物事を緻密に分析し、確実に実行する能力があります。恋愛では慎重に関係を見極め、信頼できると確信した相手にのみ心を開きます。完璧主義の傾向が恋愛にも出ると、相手に高い基準を求めて息苦しくさせることがあるでしょう。',
    '庚辰_従旺格': '命式全体に金の気が充満しており、大地の霊気に磨かれた鉱石のような、重厚かつ輝く才能を持つ人物です。鋭い判断力と問題解決能力があり、困難な状況ほど本領を発揮します。義理と責任を何より重んじる強固な倫理観の持ち主です。恋愛では誠実で粘り強く、一度決めたら長期的に大切にします。プライドが傷つくことへの耐性が低いため、自尊心を守ることへの執着が強く出ることがあるでしょう。',
    '辛巳_普通格局': '洗練された感性と内なる情熱を持つ、魅力的な人物です。辛巳の命式は「磨かれた宝石が太陽の火に輝く」イメージで、才能と美意識に恵まれています。直感力が鋭く、チャンスを素早く掴む才能があります。恋愛では魅力的なオーラがあり、自然と相手を惹きつけます。ただし自分の感情を表に出すのが苦手で、親しい人ほど素直になれない不器用さがあるでしょう。',
    '辛巳_従旺格': '命式全体に金の気が満ちており、太陽の炎でさらに磨かれた宝石のような、不屈の輝きを持つ人物です。強い意志と高い美意識を持ち、自分の基準に妥協しない姿勢が際立ちます。見せない努力を積み重ねる粘り強さがあり、結果で証明するタイプです。恋愛では理想が高く、心から尊敬できる相手でなければ本気になれません。感情を理性でコントロールしすぎると、相手にクールすぎると映ることがあるでしょう。',
    '壬午_普通格局': '表面的には穏やかで聡明な印象を与えつつも、内面には熱い情熱を秘めた人物です。知的に見られることが多いですが、実は義理人情に厚く、一度心を許した相手にはどこまでも深い愛情を注ぎます。鋭い観察眼と優れた分析力を持ち、物事の本質を瞬時に見抜く力がありますが、好き嫌いがはっきりしているため、心を閉ざした相手にはクールな一面を見せることもあるでしょう。',
    '壬午_従旺格': '命式全体に水の気が充満し、情熱の炎と知の深さが共鳴する稀有な人物です。一見矛盾した二面性を持ちながら、それが独自の魅力となっています。感情の深さと知性の高さが共存し、周囲を引きつけるカリスマ性があります。恋愛では激しく深く愛し、相手の内面すべてを理解したいという強い欲求があります。感情の振れ幅が大きいため、情緒の波を自覚し安定させる工夫が大切でしょう。',
    '癸未_普通格局': '落ち着いた包容力と繊細な感性を持つ、深みのある人物です。癸未の命式は「清らかな水が豊かな大地を潤す」イメージで、人を育て支える力があります。場の空気を読む能力が高く、自然と調和役になります。恋愛では深く長く愛するタイプで、安定した関係を何より大切にします。優しさゆえに断れないことが多く、自分の感情より相手を優先しすぎることがあるでしょう。',
    '癸未_従旺格': '命式全体に水の気が満ちており、豊かな大地を静かに潤す清水のような、深い愛情と包容力を持つ人物です。人の感情に敏感で、言葉にならない痛みや喜びを感じ取れます。人を支え助けることに強い使命感を持ちます。恋愛では헌신的で深い愛情を持ちますが、相手に合わせすぎて自分を失うことがあります。内なる感情の豊かさを表現する場を持つことで、よりいきいきと輝ける人物です。',
    '甲申_普通格局': '鋭い知性と行動力を持ち、物事を戦略的に進める人物です。甲申の命式は「大木が金属の気に刻まれる」イメージで、強靭な精神と実行力があります。困難に直面すると逆に燃えるタイプで、競争環境で力を発揮します。恋愛では自立した関係を好み、お互いの成長を尊重し合えるパートナーシップを理想とします。プライドが高く、弱みを見せることへの抵抗感が強い面があるでしょう。',
    '甲申_従旺格': '命式全体に木の気が充満し、金属の試練にも折れない大木のような、強靭な精神力を持つ人物です。逆境が成長の糧となり、困難な状況ほど真価を発揮します。独立心が強く、自分の道を自分で切り開く意志があります。恋愛では対等な関係を何より重視し、一方的な支配や依存を嫌います。強さの裏に隠れた孤独感があり、信頼できる相手にだけ弱さを見せられる人物です。',
    '乙酉_普通格局': '繊細な美意識と知的な魅力を持つ、洗練された人物です。乙酉の命式は「草花が宝石の光に照らされる」イメージで、感性と知性の調和があります。審美眼が高く、美しいもの良いものへのこだわりが生活全体ににじみ出ます。恋愛では相手の内外の美しさを重視し、共に上質な時間を過ごすことを大切にします。批評家的な目が恋愛に向くと、相手の欠点が気になりすぎることがあるでしょう。',
    '乙酉_従旺格': '命式全体に木の気が満ちており、宝石の輝きに映えるしなやかな草花のような、繊細さの中に確かな強さを持つ人物です。美への感受性が鋭く、それが才能として開花しやすい命式です。内省的で自分の世界観を大切にしながら、それを外の世界に美しく表現します。恋愛では感覚が合う相手かどうかを最も重視します。自分の繊細さを守るために壁を作りやすく、心を開くまでに時間がかかるでしょう。',
    '丙戌_普通格局': '情熱と誠実さを兼ね備えた、義侠心の強い人物です。丙戌の命式は「太陽の炎が乾いた大地を照らす」イメージで、実行力と信念の強さがあります。正直で裏表がなく、自分の信じることに真っ直ぐに突き進みます。恋愛では一途で深く愛し、相手を守るために全力を尽くします。熱くなりすぎると周囲への配慮を忘れ、空回りしやすい面があるでしょう。',
    '丙戌_従旺格': '命式全体に火の気が充満し、乾いた大地でさらに激しく燃える炎のような、強烈な存在感と情熱を持つ人物です。信念のために全力で闘う姿勢が周囲を圧倒します。正義感が強く、不公平を見ると黙っていられません。恋愛では全力で愛し、パートナーのためなら何でもする献身性があります。感情の温度が高すぎると、相手が受け止めきれないと感じることがあるでしょう。',
    '丁亥_普通格局': '深い感受性と直感力を持つ、神秘的な魅力の人物です。丁亥の命式は「灯火が深い水の底で輝く」イメージで、他者の見えないものを感じ取る鋭さがあります。表面は穏やかでミステリアス、内側には消えることのない温かい炎があります。恋愛では表面だけでなく相手の本質を見通し、深いつながりを求めます。感情が揺れると自分の殻に閉じこもりやすく、思っていることを言語化するのが難しい場面があるでしょう。',
    '丁亥_従旺格': '命式全体に火の気が充満し、深い水底に揺れる炎のような、相反する力を内包した複雑で魅力的な人物です。直感が鋭く、霊感的なセンスを持ちます。内省的で深い思考を持ちながら、大切な人への感情は燃えるように激しいです。恋愛では魂のつながりを求め、表面的な関係には満足できません。強烈な内面世界を持つため、理解し合える相手を見つけるまでに時間がかかることがあるでしょう。',
    '戊子_普通格局': '安定感と知性を兼ね備えた、頼りになる人物です。戊子の命式は「大地が水の気を蓄える」イメージで、包容力と論理的思考が融合しています。冷静に状況を判断し、揺るぎない存在感で周囲を安心させます。恋愛では落ち着いた関係を好み、精神的な成熟度を重視します。感情を理性でコントロールしすぎると、相手に冷たく映ることがあるため、温かさを意識して表現することが大切です。',
    '戊子_従旺格': '命式全体に土の気が圧倒的に満ちており、大きな川も静かに飲み込む大地のような、圧倒的な包容力を持つ人物です。何事も動じない精神的な安定があり、周囲の人が自然と頼りにします。知的で冷静、感情より長期的な判断を重視します。恋愛では相手に安心感を与え、時間をかけて深い関係を築きます。感情表現の少なさから、本心が伝わらないと感じさせることがあるでしょう。',
    '己丑_普通格局': '穏やかで誠実、地道な努力を惜しまない信頼感のある人物です。己丑の命式は「田畑の土が肥沃な大地に重なる」イメージで、持続力と実直さが際立っています。自分のペースを守りながら確実に前進し、言ったことは必ず実行します。恋愛では誠実で一途、軽い関係を好まず長期的な絆を大切にします。変化への対応が遅いため、新しい状況への適応に時間がかかることがあるでしょう。',
    '己丑_従旺格': '命式全体に土の気が充満し、二重の大地が重なるような揺るぎない安定感と誠実さを持つ人物です。信頼を最も大切にし、その信頼を守るためなら多大な努力を惜しみません。目立たない日々の積み重ねで確かな実力をつけるタイプです。恋愛では時間をかけて深い信頼関係を育て、一度結ばれた縁を長く大切にします。保守的な面が強く、価値観の違う相手との関係には多くのエネルギーが必要でしょう。',
    '庚寅_普通格局': '勇気と行動力があり、困難に立ち向かう強さを持つ人物です。庚寅の命式は「鋼の意志が虎の気に乗る」イメージで、推進力と競争心が強いです。チャレンジ精神が旺盛で、大きな目標に向かって果敢に進みます。恋愛では積極的でストレートにアプローチし、相手を全力で口説きます。感情より行動が先走ることが多く、相手の気持ちをゆっくり確認する姿勢も大切でしょう。',
    '庚寅_従旺格': '命式全体に金の気が充満し、虎の勇気を持つ鋼のような、圧倒的な強さとエネルギーを持つ人物です。どんな障害も力で突破しようとする不屈の精神があります。独立心が強く、自分の力で運命を切り開くことに誇りを持ちます。恋愛では圧倒的な存在感と頼もしさで相手を惹きつけます。負けず嫌いが強すぎると、パートナーとも競い合う構図になることがあるため注意が必要です。',
    '辛卯_普通格局': '繊細な感性と確かな実力を持つ、しなやかな強さの人物です。辛卯の命式は「磨かれた宝石が草花に包まれる」イメージで、美意識と優しさが融合しています。表面は柔らかく穏やかですが、芯には折れない信念があります。恋愛では美しいものへのこだわりと感受性の豊かさが、相手を魅了します。傷つきやすい繊細さがあり、批判的な言葉に必要以上に傷つくことがあるでしょう。',
    '辛卯_従旺格': '命式全体に金の気が充満し、草木のしなやかさに磨かれた宝石の強さを持つ人物です。外見の柔らかさと内面の鋭さが共存する独特の魅力があります。審美眼が高く、才能を美しい形で表現する力があります。恋愛では感覚的に一致する相手を直感で選び、深い絆を育みます。自分の美意識と相手の現実のギャップにフラストレーションを感じることがあるでしょう。',
    '壬辰_普通格局': '知的で包容力があり、大器晩成型の深みを持つ人物です。壬辰の命式は「大河が龍の気に乗る」イメージで、スケールの大きな思考と行動力があります。表面はクールですが内側に深い情熱があり、時間をかけて大きなことを成し遂げます。恋愛では最初はゆっくりと関係を深め、信頼できると確信した相手には深く誠実に向き合います。決断に時間がかかる傾向があり、チャンスを逃すことがあるでしょう。',
    '壬辰_従旺格': '命式全体に水の気が充満し、龍のように天地を駆ける圧倒的な知性と洞察力を持つ人物です。物事の本質を深いところで理解し、長期的な視点で戦略を立てる力があります。カリスマ的な吸引力があり、自然とリーダーの立場に立ちます。恋愛では深い精神的つながりを求め、表面的な関係には満足しません。感情の波が大きいとき周囲に影響を与えるため、自己管理の意識が大切でしょう。',
    '癸巳_普通格局': '静かな知性と内なる情熱を持つ、神秘的な魅力の人物です。癸巳の命式は「清らかな雨水が炎の気を受ける」イメージで、感性と直感の鋭さが際立っています。表面は謙虚で落ち着いて見えますが、内側には強い意志と情熱があります。恋愛では相手の内面を見抜く洞察力があり、真実の愛を求めます。感情と理性のバランスを取るのが難しく、どちらかに振れて混乱することがあるでしょう。',
    '癸巳_従旺格': '命式全体に水の気が充満し、炎の気と相互作用して神秘的なエネルギーを持つ人物です。感性が研ぎ澄まされており、見えない世界を感じ取るセンスがあります。表面的な世界より本質を追い求め、精神的な深みを持ちます。恋愛では相手の魂を見ようとする深い眼差しがあり、本物のつながりを求めます。現実的な側面より理想を優先しすぎることがあるため、地に足のついた視点も大切でしょう。',
    '甲午_普通格局': '情熱と信念を持ち、まっすぐに生きる人物です。甲午の命式は「大木が情熱の炎に燃え立つ」イメージで、行動力と向上心があります。目標に向かって全力で走るエネルギーがあり、周囲を引っ張るリーダーシップがあります。恋愛では情熱的かつ誠実で、好きな相手に一途に向き合います。自分の信念が強すぎると相手の意見を聞けなくなるため、受け入れる姿勢も大切でしょう。',
    '甲午_従旺格': '命式全体に木の気が充満し、情熱の炎に燃え立つ大木のような、圧倒的な生命力と向上心を持つ人物です。どんな困難も成長の機会と捉える強靭な精神があります。理想が高く、自分にも他者にも高い基準を求めます。恋愛では深く本気で愛し、相手の成長を全力で応援します。完璧主義がパートナーへの期待に向くと、プレッシャーを与えてしまうことがあるでしょう。',
    '乙未_普通格局': '温かみと粘り強さを持つ、人間味あふれる人物です。乙未の命式は「草花が肥沃な夏の大地に根付く」イメージで、柔軟性と生命力があります。人を大切にする気持ちが強く、関係を長く育てることに喜びを感じます。恋愛では相手の気持ちに寄り添い、自分より相手の幸せを優先する傾向があります。尽くしすぎて相手を甘やかしてしまうことがあり、適切な距離感を保つ意識が大切です。',
    '乙未_従旺格': '命式全体に木の気が充満し、夏の大地で力強く育つ草花のような、生命力と包容力を持つ人物です。人と人のつながりを最も大切にし、周囲を温かく包み込む存在です。相手の気持ちを受け止める容量が大きく、自然と相談される存在になります。恋愛では深く愛し、相手の存在に生き甲斐を感じます。感情移入が深すぎると相手の問題を自分のことのように抱え込み、精神的に消耗することがあるでしょう。',
    '丙申_普通格局': '明るい行動力と知的な戦略眼を持つ、バランスのとれた人物です。丙申の命式は「太陽の輝きが鋭い金属の気と交差する」イメージで、魅力と実力を兼ね備えています。社交的で場の雰囲気を盛り上げながら、内側では冷静に物事を分析しています。恋愛ではロマンティックで積極的、しかし同時に相手の本質を見極めようとします。気が多い面があり、一つのことに深く集中するのが苦手な場合もあるでしょう。',
    '丙申_従旺格': '命式全体に火の気が充満し、金属を溶かす炎のような圧倒的なエネルギーと変革力を持つ人物です。停滞を嫌い、常に前進しようとするパワーがあります。知的で行動的、アイデアを即座に実行に移す能力があります。恋愛では情熱的かつスマートに相手にアプローチし、その存在感で惹きつけます。エネルギーが強すぎると相手が圧倒されることがあるため、ペースを合わせる意識が大切です。',
    '丁酉_普通格局': '繊細な感性と内なる輝きを持つ、独特の魅力の人物です。丁酉の命式は「灯火が磨かれた鏡に映る」イメージで、洞察力と芸術的センスがあります。表面は控えめですが、内側に強いこだわりと美意識があります。恋愛では相手を深く観察し、本質的な美しさを見出します。完璧主義が出ると自分にも相手にも厳しくなりすぎることがあるでしょう。',
    '丁酉_従旺格': '命式全体に火の気が充満し、磨かれた金属の鏡に映る炎のような、鋭い知性と内なる情熱を持つ人物です。洞察力が鋭く、人の本音や隠れた才能を見抜く力があります。芸術や美への感受性が特に高く、それを表現する才能があります。恋愛では相手の内面的な美しさを最も重視し、見た目や肩書きより本質で人を選びます。感情を直接表現することが苦手で、好意が伝わりにくいことがあるでしょう。',
    '戊戌_普通格局': 'どっしりとした安定感と揺るぎない信念を持つ、存在感の大きな人物です。戊戌の命式は「大山が大地に重なる」イメージで、精神的な重厚さと持続力があります。時間をかけてでも確実に目標を達成する意志の強さがあります。恋愛では慎重に関係を深め、一度決めたら長期的にコミットします。変化を嫌い保守的になりすぎると、関係が硬直することがあるため柔軟性も大切です。',
    '戊戌_従旺格': '命式全体に土の気が圧倒的に充満し、二重の山が重なるような絶対的な存在感と不動の意志を持つ人物です。精神的な強さが際立ち、どんな嵐にも揺るがない安定があります。深い思慮と忍耐力があり、長期的な視点で物事を判断します。恋愛では時間をかけて絆を深め、一生守ると決めた相手に全力を尽くします。頑固さが強く出ると他者の意見を受け入れにくくなるため、柔軟な姿勢を意識しましょう。',
    '己亥_普通格局': '柔らかな包容力と深い感受性を持つ、人を引きつける温かい人物です。己亥の命式は「柔らかな土地が水の気に潤される」イメージで、感情の豊かさと人への思いやりがあります。誰に対しても分け隔てなく優しく、困っている人を放っておけません。恋愛では感情移入が深く、相手の気持ちを自分のことのように感じます。境界線が曖昧になりやすく、感情的に巻き込まれすぎることがあるでしょう。',
    '己亥_従旺格': '命式全体に土の気が充満し、深い水に潤された大地のような、生命力あふれる包容力と感受性を持つ人物です。人の気持ちを吸収する能力が非常に高く、その場の感情を敏感に察します。母なる大地のような大きな愛情を持ち、人を育て支えることに喜びを感じます。恋愛では深く献身的に愛しますが、自分を犠牲にしすぎることがあります。時には自分の感情と境界線を大切にすることが必要でしょう。',
    '庚子_普通格局': '鋭い知性と決断力を持つ、頭の回転が速い人物です。庚子の命式は「鋼の意志が知の泉に浸される」イメージで、論理的思考と実行力が融合しています。冷静に物事を分析し、的確に判断する能力があります。恋愛では頭で考えすぎる傾向があり、感情より論理で関係を評価しがちです。パートナーに対して感情より言語で愛情を示す傾向があるため、温かさを行動でも表現することが大切でしょう。',
    '庚子_従旺格': '命式全体に金の気が充満し、知の泉に磨かれた鋼のような、冷静な判断力と深い知性を持つ人物です。思考の鋭さと洞察力は際立っており、本質をクリアに見通します。知的な会話と論理的な問題解決に喜びを感じます。恋愛では知的に対等で自立した関係を理想とし、精神的に刺激し合えるパートナーを求めます。感情より頭が先に動くため、ロマンティックな表現が少なく冷たく見られることがあるでしょう。',
    '辛丑_普通格局': '地道な努力と高い美意識を持つ、誠実で信頼できる人物です。辛丑の命式は「磨かれた宝石が大地に守られる」イメージで、才能と堅実さが融合しています。目立つことを好まずに内側から着実に力をつけます。恋愛では誠実で一途、派手さはなくても深い愛情を持ちます。自分の感情を内にため込みやすく、不満を伝えずに溜め込んでしまうことがあるでしょう。',
    '辛丑_従旺格': '命式全体に金の気が充満し、大地に守られた宝石のような、揺るぎない価値と美しさを持つ人物です。自分の才能と美意識を深い確信を持って表現します。地道な積み重ねで磨かれた実力は、長い目で見ると輝き続けます。恋愛では理想の高さと誠実さを兼ね備え、信頼できる相手にのみ心を開きます。頑固で妥協を嫌う面が恋愛に出ると、関係が窮屈になることがあるでしょう。',
    '壬寅_普通格局': '知性と勇気を持ち、新しい道を開拓する力のある人物です。壬寅の命式は「大河が虎の勢いと融合する」イメージで、知的好奇心と行動力があります。思考力と実行力が高いレベルで融合しており、アイデアを現実に変える力があります。恋愛では知的で行動的なアプローチをし、相手を知的に刺激します。飽きっぽい面があり、関係に変化がないと物足りなく感じることがあるでしょう。',
    '壬寅_従旺格': '命式全体に水の気が充満し、虎のように知性と行動力を融合した、圧倒的な推進力を持つ人物です。知的好奇心が尽きることなく、常に新しい世界を探求しようとします。洞察力と行動力が同時に発揮されるとき、驚くべき結果を生み出します。恋愛では相手の知性と自立心を重視し、一緒に成長できる関係を求めます。感情より知性が先に立ちやすく、相手に冷静すぎると思われることがあるでしょう。',
    '癸卯_普通格局': '穏やかな外見の中に鋭い感受性と洞察力を持つ、深みのある人物です。癸卯の命式は「清らかな水が柔らかな草木に染み込む」イメージで、感性と思いやりに恵まれています。人の気持ちを敏感に察し、言葉にしなくても相手の状態を理解します。恋愛では深い感情的つながりを求め、相手の内面を丁寧に理解しようとします。自分の感情を処理するのに時間が必要で、精神的な疲れを一人で溜め込みやすいでしょう。',
    '癸卯_従旺格': '命式全体に水の気が充満し、草木をしっとりと潤す清水のような、深い感性と包容力を持つ人物です。人の感情の機微を言語化できない部分まで感じ取る能力があります。内省的で豊かな内面世界を持ち、それが独自の魅力となっています。恋愛では精神的なつながりを何より大切にし、相手の内面の美しさを愛します。感受性が強いため、環境や相手の感情に影響されやすく、自分を保つエネルギーが必要です。',
    '甲辰_普通格局': '視野が広く、スケールの大きな目標を持つ人物です。甲申の命式は「大木が龍の霊気を受ける」イメージで、理想と実行力が融合しています。大きなビジョンを持ちながら、着実に実現していく力があります。恋愛では誠実で真剣、相手を深く尊重します。目標が大きいため、パートナーに対して自分の夢を優先しすぎることがあるでしょう。',
    '甲辰_従旺格': '命式全体に木の気が充満し、龍のエネルギーを受けた大木のような、壮大な可能性と強靭な生命力を持つ人物です。理想の高さと実行力が共に際立ち、大きな目標を持って人生を歩みます。周囲に自然と希望を与えるリーダーシップがあります。恋愛では相手を対等なパートナーとして尊重し、共に大きな夢を歩める人を求めます。理想が高すぎると現実の相手に幻滅することがあるでしょう。',
    '乙巳_普通格局': '柔軟性と内なる情熱を持つ、変化への適応力が高い人物です。乙巳の命式は「草花が太陽の炎に輝く」イメージで、感性と生命力が際立っています。変化する環境の中でも自分らしさを失わず、しなやかに対応できます。恋愛では感情表現が豊かで、相手への思いをストレートに伝えます。気持ちの切り替えが早い反面、深い絆より新鮮さを求めすぎることがあるでしょう。',
    '乙巳_従旺格': '命式全体に木の気が充満し、太陽の炎を浴びて輝く草花のような、輝かしいエネルギーと感受性を持つ人物です。内なる情熱と外の世界への感受性が融合した独自の魅力があります。変化を恐れず、むしろ変化の中で最も輝きます。恋愛では情熱的で行動的、相手への感情を全力で表現します。感情の振れ幅が大きく、情熱が冷めると急に関係が変わることがあるため、安定を意識することが大切でしょう。',
    '丙午_普通格局': '最も情熱的で行動力に満ちた、太陽のような存在感を持つ人物です。丙午の命式は「太陽が情熱の星の上に輝く」二重の火のイメージで、エネルギーと輝きが際立っています。人を惹きつける圧倒的なカリスマ性があり、その場を明るく照らします。恋愛では情熱的かつストレート、相手に全力でアプローチします。熱しやすく冷めやすい面があり、関係の維持には意識的な努力が必要でしょう。',
    '丙午_従旺格': '命式全体に火の気が圧倒的に充満し、二重の太陽のような灼熱のエネルギーと存在感を持つ人物です。生まれながらのカリスマで、どんな場所でも自然と中心になります。情熱と行動力は群を抜いており、多くの人をその炎で照らします。恋愛では燃えるように深く愛し、パートナーにも同じ熱量を求めます。感情の炎が強すぎると関係を燃やし尽くすことがあるため、冷静さとのバランスが大切です。',
    '丁未_普通格局': '温かみと粘り強さを持つ、人の心を動かす力のある人物です。丁未の命式は「穏やかな炎が豊かな大地を温める」イメージで、継続力と人への思いやりが際立っています。じっくりと関係を温め、長期的に人の心に働きかける力があります。恋愛では誠実で穏やか、相手への深い愛情を地道な行動で示します。保守的な面が出ると変化を恐れて関係が停滞することがあるでしょう。',
    '丁未_従旺格': '命式全体に火の気が充満し、豊かな大地を長く温め続ける炎のような、穏やかだが揺るぎない情熱を持つ人物です。表面の温かさの奥に、消えることのない強い意志があります。長期的なコミットメントを大切にし、時間をかけて築いた関係を何より重視します。恋愛では時間をかけて深い信頼を築き、真剣に向き合います。変化への適応が遅く、状況が変わったときに戸惑うことがあるでしょう。',
    '戊申_普通格局': '安定感と行動力を持つ、頼りがいのある人物です。戊申の命式は「大地が鋭い金属の気を宿す」イメージで、実用性と堅実さが融合しています。目標に向かって着実に動き、結果を出す力があります。恋愛では信頼性と安定感を最も大切にし、軽い付き合いには興味がありません。変化を嫌い保守的になりすぎると、相手に窮屈さを感じさせることがあるでしょう。',
    '戊申_従旺格': '命式全体に土の気が充満し、鋭い金属を内包する大地のような、圧倒的な安定感と潜在的な鋭さを持つ人物です。外は穏やかですが、内には強い判断力と意志があります。何事にも堅実に取り組み、信頼される存在です。恋愛では長期的な関係を最優先し、パートナーに深い安心感を与えます。感情表現が苦手で、愛情をどう伝えるか悩む場面があるでしょう。',
    '己酉_普通格局': '謙虚さと確かな実力を持つ、誠実な人物です。己酉の命式は「田畑の土が宝石を磨く」イメージで、丁寧な努力と美意識が融合しています。目立たない場所でコツコツと力をつけ、時が来たときに輝きを放ちます。恋愛では控えめながらも誠実で、相手への細やかな気遣いが際立ちます。自己評価が低くなりやすく、自分の魅力を十分に信じられないことがあるでしょう。',
    '己酉_従旺格': '命式全体に土の気が充満し、宝石を静かに磨き続ける大地のような、謙虚さの中に揺るぎない価値を持つ人物です。実力より謙虚さを前面に出すため、その才能が外から見えにくいことがあります。一度信頼した相手への誠実さは本物で、長期的に深い関係を大切にします。恋愛では真剣で一途、目立たないながら深い愛情を持ちます。自分の感情を後回しにしやすく、パートナーへの不満をため込まないことが大切です。',
    '庚戌_普通格局': '強い意志と誠実さを持つ、信頼の厚い人物です。庚戌の命式は「鋼が乾いた大地に宿る」イメージで、粘り強さと正直さが際立っています。自分に厳しく、言ったことは必ず実行する実直さがあります。恋愛では誠実で真剣、相手への約束を大切にします。頑固すぎると周囲との関係に摩擦が生まれることがあるため、柔軟性も意識しましょう。',
    '庚戌_従旺格': '命式全体に金の気が充満し、乾いた大地で鍛えられた鋼のような、強靭な意志と誠実さを持つ人物です。自分の価値観と信念を生き様で体現する、骨太な人格があります。困難な状況でも義理と誠実さを曲げない強さがあります。恋愛では一途で真剣、一度決めたら長期的にパートナーを大切にします。融通が利かない面があり、相手に合わせることへの抵抗感が強い場合があるでしょう。',
    '辛亥_普通格局': '繊細な感受性と鋭い知性を持つ、神秘的な魅力の人物です。辛亥の命式は「磨かれた宝石が深い水の気に包まれる」イメージで、洞察力と感性の鋭さがあります。表面はクールで独立的に見えますが、内側に豊かな感情世界があります。恋愛では相手の本質を見抜く力があり、魂が通じ合う関係を求めます。内面を見せることへの恐れから、心を開くまでに時間がかかることがあるでしょう。',
    '辛亥_従旺格': '命式全体に金の気が充満し、深い水の気に抱かれた宝石のような、孤高の輝きと深い感性を持つ人物です。鋭い洞察力と独自の美意識が融合した稀有な才能があります。内省的で精神世界が豊かで、芸術や哲学への感受性が際立っています。恋愛では魂の深い部分で共鳴できる相手を求め、妥協を嫌います。理想が高すぎて現実の相手に幻滅することがあるため、相手の人間らしさを愛する視点も大切でしょう。',
    '壬子_普通格局': '知性と感受性が高いレベルで融合した、深みのある人物です。壬子の命式は「大河が清らかな水源から流れ出す」二重の水のイメージで、洞察力と流動性があります。物事の深いところを理解し、直感と論理の両方で判断します。恋愛では知的なつながりと感情的な深さを同時に求めます。感情の波が大きく、内面で嵐が起きているときでも外からはわかりにくいことがあるでしょう。',
    '壬子_従旺格': '命式全体に水の気が圧倒的に充満し、二重の水が渦を巻くような、底知れない知性と感受性を持つ人物です。人の深層心理を読む力が特に鋭く、言葉の裏にある意図を感じ取ります。思考の深さと広さは際立っており、複雑な問題を多角的に分析する力があります。恋愛では深い精神的つながりを求め、表面的な関係には興味がありません。内面世界が豊かすぎて孤独を感じやすく、本当に理解してくれる相手を求めているでしょう。',
    '癸丑_普通格局': '内省的な知性と安定した誠実さを持つ、深みのある人物です。癸丑の命式は「清らかな水が肥沃な大地に染み込む」イメージで、思慮深さと持続力が際立っています。目立たないながらも着実に力を蓄え、長期的に信頼を積み上げます。恋愛では誠実で一途、相手の内面を深く理解しようとします。自分の感情をためてから一度に出す傾向があり、感情表現にタイムラグがあることがあるでしょう。',
    '癸丑_従旺格': '命式全体に水の気が充満し、肥沃な大地を潤し続ける清水のような、静かで揺るぎない誠実さと深みを持つ人物です。表面は穏やかで目立ちませんが、内側には豊かな感情世界と強い信念があります。人を長期的に支え続ける持続力と包容力が際立っています。恋愛では時間をかけて深い信頼関係を築き、一度心を許した相手には揺るぎない愛情を注ぎます。自分の感情を表現するのが苦手なため、愛情が伝わりにくいことがあるでしょう。',
    '甲寅_普通格局': '強いリーダーシップと挑戦心を持つ、頼もしい人物です。甲寅の命式は「大木が虎の勢いに乗る」二重の木のイメージで、行動力と向上心が際立っています。新しいことへのチャレンジを恐れず、自分の道を切り開く力があります。恋愛では積極的でリードするタイプ、相手を守り前に進む力強さがあります。自分のペースに相手を巻き込みやすいため、相手の意見を聞く余裕も大切です。',
    '甲寅_従旺格': '命式全体に木の気が圧倒的に充満し、虎のように力強く大木が茂る、圧倒的な生命力と独立心を持つ人物です。自分の力で道を切り開く意志の強さは他の追随を許しません。リーダーとしての資質と、困難に立ち向かう勇気が際立っています。恋愛では対等で自立した関係を理想とし、弱さを見せることへの抵抗があります。強さの裏の繊細さに気づける相手とこそ、真の絆を結べるでしょう。',
    '乙卯_普通格局': '優しさと芸術的感性を持つ、繊細で魅力的な人物です。乙卯の命式は「草花が草花の気に包まれる」二重の木のイメージで、感受性と美意識が際立っています。人への思いやりが自然とあふれ、周囲を穏やかに包みます。恋愛では相手の感情に寄り添い、心のつながりを何より大切にします。傷つきやすく、強い批判や否定に弱い面があるでしょう。',
    '乙卯_従旺格': '命式全体に木の気が圧倒的に充満し、春の草花が満開に咲き乱れるような、豊かな感受性と優しさを持つ人物です。人の気持ちに共感する力が特に高く、その温かさで多くの人を癒します。芸術や美への感受性が鋭く、それを表現する才能があります。恋愛では深く感情移入し、相手を自分のことのように大切にします。感受性が強すぎると環境や人の感情に影響されすぎ、自分を見失うことがあるでしょう。',
    '丙辰_普通格局': '情熱とスケールの大きな思考を持つ、カリスマ的な人物です。丙辰の命式は「太陽の炎が龍の霊気に乗る」イメージで、輝きと大器の融合があります。理想が高く、大きなビジョンを持ちながら情熱的に行動します。恋愛では明るく情熱的、相手を全力で口説くエネルギーがあります。理想と現実のギャップに苦しむことがあり、相手にも高い理想を求めすぎることがあるでしょう。',
    '丙辰_従旺格': '命式全体に火の気が充満し、龍の霊気を受けた太陽のような、壮大なビジョンと情熱を持つ人物です。高い理想と圧倒的な行動力が融合し、大きな夢を実現しようとします。カリスマ性と感化力があり、多くの人にインスピレーションを与えます。恋愛では情熱的かつ理想主義的で、相手を自分のビジョンに巻き込もうとします。完璧主義が恋愛に向くと、相手へのプレッシャーになることがあるでしょう。',
    '丁巳_普通格局': '繊細な内面と秘めた情熱を持つ、神秘的な魅力の人物です。丁巳の命式は「灯火が巳の炎気に揺れる」二重の火のイメージで、感受性と直感力が際立っています。表面は穏やかで謙虚ですが、内側には消えることのない情熱と強い意志があります。恋愛では相手の心の奥を見抜く力があり、表面だけの関係に満足できません。感情の揺れが激しく、気持ちが不安定になると自分の殻に閉じこもりやすいでしょう。',
    '丁巳_従旺格': '命式全体に火の気が圧倒的に充満し、巳の炎に揺れる灯火のような、深い知恵と内なる情熱を持つ人物です。表面の穏やかさの奥に、誰にも消せない信念と感情の炎があります。洞察力と直感が特に鋭く、言葉にならないものを感じ取ります。恋愛では相手の内面と魂のつながりを最も重視します。感情の深さゆえに傷つきやすく、本当に信頼できる相手を見つけるまでに時間がかかるでしょう。',
    '戊午_普通格局': '大地のような安定感と情熱的なエネルギーを持つ、存在感の大きな人物です。戊午の命式は「大地が情熱の炎を宿す」イメージで、安定と行動力が融合しています。どっしりとした安心感を与えながら、情熱的に物事を動かす力があります。恋愛では真剣で情熱的、一度決めたら全力で関係を築きます。感情が高ぶると周囲への配慮を忘れ、空回りすることがあるでしょう。',
    '戊午_従旺格': '命式全体に土の気が充満し、情熱の炎を内包した大地のような、安定感と熱い信念を持つ人物です。穏やかに見えて内側に強い使命感があり、信じたことのために全力で行動します。信頼と義理を何より大切にする価値観の持ち主です。恋愛では深く誠実に愛し、パートナーのためなら自己犠牲も厭わない覚悟があります。頑固さが出ると変化に対応できなくなるため、柔軟性を意識することが大切です。',
    '己未_普通格局': '穏やかな包容力と実直な誠実さを持つ、信頼感のある人物です。己未の命式は「柔らかな田畑が豊かな夏の土に重なる」イメージで、着実さと温かみが際立っています。人間関係を丁寧に育て、長期的な信頼を積み上げます。恋愛では誠実で安定感があり、相手に深い安心感を与えます。自分を後回しにしやすく、尽くしすぎてバランスを失うことがあるでしょう。',
    '己未_従旺格': '命式全体に土の気が圧倒的に充満し、豊かな大地が重なるような、深い包容力と揺るぎない誠実さを持つ人物です。人を受け入れ支える力が際立っており、周囲の拠り所になります。目立たない献身と積み重ねで、長い時間をかけて深い信頼を築きます。恋愛では時間をかけて着実に関係を深め、安心感と誠実さで相手を包みます。変化を嫌う保守性が強く出ると、関係の発展が停滞することがあるでしょう。',
    '庚申_普通格局': '鋭い知性と実行力を持つ、頭の回転が速い人物です。庚申の命式は「鋼が金属の気に磨かれる」二重の金のイメージで、分析力と決断力が際立っています。冷静かつ迅速に状況を判断し、効率的に物事を進めます。恋愛では知性と自立心を重視し、お互いが高め合える関係を理想とします。感情より論理で関係を評価するため、情緒的なつながりを大切にする相手には不満を与えることがあるでしょう。',
    '庚申_従旺格': '命式全体に金の気が圧倒的に充満し、金属が金属を磨くような、孤高の鋭さと完成された実力を持つ人物です。思考の精度と行動の正確さは際立っており、どんな問題も冷静に解決します。自分の基準に妥協しない強い意志があります。恋愛では対等で知的な関係を理想とし、精神的に独立した相手を好みます。完璧主義が恋愛に向くと、相手に息苦しさを感じさせることがあるでしょう。',
    '辛酉_普通格局': '高い美意識と洗練された感性を持つ、上品な魅力の人物です。辛酉の命式は「磨かれた宝石がさらに宝石の輝きを受ける」二重の金のイメージで、美意識と才能が際立っています。細部への徹底したこだわりと完成度への追求心があります。恋愛では理想が高く、内外の美しさと知性を持つ相手を求めます。完璧主義が恋愛に向くと、相手の欠点が許せなくなることがあるでしょう。',
    '辛酉_従旺格': '命式全体に金の気が圧倒的に充満し、最高に磨かれた宝石のような、完璧な美意識と孤高の輝きを持つ人物です。美に関する感性と才能が際立っており、その世界においては圧倒的な存在感を放ちます。自分の価値観と美意識を妥協なく追求します。恋愛では相手に高い美的基準を求め、心から尊敬できる相手でなければ本気になれません。孤高すぎて孤立しやすい面があり、完璧より人間らしさを大切にする視点も必要でしょう。',
    '壬戌_普通格局': '知性と誠実さを持つ、信頼できる深みのある人物です。壬戌の命式は「大河が乾いた大地を潤す」イメージで、知性と持続力が融合しています。状況を冷静に見渡し、長期的な視点で判断する力があります。恋愛では誠実で真剣、相手への約束を大切にします。感情より頭で考えすぎる傾向があり、ロマンティックな表現が少なくなることがあるでしょう。',
    '壬戌_従旺格': '命式全体に水の気が充満し、乾いた大地に深く染み込む大河のような、忍耐強い知性と深い誠実さを持つ人物です。長い時間をかけて確かなものを築く力があり、大器晩成型の輝きがあります。洞察力が鋭く、物事の本質を静かに見続けます。恋愛では時間をかけて深い信頼関係を構築し、一度結んだ絆を長く大切にします。感情表現が少なく、愛情をどう伝えるかに悩む場面があるでしょう。',
    '癸亥_普通格局': '深い感受性と霊感的な直感を持つ、神秘的な魅力の人物です。癸亥の命式は「清らかな水が深い水に流れ込む」二重の水のイメージで、感性と洞察力が際立っています。目に見えない世界を感じ取る力があり、人の感情の深層まで理解します。恋愛では魂のつながりを最も大切にし、表面的な関係には興味がありません。感受性が強すぎると精神的な疲れを溜めやすいため、自分を癒す時間が必要です。',
    '癸亥_従旺格': '命式全体に水の気が圧倒的に充満し、深海のような底知れない感受性と洞察力を持つ人物です。人間の感情と深層心理への理解が極めて深く、言葉にならない何かを感じ取る能力があります。独自の精神世界を持ち、それが比類ない魅力となっています。恋愛では相手の魂の深部を愛し、表面的な関係では決して満足できません。理解してもらえない孤独を感じやすく、本当の意味でわかり合える相手を一生探し続けることがあるでしょう。',
  };

  // ══ PERSONALITY セクション書き換え ══
  var GOGYO_PERSONA = {
    '木': { name:'しなやかな竹のような人', traits:['感受性が豊か','クリエイティブ','向上心がある','柔軟'],
            descYou:'物事を深く感じ取り、美しいものに敏感な人ンダ。新しいことへの好奇心が強く、しなやかに成長し続ける力を持っているんダよ。',
            descThem:'物事を深く感じ取り、クリエイティブな発想力を持つ人ンダ。向上心が強く、成長を続けながらあなたにも刺激を与えてくれるんダよ。' },
    '火': { name:'情熱の炎のような人',    traits:['行動力がある','情熱的','カリスマ性','直感的'],
            descYou:'情熱と行動力に満ちた人ンダ。やると決めたら猪突猛進で、まわりを自然に引っ張るエネルギーを持っているんダよ。',
            descThem:'情熱と行動力を持つエネルギッシュな人ンダ。まわりを自然に引っ張るタイプで、あなたに積極的にアプローチしてくれるんダよ。' },
    '土': { name:'大地のような人',        traits:['安定感がある','誠実','忍耐強い','面倒見がいい'],
            descYou:'揺るぎない安定感と誠実さを持つ人ンダ。困ったときに頼りになる存在で、周りの人をしっかり支える力があるんダよ。',
            descThem:'誠実で安定感のある人ンダ。揺るぎない信念を持ち、あなたのそばで静かに支えてくれるタイプなんダよ。' },
    '金': { name:'輝く宝石のような人',    traits:['意志が強い','几帳面','美意識が高い','完璧主義'],
            descYou:'高い美意識と強い意志を持つ人ンダ。物事を丁寧に整え、自分の基準を妥協しないこだわりの強さがあるんダよ。',
            descThem:'美意識が高く、強い意志を持つ人ンダ。几帳面で完璧主義な一面がありながら、あなたにとって刺激的な存在になるんダよ。' },
    '水': { name:'大きな川のような人',    traits:['思慮深い','感受性が豊か','直感が鋭い','包容力がある'],
            descYou:'思考が深く、感受性がとても豊かな人ンダ。好きになったら深く愛するタイプで、自分の価値観や信念を大切にするンダよ。',
            descThem:'思慮深く、感受性が豊かな人ンダ。物事を深いところで理解し、あなたの気持ちを自然に受け止めてくれるんダよ。' },
  };
  var JISSHIN_LABEL = {
    '比肩':'同調の星','劫財':'競争の星','食神':'表現の星','傷官':'革新の星',
    '偏財':'行動の星','正財':'安定の星','偏官':'挑戦の星','正官':'誠実の星',
    '偏印':'直感の星','正印':'知性の星','─（日主）':'本命 ★'
  };
  var GOGYO_NAMES2 = ['木','木','火','火','土','土','金','金','水','水'];

  // あなた側の更新
  try {
    var myDayGogyo = GOGYO_NAMES2[myKanIdx];
    var myPersona = GOGYO_PERSONA[myDayGogyo] || GOGYO_PERSONA['水'];
    var elYouHead  = document.getElementById('pf-you-pchead');
    var elYouName  = document.getElementById('pf-you-pcname');
    var elYouTrait = document.getElementById('pf-you-pctraits');
    var elYouDesc  = document.getElementById('pf-you-pcdesc');
    if(elYouHead)  elYouHead.textContent  = 'YOU · あなた' + (myMbti ? '（'+myMbti+'）' : '');
    if(elYouName)  elYouName.textContent  = myPersona.name;
    if(elYouDesc)  elYouDesc.textContent  = myPersona.descYou;
    if(elYouTrait) elYouTrait.innerHTML   = myPersona.traits.map(function(t){ return '<span class="trait bl">'+t+'</span>'; }).join('');
  } catch(e2) {}

  // PERSONALITYセクションタイトルを相手名で動的更新
  var elPersonalityTitle = document.getElementById('pf-personality-title');
  if (elPersonalityTitle) elPersonalityTitle.textContent = ptName + (CSK.getLang()==='kr' ? '은(는) 어떤 사람인가' : 'はどんな人か');

  // 相手側の更新
  try {
    var ptDayGogyo = GOGYO_NAMES2[ptKanIdx];
    var ptPersona  = GOGYO_PERSONA[ptDayGogyo] || GOGYO_PERSONA['火'];
    var elPtHead   = document.getElementById('pf-pt-pchead');
    var elPtName   = document.getElementById('pf-pt-pcname');
    var elPtTrait  = document.getElementById('pf-pt-pctraits');
    var elPtDesc   = document.getElementById('pf-pt-pcdesc');
    if(elPtHead)  elPtHead.textContent  = 'PARTNER · ' + ptName + (ptMbti ? '（'+ptMbti+'）' : '');
    if(elPtName)  elPtName.textContent  = ptPersona.name;
    if(elPtTrait) elPtTrait.innerHTML   = ptPersona.traits.map(function(t){ return '<span class="trait pk">'+t+'</span>'; }).join('');
    // 日柱×格局120通りのプロフィール文を取得
    var ptNikchu = ptCalc.pillars.day.kan + ptCalc.pillars.day.shi;
    var ptKakuType = (ptCalc.kakukyoku && ptCalc.kakukyoku.name && ptCalc.kakukyoku.name.indexOf('従旺') >= 0) ? '従旺格' : '普通格局';
    var ptProfileKey = ptNikchu + '_' + ptKakuType;
    // 言語別プロフィール: KR モードで KR 辞書があればそちら、なければ JA にフォールバック
    var _compatLang = (window.PF_LANG && window.PF_LANG.getLang) ? window.PF_LANG.getLang() : 'jp';
    var _profilesByLang = (_compatLang === 'kr' && Object.keys(NIKCHU_PROFILES_KR).length > 0)
      ? NIKCHU_PROFILES_KR : NIKCHU_PROFILES;
    var ptProfileText = _profilesByLang[ptProfileKey] || _profilesByLang[ptNikchu + '_普通格局']
      || NIKCHU_PROFILES[ptProfileKey] || NIKCHU_PROFILES[ptNikchu + '_普通格局'] || ptPersona.descThem;
    if(elPtDesc) {
      // 相手の元命テキスト（月柱蔵干本気 × 日干）を日柱プロフィールの後に1段落で繋げる
      var ptGenmeiKey = getGenmei(ptCalc.pillars.day.kan, ptCalc.pillars.month.shi);
      var _genmeiTextsForCompat = getGenmeiTextsByLang(_compatLang);
      var ptGenmeiData = ptGenmeiKey ? _genmeiTextsForCompat[ptGenmeiKey] : null;
      if (ptGenmeiData) {
        // 元命テキストの「あなた」(jp) / 「당신」(kr) を相手の名前に差し替え
        var _replacePronoun = _compatLang === 'kr'
          ? String(ptGenmeiData.text).replace(/당신/g, ptName)
          : String(ptGenmeiData.text).replace(/あなた/g, ptName);
        elPtDesc.textContent = ptProfileText + ' ' + _replacePronoun;
      } else {
        elPtDesc.textContent = ptProfileText;
      }
    }

    // 四柱グリッド更新
    var elPillars = document.getElementById('pf-pt-pillars');
    if(elPillars && ptCalc) {
      var pp = ptCalc.pillars;
      var pillarDefs = [
        { label:'生まれ年', p:pp.year,  isDay:false },
        { label:'生まれ月', p:pp.month, isDay:false },
        { label:'本命 ★',  p:pp.day,   isDay:true  },
        { label:pp.hour?'生まれ時間':'時間不明', p:pp.hour, isDay:false },
      ];
      elPillars.innerHTML = pillarDefs.map(function(def){
        if(!def.p) return '<div style="padding:10px 8px;border-radius:10px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.04);opacity:.4;text-align:center;"><div style="font-size:9px;color:var(--muted);margin-bottom:4px;">'+def.label+'</div><div style="font-family:serif;font-size:22px;font-weight:700;">─</div><div style="font-family:serif;font-size:18px;">─</div><div style="font-size:10px;color:var(--muted);margin-top:2px;">不明</div></div>';
        var bg  = def.isDay ? 'background:rgba(201,168,76,.08);border:1px solid rgba(201,168,76,.28);' : 'background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);';
        var kC  = def.isDay ? 'color:var(--gold-l);' : '';
        var sC  = def.isDay ? 'color:var(--gold-l);' : '';
        var hC  = def.isDay ? 'color:var(--gold-dim);' : 'color:var(--muted);';
        var jl  = JISSHIN_LABEL[def.p.jisshin] || def.p.jisshin || '─';
        return '<div style="padding:10px 8px;border-radius:10px;'+bg+'text-align:center;"><div style="font-size:9px;'+hC+'margin-bottom:4px;">'+(def.isDay?'本命 ★':def.label)+'</div><div style="font-family:serif;font-size:22px;font-weight:700;'+kC+'">'+def.p.kan+'</div><div style="font-family:serif;font-size:18px;'+sC+'">'+def.p.shi+'</div><div style="font-size:10px;'+hC+'margin-top:2px;">'+jl+'</div></div>';
      }).join('');
    }

    // 命式説明テキスト更新
    var elPillarDesc = document.getElementById('pf-pt-pillardesc');
    if(elPillarDesc && ptCalc) {
      var ptKK = ptCalc.kakukyoku && ptCalc.kakukyoku.name ? ptCalc.kakukyoku.name : '';
      var ptKishin = ptCalc.kishin ? ptCalc.kishin.join('・') : '';
      elPillarDesc.textContent = ptName+'の日主は「'+ptCalc.pillars.day.kan+ptCalc.pillars.day.shi+'」ンダ。'+(ptKK?'格局は「'+ptKK+'」で、':'')+ptDayGogyo+'の気質を持つ人ンダよ。'+(ptKishin?'喜神「'+ptKishin+'」の流れに乗ったとき本領を発揮するんダ🐼':'');
    }
  } catch(e3) {}

  // ══ P2-B: 命式ベースの注意点を ASTROLOGY COMPATIBILITY に生成 ══
  (function(){
    var cautionEl = document.getElementById('pf-caution-section');
    if(!cautionEl || !myCalc || !ptCalc) return;

    var RK = {子:'午',午:'子',丑:'未',未:'丑',寅:'申',申:'寅',卯:'酉',酉:'卯',辰:'戌',戌:'辰',巳:'亥',亥:'巳'};
    var SG = {子:'丑',丑:'子',寅:'亥',亥:'寅',卯:'戌',戌:'卯',辰:'酉',酉:'辰',巳:'申',申:'巳',午:'未',未:'午'};

    var points = [];

    // 日支六冲（最重要: 生活リズム・行動パターンの衝突）
    if(RK[myCalc.pillars.day.shi] === ptCalc.pillars.day.shi){
      points.push({
        level:'high', icon:'⚡',
        title:'日支が六冲 — 行動リズムがぶつかりやすい',
        body:'あなたの日支「'+myCalc.pillars.day.shi+'」と相手の日支「'+ptCalc.pillars.day.shi+'」は六冲の関係にあるんダ。六冲とは十二支の中で真っ向から対立するペアのことンダよ。日常の行動パターンや生活リズムで「なんでそうするの？」というすれ違いが起きやすいんダ。悪い相性ではないけれど、お互いの「当たり前」が違うことを前提に話し合う習慣が大切ンダ🐼',
      });
    }

    // 月支六冲（感情リズムのズレ）
    if(RK[myCalc.pillars.month.shi] === ptCalc.pillars.month.shi){
      points.push({
        level:'mid', icon:'🌊',
        title:'月支が六冲 — 感情の波のタイミングがずれやすい',
        body:'2人の月支（「'+myCalc.pillars.month.shi+'」と「'+ptCalc.pillars.month.shi+'」）が六冲の関係ンダ。月柱は感情のリズムや、人との関わり方の傾向を示しているんダよ。あなたが「話したい」と感じるタイミングで相手が「一人でいたい」と感じる、またはその逆が起きやすいんダ。意識的にお互いのタイミングを確認し合うといいんダよ🐼',
      });
    }

    // 相剋型（日主五行の直接衝突）
    if(compat_type === '相剋型'){
      var KOKU_P = {木:'土',火:'金',土:'水',金:'木',水:'火'};
      var who_controls = KOKU_P[myGogyo]===ptGogyo ? 'あなたの'+myGogyo+'の気' : '相手の'+ptGogyo+'の気';
      var who_ctrl_by  = KOKU_P[myGogyo]===ptGogyo ? '相手の'+ptGogyo+'の気' : 'あなたの'+myGogyo+'の気';
      points.push({
        level:'mid', icon:'🔥',
        title:'日主が相剋 — エネルギーがぶつかり合いやすい',
        body:'あなたの日主「'+myGogyo+'」と相手の日主「'+ptGogyo+'」は相剋の関係ンダ。'+who_controls+'が'+who_ctrl_by+'と衝突する方向性を持っているんダよ。これは決して「悪い相性」ではなく、摩擦が2人を鍛え合い、乗り越えるほどに絆が深まるタイプの相性ンダ。ただし「なぜこんなにわかり合えないんだろう」と感じる場面では、一度立ち止まることが大事ンダよ🐼',
      });
    }

    // 大運の六冲（時期的な干渉）
    var myD = myCalc.currentDaiun, ptD = ptCalc.currentDaiun;
    if(myD && ptD && RK[myD.shi] === ptD.shi){
      points.push({
        level:'low', icon:'⏳',
        title:'現在の大運が六冲 — 今この時期は少し注意',
        body:'今の大運（あなたは「'+myD.kan+myD.shi+'」、相手は「'+ptD.kan+ptD.shi+'」）が六冲の関係にあるんダ。大運は約10年単位の運気の流れを示していて、この時期はお互いの人生の方向性がすれ違いやすい傾向があるんダよ。大きな決断をするときは特に丁寧に話し合うことが大切ンダ🐼',
      });
    }

    // 年支六冲（根本的な価値観のズレ）
    if(RK[myCalc.pillars.year.shi] === ptCalc.pillars.year.shi){
      points.push({
        level:'low', icon:'🌱',
        title:'年支が六冲 — 育った環境・価値観の根本が違う',
        body:'2人の年支（「'+myCalc.pillars.year.shi+'」と「'+ptCalc.pillars.year.shi+'」）が六冲の関係ンダ。年柱は育った環境や、価値観の根っこを示しているんダよ。「なんでそんなことが当たり前なの？」という根本的な驚きが時々起きやすいんダ。違いを否定せず、「なるほどそういう育ち方をしたんだ」と好奇心を持って接することが、この関係を豊かにするカギンダ🐼',
      });
    }

    // 注意点なし
    if(points.length === 0){
      cautionEl.innerHTML =
        '<div style="background:rgba(100,200,80,.05);border:1px solid rgba(100,200,80,.15);border-radius:12px;padding:14px 16px;margin-top:4px;">'
        +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">'
        +'<span style="font-size:14px;">✅</span>'
        +'<span style="font-family:serif;font-size:13px;font-weight:700;color:rgba(100,200,80,.85);">命式に大きな注意点は見当たらないんダ</span>'
        +'</div>'
        +'<div style="font-size:13px;color:rgba(232,228,217,.65);line-height:1.9;font-family:serif;">2人の日支・月支・年支に六冲が見当たらず、命式上の強い衝突要素がないんダよ。これはとても良い兆しンダ🐼 相性の良い部分を活かして、お互いの関係を丁寧に育てていってほしいんダ。</div>'
        +'</div>';
      return;
    }

    // レベル別スタイル
    var LEVEL_STYLE = {
      high: {bg:'rgba(200,80,60,.06)',bd:'rgba(200,80,60,.2)',tc:'rgba(210,100,80,.9)',ic:'rgba(210,100,80,.7)'},
      mid:  {bg:'rgba(220,150,50,.05)',bd:'rgba(220,150,50,.18)',tc:'rgba(220,160,60,.9)',ic:'rgba(220,160,60,.65)'},
      low:  {bg:'rgba(180,160,100,.04)',bd:'rgba(180,160,100,.15)',tc:'rgba(200,185,130,.8)',ic:'rgba(200,185,130,.55)'},
    };

    var heading = '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">'
      +'<span style="font-size:15px;">⚠️</span>'
      +'<span style="font-family:serif;font-size:14px;font-weight:800;color:rgba(210,130,90,.95);">ちょっと気をつけてほしいんダ</span>'
      +'</div>';

    var items = points.map(function(p){
      var s = LEVEL_STYLE[p.level] || LEVEL_STYLE.low;
      return '<div style="background:'+s.bg+';border:1px solid '+s.bd+';border-radius:11px;padding:12px 15px;margin-bottom:10px;">'
        +'<div style="display:flex;align-items:center;gap:6px;margin-bottom:7px;">'
        +'<span style="font-size:13px;">'+p.icon+'</span>'
        +'<span style="font-family:serif;font-size:12px;font-weight:700;color:'+s.tc+';">'+p.title+'</span>'
        +'</div>'
        +'<div style="font-size:12px;color:rgba(232,228,217,.7);line-height:1.9;font-family:serif;">'+p.body+'</div>'
        +'</div>';
    }).join('');

    cautionEl.innerHTML = '<div style="margin-top:4px;">'+heading+items+'</div>';
  })();

  // HOW THEY SEE YOU セクションタイトルを相手名で動的更新
  var elHowseeTitle = document.getElementById('pf-howsee-title');
  if (elHowseeTitle) elHowseeTitle.textContent = ptName + (CSK.getLang()==='kr' ? '이(가) 당신을 어떻게 생각하고 있는가' : 'があなたをどう思っているか');

  // ══ think-body / think-chips 書き換え ══
  var GOGYO_NAMES={木:'木の気（創造・感受性）',火:'火の気（情熱・行動力）',土:'土の気（安定・誠実）',金:'金の気（意志・美意識）',水:'水の気（直感・包容力）'};
  var tb1=document.getElementById('pf-think-body1');
  var tc1=document.getElementById('pf-think-chips1');

  // ── 五行名称（HOW THEY SEE YOU 用）──────────────────────────────
  var GN = {
    木:'木（創造・感受性）', 火:'火（情熱・行動力）',
    土:'土（安定・誠実さ）', 金:'金（意志・鋭さ）', 水:'水（直感・包容力）'
  };
  var GN_SHORT = { 木:'創造性', 火:'行動力', 土:'安定感', 金:'意志力', 水:'包容力' };

  // ── 五行ペア固有：相手の目にあなたがどう映るか ──────────────────
  // キー: myGogyo + '_' + ptGogyo（あなた_相手）
  var GOGYO_HOWSEE = {
    // 相生型（水→木、木→火、火→土、土→金、金→水）
    '水_木': {
      body1: ptName+'にとって、あなたは「自分の中にある可能性を引き出してくれる人」として映っているんダよ🐼 占いの世界では水は木を育てる関係ンダ。あなたのそばにいると、'+ptName+'の感性やアイデアが自然と湧き出てくる感覚があるんダよ。何かを始めようとするとき、なぜかあなたのことが頭に浮かぶ存在になっているはずンダ。あなたが特別なことをしていなくても、ただそこにいるだけで'+ptName+'の内側が動き出す、そういう関係ンダ。',
      chips1: ['存在するだけで刺激をくれる','可能性を引き出してくれる','内側から火をつけてくれる','かけがえのない存在'],
      body2: ptName+'はあなたの「深い感受性」と「静かな包容力」に、言いようのない引力を感じているんダ🐼 自分が感情的になったとき、あなたの落ち着きが安心感を与えてくれるから、'+ptName+'は無意識にあなたを求めてしまうんダよ。「この人といると自分らしくいられる」という感覚がしっかりあるはずンダ。あなたがいるだけで自分の可能性が広がると、本能的に感じているんダ。',
      chips2: ['包み込まれる安心感','自分らしくいられる','この人と一緒にいたいと思う','深く信頼できる']
    },
    '木_火': {
      body1: ptName+'にとって、あなたは「行動するエネルギーをくれる存在」として映っているんダ🐼 木は火を生む関係だから、あなたのそばにいると'+ptName+'は自然と「やってみよう」という気持ちが湧いてくるんダよ。あなたの熱量や情熱が、'+ptName+'の中に眠っていた行動力を呼び覚ます役割を果たしているんダ。あなたが誰かに何かを伝えるとき、'+ptName+'はその言葉に不思議な力を感じているはずンダ。',
      chips1: ['行動したくなる','エネルギーをもらえる','一緒にいると熱くなれる','可能性が広がる'],
      body2: ptName+'はあなたの「情熱の核心」に、自分を燃え立たせてくれるものを感じているんダ🐼 自分だけでは動き出せないとき、あなたの存在がその背中を押してくれるから、'+ptName+'はあなたをとても貴重な存在として見ているんダよ。「一緒にいると自分が最大限に動ける」という感覚がしっかりあるはずンダ。',
      chips2: ['背中を押してくれる','一緒だと力が出る','本当の自分を引き出してくれる','かけがえない']
    },
    '火_土': {
      body1: ptName+'にとって、あなたは「ここにいていいんだと思わせてくれる人」として映っているんダ🐼 火は土を生む関係で、あなたの情熱と温かさが'+ptName+'の心に安定の基盤を作ってくれているんダよ。'+ptName+'があなたのそばにいると、焦りや不安が和らいで「地に足がついた」感覚になるんダ。あなたの存在が、'+ptName+'にとって「帰る場所」のような意味を持ちはじめているはずンダ。',
      chips1: ['安心感を与えてくれる','帰る場所のような存在','焦りが消える','心の基盤になっている'],
      body2: ptName+'はあなたの「誠実さと揺るぎない芯」に、深い敬意と安心感を持っているんダ🐼 変化が多い時代の中で、'+ptName+'はあなたの安定感に「ここに根を張っていいんだ」と感じているんダよ。あなたが何か言葉を選ぶとき、その重みと真剣さが'+ptName+'には特別に響くんダ。',
      chips2: ['揺るぎない安心感','信頼の重みが違う','本音を言える相手','長く大切にしたい']
    },
    '土_金': {
      body1: ptName+'にとって、あなたは「自分の価値を引き上げてくれる存在」として映っているんダ🐼 土は金を生む関係で、あなたの安定した誠実さが'+ptName+'の意志や鋭さをより光らせてくれているんダよ。'+ptName+'があなたと一緒にいると、自分の強みがより明確になって、「これでいいんだ」という確信が持てるようになるんダ。あなたのそばが'+ptName+'にとって「自分を磨く場所」になっているはずンダ。',
      chips1: ['自分の強みが輝く','磨いてくれる存在','確信を与えてくれる','一緒にいると成長できる'],
      body2: ptName+'はあなたの「安定した温かさ」に、自分が尖りすぎたときに丸めてくれる大切さを感じているんダ🐼 意志が強い'+ptName+'だからこそ、あなたのような揺るぎない誠実さを持つ人が近くにいることの価値を知っているんダよ。あなたが話すとき、その言葉の重みに'+ptName+'はいつも引き戻されるんダ。',
      chips2: ['等身大でいられる','尖った部分を優しく包む','長くいるほど深まる','本物の信頼感']
    },
    '金_水': {
      body1: ptName+'にとって、あなたは「自分の感性を豊かにしてくれる人」として映っているんダ🐼 金は水を生む関係で、あなたの鋭い意志と美意識が'+ptName+'の感受性をさらに深めてくれているんダよ。'+ptName+'があなたと話すとき、自分の中に新しい感情や気づきが生まれることが多くて、「この人といると自分が広がる」という感覚があるはずンダ。',
      chips1: ['感性が豊かになる','気づきを与えてくれる','内面が広がる感覚','一緒にいると深くなれる'],
      body2: ptName+'はあなたの「直感と包容力」に、自分の固くなりすぎた部分を溶かしてもらえる感覚があるんダ🐼 意志が強い'+ptName+'は時に自分の世界に閉じこもりがちになるけど、あなたのそばにいると自然と心が開く感じがするんダよ。あなたが無言でいるときの安心感が、'+ptName+'には特別に響いているんダ。',
      chips2: ['心が自然と開ける','固さを溶かしてくれる','沈黙が心地よい','特別な安心感']
    },
    // 相生型（逆方向：火→木、土→火、金→土、水→金、木→水）
    '火_木': {
      body1: ptName+'にとって、あなたは「自分の枝を広げさせてくれる大地の熱」のような存在なんダよ🐼 火があることで木はより伸びやかに育つ関係ンダ。'+ptName+'はあなたのそばにいると、自分の可能性がどんどん広がっていく感覚があるんダ。あなたの熱意と行動力が、'+ptName+'の創造性や感受性を外に引き出してくれているんダよ。一人では踏み出せなかった世界に、あなたと一緒なら入っていける、そんな感覚があるはずンダ。',
      chips1: ['可能性を広げてくれる','踏み出す力をもらえる','創造性が刺激される','一緒なら遠くへ行ける'],
      body2: ptName+'はあなたの「熱さと行動力」に、自分にはない輝きを見ているんダ🐼 感受性が豊かな'+ptName+'にとって、あなたのエネルギーはとても眩しく、同時に安心感があるんダよ。あなたが何かに向かって動くとき、'+ptName+'は自分も一緒に動き出したくなる、そういう引力を感じているんダ。',
      chips2: ['眩しい存在','一緒に動き出したくなる','安心できる熱さ','本能的に惹かれる']
    },
    '土_火': {
      body1: ptName+'にとって、あなたは「揺るぎない大地」のような安心感を与える存在なんダ🐼 土が火を支える関係で、あなたの誠実さと安定感が'+ptName+'の情熱をしっかりと支えてくれているんダよ。'+ptName+'が全力で燃えられるのは、あなたという確かな基盤があるからンダ。あなたのそばでなら失敗しても大丈夫、という根拠のない安心感を'+ptName+'は持っているはずンダ。',
      chips1: ['安心して全力になれる','失敗しても大丈夫な存在','基盤になってくれる','長く一緒にいたい'],
      body2: ptName+'はあなたの「温かさと誠実さ」に、自分のどこかをずっと求めていたものを見ているんダ🐼 情熱的で動き続ける'+ptName+'にとって、あなたのような「変わらずそこにいてくれる人」の価値は計り知れないんダよ。あなたが静かにそこにいるだけで、'+ptName+'は「帰れる場所がある」と感じられるんダ。',
      chips2: ['帰れる場所','変わらない温かさ','誠実さに惚れる','一番信頼できる人']
    },
    '金_土': {
      body1: ptName+'にとって、あなたは「自分の芯を見抜いてくれる鋭い存在」として映っているんダよ🐼 金が土の価値を高める関係で、あなたの意志の強さと美意識が'+ptName+'の誠実さをさらに輝かせてくれているんダ。'+ptName+'はあなたと話すとき、自分の本質をしっかりと見てもらえている感覚があるんダよ。誤魔化しの通じない相手だからこそ、'+ptName+'はあなたの前でとても正直でいられるんダ。',
      chips1: ['本質を見てくれる','正直でいられる','自分の価値を引き上げてくれる','誤魔化せない存在'],
      body2: ptName+'はあなたの「意志の強さと一貫性」に、深い敬意を感じているんダ🐼 誠実に生きる'+ptName+'にとって、あなたの妥協しない姿勢は時に厳しくも映るが、同時に「この人は信頼できる」という確信を与えてくれるんダよ。あなたが何かを決めるとき、その決断の重みを'+ptName+'は誰よりも理解しているはずンダ。',
      chips2: ['深い敬意を感じる','妥協しない姿に惹かれる','一番信頼できる','この人は本物だと思う']
    },
    '水_金': {
      body1: ptName+'にとって、あなたは「自分の意志を磨いてくれる砥石」のような存在なんダよ🐼 水が金を磨く関係で、あなたの深い感受性と包容力が'+ptName+'の鋭さをより純粋に磨き上げてくれているんダ。'+ptName+'はあなたと話したあと、自分の考えがよりクリアになる感覚があるはずンダ。あなたの穏やかな深さが、'+ptName+'の固まりすぎた価値観をやわらかく溶かしてくれているんダよ。',
      chips1: ['思考がクリアになる','固さをほぐしてくれる','深さに引き込まれる','一緒にいると純化される'],
      body2: ptName+'はあなたの「静かな深み」に、自分が持っていない世界の広がりを感じているんダ🐼 意志が強く、時に視野が狭くなりがちな'+ptName+'にとって、あなたのような「すべてを包む水」のような人は本当に貴重な存在ンダよ。あなたが黙って隣にいるだけで、'+ptName+'の心が静まり、本当に大切なものが見えてくるんダ。',
      chips2: ['静かな安心感','視野を広げてくれる','本質を照らしてくれる','かけがえのない存在']
    },
    '木_水': {
      body1: ptName+'にとって、あなたは「自分の根に水をくれる存在」として映っているんダよ🐼 木は水を吸って育つ関係で、あなたの包容力と深い感受性が'+ptName+'の創造性や向上心を静かに支えてくれているんダ。'+ptName+'はあなたのそばにいると、自然と「もっと成長したい」という気持ちが湧いてくるんダよ。あなたが何かを感じ取ったとき、'+ptName+'はその深さに本能的に引きつけられているはずンダ。',
      chips1: ['成長したくなる','根をはらせてくれる','包まれる安心感','本能的に引かれる'],
      body2: ptName+'はあなたの「深い感受性と包み込む温かさ」に、自分の感情を安心して委ねられる感覚があるんダ🐼 創造的に生きる'+ptName+'は、自分のアイデアや夢を誰かに話したいとき、最初にあなたの顔を思い浮かべることが多いはずンダ。あなたが静かに聞いてくれるその姿が、'+ptName+'の一番の支えになっているんダよ。',
      chips2: ['夢を話したくなる相手','静かな支えがある','感情を委ねられる','いつも思い出す存在']
    },
    // 比和型（同じ五行）
    '木_木': {
      body1: ptName+'にとって、あなたは「自分の鏡」のような存在なんダよ🐼 同じ木の気質を持つ者同士、相手を見ているようで自分を見ているような、不思議な共鳴があるんダ。'+ptName+'があなたと話すとき、「そうそう、それなんだよ」という感覚が何度も訪れるはずンダ。言葉にしなくても通じ合える安心感が、'+ptName+'をあなたのそばに引き寄せているんダよ。',
      chips1: ['鏡のような存在','言葉にしなくても通じる','共鳴する感覚','自分らしくいられる'],
      body2: ptName+'はあなたの「感受性の深さと創造への情熱」に、自分と同じ「本物」を感じているんダ🐼 外見的には似ているように見えても、内側の繊細さや美意識において深く共鳴できる相手はなかなかいないんダよ。あなたといると「この人はわかってくれる」という確信が積み重なっていくんダ。',
      chips2: ['本物だとわかる','深いところで共鳴する','一番わかってくれる','特別な安心感']
    },
    '火_火': {
      body1: ptName+'にとって、あなたは「自分の炎をさらに燃え上がらせてくれる存在」なんダよ🐼 同じ火の気質を持つ者同士、一緒にいるとお互いのエネルギーが倍になる感覚があるんダ。'+ptName+'があなたとともに何かに向かうとき、「これなら絶対できる」という根拠のない確信が生まれるはずンダ。あなたの情熱が'+ptName+'の情熱を呼び覚ます、そういう関係ンダよ。',
      chips1: ['エネルギーが倍になる','一緒なら何でもできる','情熱で共鳴する','一緒にいると熱くなれる'],
      body2: ptName+'はあなたの「行動力と情熱の純粋さ」に、同じ炎を持つ者同士の深い共感を感じているんダ🐼 周りに理解されにくい熱量を、あなたなら当たり前のように受け止めてくれると知っているんダよ。あなたといるとき、'+ptName+'は自分の炎を全力で燃やすことができる、最高の場所にいる感覚があるはずンダ。',
      chips2: ['全力で燃えられる','情熱を理解してくれる','一緒に燃え上がれる','最高の相棒']
    },
    '土_土': {
      body1: ptName+'にとって、あなたは「変わらずそこにいてくれる大地」のような安心感を与える存在なんダよ🐼 同じ土の気質を持つ者同士、お互いのペースや価値観が自然と合って、「無理しなくていい」という心地よさがあるんダ。'+ptName+'があなたと一緒にいると、焦りや緊張がほぐれて、本当の自分でいられる感覚があるはずンダ。',
      chips1: ['無理しなくていい','本当の自分でいられる','変わらない安心感','長く一緒にいたい'],
      body2: ptName+'はあなたの「誠実さと信頼感の重み」に、世界で一番安心できる存在を見ているんダ🐼 派手さはなくても、絶対に裏切らない、そういう確信をあなたに対して持っているんダよ。長い時間をかけて積み上げる信頼の中で、'+ptName+'はあなたをますます大切な存在として感じていくんダ。',
      chips2: ['世界で一番安心できる','絶対に裏切らない確信','時間をかけて深まる','本物の絆']
    },
    '金_金': {
      body1: ptName+'にとって、あなたは「自分の鋭さをわかってくれる唯一の存在」として映っているんダよ🐼 同じ金の気質を持つ者同士、お互いの意志の強さや美意識の高さを、言い訳なしに理解し合えるんダ。'+ptName+'はあなたと話すとき、「この人の前では本音で言える」という珍しい感覚があるはずンダ。妥協を嫌う同士だからこそ、深いところで共鳴できるんダよ。',
      chips1: ['本音で言い合える','鋭さを理解してくれる','妥協を嫌う同士の共鳴','特別な存在'],
      body2: ptName+'はあなたの「一切の妥協を許さない純粋さ」に、自分と同じ「本物」を感じているんダ🐼 周りから「難しい人」と思われることがある'+ptName+'が、あなたの前では「やっとわかってくれた」という解放感を得られるんダよ。あなたの存在が、'+ptName+'に「自分は間違っていない」という確信を与えているはずンダ。',
      chips2: ['やっとわかってくれた','自分の正しさを確信できる','一番理解してくれる','本物同士の絆']
    },
    '水_水': {
      body1: ptName+'にとって、あなたは「自分の深さを完全に理解してくれる存在」として映っているんダよ🐼 同じ水の気質を持つ者同士、言葉にならない感情や直感を、言わなくても受け取り合える稀有な関係ンダ。'+ptName+'があなたのそばにいると、「全部話さなくても伝わる」という不思議な安心感があるはずンダ。深く感じすぎて傷つきやすい部分を、あなたなら傷つけずに受け止めてくれると知っているんダよ。',
      chips1: ['全部話さなくても伝わる','深さを理解してくれる','傷つけずに受け止めてくれる','魂レベルの共鳴'],
      body2: ptName+'はあなたの「深い洞察力と包み込む温かさ」に、自分の全てを委ねられる存在を見ているんダ🐼 感受性が高く、人一倍傷つきやすい'+ptName+'が、あなたの前では自分の弱さを隠さなくていいと思えているんダよ。あなたという存在が、'+ptName+'にとって「世界で一番安全な場所」になっているはずンダ。',
      chips2: ['世界で一番安全な場所','弱さを隠さなくていい','全てを委ねられる','一生大切にしたい']
    },
    // 相剋型
    '木_土': {
      body1: ptName+'にとって、あなたは「自分の安定を揺さぶる、でも目が離せない存在」として映っているんダよ🐼 木は土を剋す関係で、あなたの創造性や変化への志向が'+ptName+'の安定志向を揺らすんダ。最初は「なんでそんなに変えたがるの」と感じていても、気づけばあなたのことばかり考えている、そういう不思議な引力が生まれやすい関係ンダよ。摩擦の向こうに深い絆があるんダ。',
      chips1: ['目が離せない存在','安定を揺さぶられる','刺激的で気になる','摩擦の向こうに絆がある'],
      body2: ptName+'はあなたの「揺るぎない安定感と誠実さ」に、自分がいかに根無し草になりやすいかを気づかされているんダ🐼 創造的で変化を求める自分を、ちゃんと地に着かせてくれる存在として、'+ptName+'はあなたを見ているんだよ。対立することもあるけど、あなたがいることで'+ptName+'はよりしっかりとした自分になれているはずンダ。',
      chips2: ['地に着かせてくれる','地に足をつけてくれる','対立しても大切な存在','成長させてくれる']
    },
    '土_木': {
      body1: ptName+'にとって、あなたは「自分の安定した世界に風穴を開けてくれる存在」として映っているんダよ🐼 土は木に剋される関係で、あなたの創造性と変化のエネルギーが'+ptName+'の安定した世界をひっかき回すんダ。最初は「なんでそんなに動き回るの」と思っても、あなたの自由さと可能性への情熱が、'+ptName+'の中にずっと眠っていた夢を呼び起こしてくれるはずンダよ。',
      chips1: ['眠っていた夢を呼び覚ます','風穴を開けてくれる','刺激的な存在','固まりすぎた世界を溶かす'],
      body2: ptName+'はあなたの「安定した大地のような存在感」に、自分がいかに根を張れていないかを感じているんダ🐼 そしてあなたのそばにいると「自分もこういうふうに生きられる」という安心感が生まれてくるんだよ。摩擦の中に、お互いを成長させる深いエネルギーが流れているんダ。',
      chips2: ['安心感を与えてくれる','根を張らせてくれる','対立を越えた絆','成長のきっかけ']
    },
    '火_金': {
      body1: ptName+'にとって、あなたは「自分の価値観を本気で試してくれる存在」として映っているんダよ🐼 火は金を剋す関係で、あなたの情熱と熱量が'+ptName+'の冷静な意志とぶつかり合うんダ。真剣に議論できる相手は少ない中で、あなたとの火花は'+ptName+'にとって本物の知的・感情的刺激になっているはずンダよ。',
      chips1: ['本気でぶつかれる相手','刺激的で目が離せない','価値観を試してくれる','本物の緊張感がある'],
      body2: ptName+'はあなたの「意志の強さと一切の妥協を許さない鋭さ」に、自分のぬるさを突かれる感覚があるんダ🐼 最初は「なんでそんなに厳しいの」と感じても、あなたとのやりとりを経て'+ptName+'はいつも少し強くなっているんダよ。あなたが'+ptName+'にとって「本物の自分にしてくれる存在」になっているはずンダ。',
      chips2: ['本物の自分にしてくれる','鋭さに惹かれる','摩擦が成長になる','本気で向き合える']
    },
    '金_火': {
      body1: ptName+'にとって、あなたは「自分の冷静さを溶かしてしまう情熱の存在」として映っているんダよ🐼 金は火に剋される関係で、あなたの熱量と情熱が'+ptName+'の冷静な意志をときに打ち砕くんダ。普段は揺らがないはずの'+ptName+'が、あなたの前だけは感情的になりやすい。それはあなたの存在が'+ptName+'にとって本当に大切だという証拠なんダよ。',
      chips1: ['感情を揺さぶってくれる','冷静さを溶かす存在','本音を引き出してくれる','大切だから揺れる'],
      body2: ptName+'はあなたの「情熱の純粋さ」に、自分の理性では割り切れない引力を感じているんダ🐼 論理的な'+ptName+'が「なぜかこの人が気になる」と感じているとすれば、それはあなたの火のエネルギーが'+ptName+'の意識の外側から強く引っ張っているからンダよ。その引力は、時間とともにより確かなものになっていくんダ。',
      chips2: ['理屈を超えた引力','気づいたら気になっている','意識の外から引っ張られる','時間が経つほど確かになる']
    },
    '土_水': {
      body1: ptName+'にとって、あなたは「自分の固まった世界を流し込んでくれる存在」として映っているんダよ🐼 土は水を剋す関係で、あなたの深い感受性と包容力が'+ptName+'の安定志向を揺らすことがあるんダ。最初は「なんでそんなに感情的なの」と感じても、あなたの流れるような深さが、'+ptName+'が気づいていなかった感情を表面に運んでくれるはずンダよ。',
      chips1: ['隠れた感情を引き出す','固まった世界を溶かす','深さに引き込まれる','気づいていなかった自分に会える'],
      body2: ptName+'はあなたの「揺るぎない大地のような安心感」に、自分のどこかがずっと求めていたものを見ているんダ🐼 感受性が豊かで流れやすい自分を、しっかりと支えてくれるあなたの存在がとてもありがたいと感じているはずんだよ。摩擦がありながらも、あなたのそばを離れがたく感じているんダ。',
      chips2: ['離れがたい存在','支えてくれる大地','流れを止めてくれる','いつのまにか必要になっている']
    },
    '水_土': {
      body1: ptName+'にとって、あなたは「自分の流れる感性をしっかりと形にしてくれる存在」として映っているんダよ🐼 水は土を剋す関係で、あなたの深い感受性と流動性が'+ptName+'の安定した価値観に変化をもたらすんダ。最初は「なんでそんなに揺れるの」と感じる'+ptName+'が、あなたとともに時間を過ごすうちに、自分の中にも感情の川が流れていたことに気づくはずンダよ。',
      chips1: ['感情の川を引き出す','安定に変化をもたらす','新しい世界に連れて行ってくれる','気づきを与えてくれる'],
      body2: ptName+'はあなたの「安定した誠実さ」に、自分がいかに「流れすぎている」かを感じているんダ🐼 そしてあなたと話した後、なぜかいつも自分の中がすっきりと整理されている感覚があるんだよ。形を与えてくれるあなたの存在が、'+ptName+'にとってかけがえのないものになっているはずンダ。',
      chips2: ['形を与えてくれる','感情が整理される','かけがえない存在','安定の中に深さがある']
    },
    '金_木': {
      body1: ptName+'にとって、あなたは「自分の枠を壊してくれる鋭い存在」として映っているんダよ🐼 金は木を剋す関係で、あなたの意志の強さと鋭さが'+ptName+'の伸びやかな成長を時に切り落とすんダ。それはきついことのように見えて、実は'+ptName+'をより純粋に強くしてくれているんだよ。あなたの言葉は時に刺さるけど、だからこそ本物の変化をもたらしてくれるんダ。',
      chips1: ['本物の変化をもたらす','枠を壊してくれる','刺さる言葉が成長になる','鋭さに惹かれる'],
      body2: ptName+'はあなたの「創造性と自由への情熱」に、自分の中の固まった価値観が揺さぶられる感覚があるんダ🐼 規律と美意識を大切にする'+ptName+'が「なぜかこの人には特別に感じる」と思うなら、それはあなたの木のエネルギーが、金の意志では制しきれない引力を持っているからんだよ。',
      chips2: ['制しきれない引力','規律を超えた何か','特別な感覚','創造性に惹かれる']
    },
    '木_金': {
      body1: ptName+'にとって、あなたは「自分の感性を鋭く磨いてくれる砥石」のような存在なんダよ🐼 木は金に剋される関係で、あなたの意志の強さと美意識が'+ptName+'の伸びやかな創造性を整えてくれているんダ。'+ptName+'があなたと話した後、自分のアイデアがより純粋でクリアになっている感覚があるはずンダよ。',
      chips1: ['アイデアを磨いてくれる','鋭さで純化される','クリアになる感覚','本物にしてくれる'],
      body2: ptName+'はあなたの「自由な感受性と創造への情熱」に、自分が忘れかけていた純粋さを見ているんダ🐼 論理と意志を大切にする'+ptName+'だからこそ、あなたの感性的な世界は時に眩しく、時に羨ましく映るんだよ。あなたといることで、'+ptName+'は自分の硬さを少しずつほぐすことができているはずンダ。',
      chips2: ['硬さをほぐしてくれる','純粋さを思い出させてくれる','感性の世界が眩しい','一緒にいると柔らかくなれる']
    },
    '水_火': {
      body1: ptName+'にとって、あなたは「自分の情熱に静けさと深さをもたらしてくれる存在」として映っているんダよ🐼 水は火を剋す関係で、あなたの思慮深さと包容力が'+ptName+'の燃え上がるエネルギーをちょうどよく冷ましてくれるんダ。衝動のままに動きがちな'+ptName+'が、あなたといると「待てよ」と立ち止まる瞬間が生まれる。それがいつも後から正解だったと気づくんダよ。',
      chips1: ['情熱を深みに変えてくれる','立ち止まる理由をくれる','冷静にしてくれる存在','深さに惹かれる'],
      body2: ptName+'はあなたの「揺れない静けさと洞察力」に、自分が持っていない何かを感じているんダ🐼 情熱的に動く'+ptName+'だからこそ、あなたのように深く考えて動く姿が「この人はどこまで見えているんだろう」と特別な存在として映るんだよ。あなたの言葉は少なくても、'+ptName+'にはちゃんと届いているはずンダ。',
      chips2: ['静けさが魅力的','言葉の重みが違う','深さに引き込まれる','本物の安心感']
    },
    '火_水': {
      body1: ptName+'にとって、あなたは「自分の静かな世界に温度と光をもたらしてくれる存在」として映っているんダよ🐼 火は水に剋される関係で、あなたの情熱とエネルギーが'+ptName+'の思慮深さを揺さぶるんダ。内向きになりがちな'+ptName+'が、あなたといると「外に出てみたい」「やってみたい」という気持ちが自然と湧き上がってくるんだよ。あなたの熱が'+ptName+'の川に光を差し込んでいるんダ。',
      chips1: ['世界を広げてくれる','光を差し込んでくれる','行動したくなる','温度をもらえる'],
      body2: ptName+'はあなたの「深く静かな感受性」に、自分の熱さでは決して届かない世界を感じているんダ🐼 情熱的に動く自分とは対照的な、あなたの落ち着いた洞察力に「この人はどこまで深いんだろう」と引き込まれているはずンダよ。あなたが静かに放つ言葉が、'+ptName+'の心には炎より長く残っているんダ。',
      chips2: ['深さに引き込まれる','静けさが眩しい','言葉が長く残る','炎では届かない何か']
    },
  };

  // 五行ペアキーを作成
  var gogyoKey = (myGogyo||'水')+'_'+(ptGogyo||'火');
  var thinkData = GOGYO_HOWSEE[gogyoKey];

  // デフォルト（上にないペアは相性タイプベースで生成）
  if(!thinkData){
    var defaultBody1 = {
      '相生型': ptName+'にとって、あなたは自分を自然にパワーアップさせてくれる存在なんダよ🐼 生年月日の占いで「相生」の関係が出ていて、一緒にいるだけでお互いのエネルギーが高まり、気づけばお互いにとって欠かせない存在になっていく関係ンダ。あなたが意識していなくても、そばにいるだけで'+ptName+'の中の何かが動き出すんダよ。',
      '比和型': ptName+'にとって、あなたは「自分の鏡」のような存在なんダよ🐼 同じ気質を持つ者同士、言葉にしなくても通じ合える稀有な感覚があるんダ。「この人はわかってくれる」という確信が、'+ptName+'をあなたのそばに引き寄せているんダよ。長く一緒にいるほど、この共鳴はより深まっていくんダ。',
      '相剋型': ptName+'にとって、あなたは「刺激的で目が離せない存在」として映っているんダよ🐼 エネルギーの方向が違うから摩擦はあるけど、それが逆にお互いを強くしているんダ。対立を乗り越えるたびに絆が深まる、時間をかけて本物の信頼を育てられる関係ンダよ。',
      '中和型': ptName+'にとって、あなたは「安心して隣にいられる存在」として映っているんダよ🐼 バランスが取れた組み合わせで、無理せず自然体でいられるんダ。お互いの努力次第でどこまでも深まれる、可能性に満ちた関係ンダよ。',
    };
    var defaultBody2 = {
      '相生型': ptName+'はあなたの持つ'+GN_SHORT[myGogyo||'水']+'に、自分が求めていたものを感じているんダ🐼 意識しているかどうかに関わらず、あなたがそばにいることで'+ptName+'の調子が上がり、自分の力が最大限に引き出される感覚があるはずンダ。長い時間をかけるほど、この感覚はより確かになっていくんダよ。',
      '比和型': ptName+'はあなたの「同じ気質の深さと純粋さ」に、世界で最も理解してくれる存在を見ているんダ🐼 外から見えない部分を、あなたなら説明しなくても受け取ってくれると確信しているはずンダよ。',
      '相剋型': ptName+'はあなたとのやりとりを経て、いつも「少し強くなった自分」に気づいているんダ🐼 簡単ではない関係だからこそ、乗り越えた先に本物の絆が生まれているんダよ。',
      '中和型': ptName+'はあなたといると穏やかな気持ちになれるんダ🐼 大きな波はないけど、だからこそ長く続く関係を築けるんダよ。丁寧に関係を育てていくほど、2人の絆は深くなっていくはずンダ。',
    };
    var defaultChips1 = {
      '相生型': ['エネルギーをもらえる','一緒にいると調子が上がる','自然に引き合う','長くいるほど深まる'],
      '比和型': ['気持ちが通じ合う','価値観が近い','一緒にいて楽','安心できる存在'],
      '相剋型': ['刺激し合える','成長させてくれる','気になる存在','引き付けられる'],
      '中和型': ['安心できる','バランスがいい','一緒にいて自然','長続きしやすい'],
    };
    var defaultChips2 = {
      '相生型': ['才能を引き出してくれる','自然と高め合える','居心地がいい','かけがえない'],
      '比和型': ['共感しやすい','同じ感覚を持つ','一緒に成長できる','本物の理解者'],
      '相剋型': ['違いが魅力になる','化学反応がある','磨き合える','乗り越えるほど深まる'],
      '中和型': ['安定した関係','お互いを尊重','ゆっくり深まる','丁寧に育てられる'],
    };
    thinkData = {
      body1: defaultBody1[compat_type]||defaultBody1['中和型'],
      chips1: defaultChips1[compat_type]||defaultChips1['中和型'],
      body2: defaultBody2[compat_type]||defaultBody2['中和型'],
      chips2: defaultChips2[compat_type]||defaultChips2['中和型'],
    };
  }

  // P3-B: HOW THEY SEE YOU 深化 — 命式情報（喜神・格局・大運）を組み込む
  (function(){
    if(!tb1||!tc1) return;

    // body1: GOGYO_HOWSEE の基本テキスト + 命式固有の追記
    var baseBody = thinkData.body1 || '';

    // 相手の喜神・格局からあなたへの「引力の根拠」を補強
    var addOn = '';
    if(ptCalc){
      var ptKs = ptCalc.kishin || [];
      var ptKk = (ptCalc.kakukyoku && ptCalc.kakukyoku.name) ? ptCalc.kakukyoku.name : '';
      var ptDaiun = ptCalc.currentDaiun;

      // あなたの五行が相手の喜神と一致する場合
      if(ptKs.length>0 && ptKs.indexOf(myGogyo)>=0){
        addOn += ' 命式から見ると、あなたの'+myGogyo+'の気質はちょうど'+ptName+'の喜神（運気が上がる要素）にあたるんダよ🌟 あなたがそばにいるだけで'+ptName+'の運気が自然と上がる、命式的に見ても「吉の存在」として映っているんダ。';
      }

      // 相手の格局タイプによる補足
      if(ptKk){
        if(ptKk.indexOf('従旺')>=0){
          addOn += ' '+ptName+'の格局は「'+ptKk+'」で、自分のペースと世界観を強く持つタイプンダ。あなたがその世界観を否定せず受け入れるとき、'+ptName+'はあなたを「本当にわかってくれる人」として特別視するんダよ。';
        } else {
          addOn += ' '+ptName+'の格局は「'+ptKk+'」で、バランスを大切にするタイプんダ。あなたの持つエネルギーが'+ptName+'のバランスを支える役割を自然と担っているんダよ。';
        }
      }

      // 相手の現在大運と自分の五行の関係
      if(ptDaiun){
        var ptDaiunGogyo_k = ['木','木','火','火','土','土','金','金','水','水'][['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'].indexOf(ptDaiun.kan)];
        var SEI_T = {木:'火',火:'土',土:'金',金:'水',水:'木'};
        if(ptDaiunGogyo_k && (SEI_T[myGogyo]===ptDaiunGogyo_k || SEI_T[ptDaiunGogyo_k]===myGogyo)){
          addOn += ' さらに'+ptName+'の今の大運（'+ptDaiun.kan+ptDaiun.shi+'）とあなたの五行が相生の関係にあるから、この時期は特にあなたへの引力が強くなりやすいんダよ。';
        }
      }
    }

    tb1.textContent = baseBody + addOn;

    // chips1: 五行ペア固有のチップ（命式要素を反映）
    var baseChips = thinkData.chips1 || ['引き合う'];
    var extraChips = [];

    // 喜神一致 → 「運気を上げてくれる存在」チップ
    if(ptCalc && ptCalc.kishin && ptCalc.kishin.indexOf(myGogyo)>=0){
      extraChips.push('運気を上げてくれる存在');
    }
    // 支合 → 「出会った瞬間から気になる」チップ
    var SG_C = {子:'丑',丑:'子',寅:'亥',亥:'寅',卯:'戌',戌:'卯',辰:'酉',酉:'辰',巳:'申',申:'巳',午:'未',未:'午'};
    if(myCalc && ptCalc && SG_C[myCalc.pillars.day.shi]===ptCalc.pillars.day.shi){
      extraChips.push('出会った瞬間から気になる');
    }
    // 干合 → 「一緒にいると落ち着く」チップ
    var KG_C = {甲:'己',己:'甲',乙:'庚',庚:'乙',丙:'辛',辛:'丙',丁:'壬',壬:'丁',戊:'癸',癸:'戊'};
    if(myCalc && ptCalc && KG_C[myCalc.pillars.day.kan]===ptCalc.pillars.day.kan){
      extraChips.push('一緒にいると落ち着く');
    }

    // baseChipsとextraChipsをマージ（重複排除、最大5件）
    var allChips = baseChips.slice();
    extraChips.forEach(function(c){ if(allChips.indexOf(c)<0) allChips.push(c); });
    allChips = allChips.slice(0,5);

    tc1.innerHTML = allChips.map(function(c){return'<span class="tch">'+c+'</span>';}).join('');
  })();

  // ══ adv-list（強み・注意点）書き換え ══
  var ADV_BY_TYPE = {
    '相生型': {
      pos: ['お互いのエネルギーが自然に高まる','一緒にいるほど2人とも調子がよくなりやすい',ptName+'の強みがあなたの弱点を補ってくれる','感情の流れが自然に循環する','長く続くほど絆が深まるタイプ'],
      neg: ['相手への依存が強くなりすぎることがある','自分ひとりの時間も大切にしてほしいンダ','エネルギーのバランスが崩れると疲弊することも','お互いの成長ペースが違ってくる時期が来るかも','与え合いすぎて消耗しないよう注意ンダ'],
    },
    '比和型': {
      pos: ['価値観が近くて会話がしやすい','一緒にいて居心地よく感じやすい','同じものを見て同じように感じる瞬間が多い','お互いの気持ちが言わなくても伝わりやすい','安定した関係を築きやすい'],
      neg: ['同じ弱点も共有しやすいから注意ンダ','新鮮さを保つために意識的に変化を取り入れて','刺激が少なくなりすぎると関係が停滞するかも','似すぎているから競争意識が生まれやすい','意見が同じになりすぎて視野が狭くなることも'],
    },
    '相剋型': {
      pos: ['摩擦を乗り越えるたびに絆が深まる','お互いの違いが成長の原動力になる','刺激し合ってお互いを高められる','相手から「自分にないもの」を学べる','強い引力があって惹かれ合いやすい'],
      neg: ['価値観のぶつかりが起きやすいんダ','感情的になったときは少し冷静になってほしいンダ','どちらかが我慢しすぎないよう注意ンダ','相手を変えようとするとうまくいかないんダ','距離感の調整が大切な組み合わせンダ'],
    },
    '中和型': {
      pos: ['バランスがとれていて安心して付き合える','大きなトラブルが起きにくいタイプ','お互いを尊重しながら関係を育てられる','穏やかに長続きしやすい組み合わせ','努力次第でどこまでも深まれるンダ'],
      neg: ['刺激や変化を意識して取り入れるといいンダ','ルーティン化しすぎると新鮮さがなくなることも','言いたいことは溜め込まず小まめに話し合ってほしいンダ','お互いの成長を止めない環境づくりが大切ンダ','特別な努力なしには関係が深まりにくいかもンダ'],
    },
  };
  var adv=ADV_BY_TYPE[compat_type]||ADV_BY_TYPE['中和型'];
  var advPos=document.getElementById('pf-adv-pos');
  var advNeg=document.getElementById('pf-adv-neg');
  if(advPos) advPos.innerHTML=adv.pos.map(function(t){return'<li>'+t+'</li>';}).join('');
  if(advNeg) advNeg.innerHTML=adv.neg.map(function(t){return'<li>'+t+'</li>';}).join('');

  // ══ 最終ポポコメント書き換え ══
  var finalPopo=document.getElementById('pf-popo-final');
  if(finalPopo){
    var finalText = CSK.getLang() === 'kr'
      ? CSK.buildFinalPopoText_KR(ptName, compat_type)
      : CSK.buildFinalPopoText_JA(ptName, compat_type);
    finalPopo.textContent=finalText;
  }

  // ══════════════════════════════════════════════════════════════
  //  BEST TIMING：2人の命式から月別相性スコアを計算して動的生成
  // ══════════════════════════════════════════════════════════════
  (function(){
    var tlEl = document.getElementById('pf-timing-list');
    if(!tlEl || !myCalc || !ptCalc) return;

    // 本人と相手の月別スコアを計算（vanilla JS版 calcMonthlyScore）
    var JIKKAN_V  = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
    var JUNISHI_V = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
    var JIKKAN_GOGYO_V  = ['木','木','火','火','土','土','金','金','水','水'];
    var JUNISHI_GOGYO_V = ['水','土','木','木','土','火','火','土','金','金','土','水'];
    var SEI_V  = {木:'火',火:'土',土:'金',金:'水',水:'木'};
    var KOKU_V = {木:'土',火:'金',土:'水',金:'木',水:'火'};
    var SHIGOU_V   = {子:'丑',丑:'子',寅:'亥',亥:'寅',卯:'戌',戌:'卯',辰:'酉',酉:'辰',巳:'申',申:'巳',午:'未',未:'午'};
    var ROKUCHUU_V = {子:'午',午:'子',丑:'未',未:'丑',寅:'申',申:'寅',卯:'酉',酉:'卯',辰:'戌',戌:'辰',巳:'亥',亥:'巳'};
    var KANGO_V    = {甲:'己',己:'甲',乙:'庚',庚:'乙',丙:'辛',辛:'丙',丁:'壬',壬:'丁',戊:'癸',癸:'戊'};
    var GOKORTON_V = {甲:['丙','丁','戊','己','庚','辛','壬','癸','甲','乙','丙','丁'],己:['丙','丁','戊','己','庚','辛','壬','癸','甲','乙','丙','丁'],乙:['戊','己','庚','辛','壬','癸','甲','乙','丙','丁','戊','己'],庚:['戊','己','庚','辛','壬','癸','甲','乙','丙','丁','戊','己'],丙:['庚','辛','壬','癸','甲','乙','丙','丁','戊','己','庚','辛'],辛:['庚','辛','壬','癸','甲','乙','丙','丁','戊','己','庚','辛'],丁:['壬','癸','甲','乙','丙','丁','戊','己','庚','辛','壬','癸'],壬:['壬','癸','甲','乙','丙','丁','戊','己','庚','辛','壬','癸'],戊:['甲','乙','丙','丁','戊','己','庚','辛','壬','癸','甲','乙'],癸:['甲','乙','丙','丁','戊','己','庚','辛','壬','癸','甲','乙']};

    function getFlowMonth(year, month){
      function _jd(y,m,d,h){if(m<=2){y--;m+=12;}var A=Math.floor(y/100),B=2-A+Math.floor(A/4);return Math.floor(365.25*(y+4716))+Math.floor(30.6001*(m+1))+d+h/24+B-1524.5;}
      function _sl(jd){var T=(jd-2451545)/36525;var L0=280.46646+36000.76983*T+0.0003032*T*T;L0=((L0%360)+360)%360;var M2=357.52911+35999.05029*T-0.0001537*T*T;M2=((M2%360)+360)%360;var Mr=M2*Math.PI/180;var C=(1.914602-0.004817*T-0.000014*T*T)*Math.sin(Mr)+(0.019993-0.000101*T)*Math.sin(2*Mr)+0.000289*Math.sin(3*Mr);var sl=L0+C,om=125.04-1934.136*T;return(((sl-0.00569-0.00478*Math.sin(om*Math.PI/180))%360)+360)%360;}
      var sl=_sl(_jd(year,month,15,3));
      var shiIdx=((Math.floor(((sl-315+360)%360)/30)+2)%12);
      var yKanIdx=((year-4)%10+10)%10;
      var yKan=JIKKAN_V[yKanIdx];
      var monthIdx=(shiIdx-2+12)%12;
      var kanStr=GOKORTON_V[yKan][monthIdx];
      var kanIdx=JIKKAN_V.indexOf(kanStr);
      return{kan:kanStr,shi:JUNISHI_V[shiIdx],kanIdx:kanIdx,shiIdx:shiIdx,gogyoKan:JIKKAN_GOGYO_V[kanIdx],gogyoShi:JUNISHI_GOGYO_V[shiIdx]};
    }

    function monthScore(calc, year, month){
      var fm=getFlowMonth(year,month);
      var ks=calc.kishin, kj=calc.kijin, daiun=calc.currentDaiun;
      var nichiShi=calc.pillars.day.shi, nichiKan=calc.pillars.day.kan;
      var base=60;
      if(ks.indexOf(fm.gogyoKan)>=0) base+=12; if(kj.indexOf(fm.gogyoKan)>=0) base-=15;
      if(ks.indexOf(fm.gogyoShi)>=0) base+=8;  if(kj.indexOf(fm.gogyoShi)>=0) base-=10;
      if(SHIGOU_V[fm.shi]===nichiShi) base+=8;
      else if(ROKUCHUU_V[fm.shi]===nichiShi) base-=12;
      if(daiun&&KANGO_V[daiun.kan]===fm.kan) base+=6;
      if(daiun&&SHIGOU_V[daiun.shi]===fm.shi) base+=4;
      if(daiun&&ROKUCHUU_V[daiun.shi]===fm.shi) base-=6;
      // 相手との支合・干合ボーナス
      var ptShi=ptCalc.pillars.day.shi, ptKan=ptCalc.pillars.day.kan;
      if(SHIGOU_V[fm.shi]===ptShi||SHIGOU_V[ptShi]===fm.shi) base+=5;
      if(KANGO_V[fm.kan]===ptKan) base+=4;
      return Math.max(20,Math.min(95,Math.round(base)));
    }

    // 2人のスコアを合成（両者の平均 + 相性タイプボーナス）
    var compatBonus = compat_type==='相生型'?6:compat_type==='比和型'?3:compat_type==='相剋型'?-4:0;

    // 三合（会局・半会）テーブル
    var SANGOU = [
      ['申','子','辰'],  // 水局
      ['亥','卯','未'],  // 木局
      ['寅','午','戌'],  // 火局
      ['巳','酉','丑']   // 金局
    ];
    var SHISEI = ['子','卯','午','酉'];  // 四正（半会の成立条件）

    // 通関作用テーブル（相剋型のときのみ適用、流月天干が仲介五行のとき +7）
    var TSUUKAN = {
      '木土': '火','土木': '火',  // 木剋土 → 火が仲介
      '火金': '土','金火': '土',  // 火剋金 → 土が仲介
      '土水': '金','水土': '金',  // 土剋水 → 金が仲介
      '金木': '水','木金': '水',  // 金剋木 → 水が仲介
      '水火': '木','火水': '木'   // 水剋火 → 木が仲介
    };

    // 日干→五行マップ
    var KAN_TO_GOGYO = {甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水'};
    var myDayGogyo = KAN_TO_GOGYO[myCalc.pillars.day.kan] || '';
    var ptDayGogyo = KAN_TO_GOGYO[ptCalc.pillars.day.kan] || '';
    var tsuukanGogyoForPair = (compat_type === '相剋型') ? (TSUUKAN[myDayGogyo + ptDayGogyo] || '') : '';

    function calcSangouBonus(myShi, ptShi, flowShi) {
      var three = [myShi, ptShi, flowShi];
      // 三合会局: 3つの支が三合の組み合わせと完全一致
      for (var i = 0; i < SANGOU.length; i++) {
        var s = SANGOU[i];
        if (s.indexOf(three[0]) >= 0 && s.indexOf(three[1]) >= 0 && s.indexOf(three[2]) >= 0
            && three[0] !== three[1] && three[1] !== three[2] && three[0] !== three[2]) {
          return 10;  // 三合会局成立 +10
        }
      }
      // 三合半会: 流月地支 + どちらかの日支（四正を含む場合のみ）
      for (var i = 0; i < SANGOU.length; i++) {
        var s = SANGOU[i];
        if (s.indexOf(myShi) >= 0 && s.indexOf(flowShi) >= 0 && myShi !== flowShi) {
          if (SHISEI.indexOf(myShi) >= 0 || SHISEI.indexOf(flowShi) >= 0) {
            return 5;  // 半会成立 +5
          }
        }
        if (s.indexOf(ptShi) >= 0 && s.indexOf(flowShi) >= 0 && ptShi !== flowShi) {
          if (SHISEI.indexOf(ptShi) >= 0 || SHISEI.indexOf(flowShi) >= 0) {
            return 5;  // 半会成立 +5
          }
        }
      }
      return 0;
    }

    var now = new Date();
    var curYear = now.getFullYear();
    var curMonth = now.getMonth()+1;

    // 12ヶ月分計算（空亡月判定を含む）
    var myKuubouTl = Array.isArray(myCalc.kuubou) ? myCalc.kuubou : [];
    var ptKuubouTl = Array.isArray(ptCalc.kuubou) ? ptCalc.kuubou : [];
    var months = [];
    for(var m=1;m<=12;m++){
      var myS  = monthScore(myCalc,  curYear, m);
      var ptS  = monthScore(ptCalc,  curYear, m);
      var fm = getFlowMonth(curYear, m);
      var sangouBonus = calcSangouBonus(myCalc.pillars.day.shi, ptCalc.pillars.day.shi, fm.shi);
      // 通関作用ボーナス（相剋型 × 流月天干が仲介五行）
      var tsuukanBonus = 0;
      if (tsuukanGogyoForPair && fm.gogyoKan === tsuukanGogyoForPair) {
        tsuukanBonus = 7;
      }
      // 十二運相乗ボーナス（2人とも勢いある月 +4 / 2人とも穏やかな月 -3）
      var myJuniun = _getJuniunsei(myCalc.pillars.day.kan, fm.shiIdx);
      var ptJuniun = _getJuniunsei(ptCalc.pillars.day.kan, fm.shiIdx);
      var JUNIUN_STRONG = ['建禄','帝旺','冠帯'];
      var JUNIUN_WEAK = ['死','墓','絶'];
      var juniunBonus = 0;
      if (JUNIUN_STRONG.indexOf(myJuniun) >= 0 && JUNIUN_STRONG.indexOf(ptJuniun) >= 0) {
        juniunBonus = 4;
      } else if (JUNIUN_WEAK.indexOf(myJuniun) >= 0 && JUNIUN_WEAK.indexOf(ptJuniun) >= 0) {
        juniunBonus = -3;
      }
      // 双方六冲ペナルティ（流月地支が自分と相手の両方の日支と六冲、つまり同日支ペアで発生）
      var doubleChuu = 0;
      if (ROKUCHUU_V[fm.shi] === myCalc.pillars.day.shi && ROKUCHUU_V[fm.shi] === ptCalc.pillars.day.shi) {
        doubleChuu = -6;
      }
      var combined = Math.round((myS + ptS) / 2) + compatBonus + sangouBonus + tsuukanBonus + juniunBonus + doubleChuu;
      // 空亡月判定（減衰率方式: 中央値60に向けてスコアを引き寄せる）
      var isMyKuubouMonth = myKuubouTl.indexOf(fm.shi) >= 0;
      var isPtKuubouMonth = ptKuubouTl.indexOf(fm.shi) >= 0;
      var kuubouState = 'none';
      var NEUTRAL = 60;
      if (isMyKuubouMonth && isPtKuubouMonth) {
        combined = Math.round(combined - (combined - NEUTRAL) * 0.50);
        kuubouState = 'both';
      } else if (isMyKuubouMonth) {
        combined = Math.round(combined - (combined - NEUTRAL) * 0.35);
        kuubouState = 'mine';   // = 'self' (互換性のため'mine'を維持)
      } else if (isPtKuubouMonth) {
        combined = Math.round(combined - (combined - NEUTRAL) * 0.25);
        kuubouState = 'theirs'; // = 'partner' (互換性のため'theirs'を維持)
      }
      combined = Math.max(20, Math.min(95, combined));
      months.push({month:m, myScore:myS, ptScore:ptS, combined:combined, fm:fm, kuubouState:kuubouState, tsuukanBonus:tsuukanBonus, tsuukanGogyo:tsuukanGogyoForPair, juniunBonus:juniunBonus, myJuniun:myJuniun, ptJuniun:ptJuniun, doubleChuu:doubleChuu});
    }

    // 最高・最低月を特定
    // 「最高の時期」候補からは空亡月を除外。全12ヶ月空亡の極端ケースだけフォールバック
    var nonKuubouMonths = months.filter(function(m){ return m.kuubouState === 'none'; });
    var bestPool = nonKuubouMonths.length > 0 ? nonKuubouMonths : months;
    var maxM = bestPool.reduce(function(a,b){return a.combined>b.combined?a:b;});
    var minM = months.reduce(function(a,b){return a.combined<b.combined?a:b;});
    var topTwo = months.slice().sort(function(a,b){return b.combined-a.combined;}).slice(0,2);

    // 月の説明文を生成（空亡月を最優先で表示）
    function makeDesc(mo){
      // 空亡月テキスト（最優先）
      if (mo.kuubouState === 'both') {
        return 'この月は2人とも空亡月ンダ🐼 空亡は吉凶どちらのエネルギーも弱まる時期だから、2人の関係も穏やかになりやすいンダ。無理に前に進もうとせず、一緒にゆっくり過ごす時間を大切にするンダヨ🐼';
      }
      if (mo.kuubouState === 'mine') {
        return 'この月はあなたの空亡月ンダ🐼 空亡は吉も凶もエネルギーが弱まる時期。運勢の波が穏やかになるから、大きな決断より内面を見つめる時間にするのがおすすめダヨ🐼';
      }
      if (mo.kuubouState === 'theirs') {
        return 'この月はお相手の空亡月ンダ🐼 空亡は良いことも悪いこともエネルギーが薄れる時期。相手のペースがゆっくりになりやすいから、焦らず見守ってあげることが大切ンダ🐼';
      }

      var s = mo.combined;
      var fm = mo.fm;
      var myKs = myCalc.kishin, ptKs = ptCalc.kishin;
      var reasons = [];
      // 流月の天干が本人の喜神
      if(myKs.indexOf(fm.gogyoKan)>=0)
        reasons.push(fm.kan+'（'+fm.gogyoKan+'）の月はあなたの喜神が強まる時期');
      // 流月の天干が相手の喜神
      if(ptKs.indexOf(fm.gogyoKan)>=0)
        reasons.push(fm.kan+'の気が'+ptName+'の運気を押し上げる月');
      // 支合
      if(SHIGOU_V[fm.shi]===myCalc.pillars.day.shi||SHIGOU_V[fm.shi]===ptCalc.pillars.day.shi)
        reasons.push(fm.shi+'の月は2人のどちらかの日支と支合し、縁が強まりやすい');
      // 六冲
      if(ROKUCHUU_V[fm.shi]===myCalc.pillars.day.shi||ROKUCHUU_V[fm.shi]===ptCalc.pillars.day.shi)
        reasons.push(fm.shi+'の月は六冲が発生しやすく、感情の波に注意');
      // 干合（相手の日干）
      if(KANGO_V[fm.kan]===ptCalc.pillars.day.kan)
        reasons.push(fm.kan+'月は'+ptName+'の日干と干合し、'+ptName+'の調子が特に上がる月');
      if(KANGO_V[fm.kan]===myCalc.pillars.day.kan)
        reasons.push(fm.kan+'月はあなたの日干と干合し、あなたの魅力が特に輝く月');

      if(reasons.length===0){
        if(s>=80) reasons.push('2人の五行エネルギーが自然と高まり合う時期');
        else if(s>=70) reasons.push('落ち着いた良い流れが続く安定した時期');
        else if(s<50) reasons.push('それぞれの運気の流れに差が出やすい時期。無理せず自分のペースを大切に');
        else reasons.push('穏やかな時期。日常の小さなことを大切にするといいンダ');
      }
      return reasons[0];
    }

    // タイムラインHTML生成
    var MONTH_NAMES = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
    var html = '<div style="position:absolute;left:52px;top:0;bottom:0;width:2px;background:rgba(255,255,255,.07);"></div>';

    months.forEach(function(mo){
      var s = mo.combined;
      // P3-A: 過去月判定を修正
      // - 現在月は過去扱いにしない
      // - BEST月・2位月は過去月でもグレーにしない（重要情報を隠さない）
      var isCurrent = mo.month === curMonth;
      var isPastRaw = mo.month < curMonth;
      // 最高: 12ヶ月中の最高スコア(同点含む) / いい:70+ / 注意:<55 / ふつう:55-69
      var isBest = s === maxM.combined;
      var isSecondBest = !isBest && s >= 70;
      var isCaution = !isBest && s < 55;
      var isBestOrSecond = isBest || isSecondBest;
      var isWorst = mo.month === minM.month && s < 55;
      // 過去月の薄表示: BEST/いい時期/注意月は除外（重要情報を隠さない）
      var isPast = isPastRaw && !isCurrent && !isBestOrSecond && !isCaution;

      // ドットの色・サイズ
      var dotStyle, labelColor, stars;
      if(isBest){
        dotStyle='width:20px;height:20px;border-radius:50%;background:var(--gold);border:2px solid rgba(255,255,255,.5);box-shadow:0 0 14px rgba(201,168,76,.5);';
        labelColor='var(--gold-l)'; stars='★★★★★';
      } else if(isSecondBest){
        dotStyle='width:18px;height:18px;border-radius:50%;background:rgba(100,200,80,.7);border:2px solid rgba(100,200,80,.9);box-shadow:0 0 10px rgba(100,200,80,.4);';
        labelColor='rgba(120,210,90,.9)'; stars='★★★★☆';
      } else if(s>=70){
        dotStyle='width:16px;height:16px;border-radius:50%;background:rgba(100,200,80,.5);border:2px solid rgba(100,200,80,.7);';
        labelColor='rgba(120,200,90,.8)'; stars='★★★★☆';
      } else if(isCaution||s<55){
        dotStyle='width:16px;height:16px;border-radius:50%;background:rgba(200,80,60,.55);border:2px solid rgba(200,80,60,.75);box-shadow:0 0 8px rgba(200,80,60,.25);';
        labelColor='rgba(210,100,80,.9)'; stars='★★☆☆☆';
      } else {
        dotStyle='width:13px;height:13px;border-radius:50%;background:rgba(255,255,255,.18);border:2px solid rgba(255,255,255,.25);';
        labelColor='rgba(255,255,255,.45)'; stars='★★★☆☆';
      }

      var desc = makeDesc(mo);
      var badge = '';
      if(isBest)        badge='<span style="padding:4px 12px;border-radius:20px;background:rgba(201,168,76,.15);border:1px solid rgba(201,168,76,.4);font-size:11px;color:rgba(232,208,120,.95);font-weight:700;letter-spacing:.05em;">✦ 最高の時期</span><span style="margin-left:6px;font-size:10px;color:#aaaaaa;">（今年の暫定ベスト）</span>';
      else if(isSecondBest) badge='<span style="padding:4px 12px;border-radius:20px;background:rgba(100,200,80,.12);border:1px solid rgba(100,200,80,.35);font-size:11px;color:rgba(120,210,90,.95);font-weight:700;letter-spacing:.05em;">いい時期</span>';
      else if(isCaution) badge='<span style="padding:4px 12px;border-radius:20px;background:rgba(200,80,60,.12);border:1px solid rgba(200,80,60,.35);font-size:11px;color:rgba(210,100,80,.95);font-weight:700;letter-spacing:.05em;">注意が必要な時期</span>';
      var pastOpacity = isPast ? 'opacity:.45;filter:grayscale(.3);' : '';

      if(isBest || isSecondBest || isCaution){
        // 展開カード
        var cardBg = isBest ? 'background:rgba(201,168,76,.06);border:1px solid rgba(201,168,76,.2);' :
                     isSecondBest ? 'background:rgba(100,200,80,.04);border:1px solid rgba(100,200,80,.15);' :
                     'background:rgba(200,80,60,.04);border:1px solid rgba(200,80,60,.15);';
        html += '<div style="display:flex;gap:0;align-items:flex-start;margin-bottom:4px;'+pastOpacity+'">'
          +'<div style="width:52px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;padding-top:12px;position:relative;z-index:1;">'
          +'<div style="'+dotStyle+'"></div></div>'
          +'<div style="flex:1;padding:8px 0 8px 16px;border-bottom:1px solid rgba(255,255,255,.04);">'
          +'<div style="'+cardBg+'border-radius:12px;padding:12px 16px;">'
          +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;flex-wrap:wrap;">'
          +'<span style="font-family:serif;font-size:'+(isBest?20:18)+'px;font-weight:800;color:'+labelColor+';min-width:34px;">'+MONTH_NAMES[mo.month-1]+'</span>'
          +badge
          +'<span style="font-size:'+(isBest?14:12)+'px;color:'+labelColor+';opacity:.8;">'+stars+'</span>'
          +'<span style="font-size:11px;color:rgba(255,255,255,.35);">流月：'+mo.fm.kan+mo.fm.shi+'</span>'
          +'</div>'
          +'<div style="font-size:13px;color:rgba(232,228,217,.75);line-height:1.9;font-family:serif;">'
          +desc
          +(isBest ? '　2人の時間を大切にするなら、この月が最もおすすめンダよ🐼' : '')
          +(isCaution ? '　無理に動かず、お互いのペースを尊重することが大切ンダ🐼' : '')
          +'</div>'
          +(isBest ? '<div style="margin-top:8px;font-size:11px;color:rgba(201,168,76,.7);">あなたの運気スコア：'+mo.myScore+' / '+ptName+'のスコア：'+mo.ptScore+' / 相性スコア：'+mo.combined+'</div>' : '')
          +(isBest && mo.tsuukanBonus > 0 ? '<div style="margin-top:6px;font-size:0.8em;color:#D4AF37;">⚖ 通関作用 +'+mo.tsuukanBonus+' ─ '+mo.tsuukanGogyo+'の気が2人の関係を調和させる月</div>' : '')
          +(isBest && mo.juniunBonus > 0 ? '<div style="margin-top:6px;font-size:0.8em;color:#D4AF37;">⚡ 十二運相乗 +'+mo.juniunBonus+' ─ 2人とも勢いのある時期。行動を起こすのに最適ンダ</div>' : '')
          +(isBest && mo.juniunBonus < 0 ? '<div style="margin-top:6px;font-size:0.8em;color:#aaaaaa;">🌙 十二運相乗 '+mo.juniunBonus+' ─ 2人ともエネルギーが穏やかな時期。ゆっくり過ごすのが吉</div>' : '')
          +(isBest && mo.doubleChuu < 0 ? '<div style="margin-top:6px;font-size:0.8em;color:#cc6666;">⚠ 双方六冲 '+mo.doubleChuu+' ─ 2人ともエネルギーが衝突しやすい月。慎重に過ごすンダ</div>' : '')
          +'</div></div></div>';
      } else {
        // シンプル行（ふつう月: テキストは solid white で視認性を確保）
        html += '<div style="display:flex;gap:0;align-items:flex-start;margin-bottom:4px;'+pastOpacity+'">'
          +'<div style="width:52px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;padding-top:14px;position:relative;z-index:1;">'
          +'<div style="'+dotStyle+'"></div></div>'
          +'<div style="flex:1;padding:10px 0 10px 16px;border-bottom:1px solid rgba(255,255,255,.04);">'
          +'<div style="display:flex;align-items:center;gap:10px;">'
          +'<span style="font-family:serif;font-size:16px;font-weight:700;color:#ffffff;min-width:34px;">'+MONTH_NAMES[mo.month-1]+'</span>'
          +'<span style="font-size:11px;color:#ffffff;">'+stars+'</span>'
          +'<span style="font-size:11px;color:#ffffff;">'+desc+'</span>'
          +'</div></div></div>';
      }
    });

    tlEl.innerHTML = html;

    // pf-popo-final のテキストにベスト月情報を含める
    var bestMonthText = topTwo.map(function(m){return MONTH_NAMES[m.month-1];}).join('と');
    var pfFinal = document.getElementById('pf-popo-final');
    if(pfFinal){
      var finalBase = {
        '相生型': '総合的に見て、あなたと'+ptName+'の相性は「一緒にいるほどお互いが成長できる、深い縁」ンダ✨',
        '比和型': '総合的に見て、あなたと'+ptName+'は「似た者同士で居心地のいい」組み合わせンダ🐼',
        '相剋型': '総合的に見て、あなたと'+ptName+'は「刺激し合って成長できる」組み合わせンダ✨',
        '中和型': '総合的に見て、あなたと'+ptName+'は「バランスのとれた」組み合わせンダ🐼',
      }[compat_type]||'';
      pfFinal.textContent = finalBase + ' 大事なことを話し合うなら'+bestMonthText+'がベストンダよ🐼 2人の命式と今年の流れを合わせて計算した結果ンダ。';
    }
  })();

  // ══════════════════════════════════════════════════════════════
  //  基本情報の書き換え（名前・生年月日・関係性・時間・性別・MBTI・出生地）
  // ══════════════════════════════════════════════════════════════

  // MBTI 4軸を判定する関数
  function getMbtiAxis(mbti) {
    if (!mbti || mbti === 'わからない') return null;
    var m = mbti.replace(/[AB]$/,'').toUpperCase();
    return {
      ei: m[0] === 'E' ? {label:'外向き（E）', cls:'them-axis'} : {label:'内向き（I）', cls:'you-axis'},
      ns: m[1] === 'N' ? {label:'直感（N）',   cls:'same'}      : {label:'現実（S）',   cls:'them-axis'},
      ft: m[2] === 'F' ? {label:'感情（F）',   cls:'same'}      : {label:'論理（T）',   cls:'them-axis'},
      jp: m[3] === 'J' ? {label:'計画的（J）', cls:'them-axis'} : {label:'柔軟（P）',   cls:'you-axis'},
    };
  }
  function getMyMbtiAxis(mbti) {
    if (!mbti || mbti === 'わからない') return null;
    var m = mbti.replace(/[AB]$/,'').toUpperCase();
    return {
      ei: m[0] === 'E' ? {label:'外向き（E）', cls:'them-axis'} : {label:'内向き（I）', cls:'you-axis'},
      ns: m[1] === 'N' ? {label:'直感（N）',   cls:'same'}      : {label:'現実（S）',   cls:'them-axis'},
      ft: m[2] === 'F' ? {label:'感情（F）',   cls:'same'}      : {label:'論理（T）',   cls:'them-axis'},
      jp: m[3] === 'J' ? {label:'計画的（J）', cls:'them-axis'} : {label:'柔軟（P）',   cls:'you-axis'},
    };
  }
  function setAxis(elId, axisObj, prefix) {
    var el = document.getElementById(elId);
    if (!el || !axisObj) return;
    el.textContent = prefix + '：' + axisObj.label;
    el.className = 'ab ' + axisObj.cls;
  }

  // ══════════════════════════════════════════════════════════════
  //  MBTI エンジン v2.0（mbti-engine.ts を vanilla JS に移植）
  // ══════════════════════════════════════════════════════════════

  // 認知機能スタック
  var COGNITIVE_STACK = {
    INTJ:['Ni','Te','Fi','Se'], INTP:['Ti','Ne','Si','Fe'],
    ENTJ:['Te','Ni','Se','Fi'], ENTP:['Ne','Ti','Fe','Si'],
    INFJ:['Ni','Fe','Ti','Se'], INFP:['Fi','Ne','Si','Te'],
    ENFJ:['Fe','Ni','Se','Ti'], ENFP:['Ne','Fi','Te','Si'],
    ISTJ:['Si','Te','Fi','Ne'], ISFJ:['Si','Fe','Ti','Ne'],
    ESTJ:['Te','Si','Ne','Fi'], ESFJ:['Fe','Si','Ne','Ti'],
    ISTP:['Ti','Se','Ni','Fe'], ISFP:['Fi','Se','Ni','Te'],
    ESTP:['Se','Ti','Fe','Ni'], ESFP:['Se','Fi','Te','Ni'],
  };

  // A/Tサブタイプ組み合わせ説明
  var SUBTYPE_COMBO_DESC = {
    'A-A': { label:'安定×安定', desc:'お互いに感情的な波が少なく、穏やかに関係を続けられるンダ。ただし刺激や変化が少なくなりやすいから、意識的に深い話をする時間を作るといいんダよ。' },
    'A-T': { label:'安定×深い感情', desc:'安定した土台を提供するあなたと、感情の深さを持つ相手がバランスよく補い合えるんダ。ただ相手の感情の揺れを「大げさ」と感じてしまうことには注意ンダよ。' },
    'T-A': { label:'深い感情×安定', desc:'感受性豊かなあなたと安定した相手の組み合わせンダ。相手の落ち着きがあなたの感情を支えてくれるんダよ🐼' },
    'T-T': { label:'深い感情×深い感情', desc:'2人とも感情が豊かで繊細なんダ。深く理解し合える強みがある反面、感情が増幅してぶつかりやすくもあるんダよ。相性がいい組み合わせなら絆が最高に深まるンダ🐼' },
  };

  // 32×32 MBTI相性マトリクス（A/T対応）
  // MBTIプロファイル（loveStyle, communicationStyle, blindSpot）
  var MBTI_PROFILES = {
    INTJ:{name:'建築家',loveStyle:'知的な対等さを求める。感情より論理で関係を評価しがち',commStyle:'明確・戦略的。目的を持って話す',blindSpot:'感情表現が苦手。相手の感情ニーズを見落としやすい'},
    INTP:{name:'論理学者',loveStyle:'知的なつながりを重視。感情より論理で関係を捉えがち',commStyle:'アイデアを精緻に展開。深い洞察に至る',blindSpot:'感情的な共感が苦手。決断を先延ばしにしやすい'},
    ENTJ:{name:'指揮官',loveStyle:'パートナーを対等な存在として尊重。共に目標を追うことで絆を深める',commStyle:'明確・直接的。目標と行動計画を中心に話す',blindSpot:'感情や個人的な価値観を軽視しやすい'},
    ENTP:{name:'討論者',loveStyle:'知的な刺激と自由を求める。相手の成長に貢献したい',commStyle:'素早い思考転換と幅広いアイデア。反論を楽しむ',blindSpot:'実行力・継続性に欠けることがある'},
    INFJ:{name:'提唱者',loveStyle:'魂レベルのつながりを求める。相手の成長を支えることに喜びを感じる',commStyle:'深い意味と象徴的な表現を好む。感情と論理の融合',blindSpot:'自己犠牲になりやすい。境界線を引くことが苦手'},
    INFP:{name:'仲介者',loveStyle:'深い感情的つながりと理解を求める。理想の愛を夢見る',commStyle:'感情と価値観を中心に話す。比喩や物語を使いやすい',blindSpot:'理想と現実のギャップで傷つきやすい。批判に過敏'},
    ENFJ:{name:'主人公',loveStyle:'相手の可能性を引き出すことに喜びを感じる。愛情深く献身的',commStyle:'温かく力強い。人の感情を読んで対応を変える',blindSpot:'自分のニーズを後回しにしやすい'},
    ENFP:{name:'広報活動家',loveStyle:'深い感情的つながりと成長を求める。相手の個性を輝かせたい',commStyle:'熱狂的・感情豊か。アイデアを飛び越えながら話す',blindSpot:'集中力・継続性に欠けることがある'},
    ISTJ:{name:'管理者',loveStyle:'安定と誠実さを重視。行動で愛情を示す',commStyle:'事実・実績ベース。明確で具体的',blindSpot:'変化への適応が遅い。感情表現が不得意'},
    ISFJ:{name:'擁護者',loveStyle:'細やかなケアで愛情を表現。相手の安心を最優先',commStyle:'穏やかで具体的。相手の気持ちを確認しながら話す',blindSpot:'自己主張が苦手。変化を恐れやすい'},
    ESTJ:{name:'幹部',loveStyle:'役割と責任を果たすことで愛情を示す',commStyle:'明確・構造的。事実と期待を直接伝える',blindSpot:'感情や個人の価値観を軽視しやすい'},
    ESFJ:{name:'領事',loveStyle:'相手の幸福を最優先。承認と感謝を大切にする',commStyle:'温かく具体的。関係の調和を意識して話す',blindSpot:'批判に敏感。承認欲求が強くなりやすい'},
    ISTP:{name:'巨匠',loveStyle:'自由と空間を必要とする。行動で思いを示す',commStyle:'簡潔・実用的。必要な情報を的確に伝える',blindSpot:'感情表現が苦手。長期的なコミットメントに慎重'},
    ISFP:{name:'冒険家',loveStyle:'体験と感情の共有を大切にする。束縛を嫌う',commStyle:'感情と感覚を通じて表現する。言葉より行動で示す',blindSpot:'将来計画が苦手。批判に傷つきやすい'},
    ESTP:{name:'起業家',loveStyle:'楽しい体験の共有を重視。自由と刺激を求める',commStyle:'直接的・エネルギッシュ。現在の事実に集中',blindSpot:'長期的視野が弱い。感情的な深みを避けがち'},
    ESFP:{name:'エンターテイナー',loveStyle:'楽しさと感情的なつながりを重視。相手を喜ばせたい',commStyle:'明るく感情豊か。ユーモアと体験を交えて話す',blindSpot:'計画・継続性が弱い。批判に過敏'},
  };

  // 認知機能の説明
  var CF_DESC = {
    Ne:'外から可能性やアイデアを収集する',Ni:'内部でパターンを統合し未来を洞察する',
    Se:'現在の現実・感覚体験に集中する',  Si:'過去の記憶・経験・安定を大切にする',
    Te:'効率・論理・システムで外を整理する',Ti:'内部で精緻な論理体系を構築する',
    Fe:'場の調和・他者の感情を最優先にする',Fi:'自分の価値観・真正性を最優先にする',
  };

  // 五行×MBTI親和性
  var GOGYO_MBTI_AFFINITY = {
    木:['ENFP','INFP','ENFJ','INFJ'],火:['ENTJ','ENTP','ESTJ','ESTP'],
    土:['ISTJ','ISFJ','ESFJ','ESTJ'],金:['INTJ','ISTJ','ISTP','INTP'],水:['INFJ','INFP','ISFP','INTP'],
  };

  // ── ヘルパー関数 ────────────────────────────────────────────
  function getBaseType(mbti){ return mbti ? mbti.replace(/-(A|T)$/,'').replace(/[AT]$/,'').toUpperCase() : ''; }
  function getSubtype(mbti){
    if(!mbti) return null;
    var m = mbti.toUpperCase();
    if(m.endsWith('-A')||m.endsWith('A')) return 'A';
    if(m.endsWith('-T')||m.endsWith('T')) return 'T';
    return null;
  }
  function toKey(mbti){
    if(!mbti||mbti==='わからない') return null;
    var base = getBaseType(mbti);
    var sub  = getSubtype(mbti);
    return sub ? base+'-'+sub : base+'-A'; // サブタイプ不明はAとして扱う
  }

  // スコア1〜5 → 点数換算
  var SCORE_MAP = {1:48,2:65,3:74,4:82,5:95};

  // ── MBTI計算 ────────────────────────────────────────────────
  var myKey = toKey(myMbti);
  var ptKey = toKey(ptMbti);
  var myBase = getBaseType(myMbti);
  var ptBase = getBaseType(ptMbti);
  var mySub  = getSubtype(myMbti);
  var ptSub  = getSubtype(ptMbti);

  var mbtiRawScore = 3; // デフォルト
  if(myKey && ptKey && MBTI_32_COMPAT[myKey] && MBTI_32_COMPAT[myKey][ptKey] !== undefined){
    mbtiRawScore = MBTI_32_COMPAT[myKey][ptKey];
  }
  // raw値は降格せず、A/T補正は後段の _msFinal で一元適用（他2経路と統一）
  var mbtiScore = SCORE_MAP[mbtiRawScore] || 74;

  var myProfile = myBase ? MBTI_PROFILES[myBase] : null;
  var ptProfile = ptBase ? MBTI_PROFILES[ptBase] : null;

  // ── DOM更新: MBTIボックス ────────────────────────────────────
  var elYouBox  = document.getElementById('pf-mbti-you-box');
  var elThemBox = document.getElementById('pf-mbti-them-box');
  if(elYouBox)  elYouBox.textContent  = myMbti  || '?';
  if(elThemBox) elThemBox.textContent = ptMbti  || '?';

  // MBTI最終スコア（A/T補正込み） ── スコアタグ・4軸カード共用
  var _msFinal = mbtiScore;
  // A×T/T×A → 補完関係で +3 / T×T → 共倒れで -3 / A×A → 淡白で ±0
  if ((mySub === 'A' && ptSub === 'T') || (mySub === 'T' && ptSub === 'A')) _msFinal = Math.min(99, _msFinal + 3);
  else if (mySub === 'T' && ptSub === 'T') _msFinal = Math.max(20, _msFinal - 3);

  // スコアタグ（ms = mbtiScore + A/T補正 に一元化）
  var elScoreTag = document.getElementById('pf-mbti-score-tag');
  if(elScoreTag){
    var hasBothMbti = myMbti && ptMbti && myMbti!=='わからない' && ptMbti!=='わからない';
    if (hasBothMbti) {
      // ms 帯域からラベルと色を導出
      var _sLabel, _sColor;
      if (_msFinal >= 82)       { _sLabel = 'とても相性が良い';   _sColor = 'rgba(80,140,240,.85)';  }
      else if (_msFinal >= 71)  { _sLabel = '良い相性';           _sColor = 'rgba(100,190,130,.85)'; }
      else if (_msFinal >= 59)  { _sLabel = 'まあまあの相性';     _sColor = 'rgba(220,180,60,.85)';  }
      else                      { _sLabel = '相性に差がある';     _sColor = 'rgba(220,80,80,.85)';   }
      elScoreTag.textContent = _msFinal + '点・' + _sLabel;
      elScoreTag.style.color = _sColor;
      elScoreTag.style.borderColor = _sColor.replace('.85)', '.3)');
      elScoreTag.style.background = _sColor.replace('.85)', '.08)');
    } else {
      elScoreTag.textContent = 'MBTI未設定';
    }
  }

  // ── 4軸更新 ─────────────────────────────────────────────────
  var AXIS_LABELS = {
    EI: { E:{label:'外向き',cls:'them-axis'}, I:{label:'内向き',cls:'you-axis'} },
    NS: { N:{label:'直感',cls:'same'},       S:{label:'現実',cls:'them-axis'} },
    FT: { F:{label:'感情',cls:'same'},       T:{label:'論理',cls:'them-axis'} },
    JP: { J:{label:'計画的',cls:'them-axis'},P:{label:'柔軟',cls:'you-axis'} },
  };
  var AXIS_DESC = {
    EI: {
      same_E: '2人とも外向きで社交的ンダ。一緒にいると自然と行動的になれて、お互いのエネルギーが高まるんダよ🐼',
      same_I: '2人とも内向きで深く考えるタイプンダ。お互いの内面を大切にしながら、静かに深い関係を築けるんダよ🐼',
      diff_good: '外向きと内向きの違いが2人をうまく補い合わせてくれるンダ。相手の行動力があなたの世界を広げ、あなたの深さが相手に落ち着きを与えるんダよ🐼',
      diff_warn: '外向きと内向きでエネルギーのリズムが違うンダ。会いたい頻度や静かに過ごしたい時間のバランスがずれやすいから、お互いのペースを言葉にし合うことが大事ンダよ🐼',
    },
    NS: {
      same_N: '2人とも直感・未来志向で、アイデアや可能性の話が大好きなタイプンダ。夢を語り合うと止まらなくなるはずンダよ🐼',
      same_S: '2人とも現実・事実重視ンダ。具体的なことを大切にして、安定した関係を築きやすいんダよ🐼',
      diff_good: '直感型と現実型の違いが視野を広げてくれるンダ。夢を描くあなたと現実を見る相手（またはその逆）が、お互いの欠点を補えるんダよ🐼',
      diff_warn: '直感型と現実型で物事の見方が違うンダ。未来の可能性を語りたい側と、いま目の前の事実を大切にしたい側で話が噛み合わないことがあるから、翻訳するつもりで伝え合うといいンダよ🐼',
      diff_bad:  '直感と現実、どこに価値を置くかが根本から違うンダ。「その話は意味ない」「その話は地に足がついてない」と思ってしまいやすい組み合わせだから、相手の世界観を否定せず、違いを面白がる姿勢が大切ンダよ🐼',
    },
    FT: {
      same_F: '2人とも感情・価値観を大切にするタイプンダ。気持ちを共有しやすく、お互いの感情を自然に受け止めてもらえるんダよ🐼',
      same_T: '2人とも論理的な思考タイプンダ。感情より理論で話し合えるから、冷静に問題を解決しやすいんダよ🐼',
      diff_good: '感情型と論理型の違いがあるんダ。心で動くあなたと論理で動く相手（またはその逆）が噛み合うとき、とても深い理解が生まれるんダよ🐼',
      diff_warn: '感情型と論理型で判断の軸が違うンダ。共感してほしい側と、解決策を出したい側でズレが起きやすいから、「いまは聞いてほしいだけ」と先に伝え合うと揉めにくいンダよ🐼',
    },
    JP: {
      same_J: '2人とも計画的で整理整頓が好きなタイプンダ。予定を立てて動くのが得意で、安心感のある関係を作りやすいんダよ🐼',
      same_P: '2人とも柔軟・自由奔放なタイプンダ。その場のノリを大切にして、自然体のまま一緒にいられるんダよ🐼',
      diff:   '計画型と柔軟型の違いがあるンダ。リードする側とついていく側がはっきりして、意外とうまくまわりやすいタイプの組み合わせなんダよ🐼',
    },
  };

  function updateAxis(axisKey, youChar, themChar, youElId, themElId, badgeElId, descElId){
    var ax = AXIS_LABELS[axisKey];
    var youData  = ax[youChar]  || {label:youChar,  cls:'same'};
    var themData = ax[themChar] || {label:themChar, cls:'same'};
    var elY = document.getElementById(youElId);
    var elT = document.getElementById(themElId);
    var elB = document.getElementById(badgeElId);
    var elD = document.getElementById(descElId);
    if(elY){ elY.textContent = 'あなたは'+youData.label;  elY.className = 'ab '+youData.cls; }
    if(elT){ elT.textContent = ptName+'は'+themData.label; elT.className = 'ab '+(youChar===themChar?'same':themData.cls); }

    var same = youChar===themChar;
    // スコアに応じたバッジラベル・色・説明文キーを決定
    // m=green(良), n=amber(注意), d=red(ズレ大)
    var badgeText = '補い合う';
    var badgeCls  = 'm';
    var descKey   = 'diff_good';
    if (same) {
      badgeText = 'ぴったり一致';
      badgeCls  = 'm';
      descKey   = 'same_'+youChar;
    } else if (axisKey === 'JP') {
      // JPは常に「補い合う」固定
      badgeText = '補い合う';
      badgeCls  = 'm';
      descKey   = 'diff';
    } else if (axisKey === 'NS') {
      // N/Sは3段階（最重要軸）
      if (_msFinal >= 75)      { badgeText = '補い合う';       badgeCls = 'm'; descKey = 'diff_good'; }
      else if (_msFinal >= 50) { badgeText = '視点が異なる';   badgeCls = 'n'; descKey = 'diff_warn'; }
      else                     { badgeText = '価値観のずれ';   badgeCls = 'd'; descKey = 'diff_bad';  }
    } else if (axisKey === 'EI') {
      // E/Iは2段階
      if (_msFinal >= 75) { badgeText = '補い合う';     badgeCls = 'm'; descKey = 'diff_good'; }
      else                { badgeText = 'リズムが違う'; badgeCls = 'n'; descKey = 'diff_warn'; }
    } else if (axisKey === 'FT') {
      // F/Tは2段階（閾値やや低め）
      if (_msFinal >= 62) { badgeText = '補い合う';       badgeCls = 'm'; descKey = 'diff_good'; }
      else                { badgeText = '判断軸が違う';   badgeCls = 'n'; descKey = 'diff_warn'; }
    }

    if(elB){
      elB.textContent = badgeText;
      elB.className   = 'axis-match '+badgeCls;
    }
    if(elD){
      var descSet = AXIS_DESC[axisKey] || {};
      var desc = descSet[descKey] || descSet['diff_good'] || descSet['diff'] || '';
      elD.textContent = desc;
    }
  }

  // 相手のMBTI未入力時はセクション全体を非表示
  var elMbtiSection = document.getElementById('pf-mbti-section');
  if (!ptBase || ptBase.length !== 4) {
    if (elMbtiSection) elMbtiSection.style.display = 'none';
  } else {
    if (elMbtiSection) elMbtiSection.style.display = '';
    if(myBase && ptBase && myBase.length===4 && ptBase.length===4){
      updateAxis('EI', myBase[0], ptBase[0], 'pf-axis-ei-you','pf-axis-ei-them','pf-axis-ei-badge','pf-axis-ei-desc');
      updateAxis('NS', myBase[1], ptBase[1], 'pf-axis-ns-you','pf-axis-ns-them','pf-axis-ns-badge','pf-axis-ns-desc');
      updateAxis('FT', myBase[2], ptBase[2], 'pf-axis-ft-you','pf-axis-ft-them','pf-axis-ft-badge','pf-axis-ft-desc');
      updateAxis('JP', myBase[3], ptBase[3], 'pf-axis-jp-you','pf-axis-jp-them','pf-axis-jp-badge','pf-axis-jp-desc');
    }
  }

  // MBTI総評ポポは削除済み

  // ── サブタイプ相性（4軸の直下に表示）───────────────────────────
  var elSubBlock = document.getElementById('pf-mbti-subtype-block');
  var elSubLabel = document.getElementById('pf-mbti-subtype-label');
  var elSubDesc  = document.getElementById('pf-mbti-subtype-desc');
  if(mySub && ptSub){
    var comboKey = mySub+'-'+ptSub;
    var combo = SUBTYPE_COMBO_DESC[comboKey];
    var _subName = { A:'自己主張型', T:'慎重型' };
    if(elSubLabel) elSubLabel.textContent = 'あなた：' + (_subName[mySub]||mySub) + '（' + mySub + '）' + ' × ' + ptName + '：' + (_subName[ptSub]||ptSub) + '（' + ptSub + '）';
    if(combo && elSubDesc)  elSubDesc.textContent  = combo.desc;
  } else if(elSubBlock) {
    elSubBlock.style.display = 'none';
  }

  // ── ペア固有テキスト更新（528ユニークペア）+ 愛し方・話し方を best 末尾に統合 ──
  var elPairBlock = document.getElementById('pf-mbti-pair-block');
  if(myBase && ptBase && MBTI_PAIR_TEXTS_528){
    // 新フォーマット：ベース型キー（例 "INFP_ENFJ"）、片方向のみ格納 → 両順試す
    var _mk = myKey || (myBase+'-A');
    var _pk = ptKey || (ptBase+'-A');
    var pairKey32 = myBase+'_'+ptBase;
    var pairKeyRev = ptBase+'_'+myBase;
    var pairData = MBTI_PAIR_TEXTS_528[pairKey32] || MBTI_PAIR_TEXTS_528[pairKeyRev];
    if(pairData){
      var elPairTitle = document.getElementById('pf-pair-title');
      var elPairAttr  = document.getElementById('pf-pair-attraction');
      var elPairFric  = document.getElementById('pf-pair-friction');
      var elPairGrow  = document.getElementById('pf-pair-growth');
      var elPairBest  = document.getElementById('pf-pair-best');
      // タイトルは「〇〇と△△」の形式。相手の日本語名で始まっていたら反転する
      var displayTitle = pairData.title || '';
      var _myProfName = (MBTI_PROFILES[myBase] && MBTI_PROFILES[myBase].name) || '';
      var _ptProfName = (MBTI_PROFILES[ptBase] && MBTI_PROFILES[ptBase].name) || '';
      if (displayTitle.indexOf('と') >= 0 && _myProfName && _ptProfName) {
        var _tparts = displayTitle.split('と');
        if (_tparts.length === 2) {
          // 先頭が相手の名前で始まっている場合は反転して自分を先に
          if (_tparts[0] === _ptProfName || _tparts[0].indexOf(_ptProfName) === 0) {
            displayTitle = _tparts[1] + 'と' + _tparts[0];
          }
        }
      }
      if(elPairTitle) elPairTitle.textContent = displayTitle;
      // ソシオニクス関係名バッジは廃止。pairData.sublabel があれば表示する（後方互換）
      var elPairSub = document.getElementById('pf-pair-sublabel');
      var subLabelText = pairData.sublabel || pairData.subLabel || '';
      if(elPairSub) { elPairSub.textContent = subLabelText; elPairSub.style.display = subLabelText ? 'inline-block' : 'none'; }

      // ── MBTIスコア帯に応じて各セクションの文章量を調整 ──
      // テキストを文単位で切り詰めるヘルパー
      function trimToSentences(text, maxSentences) {
        if (!text || maxSentences >= 99) return text || '';
        if (maxSentences <= 0) return '';
        // 「。」で区切る（最もシンプルで確実な方法）
        // 「んダ」「ンダ」等で終わる文も多いが、それらの後には通常「。」や次の文が続く
        var parts = [];
        var remaining = text;
        var dotIdx;
        while ((dotIdx = remaining.indexOf('。')) !== -1) {
          parts.push(remaining.substring(0, dotIdx + 1));
          remaining = remaining.substring(dotIdx + 1);
        }
        // 「。」がなくても「ンダ」「んダよ」「🐼」で終わる残りを1文として扱う
        if (remaining.trim()) parts.push(remaining);

        // 短すぎる断片（10文字未満）は前の文に結合
        var merged = [];
        for (var i = 0; i < parts.length; i++) {
          if (merged.length > 0 && parts[i].trim().length < 10) {
            merged[merged.length - 1] += parts[i];
          } else {
            merged.push(parts[i]);
          }
        }

        console.log('[trimToSentences] maxSentences=' + maxSentences + ', parts=' + merged.length + ', first=' + (merged[0]||'').substring(0,30));
        if (merged.length <= maxSentences) return text;
        return merged.slice(0, maxSentences).join('');
      }

      // スコア帯判定 — mbtiScore（MBTI単体スコア）を使用
      var ms = mbtiScore;
      // A×T/T×A → 補完関係で +3 / T×T → 共倒れで -3 / A×A → 淡白で ±0
      if ((mySub === 'A' && ptSub === 'T') || (mySub === 'T' && ptSub === 'A')) ms = Math.min(99, ms + 3);
      else if (mySub === 'T' && ptSub === 'T') ms = Math.max(20, ms - 3);
      console.log('[MBTI DEBUG] ms =', ms, 'mbtiScore(raw) =', mbtiScore, 'myMBTI =', _mk, 'ptMBTI =', _pk, 'mySub =', mySub, 'ptSub =', ptSub);
      var attrSentences, fricVisible, fricSentences, growSentences, bestSentences, bestVisible;
      if (ms >= 92) {
        // 引き合う:詳しく / すれ違い:非表示 / 成長:一言 / 深くつながる:詳しく
        attrSentences = 99; fricVisible = false; fricSentences = 0; growSentences = 1; bestSentences = 99; bestVisible = true;
      } else if (ms >= 82) {
        // 引き合う:詳しく / すれ違い:一言 / 成長:短く / 深くつながる:詳しく
        attrSentences = 99; fricVisible = true; fricSentences = 1; growSentences = 2; bestSentences = 99; bestVisible = true;
      } else if (ms >= 71) {
        // 引き合う:普通 / すれ違い:普通 / 成長:普通 / 深くつながる:普通
        attrSentences = 3; fricVisible = true; fricSentences = 3; growSentences = 3; bestSentences = 3; bestVisible = true;
      } else if (ms >= 59) {
        // 引き合う:短く / すれ違い:詳しく / 成長:詳しく / 深くつながる:短く
        attrSentences = 2; fricVisible = true; fricSentences = 99; growSentences = 99; bestSentences = 2; bestVisible = true;
      } else {
        // 引き合う:一言 / すれ違い:詳しく / 成長:詳しく / 深くつながる:非表示
        attrSentences = 1; fricVisible = true; fricSentences = 99; growSentences = 99; bestSentences = 0; bestVisible = false;
      }

      // MBTI軸ベースの intro は独立した要素（#pf-mbti-intro）に表示する
      var attrText = trimToSentences(pairData.attraction, attrSentences);
      // raw値（1-5）を MBTI_32_COMPAT から直接取得（変換後スコアと取り違えないよう再取得）
      var _mbtiRaw = (MBTI_32_COMPAT[_mk] && MBTI_32_COMPAT[_mk][_pk] !== undefined)
        ? MBTI_32_COMPAT[_mk][_pk]
        : 2;
      var mbtiIntroText = (myBase && ptBase) ? getMbtiIntro(myBase, ptBase, _mbtiRaw) : '';
      var elMbtiIntro = document.getElementById('pf-mbti-intro');
      if (elMbtiIntro) {
        if (mbtiIntroText) {
          elMbtiIntro.textContent = mbtiIntroText;
          elMbtiIntro.style.display = '';
        } else {
          elMbtiIntro.textContent = '';
          elMbtiIntro.style.display = 'none';
        }
      }
      if(elPairAttr) elPairAttr.textContent = attrText;

      // すれ違いの根本
      var elFricParent = elPairFric ? elPairFric.parentNode : null;
      if (elFricParent) elFricParent.style.display = fricVisible ? '' : 'none';
      if (fricVisible && elPairFric) elPairFric.textContent = trimToSentences(pairData.friction, fricSentences);

      if(elPairGrow) elPairGrow.textContent = trimToSentences(pairData.growthKey, growSentences);

      // best + 愛し方・話し方を統合
      var elBestParent = elPairBest ? elPairBest.parentNode : null;
      if (elBestParent) elBestParent.style.display = bestVisible ? '' : 'none';
      if (bestVisible && elPairBest) {
        var bestText = trimToSentences(pairData.best || '', bestSentences);
        if (myProfile || ptProfile) {
          var loveCommSuffix = '';
          if (myProfile) loveCommSuffix += ' あなたは「' + myProfile.loveStyle + '」という愛し方をし、「' + myProfile.commStyle + '」という話し方をするタイプンダ。';
          if (ptProfile) loveCommSuffix += ptName + 'は「' + ptProfile.loveStyle + '」という愛し方をし、「' + ptProfile.commStyle + '」という話し方をするんダよ。';
          bestText += loveCommSuffix;
        }
        elPairBest.textContent = bestText;
      }

      if(elPairBlock) elPairBlock.style.display = 'block';
    } else if(elPairBlock) {
      elPairBlock.style.display = 'none';
    }
  }
  // pf-pair-lovecomm は独立表示不要（best に統合済み）
  var elPairLoveComm = document.getElementById('pf-pair-lovecomm');
  if (elPairLoveComm) elPairLoveComm.parentNode.style.display = 'none';

  // 認知機能・盲点セクションは削除済み

  // ── 四柱推命 × MBTI 深化考察（4軸統合版） ──────────────────────
  (function(){

    // ── 通変星 × MBTI 主機能マッピング ─────────────────────────────
    var TSUHEN_MBTI_MAP = {
      '比肩': { mbti_func: 'Ti/Te（論理的判断）', body: '独立心と競争心が命式に強く出ている。MBTIのT（思考）機能と重なると、論理で自分の道を切り開く力がさらに強まる。F（感情）主体のMBTIと組み合わさると、論理と感情の両軸を持つ複合型になるンダ。' },
      '劫財': { mbti_func: 'Se/Si（感覚・経験）', body: '勝負強さと行動力が命式に出ている。MBTIのS（感覚）機能と重なると、リアルな現場で力を発揮する実戦型になる。N（直感）主体のMBTIと組み合わさると、直感的な戦略と実行力が融合するんダ。' },
      '食神': { mbti_func: 'Ne/Ni（直感・創造）', body: '自己表現と才能の星が命式に強く出ている。MBTIのN（直感）機能と重なると、アイデアを生み出す力が二重に強まり、芸術・創作・発信で突出した才能になる可能性があるんダよ。' },
      '傷官': { mbti_func: 'Ne/Fi（直感・内的価値観）', body: '個性と反骨心の星。MBTIのN+P（直感＋知覚型）と重なると、「誰も歩いていない道を歩く」タイプになりやすい。枠にはまらない独自性がそのまま最大の武器になるんダ。' },
      '偏財': { mbti_func: 'Se/Te（外向き行動・論理）', body: '動いて結果を出す星。MBTIのE（外向き）と重なると、行動量が突出して高くなり、人脈とチャンスを引き寄せる力がさらに強まるんダよ。' },
      '正財': { mbti_func: 'Si/Te（堅実・論理）', body: '着実に積み上げる星。MBTIのJ（判断型）と重なると、計画通りに動き続ける継続力が際立つ。S+J型のMBTIとの組み合わせが最も一貫性が高くなるんダ。' },
      '偏官': { mbti_func: 'Te/Se（外向き論理・感覚）', body: 'プレッシャーで輝く星。MBTIのE+T（外向き思考型）と重なると、競争の激しい環境でカリスマ的なリーダーシップを発揮するタイプになりやすいんダよ。' },
      '正官': { mbti_func: 'Te/Si（論理・秩序）', body: '社会的評価と誠実さの星。MBTIのJ（判断型）と重なると、ルールと信頼を積み上げる力が二重になり、組織の中で信頼される存在になりやすいんダ。' },
      '偏印': { mbti_func: 'Ni/Ti（内向き直感・論理）', body: '直感と学習の星。MBTIのN+I（内向き直感型）と重なると、独自の知識体系を内側で深めていくタイプになる。「気づいたら誰よりも詳しくなっていた」という才能の出方をするんダよ。' },
      '正印': { mbti_func: 'Fe/Si（外向き感情・記憶）', body: '知識と保護の星。MBTIのF（感情）機能と重なると、学んだことを人のために活かす力が際立つ。教育・カウンセリング・支援系の仕事で本領発揮するタイプになりやすいんダ。' },
    };

    // ── 喜神 × MBTI 環境適性マッピング ─────────────────────────────
    var KISHIN_ENV_MAP = {
      木: { env: '変化・成長の環境。新しいプロジェクト、創造的な仕事、学び続ける場所', mbti_match: ['ENFP','INFP','ENFJ','INFJ'], match_desc: 'の直感・感受性型と組み合わさると、春のように自然に力が湧いてくる環境が最適' },
      火: { env: '競争・表現の環境。行動の多い職場、人前に立つ仕事、エネルギッシュな場所', mbti_match: ['ENTJ','ENTP','ESTJ','ESTP'], match_desc: 'の外向き行動型と組み合わさると、スポットライトが当たる舞台で最大限輝ける' },
      土: { env: '安定・信頼の環境。長期的な関係、継続的な仕事、地に足のついた場所', mbti_match: ['ISTJ','ISFJ','ESFJ','ESTJ'], match_desc: 'の安定・誠実型と組み合わさると、長い時間をかけて深い絆と実績を築ける場所が最適' },
      金: { env: '精度・独立の環境。専門性を磨ける仕事、静かな作業空間、高い基準を保てる場所', mbti_match: ['INTJ','ISTJ','ISTP','INTP'], match_desc: 'の内向き論理型と組み合わさると、深く考え、妥協せず、独自の高みを目指せる環境が最適' },
      水: { env: '深さ・共感の環境。1対1の対話、内省できる時間、感情に寄り添える仕事', mbti_match: ['INFJ','INFP','ISFP','INTP'], match_desc: 'の内省・感受性型と組み合わさると、静かでも深い繋がりの中で最大の力を発揮できる' },
    };

    // ── MBTI相性タイプマッピング ─────────────────────────────────────
    var getMbtiCompatType = function(a, b) {
      if (!a || !b) return { label:'─', desc:'─' };
      var aE = a[0]==='E', bE = b[0]==='E';
      var aN = a[1]==='N', bN = b[1]==='N';
      var aF = a[2]==='F', bF = b[2]==='F';
      var aJ = a[3]==='J', bJ = b[3]==='J';
      var same_ei = aE===bE, same_nb = aN===bN, same_tf = aF===bF, same_jp = aJ===bJ;
      var score = (same_ei?1:0)+(same_nb?2:0)+(same_tf?2:0)+(same_jp?1:0);
      if(score >= 5) return { label:'鏡型', desc:'価値観・思考パターンが非常に近い。理解し合いやすい反面、同じ盲点を持つこともある' };
      if(same_nb && same_tf) return { label:'共鳴型', desc:'ものの見方と判断軸が一致している。深い話で自然に通じ合える関係' };
      if(!same_nb && !same_tf) return { label:'補完型', desc:'視点と判断軸が異なる。お互いの見えていない部分を補い合える関係' };
      if(same_nb && !same_tf) return { label:'共感型', desc:'世界の見方は似ているが、判断の仕方が違う。刺激的で学び合える関係' };
      return { label:'中和型', desc:'共通点と違いがバランス良く混在している。状況に応じて相性が変わる' };
    };

    // 五行 × MBTI の特性マッピング
    var GOGYO_MBTI_PROFILE = {
      木: {
        core: '創造性と成長への意志',
        drive: '新しいものを生み出し、可能性を広げていく',
        stress: 'コントロールを失ったり、成長を妨げられると強いストレスを感じる',
        affinity_mbti: ['ENFP','INFP','ENFJ','INFJ'],
        harmony_desc: 'の創造的・感受性豊かなMBTIと深く共鳴しやすい',
        tension_desc: 'の論理・安定重視のMBTIと組み合わさることで、感性と現実のバランスが生まれる',
      },
      火: {
        core: '情熱と行動力',
        drive: '直感で動き、まわりを巻き込みながら前進する',
        stress: '停滞したり、行動を制限されると燃え尽きやすい',
        affinity_mbti: ['ENTJ','ENTP','ESTJ','ESTP'],
        harmony_desc: 'の行動力・論理重視のMBTIと自然に連動しやすい',
        tension_desc: 'の内省・感情重視のMBTIと組み合わさることで、内と外のバランスが生まれる',
      },
      土: {
        core: '誠実さと安定への意志',
        drive: '信頼を積み重ね、長期的に人との関係を育てる',
        stress: '裏切りや突然の変化に直面すると、立ち直りに時間がかかる',
        affinity_mbti: ['ISTJ','ISFJ','ESFJ','ESTJ'],
        harmony_desc: 'の安定・誠実さを大切にするMBTIと自然に響き合いやすい',
        tension_desc: 'の変化・直感重視のMBTIと組み合わさることで、安定と革新のバランスが生まれる',
      },
      金: {
        core: '意志の強さと美意識',
        drive: '妥協せず、自分の基準を高く保ち続ける',
        stress: '自分の意志を無視されたり、価値観を侵害されると強く反発する',
        affinity_mbti: ['INTJ','ISTJ','ISTP','INTP'],
        harmony_desc: 'の論理・内省重視のMBTIと鋭く共鳴しやすい',
        tension_desc: 'の感情・社交重視のMBTIと組み合わさることで、強さと温かさのバランスが生まれる',
      },
      水: {
        core: '深い感受性と包容力',
        drive: '人の感情を読み取り、静かに支えながら深く繋がる',
        stress: '感情を理解されなかったり、深さを否定されると引きこもりやすい',
        affinity_mbti: ['INFJ','INFP','ISFP','INTP'],
        harmony_desc: 'の感受性・内省的なMBTIと深く共鳴しやすい',
        tension_desc: 'の行動・外向重視のMBTIと組み合わさることで、深さと動きのバランスが生まれる',
      },
    };

    // 五行の相性説明
    var GOGYO_REL_DESC = {
      '相生型': '支え合う（エネルギーが高め合う）',
      '比和型': '共鳴する（同じ気質で響き合う）',
      '相剋型': '刺激し合う（ぶつかるほど深まる）',
      '中和型': 'バランスを保つ（お互いを補う）',
    };

    var myGProf = myGogyo ? GOGYO_MBTI_PROFILE[myGogyo] : null;
    var ptGProf = ptGogyo ? GOGYO_MBTI_PROFILE[ptGogyo] : null;
    var gogyo_rel = compat_type || '中和型';
    var relDesc = GOGYO_REL_DESC[gogyo_rel] || 'バランスを保つ';

    // ── AXIS 01: 命式 × MBTI 気質の一致・ギャップ ───────────────────
    var elYouTitle = document.getElementById('pf-gogyo-you-title');
    var elYouBody  = document.getElementById('pf-gogyo-you-body');
    var elYouGap   = document.getElementById('pf-gogyo-you-gap');
    if(myGProf && myBase && elYouTitle && elYouBody){
      var myIsHarmony = myGProf.affinity_mbti.indexOf(myBase)>=0;
      elYouTitle.textContent = myGogyo+'（'+myGProf.core+'） × '+myBase;
      if(elYouGap){
        elYouGap.textContent = myIsHarmony ? '✓ 一致型' : '⚡ ギャップ型';
        elYouGap.style.cssText = myIsHarmony
          ? 'background:rgba(100,200,100,.12);border:1px solid rgba(100,200,100,.3);color:rgba(120,210,110,.9);'
          : 'background:rgba(220,160,60,.1);border:1px solid rgba(220,160,60,.25);color:rgba(230,170,80,.9);';
      }
      var youBody = 'あなたの命式は「'+myGogyo+'」の気質——'+myGProf.drive+'タイプンダ。';
      if(myIsHarmony){
        youBody += 'MBTIの'+myBase+'はこの気質と自然に一致している。命式とMBTIが同じ方向を向いている「一致型」だから、行動パターンと内面の動機が一貫していて、「自分らしく生きている」という感覚が強くなりやすいんダよ。';
      } else {
        youBody += 'MBTIの'+myBase+'は命式の気質と異なる方向を向いている「ギャップ型」ンダ。これはあなたの内側（命式の本質）と外側（MBTIの行動スタイル）が違うことを意味していて、自分でも「なぜこう動いてしまうのか」と感じる場面があるかもしれない。だがこのギャップがあなたの複雑な魅力と深みを作っているんダよ。';
      }
      elYouBody.textContent = youBody;
    }

    var elThemTitle = document.getElementById('pf-gogyo-them-title');
    var elThemBody  = document.getElementById('pf-gogyo-them-body');
    var elThemGap   = document.getElementById('pf-gogyo-them-gap');
    if(ptGProf && ptBase && elThemTitle && elThemBody){
      var ptIsHarmony = ptGProf.affinity_mbti.indexOf(ptBase)>=0;
      elThemTitle.textContent = ptGogyo+'（'+ptGProf.core+'） × '+ptBase;
      if(elThemGap){
        elThemGap.textContent = ptIsHarmony ? '✓ 一致型' : '⚡ ギャップ型';
        elThemGap.style.cssText = ptIsHarmony
          ? 'background:rgba(100,200,100,.12);border:1px solid rgba(100,200,100,.3);color:rgba(120,210,110,.9);'
          : 'background:rgba(220,160,60,.1);border:1px solid rgba(220,160,60,.25);color:rgba(230,170,80,.9);';
      }
      var themBody = '相手の命式は「'+ptGogyo+'」の気質——'+ptGProf.drive+'タイプんダ。';
      if(ptIsHarmony){
        themBody += 'MBTIの'+ptBase+'もその気質と一致している「一致型」だから、相手は言ってることとやってることが非常に整合している人ンダよ。相手の本質を理解するとき、命式とMBTIのどちらで見ても同じ結論に行き着くはずンダ。';
      } else {
        themBody += 'MBTIの'+ptBase+'は命式の気質とズレている「ギャップ型」だから、「外から見える相手の印象」と「相手の内側の本音」が違う場面があるんダよ。相手が時々矛盾して見えるとしたら、この2つのギャップが理由かもしれないんダ。';
      }
      elThemBody.textContent = themBody;
    }

    // ── 統合鑑定文（MBTI両者入力時のみ） ───────────────────────────
    var synthComment = document.getElementById('pf-synthesis-comment');
    var elGogyoComment = document.getElementById('pf-mbti-gogyo-comment');
    if (!myBase || !ptBase) {
      if(synthComment) synthComment.style.display = 'none';
    } else {
      if(synthComment) synthComment.style.display = 'block';
      try {
        // 通変星計算
        var _calcTsuhen = function(calc) {
          if (!calc) return null;
          var p = calc.pillars; if(!p) return null;
          var cnt={};
          var KK=['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
          var GG=['木','木','火','火','土','土','金','金','水','水'];
          var ZK={子:['壬','癸'],丑:['己','癸','辛'],寅:['甲','丙','戊'],卯:['乙'],辰:['戊','乙','癸'],巳:['丙','庚','戊'],午:['丁','己'],未:['己','丁','乙'],申:['庚','壬','戊'],酉:['辛'],戌:['戊','辛','丁'],亥:['壬','甲']};
          var S2={木:'火',火:'土',土:'金',金:'水',水:'木'};
          var K2={木:'土',火:'金',土:'水',金:'木',水:'火'};
          var dK=p.day.kan;
          function ts(n,t){var ni=KK.indexOf(n),ti=KK.indexOf(t);if(ni<0||ti<0)return null;var ng=GG[ni],tg=GG[ti],s=(ni%2)===(ti%2);if(ng===tg)return s?'比肩':'劫財';if(S2[ng]===tg)return s?'食神':'傷官';if(K2[ng]===tg)return s?'偏財':'正財';if(S2[tg]===ng)return s?'偏官':'正官';if(K2[tg]===ng)return s?'偏印':'正印';return'比肩';}
          ['year','month','hour'].forEach(function(k){if(p[k]){var t=ts(dK,p[k].kan);if(t)cnt[t]=(cnt[t]||0)+1;}});
          Object.values(p).forEach(function(pp){if(!pp)return;(ZK[pp.shi]||[]).forEach(function(z){var t=ts(dK,z);if(t)cnt[t]=(cnt[t]||0)+0.5;});});
          var s=Object.entries(cnt).sort(function(a,b){return b[1]-a[1];});
          return s.length?s[0][0]:null;
        };
        var myTsuhen = _calcTsuhen(myCalc);
        var ptTsuhen = _calcTsuhen(ptCalc);
        var myKishin = myCalc ? (myCalc.kishin||[]) : [];
        var ptKishin = ptCalc ? (ptCalc.kishin||[]) : [];
        var sharedKishin = myKishin.filter(function(g){return ptKishin.indexOf(g)>=0;});
        var mbtiCompat = getMbtiCompatType(myBase, ptBase);
        var myIsH = myGProf ? myGProf.affinity_mbti.indexOf(myBase)>=0 : false;
        var ptIsH = ptGProf ? ptGProf.affinity_mbti.indexOf(ptBase)>=0 : false;
        var gogyoPositive = ['相生型','比和型'].indexOf(gogyo_rel)>=0;
        var mbtiPositive  = ['鏡型','共鳴型','補完型'].indexOf(mbtiCompat.label)>=0;

        // MBTIの外見スタイルを詳細に言語化（E/I・S/N・T/F・J/P全4軸）
        var mbtiOuterStyle = function(m) {
          if (!m) return '';
          var ei = m[0]==='E' ? '外向き・社交的で行動から始める' : '内向き・内省的で考えてから動く';
          var sn = m[1]==='S' ? '現実・感覚重視でリアルな情報を大切にする' : '直感・未来重視でパターンや可能性を重視する';
          var tf = m[2]==='F' ? '共感・感情重視で人の気持ちを優先する' : '論理・思考重視で理由と一貫性を重視する';
          var jp = m[3]==='J' ? '計画的・決断が早い' : '柔軟・即興的で流れに乗る';
          return ei+'、'+sn+'、'+tf+'、'+jp+'タイプ';
        };

        // 五行×MBTIのギャップを「共感される具体的描写」で言語化
        var describeGap = function(gogyo, mbti, who) {
          if (!gogyo || !mbti) return '';
          var isE = mbti[0]==='E';
          var isN = mbti[1]==='N';
          var isF = mbti[2]==='F';
          var isJ = mbti[3]==='J';
          var subj = who==='you' ? 'あなた' : '相手';
          var possessive = who==='you' ? 'あなたの' : '相手の';

          // 水×外向きE系
          if (gogyo==='水' && isE) {
            return possessive+'不思議なところは、大人数の場ではいちばん明るく場を盛り上げるのに、2人きりになると急に深くて静かな話をしてくるところンダ。あのテンションはどこへ行った？と思うかもしれないが、どちらも本物——賑やかな場では'+mbti+'の行動力が出て、信頼できる相手の前では水の命式が持つ深い感受性が出てくるんダよ。';
          }
          // 水×論理T系
          if (gogyo==='水' && !isF) {
            return possessive+'不思議なところは、普段はクールで合理的な判断をするのに、ふとした瞬間に相手の感情を誰よりも正確に読んでいることンダ。本人が気づいていないくらい自然に——それが水の命式の深い共感力で、'+mbti+'の論理的な外見の裏に静かに宿っているんダよ。';
          }
          // 木×外向きE系
          if (gogyo==='木' && isE) {
            return possessive+'面白いところは、社交的で次々と行動しているように見えて、実はひとりで新しいものを生み出したり、誰も気づいていないことを深く考えている時間を大切にしているところンダ。外の賑やかさと内の創造性、どちらも本物なんダよ。';
          }
          // 木×論理T系
          if (gogyo==='木' && !isF) {
            return possessive+'特徴的なのは、感情より事実と論理で話すのに、新しいものや変化に対してだけは誰よりも早く反応するところンダ。クールに見えて実は誰より感性が鋭い——それが木の命式と'+mbti+'が作り出す独特の組み合わせなんダよ。';
          }
          // 火×内向きI系
          if (gogyo==='火' && !isE) {
            return possessive+'意外なところは、普段は落ち着いて見えるのに、何か「これだ」と思ったことに対しては突然エンジンがかかって誰より行動が早くなるところンダ。その熱量のギャップに驚いた人もいるんじゃないか——それが'+mbti+'の静かな外見と、火の命式が持つ内なる情熱のぶつかりなんダよ。';
          }
          // 火×感情F系
          if (gogyo==='火' && isF) {
            return possessive+'魅力的なところは、情熱的で行動力があるのに、相手への気遣いや共感も忘れないところンダ。「グイグイ引っ張るのに、気づいたら全員の気持ちを拾っている」——そのバランスは、火の命式と'+mbti+'が組み合わさった稀なタイプにしか出せないんダよ。';
          }
          // 土×直感N・柔軟P系
          if (gogyo==='土' && isN && !isJ) {
            return possessive+'面白いところは、「いつも同じ場所にいてほしい」と思わせる安心感があるのに、話してみると意外と自由で変化を楽しんでいるところンダ。「こんな人だと思ってなかった」と言われることが多いかもしれない——それが土の命式の安定感と'+mbti+'の柔軟さが生み出す独特の空気なんダよ。';
          }
          // 土×論理T系
          if (gogyo==='土' && !isF) {
            return possessive+'特徴的なのは、感情より論理で話すのに、長く付き合えばつき合うほど「この人は絶対に裏切らない」という安心感が増してくるところンダ。それは'+mbti+'のクールな外見の奥に、土の命式が持つ誠実さと信頼を積み上げる力が静かに動いているからなんダよ。';
          }
          // 金×外向きE系
          if (gogyo==='金' && isE) {
            return possessive+'意外なところは、社交的でノリが良さそうに見えるのに、「これだけは譲れない」というラインが人より明確にあるところンダ。そこを超えると急に冷たくなったと感じるかもしれないが、それは金の命式が持つ意志の強さが出ているだけで、外向きな'+mbti+'の顔の裏に揺るがない軸があるんダよ。';
          }
          // 金×感情F系
          if (gogyo==='金' && isF) {
            return possessive+'魅力的なのは、人の気持ちに寄り添える優しさを持ちながら、その優しさが媚びやブレとは全く違うところンダ。芯のある優しさ——それが金の命式の意志の強さと'+mbti+'の共感力が融合した、この人にしかない強みなんダよ。';
          }
          // デフォルト（カバーできないパターン）
          return possessive+'場合、命式（'+gogyo+'）とMBTI（'+mbti+'）が異なる方向を向いているんダ。普段見せる顔と、信頼した相手にだけ見せる顔が違う——そのギャップに気づいた人だけが、この人の本当の深さに触れられるんダよ。';
        };

        var text = '';

        // ① 五行相性の導入（命式ベース）
        if (myGogyo === ptGogyo) {
          text += '2人とも命式は「'+myGogyo+'」——'+myGProf.core+'を持つ気質で、五行的には「'+gogyo_rel+'（'+relDesc+'）」の関係ンダ。同じ気質同士だから、お互いの「深さ」や「動き方」を直感的に感じ取れる稀な縁ンダよ。';
        } else {
          text += '2人の命式は「'+myGogyo+'」と「'+ptGogyo+'」——五行的には「'+gogyo_rel+'（'+relDesc+'）」の関係ンダ。';
          if (gogyoPositive) {
            text += 'エネルギーが自然に引き合う組み合わせンダよ。';
          } else {
            text += 'ぶつかる部分もあるが、それが刺激になって互いを高め合う関係ンダよ。';
          }
        }

        // ② 命式×MBTI気質の一致/ギャップ（具体的なギャップ方向を含む）
        if (myIsH && ptIsH) {
          text += ' 2人とも命式とMBTIが同じ方向を向いている「一致型」ンダ。あなたは'+myGogyo+'（'+myGProf.core+'）の命式とMBTI（'+myBase+'）が一致していて、相手も'+ptGogyo+'の命式とMBTI（'+ptBase+'）が一致している。内面と行動がズレていない者同士だから、お互いに「この人は本物だ」という感覚を持ちやすく、言葉にしなくても伝わる部分が多い関係ンダよ。';
        } else if (myIsH && !ptIsH) {
          text += ' あなたは'+myGogyo+'の命式とMBTI（'+myBase+'）が一致している「一致型」で、内面と行動が読みやすいんダ。一方で相手の'+ptGogyo+'の命式とMBTI（'+ptBase+'）の間にはギャップがあるんダ。'+describeGap(ptGogyo, ptBase, 'them')+'';
        } else if (!myIsH && ptIsH) {
          text += ' '+describeGap(myGogyo, myBase, 'you')+' 一方で相手は'+ptGogyo+'の命式とMBTI（'+ptBase+'）が一致している「一致型」。相手はわかりやすく、あなたのほうが相手を読みやすい立場になりやすいんダよ。自分の内側と外側のギャップを意識することで、むしろこの関係で自分の深みを活かせるんダ。';
        } else {
          text += ' 2人ともそれぞれ命式とMBTIの間にギャップを持っているんダ。'+describeGap(myGogyo, myBase, 'you')+' そして相手も同じく——'+describeGap(ptGogyo, ptBase, 'them')+' お互いの「外から見える姿」と「内側の本音」が違う部分があるからこそ、表面的な付き合いだけでは本質が見えにくい。時間をかけて深く知り合えた先に、互いの本当の姿が見えてくる稀な関係ンダよ。';
        }

        // ③ 通変星×MBTI（動機の重なり）
        if (myTsuhen && ptTsuhen) {
          var TSUHEN_FAM = [['比肩','劫財'],['食神','傷官'],['偏財','正財'],['偏官','正官'],['偏印','正印']];
          var sameFam = TSUHEN_FAM.some(function(g){return g.indexOf(myTsuhen)>=0 && g.indexOf(ptTsuhen)>=0;});
          if (sameFam) {
            text += ' 最強通変星はあなたが「'+myTsuhen+'」・相手が「'+ptTsuhen+'」で同じ系統ンダ。行動の動機が似ているから、「なぜそう動くか」が言わなくても伝わる関係になりやすいんダよ。';
          } else {
            text += ' 最強通変星はあなたが「'+myTsuhen+'」・相手が「'+ptTsuhen+'」で異なる系統ンダ。動機の方向が違うから、相手の行動に「なぜ？」と感じることもあるかもしれないが、お互いが持っていないものを持ち合える補完関係にもなりやすいんダ。';
          }
        }

        // ④ 喜神×環境
        if (sharedKishin.length > 0) {
          text += ' 喜神が「'+sharedKishin.join('・')+'」で2人一致しているから、この五行が強まる時期や場所が2人同時に追い風になるんダよ。一緒に動くなら、この流れが来ているときを狙うといいンダ。';
        } else if (myKishin.length > 0 && ptKishin.length > 0) {
          text += ' 2人の喜神が異なる（あなた:'+myKishin.join('・')+'、相手:'+ptKishin.join('・')+'）から、追い風のタイミングがずれることもある。どちらかが低調なとき、もう一方がサポートできる理想的な補完関係ンダよ。';
        }

        // ⑤ 総合締め
        if (gogyoPositive && mbtiPositive) {
          text += ' 命式（'+gogyo_rel+'）もMBTI（'+mbtiCompat.label+'）も両方の相性が良好なんダ。この組み合わせは出会う確率自体が低い、本物の縁の可能性が高いんダよ🐼';
        } else if (gogyoPositive && !mbtiPositive) {
          text += ' 命式のエネルギーは引き合っているが、コミュニケーションのスタイルに工夫が必要な組み合わせンダ。「伝え方の違い」を意識するだけで、グッと深まる関係ンダよ🐼';
        } else if (!gogyoPositive && mbtiPositive) {
          text += ' 話は合いやすいがエネルギーのぶつかりがある「成長型」の縁ンダ。摩擦を乗り越えた先に深い絆が生まれるんダよ🐼';
        } else {
          text += ' 特別な吉縁でも強い摩擦でもない、ゼロから関係を育てられる自由度の高い組み合わせンダ。どう育てるかがこの縁の鍵ンダよ🐼';
        }

        if(elGogyoComment) elGogyoComment.textContent = text;
      } catch(e) { console.warn('Synthesis error:', e); }
    }
  })();

  // ── t-chip（タイトル下チップ）──
  var elTChip = document.getElementById('pf-t-chip');
  if (elTChip) {
    var chipText = '生年月日占い';
    if (myMbti) chipText += '（' + myMbti + '）';
    chipText += ' × ' + ptName;
    if (ptMbti) chipText += '（' + ptMbti + '）';
    chipText += ' · ' + vsLabel;
    elTChip.textContent = chipText;
  }

  // ── 相手の関係性バッジ ──
  var elRelBadge = document.getElementById('pf-pt-relation-badge');
  if (elRelBadge && partner.relation) elRelBadge.textContent = partner.relation;

  // ── MBTI ペア表示 ──
  var elMbtiYouBox  = document.getElementById('pf-mbti-you-box');
  var elMbtiThemBox = document.getElementById('pf-mbti-them-box');
  if (elMbtiYouBox)  elMbtiYouBox.textContent  = myMbti  || '?';
  if (elMbtiThemBox) elMbtiThemBox.textContent = ptMbti  || '?';

  // MBTI スコアタグ → MBTI詳細セクション側（pf-mbti-score-tag）で一元管理

  // ── think-title2（MBTIタイトル）──
  var elThinkTitle2 = document.getElementById('pf-think-title2');
  if (elThinkTitle2) {
    var ptMbtiLabel = ptMbti || 'お相手';
    var myMbtiLabel = myMbti || 'あなた';
    elThinkTitle2.textContent = ptMbtiLabel + 'の' + ptName + 'が、' + myMbtiLabel + 'のあなたに感じること';
  }

  // ── MBTI 4軸 ──
  var myAxis = getMyMbtiAxis(myMbti);
  var ptAxis = getMbtiAxis(ptMbti);
  if (myAxis) {
    setAxis('pf-axis-ei-you', myAxis.ei, 'あなた');
    setAxis('pf-axis-ns-you', myAxis.ns, 'あなた');
    setAxis('pf-axis-ft-you', myAxis.ft, 'あなた');
    setAxis('pf-axis-jp-you', myAxis.jp, 'あなた');
  }
  if (ptAxis) {
    setAxis('pf-axis-ei-them', ptAxis.ei, ptName.replace('さん',''));
    setAxis('pf-axis-ns-them', ptAxis.ns, ptName.replace('さん',''));
    setAxis('pf-axis-ft-them', ptAxis.ft, ptName.replace('さん',''));
    setAxis('pf-axis-jp-them', ptAxis.jp, ptName.replace('さん',''));
  }

  // MBTI popo 総評は削除済み

  // ══ アコーディオン初期化 ══
  // sec-label の直後の兄弟要素群を pf-acc-body で包み、デフォルト折りたたみにする
  var accIds = ['pf-acc-personality','pf-acc-howsee','pf-acc-astrology','pf-acc-mbti','pf-acc-synthesis','pf-acc-timing'];
  accIds.forEach(function(accId) {
    var card = document.getElementById(accId);
    // pf-mbti-section は data-acc-id で参照
    if (!card) {
      var el = document.querySelector('[data-acc-id="'+accId+'"]');
      if (el) card = el;
    }
    if (!card) return;
    var trigger = card.querySelector('.pf-acc-trigger');
    if (!trigger) return;
    // sec-label 以降の子要素を pf-acc-body で包む（まだ包まれていなければ）
    if (!card.querySelector('.pf-acc-body')) {
      var body = document.createElement('div');
      body.className = 'pf-acc-body';
      var children = Array.prototype.slice.call(card.children);
      var afterTrigger = false;
      children.forEach(function(child) {
        if (child === trigger || child.contains(trigger) || child.classList.contains('pf-acc-trigger')) {
          afterTrigger = true;
          return;
        }
        if (afterTrigger) body.appendChild(child);
      });
      card.appendChild(body);
    }
    // クリックイベント
    trigger.addEventListener('click', function() {
      var bodyEl = card.querySelector('.pf-acc-body');
      if (!bodyEl) return;
      var isOpen = bodyEl.classList.contains('open');
      if (isOpen) {
        bodyEl.classList.remove('open');
        trigger.classList.remove('open');
      } else {
        bodyEl.classList.add('open');
        trigger.classList.add('open');
      }
    });
  });

  // ══ 言語設定を相性詳細ページに適用 ══
  // DOMの描画完了後、現在の言語設定に基づいて翻訳を再実行
  try {
    if (window.PF_LANG && window.PF_LANG.getLang && window.PF_LANG.getLang() !== 'jp') {
      setTimeout(function() {
        window.PF_LANG.setLang(window.PF_LANG.getLang());
      }, 100);
    }
  } catch (e) {
    console.error('[compatScript] 言語適用エラー:', e);
  }
};

// Babel内でも window._pfShowCompat を定義（非同期タイミング問題を解消）
// compat-detailの初期HTMLを保存（初回のみ）
window._pfCompatInitHTML = null;
window._pfShowCompat = function() {
  const rootEl = document.getElementById('root');
  const cv = document.getElementById('pf-compat-view');
  if (!cv) {
    // pf-compat-viewが見つからない場合はアナライジングをリセット
    if (window._pfResetAnalyzing) window._pfResetAnalyzing();
    return;
  }
  // 初回: 初期HTMLを保存
  if (!window._pfCompatInitHTML) {
    window._pfCompatInitHTML = cv.innerHTML;
  } else {
    cv.innerHTML = window._pfCompatInitHTML;
  }
  if (rootEl) rootEl.style.display = 'none';
  cv.style.display = 'block';
  // ローディングを解除
  if (window._pfResetAnalyzing) window._pfResetAnalyzing();
  window.scrollTo(0, 0);
  try {
    if (typeof window._pfRunCompatScript === 'function') window._pfRunCompatScript();
  } catch(e) {
    console.error('_pfRunCompatScript error:', e);
  }
};
window._pfShowMain = function() {
  const rootEl = document.getElementById('root');
  const cv = document.getElementById('pf-compat-view');
  if (rootEl) rootEl.style.display = 'block';
  if (cv) cv.style.display = 'none';
  window.scrollTo(0, 0);
  // 相性占いタブに戻す
  if (window._pfSetActiveTab) window._pfSetActiveTab('compat');
  // ローディング状態をリセット
  if (window._pfResetAnalyzing) window._pfResetAnalyzing();
};

// ─── エラー表示オーバーレイ (元 12040-12078) ───
// ─── エラーを画面に表示 ───────────────────────────
(function() {
  var errors = [];
  function showErrors() {
    if (!errors.length) return;
    var box = document.getElementById('pf-error-display');
    if (!box) {
      box = document.createElement('div');
      box.id = 'pf-error-display';
      box.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#1a0000;color:#ff6b6b;font-family:monospace;font-size:12px;padding:12px;max-height:60vh;overflow-y:auto;border-bottom:2px solid #ff0000;';
      document.body.appendChild(box);
    }
    box.innerHTML = '<b>🚨 JS Errors (' + errors.length + '):</b><br>' +
      errors.map(function(e,i){ return (i+1)+'. '+e; }).join('<br>');
  }

  window.addEventListener('error', function(e) {
    errors.push('[Error] ' + e.message + ' @ ' + (e.filename||'').split('/').pop() + ':' + e.lineno);
    showErrors();
  });

  window.addEventListener('unhandledrejection', function(e) {
    errors.push('[Promise] ' + (e.reason && e.reason.message ? e.reason.message : String(e.reason)));
    showErrors();
  });

  // Reactエラーも捕捉
  var origConsoleError = console.error;
  console.error = function() {
    var msg = Array.prototype.slice.call(arguments).join(' ');
    if (msg.includes('Error') || msg.includes('error')) {
      errors.push('[Console] ' + msg.substring(0, 200));
      showErrors();
    }
    origConsoleError.apply(console, arguments);
  };
})();
