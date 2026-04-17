import React, { useState, useEffect } from 'react';
import { C } from '../../data/theme.js';
import { POPO_CATS, POPO_STORAGE_KEY, POPO_EXPIRE_MS } from '../../data/popo.js';
import { calcDailyScore } from '../../logic/fortuneCalc.js';
import SectionLabel from '../common/SectionLabel.jsx';
import Card from '../common/Card.jsx';
import PandaIcon from '../common/PandaIcon.jsx';

// ══════════════════════════════════════════════════════════════
//  PANDA FORTUNE — AIチャットタブ（ポポに聞く）
//  元HTML:
//    - 4204-4765行: generatePopoAnswer（長大な Q&A 生成関数）
//    - 4767-4812行: makeInitialMessages
//    - 4817-4847行: loadPopoMsgs / savePopoMsgs / clearPopoMsgs / stampMsg
//    - 4848-4995行: AiChatTab コンポーネント本体
//
//  NOTE: 元実装ではファイルトップレベルに書かれていたこれらの関数を
//  本モジュール内のローカル関数として保持している（ファイル外から
//  参照されていないため export していない）。
// ══════════════════════════════════════════════════════════════

function generatePopoAnswer(M, question) {
  var calc = M._calc || {};
  var p = calc.pillars || {};
  var dy = p.day   || {};
  var mo = p.month || {};
  var yr = p.year  || {};
  var NL = "\n";

  // ── 基本命式タブと同じデータソースを使う ──────────────────────────────
  // kishin/kijin は M.kishin/M.kijin を使う（buildMeishiki で直接格納済み）
  var kiArr = M.kishin || calc.kishin || [];
  var kjArr = M.kijin  || calc.kijin  || [];
  var ki  = kiArr.join("・") || "不明";
  var kj  = kjArr.join("・") || "不明";

  var kaku = M.kakukyoku || "普通格局";
  var kan  = (M.nichi && M.nichi.kan) || dy.kan || "壬";
  var shi  = (M.nichi && M.nichi.shi) || dy.shi || "午";
  var mbti = (M._ui && M._ui.mbti) || "";
  var gender = (M._ui && M._ui.gender) || "";

  // gokyo は M.gokyo（基本命式タブと同じソース）から取得し、内部計算用に {木,火,...} キーにもマップ
  var _mg = M.gokyo || {};
  var gokyo = { '木': _mg.moku||0, '火': _mg.hi||0, '土': _mg.do||0, '金': _mg.kin||0, '水': _mg.sui||0 };

  // 五行ランキング（基本命式タブの vals.sort と同じ方法）
  var GOGYO_KEYS = ["木","火","土","金","水"];
  var gogyoRanked = GOGYO_KEYS.map(function(g){ return {g:g, v:gokyo[g]||0}; }).sort(function(a,b){ return b.v - a.v; });
  var strongest = gogyoRanked[0].g;
  var weakest   = gogyoRanked[gogyoRanked.length-1].g;
  var total5    = gogyoRanked.reduce(function(s,x){ return s+x.v; }, 0);
  var strongPct = total5 > 0 ? Math.round((gokyo[strongest]||0) / total5 * 100) : 0;
  var weakVal   = gokyo[weakest] || 0;

  var du     = calc.currentDaiun || null;
  var duStr  = du ? du.kan + du.shi + "（" + du.ageFrom + "〜" + du.ageTo + "歳）" : "不明";
  var duGogyo = du ? ({"甲":"木","乙":"木","丙":"火","丁":"火","戊":"土","己":"土","庚":"金","辛":"金","壬":"水","癸":"水"}[du.kan] || "") : "";
  var duIsKi = kiArr.indexOf(duGogyo) >= 0;
  var duIsKj = kjArr.indexOf(duGogyo) >= 0;

  var todayS = null;
  try { todayS = calcDailyScore(calc, new Date()); } catch(e2) {}

  var nowYear = new Date().getFullYear();
  var JIKKAN_LIST = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
  var JUNISHI_LIST = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
  var yearKan = JIKKAN_LIST[(nowYear - 4) % 10];
  var yearShi = JUNISHI_LIST[(nowYear - 4) % 12];
  var yearKanshi = yearKan + yearShi;
  var JIKKAN_G  = {"甲":"木","乙":"木","丙":"火","丁":"火","戊":"土","己":"土","庚":"金","辛":"金","壬":"水","癸":"水"};
  var JUNISHI_G = {"子":"水","丑":"土","寅":"木","卯":"木","辰":"土","巳":"火","午":"火","未":"土","申":"金","酉":"金","戌":"土","亥":"水"};
  var SEI  = {"木":"火","火":"土","土":"金","金":"水","水":"木"};
  var KOKU = {"木":"土","火":"金","土":"水","金":"木","水":"火"};
  var SEI_REV = {"木":"水","火":"木","土":"火","金":"土","水":"金"};
  var KANGO = {"甲":"己","己":"甲","乙":"庚","庚":"乙","丙":"辛","辛":"丙","丁":"壬","壬":"丁","戊":"癸","癸":"戊"};
  var SHIGOU   = {"子":"丑","丑":"子","寅":"亥","亥":"寅","卯":"戌","戌":"卯","辰":"酉","酉":"辰","巳":"申","申":"巳","午":"未","未":"午"};
  var ROKUCHUU = {"子":"午","午":"子","丑":"未","未":"丑","寅":"申","申":"寅","卯":"酉","酉":"卯","辰":"戌","戌":"辰","巳":"亥","亥":"巳"};

  var kanGogyo    = JIKKAN_G[kan]  || "水";
  var shiGogyo    = JUNISHI_G[shi] || "火";
  var kangoPartner = KANGO[kan] || "─";
  var yearGogyo   = JIKKAN_G[yearKan] || "";
  var yearIsKi    = kiArr.indexOf(yearGogyo) >= 0;
  var yearIsKj    = kjArr.indexOf(yearGogyo) >= 0;

  // ── 基本命式タブと共通の辞書 ─────────────────────────────────────────
  // （meishikiタブの KI_INFO と完全同一）
  var KI_INFO = {
    木:{season:"春・朝",    dir:"東",   color:"緑・青",       obj:"植物・木製品",   lucky:"木・緑の場所"},
    火:{season:"夏・昼",    dir:"南",   color:"赤・橙",       obj:"明るい場所・炎", lucky:"火・明るい場所"},
    土:{season:"土用・午後",dir:"中央", color:"黄・茶",       obj:"土地・山",       lucky:"土・山・大地"},
    金:{season:"秋・夕",    dir:"西",   color:"白・金属",     obj:"金属・鉱石",     lucky:"金・金属・白"},
    水:{season:"冬・夜",    dir:"北",   color:"黒・紺",       obj:"水辺・川",       lucky:"水・黒・夜"},
  };

  // 五行ごとの特性（基本命式タブの vals 配列と同じ内容）
  var GOGYO_TRAIT = {
    水:{trait:"直感力・柔軟性・知性が高い。流れに乗る力が強く、環境に応じて自在に形を変えられる。",
        weak:"水が少ないと、直感が鈍く固執しやすくなる傾向があるんダ。",
        supply:"水を補うには、北方位・黒・夜・冬・水辺が吉ンダよ。"},
    火:{trait:"表現力・情熱・華やかさ。行動力があり、まわりを巻き込む熱量を持っているんダ。",
        weak:"火が少ないと、自己表現が苦手で引っ込み思案になりやすいんダ。",
        supply:"火を補うには、南方位・赤・昼・夏・明るい場所が吉ンダよ。"},
    土:{trait:"安定感・誠実さ・信頼性。地に足がついた判断力と、人を支える包容力があるんダ。",
        weak:"土が少ないと、根気がなく気持ちが安定しにくい傾向があるんダ。",
        supply:"土を補うには、中央・黄・午後・土用・山や大地が吉ンダよ。"},
    木:{trait:"成長・創造・柔軟性。新しいことへの好奇心と、しなやかに伸びていく力があるんダ。",
        weak:"木が少ないと、発想が固まりやすく新しいことへの踏み出しが遅くなりやすいんダ。",
        supply:"木を補うには、東方位・緑・朝・春・植物のある場所が吉ンダよ。"},
    金:{trait:"意志の強さ・鋭さ・美意識。妥協しない精神と、物事を整える力があるんダ。",
        weak:"金が少ないと、決断力が鈍く優柔不断になりやすい傾向があるんダ。",
        supply:"金を補うには、西方位・白・夕・秋・金属・鉱石が吉ンダよ。"},
  };

  // 格局説明（基本命式タブの kkDesc ロジックと同一）
  var isJuou = kaku.indexOf("従旺") >= 0 || kaku.indexOf("従強") >= 0;
  var kkDesc = (function(){
    var kiStr = ki !== "不明" ? ki : "喜神";
    var kjStr = kj !== "不明" ? kj : "忌神";
    if (isJuou && kanGogyo) {
      var domPct = total5 > 0 ? Math.round((gokyo[kanGogyo]||0) / total5 * 100) : 0;
      return kaku + "——「" + kanGogyo + "」のエネルギーが全体の" + domPct + "%以上を占める特別な命式ンダ。" +
        kanGogyo + "の気に逆らうより「" + kanGogyo + "らしく」生きることで本来の力が最大になるんダよ。" +
        "喜神「" + kiStr + "」が流れる" + (KI_INFO[kiArr[0]] ? KI_INFO[kiArr[0]].season : "時期") + "は特に追い風ンダ。";
    }
    return "「普通格局」——5つの五行がバランスよく分布している型ンダ。" +
      "中でも「" + strongest + "」が最も強く（" + (gokyo[strongest]||0) + "点・全体の" + strongPct + "%）、あなたの個性の核になっているんダよ。" +
      "喜神「" + kiStr + "」の流れが来る時期・場所・人が最大の追い風になるんダ。" +
      "逆に「" + weakest + "」は最も少ない（" + weakVal + "点）——" + (KI_INFO[weakest] ? KI_INFO[weakest].lucky : weakest + "の気") + "を意識すると運気が安定するんダよ🐼";
  })();

  var q = question;

  // ──────────────────────────────────────────────────────
  // 命式を一言
  // ──────────────────────────────────────────────────────
  if (q.indexOf("命式を一言") >= 0) {
    var GOGYO_PHRASE = {"木":"しなやかな成長力を持つ","火":"情熱と行動力に満ちた","土":"揺るぎない安定感を持つ","金":"高い意志と美意識を持つ","水":"深い思慮と感受性を持つ"};
    var MBTI_ADD = {"INFP":"感情と価値観を大切にする","INFJ":"直感と信念で動く","ENFP":"自由な発想で周りを巻き込む","ENFJ":"人を動かすリーダーシップを持つ","INTP":"論理と探求を愛する","INTJ":"戦略的に物事を動かす","ENTP":"アイデアを実験し続ける","ENTJ":"大局を見て決断する","ISFP":"感性で生きる自由な魂","ISFJ":"誠実に支え続ける","ESFP":"今この瞬間を全力で楽しむ","ESFJ":"周りを温かく包む","ISTP":"冷静に問題を解く職人","ISTJ":"責任感と実直さで信頼を積む","ESTP":"スピード感あるリアリスト","ESTJ":"秩序と実行力で組織を動かす"};
    var baseType = mbti ? mbti.replace(/-[AT]$/, "") : "";
    var mbtiPhrase = MBTI_ADD[baseType] ? "MBTIの" + mbti + "と組み合わさると「" + MBTI_ADD[baseType] + "」側面がさらに際立つんダよ。" : "";
    var kangoNote = "日主「" + kan + "」と干合する「" + kangoPartner + "」を日主に持つ人とは命式的に深い縁になりやすいんダ。";
    // 特殊星
    var stars = (M.tokuseiboshi && M.tokuseiboshi.length > 0) ? "特殊星は「" + M.tokuseiboshi.join("・") + "」を持っているんダ。" : "";
    return "一言で言うなら「" + (GOGYO_PHRASE[kanGogyo]||"個性的な") + kanGogyo + "の人」ンダよ🐼" + NL + NL +
      "日主「" + kan + shi + "」——" + kanGogyo + "の五行を核に持ち、日支「" + shi + "（" + shiGogyo + "）」が個性の土台を作っているんダ。" + NL +
      kkDesc + NL + NL +
      (mbtiPhrase ? mbtiPhrase + NL : "") +
      (stars ? stars + NL : "") +
      kangoNote + NL +
      "喜神「" + ki + "」が来る時期に動いて、忌神「" + kj + "」の時期は守りに入る——このリズムがこの命式を最大に活かすカギンダよ🐼";
  }

  // ──────────────────────────────────────────────────────
  // 格局
  // ──────────────────────────────────────────────────────
  if (q.indexOf("格局") >= 0 && q.indexOf("意味") >= 0) {
    return "「" + kaku + "」についてンダよ🐼" + NL + NL +
      kkDesc + NL + NL +
      "月柱（" + mo.kan + mo.shi + "）の十神は「" + (mo.jisshin||"─") + "」、年柱（" + yr.kan + yr.shi + "）の影響も命式に加わっているんダ。" + NL +
      "今の大運「" + duStr + "」は" + (duIsKi ? "喜神と重なる吉の流れ🐼" : duIsKj ? "忌神と重なる要注意の時期🐼" : "中立の流れ🐼") + "ンダよ。";
  }

  // ──────────────────────────────────────────────────────
  // 喜神の活かし方
  // ──────────────────────────────────────────────────────
  if (q.indexOf("喜神") >= 0 && q.indexOf("活か") >= 0) {
    var details = kiArr.map(function(g){
      var info = KI_INFO[g] || {};
      return "【" + g + "の気を活かす】" + NL +
        "時期：" + (info.season||"") + "　方位：" + (info.dir||"") + "　色：" + (info.color||"") + NL +
        "吉なもの：" + (info.lucky||"") + "　代表的な物：" + (info.obj||"");
    }).join(NL + NL);
    return "あなたの喜神「" + ki + "」を日常に活かす方法ンダよ🐼" + NL + NL +
      details + NL + NL +
      "特に喜神の色（" + (KI_INFO[kiArr[0]] ? KI_INFO[kiArr[0]].color : "") + "）を身につけるだけで、無意識にその気を引き寄せやすくなるんダよ。" + NL +
      "今の大運「" + duStr + "」は" + (duIsKi ? "喜神と重なっているから、今まさに動き時ンダ🐼" : "忌神寄りだから、日常の小さな喜神活用が特に大切な時期ンダよ🐼");
  }

  // ──────────────────────────────────────────────────────
  // 忌神を避けるには
  // ──────────────────────────────────────────────────────
  if (q.indexOf("忌神") >= 0 && q.indexOf("避け") >= 0) {
    var kjDetails = kjArr.map(function(g){
      var info = KI_INFO[g] || {};
      var t = GOGYO_TRAIT[g] || {};
      return "【" + g + "が強まるとき】" + NL +
        "この気が過剰になると：" + (t.weak || "") + NL +
        "避けるべき時期・場所：" + (info.season||"") + "・" + (info.dir||"") + "方位・" + (info.color||"") + "が多い環境";
    }).join(NL + NL);
    return "あなたの忌神「" + kj + "」との付き合い方ンダよ🐼" + NL + NL +
      kjDetails + NL + NL +
      "忌神は「弱点」じゃなくて「課題」ンダ。" + NL +
      "今の大運「" + duStr + "」は" + (duIsKj ? "忌神が大運に流れている時期だから、特に注意が必要ンダよ。無理に攻めず、守りを固めることに集中してほしいんダ🐼" : "忌神の影響が比較的弱い時期だから、次に忌神が強まる時期への備えをしておくといいんダよ🐼");
  }

  // ──────────────────────────────────────────────────────
  // 日主の特徴
  // ──────────────────────────────────────────────────────
  if (q.indexOf("日主") >= 0 && q.indexOf("特徴") >= 0) {
    var NICHI_DESC = {
      "甲":"まっすぐ上に伸びる大木のような存在ンダ。信念が強く曲がったことが嫌いで、一度決めたら折れないリーダーシップを自然に発揮するタイプなんダよ。周りを引っ張りたがるけど、「自分が正しい」という思い込みには気をつけてほしいんダ。",
      "乙":"しなやかな草や花のような存在ンダ。環境への適応力が高く、コツコツと着実に成長していく力を持っているんダよ。表には出にくいけど、粘り強さとしたたかさを内に秘めているんダ。",
      "丙":"太陽のように周りを明るく照らす存在ンダ。情熱と行動力に満ちていて、自然にまわりを元気にしてしまうタイプなんダよ。エネルギーが強い分、燃え尽きやすいから休息も大切にしてほしいんダ。",
      "丁":"ろうそくのような内なる炎を持つ存在ンダ。繊細で感受性が豊かで、一人ひとりを丁寧に照らす深い優しさがあるんダよ。感情移入しやすいから、人のエネルギーをもらいすぎないよう境界を持つことが大切ンダ。",
      "戊":"大きな山のような揺るぎない安定感を持つ存在ンダ。どっしりと構えてまわりの人に安心感を与えるタイプなんダよ。変化に対してゆっくりだけど、一度動き出したら確実に前進する力があるんダ。",
      "己":"肥沃な大地のような存在ンダ。柔軟性があり、いろんなものを受け入れて育てる包容力と忍耐強さが特徴なんダよ。心配性になりやすいから、信頼できる人の意見を取り入れながら動くといいんダ。",
      "庚":"鋭く輝く刀のような存在ンダ。意志が強く白黒はっきりつけたい完璧主義な面があり、高い美意識を持っているんダよ。妥協が苦手だから、「完璧でなくても前進する」勇気を持つことが成長につながるんダ。",
      "辛":"磨かれた宝石のような存在ンダ。繊細で美意識が高く、細部まで丁寧に仕上げる職人的なこだわりの強さがあるんダよ。傷つきやすい面もあるから、自分を守る境界線を意識してほしいんダ。",
      "壬":"大きな川のように深く流れる存在ンダ。思慮深く感受性が豊かで、直感が鋭く包容力と知性を兼ね備えているんダよ。流れすぎる性質があるから、時には立ち止まって方向を確認することが大切ンダ。",
      "癸":"静かに染み込む雨のような存在ンダ。繊細で感受性が高く、深いところで物事を理解し縁の下の力持ちになれるんダよ。感受性が豊かすぎて疲れやすいから、定期的に一人の時間を作ってほしいんダ。"
    };
    var desc = NICHI_DESC[kan] || (kanGogyo + "の気を持つ日主ンダ。");
    // 十二運は pillars から（buildMeishiki の unsei フィールド）
    var pillarDay = M.pillars ? M.pillars.find(function(pl){ return pl.label && pl.label.indexOf("日") >= 0; }) : null;
    var unsei = (pillarDay && pillarDay.unsei) || dy.juniunsei || "─";
    var UNSEI_DESC = {"長生":"安定した力が徐々に育つ","沐浴":"感受性が高く変化の多い","冠帯":"才能が開花し始める","建禄":"エネルギーが充実している","帝旺":"最も力が発揮できるピーク","衰":"エネルギーを保ちながら次を見据える","病":"繊細さが増し内省的になる","死":"古いものを手放して次の準備をする","墓":"内に秘めた力が蓄積される","絶":"新しいサイクルが始まる転換期","胎":"可能性が宿り始める","養":"育まれ守られる"};
    var unseiNote = unsei && UNSEI_DESC[unsei] ? "日柱の十二運「" + unsei + "」は「" + UNSEI_DESC[unsei] + "」時期を示しているんダよ。" : "";
    // 月柱の十神（基本命式タブと同一）
    var moJisshin = mo.jisshin && mo.jisshin !== "─" ? "月柱（" + mo.kan + mo.shi + "）の十神は「" + mo.jisshin + "」で、社会・仕事でのあり方に影響しているんダ。" : "";
    // 特殊星
    var starNote = (M.tokuseiboshi && M.tokuseiboshi.length > 0)
      ? "特殊星「" + M.tokuseiboshi.join("・") + "」も持っていて、この命式に独自の才能を加えているんダよ。"
      : "";
    return "日主「" + kan + "（" + kanGogyo + "）」についてンダよ🐼" + NL + NL +
      desc + NL + NL +
      (unseiNote ? unseiNote + NL : "") +
      "日支「" + shi + "（" + shiGogyo + "）」は配偶者宮とも呼ばれ、パートナーシップのあり方や内面の感情を表しているんダ。" + NL +
      (moJisshin ? moJisshin + NL : "") +
      (starNote ? starNote + NL : "") +
      (mbti ? "MBTIの「" + mbti + "」と重なると、" + kanGogyo + "の" + (kanGogyo === "水" || kanGogyo === "木" ? "感受性と洞察力" : kanGogyo === "火" ? "情熱と表現力" : kanGogyo === "金" ? "意志の強さと審美眼" : "安定感と包容力") + "がさらに際立つんダよ🐼" : "🐼");
  }

  // ──────────────────────────────────────────────────────
  // 五行バランス（基本命式タブの表示と完全同期）
  // ──────────────────────────────────────────────────────
  if (q.indexOf("五行バランス") >= 0) {
    // 基本命式タブと同じ sorted 配列ロジック
    var sortedGogyo = GOGYO_KEYS.map(function(g){
      return { g:g, v:gokyo[g]||0 };
    }).sort(function(a,b){ return b.v - a.v; });

    var gogyoLines = sortedGogyo.map(function(item, idx){
      var pct  = total5 > 0 ? Math.round(item.v / total5 * 100) : 0;
      var bar  = "●●●●●●".slice(0, Math.min(6, Math.round(item.v))) + "○○○○○○".slice(0, 6 - Math.min(6, Math.round(item.v)));
      // 役割（基本命式タブの roleLabel と同じ判定）
      var role = "";
      if (idx === 0) role = "あなたの核となる個性";
      else if (kiArr.indexOf(item.g) >= 0) role = "喜神 — 追い風の気";
      else if (kjArr.indexOf(item.g) >= 0) role = "忌神 — 消耗注意";
      else if (item.v === 0) role = "補いたいエネルギー";
      else {
        var top = sortedGogyo[0].g;
        var relUp = SEI[top]  === item.g || SEI[item.g] === top;
        var clash = KOKU[top] === item.g || KOKU[item.g] === top;
        role = relUp ? top + "を支える相生の気" : clash ? top + "と対立しやすい気" : "バランスの取れたエネルギー";
      }
      return item.g + " " + bar + " " + item.v + "点（" + pct + "%）→ " + role;
    }).join(NL);

    var t = GOGYO_TRAIT[weakest] || {};
    var weakSupp = t.supply || weakest + "の気を意識的に取り入れるといいんダよ。";
    return "あなたの五行バランスを読み解くンダよ🐼" + NL + NL +
      gogyoLines + NL + NL +
      "「" + strongest + "」が全体の" + strongPct + "%を占めていて、これがあなたの核となる個性ンダ。" + NL +
      "「" + weakest + "」が最も少なく（" + weakVal + "点）、ここのエネルギーを意識的に補うと運気が安定するんダよ。" + NL + NL +
      weakSupp + NL + NL +
      "喜神「" + ki + "」を日常に取り入れて、忌神「" + kj + "」の環境を減らすことがバランスを整えるカギンダ🐼";
  }

  // ──────────────────────────────────────────────────────
  // 今日の運勢
  // ──────────────────────────────────────────────────────
  if (q.indexOf("今日の運勢") >= 0 && q.indexOf("恋愛") < 0 && q.indexOf("仕事") < 0 && q.indexOf("金運") < 0) {
    if (!todayS) return "今日の運勢データが取得できなかったんダ。タイムライン画面で確認してほしいんダよ🐼";
    var JS_MEANINGS = {"比肩":"自分軸で動く日","劫財":"競争・消耗注意","食神":"才能・表現の日","傷官":"感性爆発・革新の日","偏財":"行動・臨時縁の日","正財":"堅実・蓄積の日","偏官":"行動力・突破の日","正官":"評価・信頼の日","偏印":"直感・内省の日","正印":"学習・サポートの日"};
    var jsMeaning = todayS.jisshin ? "（" + todayS.jisshin + "＝" + (JS_MEANINGS[todayS.jisshin]||"") + "）" : "";
    var overallMsg = todayS.total >= 78 ? "命式的にとても追い風が来ている日ンダ。先延ばしにしていたことを動かすのに最高のタイミングンダよ🐼" :
                    todayS.total >= 68 ? "良い流れの日ンダ。積極的に動いた分だけ結果がついてくる日なんダよ🐼" :
                    todayS.total >= 58 ? "穏やかな流れの日ンダ。着実にこなすことに集中するといいんダよ🐼" :
                    "少し慎重に過ごすといい日ンダ。無理に動かず、整える日にするといいんダよ🐼";
    return "今日（" + todayS.kanshi + "日）の運勢ンダよ🐼" + NL + NL +
      "総合運：" + todayS.total + "点　恋愛運：" + todayS.love + "点" + NL +
      "仕事運：" + todayS.work + "点　金運：" + todayS.money + "点" + NL +
      "今日の十神：" + (todayS.jisshin||"─") + jsMeaning + NL + NL +
      overallMsg + NL +
      "あなたの喜神「" + ki + "」" + (ki.indexOf(JIKKAN_G[todayS.dayKan]||"") >= 0 ? "が今日の天干に乗っているから、自分らしく動くほど運気が上がるんダよ🐼" : "は今日の流れには乗っていないから、喜神の色や方位を意識して過ごすといいんダ🐼");
  }

  // ──────────────────────────────────────────────────────
  // 今日の恋愛運
  // ──────────────────────────────────────────────────────
  if (q.indexOf("今日の恋愛運") >= 0) {
    if (!todayS) return "恋愛運データが取得できなかったんダ🐼";
    var loveMsgs = {
      "正官": gender === "f" ? "「正官」の日ンダ。誠実で真剣な縁が動きやすい日で、本物の関係性が育まれるんダよ。真剣な話をするなら今日が吉ンダ。" : "「正官」の日ンダ。地位や誠実さが光る日で、パートナーからの評価が上がりやすいんダよ。",
      "食神": "「食神」の日ンダ。あなたの自然な魅力や表現力が最高に輝く日なんダよ。ありのままでいることが一番の恋愛運アップになるんダ。",
      "傷官": "「傷官」の日ンダ。感性と個性が際立つ日で、惹かれる人には本能的に気づくんダよ。ただ少し感情的になりやすいから注意してほしいんダ。",
      "偏財": gender === "m" ? "「偏財」の日ンダ。行動した人に縁が来る日で、新しい出会いに積極的に動くといいんダよ。" : "「偏財」の日ンダ。魅力的な出会いの縁がある日ンダ。新しい場所に出かけるといいんダよ。",
      "正財": "「正財」の日ンダ。誠実で安定した縁が育まれる日なんダよ。派手さより真心が伝わる日ンダ。",
      "偏官": "「偏官」の日ンダ。情熱的な引力がある日だけど、感情的になりやすいから大事な話は落ち着いてからにするといいんダよ。",
      "劫財": "「劫財」の日ンダ。競争や嫉妬が生じやすいから、パートナーや気になる相手との関係はゆったりと構えた方がいいんダよ。",
      "比肩": "「比肩」の日ンダ。自分軸で動くことが大切な日で、相手に合わせすぎず自分らしくいることが一番の魅力になるんダよ。",
      "偏印": "「偏印」の日ンダ。直感が鋭い日だから、第一印象を大切にしてほしいんダよ。一人の時間も恋愛運を高めるんダ。",
      "正印": "「正印」の日ンダ。温かさと安心感が魅力になる日なんダよ。相手をサポートする姿勢が縁を深めるんダ。"
    };
    var loveSpecific = loveMsgs[todayS.jisshin] || (todayS.love >= 78 ? "恋愛への命式的な追い風が来ているんダよ。気になる相手への連絡は今日が吉ンダ。" : todayS.love >= 63 ? "穏やかな恋愛運の日ンダ。大きなアクションより、相手が嬉しいと思う小さなことを一つしてみてほしいんダよ。" : "今日は感情が揺れやすい日ンダ。大事な話は別の日に持ち越す方が吉なんダよ。");
    return "今日（" + todayS.kanshi + "日）の恋愛運は" + todayS.love + "点ンダ🐼" + NL + NL +
      loveSpecific + NL + NL +
      "あなたの日支「" + shi + "」と支合する「" + (SHIGOU[shi]||"─") + "」が流日に来る日は特に恋愛引力が強まるんダよ。" + NL +
      "喜神「" + ki + "」の気が流れる日・場所・人といると、恋愛運も自然と高まるんダ🐼";
  }

  // ──────────────────────────────────────────────────────
  // 今日の仕事運
  // ──────────────────────────────────────────────────────
  if (q.indexOf("今日の仕事運") >= 0) {
    if (!todayS) return "仕事運データが取得できなかったんダ🐼";
    var workMsgs = {
      "正官":"「正官」の日ンダ。評価・信頼・地位に関わる動きが実りやすい日なんだよ。上の人への提案・報告・アピールは今日が最適ンダ。",
      "食神":"「食神」の日ンダ。才能・アイデア・創造性が最高に輝く日なんダよ。自分らしい方法で取り組んだことが一番結果につながるんダ。",
      "傷官":"「傷官」の日ンダ。革新的なアイデアが浮かびやすい日だけど、上司への言い方には少し気をつけてほしいんダよ。「正解」より「あなたらしい答え」を出す日ンダ。",
      "偏官":"「偏官」の日ンダ。行動力・突破力が上がる日なんダよ。難しい仕事に挑戦するのに向いているけど、消耗も激しいから休息も忘れずにンダ。",
      "正財":"「正財」の日ンダ。コツコツ丁寧にこなすことが最も評価される日なんダよ。地道な作業や細かい確認に集中するといいんダ。",
      "偏財":"「偏財」の日ンダ。行動した人に成果がついてくる日なんダよ。新しい人脈や取引への積極的なアプローチが吉ンダ。",
      "正印":"「正印」の日ンダ。学習・情報収集・人からサポートをもらうことに向いた日なんダよ。インプットに集中するといい日ンダ。",
      "偏印":"「偏印」の日ンダ。直感と独自の視点が光る日なんだよ。一人で集中できる作業や、発想が必要な仕事に最適ンダ。",
      "劫財":"「劫財」の日ンダ。競争や妨害が入りやすい日なんダよ。大切な交渉や重要な契約は別の日に持ち越す方が賢明ンダ。",
      "比肩":"「比肩」の日ンダ。独立心が高まる日で、自分のペースで進めることが大切なんダよ。チームより個人作業に向いているンダ。"
    };
    var workSpecific = workMsgs[todayS.jisshin] || (todayS.work >= 75 ? "仕事運が高めの日ンダ。やろうか迷っていることを今日動かしてみてほしいんダよ🐼" : "コツコツ積み上げることに向いている日ンダよ🐼");
    return "今日（" + todayS.kanshi + "日）の仕事運は" + todayS.work + "点ンダ🐼" + NL + NL +
      workSpecific + NL + NL +
      "あなたの月支「" + mo.shi + "（社会宮）」と今日の流日が" + (SHIGOU[mo.shi] === todayS.dayShi ? "支合しているから、社会的な動きが特にスムーズな日ンダよ🐼" : ROKUCHUU[mo.shi] === todayS.dayShi ? "六冲しているから、職場での摩擦に注意してほしいんダよ🐼" : "調和的な関係ンダ。いつも通りのペースで進めるといいんダよ🐼");
  }

  // ──────────────────────────────────────────────────────
  // 今日の金運
  // ──────────────────────────────────────────────────────
  if (q.indexOf("今日の金運") >= 0) {
    if (!todayS) return "金運データが取得できなかったんダ🐼";
    var moneyMsgs = {
      "偏財":"「偏財」の星が立っているんダ。動いた人にお金がついてくる日なんダよ。新しいことへの投資や積極的な行動が吉ンダ💰",
      "正財":"「正財」の日ンダ。コツコツした努力がそのままお金につながる日なんダよ。地道で誠実な行動が金運を引き上げるんダ。",
      "食神":"「食神」の日ンダ。才能や得意なことから収入が生まれやすい日なんダよ。好きなことをやることがお金に直結するんダ。",
      "傷官":"「傷官」の日ンダ。アイデアや革新から収入のきっかけがある日なんダよ。ただ衝動的な出費には注意してほしいんダ。",
      "正官":"「正官」の日ンダ。信頼と評価からお金が動く日なんダよ。地道な仕事ぶりが評価され、収入につながる流れンダ。",
      "偏官":"「偏官」の日ンダ。行動力からお金が動くけど、急な出費や予定外の支払いも起きやすいんダよ。財布の管理を意識してほしいんダ。",
      "劫財":"「劫財」の日ンダ。散財・横取りに注意が必要な日なんダよ。衝動買いや感情的な出費は今日じゃない方がいいんダ。財布の紐をしっかり締めてほしいんダ🐼",
      "比肩":"「比肩」の日ンダ。財が散りやすい日なんだよ。他人へのおごりや見栄のための出費は控えて、自分のために使う日と決めるといいんダ。",
      "偏印":"「偏印」の日ンダ。大きな金銭行動より、情報収集や将来への投資・計画を立てることに向いた日なんダよ🐼",
      "正印":"「正印」の日ンダ。安定した収入の流れがある日なんダよ。節約や家計管理に取り組むといい成果が出るんダ。"
    };
    var moneySpecific = moneyMsgs[todayS.jisshin] || (todayS.money >= 75 ? "金運の流れがいい日ンダよ。お金に関わる積極的な行動は今日が吉ンダ🐼" : "大きな金銭行動は別の日がいいんダよ。今日は計画を立てる日にするといいんダ🐼");
    return "今日（" + todayS.kanshi + "日）の金運は" + todayS.money + "点ンダ🐼" + NL + NL +
      moneySpecific + NL + NL +
      "あなたの年支「" + yr.shi + "（財の根）」と今日の流日が" + (SHIGOU[yr.shi] === todayS.dayShi ? "支合しているから、財の根が活性化している特別な日ンダよ🐼" : "通常の関係ンダ。普段通りに丁寧にお金を扱うといいんダよ🐼");
  }

  // ──────────────────────────────────────────────────────
  // 大運
  // ──────────────────────────────────────────────────────
  if (q.indexOf("大運") >= 0) {
    if (!du) return "大運データが取得できなかったんダ🐼";
    var duType = duIsKi ? "喜神「" + ki + "」と重なる吉の大運" : duIsKj ? "忌神「" + kj + "」と重なる要注意の大運" : "命式に対して中立の大運";
    var duAdvice = duIsKi ?
      "今まさに命式の追い風が大運に乗っている最高の時期ンダよ。自分らしく動いたことが結果につながりやすいから、やりたいことに積極的に行動していいンダ。大きな決断・挑戦はこの大運期間中がおすすめンダよ🐼" :
      duIsKj ?
      "今は忌神の気が大運に流れている、守りの時期ンダ。無理に攻めず、土台を固めることに集中してほしいんダよ。でもこの時期に積み上げたものが、次の吉の大運でドカンと花開くんダ。焦らずゆっくりでいいんダよ🐼" :
      "今は命式的に中立の大運ンダ。特別な追い風も逆風もないから、自分のペースで着実に積み上げていく時期なんダよ。種を蒔くことに集中するといい時期ンダ🐼";
    var daiunList = calc.daiunList || [];
    var curIdx = du ? daiunList.indexOf(du) : -1;
    var nextDu = curIdx >= 0 && daiunList[curIdx+1] ? daiunList[curIdx+1] : null;
    var nextNote = nextDu ? NL + "次の大運「" + nextDu.kan + nextDu.shi + "（" + nextDu.ageFrom + "〜" + nextDu.ageTo + "歳）」は" + ((calc.kishin||[]).indexOf(JIKKAN_G[nextDu.kan]||"") >= 0 ? "喜神と重なる吉の大運ンダ。今から準備しておくといいんダよ🐼" : (calc.kijin||[]).indexOf(JIKKAN_G[nextDu.kan]||"") >= 0 ? "忌神寄りの大運ンダ。今のうちに基盤を固めておくといいんダよ🐼" : "中立の大運ンダよ🐼") : "";
    return "今の大運「" + du.kan + du.shi + "（" + du.ageFrom + "〜" + du.ageTo + "歳）」についてンダよ🐼" + NL + NL +
      "大運とは10年ごとに切り替わる、人生の大きな流れのことンダ。" + NL +
      "この大運の天干「" + du.kan + "」は五行「" + duGogyo + "」に属していて、" + duType + "ンダ。" + NL +
      "大運の地支「" + du.shi + "」とあなたの日支「" + shi + "」は" + (SHIGOU[du.shi] === shi ? "支合していて、特に恋愛・縁のエネルギーが高まりやすい大運ンダよ。" : ROKUCHUU[du.shi] === shi ? "六冲の関係にあって、感情の変化や転換が起きやすい大運ンダよ。" : "通常の関係ンダよ。") + NL + NL +
      duAdvice +
      nextNote;
  }

  // ──────────────────────────────────────────────────────
  // 今年
  // ──────────────────────────────────────────────────────
  if (q.indexOf("今年") >= 0) {
    var yearType = yearIsKi ? "喜神「" + ki + "」と重なる追い風の年" : yearIsKj ? "忌神「" + kj + "」と重なる守りの年" : "中立の流れの年";
    var yearAdvice = yearIsKi ?
      "喜神の気が年全体に流れているから、今年は積極的に動いた分だけ結果がついてくる年ンダよ。やりたいことに挑戦する、新しい環境に飛び込む——そういう行動が吉ンダ🐼" :
      yearIsKj ?
      "忌神の気が年に流れているから、今年は守りを固めながら動く年ンダよ。大きな勝負より、土台作りと準備に集中することが吉ンダ。来年以降に活かせる種を今年蒔いておくといいんダよ🐼" :
      "命式に対して中立の流れの年ンダ。特別な追い風も逆風もないから、コツコツ積み上げることが大切な年なんだよ🐼";
    var yearKangoNote = KANGO[yearKan] === kan || yearKan === kan ? "今年の天干「" + yearKan + "」はあなたの日主「" + kan + "」と干合・同気の関係にあるから、特に自分らしさが光りやすい年ンダよ。" : "";
    return nowYear + "年（" + yearKanshi + "）の流年を読むンダよ🐼" + NL + NL +
      "今年の干支は「" + yearKanshi + "」で、天干「" + yearKan + "」の五行は「" + yearGogyo + "」ンダ。" + NL +
      "あなたの命式から見ると、これは" + yearType + "ンダ。" + NL +
      yearKangoNote + NL + NL +
      yearAdvice + NL + NL +
      "今の大運「" + duStr + "」と今年の流年が重なって、" + (duIsKi && yearIsKi ? "大運も流年も喜神の気が重なるダブルの追い風ンダ！思い切り動いていい年なんダよ🐼" : duIsKj && yearIsKj ? "大運も流年も忌神が重なる難しい年ンダ。でも乗り越えることで次の大きな成長につながるんダよ🐼" : "流れを読みながら、いいタイミングで動くことが大切ンダよ🐼");
  }

  // ──────────────────────────────────────────────────────
  // 相性のいい人
  // ──────────────────────────────────────────────────────
  if (q.indexOf("相性のいい人") >= 0) {
    var idealG = SEI[kanGogyo] || kanGogyo;
    var sgPartner = SHIGOU[shi] || "─";
    var MBTI_COMPAT = {
      "INFP":{"good":"ENFJ・ENTJ","reason":"INFPの価値観と感性を引き出してくれる"},
      "INFJ":{"good":"ENFP・ENTP","reason":"INFJの直感を現実に繋いでくれる"},
      "ENFP":{"good":"INFJ・INTJ","reason":"ENFPの情熱に深みと方向性を与えてくれる"},
      "ENFJ":{"good":"INFP・ISFP","reason":"ENFJの熱量を受け止め豊かにしてくれる"},
      "INTP":{"good":"ENTJ・ESTJ","reason":"INTPの論理を形にしてくれる"},
      "INTJ":{"good":"ENFP・ENTP","reason":"INTJの計画に柔軟性と可能性を加えてくれる"},
      "ENTP":{"good":"INFJ・INTJ","reason":"ENTPの発散したアイデアを深化させてくれる"},
      "ENTJ":{"good":"INFP・INTP","reason":"ENTJの実行力に感性と論理の深みを加えてくれる"},
      "ISFP":{"good":"ESFJ・ENFJ","reason":"ISFPの感性を守り表現を引き出してくれる"},
      "ISFJ":{"good":"ESTP・ESFP","reason":"ISFJの安定に活気と変化を与えてくれる"},
      "ESFP":{"good":"ISFJ・ISTJ","reason":"ESFPの行動力に安定と信頼を与えてくれる"},
      "ESFJ":{"good":"ISFP・INFP","reason":"ESFJの世話好きを深い感受性で豊かにしてくれる"},
      "ISTP":{"good":"ESTJ・ENTJ","reason":"ISTPの技術に方向性と評価を与えてくれる"},
      "ISTJ":{"good":"ESFP・ESTP","reason":"ISTJの堅実さに活力と楽しさを加えてくれる"},
      "ESTP":{"good":"ISFJ・ISTJ","reason":"ESTPの行動力を安定と継続で支えてくれる"},
      "ESTJ":{"good":"INTP・ISTP","reason":"ESTJの実行力に深い思考と技術を加えてくれる"}
    };
    var baseType2 = mbti ? mbti.replace(/-[AT]$/, "") : "";
    var mbtiNote = MBTI_COMPAT[baseType2] ?
      "MBTIの「" + mbti + "」から見ると、「" + MBTI_COMPAT[baseType2].good + "」タイプの人は" + MBTI_COMPAT[baseType2].reason + "んダよ。" :
      (mbti ? "MBTIの詳細な相性は相性占い画面でご確認ンダよ🐼" : "MBTIを設定するとより詳しく分析できるんダよ🐼");
    return "あなたの命式から見た相性のいい人の特徴ンダよ🐼" + NL + NL +
      "【五行的に引き合う相手】" + NL +
      "あなたの日主「" + kan + "（" + kanGogyo + "）」と干合するのは「" + kangoPartner + "」を日主に持つ人ンダ。初めて会った気がしない不思議な引力があるんダよ。" + NL +
      "また喜神「" + ki + "」を日主に持つ人とは、あなたの運気を自然に高め合える関係になるんダよ。" + NL + NL +
      "【日支からの相性】" + NL +
      "あなたの日支「" + shi + "」と支合するのは「" + sgPartner + "」を日支に持つ人ンダ。出会った瞬間から引力を感じやすく、恋愛・パートナーシップに発展しやすい縁なんダよ。" + NL + NL +
      "【MBTIの視点】" + NL +
      mbtiNote;
  }

  // ──────────────────────────────────────────────────────
  // 五行の相生・相剋
  // ──────────────────────────────────────────────────────
  if (q.indexOf("相生") >= 0 || q.indexOf("相剋") >= 0) {
    var myIdeal = SEI_REV[kanGogyo] || "";
    var myWeak = KOKU[kanGogyo] || "";
    return "五行の相性を分かりやすく説明するンダよ🐼" + NL + NL +
      "【相生（お互いを生かす関係）】" + NL +
      "木→火→土→金→水→木という順で前の五行が次を生み出すんダ。" + NL +
      "あなたの日主「" + kanGogyo + "」を生み出してくれる五行は「" + myIdeal + "」ンダよ。" + NL + NL +
      "【相剋（ぶつかり合う関係）】" + NL +
      "木→土→水→火→金→木という順で前の五行が次を弱めるんダ。" + NL +
      "あなたの日主「" + kanGogyo + "」を剋してくる五行は「" + myWeak + "（忌神）」なんダよ。" + NL + NL +
      "【比和（同じ気同士）】" + NL +
      "同じ五行同士は価値観が近くて居心地がいい。ただ同じ弱点も共有しやすいんダよ。" + NL + NL +
      "あなたの喜神「" + ki + "」を日主に持つ人とは相生に近い関係になりやすく、忌神「" + kj + "」を日主に持つ人とは相剋関係になりやすいんダよ🐼";
  }

  // ──────────────────────────────────────────────────────
  // 支合・干合
  // ──────────────────────────────────────────────────────
  if (q.indexOf("支合") >= 0 || q.indexOf("干合") >= 0) {
    var sgPartner2 = SHIGOU[shi] || "─";
    var kangoPartner2 = KANGO[kan] || "─";
    return "支合と干合は2人の命式が持つ特別な引力ンダよ🐼" + NL + NL +
      "【干合（天干の引力）】" + NL +
      "甲↔己、乙↔庚、丙↔辛、丁↔壬、戊↔癸の組み合わせで成立するんダ。" + NL +
      "あなたの日主「" + kan + "」と干合するのは「" + kangoPartner2 + "」ンダよ。" + NL +
      "この天干を日主に持つ人とは「初めて会った気がしない」ような不思議な親しみを感じやすいんダ。" + NL + NL +
      "【日支支合（配偶者宮の引力）】" + NL +
      "日支は「配偶者宮」とも呼ばれる柱ンダ。" + NL +
      "あなたの日支「" + shi + "」と支合するのは「" + sgPartner2 + "」ンダよ。" + NL +
      "この地支を日支に持つ人とは命式的に最も強い恋愛・縁の引力があるんダよ。" + NL + NL +
      "月支「" + mo.shi + "」と支合する「" + (SHIGOU[mo.shi]||"─") + "」を月支に持つ人とは、感情のリズムが合いやすい縁ンダよ🐼";
  }

  // ──────────────────────────────────────────────────────
  // 六冲
  // ──────────────────────────────────────────────────────
  if (q.indexOf("六冲") >= 0) {
    var chuu = ROKUCHUU[shi] || "─";
    var moChu = ROKUCHUU[mo.shi] || "─";
    return "六冲は命式的に「エネルギーが真正面からぶつかる」関係ンダよ🐼" + NL + NL +
      "日支同士が六冲の関係にある2人は感情が揺れやすく、言葉が意図と違う方向に伝わることがあるんダ。" + NL + NL +
      "でも六冲は「相性が悪い」ではなくて「本気でぶつかり合える関係」なんダよ。衝突を乗り越えるたびに絆が深まって、時間をかけて本物の信頼が育まれるんダ。" + NL + NL +
      "あなたの日支「" + shi + "」と六冲する地支は「" + chuu + "」ンダよ。" + NL +
      "あなたの月支「" + mo.shi + "」と六冲する地支は「" + moChu + "」ンダ。" + NL +
      "これらの地支を日支・月支に持つ相手とは、恋愛では激しく惹かれ合い、仕事では切磋琢磨しやすい関係になるんダよ🐼";
  }

  // ──────────────────────────────────────────────────────
  // 忌神と喜神が一致
  // ──────────────────────────────────────────────────────
  if (q.indexOf("忌神と喜神が一致") >= 0) {
    var kiArr2 = calc.kishin || [];
    var kjArr2 = calc.kijin  || [];
    return "忌神と喜神が一致する相手との関係についてンダよ🐼" + NL + NL +
      "【喜神一致（吉の縁）】" + NL +
      "あなたの喜神「" + ki + "」を日主に持つ相手は、そばにいるだけであなたの命式的な運気が自然と上がるんダよ。「この人といると調子がいい」と感じるのは、命式レベルで相性がいい証拠ンダ。" + NL + NL +
      "【忌神一致（課題の縁）】" + NL +
      "あなたの忌神「" + kj + "」を日主に持つ相手とは、お互いに消耗しやすい面があるんダ。でも「縁がない」ではなくて「課題を与え合って成長できる縁」なんダよ。" + NL + NL +
      "【最も理想的な縁】" + NL +
      "あなたの喜神「" + ki + "」を日主に持ちながら、その相手にとってもあなたの日主「" + kan + "（" + kanGogyo + "）」が喜神になる——そういう相互に運気が上がる縁が最高の組み合わせンダよ🐼";
  }

  // ──────────────────────────────────────────────────────
  // MBTI×命式の相性
  // ──────────────────────────────────────────────────────
  if (q.indexOf("MBTI") >= 0 && q.indexOf("相性") >= 0) {
    var baseType3 = mbti ? mbti.replace(/-[AT]$/, "") : "";
    var mbtiNote2 = mbti ?
      "あなたのMBTIは「" + mbti + "」ンダ。相性占い画面で相手のMBTIも登録すると、EI・NS・FT・JPの4軸ごとの詳細な相性分析が見られるんダよ。" :
      "あなたのMBTIを設定すると、より詳しい分析ができるんダよ。命式変更から入力してほしいんダ。";
    var gogyoMbtiNote = kanGogyo === "水" || kanGogyo === "木" ? "感受性・直感型のあなたの命式は、MBTI的にも直感（N）を持つタイプと深く共鳴しやすいんダよ。" : kanGogyo === "火" ? "行動力・情熱型のあなたの命式は、MBTI的にも外向き（E）で動くタイプとエネルギーが合いやすいんダよ。" : kanGogyo === "金" ? "意志・審美型のあなたの命式は、MBTI的にも判断（J）タイプと価値観が合いやすいんダよ。" : "安定・包容型のあなたの命式は、MBTI的にも感情（F）重視のタイプと相性がいい傾向があるんダよ。";
    return "MBTI×命式で見る相性についてンダよ🐼" + NL + NL +
      "PANDA FORTUNEでは四柱推命（五行の相生・相剋・支合・干合）とMBTI（4軸×A/Tの32通り）の両方から相性を分析しているんダよ。" + NL + NL +
      "【計算方法】" + NL +
      "生年月日占い（命式）60% + 引き合う力（支合・干合）25% + MBTI 15%の加重平均が総合相性スコアンダ。" + NL + NL +
      gogyoMbtiNote + NL + NL +
      mbtiNote2 + NL +
      "2つの占いが重なる部分——つまり命式的にも相生で、MBTIも補完関係にある相手——が最も深い縁になりやすいんダよ🐼";
  }

  // ──────────────────────────────────────────────────────
  // デフォルト
  // ──────────────────────────────────────────────────────
  return "「" + q + "」について答えるンダよ🐼" + NL + NL +
    "あなたの命式（" + kan + shi + "日主・" + kaku + "）から見ると——" + NL +
    "喜神「" + ki + "」が流れてくる時期や場所・人に身を置くことが一番の開運のカギンダよ。" + NL +
    "忌神「" + kj + "」が強まる時期は無理せず守りに入って、喜神の時期に思い切り動く。" + NL +
    "今の大運「" + duStr + "」は" + (duIsKi ? "吉の流れンダ。今こそ動き時ンダよ🐼" : duIsKj ? "守りの時期ンダ。土台固めに集中するといいんダよ🐼" : "中立の流れンダ。着実に積み上げるといいんダよ🐼");
}



function makeInitialMessages(M) {
  var calc  = (M && M._calc) || {};
  var p     = calc.pillars || {};
  var dy    = p.day   || {};
  var mo    = p.month || {};
  var kan   = (M.nichi && M.nichi.kan) || dy.kan || "壬";
  var shi   = (M.nichi && M.nichi.shi) || dy.shi || "午";
  var kaku  = M.kakukyoku || "普通格局";
  var ki    = (calc.kishin || []).join("・") || "不明";
  var kj    = (calc.kijin  || []).join("・") || "不明";
  var mbti  = (M._ui && M._ui.mbti) || "";
  var du    = calc.currentDaiun || null;
  var duStr = du ? du.kan + du.shi : "";
  var NL = "\n";
  var JIKKAN_G  = {"甲":"木","乙":"木","丙":"火","丁":"火","戊":"土","己":"土","庚":"金","辛":"金","壬":"水","癸":"水"};
  var kanGogyo  = JIKKAN_G[kan]  || "水";
  var GOGYO_OPEN = {
    "木": "しなやかで好奇心旺盛な木の気を持つ人ンダよ🌱",
    "火": "情熱と行動力にあふれた火の気を持つ人ンダよ🔥",
    "土": "揺るぎない安定感を持つ土の気の人ンダよ🌍",
    "金": "高い意志と美意識を持つ金の気の人ンダよ💎",
    "水": "深い思慮と感受性を持つ水の気の人ンダよ🌊",
  };
  var moJisshin = (mo && mo.jisshin) ? "月柱の十神「" + mo.jisshin + "」が社会での動き方に影響しているンダ。" : "";
  var duComment = duStr ? "今は大運「" + duStr + "」の時期——" +
    (calc.kishin && du && calc.kishin.includes(JIKKAN_G[du.kan]) ?
      "喜神と重なる吉の流れの中にいるンダ🐼" :
      calc.kijin && du && calc.kijin.includes(JIKKAN_G[du.kan]) ?
      "少し守りを意識しながら動く時期ンダ🐼" :
      "着実に積み上げていく時期ンダ🐼"
    ) : "";
  var mbtiComment = mbti ? "MBTIの「" + mbti + "」と命式が重なると、" +
    (kanGogyo === "水" || kanGogyo === "木" ? "感受性と直感力が際立つ個性" :
     kanGogyo === "火" ? "情熱と表現力が突出した個性" :
     kanGogyo === "金" ? "意志の強さと美意識が光る個性" : "包容力と安定感が際立つ個性") +
    "になるんダよ。" : "";
  var text = "こんにちはンダ🐼 ポポだよ！あなたの命式、ちゃんと全部読んだんダ。" + NL + NL +
    "日主「" + kan + shi + "」——" + (GOGYO_OPEN[kanGogyo] || "") + NL +
    "格局は「" + kaku + "」で、喜神「" + ki + "」が追い風、忌神「" + kj + "」が向かい風ンダ。" + NL +
    (moJisshin ? moJisshin + NL : "") +
    (mbtiComment ? mbtiComment + NL : "") +
    (duComment ? duComment + NL : "") + NL +
    "命式・今日の運勢・相性のこと、なんでも聞いてほしいんダよ。下のボタンから選んでもいいし、直接入力してもOKンダ🐼";
  return [{ role: "popo", text: text }];
}

function loadPopoMsgs() {
  try {
    var raw = localStorage.getItem(POPO_STORAGE_KEY);
    if (!raw) return null;
    var data = JSON.parse(raw);
    if (!data || !Array.isArray(data.msgs) || data.msgs.length === 0) return null;
    var now = Date.now();
    // 最初のメッセージ（ポポ挨拶）は常に残す。それ以降を72時間で削除
    var initial = data.msgs[0];
    var rest = data.msgs.slice(1).filter(function(m) {
      return !m.sentAt || (now - m.sentAt) < POPO_EXPIRE_MS;
    });
    return [initial].concat(rest);
  } catch(e) { return null; }
}

function savePopoMsgs(msgs) {
  try {
    localStorage.setItem(POPO_STORAGE_KEY, JSON.stringify({ msgs: msgs }));
  } catch(e) {}
}

function clearPopoMsgs() {
  try { localStorage.removeItem(POPO_STORAGE_KEY); } catch(e) {}
}

// メッセージにタイムスタンプを付与するヘルパー
function stampMsg(m) {
  return Object.assign({}, m, { sentAt: Date.now() });
}


const AiChatTab = ({ meishiki }) => {
  const M = meishiki;

  // 初期化：localStorageから復元 or 新規
  const [msgs, setMsgs] = useState(function() {
    var saved = loadPopoMsgs();
    return saved || makeInitialMessages(M);
  });
  const [input, setInput] = useState("");
  const [cat, setCat]     = useState(0);
  const bottomRef         = React.useRef(null);

  // msgs が変わるたびに localStorage へ保存
  useEffect(function() {
    savePopoMsgs(msgs);
  }, [msgs]);

  useEffect(function() {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  // 最古のメッセージ（挨拶除く）のタイムスタンプから、次に削除されるまでの時間を計算（表示用）
  var oldestExpiry = null;
  try {
    var _conv = msgs.slice(1); // 挨拶を除く
    var _now = Date.now();
    var _withTs = _conv.filter(function(m){ return m.sentAt; });
    if (_withTs.length > 0) {
      var _oldest = _withTs.reduce(function(a,b){ return a.sentAt < b.sentAt ? a : b; });
      var _remainMs = POPO_EXPIRE_MS - (_now - _oldest.sentAt);
      if (_remainMs > 0) {
        var _remainHr = Math.ceil(_remainMs / (1000 * 60 * 60));
        oldestExpiry = _remainHr >= 24
          ? Math.ceil(_remainHr / 24) + "日後"
          : _remainHr + "時間後";
      }
    }
  } catch(e) {}

  const resetMsgs = function() {
    clearPopoMsgs();
    var fresh = makeInitialMessages(M);
    setMsgs(fresh);
    savePopoMsgs(fresh);
  };

  const send = function(text) {
    if (!text || !text.trim()) return;
    var trimmed = text.trim();
    var answer = generatePopoAnswer(M, trimmed);
    var now = Date.now();
    setMsgs(function(prev) {
      return prev.concat([
        { role: "user", text: trimmed, sentAt: now },
        { role: "popo", text: answer,  sentAt: now },
      ]);
    });
    setInput("");
  };

  const curCat = POPO_CATS[cat];
  const qs = curCat.questions(M);

  return (
    <div className="tab-content" style={{ display:"flex", flexDirection:"column" }}>
      <Card glow style={{ display:"flex", flexDirection:"column", padding:"16px 20px" }}>

        {/* ヘッダー */}
        <div style={{ flexShrink:0, display:"flex", alignItems:"center", gap:14, marginBottom:4 }}>
          <div style={{ width:44, height:44, borderRadius:"50%", background:"rgba(201,168,76,0.12)", border:"1px solid rgba(201,168,76,0.3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}><PandaIcon size={26} /></div>
          <div style={{ flex:1 }}>
            <p style={{ fontFamily:"'Shippori Mincho',serif", fontSize:16, fontWeight:700, color:C.gold }}>ポポに聞く</p>
            <p style={{ fontSize:11, color:C.textMuted, marginTop:2 }}>{M.nichi.kan}{M.nichi.shi}日主・{M.kakukyoku}をもとに答えるンダよ🐼</p>
          </div>

        </div>

        {/* 保存期限バナー */}
        <div style={{ flexShrink:0, display:"flex", alignItems:"center", gap:7, padding:"6px 10px", borderRadius:8, marginBottom:10,
          background:"rgba(201,168,76,0.05)", border:"1px solid rgba(201,168,76,0.12)" }}>
          <span style={{ fontSize:11 }}>💾</span>
          <p style={{ fontSize:10, color:C.textMuted, lineHeight:1.5 }}>
            会話は<span style={{ color:C.goldDim, fontWeight:600 }}>72時間経つと削除されるンダよ🐼</span>
          </p>
        </div>

        {/* カテゴリータブ */}
        <div style={{ flexShrink:0, display:"flex", gap:6, marginBottom:8, flexWrap:"wrap" }}>
          {POPO_CATS.map(function(c, ci){
            var active = cat === ci;
            return (
              <button key={ci} onClick={function(){ setCat(ci); }} style={{ padding:"5px 16px", borderRadius:20, cursor:"pointer", fontSize:11, fontWeight: active ? 600 : 400, background: active ? c.bg : "transparent", border:"1px solid " + (active ? c.border : "rgba(255,255,255,0.1)"), color: active ? c.color : C.textMuted, transition:"all 0.2s" }}>
                {c.label}
              </button>
            );
          })}
        </div>

        {/* クイック質問ボタン */}
        <div style={{ flexShrink:0, display:"flex", flexWrap:"wrap", gap:6, marginBottom:12 }}>
          {qs.map(function(q, i){
            return (
              <button key={i} onClick={function(){ send(q); }} style={{ padding:"6px 14px", borderRadius:20, cursor:"pointer", background:curCat.bg, border:"1px solid " + curCat.border, color:curCat.color, fontSize:12, transition:"all 0.2s" }}>
                {q}
              </button>
            );
          })}
        </div>

        {/* メッセージ一覧 */}
        <div style={{ height:320, overflowY:"auto", display:"flex", flexDirection:"column", gap:14, marginBottom:10, paddingRight:4 }}>
          {msgs.map(function(m, i){
            var isUser = m.role === "user";
            return (
              <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start", flexDirection: isUser ? "row-reverse" : "row" }}>
                <div style={{ flexShrink:0, width:34, height:34, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", background: isUser ? "rgba(100,140,200,0.15)" : "rgba(201,168,76,0.12)", border:"1px solid rgba(201,168,76,0.25)", fontSize:17 }}>
                  {isUser ? "👤" : <PandaIcon size={18} />}
                </div>
                <div style={{ maxWidth:"80%", padding:"13px 17px", borderRadius: isUser ? "17px 4px 17px 17px" : "4px 17px 17px 17px", background: isUser ? "rgba(100,140,200,0.08)" : "rgba(201,168,76,0.05)", border:"1px solid " + (isUser ? "rgba(100,140,200,0.2)" : "rgba(201,168,76,0.15)"), fontSize:13, lineHeight:1.95, color:C.textSub, fontFamily:"'Shippori Mincho',serif", whiteSpace:"pre-wrap" }}
                  dangerouslySetInnerHTML={{ __html: (m.text||"").replace(/🐼/g, PANDA_IMG_HTML) }}
                />
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* 入力欄 */}
        <div style={{ display:"flex", gap:10 }}>
          <input
            value={input}
            onChange={function(e){ setInput(e.target.value); }}
            onKeyDown={function(e){ if(e.key==="Enter" && input.trim()){ send(input); } }}
            placeholder="自由に質問もできるンダよ…"
            style={{ flex:1, padding:"12px 16px", borderRadius:12, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(201,168,76,0.25)", color:C.text, fontSize:13, outline:"none" }}
          />
          <button
            onClick={function(){ send(input); }}
            disabled={!input.trim()}
            style={{ padding:"12px 22px", borderRadius:12, cursor: !input.trim() ? "default" : "pointer", background: !input.trim() ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg,#b8922a,#C9A84C)", border:"none", color: !input.trim() ? C.textMuted : "#1a0d02", fontSize:14, fontWeight:700, flexShrink:0 }}
          >
            送る
          </button>
        </div>
      </Card>
    </div>
  );
};

export default AiChatTab;
