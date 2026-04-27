// ══════════════════════════════════════════════════════════════
//  PANDA FORTUNE — React 本体
//  元 panda-fortune-paid.html 2076-7924 行 <script type="text/babel"> を
//  そのまま移植。末尾の ReactDOM.createRoot(...) のみ export default に差し替え。
//
//  依存グローバル (副作用 import で window に登録される):
//    - window.PF_LANG           → ./data/translations.js
//    - window.calcMbtiScore etc → ./engines/mbtiEngineRaw.js
//    - window._calcMeishiki etc → ./engines/meishikiEngineRaw.js
//    - window._pfShowCompat etc → ./compat/compatScript.js
// ══════════════════════════════════════════════════════════════
import './index.css';
import './styles/mobileChart.css';
import './data/translations.js';
import './engines/mbtiEngineRaw.js';
import './engines/meishikiEngineRaw.js';
import { GENMEI_TEXTS, getGenmei, getGenmeiTextsByLang, getZokanList, getMonthZokan } from './data/genmeiText.js';
import {
  getGogyoTraitsByLang,
  getJuniuInfoShort,
  getJuniuInfoFull,
} from './data/meishikiSharedTexts.js';
import { langPick, tt } from './i18n/templateHelpers.js';
import * as AT from './data/appTemplatesKr.js';
import { getStarDescByLang, buildStarFallback_JA, buildStarFallback_KR, getKuubouDescByLang, getTsuhenInfoByLang } from './data/meishikiInlineDescs.js';
import { getTenkanIcon, getTenkanYomi } from './data/tenkanIcons.js';
import { getChishiIcon, getChishiYomi } from './data/chishiIcons.js';
import * as ACK from './data/aiChatKr.js';
import { translatePopoAnswer } from './data/popoAnswersKr.js';
import {
  NIKCHU_SELF_PROFILES_KR, JUNIU_NATURE_KR,
  buildGogyoText_KR, buildWeakText_KR, buildKakuDetailText_KR,
  buildKiText_KR, buildJuniuNatureText_KR, buildDuText_KR,
} from './data/meishikiTextsKr.js';
import React from 'react';
// NOTE: babel スクリプト本体は `const { useState, useEffect } = React` 形式でフックを取り出すため
// named import は行わない（重複宣言エラー回避）。React も window に公開して compatScript からアクセス可能にする
if (typeof window !== 'undefined') window.React = React;
// compat 制御スクリプトは React マウント後に必要。最後に副作用 import
import './compat/compatScript.js';

// ── グローバルエラーオーバーレイ（Reactより前の構文エラーも捕捉） ──
(function() {
  function showGlobalError(msg, src, line, col, err) {
    var el = document.getElementById('pf-global-error');
    if (!el) {
      el = document.createElement('div');
      el.id = 'pf-global-error';
      el.style.cssText = [
        'position:fixed','top:0','left:0','right:0','bottom:0','z-index:99999',
        'background:#fff','color:#111','font-family:monospace',
        'display:flex','flex-direction:column','align-items:center','justify-content:center',
        'padding:32px','box-sizing:border-box','overflow:auto',
      ].join(';');
      document.body.appendChild(el);
    }
    var stack = err && err.stack ? err.stack : '';
    el.innerHTML = [
      '<div style="max-width:720px;width:100%">',
      '<div style="font-size:28px;margin-bottom:12px">🐼💥 エラーが発生しました</div>',
      '<div style="background:#fee;border:2px solid #c00;border-radius:8px;padding:16px;margin-bottom:16px">',
      '<b style="color:#c00;font-size:15px">エラーメッセージ</b><br>',
      '<pre style="margin-top:8px;white-space:pre-wrap;font-size:13px;color:#900">' + (msg||'不明') + '</pre>',
      '</div>',
      (src ? '<div style="font-size:12px;color:#555;margin-bottom:8px">📍 場所: ' + src + (line ? ' 行' + line : '') + (col ? ' 列' + col : '') + '</div>' : ''),
      (stack ? '<details open><summary style="cursor:pointer;font-size:12px;color:#555;margin-bottom:6px">📋 スタックトレース</summary><pre style="background:#f5f5f5;padding:12px;border-radius:6px;font-size:11px;overflow-x:auto;white-space:pre-wrap;color:#444">' + stack + '</pre></details>' : ''),
      '<button onclick="document.getElementById(\'pf-global-error\').remove()" style="margin-top:16px;padding:10px 24px;background:#c00;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px">✕ 閉じて試す</button>',
      '</div>',
    ].join('');
  }
  window.addEventListener('error', function(e) {
    showGlobalError(e.message, e.filename, e.lineno, e.colno, e.error);
  });
  window.addEventListener('unhandledrejection', function(e) {
    showGlobalError('Promise エラー: ' + (e.reason && e.reason.message ? e.reason.message : String(e.reason)), '', '', '', e.reason);
  });
})();

// ErrorBoundary（エラー表示用）
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null, stack: null }; }
  componentDidCatch(error, info) { this.setState({ error: error.message, stack: info.componentStack }); }
  static getDerivedStateFromError(e) { return { error: e.message, stack: e.stack || '' }; }
  render() {
    if (this.state.error) return (
      <div style={{
        position:'fixed', top:0, left:0, right:0, bottom:0, zIndex:9999,
        background:'#fff', color:'#111', fontFamily:'monospace',
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        padding:32, boxSizing:'border-box', overflowY:'auto',
      }}>
        <div style={{maxWidth:720, width:'100%'}}>
          <div style={{fontSize:28, marginBottom:12}}>🐼💥 Reactエラー</div>
          <div style={{background:'#fee', border:'2px solid #c00', borderRadius:8, padding:16, marginBottom:16}}>
            <b style={{color:'#c00', fontSize:15}}>エラーメッセージ</b><br/>
            <pre style={{marginTop:8, whiteSpace:'pre-wrap', fontSize:13, color:'#900'}}>{this.state.error}</pre>
          </div>
          {this.state.stack && (
            <details open>
              <summary style={{cursor:'pointer', fontSize:12, color:'#555', marginBottom:6}}>📋 コンポーネントスタック</summary>
              <pre style={{background:'#f5f5f5', padding:12, borderRadius:6, fontSize:11, overflowX:'auto', whiteSpace:'pre-wrap', color:'#444'}}>{this.state.stack}</pre>
            </details>
          )}
          <button onClick={()=>this.setState({error:null,stack:null})} style={{marginTop:16, padding:'10px 24px', background:'#c00', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:14}}>✕ 閉じて試す</button>
        </div>
      </div>
    );
    return this.props.children;
  }
}
const { useState, useEffect } = React;


// ── 命式データをエンジンから組み立てる関数 ──
function buildMeishiki(calc, ui) {
  const p = calc.pillars;
  const HOUR_SHI = ['子','子','丑','丑','寅','寅','卯','卯','辰','辰','巳','巳','午','午','未','未','申','申','酉','酉','戌','戌','亥','亥'];
  const corrH = Math.floor(calc.input.correctedHour);
  const corrM = Math.round((calc.input.correctedHour - corrH) * 60);
  const _t = (jp) => (typeof window !== 'undefined' && window.PF_LANG && window.PF_LANG.t) ? window.PF_LANG.t(jp) : jp;
  const corrStr = calc.input.correctionMin !== 0
    ? `${corrH}:${String(corrM).padStart(2,'0')}（${calc.input.correctionMin > 0 ? '+' : ''}${calc.input.correctionMin}${_t('分補正')}）`
    : `${corrH}:${String(corrM).padStart(2,'0')}`;
  const hourStr = ui.hourInput >= 0 ? `${HOUR_SHI[ui.hourInput]}${_t('の刻')}` : _t('時間不明');
  return {
    name: { last: ui.lastName||'', first: ui.firstName||'' },
    birthDate: `${ui.year}年${ui.month}月${ui.day}日`,
    birthTime: hourStr,
    birthPlace: `${ui.placeName||''}・東経${ui.longitude}°`,
    correctedTime: corrStr,
    gender: ui.gender === 'f' ? '女性' : '男性',
    mbti: ui.mbti || '',
    nichi: { kan: p.day.kan, shi: p.day.shi },
    pillars: ['year','month','day','hour'].filter(k=>p[k]).map(k=>({
      label: p[k].label, kan: p[k].kan, shi: p[k].shi,
      jisshin: k==='day' ? '─' : p[k].jisshin.replace('─（日主）','─'),
      unsei: p[k].juniunsei,
    })),
    zokan: ['year','month','day','hour'].filter(k=>p[k]).map(k=>({ shi: p[k].shi, zokan: p[k].zokan })),
    gokyo: { moku: calc.gokyo['木']||0, hi: calc.gokyo['火']||0, do: calc.gokyo['土']||0, kin: calc.gokyo['金']||0, sui: calc.gokyo['水']||0 },
    kakukyoku: calc.kakukyoku.name,
    kishin: [...calc.kishin],
    kijin:  [...calc.kijin],
    nikishin: { ki: calc.kishin.join('・')+'（喜神）', ki2: calc.kijin.join('・')+'（忌神）' },
    tokuseiboshi: calc.tokuseiboshi,
    kuubou: calc.kuubou || [],
    kuubouType: calc.kuubouType || '',
    daiunList: calc.daiunList.map(d => ({ age: `${d.ageFrom}〜${d.ageTo}歳`, kan: d.kan, shi: d.shi })),
    _calc: calc,
    _ui: ui,
  };
}

// 初期 MEISHIKI（ページ起動時の計算値）
let MEISHIKI = buildMeishiki(window._MEISHIKI_CALC, window._FORTUNE_INPUT);

// ── カラー定数 ──
const C = {
  bg: "#0e0608",
  surface: "#16090a",
  card: "#1c0d0b",
  border: "rgba(201,168,76,0.18)",
  borderHover: "rgba(201,168,76,0.45)",
  gold: "#C9A84C",
  goldLight: "#e8c97a",
  goldDim: "rgba(201,168,76,0.5)",
  text: "#f0e6d0",
  textMuted: "rgba(240,230,208,0.45)",
  textSub: "rgba(240,230,208,0.65)",
  red: "#7a1a10",
  waterBlue: "rgba(80,140,200,0.7)",
  fireRed: "rgba(200,80,60,0.7)",
  woodGreen: "rgba(80,160,80,0.7)",
  earthYellow: "rgba(180,150,60,0.7)",
  metalWhite: "rgba(200,200,200,0.7)",
};

// ── 五行バー ──
const GOGYO_ICON = { 木:'🌿', 火:'🔥', 土:'🪨', 金:'⚙️', 水:'💧' };
const GOGYO_KEYWORD = {
  木: '成長・創造・共感',
  火: '情熱・表現・行動力',
  土: '安定・誠実・包容力',
  金: '意志・美意識・決断',
  水: '知性・感受性・直感',
};
const GokyoBar = ({ label, value, max = 6, color }) => {
  const filled = Math.round(value);
  const total  = max;
  const intVal = Math.round(value);
  const rank = value === 0 ? '─ なし' : value >= max * 0.65 ? '◎ 強い' : value >= max * 0.35 ? '○ 普通' : '△ 少ない';
  const rankColor = value === 0 ? 'rgba(255,255,255,0.15)' : value >= max * 0.65 ? color : value >= max * 0.35 ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.25)';
  const icon = GOGYO_ICON[label] || '';
  const keyword = GOGYO_KEYWORD[label] || '';
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16, padding:"10px 14px", borderRadius:12, background: filled > 0 ? `${color}0d` : 'transparent', border: filled > 0 ? `1px solid ${color}30` : '1px solid transparent' }}>
      {/* アイコン + ラベル */}
      <div style={{ width:52, flexShrink:0, textAlign:"center" }}>
        <div style={{ fontSize:22, lineHeight:1, marginBottom:3 }}>{icon}</div>
        <span style={{ fontSize:14, fontFamily:"'Shippori Mincho',serif", fontWeight:700, color: filled > 0 ? color : 'rgba(255,255,255,0.2)' }}>{label}</span>
      </div>
      {/* バー + キーワード */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", gap:6 }}>
        <p style={{ fontSize:10, color:'rgba(255,255,255,0.3)', letterSpacing:"0.04em" }}>{keyword}</p>
        <div style={{ display:"flex", gap:4, alignItems:"center" }}>
          {Array.from({length:total}).map((_,i) => (
            <div key={i} style={{
              flex:1, height:12, borderRadius:4,
              background: i < filled ? color : 'rgba(255,255,255,0.06)',
              boxShadow: i < filled ? `0 0 6px ${color}66` : 'none',
              transition: `background 0.4s ease ${i*0.07}s`,
            }} />
          ))}
        </div>
      </div>
      {/* 右側: 整数 + ランク */}
      <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", width:52, flexShrink:0, gap:3 }}>
        <span style={{ fontSize:22, fontFamily:"'Shippori Mincho',serif", fontWeight:700, color: filled > 0 ? color : 'rgba(255,255,255,0.15)', lineHeight:1 }}>{intVal}</span>
        <span style={{ fontSize:10, color:rankColor, fontWeight:600, letterSpacing:"0.03em" }}>{rank}</span>
      </div>
    </div>
  );
};

// ── セクション見出し ──
const SectionLabel = ({ en, ja }) => (
  <div style={{ marginBottom: 20 }}>
    <p style={{ fontSize: 10, letterSpacing: "0.4em", color: C.gold, fontFamily: "sans-serif", marginBottom: 6, opacity: 0.8 }}>{en}</p>
    <h2 style={{ fontFamily: "'Shippori Mincho', serif", fontSize: 22, color: C.text, fontWeight: 700 }}>{ja}</h2>
  </div>
);

// ── カードラッパー ──
const Card = ({ children, style = {}, glow = false }) => (
  <div style={{
    background: `linear-gradient(160deg, ${C.card} 0%, #150909 100%)`,
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    padding: "28px 24px",
    position: "relative",
    overflow: "hidden",
    boxShadow: glow ? `0 0 40px rgba(201,168,76,0.08), 0 4px 24px rgba(0,0,0,0.5)` : `0 4px 24px rgba(0,0,0,0.4)`,
    ...style,
  }}>
    {glow && (
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 1,
        background: `linear-gradient(to right, transparent, ${C.goldDim}, transparent)`,
      }} />
    )}
    {children}
  </div>
);

// ── タブボタン ──
const TabBtn = ({ active, onClick, children }) => (
  <button onClick={onClick} style={{
    padding: "9px 18px",
    borderRadius: 8,
    border: `1px solid ${active ? C.borderHover : "rgba(255,255,255,0.08)"}`,
    background: active ? "rgba(201,168,76,0.12)" : "transparent",
    color: active ? C.gold : C.textMuted,
    fontSize: 13,
    fontFamily: "'Noto Sans JP', sans-serif",
    fontWeight: active ? 500 : 300,
    cursor: "pointer",
    transition: "all 0.2s",
    letterSpacing: "0.05em",
  }}>{children}</button>
);

// ──────────────────────────────────────────────
// 開運日カレンダー
// ──────────────────────────────────────────────

// 60干支テーブル
const KAN = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const SHI = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const KANSHI_60 = Array.from({length:60},(_,i)=>KAN[i%10]+SHI[i%12]);

// 基準: 2000年1月1日 = 戊午 = index 54
function getKanshiIndex(year, month, day) {
  const base = new Date(2000, 0, 1);
  const target = new Date(year, month - 1, day);
  const diff = Math.round((target - base) / 86400000);
  return ((54 + diff) % 60 + 60) % 60;
}
function getKanshi(year, month, day) {
  return KANSHI_60[getKanshiIndex(year, month, day)];
}
function getStem(year, month, day) {
  return getKanshiIndex(year, month, day) % 10;
}
function getBranch(year, month, day) {
  return getKanshiIndex(year, month, day) % 12;
}

// 六曜計算
// 旧暦新月日（2026年の朔日・概算）
const SHUO_2026 = [
  new Date(2026,1,17),  // 旧暦1月1日 = 2/17（春節）
  new Date(2026,2,19),  // 旧暦2月1日 = 3/19
  new Date(2026,3,17),  // 旧暦3月1日 = 4/17
  new Date(2026,4,17),  // 旧暦4月1日 = 5/17
  new Date(2026,5,15),  // 旧暦5月1日 = 6/15
  new Date(2026,6,14),  // 旧暦6月1日 = 7/14
  new Date(2026,7,13),  // 旧暦7月1日 = 8/13
  new Date(2026,8,11),  // 旧暦8月1日 = 9/11
  new Date(2026,9,11),  // 旧暦9月1日 = 10/11
  new Date(2026,10,9),  // 旧暦10月1日 = 11/9
  new Date(2026,11,9),  // 旧暦11月1日 = 12/9
];
const ROKUYO_NAMES = ["先勝","友引","先負","仏滅","大安","赤口"];
const ROKUYO_COLORS = {
  "大安": "#4a9a5a",
  "友引": "#5a7aaa",
  "先勝": "#8a7a3a",
  "先負": "#6a6a7a",
  "仏滅": "#7a3a3a",
  "赤口": "#9a4a3a",
};

function getLunarMonthDay(year, month, day) {
  const d = new Date(year, month - 1, day);
  let lm = 1, ld = 1;
  for (let i = 0; i < SHUO_2026.length; i++) {
    const diff = Math.round((d - SHUO_2026[i]) / 86400000);
    if (diff >= 0) { lm = i + 1; ld = diff + 1; }
    else break;
  }
  return { lm, ld };
}
function getRokuyo(year, month, day) {
  const { lm, ld } = getLunarMonthDay(year, month, day);
  // 六曜: 旧暦1月1日=先勝(0)、以降1日ずつ進む。月初は (月-1)%6 番目から始まる
  return ROKUYO_NAMES[(((lm - 1) % 6) + (ld - 1)) % 6];
}

// 壬午日主・従旺格の喜忌判定
// 喜神: 壬(8)・癸(9)=最吉水、庚(6)・辛(7)=吉金
// 忌神: 戊(4)・己(5)=大凶土、丙(2)・丁(3)=凶火
// 中立: 甲(0)・乙(1)=中吉木
function getLuckyLevel(stem, calcOverride) {
  const calc = calcOverride || window._MEISHIKI_CALC;
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
function getKaiUnRank(stem, rokuyo, calcOverride) {
  const lucky = getLuckyLevel(stem, calcOverride);
  const ryBonus = rokuyo === "大安" ? 2 : rokuyo === "友引" ? 1 : rokuyo === "仏滅" || rokuyo === "赤口" ? -1 : 0;
  const total = lucky + ryBonus;
  if (total >= 6) return { rank: "超開運", stars: 3, bg: "rgba(201,168,76,0.22)", border: "rgba(201,168,76,0.7)", textColor: "#e8c97a" };
  if (total >= 5) return { rank: "大開運", stars: 2, bg: "rgba(201,168,76,0.12)", border: "rgba(201,168,76,0.45)", textColor: "#C9A84C" };
  if (total >= 4) return { rank: "吉",     stars: 1, bg: "rgba(100,180,100,0.08)", border: "rgba(100,180,100,0.3)", textColor: "rgba(130,200,130,0.9)" };
  if (total <= 1) return { rank: "凶",     stars: 0, bg: "rgba(140,40,30,0.08)", border: "rgba(140,40,30,0.25)", textColor: "rgba(180,80,70,0.8)" };
  return { rank: "", stars: -1, bg: "transparent", border: "rgba(255,255,255,0.05)", textColor: C.textMuted };
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
function getFlowMonthKanshi(year, month) {
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

function calcMonthlyScore(calc, year, month) {
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

function calcDailyScore(calc, date) {
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

// ラッパー: genComment は日本語で結果を組み立てた後、現在の言語で翻訳して返す
function genComment(score, type, jisshin, extra) {
  const ja = _genCommentJa(score, type, jisshin, extra);
  if (!ja) return ja;
  const _lang = (typeof window !== 'undefined' && window.PF_LANG && window.PF_LANG.getLang) ? window.PF_LANG.getLang() : 'jp';
  if (_lang === 'jp') return ja;
  // PF_LANG.t が辞書にあれば訳語、なければ原文フォールバック
  return (window.PF_LANG && window.PF_LANG.t) ? (window.PF_LANG.t(ja) || ja) : ja;
}

function _genCommentJa(score, type, jisshin, extra) {
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


const KaiUnCalendar = ({ calc }) => {
  const _today = new Date();
  const TODAY = { y: _today.getFullYear(), m: _today.getMonth() + 1, d: _today.getDate() };
  const [viewYear, setViewYear]   = useState(TODAY.y);
  const [viewMonth, setViewMonth] = useState(TODAY.m);
  const [selected, setSelected]   = useState(null);
  const [tooltip, setTooltip]     = useState(null);

  const prevMonth = () => {
    if (viewMonth === 1) { setViewYear(y => y-1); setViewMonth(12); }
    else setViewMonth(m => m-1);
    setSelected(null);
  };
  const nextMonth = () => {
    if (viewMonth === 12) { setViewYear(y => y+1); setViewMonth(1); }
    else setViewMonth(m => m+1);
    setSelected(null);
  };

  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const firstDow    = new Date(viewYear, viewMonth - 1, 1).getDay(); // 0=日

  // 月の干支情報
  const monthKanshi = getKanshi(viewYear, viewMonth, 1);

  // 今月の開運日リスト（rank超開運・大開運のみ）
  const kaiUnDays = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const stem = getStem(viewYear, viewMonth, d);
    const ry   = getRokuyo(viewYear, viewMonth, d);
    const ks   = getKanshi(viewYear, viewMonth, d);
    const rank = getKaiUnRank(stem, ry, calc);
    if (rank.stars >= 2) kaiUnDays.push({ d, ks, ry, rank });
  }

  // 凡例データ
  const LEGEND = [
    { color: "rgba(201,168,76,0.7)",   label: "超開運日（大安 + 壬・癸）" },
    { color: "rgba(201,168,76,0.35)",  label: "大開運日（庚・辛 + 大安など）" },
    { color: "rgba(100,180,100,0.4)",  label: "吉日" },
    { color: "rgba(140,40,30,0.3)",    label: "要注意日" },
  ];

  const BG   = "#1a0c02";
  const BG2  = "#231408";
  const BG3  = "#2c1a08";
  const GOLD = "#C9A84C";
  const GOLD2= "#e8c97a";
  const MUTED= "rgba(232,228,217,0.35)";
  const SUB  = "rgba(232,228,217,0.6)";
  return (
    <div style={{ background:BG, borderRadius:16, padding:"20px 16px", border:"1px solid rgba(201,168,76,0.15)" }}>
      {/* ヘッダー */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:10 }}>
        <div>
          <p style={{ fontSize:10, letterSpacing:"0.4em", color:GOLD, marginBottom:4, fontWeight:600, opacity:0.8 }}>LUCKY DAY CALENDAR</p>
          <h3 style={{ fontFamily:"'Shippori Mincho',serif", fontSize:20, color:GOLD2, fontWeight:700 }}>
            {viewYear}年 {viewMonth}月
            <span style={{ fontSize:13, color:MUTED, fontWeight:400, marginLeft:10 }}>{monthKanshi}月</span>
          </h3>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <button onClick={prevMonth} style={{ padding:"6px 14px", borderRadius:8, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", color:SUB, cursor:"pointer", fontSize:16 }}>‹</button>
          <button onClick={() => { setViewYear(TODAY.y); setViewMonth(TODAY.m); }} style={{ padding:"6px 12px", borderRadius:8, background:"rgba(201,168,76,0.1)", border:"1px solid rgba(201,168,76,0.4)", color:GOLD, cursor:"pointer", fontSize:11, letterSpacing:"0.05em", fontWeight:600 }}>今月</button>
          <button onClick={nextMonth} style={{ padding:"6px 14px", borderRadius:8, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", color:SUB, cursor:"pointer", fontSize:16 }}>›</button>
        </div>
      </div>

      {/* 凡例 */}
      <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:14, padding:"8px 12px", background:"rgba(255,255,255,0.03)", borderRadius:8, border:"1px solid rgba(255,255,255,0.06)" }}>
        {[
          { bg:"#C9A84C", label:"超開運日（大安＋壬・癸）" },
          { bg:"#8a7040", label:"大開運日（庚・辛＋大安など）" },
          { bg:"#3a7a3a", label:"吉日" },
          { bg:"#7a2a2a", label:"要注意日" },
        ].map((l,i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:6, fontSize:10, color:MUTED }}>
            <span style={{ width:10, height:10, borderRadius:3, background:l.bg, display:"inline-block", flexShrink:0 }} />
            {l.label}
          </div>
        ))}
      </div>

      {/* カレンダーグリッド */}
      <div style={{ overflowX:"auto" }}>
        <div style={{ minWidth:340 }}>
          {/* 曜日ヘッダー */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", marginBottom:4 }}>
            {["日","月","火","水","木","金","土"].map((w,i) => (
              <div key={i} style={{ textAlign:"center", padding:"6px 2px", fontSize:11, fontWeight:700,
                color: i===0 ? "rgba(220,100,90,0.9)" : i===6 ? "rgba(100,160,220,0.9)" : "rgba(232,228,217,0.45)",
                letterSpacing:"0.1em" }}>{w}</div>
            ))}
          </div>

          {/* 日付グリッド */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3 }}>
            {/* 空白 */}
            {Array.from({length: firstDow}, (_,i) => <div key={`e${i}`} />)}

            {/* 日付セル */}
            {Array.from({length: daysInMonth}, (_, idx) => {
              const d    = idx + 1;
              const dow  = (firstDow + idx) % 7;
              const stem = getStem(viewYear, viewMonth, d);
              const ry   = getRokuyo(viewYear, viewMonth, d);
              const ks   = getKanshi(viewYear, viewMonth, d);
              const rank = getKaiUnRank(stem, ry, calc);
              const isToday = viewYear===TODAY.y && viewMonth===TODAY.m && d===TODAY.d;
              const isSel   = selected === d;
              const specKey = `${viewYear}-${viewMonth}-${d}`;
              const special = SPECIAL_DAYS_2026[specKey];

              // セルの背景・ボーダー
              let cellBg, cellBorder, dateColor;
              if (isToday) {
                cellBg = "linear-gradient(135deg, #1a1a2e 0%, #2d2d5a 100%)";
                cellBorder = "2.5px solid #e8c96a";
                dateColor = "#e8c96a";
              } else if (isSel) {
                cellBg = rank.bg || "rgba(184,146,42,0.08)";
                cellBorder = `2px solid ${rank.border || "#b8922a"}`;
                dateColor = rank.textColor !== C.textMuted ? rank.textColor : "#1a1a2e";
              } else if (rank.stars === 3) {
                cellBg = "rgba(184,146,42,0.12)";
                cellBorder = "1px solid rgba(184,146,42,0.5)";
                dateColor = "#7d5d0a";
              } else if (rank.stars === 2) {
                cellBg = "rgba(138,112,64,0.1)";
                cellBorder = "1px solid rgba(138,112,64,0.4)";
                dateColor = "#5a4a20";
              } else if (rank.stars === 1) {
                cellBg = "rgba(58,122,58,0.08)";
                cellBorder = "1px solid rgba(58,122,58,0.3)";
                dateColor = "#2a6a2a";
              } else if (rank.stars === 0 && rank.rank) {
                cellBg = "rgba(138,42,42,0.08)";
                cellBorder = "1px solid rgba(138,42,42,0.25)";
                dateColor = "#8a2a2a";
              } else {
                cellBg = "rgba(255,255,255,0.03)";
                cellBorder = "1px solid #e8e4d8";
                dateColor = dow===0 ? "#c0392b" : dow===6 ? "#2471a3" : "#333";
              }

              return (
                <div
                  key={d}
                  onClick={() => setSelected(isSel ? null : d)}
                  style={{
                    borderRadius:10, padding:"8px 4px 6px",
                    background: cellBg,
                    border: cellBorder,
                    cursor:"pointer", position:"relative",
                    transition:"all 0.18s",
                    boxShadow: isToday
                      ? "0 0 0 3px rgba(232,201,106,0.4), 0 4px 16px rgba(26,26,46,0.35)"
                      : isSel ? "0 2px 8px rgba(0,0,0,0.12)" : "none",
                    minHeight: 72,
                    transform: isToday ? "scale(1.04)" : "scale(1)",
                    zIndex: isToday ? 2 : 1,
                  }}
                >
                  {/* 超開運バッジ */}
                  {rank.stars === 3 && (
                    <div style={{ position:"absolute", top:-8, left:"50%", transform:"translateX(-50%)",
                      background:"linear-gradient(135deg,#b8922a,#e8c97a)",
                      borderRadius:10, padding:"1px 7px", fontSize:8, color:"#fff", fontWeight:800,
                      whiteSpace:"nowrap", zIndex:2, boxShadow:"0 2px 6px rgba(184,146,42,0.5)" }}>
                      ✦超開運
                    </div>
                  )}
                  {rank.stars === 2 && (
                    <div style={{ position:"absolute", top:-8, left:"50%", transform:"translateX(-50%)",
                      background:"#8a7040",
                      borderRadius:10, padding:"1px 7px", fontSize:8, color:"#fff",
                      fontWeight:700, whiteSpace:"nowrap", zIndex:2 }}>
                      ★大開運
                    </div>
                  )}

                  {/* 今日マーカー */}
                  {isToday && (
                    <div style={{ position:"absolute", top:4, right:5, width:6, height:6,
                      borderRadius:"50%", background:"#e8c96a",
                      boxShadow:"0 0 6px #e8c96a" }} />
                  )}

                  {/* 日付数字 */}
                  <p style={{ textAlign:"center", fontSize: isToday ? 18 : 16,
                    fontFamily:"'Shippori Mincho',serif", fontWeight:800, lineHeight:1,
                    color: isToday ? "#e8c96a"
                         : dow===0 ? "rgba(220,100,90,0.9)"
                         : dow===6 ? "rgba(100,160,220,0.9)"
                         : dateColor,
                    marginBottom:2 }}>
                    {d}
                  </p>

                  {/* 今日ラベル */}
                  {isToday && (
                    <p style={{ textAlign:"center", fontSize:8, color:"#e8c96a", fontWeight:700,
                      letterSpacing:"0.05em", marginBottom:1 }}>TODAY</p>
                  )}

                  {/* 六曜 */}
                  <p style={{ textAlign:"center", fontSize:9, lineHeight:1.2,
                    color: isToday
                      ? (ROKUYO_COLORS[ry] || "#aaa")
                      : (ROKUYO_COLORS[ry] || "#888"),
                    marginBottom:2 }}>{ry}</p>

                  {/* 干支 */}
                  <p style={{ textAlign:"center", fontSize:9,
                    color: isToday ? "rgba(232,201,106,0.75)"
                          : getLuckyLevel(stem, calc) >= 4 ? "#C9A84C"
                          : getLuckyLevel(stem, calc) === 0 ? "rgba(180,80,80,0.8)"
                          : "rgba(232,228,217,0.3)",
                    fontFamily:"'Shippori Mincho',serif", letterSpacing:"0.05em" }}>{ks}</p>

                  {/* 特別日アイコン */}
                  {special && (
                    <p style={{ textAlign:"center", fontSize:10, marginTop:2 }} title={special.label}>{special.icon}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 選択した日の詳細 */}
      {selected && (() => {
        const stem   = getStem(viewYear, viewMonth, selected);
        const branch = getBranch(viewYear, viewMonth, selected);
        const ry     = getRokuyo(viewYear, viewMonth, selected);
        const ks     = getKanshi(viewYear, viewMonth, selected);
        const rank   = getKaiUnRank(stem, ry, calc);
        const stemName = KAN[stem];
        const branchName = SHI[branch];
        const specKey = `${viewYear}-${viewMonth}-${selected}`;
        const special = SPECIAL_DAYS_2026[specKey];

        const adviceMap = {
          5: "壬・癸の水日ンダ。日主と同じ水気で最もエネルギーが高まる日。重要な決断・告白・交渉に最適ンダよ🐼",
          4: "庚・辛の金日ンダ。喜神の金が水を生む流れで吉。新しいことを始めたり、契約・手続きに向いているんダ。",
          3: "甲・乙の木日ンダ。中立的な日だけど、食神の木が想像力を高めるんダよ。クリエイティブな作業に向いているンダ。",
          1: "丙・丁の火日ンダ。忌神の火は水を剋すため少し慎重に。感情的になりやすいから大きな決断は避けるといいんダ。",
          0: "戊・己の土日ンダ。最忌神の土が水を止めてしまうんダよ。この日はのんびり休むのが一番。無理に動かないことンダ🐼",
        };
        const lv = getLuckyLevel(stem, calc);

        return (
          <div style={{ marginTop:16, padding:"18px 16px", borderRadius:14,
            background: rank.bg || "rgba(255,255,255,0.04)",
            border:`1.5px solid ${rank.border || "rgba(255,255,255,0.1)"}` }}>
            <div style={{ display:"flex", alignItems:"flex-start", gap:16, flexWrap:"wrap" }}>
              <div style={{ textAlign:"center", minWidth:64 }}>
                <p style={{ fontFamily:"'Shippori Mincho',serif", fontSize:34, fontWeight:800,
                  color: rank.textColor !== C.textMuted ? rank.textColor : "rgba(232,228,217,0.8)", lineHeight:1 }}>{selected}</p>
                <p style={{ fontSize:11, color:"rgba(232,228,217,0.35)" }}>日</p>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:10 }}>
                  <span style={{ fontSize:13, fontFamily:"'Shippori Mincho',serif",
                    color: rank.textColor !== C.textMuted ? rank.textColor : "rgba(232,228,217,0.8)", fontWeight:700 }}>{ks}日</span>
                  <span style={{ fontSize:12, padding:"2px 10px", borderRadius:20,
                    background:`${ROKUYO_COLORS[ry]}22`, border:`1px solid ${ROKUYO_COLORS[ry]}80`,
                    color: ROKUYO_COLORS[ry] }}>{ry}</span>
                  {rank.rank && (
                    <span style={{ fontSize:11, padding:"2px 10px", borderRadius:20,
                      background: rank.bg, border:`1px solid ${rank.border}`,
                      color: rank.textColor !== C.textMuted ? rank.textColor : "rgba(232,228,217,0.8)" }}>{rank.rank}</span>
                  )}
                  {special && (
                    <span style={{ fontSize:11, padding:"2px 10px", borderRadius:20,
                      background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", color:"rgba(232,228,217,0.55)" }}>
                      {special.icon} {special.label}</span>
                  )}
                </div>
                <p style={{ fontSize:13, color:"rgba(232,228,217,0.65)", lineHeight:1.8, fontFamily:"'Shippori Mincho',serif" }}>
                  {adviceMap[lv]}
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 今月の開運日まとめ */}
      {kaiUnDays.length > 0 && (
        <div style={{ marginTop:20 }}>
          <p style={{ fontSize:11, color:"#C9A84C", letterSpacing:"0.2em", marginBottom:12, fontWeight:700 }}>✦ 今月の開運日まとめ</p>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {kaiUnDays.map(({d, ks, ry, rank}) => (
              <button key={d} onClick={() => setSelected(d)} style={{
                padding:"8px 12px", borderRadius:10, cursor:"pointer",
                background: rank.stars===3 ? "rgba(201,168,76,0.15)"
                          : rank.stars===2 ? "rgba(138,112,64,0.12)" : "rgba(255,255,255,0.03)",
                border:`1.5px solid ${rank.stars>=2 ? rank.border : "rgba(255,255,255,0.08)"}`,
                color: rank.textColor !== C.textMuted ? rank.textColor : "rgba(232,228,217,0.7)",
                fontFamily:"'Shippori Mincho',serif",
                fontSize:13, transition:"all 0.2s",
                display:"flex", flexDirection:"column", alignItems:"center", gap:2,
              }}>
                <span style={{ fontWeight:800 }}>{d}日</span>
                <span style={{ fontSize:10, opacity:0.8 }}>{ks}</span>
                <span style={{ fontSize:10, color: ROKUYO_COLORS[ry] || "rgba(232,228,217,0.4)" }}>{ry}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── 今日の運勢ブロック ──
// DAILY_LOG は削除済み — TodayFortuneBlock が calcDailyScore() で動的生成

const OFFSET_LABELS = {
  0:    { short: "今日",   badge: null },
  "-1": { short: "昨日",   badge: "昨日" },
  "-2": { short: "一昨日", badge: "一昨日" },
};

const RadialScore = ({ value, color, size = 90 }) => {
  const r = 36, cx = 45, cy = 45;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <svg width={size} height={size} viewBox="0 0 90 90">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 45 45)"
        style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: "stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1) 0.3s" }}
      />
      <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
        fill={color} fontSize="18" fontFamily="'Shippori Mincho',serif" fontWeight="800">{value}</text>
    </svg>
  );
};

const TodayFortuneBlock = ({ onOpenDetail, calc, offset, setOffset }) => {
  const isToday = offset === 0;
  const canGoBack = offset > -2;

  // calc から動的に日運スコアを生成
  // ── 3日間のキャッシュをlocalStorageで管理 ──────────────────────────
  const buildLog = (offsetDays) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const s = calcDailyScore(calc, d);
    const js = s.jisshin || '';
    const ki = (calc.kishin||[]).join('・') || '';
    const kj = (calc.kijin||[]).join('・') || '';
    const kiH = ki && (calc.kishin||[]).includes(s.dayKan);
    const _JIKKAN_G2  = {'甲':'木','乙':'木','丙':'火','丁':'火','戊':'土','己':'土','庚':'金','辛':'金','壬':'水','癸':'水'};
    const _JUNISHI_G2 = {'子':'水','丑':'土','寅':'木','卯':'木','辰':'土','巳':'火','午':'火','未':'土','申':'金','酉':'金','戌':'土','亥':'水'};
    const SG_B={子:'丑',丑:'子',寅:'亥',亥:'寅',卯:'戌',戌:'卯',辰:'酉',酉:'辰',巳:'申',申:'巳',午:'未',未:'午'};
    const RK_B={子:'午',午:'子',丑:'未',未:'丑',寅:'申',申:'寅',卯:'酉',酉:'卯',辰:'戌',戌:'辰',巳:'亥',亥:'巳'};
    const ns = calc.pillars.day.shi;
    const sgH = SG_B[s.dayShi]===ns;
    const rkH = RK_B[s.dayShi]===ns;
    const label = offsetDays===0 ? '今日' : offsetDays===-1 ? '昨日' : '一昨日';

    // ポポコメント：十神・喜忌神・支合・六冲・スコアを全て使って詳細生成
    const kjH = kj && (calc.kijin||[]).includes(s.dayKan); // 忌神が天干に来ているか
    const kjShiH = (calc.kijin||[]).includes(_JUNISHI_G2[s.dayShi]||''); // 忌神が地支に
    const kiShiH = (calc.kishin||[]).includes(_JUNISHI_G2[s.dayShi]||''); // 喜神が地支に
    const GOGYO_CHAR = {'木':'木','火':'火','土':'土','金':'金','水':'水'};
    const dayKanGogyo = _JIKKAN_G2[s.dayKan] || '';
    const dayShiGogyo = _JUNISHI_G2[s.dayShi] || '';
    // 忌神かつ強い下落要因を説明する文を生成
    function _kjReason() {
      const reasons = [];
      if(kjH)    reasons.push(`今日の天干「${s.dayKan}（${dayKanGogyo}）」があなたの忌神にあたる`);
      if(kjShiH) reasons.push(`今日の地支「${s.dayShi}（${dayShiGogyo}）」も忌神の気を持つ`);
      if(rkH)    reasons.push(`今日の地支「${s.dayShi}」があなたの日支「${ns}」と六冲の関係にある`);
      if(js==='劫財') reasons.push(`十神「劫財」が立っていて競争・消耗の気が強い`);
      if(js==='偏官') reasons.push(`十神「偏官」の強い流れで消耗しやすい`);
      return reasons;
    }
    function _kiReason() {
      const reasons = [];
      if(kiH)    reasons.push(`今日の天干「${s.dayKan}（${dayKanGogyo}）」があなたの喜神にあたる`);
      if(kiShiH) reasons.push(`今日の地支「${s.dayShi}（${dayShiGogyo}）」も喜神の気を持つ`);
      if(sgH)    reasons.push(`今日の地支「${s.dayShi}」があなたの日支「${ns}」と支合している`);
      return reasons;
    }
    // 最低・最高の運をテキストで
    const scores3 = [{k:'恋愛',v:s.love},{k:'仕事',v:s.work},{k:'金運',v:s.money}];
    const lowest  = scores3.slice().sort((a,b)=>a.v-b.v)[0];
    const highest = scores3.slice().sort((a,b)=>b.v-a.v)[0];

    // ── 十神ごとの個別メッセージテーブル ────────────────────────────
    const _KAN = calc.pillars.day.kan;
    const _SHI = calc.pillars.day.shi;
    const _kiGogyoTip = ki==='水'?'静かな場所や水のそばで過ごす':ki==='金'?'白や銀のものを身につける・整理整頓する':ki==='木'?'緑を見る・植物のそばにいる':ki==='火'?'明るい場所や人のそばへ出る':'規則正しい生活リズムを守る';

    // 高スコア（78点以上）の十神別メッセージ
    const _goodMsgs = {
      '正官': `${label}は仕事や人間関係で誠実さが光る日だったンダ🐼 ${s.kanshi}日のエネルギーがあなたの命式に乗っていて、頑張りや真摯な態度がちゃんと周りに届きやすい状態だったんだよ。仕事運が${s.work}点と高かったのも納得ンダ。${label}取り組んだことは、時間をおいてから「あの日やってよかった」と思える日になるはずンダよ🐼`,
      '食神': `${label}（${s.kanshi}日）はあなたらしさが全開になれる日だったンダ🐼 好きなこと・得意なことに関わるほど運気が上がる流れで、恋愛運も${s.love}点と高めだったんだよ。無理して合わせるより「ありのまま」でいた方が全てがうまくいく日——そういう命式の流れが来ていたんダ。${label}動いたこと・作ったことは、自分でも気づかないうちに誰かの心を動かしているかもしれないんダよ🐼`,
      '偏財': `${s.kanshi}日は「動けば動くほど引き寄せる」流れが来ていた日ンダ🐼 ${label}の金運${s.money}点・恋愛運${s.love}点は、積極的に外に出た人ほどその恩恵を受けやすかったことを示しているんだよ。ずっと後回しにしていたことを動かすなら、こういう日だったんダ。今日のあなたへ——何か一つでも動かしたなら、それは正解ンダよ🐼`,
      '正財': `${label}（${s.kanshi}日）は丁寧さと誠実さが報われる日だったンダ🐼 金運が${s.money}点と高めで、地道に積み上げてきたことがじわじわと形になりやすい流れだったんだよ。派手な動きより「コツコツやってきた人が報われる」タイミングンダ。${label}の自分を振り返ったとき、小さくてもちゃんと前に進めていたなら、それで十分すぎるくらい正解ンダよ🐼`,
      '偏官': `${s.kanshi}日のあなたには突破力が宿っていたんダ🐼 普段なら躊躇するようなことに踏み込めるエネルギーが来ていて、総合${s.total}点の高い流れの中で一番大事なのは「行動した量」だったんだよ。恋愛でも仕事でも、少しだけ勇気を出して動いた瞬間が、後から振り返ると転換点になっていることが多い日ンダ。${label}の一歩は、思ってるより大きな意味があるんダよ🐼`,
      '傷官': `${label}は自分の個性を堂々と出せる日だったんダ🐼 ${s.kanshi}日の流れは「普通でいる必要はない」と命式が背中を押してくれていて、恋愛運${s.love}点も高めだったんだよ。少し変わっていると思われても構わない——むしろその個性こそが今日のあなたの最大の武器だったんダ。${label}自分らしく動けた瞬間が、一番輝いていた瞬間だったんだよ🐼`,
    };

    // 中スコア（62〜77点）の十神別メッセージ
    const _midMsgs = {
      '正官': `${label}（${s.kanshi}日）は堅実に積み上げる日だったんダ🐼 仕事運${s.work}点で、目立つ成果より「信頼を少しずつ積み重ねる」のに向いた流れだったんだよ。今日の誠実な行動が、じわじわと周りの評価につながっていくんダ。焦らずコツコツ——それが${label}のいちばん正しい動き方だったんダよ🐼`,
      '食神': `${s.kanshi}日は、得意なことに集中するほど充実感がある日だったんダ🐼 大きな結果じゃなくても、自分のペースで好きなことをやれた時間があったなら十分ンダよ。恋愛運${s.love}点も示しているように、自然体の自分でいるほどいい縁が近づいてくる流れだったんダ🐼`,
      '偏財': `${label}（${s.kanshi}日）は縁と出会いに動きが出やすい日だったんダ🐼 金運も恋愛も、じっとしているより少しだけ外に出た方がいい流れで、総合${s.total}点は「まずは一歩」の背中を押してくれていたんだよ。大きく動かなくていい——ちょっとした会話や行動が、後になって大事な縁だったと気づくことがあるんダよ🐼`,
      '正財': `${s.kanshi}日は地道さが一番の武器になる日だったんダ🐼 金運${s.money}点は「コツコツ型」の行動がそのまま結果に結びつく流れを示していて、衝動的に動くより計画通りに進めた方が後悔がない日だったんだよ。${label}丁寧にこなしたことは、積み重なって必ず返ってくるんダ🐼`,
      '偏官': `${label}（${s.kanshi}日）は行動力が上がっていた分、少し消耗しやすくもある日だったんダ🐼 総合${s.total}点で仕事運${s.work}点——やる気はあったはずなのに空回りした感じがあったとしたら、エネルギーの方向をちょっと絞るといい日だったんダ。無理に全部やらなくていい。一つだけ仕上げたら十分ンダよ🐼`,
      '傷官': `${s.kanshi}日は感性と表現力が高まっていた日だったんダ🐼 恋愛運${s.love}点も示しているように、言葉や行動でいつもより少し正直に気持ちを出せる流れがきていたんだよ。「ちょっと言い過ぎたかな」と思う場面があったとしたら、それは今日のあなたが正直だったというだけんダ。引きずらなくていいんダよ🐼`,
      '正印': `${label}（${s.kanshi}日）は「吸収する」ことに向いた日だったんダ🐼 何かを読んだり、人の話を聞いたり、静かに考えたりした時間があったなら、それが今日の正解ンダ。${lowest.k}運が${lowest.v}点だったのは、外に向かうより内に向かう日だったからンダよ。今日インプットしたことは、後からじわじわ力になってくるんダ🐼`,
      '偏印': `${s.kanshi}日は直感が冴えやすい日だったんダ🐼 論理より感覚、計画よりひらめきが当たりやすい流れで、何かふと思いついたことがあったなら、それはちゃんと意味があるんだよ。${label}の直感——メモしておいてほしいんダ🐼`,
      '比肩': `${label}（${s.kanshi}日）は自分軸を取り戻す日だったんダ🐼 誰かに合わせすぎて疲れていたなら、今日はその反動が来やすい流れだったんだよ。総合${s.total}点は「自分のペースを守れた人が一番上手くいく日」を示していたんダ。周りに何を思われても、自分らしくいることが今日のいちばんの正解ンダよ🐼`,
      '劫財': `${s.kanshi}日は周りとの摩擦が生まれやすい流れだったんダ🐼 総合${s.total}点で抑えられていたのは、誰かと競ったり張り合ったりするエネルギーが高まりすぎていたからかもンダよ。${label}誰かにイライラした瞬間があったとしたら、相手より「自分のコンディション」に目を向けた方がいい日だったんダ。今日のことは引きずらないでほしいんダよ🐼`,
    };

    // 低スコア（61点以下）の十神別メッセージ
    const _badMsgs = {
      '正財': `${label}（${s.kanshi}日）は守りに入るのが正解の日だったんダ🐼 ${s.kanshi}日の流れはあなたの得意な方向とずれていて、丁寧にやっているのに空回りしやすい日だったんだよ。特に${lowest.k}運が${lowest.v}点と低めだったのも、「今日は出すより蓄える日」のサインンダ。焦って動かなかった人が一番賢かった日ンダよ🐼`,
      '偏財': `${s.kanshi}日は積極的に動きたくなる気持ちとは裏腹に、流れがついてこない日だったんダ🐼 ${lowest.k}運${lowest.v}点が示しているように、今日は「動けば動くほどすれ違いが増える」流れだったんだよ。明日か明後日、もう少し流れが整った日に同じことをやれば、ずっとうまくいくんダ。${label}を乗り越えられたなら、それで十分ンダよ🐼`,
      '傷官': `${label}（${s.kanshi}日）は感情が表に出やすく、思わぬすれ違いが起きやすい日だったんダ🐼 誰かに何か言いたくなったり、自分の考えを押し通したくなる流れで、${lowest.k}運${lowest.v}点も「今日の衝動には乗らない方がいい」を示していたんだよ。言いたいことは書き留めておいて、落ち着いた日に改めて伝えるといいんダ。今日の自分を責めないでほしいんダよ🐼`,
      '劫財': `${s.kanshi}日は誰かと張り合ったり、比べたりするエネルギーが強まりやすい日だったんダ🐼 ${lowest.k}運が${lowest.v}点と低く、消耗した感じがあったとしたら、それは命式的に「余計なものを手放す日」だったからんダ。お金も感情もエネルギーも、今日は一度リセットされる日——そう思うと少し楽になるんだよ。明日からの自分への仕込みができた日ンダよ🐼`,
      '偏官': `${label}（${s.kanshi}日）はやる気があるのに空回りしやすい、もどかしい日だったんダ🐼 ${s.kanshi}日の流れはあなたの命式とかみ合わず、力を入れれば入れるほど疲れが増す状態だったんだよ。${lowest.k}運${lowest.v}点は「今日は休む勇気を持ってほしい」のサインンダ。頑張りすぎた自分に、今夜はちゃんとご褒美をあげてほしいんダよ🐼`,
      '比肩': `${s.kanshi}日は孤独感や「自分だけ頑張っている」感が出やすい日だったんダ🐼 ${lowest.k}運${lowest.v}点も、外に向けたエネルギーより内に向けた時間の方が充実した日だったことを示しているんだよ。今日の自分時間——寂しいと感じたとしても、それは「自分をリセットするための必要な時間」だったんダ。ゆっくり休んでほしいんダよ🐼`,
      '正印': `${label}（${s.kanshi}日）は焦りを感じやすいけど、じっくり動く日だったんダ🐼 学んだり読んだりすることにエネルギーが向く日で、外への行動より内への蓄積が向いていたんだよ。${lowest.k}運${lowest.v}点は「今日はアウトプットより充電」のサインンダ。${label}静かに過ごせた時間があったなら、それが一番の正解だったんダよ🐼`,
      '偏印': `${s.kanshi}日は直感と現実がかみ合いにくい日だったんダ🐼 「なんかうまくいかない」という感覚があったとしたら、それは命式的に流れが自分の方向に向いていない日だったからんだよ。${lowest.k}運${lowest.v}点——今日は計画より思いつきに乗りやすく、後から「なぜあれをやったんだろう」と思う行動が出やすい日ンダ。衝動的な決断は明日に持ち越してほしいんダよ🐼`,
      '正官': `${label}（${s.kanshi}日）は頑張りが空回りしやすい日だったんダ🐼 いつも通りに誠実にやっているのに、なぜか評価されない・伝わらないという感覚があったとしたら、それは命式のせいンダ。${lowest.k}運${lowest.v}点——今日の「伝わらなかった」は、あなたの実力や誠意とは関係ないんだよ。時期が整えば、ちゃんと届くんダ。引きずらないでほしいんダよ🐼`,
    };

    // 支合・六冲の特別メッセージ
    let popo;
    const _dailyLang = (typeof window !== 'undefined' && window.PF_LANG && window.PF_LANG.getLang) ? window.PF_LANG.getLang() : 'jp';
    const _dailyKjTip = ki==='水'?'好きな飲み物をゆっくり飲む':ki==='金'?'部屋を少し片付ける':ki==='木'?'外の空気を吸いに行く':ki==='火'?'明るい音楽を流す':'いつもより少し早く寝る';
    const _dailyKjTipKr = ki==='水'?'좋아하는 음료를 천천히 마신다':ki==='金'?'방을 조금 정리한다':ki==='木'?'바깥 공기를 쐬러 간다':ki==='火'?'밝은 음악을 튼다':'평소보다 조금 일찍 잔다';
    const _dailyCtx = { highest, lowest, ns, tip: _dailyLang==='kr' ? _dailyKjTipKr : _dailyKjTip, ki };

    if(sgH && s.total >= 72) {
      popo = _dailyLang==='kr'
        ? AT.buildDailyPopoShigou_KR(label, s, _dailyCtx)
        : `${label}（${s.kanshi}日）は縁のエネルギーが特別に開いていた日だったんダ🐼 今日の干支「${s.dayShi}」があなたの生まれ日の地支「${ns}」と特別な関係にあって、恋愛・縁・出会いに関わることが命式的に後押しされていたんだよ。${highest.k}運が${highest.v}点と一番高かったのも偶然じゃないんダ。${label}誰かと会ったり、連絡が来たり、気持ちを伝えたりした瞬間があったなら——それは命式が用意してくれたタイミングだったんダよ🐼`;
    } else if(rkH && s.total < 65) {
      popo = _dailyLang==='kr'
        ? AT.buildDailyPopoRokuchuu_KR(label, s, _dailyCtx)
        : `${label}（${s.kanshi}日）は感情が揺れやすく、気持ちが伝わりにくい日だったんダ🐼 今日の干支「${s.dayShi}」とあなたの生まれ日の地支「${ns}」が対立する関係にあって、言葉が意図と違う方向に伝わったり、タイミングがすれ違いやすい流れだったんだよ。${lowest.k}運${lowest.v}点もそのサインンダ。今日誰かと揉めたり、うまくいかなかった気がするなら——それは相手のせいでも自分のせいでもなく、日の流れのせいだからんダ。引きずらなくていいんダよ🐼`;
    } else if(kjH && kjShiH) {
      popo = _dailyLang==='kr'
        ? AT.buildDailyPopoKjDouble_KR(label, s, _dailyCtx)
        : `${label}（${s.kanshi}日）は、あなたにとって向かい風が重なった日だったんダ🐼 空気の流れがあなたの命式と合っていない日で、何をやってもひと手間余計にかかる感じがあったとしたら、それは本当のことだったんだよ。${lowest.k}運${lowest.v}点——今日は力を入れる日じゃなく、${_dailyKjTip}だけで十分な日だったんダ。今日をやり過ごせたこと自体が、ちゃんと正解だったんダよ🐼`;
    } else if(s.total >= 78) {
      const krFn = AT.dailyPopo_goodMsgs_KR[js];
      popo = (_dailyLang==='kr' && krFn)
        ? krFn(label, s, _dailyCtx)
        : (_goodMsgs[js] || (_dailyLang==='kr'
            ? AT.buildDailyPopoGoodFallback_KR(label, s, _dailyCtx)
            : `${label}（${s.kanshi}日）は全体的に追い風が来ていた日だったんダ🐼 ${highest.k}運が${highest.v}点と最も高く、命式的に後押しされる流れの中で${label}動いたことはしっかり力になっているんだよ。今日の自分をちゃんと認めてほしいんダよ🐼`));
    } else if(s.total >= 62) {
      const krFn = AT.dailyPopo_midMsgs_KR[js];
      popo = (_dailyLang==='kr' && krFn)
        ? krFn(label, s, _dailyCtx)
        : (_midMsgs[js] || (_dailyLang==='kr'
            ? AT.buildDailyPopoMidFallback_KR(label, s, _dailyCtx)
            : `${label}（${s.kanshi}日）は${highest.k}運${highest.v}点と、3つの中では${highest.k}が一番乗っていた日だったんダ🐼 大きな波はなくても、着実に積み上げた時間は必ず後から力になってくるんだよ。今日のコツコツは裏切らないんダよ🐼`));
    } else {
      const krFn = AT.dailyPopo_badMsgs_KR[js];
      popo = (_dailyLang==='kr' && krFn)
        ? krFn(label, s, _dailyCtx)
        : (_badMsgs[js] || (_dailyLang==='kr'
            ? AT.buildDailyPopoBadFallback_KR(label, s, _dailyCtx)
            : `${label}（${s.kanshi}日）は命式的に流れが整いにくい日だったんダ🐼 ${lowest.k}運${lowest.v}点が最も低く、今日だけを見ると空回りが多かったかもしれないんだよ。でも、こういう日に無理せず過ごせたことが、次の追い風が来たときの土台になるんダ。今日をちゃんとやり過ごせたこと——それだけで十分ンダよ🐼`));
    }

    // ── localStorage で3日間保存（4日目に消去） ──────────────────────
    const dateKey = `pf_daily_${d.getFullYear()}_${d.getMonth()+1}_${d.getDate()}`;
    try {
      // 古いキーを掃除（3日より古いものを削除）
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 3);
      Object.keys(localStorage).filter(k => k.startsWith('pf_daily_')).forEach(k => {
        const parts = k.replace('pf_daily_','').split('_');
        if(parts.length===3) {
          const kd = new Date(+parts[0], +parts[1]-1, +parts[2]);
          if(kd < cutoff) localStorage.removeItem(k);
        }
      });
      // 今日分を保存（上書き）
      if(offsetDays === 0) {
        localStorage.setItem(dateKey, JSON.stringify({
          total: s.total, love: s.love, work: s.work, money: s.money,
          kanshi: s.kanshi, jisshin: js, savedAt: Date.now()
        }));
      }
    } catch(e) {}

    return {
      date: s.dateStr,
      kanshi: s.kanshi,
      scores: [
        { label: "総合運", value: s.total, color: "#C9A84C",              icon: "☯️", comment: genComment(s.total,'total', js, {kiH,kjH,sgH,rkH}), tab: null },
        { label: "恋愛運", value: s.love,  color: "rgba(220,100,130,0.9)", icon: "💕", comment: genComment(s.love,'love',  js, {kiH,kjH,sgH,rkH}), tab: "love" },
        { label: "仕事運", value: s.work,  color: "rgba(100,180,220,0.9)", icon: "💼", comment: genComment(s.work,'work',  js, {kiH,kjH,sgH,rkH}), tab: "work" },
        { label: "金運",   value: s.money, color: "rgba(160,200,100,0.9)", icon: "💰", comment: genComment(s.money,'money',js, {kiH,kjH,sgH,rkH}), tab: "money" },
      ],
      popo,
    };
  };
  const log = buildLog(offset);

  return (
    <div>
      {/* ── 日付ナビゲーション ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 10 }}>

        {/* ◁ 昨日へ */}
        <button
          onClick={() => canGoBack && setOffset(o => o - 1)}
          disabled={!canGoBack}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: 10, cursor: canGoBack ? "pointer" : "default",
            background: "transparent",
            border: `1px solid ${canGoBack ? "rgba(201,168,76,0.3)" : "rgba(255,255,255,0.05)"}`,
            color: canGoBack ? C.goldDim : "rgba(255,255,255,0.12)",
            fontSize: 12, fontFamily: "'Noto Sans JP',sans-serif",
            transition: "all 0.2s", flexShrink: 0,
          }}
          onMouseEnter={e => canGoBack && (e.currentTarget.style.borderColor = C.gold, e.currentTarget.style.color = C.gold)}
          onMouseLeave={e => canGoBack && (e.currentTarget.style.borderColor = "rgba(201,168,76,0.3)", e.currentTarget.style.color = C.goldDim)}
        >
          ◁ {offset === 0 ? "昨日の運勢" : "一昨日の運勢"}
        </button>

        {/* 中央：日付 */}
        <div style={{ textAlign: "center", flex: 1 }}>
          <p style={{ fontFamily: "'Shippori Mincho',serif", fontSize: 15, color: isToday ? C.goldLight : C.textSub, fontWeight: 600 }}>
            {log.date}
          </p>
          <p style={{ fontSize: 12, color: C.textMuted, marginTop: 3 }}>
            <span style={{ fontFamily: "'Shippori Mincho',serif", color: C.goldDim }}>{log.kanshi}</span>日
            {isToday && (
              <span style={{ marginLeft: 8, fontSize: 10, background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.45)", borderRadius: 10, padding: "1px 9px", color: C.gold }}>TODAY</span>
            )}
            {!isToday && (
              <span style={{ marginLeft: 8, fontSize: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "1px 9px", color: C.textMuted }}>{OFFSET_LABELS[String(offset)].badge}</span>
            )}
          </p>
        </div>

        {/* 今日に戻るボタン（今日以外のとき表示） */}
        {!isToday ? (
          <button
            onClick={() => setOffset(0)}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "8px 14px", borderRadius: 10, cursor: "pointer",
              background: "rgba(201,168,76,0.08)",
              border: `1px solid rgba(201,168,76,0.3)`,
              color: C.goldDim, fontSize: 12,
              fontFamily: "'Noto Sans JP',sans-serif",
              transition: "all 0.2s", flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.gold; e.currentTarget.style.color = C.gold; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(201,168,76,0.3)"; e.currentTarget.style.color = C.goldDim; }}
          >
            今日 ▷
          </button>
        ) : (
          <div style={{ width: 80, flexShrink: 0 }} />
        )}
      </div>

      {/* ── ドットインジケーター ── */}
      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 20 }}>
        {[0, -1, -2].map(o => (
          <button key={o} onClick={() => setOffset(o)} style={{
            width: o === offset ? 28 : 8, height: 8, borderRadius: 4,
            background: o === offset ? C.gold : "rgba(255,255,255,0.12)",
            border: "none", cursor: "pointer", padding: 0,
            transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
            boxShadow: o === offset ? `0 0 8px rgba(201,168,76,0.6)` : "none",
          }} />
        ))}
      </div>

      {/* ── 過去3日間の総合運推移バー（常時表示） ── */}
      <div style={{ marginBottom: 20, padding: "14px 16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12 }}>
        <p style={{ fontSize: 10, color: C.gold, letterSpacing: "0.2em", marginBottom: 12 }}>過去3日間の総合運推移</p>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
          {[-2, -1, 0].map(o => {
            const l = buildLog(o);
            const totalScore = l.scores.find(s => s.label === "総合運")?.value ?? 0;
            const barH = Math.max(14, (totalScore / 100) * 64);
            const isActive = o === offset;
            return (
              <div key={o} onClick={() => setOffset(o)} style={{ flex: 1, textAlign: "center", cursor: "pointer" }}>
                <p style={{ fontSize: 13, fontFamily: "'Shippori Mincho',serif", fontWeight: 700, color: isActive ? C.gold : C.textMuted, marginBottom: 6 }}>{totalScore}</p>
                <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", height: 64 }}>
                  <div style={{
                    width: "55%", height: barH, borderRadius: "5px 5px 0 0",
                    background: isActive
                      ? `linear-gradient(to top, ${C.gold}, ${C.goldLight})`
                      : o === 0 ? "rgba(201,168,76,0.25)" : "rgba(255,255,255,0.1)",
                    boxShadow: isActive ? `0 0 12px rgba(201,168,76,0.5)` : "none",
                    transition: "all 0.3s ease",
                    border: isActive ? `1px solid rgba(201,168,76,0.6)` : "1px solid rgba(255,255,255,0.06)",
                  }} />
                </div>
                <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "0 auto", width: "80%" }} />
                <p style={{ fontSize: 11, color: isActive ? C.gold : C.textMuted, marginTop: 6, fontWeight: isActive ? 600 : 300 }}>{OFFSET_LABELS[String(o)].short}</p>
                <p style={{ fontSize: 9, color: "rgba(240,230,208,0.2)", fontFamily: "'Shippori Mincho',serif", marginTop: 2 }}>{l.kanshi}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div key={`popo-${offset}`} style={{ animation: "fadeUp 0.4s 0.1s ease both", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: "18px 20px", borderRadius: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
          {/* 総合点 */}
          {(() => {
            const totalScore = log.scores.find(x => x.label === "総合運");
            const val = totalScore ? totalScore.value : 0;
            const scoreColor = val >= 75 ? "#E8C96A" : val >= 60 ? "rgba(200,190,150,0.9)" : "rgba(180,150,130,0.8)";
            return (
              <div style={{ flexShrink: 0, textAlign: "center", minWidth: 64 }}>
                <div style={{ fontFamily: "'Shippori Mincho',serif", fontSize: 42, fontWeight: 900, color: scoreColor, lineHeight: 1 }}>{val}</div>
                <div style={{ fontSize: 9, color: "rgba(240,230,208,0.35)", marginTop: 4, letterSpacing: "0.1em" }}>総合点</div>
              </div>
            );
          })()}
          {/* 縦線 */}
          <div style={{ width: 1, alignSelf: "stretch", background: "rgba(255,255,255,0.07)", flexShrink: 0 }} />
          {/* ポポコメント */}
          <div style={{ flex: 1, display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{ flexShrink: 0, width: 32, height: 32, borderRadius: "50%", background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, marginTop: 2 }}><PandaIcon size={20} /></div>
            <p style={{ fontFamily: "'Shippori Mincho',serif", fontSize: 13, lineHeight: 1.9, color: "rgba(232,228,217,0.8)" }}>{log.popo}</p>
          </div>
        </div>
      </div>

      {/* ── スコアカード（恋愛・仕事・金運 3列） ── */}
      <div key={offset} style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20, animation: "fadeUp 0.35s ease both" }}>
        {log.scores.filter(d => !!d.tab).map((d, i) => (
          <div
            key={i}
            onClick={() => onOpenDetail && onOpenDetail(d.tab, offset)}
            style={{
              padding: "14px 12px 12px",
              background: "rgba(255,255,255,0.02)",
              border: `1px solid ${d.color}30`,
              borderRadius: 14,
              cursor: "pointer",
              transition: "all 0.2s",
              position: "relative",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = `${d.color}60`; e.currentTarget.style.background = `${d.color}08`; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = `${d.color}30`; e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
          >
            <p style={{ fontSize: 10, color: "rgba(240,230,208,0.45)", letterSpacing: "0.06em", marginBottom: 8 }}>{d.icon} {d.label}</p>
            <p style={{ fontFamily: "'Shippori Mincho',serif", fontSize: 28, fontWeight: 900, color: d.color, lineHeight: 1, marginBottom: 6 }}>
              {d.value}<span style={{ fontSize: 10, fontWeight: 400, color: "rgba(240,230,208,0.3)", marginLeft: 2 }}>/100</span>
            </p>
            <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", marginBottom: 8, overflow: "hidden" }}>
              <div style={{ height: "100%", width: d.value + "%", background: d.color, borderRadius: 2, opacity: 0.7 }} />
            </div>
            <p style={{ fontSize: 10, color: "rgba(240,230,208,0.45)", lineHeight: 1.6 }}>{d.comment}</p>
            <span style={{ position: "absolute", bottom: 8, right: 10, fontSize: 9, color: `${d.color}70`, letterSpacing: "0.05em" }}>詳細 ›</span>
          </div>
        ))}
      </div>

    </div>
  );
};

// ── 半期グラフコンポーネント ──
const SERIES_CONFIG = [
  { key: "total",  label: "総合運", color: "#E8C96A",              sw: 3,   dash: "",       dot: 5 },
  { key: "love",   label: "恋愛運", color: "rgba(240,110,145,1)",  sw: 2,   dash: "6 3",    dot: 4 },
  { key: "work",   label: "仕事運", color: "rgba(100,190,235,1)",  sw: 2,   dash: "",       dot: 4 },
  { key: "money",  label: "金運",   color: "rgba(150,210,90,1)",   sw: 2,   dash: "3 4",    dot: 4 },
];

const HalfYearBlock = ({ months, kanshi, data, currentMonth, popoText }) => {
  const [activeSeries, setActiveSeries] = useState(["total"]);
  const [tooltip, setTooltip] = useState(null);
  const W = 580, H = 200, PAD = { top: 16, right: 20, bottom: 40, left: 36 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const n = months.length;
  const xPos = (i) => PAD.left + (i / (n - 1)) * innerW;
  // データ全体の最小値・最大値から余裕を持ったY軸レンジを動的計算
  const allVals = [...(data.total||[]), ...(data.love||[]), ...(data.work||[]), ...(data.money||[])];
  const dataMin = Math.min(...allVals);
  const dataMax = Math.max(...allVals);
  const yFloor = Math.max(0,  Math.floor((dataMin - 10) / 10) * 10);
  const yCeil  = Math.min(100, Math.ceil( (dataMax + 10) / 10) * 10);
  const yRange = yCeil - yFloor || 60;
  const yPos = (v) => PAD.top + innerH - ((v - yFloor) / yRange) * innerH;

  const toggle = (k) => setActiveSeries(prev =>
    prev.includes(k) ? (prev.length > 1 ? prev.filter(x => x !== k) : prev) : [...prev, k]
  );

  const makePolyline = (vals) =>
    vals.map((v, i) => `${xPos(i)},${yPos(v)}`).join(" ");

  const makeArea = (vals) => {
    const top = vals.map((v, i) => `${xPos(i)},${yPos(v)}`).join(" L ");
    const bottom = `L ${xPos(n - 1)},${PAD.top + innerH} L ${xPos(0)},${PAD.top + innerH} Z`;
    return `M ${top} ${bottom}`;
  };

  return (
    <div>
      {/* 凡例 */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
        {SERIES_CONFIG.map(s => (
          <button key={s.key} onClick={() => toggle(s.key)} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "5px 12px", borderRadius: 20, cursor: "pointer",
            background: activeSeries.includes(s.key) ? "rgba(255,255,255,0.05)" : "transparent",
            border: `1px solid ${activeSeries.includes(s.key) ? s.color : "rgba(255,255,255,0.1)"}`,
            color: activeSeries.includes(s.key) ? s.color : "rgba(240,230,208,0.3)",
            fontSize: 12, transition: "all 0.2s",
          }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: activeSeries.includes(s.key) ? s.color : "rgba(255,255,255,0.1)", flexShrink: 0 }} />
            {s.label}
          </button>
        ))}
        <button onClick={() => setActiveSeries(prev => prev.length === 4 ? ["total"] : ["total","love","work","money"])} style={{
          padding: "5px 10px", borderRadius: 20, cursor: "pointer",
          background: "transparent",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "rgba(240,230,208,0.3)", fontSize: 11, transition: "all 0.2s",
        }}>
          {activeSeries.length === 4 ? "絞る" : "全表示"}
        </button>
      </div>

      {/* SVGグラフ */}
      <div style={{ overflowX: "auto", marginBottom: 16 }}>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ minWidth: 320 }}>
          <defs>
            {SERIES_CONFIG.map(s => (
              <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity="0.25" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>

          {/* グリッドライン */}
          {Array.from({length: 5}, (_, i) => Math.round(yFloor + (i / 4) * yRange)).map(v => (
            <g key={v}>
              <line x1={PAD.left} y1={yPos(v)} x2={PAD.left + innerW} y2={yPos(v)}
                stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
              <text x={PAD.left - 8} y={yPos(v) + 1} textAnchor="end" dominantBaseline="middle"
                fill="rgba(240,230,208,0.25)" fontSize={10}>{v}</text>
            </g>
          ))}

          {/* 現在月の縦線 */}
          {currentMonth !== null && months.indexOf(`${currentMonth}月`) >= 0 && (
            <line
              x1={xPos(months.indexOf(`${currentMonth}月`))}
              y1={PAD.top}
              x2={xPos(months.indexOf(`${currentMonth}月`))}
              y2={PAD.top + innerH}
              stroke="rgba(201,168,76,0.4)" strokeWidth={1.5} strokeDasharray="4 3"
            />
          )}

          {/* エリア＆ライン：1系列のみ選択時はエリア表示、複数時はライン+ドットのみ */}
          {SERIES_CONFIG.filter(s => activeSeries.includes(s.key)).map((s, idx, arr) => (
            <g key={s.key}>
              {arr.length === 1 && (
                <path d={makeArea(data[s.key])} fill={`url(#grad-${s.key})`} />
              )}
              {/* 影レイヤー（白半透明）：重なっても輪郭が見えるように */}
              <polyline points={makePolyline(data[s.key])}
                fill="none" stroke="rgba(0,0,0,0.5)"
                strokeWidth={s.sw + 3}
                strokeLinejoin="round" strokeLinecap="round" />
              <polyline points={makePolyline(data[s.key])}
                fill="none" stroke={s.color}
                strokeWidth={s.sw}
                strokeDasharray={s.dash}
                strokeLinejoin="round" strokeLinecap="round"
                style={{ filter: arr.length === 1 ? `drop-shadow(0 0 6px ${s.color})` : `drop-shadow(0 0 2px ${s.color})` }} />
              {data[s.key].map((v, i) => (
                <g key={i}>
                  {/* 白い縁取り */}
                  <circle cx={xPos(i)} cy={yPos(v)} r={s.dot + 2}
                    fill="rgba(0,0,0,0.6)" stroke="none" />
                  <circle cx={xPos(i)} cy={yPos(v)} r={s.dot}
                    fill={C.bg} stroke={s.color} strokeWidth={2}
                    style={{ cursor: "pointer" }}
                    onMouseEnter={() => setTooltip({ i, key: s.key, v, label: s.label, x: xPos(i), y: yPos(v), color: s.color })}
                    onMouseLeave={() => setTooltip(null)}
                  />
                </g>
              ))}
            </g>
          ))}

          {/* ツールチップ */}
          {tooltip && (
            <g>
              <rect x={tooltip.x - 32} y={tooltip.y - 46} width={64} height={38} rx={6}
                fill="rgba(20,14,8,0.92)" stroke={tooltip.color} strokeWidth={1.5} />
              <text x={tooltip.x} y={tooltip.y - 30} textAnchor="middle"
                fill={tooltip.color} fontSize={10} fontFamily="'Noto Sans JP',sans-serif">
                {tooltip.label}
              </text>
              <text x={tooltip.x} y={tooltip.y - 15} textAnchor="middle"
                fill={tooltip.color} fontSize={14} fontFamily="'Shippori Mincho',serif" fontWeight="700">
                {tooltip.v}
              </text>
            </g>
          )}

          {/* X軸 月ラベル */}
          {months.map((m, i) => (
            <g key={i}>
              <text x={xPos(i)} y={PAD.top + innerH + 16} textAnchor="middle"
                fill={currentMonth !== null && m === `${currentMonth}月` ? C.gold : "rgba(240,230,208,0.35)"}
                fontSize={11} fontFamily="'Noto Sans JP',sans-serif">{m}</text>
              <text x={xPos(i)} y={PAD.top + innerH + 30} textAnchor="middle"
                fill="rgba(240,230,208,0.2)" fontSize={9}>{kanshi[i]}</text>
            </g>
          ))}
        </svg>
      </div>

      {/* 月別スコア一覧 */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${months.length}, 1fr)`, gap: 6, marginBottom: 18 }}>
        {months.map((m, i) => {
          const isCurrent = currentMonth !== null && m === `${currentMonth}月`;
          const avg = Math.round(SERIES_CONFIG.reduce((s, c) => s + data[c.key][i], 0) / SERIES_CONFIG.length);
          return (
            <div key={i} style={{
              textAlign: "center", padding: "10px 4px", borderRadius: 10,
              background: isCurrent ? "rgba(201,168,76,0.1)" : "rgba(255,255,255,0.02)",
              border: `1px solid ${isCurrent ? "rgba(201,168,76,0.35)" : "rgba(255,255,255,0.06)"}`,
            }}>
              <p style={{ fontSize: 10, color: isCurrent ? C.gold : C.textMuted, marginBottom: 4 }}>{m}</p>
              <p style={{ fontFamily: "'Shippori Mincho',serif", fontSize: 18, fontWeight: 700, color: isCurrent ? C.gold : C.textSub }}>{avg}</p>
              <p style={{ fontSize: 9, color: C.textMuted, marginTop: 2 }}>{kanshi[i]}</p>
            </div>
          );
        })}
      </div>

      <PopoSpeech text={popoText} />
    </div>
  );
};

// ── 相性占いタブ ──
// MBTI 32通り（16タイプ × A/T） + わからない
const MBTI_NAMES = {
  INTJ:'建築家', INTP:'論理学者', ENTJ:'指揮官', ENTP:'討論者',
  INFJ:'提唱者', INFP:'仲介者',  ENFJ:'主人公', ENFP:'広報活動家',
  ISTJ:'管理者', ISFJ:'擁護者',  ESTJ:'幹部',   ESFJ:'領事',
  ISTP:'巨匠',  ISFP:'冒険家',  ESTP:'起業家', ESFP:'エンターテイナー',
};
const MBTI_TYPES_32 = [
  {value:'わからない', label:'わからない'},
  {value:'INTJ-A', label:'INTJ-A（建築家・自信型）'},
  {value:'INTJ-T', label:'INTJ-T（建築家・慎重型）'},
  {value:'INTP-A', label:'INTP-A（論理学者・自信型）'},
  {value:'INTP-T', label:'INTP-T（論理学者・慎重型）'},
  {value:'ENTJ-A', label:'ENTJ-A（指揮官・自信型）'},
  {value:'ENTJ-T', label:'ENTJ-T（指揮官・慎重型）'},
  {value:'ENTP-A', label:'ENTP-A（討論者・自信型）'},
  {value:'ENTP-T', label:'ENTP-T（討論者・慎重型）'},
  {value:'INFJ-A', label:'INFJ-A（提唱者・自信型）'},
  {value:'INFJ-T', label:'INFJ-T（提唱者・慎重型）'},
  {value:'INFP-A', label:'INFP-A（仲介者・自信型）'},
  {value:'INFP-T', label:'INFP-T（仲介者・慎重型）'},
  {value:'ENFJ-A', label:'ENFJ-A（主人公・自信型）'},
  {value:'ENFJ-T', label:'ENFJ-T（主人公・慎重型）'},
  {value:'ENFP-A', label:'ENFP-A（広報活動家・自信型）'},
  {value:'ENFP-T', label:'ENFP-T（広報活動家・慎重型）'},
  {value:'ISTJ-A', label:'ISTJ-A（管理者・自信型）'},
  {value:'ISTJ-T', label:'ISTJ-T（管理者・慎重型）'},
  {value:'ISFJ-A', label:'ISFJ-A（擁護者・自信型）'},
  {value:'ISFJ-T', label:'ISFJ-T（擁護者・慎重型）'},
  {value:'ESTJ-A', label:'ESTJ-A（幹部・自信型）'},
  {value:'ESTJ-T', label:'ESTJ-T（幹部・慎重型）'},
  {value:'ESFJ-A', label:'ESFJ-A（領事・自信型）'},
  {value:'ESFJ-T', label:'ESFJ-T（領事・慎重型）'},
  {value:'ISTP-A', label:'ISTP-A（巨匠・自信型）'},
  {value:'ISTP-T', label:'ISTP-T（巨匠・慎重型）'},
  {value:'ISFP-A', label:'ISFP-A（冒険家・自信型）'},
  {value:'ISFP-T', label:'ISFP-T（冒険家・慎重型）'},
  {value:'ESTP-A', label:'ESTP-A（起業家・自信型）'},
  {value:'ESTP-T', label:'ESTP-T（起業家・慎重型）'},
  {value:'ESFP-A', label:'ESFP-A（エンターテイナー・自信型）'},
  {value:'ESFP-T', label:'ESFP-T（エンターテイナー・慎重型）'},
];
const MBTI_TYPES = MBTI_TYPES_32.map(m => m.value); // 後方互換
const HOURS = ["わからない","子の刻 23:00-01:00","丑の刻 01:00-03:00","寅の刻 03:00-05:00","卯の刻 05:00-07:00","辰の刻 07:00-09:00","巳の刻 09:00-11:00","午の刻 11:00-13:00","未の刻 13:00-15:00","申の刻 15:00-17:00","酉の刻 17:00-19:00","戌の刻 19:00-21:00","亥の刻 21:00-23:00"];
const RELATIONS = ["恋人・パートナー","気になる人","元交際相手","配偶者","友人","職場の人","家族"];

const EMPTY_PARTNER = { name:"", year:"", month:"", day:"", hour:"わからない", gender:"女性", mbti:"わからない", relation:"恋人・パートナー", birthPlace:"", resolvedLon:null, geoStatus:"" };

// 相性スコア計算（五行相互作用ベース簡易ロジック）
// ── 完全相性スコア計算（React内でリアルタイム実行）────────────────
function calcFullCompatScore(partner, myCalcOverride) {
  try {
    const myCalc = myCalcOverride || window._MEISHIKI_CALC;
    if (!myCalc || !partner) return null;

    const JIKKAN_F  = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
    const JUNISHI_F = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
    const GOGYO_F   = ['木','木','火','火','土','土','金','金','水','水'];
    const SEI_F  = {木:'火',火:'土',土:'金',金:'水',水:'木'};
    const KOKU_F = {木:'土',火:'金',土:'水',金:'木',水:'火'};
    const SHIGOU_F = {子:'丑',丑:'子',寅:'亥',亥:'寅',卯:'戌',戌:'卯',辰:'酉',酉:'辰',巳:'申',申:'巳',午:'未',未:'午'};
    const ROKUCHUU_F = {子:'午',午:'子',丑:'未',未:'丑',寅:'申',申:'寅',卯:'酉',酉:'卯',辰:'戌',戌:'辰',巳:'亥',亥:'巳'};
    const KANGO_F = {甲:'己',己:'甲',乙:'庚',庚:'乙',丙:'辛',辛:'丙',丁:'壬',壬:'丁',戊:'癸',癸:'戊'};

    // 相手の命式を計算
    const KOKU_MAP = {
      'わからない':-1,
      '子の刻 23:00-01:00':0,'丑の刻 01:00-03:00':2,'寅の刻 03:00-05:00':4,
      '卯の刻 05:00-07:00':6,'辰の刻 07:00-09:00':8,'巳の刻 09:00-11:00':10,
      '午の刻 11:00-13:00':12,'未の刻 13:00-15:00':14,'申の刻 15:00-17:00':16,
      '酉の刻 17:00-19:00':18,'戌の刻 19:00-21:00':20,'亥の刻 21:00-23:00':22,
    };
    const genderMap = {'女性':'f','男性':'m','その他':'x'};
    const ptHourRaw = partner.hour !== undefined ? partner.hour : (partner.hourInput !== undefined ? partner.hourInput : 'わからない');
    let ptHourInput = -1;
    if (ptHourRaw in KOKU_MAP) {
      ptHourInput = KOKU_MAP[ptHourRaw];
    } else {
      const parsed = Number(ptHourRaw);
      ptHourInput = isNaN(parsed) ? -1 : parsed;
    }
    const ptCalc = window._calcMeishiki({
      year: parseInt(partner.year)||0, month: parseInt(partner.month)||0, day: parseInt(partner.day)||0,
      hourInput: ptHourInput,
      gender: genderMap[partner.gender] || partner.gender || 'f',
      longitude: partner.longitude !== undefined ? Number(partner.longitude) : 135,
      mbti: partner.mbti || '',
    });

    // ① 五行相性（日主）
    const myG  = myCalc.pillars?.day?.kan ? (GOGYO_F[JIKKAN_F.indexOf(myCalc.pillars.day.kan)] || '水') : '水';
    const ptG  = ptCalc.pillars?.day?.kan ? (GOGYO_F[JIKKAN_F.indexOf(ptCalc.pillars.day.kan)] || '木') : '木';
    let baseScore = 65;
    if (SEI_F[myG]===ptG || SEI_F[ptG]===myG) baseScore = 82;
    else if (myG===ptG)                         baseScore = 72;
    else if (KOKU_F[myG]===ptG || KOKU_F[ptG]===myG) baseScore = 52;
    let score_gogyo = baseScore;

    // ② 日柱相性
    let score_day = baseScore;
    const myDS = myCalc.pillars?.day?.shi, ptDS = ptCalc.pillars?.day?.shi;
    const myDK = myCalc.pillars?.day?.kan, ptDK = ptCalc.pillars?.day?.kan;
    if (myDS && ptDS) {
      if (SHIGOU_F[myDS]===ptDS) score_day = Math.min(99, score_day+10);
      else if (ROKUCHUU_F[myDS]===ptDS) score_day = Math.max(20, score_day-12);
    }
    if (myDK && ptDK && KANGO_F[myDK]===ptDK) score_day = Math.min(99, score_day+8);

    // ③ 月柱相性
    let score_month = baseScore;
    const myMS = myCalc.pillars?.month?.shi, ptMS = ptCalc.pillars?.month?.shi;
    const myMK = myCalc.pillars?.month?.kan, ptMK = ptCalc.pillars?.month?.kan;
    if (myMS && ptMS) {
      if (SHIGOU_F[myMS]===ptMS) score_month = Math.min(99, score_month+10);
      else if (ROKUCHUU_F[myMS]===ptMS) score_month = Math.max(20, score_month-10);
    }
    if (myMK && ptMK && KANGO_F[myMK]===ptMK) score_month = Math.min(99, score_month+6);
    if (SEI_F[myG]===ptG || SEI_F[ptG]===myG) score_month = Math.min(99, score_month+5);

    // ④ 年柱相性
    let score_year = baseScore;
    const myYK = myCalc.pillars?.year?.kan, ptYK = ptCalc.pillars?.year?.kan;
    const myYG = myYK ? GOGYO_F[JIKKAN_F.indexOf(myYK)] : null;
    const ptYG = ptYK ? GOGYO_F[JIKKAN_F.indexOf(ptYK)] : null;
    if (myYG && ptYG) {
      if (SEI_F[myYG]===ptYG || SEI_F[ptYG]===myYG) score_year = Math.min(99, score_year+8);
      else if (myYG===ptYG) score_year = Math.min(99, score_year+3);
    }
    const myYS = myCalc.pillars?.year?.shi, ptYS = ptCalc.pillars?.year?.shi;
    if (myYS && ptYS && SHIGOU_F[myYS]===ptYS) score_year = Math.min(99, score_year+5);

    // ⑤ 時柱相性
    let score_hour = baseScore;
    const myHS = myCalc.pillars?.hour?.shi, ptHS = ptCalc.pillars?.hour?.shi;
    if (myHS && ptHS) {
      if (SHIGOU_F[myHS]===ptHS) score_hour = Math.min(99, score_hour+8);
      else if (ROKUCHUU_F[myHS]===ptHS) score_hour = Math.max(20, score_hour-8);
    }

    const birthCompatScore = Math.max(20, Math.min(99, Math.round(
      score_gogyo*0.35 + score_day*0.25 + score_month*0.20 + score_year*0.10 + score_hour*0.10
    )));

    // ⑥ 引き合う力（支合・干合）
    const hasShigou = myDS && SHIGOU_F[myDS]===ptDS;
    const hasKango  = myDK && KANGO_F[myDK]===ptDK;
    const hasMShigou = myMS && SHIGOU_F[myMS]===ptMS;
    let hikiai = baseScore;
    if (hasShigou)  hikiai = Math.min(99, hikiai+18);
    if (hasKango)   hikiai = Math.min(99, hikiai+12);
    if (hasMShigou) hikiai = Math.min(99, hikiai+6);
    hikiai = Math.max(20, Math.min(99, hikiai));

    // ⑦ MBTI相性（mbti-engine.js 経由）
    let mbtiScore = 70;
    const myMbti = myCalc.mbti || myCalc.input?.mbti || '';
    const ptMbti = partner.mbti || '';
    if (window.MBTI_ENGINE_READY && myMbti && ptMbti && myMbti !== 'わからない' && ptMbti !== 'わからない') {
      mbtiScore = window.calcMbtiScore(myMbti, ptMbti);
    }

    // ⑧ 総合スコア（正規化後の加重平均）
    function normalizeScore(val, vmin, vmax) {
      return Math.max(0, Math.min(100, (val - vmin) / (vmax - vmin) * 100));
    }
    const bcs_n = normalizeScore(birthCompatScore, 55, 95);
    const hik_n = normalizeScore(hikiai, 20, 99);
    const mbt_n = normalizeScore(mbtiScore, 48, 95);
    const total = Math.round(bcs_n*0.60 + hik_n*0.25 + mbt_n*0.15);
    const loveScore = Math.min(99, Math.round(bcs_n*0.60 + hik_n*0.25 + mbt_n*0.15 + (hasShigou ? 8 : 0)));
    const compatType = SEI_F[myG]===ptG ? '相生型' : SEI_F[ptG]===myG ? '相生型' : myG===ptG ? '比和型' : (KOKU_F[myG]===ptG || KOKU_F[ptG]===myG) ? '相剋型' : '中和型';
    const typeLabel = total>=88 ? '特別な縁' : total>=80 ? '深い相性' : total>=70 ? 'よい相性' : total>=60 ? '補い合える' : '刺激し合う';

    return { total, birthCompatScore, hikiai, mbtiScore, loveScore, compatType, typeLabel, hasShigou, hasKango, myG, ptG };
  } catch(e) {
    return null;
  }
}

function calcCompatScore(myKanIdx, partnerKanIdx) {
  // 日主同士の五行相性マトリクス（水=8,9 金=6,7 木=0,1 火=2,3 土=4,5）
  const gogyoOf = (i) => i<=1?"木":i<=3?"火":i<=5?"土":i<=7?"金":"水";
  const myG = gogyoOf(myKanIdx % 10);
  const ptG = gogyoOf(partnerKanIdx % 10);
  // 相生(+20)・比和(+10)・相剋(-15)
  const SEI = {木:"水",火:"木",土:"火",金:"土",水:"金"};
  const KOKU = {木:"土",火:"金",土:"水",金:"木",水:"火"};
  if (SEI[myG]===ptG || SEI[ptG]===myG) return { total:85, base:"相生", desc:"お互いを自然に引き出し合える組み合わせンダ。エネルギーが循環して、一緒にいるほど成長できる関係ンダよ。" };
  if (myG===ptG) return { total:78, base:"比和", desc:"同じ気質同士ンダ。価値観が近くて居心地がいい反面、同じ弱点も共有しやすいんダよ。" };
  if (KOKU[myG]===ptG) return { total:58, base:"相剋", desc:"エネルギーの方向性がぶつかりやすい組み合わせンダ。摩擦があるぶん、お互いを鍛え合う関係にもなれるんダよ。" };
  return { total:68, base:"中和", desc:"際立った相性の強さも弱さもない、バランス型の組み合わせンダ。お互いの努力次第でいくらでも深まれるんダよ。" };
}

const CompatTab = ({ partners, setPartners }) => {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_PARTNER);
  const [editIdx, setEditIdx] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [activePartner, setActivePartner] = useState(null);
  const [scoreCache, setScoreCache] = useState({});

  const f = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleCompatGeoSearch = async () => {
    if (!form.birthPlace.trim()) return;
    f("geoStatus","loading");
    try {
      const q = encodeURIComponent(form.birthPlace.trim());
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,
        { headers:{ "Accept-Language":"ja,en" } });
      const data = await res.json();
      if (data && data[0]) {
        f("resolvedLon", parseFloat(data[0].lon));
        f("geoStatus","ok");
      } else {
        f("geoStatus","error");
      }
    } catch(e) {
      f("geoStatus","error");
    }
  };

  const isFormValid = form.name && form.year && form.month && form.day;

  const savePartner = () => {
    if (!isFormValid) return;
    const longitude = form.resolvedLon !== null ? form.resolvedLon : 135;
    const newP = {
      ...form,
      year:      parseInt(form.year)   || 0,
      month:     parseInt(form.month)  || 0,
      day:       parseInt(form.day)    || 0,
      longitude,
      id: Date.now()
    };
    if (editIdx !== null) {
      setPartners(prev => prev.map((p, i) => i === editIdx ? newP : p));
      setEditIdx(null);
    } else {
      setPartners(prev => [...prev, newP]);
    }
    setForm(EMPTY_PARTNER);
    setShowForm(false);
    setAnalysisResult(null);
    setActivePartner(null);
    // 保存直後にスコアを計算
    const sc = calcFullCompatScore(newP);
    if (sc) {
      setScoreCache(prev => ({ ...prev, [newP.id]: sc }));
    }
  };

  const deletePartner = (idx) => {
    setPartners(prev => prev.filter((_, i) => i !== idx));
    if (activePartner === idx) { setActivePartner(null); setAnalysisResult(null); }
  };

  // _pfResetAnalyzing: 戻るボタンでローディングをリセット
  useEffect(() => {
    window._pfResetAnalyzing = () => {
      setAnalyzing(false);
      setActivePartner(null);
    };
    return () => { window._pfResetAnalyzing = null; };
  }, []);

  // partnersが変化したとき、スコア未計算のものを計算
  useEffect(() => {
    partners.forEach(p => {
      if (!scoreCache[p.id]) {
        const sc = calcFullCompatScore(p);
        if (sc) setScoreCache(prev => ({ ...prev, [p.id]: sc }));
      }
    });
  }, [partners]);

  const analyze = async (partner, idx) => {
    setActivePartner(idx);
    setAnalyzing(true);
    setAnalysisResult(null);
    // Save partner data to sessionStorage for compat-detail page
    try { sessionStorage.setItem('compat_partner', JSON.stringify(partner)); } catch(e){}
    window._pfCompatPartner = partner;  // sessionStorage fallback用に直接も保持
    // _pfShowCompat が定義されるまで待ってから実行（Babel非同期対策）
    const waitAndShow = (elapsed) => {
      if (typeof window._pfShowCompat === 'function') {
        window._pfShowCompat();
      } else if (elapsed < 4000) {
        setTimeout(() => waitAndShow(elapsed + 100), 100);
      }
    };
    setTimeout(() => waitAndShow(0), 1200);
    // フォールバック: 6秒後もローディングが続いていたらリセット
    setTimeout(() => {
      if (window._pfResetAnalyzing) window._pfResetAnalyzing();
    }, 6000);
  };

  const ScoreBar = ({ label, value, color }) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 12, color: C.textMuted }}>{label}</span>
        <span style={{ fontSize: 13, fontFamily: "'Shippori Mincho',serif", color, fontWeight: 700 }}>{value}</span>
      </div>
      <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${value}%`, background: color, borderRadius: 4, boxShadow: `0 0 8px ${color}`, transition: "width 1s ease 0.3s" }} />
      </div>
    </div>
  );

  // ── ポポ占い中 ローディングオーバーレイ ──
  const CompatLoadingOverlay = () => {
    const [dots, setDots] = React.useState('');
    const [step, setStep] = React.useState(0);
    const steps = ['命式を読み解いているンダ…', '五行の相性を計算しているンダ…', 'MBTIの組み合わせを分析しているンダ…', '鑑定書を生成しているンダ…'];
    React.useEffect(() => {
      const d = setInterval(() => setDots(prev => prev.length < 3 ? prev + '.' : ''), 400);
      const s = setInterval(() => setStep(prev => (prev + 1) % steps.length), 800);
      return () => { clearInterval(d); clearInterval(s); };
    }, []);
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(13,13,26,0.97)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 24, backdropFilter: 'blur(8px)',
      }}>
        <div style={{ fontSize: 72, animation: 'floatPanda 2s ease-in-out infinite', filter: 'drop-shadow(0 8px 24px rgba(201,168,76,0.4))' }}><PandaIcon size={72} /></div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: "'Shippori Mincho',serif", fontSize: 22, fontWeight: 800, color: '#E8C96A', marginBottom: 8 }}>ポポが占い中ンダ…</p>
          <p style={{ fontFamily: "'Shippori Mincho',serif", fontSize: 14, color: 'rgba(201,168,76,0.7)' }}>{steps[step]}{dots}</p>
        </div>
        <div style={{ width: 240, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: 'linear-gradient(90deg,#a07a24,#E8C96A)', borderRadius: 2, animation: 'loadingBar 2.5s ease forwards' }} />
        </div>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontFamily: "'Shippori Mincho',serif" }}>四柱推命 × MBTI で2人の縁を読み解いているんダ🐼</p>
        <style>{`@keyframes loadingBar { from{width:0%} to{width:100%} }`}</style>
      </div>
    );
  };

  return (
    <div className="tab-content" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {analyzing && <CompatLoadingOverlay />}

      {/* ── ヘッダーカード（相手登録時のみ） ── */}
      {!(partners.length === 0 && !showForm) && (
        <Card glow>
          <SectionLabel en="COMPATIBILITY · 相性占い" ja="相性占い" />
          <PopoSpeech text="好きな人や気になる相手の情報を入力してほしいんダ。四柱推命×MBTIで、2人の相性を徹底的に読み解くんダよ。最大10人まで登録できるんダ🐼" />
        </Card>
      )}

      {/* ── 登録フォーム ── */}
      {showForm && (
        <Card>
          <SectionLabel en="ADD PARTNER · 相手を登録" ja={editIdx !== null ? "相手情報を編集" : "相手を追加"} />

          {/* 名前 + 関係性 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 11, color: C.textMuted, display: "block", marginBottom: 6 }}>相手の名前（ニックネームOK）<span style={{ color: C.gold }}>*</span></label>
              <input value={form.name} onChange={e => f("name", e.target.value)} placeholder="例: 田中さん" style={{ width: "100%", padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, color: C.text, fontSize: 13, outline: "none" }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: C.textMuted, display: "block", marginBottom: 6 }}>関係性</label>
              <select value={form.relation} onChange={e => f("relation", e.target.value)} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, background: "rgba(20,10,10,0.95)", border: `1px solid ${C.border}`, color: C.text, fontSize: 13, outline: "none" }}>
                {RELATIONS.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>

          {/* 生年月日 */}
          <label style={{ fontSize: 11, color: C.textMuted, display: "block", marginBottom: 6 }}>生年月日<span style={{ color: C.gold }}>*</span></label>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
            <input type="number" value={form.year} onChange={e => f("year", e.target.value)} placeholder="年（例: 1995）" min="1900" max="2025" style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, color: C.text, fontSize: 13, outline: "none" }} />
            <input type="number" value={form.month} onChange={e => f("month", e.target.value)} placeholder="月" min="1" max="12" style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, color: C.text, fontSize: 13, outline: "none" }} />
            <input type="number" value={form.day} onChange={e => f("day", e.target.value)} placeholder="日" min="1" max="31" style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, color: C.text, fontSize: 13, outline: "none" }} />
          </div>

          {/* 時間 + 性別 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 11, color: C.textMuted, display: "block", marginBottom: 6 }}>生まれた時間（わからなければスキップ可）</label>
              <select value={form.hour} onChange={e => f("hour", e.target.value)} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, background: "rgba(20,10,10,0.95)", border: `1px solid ${C.border}`, color: C.text, fontSize: 12, outline: "none" }}>
                {HOURS.map(h => <option key={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: C.textMuted, display: "block", marginBottom: 6 }}>性別</label>
              <select value={form.gender} onChange={e => f("gender", e.target.value)} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, background: "rgba(20,10,10,0.95)", border: `1px solid ${C.border}`, color: C.text, fontSize: 13, outline: "none" }}>
                {["女性","男性","その他"].map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
          </div>

          {/* MBTI + 出生地 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            <div>
              <label style={{ fontSize: 11, color: C.textMuted, display: "block", marginBottom: 6 }}>MBTIタイプ（わからなければスキップ可）</label>
              <select value={form.mbti} onChange={e => f("mbti", e.target.value)} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, background: "rgba(20,10,10,0.95)", border: `1px solid ${C.border}`, color: C.text, fontSize: 12, outline: "none" }}>
                {MBTI_TYPES_32.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: C.textMuted, display: "block", marginBottom: 6 }}>出生地（わからなければスキップ可）</label>
              <div style={{ display:"flex", gap:6 }}>
                <input
                  value={form.birthPlace}
                  onChange={e => { f("birthPlace", e.target.value); f("geoStatus",""); f("resolvedLon",null); }}
                  onKeyDown={e => e.key==="Enter" && handleCompatGeoSearch()}
                  placeholder="例: 大阪府 / Paris / Seoul"
                  style={{ flex:1, padding:"10px 14px", borderRadius:10, background:"rgba(255,255,255,0.04)", border:`1px solid ${C.border}`, color:C.text, fontSize:13, outline:"none" }}
                />
                <button
                  type="button"
                  onClick={handleCompatGeoSearch}
                  disabled={form.geoStatus==="loading"}
                  style={{ padding:"10px 12px", borderRadius:10, cursor:"pointer", flexShrink:0,
                    background: form.geoStatus==="ok" ? "rgba(80,160,80,0.2)" : "rgba(201,168,76,0.12)",
                    border: `1px solid ${form.geoStatus==="ok" ? "rgba(80,160,80,0.5)" : "rgba(201,168,76,0.3)"}`,
                    color: form.geoStatus==="ok" ? "rgba(120,200,120,0.9)" : C.gold,
                    fontSize:11, fontFamily:"'Noto Sans JP',sans-serif", minWidth:48 }}
                >
                  {form.geoStatus==="loading" ? "…" : form.geoStatus==="ok" ? "✓" : "検索"}
                </button>
              </div>
              {form.geoStatus==="ok" && form.resolvedLon!==null && (
                <p style={{ fontSize:10, color:"rgba(120,200,120,0.7)", marginTop:4 }}>東経{form.resolvedLon.toFixed(2)}° で計算されますンダ</p>
              )}
              {form.geoStatus==="error" && (
                <p style={{ fontSize:10, color:"rgba(200,100,80,0.7)", marginTop:4 }}>見つからなかったンダ。別の書き方で試してほしいんダよ</p>
              )}
            </div>
          </div>

          {/* ボタン */}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={() => { setShowForm(false); setForm(EMPTY_PARTNER); setEditIdx(null); }} style={{ padding: "10px 20px", borderRadius: 10, background: "transparent", border: `1px solid rgba(255,255,255,0.1)`, color: C.textMuted, cursor: "pointer", fontSize: 13 }} data-i18n="キャンセル">キャンセル</button>
            <button onClick={savePartner} disabled={!isFormValid} style={{ padding: "10px 28px", borderRadius: 10, background: isFormValid ? "linear-gradient(135deg,#b8922a,#C9A84C)" : "rgba(255,255,255,0.05)", border: "none", color: isFormValid ? "#1a0d02" : C.textMuted, fontFamily: "'Shippori Mincho',serif", fontSize: 14, fontWeight: 700, cursor: isFormValid ? "pointer" : "default" }}>
              {editIdx !== null ? "更新する" : "登録する"}
            </button>
          </div>
        </Card>
      )}

      {/* ── 登録済み相手リスト ── */}
      {partners.length === 0 && !showForm ? (
        <Card glow>
          <SectionLabel en="COMPATIBILITY · 相性占い" ja="相性占い" />
          <PopoSpeech text="好きな人や気になる相手の情報を入力してほしいんダ。四柱推命×MBTIで、2人の相性を徹底的に読み解くんダよ。最大10人まで登録できるんダ🐼" />
          <div style={{ textAlign: "center", padding: "32px 0 8px", marginTop: 8 }}>
            <p style={{ fontSize: 44, marginBottom: 20 }}>💞</p>
            <p style={{ fontFamily: "'Shippori Mincho',serif", fontSize: 18, color: C.gold, marginBottom: 12 }}>まだ相手が登録されていないんダ</p>
            <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 28, lineHeight: 1.9 }}>気になる人・パートナーの情報を入力して<br />相性鑑定を始めてほしいんダ🐼</p>
            <button onClick={() => setShowForm(true)} style={{ padding: "12px 32px", borderRadius: 12, background: "linear-gradient(135deg,#b8922a,#C9A84C)", border: "none", color: "#1a0d02", fontFamily: "'Shippori Mincho',serif", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
              ＋ 相手を追加する
            </button>
          </div>
        </Card>
      ) : (
        <>
          {/* 相手カード一覧 */}
          {partners.map((p, idx) => {
            const isActive = activePartner === idx;
            const simpleScore = calcCompatScore(8, (parseInt(p.year || 2000) % 10));
            return (
              <Card key={p.id} glow={isActive}>
                {/* 相手ヘッダー */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: isActive && analysisResult ? 20 : 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontFamily: "'Shippori Mincho',serif", fontSize: 17, fontWeight: 700, color: C.text }}>{p.name}</span>
                        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: "rgba(201,168,76,0.08)", border: `1px solid ${C.border}`, color: C.goldDim }}>{p.relation}</span>
                      </div>
                      <p style={{ fontSize: 12, color: C.textMuted }}>
                        {p.year}/{p.month}/{p.day}
                        {p.mbti && p.mbti !== "わからない" && <span style={{ marginLeft: 8, color: C.textSub }}>· {p.mbti.replace(/-(A|T)$/, m => m === '-A' ? ' (自信型)' : ' (慎重型)')}</span>}
                        {p.gender && <span style={{ marginLeft: 8, color: C.textMuted }}>· {p.gender}</span>}
                      </p>
                    </div>
                  </div>

                  {/* アクションボタン */}
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button onClick={() => analyze(p, idx)} disabled={analyzing && activePartner === idx} style={{ padding: "8px 16px", borderRadius: 10, cursor: "pointer", background: isActive ? "linear-gradient(135deg,#b8922a,#C9A84C)" : "rgba(201,168,76,0.1)", border: `1px solid ${C.border}`, color: isActive ? "#1a0d02" : C.gold, fontSize: 12, fontFamily: "'Shippori Mincho',serif", fontWeight: 600 }}>
                      {analyzing && activePartner === idx ? "鑑定中…" : "詳細鑑定"}
                    </button>
                    <button onClick={() => { setForm(p); setEditIdx(idx); setShowForm(true); }} style={{ padding: "8px 12px", borderRadius: 10, cursor: "pointer", background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: C.textMuted, fontSize: 12 }}>編集</button>
                    <button onClick={() => deletePartner(idx)} style={{ padding: "8px 12px", borderRadius: 10, cursor: "pointer", background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(180,70,60,0.7)", fontSize: 12 }}>削除</button>
                  </div>
                </div>

                {/* 詳細鑑定結果 */}
                {isActive && analyzing && (
                  <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "16px 0", borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: 16 }}>
                    {[0,1,2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: C.gold, opacity: 0.5, animation: `pulse 1.2s ${i*0.2}s ease-in-out infinite` }} />)}
                    <span style={{ fontSize: 13, color: C.textMuted, marginLeft: 8 }}>ポポが鑑定中ンダ…</span>
                  </div>
                )}

                {isActive && analysisResult && !analysisResult.error && (
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: 16, paddingTop: 20, animation: "fadeUp 0.4s ease both" }}>
                    {/* スコアバー */}
                    <div style={{ marginBottom: 20 }}>
                      <ScoreBar label="総合相性" value={analysisResult.overall} color={C.gold} />
                      <ScoreBar label="恋愛・ドキドキ感" value={analysisResult.love} color="rgba(220,100,130,0.9)" />
                      <ScoreBar label="信頼・安心感" value={analysisResult.trust} color="rgba(100,180,220,0.9)" />
                      <ScoreBar label="成長・刺激" value={analysisResult.growth} color="rgba(160,200,100,0.9)" />
                    </div>

                    {/* 強み・注意 */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                      <div style={{ padding: "14px", borderRadius: 12, background: "rgba(100,180,100,0.06)", border: "1px solid rgba(100,180,100,0.2)" }}>
                        <p style={{ fontSize: 11, color: "rgba(130,200,130,0.8)", marginBottom: 6 }}>✦ この2人の強み</p>
                        <p style={{ fontSize: 13, color: C.textSub, lineHeight: 1.8 }}>{analysisResult.strength}</p>
                      </div>
                      <div style={{ padding: "14px", borderRadius: 12, background: "rgba(180,80,60,0.06)", border: "1px solid rgba(180,80,60,0.2)" }}>
                        <p style={{ fontSize: 11, color: "rgba(200,100,80,0.8)", marginBottom: 6 }}>⚠ 注意ポイント</p>
                        <p style={{ fontSize: 13, color: C.textSub, lineHeight: 1.8 }}>{analysisResult.caution}</p>
                      </div>
                    </div>

                    {/* ポポのアドバイス */}
                    <PopoSpeech text={analysisResult.advice} />
                  </div>
                )}

                {isActive && analysisResult?.error && (
                  <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 10, background: "rgba(180,60,50,0.08)", border: "1px solid rgba(180,60,50,0.2)", fontSize: 13, color: "rgba(200,100,80,0.8)" }}>
                    {analysisResult.summary}
                  </div>
                )}
              </Card>
            );
          })}

          {/* ＋追加ボタン */}
          {partners.length < 10 && !showForm && (
            <button onClick={() => { setShowForm(true); setForm(EMPTY_PARTNER); setEditIdx(null); }} style={{ padding: "14px", borderRadius: 14, background: "transparent", border: `1px dashed rgba(201,168,76,0.3)`, color: C.goldDim, cursor: "pointer", fontSize: 14, fontFamily: "'Shippori Mincho',serif", transition: "all 0.2s", width: "100%" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.gold; e.currentTarget.style.color = C.gold; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(201,168,76,0.3)"; e.currentTarget.style.color = C.goldDim; }}>
              ＋ 相手を追加する（{partners.length}/10）
            </button>
          )}
        </>
      )}
    </div>
  );
};

// ── AIチャットタブ ──
// ── ポポ回答生成（命式データから静的生成）────────────────────────
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

  // 五行ごとの特性 — 共通モジュールから言語別に取得
  var _gtLang = (typeof window !== 'undefined' && window.PF_LANG && window.PF_LANG.getLang) ? window.PF_LANG.getLang() : 'jp';
  var GOGYO_TRAIT = getGogyoTraitsByLang(_gtLang);

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
  if (ACK.getLang() === 'kr') {
    return ACK.buildDefaultAnswer_KR(q, kan, shi, kaku, ki, kj, duStr, duIsKi, duIsKj);
  }
  return ACK.buildDefaultAnswer_JA(q, kan, shi, kaku, ki, kj, duStr, duIsKi, duIsKj);
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
  var JIKKAN_G  = {"甲":"木","乙":"木","丙":"火","丁":"火","戊":"土","己":"土","庚":"金","辛":"金","壬":"水","癸":"水"};
  var kanGogyo  = JIKKAN_G[kan]  || "水";
  var _imLang = ACK.getLang();
  var moJisshin   = _imLang === 'kr' ? ACK.buildMoJisshin_KR(mo && mo.jisshin) : ACK.buildMoJisshin_JA(mo && mo.jisshin);
  var duComment   = _imLang === 'kr' ? ACK.buildDuComment_KR(duStr, calc.kishin, calc.kijin, du, JIKKAN_G) : ACK.buildDuComment_JA(duStr, calc.kishin, calc.kijin, du, JIKKAN_G);
  var mbtiComment = _imLang === 'kr' ? ACK.buildMbtiComment_KR(mbti, kanGogyo) : ACK.buildMbtiComment_JA(mbti, kanGogyo);
  var greetOpts   = { kan: kan, shi: shi, kaku: kaku, ki: ki, kj: kj, mbti: mbti, kanGogyo: kanGogyo, moJisshin: moJisshin, mbtiComment: mbtiComment, duComment: duComment };
  var text = _imLang === 'kr' ? ACK.buildInitialGreeting_KR(greetOpts) : ACK.buildInitialGreeting_JA(greetOpts);
  return [{ role: "popo", text: text }];
}

// 質問は {ja, kr} ペア形式。表示には q[lang]、generatePopoAnswer 入力には q.ja を使う
const POPO_CATS = [
  {
    label: "命式を知る", color: "rgba(201,168,76,0.85)", bg: "rgba(201,168,76,0.08)", border: "rgba(201,168,76,0.3)",
    questions: function(M) {
      var kan = (M.nichi && M.nichi.kan) || "壬";
      var shi = (M.nichi && M.nichi.shi) || "午";
      var ki = ((M._calc && M._calc.kishin) || []).join("・");
      var kj = ((M._calc && M._calc.kijin)  || []).join("・");
      return [
        { ja: "私の命式を一言で教えて",                       kr: "내 명식을 한마디로 알려줘" },
        { ja: "格局「" + M.kakukyoku + "」の意味を詳しく教えて", kr: "격국 \"" + M.kakukyoku + "\"의 의미를 자세히 알려줘" },
        { ja: "喜神「" + ki + "」の活かし方は？",              kr: "희신 \"" + ki + "\"를 활용하는 방법은?" },
        { ja: "忌神「" + kj + "」を避けるには？",              kr: "기신 \"" + kj + "\"을(를) 피하려면?" },
        { ja: "日主「" + kan + shi + "」の特徴は？",           kr: "일주 \"" + kan + shi + "\"의 특징은?" },
        { ja: "私の五行バランスから何が分かる？",                kr: "내 오행 밸런스에서 무엇을 알 수 있어?" },
      ];
    }
  },
  {
    label: "今日の運勢", color: "rgba(100,190,240,0.85)", bg: "rgba(100,180,240,0.08)", border: "rgba(100,180,240,0.3)",
    questions: function(M) {
      var du = M._calc && M._calc.currentDaiun;
      var duStr = du ? du.kan + du.shi : "大運";
      return [
        { ja: "今日の運勢を詳しく教えて",                  kr: "오늘의 운세를 자세히 알려줘" },
        { ja: "今日の恋愛運のアドバイスは？",              kr: "오늘의 연애운 조언은?" },
        { ja: "今日の仕事運のアドバイスは？",              kr: "오늘의 업무운 조언은?" },
        { ja: "今日の金運のアドバイスは？",                kr: "오늘의 금전운 조언은?" },
        { ja: "今の大運「" + duStr + "」の意味は？",       kr: "지금의 대운 \"" + duStr + "\"의 의미는?" },
        { ja: "今年はどんな年？",                         kr: "올해는 어떤 해야?" },
      ];
    }
  },
  {
    label: "相性占い", color: "rgba(224,96,122,0.85)", bg: "rgba(224,96,122,0.08)", border: "rgba(224,96,122,0.3)",
    questions: function(M) { return [
      { ja: "私と相性のいい人の特徴は？",                kr: "나와 궁합이 좋은 사람의 특징은?" },
      { ja: "五行の相生・相剋が相性に与える影響は？",     kr: "오행의 상생・상극이 궁합에 미치는 영향은?" },
      { ja: "支合・干合が恋愛に与える影響は？",           kr: "지지합・천간합이 연애에 미치는 영향은?" },
      { ja: "六冲が恋愛に与える影響は？",                kr: "육충(六冲)이 연애에 미치는 영향은?" },
      { ja: "忌神と喜神が一致する相手との関係は？",       kr: "기신과 희신이 일치하는 상대와의 관계는?" },
      { ja: "MBTI×命式で見る相性とは？",                kr: "MBTI × 명식으로 보는 궁합이란?" },
    ]; }
  },
];

// ── ポポ会話の localStorage キー・有効期限（3日） ──
const POPO_STORAGE_KEY  = "pf_popo_chat_v2"; // v2: メッセージ単位タイムスタンプ
const POPO_EXPIRE_MS    = 72 * 60 * 60 * 1000; // 72時間

// 各メッセージに sentAt（epoch ms）を付与して保存
// ロード時に sentAt が 72時間以上前のものを除去（初期ポポ挨拶は保持）
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

  // 初期化：localStorageから復元（挨拶は常に最新言語で再生成）
  const [msgs, setMsgs] = useState(function() {
    var saved = loadPopoMsgs();
    var initial = makeInitialMessages(M)[0];
    if (saved && saved.length > 0) return [initial].concat(saved.slice(1));
    return [initial];
  });
  const [input, setInput] = useState("");
  const [cat, setCat]     = useState(0);
  const [_langTick, setLangTick] = useState(0);
  const bottomRef         = React.useRef(null);

  // 言語切替検知 → 強制再レンダリング & 挨拶を最新言語で再生成
  useEffect(function() {
    function onLangChange() { setLangTick(function(n){ return n + 1; }); }
    window.addEventListener('pf-lang-change', onLangChange);
    return function() { window.removeEventListener('pf-lang-change', onLangChange); };
  }, []);
  useEffect(function() {
    if (_langTick === 0) return;
    setMsgs(function(prev) {
      var fresh = makeInitialMessages(M)[0];
      return [fresh].concat(prev.slice(1));
    });
  }, [_langTick]);

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
        var _isKrExp = ACK.getLang() === 'kr';
        oldestExpiry = _remainHr >= 24
          ? Math.ceil(_remainHr / 24) + (_isKrExp ? "일 후" : "日後")
          : _remainHr + (_isKrExp ? "시간 후" : "時間後");
      }
    }
  } catch(e) {}

  const resetMsgs = function() {
    clearPopoMsgs();
    var fresh = makeInitialMessages(M);
    setMsgs(fresh);
    savePopoMsgs(fresh);
  };

  // displayText = ユーザーバブル表示用 (KR/JA)
  // backendQuery = generatePopoAnswer 入力 (常に JA、パターンマッチ用)
  const send = function(displayText, backendQuery) {
    if (!displayText || !displayText.trim()) return;
    var trimmed = displayText.trim();
    var query = (backendQuery || trimmed).trim();
    var answer = generatePopoAnswer(M, query);
    if (ACK.getLang() === 'kr') {
      try { answer = translatePopoAnswer(answer); }
      catch (e) { console.warn('[AiChatTab] translatePopoAnswer failed:', e.message); }
    }
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
            <p style={{ fontSize:11, color:C.textMuted, marginTop:2 }}>{ACK.getLang()==='kr' ? ACK.buildHeaderSubtext_KR(M.nichi.kan, M.nichi.shi, M.kakukyoku) : ACK.buildHeaderSubtext_JA(M.nichi.kan, M.nichi.shi, M.kakukyoku)}</p>
          </div>

        </div>

        {/* 保存期限バナー */}
        <div style={{ flexShrink:0, display:"flex", alignItems:"center", gap:7, padding:"6px 10px", borderRadius:8, marginBottom:10,
          background:"rgba(201,168,76,0.05)", border:"1px solid rgba(201,168,76,0.12)" }}>
          <span style={{ fontSize:11 }}>💾</span>
          <p style={{ fontSize:10, color:C.textMuted, lineHeight:1.5 }}>
            {ACK.getLang()==='kr' ? '대화는 ' : '会話は'}<span style={{ color:C.goldDim, fontWeight:600 }}>{ACK.getLang()==='kr' ? '72시간이 지나면 삭제돼요🐼' : '72時間経つと削除されるンダよ🐼'}</span>
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
          {(function(){
            var _qLang = ACK.getLang();
            return qs.map(function(q, i){
              // {ja,kr} ペア形式 / 後方互換: 文字列も許容
              var label = (typeof q === 'string') ? q : (_qLang === 'kr' ? q.kr : q.ja);
              var backend = (typeof q === 'string') ? q : q.ja;
              return (
                <button key={i} onClick={function(){ send(label, backend); }} style={{ padding:"6px 14px", borderRadius:20, cursor:"pointer", background:curCat.bg, border:"1px solid " + curCat.border, color:curCat.color, fontSize:12, transition:"all 0.2s" }}>
                  {label}
                </button>
              );
            });
          })()}
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
            placeholder={ACK.getLang()==='kr' ? '자유롭게 질문할 수도 있어요…' : '自由に質問もできるンダよ…'}
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


// ── 専門家に相談タブ ──
const EXPERTS = [
  {
    id: 1, name: "紫苑 先生", title: "四柱推命 鑑定士", exp: "鑑定歴18年",
    spec: ["恋愛・結婚", "転職・起業", "人間関係"],
    rating: 4.9, reviews: 1240, emoji: "🔮",
    status: "online", nextSlot: "本日 21:00〜",
    bio: "命式の深部を読み解き、今あなたが取るべき行動を具体的に示します。壬水の命式を得意とする鑑定士です。",
  },
  {
    id: 2, name: "天照 先生", title: "四柱推命 × MBTI 専門家", exp: "鑑定歴12年",
    spec: ["MBTI統合鑑定", "恋愛相性", "才能開花"],
    rating: 4.8, reviews: 890, emoji: "🌟",
    status: "online", nextSlot: "本日 22:30〜",
    bio: "四柱推命とMBTIを統合したハイブリッド鑑定が得意。INFPの命式を深く理解しています。",
  },
  {
    id: 3, name: "玄武 先生", title: "命理 研究家", exp: "鑑定歴25年",
    spec: ["格局分析", "大運転換期", "仕事運"],
    rating: 5.0, reviews: 2100, emoji: "🌊",
    status: "busy", nextSlot: "明日 19:00〜",
    bio: "従旺格・従弱格などの特殊格局の専門家。水旺の命式をもつあなたの本質を徹底解説します。",
  },
];

const CONSULT_TYPES = [
  { id: "text",  icon: "💬", label: "テキスト相談", price: "¥2,000〜", desc: "24時間以内に返信" },
  { id: "voice", icon: "🎙️", label: "音声通話",     price: "¥4,000〜", desc: "30分・予約制" },
  { id: "video", icon: "🎥", label: "ビデオ通話",   price: "¥6,000〜", desc: "45分・予約制" },
  { id: "vip",   icon: "👑", label: "VIP月額",      price: "¥29,800/月", desc: "無制限相談" },
];

const MOCK_HISTORY = [
  {
    id: "ORD-2031", date: "2026年3月10日", expert: "紫苑 先生", type: "テキスト相談", emoji: "🔮",
    status: "返信済み", price: "¥2,000",
    question: "転職を考えています。今の大運・歳運から見て、来年動くのは吉でしょうか？",
    reply: "壬水日主で現在「乙未大運」の流れを読むと、2026年丙午の流年は火の気が強まり、忌神が重なる年となります。大きな転職より、今年は準備と情報収集に注力し、2027年（丁未）以降の動きに備えるのが命式的には吉です。喜神「金・水」の時期（秋〜冬）に具体的なアクションを取るとスムーズです。",
  },
  {
    id: "ORD-1988", date: "2026年2月14日", expert: "天照 先生", type: "ビデオ通話 45分", emoji: "🌟",
    status: "完了", price: "¥6,000",
    question: "今の彼との相性を詳しく見てもらいたいです。結婚を考えています。",
    reply: null,
  },
  {
    id: "ORD-1847", date: "2026年1月28日", expert: "玄武 先生", type: "テキスト相談", emoji: "🌊",
    status: "返信済み", price: "¥2,000",
    question: "今年の金運と、副業を始めるタイミングについて教えてください。",
    reply: "偏財が弱い命式ではありますが、食神が強く「才能を活かした収入」が向いています。副業は自分の得意分野・創造性を活かす方向が吉。2026年4〜5月（辰・巳月）に準備を始め、秋以降に本格的に動くと良いでしょう。",
  },
];

const AccountDropdown = ({ meishiki, acctOpen, setAcctOpen }) => {
  const _adLang = (typeof window !== 'undefined' && window.PF_LANG && window.PF_LANG.getLang) ? window.PF_LANG.getLang() : 'jp';
  const _isKr = _adLang === 'kr';
  const M = meishiki;
  const ui = M._ui || {};
  const saved = (() => { try { return JSON.parse(localStorage.getItem('pf_acct_info') || '{}'); } catch(e) { return {}; } })();
  const isGoogle = ui.loginType === 'google';
  const initialName = saved.displayName !== undefined ? saved.displayName : (ui.lastName || ui.firstName ? `${ui.lastName||''}${ui.firstName||''}` : '');
  const email = ui.email || '';
  const plan = saved.plan || ui.plan || 'free';
  const planName = plan === 'light' ? 'ライトプラン' : '無料プラン';
  const nextBilling = ui.nextBillingDate || '─';

  const [editName, setEditName] = React.useState(initialName);
  const [editEmail, setEditEmail] = React.useState(email);
  const [nameEdit, setNameEdit] = React.useState(false);
  const [emailEdit, setEmailEdit] = React.useState(false);
  const [pwEdit, setPwEdit] = React.useState(false);
  const [savedMsg, setSavedMsg] = React.useState(false);

  const InputStyle = { width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(201,168,76,0.3)', borderRadius:6, padding:'6px 10px', color:'rgba(232,228,217,0.9)', fontSize:13, fontFamily:"'Noto Sans JP',sans-serif", outline:'none', marginTop:4 };

  const saveName = () => {
    const s = (() => { try { return JSON.parse(localStorage.getItem('pf_acct_info') || '{}'); } catch(e) { return {}; } })();
    s.displayName = editName;
    localStorage.setItem('pf_acct_info', JSON.stringify(s));
    setNameEdit(false);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2000);
  };

  const EditBtn = ({ onClick, label="変更する" }) => (
    <button onClick={onClick} style={{ fontSize:10, color:'rgba(201,168,76,0.8)', background:'rgba(201,168,76,0.07)', border:'1px solid rgba(201,168,76,0.2)', borderRadius:6, padding:'3px 10px', cursor:'pointer', flexShrink:0 }}>{label}</button>
  );
  const SaveBtn = ({ onClick }) => (
    <button onClick={onClick} style={{ fontSize:10, color:'#fff', background:'rgba(201,168,76,0.7)', border:'none', borderRadius:6, padding:'4px 12px', cursor:'pointer', marginTop:6 }} data-i18n="保存する">保存する</button>
  );
  const CancelBtn = ({ onClick }) => (
    <button onClick={onClick} style={{ fontSize:10, color:'rgba(232,228,217,0.4)', background:'transparent', border:'1px solid rgba(255,255,255,0.1)', borderRadius:6, padding:'4px 10px', cursor:'pointer', marginTop:6, marginLeft:6 }} data-i18n="キャンセル">キャンセル</button>
  );

  return (
    <>
      {/* 登録情報 */}
      <div style={{ borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
        <div onClick={() => setAcctOpen(p => ({...p, info: !p.info}))}
          style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 18px", cursor:"pointer" }}
          onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.03)"}
          onMouseLeave={e => e.currentTarget.style.background="transparent"}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span>📋</span>
            <span style={{ fontSize:13, color:"rgba(232,228,217,0.85)", fontWeight:500 }} data-i18n="登録情報">登録情報</span>
          </div>
          <span style={{ fontSize:10, color:"rgba(201,168,76,0.6)", display:"inline-block", transform: acctOpen.info ? "rotate(180deg)" : "rotate(0deg)", transition:"transform 0.2s" }}>▼</span>
        </div>
        {acctOpen.info && (
          <div style={{ padding:"0 18px 14px", borderTop:"1px solid rgba(255,255,255,0.04)" }}>
            {savedMsg && <div style={{ padding:"6px 10px", background:"rgba(100,200,100,0.1)", border:"1px solid rgba(100,200,100,0.2)", borderRadius:6, marginBottom:8, fontSize:11, color:"rgba(100,200,100,0.9)" }}>✓ 保存しました</div>}
            {/* 登録名 */}
            <div style={{ padding:"10px 0", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <p style={{ fontSize:10, color:"rgba(232,228,217,0.3)" }} data-i18n="登録名">登録名</p>
                {!nameEdit && <EditBtn onClick={() => setNameEdit(true)} />}
              </div>
              {nameEdit ? (
                <div>
                  <input value={editName} onChange={e => setEditName(e.target.value)} style={InputStyle} placeholder="登録名を入力" />
                  <div style={{ display:"flex" }}><SaveBtn onClick={saveName} /><CancelBtn onClick={() => { setEditName(initialName); setNameEdit(false); }} /></div>
                </div>
              ) : <p style={{ fontSize:13, color:"rgba(232,228,217,0.7)", marginTop:3 }}>{editName || '未設定'}</p>}
            </div>
            {/* メールアドレス */}
            <div style={{ padding:"10px 0", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <p style={{ fontSize:10, color:"rgba(232,228,217,0.3)" }} data-i18n="メールアドレス">メールアドレス</p>
                {!isGoogle && !emailEdit && <EditBtn onClick={() => setEmailEdit(true)} label="変更する" />}
              </div>
              {emailEdit ? (
                <div>
                  <input value={editEmail} onChange={e => setEditEmail(e.target.value)} style={InputStyle} placeholder={_isKr ? '새 이메일 주소' : '新しいメールアドレス'} type="email" />
                  <p style={{ fontSize:10, color:"rgba(232,228,217,0.3)", marginTop:4 }}>※バックエンド接続後に有効化されます</p>
                  <div style={{ display:"flex" }}>
                    <button onClick={() => { alert('メールアドレス変更はバックエンド接続後に有効化されます🐼'); setEmailEdit(false); }} style={{ fontSize:10, color:'#fff', background:'rgba(201,168,76,0.7)', border:'none', borderRadius:6, padding:'4px 12px', cursor:'pointer', marginTop:6 }} data-i18n="変更申請">変更申請</button>
                    <CancelBtn onClick={() => { setEditEmail(email); setEmailEdit(false); }} />
                  </div>
                </div>
              ) : <p style={{ fontSize:13, color:"rgba(232,228,217,0.7)", marginTop:3 }}>{editEmail || '未設定'}</p>}
              {isGoogle && <p style={{ fontSize:11, color:"rgba(232,228,217,0.3)", marginTop:4 }}>🔗 Googleアカウントで管理されています</p>}
            </div>
            {/* パスワード */}
            {isGoogle ? (
              <div style={{ padding:"10px 0" }}>
                <p style={{ fontSize:10, color:"rgba(232,228,217,0.3)" }} data-i18n="ログイン方法">ログイン方法</p>
                <p style={{ fontSize:13, color:"rgba(232,228,217,0.6)", marginTop:3 }}>🔗 Googleアカウントでログイン中</p>
                <p style={{ fontSize:11, color:"rgba(232,228,217,0.3)", marginTop:4 }}>パスワードの変更はGoogle設定から行ってください</p>
              </div>
            ) : (
              <div style={{ padding:"10px 0" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <p style={{ fontSize:10, color:"rgba(232,228,217,0.3)" }} data-i18n="パスワード">パスワード</p>
                  {!pwEdit && <EditBtn onClick={() => setPwEdit(true)} />}
                </div>
                {pwEdit ? (
                  <div>
                    <input type="password" placeholder={_isKr ? '현재 비밀번호' : '現在のパスワード'} style={{...InputStyle, marginBottom:4}} />
                    <input type="password" placeholder={_isKr ? '새 비밀번호' : '新しいパスワード'} style={InputStyle} />
                    <p style={{ fontSize:10, color:"rgba(232,228,217,0.3)", marginTop:4 }}>※バックエンド接続後に有効化されます</p>
                    <div style={{ display:"flex" }}>
                      <button onClick={() => { alert('パスワード変更はバックエンド接続後に有効化されます🐼'); setPwEdit(false); }} style={{ fontSize:10, color:'#fff', background:'rgba(201,168,76,0.7)', border:'none', borderRadius:6, padding:'4px 12px', cursor:'pointer', marginTop:6 }} data-i18n="変更申請">変更申請</button>
                      <CancelBtn onClick={() => setPwEdit(false)} />
                    </div>
                  </div>
                ) : <p style={{ fontSize:13, color:"rgba(232,228,217,0.7)", marginTop:3 }}>••••••••••••</p>}
              </div>
            )}
          </div>
        )}
      </div>
      {/* 加入プラン */}
      <div>
        <div onClick={() => setAcctOpen(p => ({...p, plan: !p.plan}))}
          style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 18px", cursor:"pointer" }}
          onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.03)"}
          onMouseLeave={e => e.currentTarget.style.background="transparent"}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span>💳</span>
            <span style={{ fontSize:13, color:"rgba(232,228,217,0.85)", fontWeight:500 }} data-i18n="加入プラン">加入プラン</span>
          </div>
          <span style={{ fontSize:10, color:"rgba(201,168,76,0.6)", display:"inline-block", transform: acctOpen.plan ? "rotate(180deg)" : "rotate(0deg)", transition:"transform 0.2s" }}>▼</span>
        </div>
        {acctOpen.plan && (
          <div style={{ padding:"0 18px 16px", borderTop:"1px solid rgba(255,255,255,0.04)" }}>
            <div style={{ padding:"10px 0", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
              <p style={{ fontSize:10, color:"rgba(232,228,217,0.3)" }} data-i18n="プラン名">プラン名</p>
              <p style={{ fontSize:13, color:"rgba(232,228,217,0.7)", marginTop:3 }}>{planName}</p>
            </div>
            <div style={{ padding:"10px 0", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
              <p style={{ fontSize:10, color:"rgba(232,228,217,0.3)" }} data-i18n="次回請求日">次回請求日</p>
              <p style={{ fontSize:13, color:"rgba(232,228,217,0.7)", marginTop:3 }}>{nextBilling}</p>
            </div>
            <div style={{ paddingTop:14, textAlign:"center" }}>
              <button onClick={() => { if(window.confirm(_isKr ? '플랜을 해약하시겠습니까?\n해약 후에는 다음 갱신일부터 청구가 정지됩니다.' : 'プランを解約しますか？\n解約後は次の更新日から請求が停止されます。')) { alert(_isKr ? 'Stripe 고객 포털로 연결 (백엔드 연결 후 활성화)🐼' : 'Stripeカスタマーポータルへ接続（バックエンド接続後に有効化）🐼'); } }}
                style={{ fontSize:12, color:"rgba(220,100,90,0.9)", background:"rgba(180,50,40,0.08)", border:"1px solid rgba(180,50,40,0.25)", borderRadius:8, padding:"8px 20px", cursor:"pointer", width:"100%" }}>
                プランを解約する
              </button>
              <p style={{ fontSize:10, color:"rgba(232,228,217,0.25)", marginTop:8, lineHeight:1.6 }}>解約後も次の更新日まではご利用いただけます。<br/>解約月の日割り返金は行っておりません。</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

const ExpertTab = ({ meishiki }) => {
  const M = meishiki;
  const [view, setView]                     = useState("new");
  const [selectedExpert, setSelectedExpert] = useState(null);
  const [selectedType, setSelectedType]     = useState(null);
  const [message, setMessage]               = useState("");
  const [sent, setSent]                     = useState(false);
  const [expandedOrder, setExpandedOrder]   = useState(null);
  const [popoMsg, setPopoMsg]               = useState(false); // 先生クリック時のポポメッセージ表示

  const expert = EXPERTS.find(function(e){ return e.id === selectedExpert; });
  const consultType = CONSULT_TYPES.find(function(t){ return t.id === selectedType; });

  // 先生を選んだときの吹き出しメッセージ（Coming Soon用）
  const POPO_WAIT_MSGS = [
    "少し待ってなンダ🐼 今、いい先生を探しているところンダよ。もうすぐ会えるんダ！",
    "ポポが全力で準備してるんダ🐼 もう少しだけ待ってほしいンダよ。",
    "この機能、もうすぐ解放されるンダ🐼 楽しみにしてほしいんダよ！",
    "今は準備中なんダ🐼 完成したら絶対に喜んでもらえる内容を用意してるンダよ。",
  ];
  const waitMsg = React.useMemo(() => POPO_WAIT_MSGS[Math.floor(Math.random() * POPO_WAIT_MSGS.length)], []);

  // ポポメッセージモーダル
  if (popoMsg) {
    return (
      <div className="tab-content" style={{ display:"flex", flexDirection:"column", gap:20 }}>
        <Card glow>
          <div style={{ textAlign:"center", padding:"32px 16px" }}>
            <div style={{ fontSize:52, marginBottom:16 }}><PandaIcon size={56} /></div>
            <p style={{ fontFamily:"'Shippori Mincho',serif", fontSize:18, color:C.gold, marginBottom:16, lineHeight:1.7 }}>{waitMsg}</p>
            <button
              onClick={() => { setPopoMsg(false); setSelectedExpert(null); }}
              style={{ padding:"9px 28px", borderRadius:12, background:"rgba(201,168,76,0.12)", border:"1px solid rgba(201,168,76,0.35)", color:C.gold, cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"'Shippori Mincho',serif" }}
            >わかったンダ</button>
          </div>
        </Card>
      </div>
    );
  }

  const StepBadge = function({ num, active, done }) {
    return (
      <div style={{ width:28, height:28, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, flexShrink:0,
        background: done ? "rgba(201,168,76,0.9)" : active ? "rgba(201,168,76,0.2)" : "rgba(255,255,255,0.06)",
        border: done ? "none" : active ? "1px solid rgba(201,168,76,0.6)" : "1px solid rgba(255,255,255,0.1)",
        color: done ? "#1a0d02" : active ? C.gold : C.textMuted,
      }}>
        {done ? "✓" : num}
      </div>
    );
  };

  const StepConnector = function({ done }) {
    return <div style={{ width:2, height:20, background: done ? "rgba(201,168,76,0.5)" : "rgba(255,255,255,0.07)", margin:"4px auto" }} />;
  };

  const STATUS_COLOR = { "返信済み":"rgba(100,200,100,0.9)", "完了":"rgba(150,150,255,0.8)", "対応中":"rgba(255,180,60,0.9)", "キャンセル":"rgba(180,80,80,0.7)" };
  const STATUS_BG    = { "返信済み":"rgba(100,200,100,0.08)", "完了":"rgba(150,150,255,0.06)", "対応中":"rgba(255,180,60,0.08)", "キャンセル":"rgba(180,80,80,0.07)" };

  if (sent) {
    return (
      <div className="tab-content" style={{ display:"flex", flexDirection:"column", gap:20 }}>
        <Card glow>
          <div style={{ textAlign:"center", padding:"24px 0" }}>
            <PandaIcon size={48} />
            <p style={{ fontFamily:"'Shippori Mincho',serif", fontSize:20, color:C.gold, marginBottom:10, marginTop:16 }}>送信完了ンダ！</p>
            <p style={{ fontSize:13, color:C.textSub, lineHeight:1.9 }}>
              {expert ? expert.name : "鑑定士"}があなたの命式を確認して返信するんダよ。<br/>
              通知が来たら確認してほしいんダ🐼
            </p>
            <div style={{ display:"flex", gap:10, justifyContent:"center", marginTop:20 }}>
              <button onClick={function(){ setSent(false); setMessage(""); setSelectedExpert(null); setSelectedType(null); }} style={{ padding:"8px 20px", borderRadius:10, background:"transparent", border:"1px solid rgba(201,168,76,0.3)", color:C.goldDim, cursor:"pointer", fontSize:12 }}>
                新しく相談する
              </button>
              <button onClick={function(){ setSent(false); setView("history"); }} style={{ padding:"8px 20px", borderRadius:10, background:"rgba(201,168,76,0.1)", border:"1px solid rgba(201,168,76,0.3)", color:C.gold, cursor:"pointer", fontSize:12, fontWeight:600 }}>
                依頼履歴を見る
              </button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="tab-content" style={{ display:"flex", flexDirection:"column", gap:16 }}>

      {/* Coming Soon バナー */}
      <div style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 18px", borderRadius:14,
        background:"linear-gradient(135deg, rgba(90,74,138,0.18), rgba(138,112,192,0.12))",
        border:"1px solid rgba(138,112,192,0.35)" }}>
        <div style={{ fontSize:30, flexShrink:0 }}><PandaIcon size={36} /></div>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
            <span style={{ fontFamily:"'Shippori Mincho',serif", fontSize:14, fontWeight:700, color:"rgba(180,160,220,0.95)" }}>専門家に相談</span>
            <span style={{ fontSize:9, fontWeight:800, padding:"2px 9px", borderRadius:10, letterSpacing:"0.06em",
              background:"linear-gradient(135deg,#5a4a8a,#8a70c0)", color:"#fff" }}>COMING SOON</span>
          </div>
          <p style={{ fontSize:12, color:"rgba(200,185,240,0.7)", lineHeight:1.7, fontFamily:"'Shippori Mincho',serif" }}>
            今、腕利きの鑑定士たちを集めているんダ🐼 もう少し待っててほしいんダよ。
          </p>
        </div>
      </div>

      {/* 切り替えタブ */}
      <div style={{ display:"flex", gap:4, background:"rgba(255,255,255,0.03)", borderRadius:12, padding:4 }}>
        {[{ key:"new", label:"新規相談", icon:"✏️" }, { key:"history", label:"依頼履歴", icon:"📋" }].map(function(tab){
          var isActive = view === tab.key;
          return (
            <button key={tab.key} onClick={function(){ setView(tab.key); }}
              style={{ flex:1, padding:"9px 0", borderRadius:8, border:"none", cursor:"pointer", fontSize:13, fontWeight: isActive ? 700 : 400, fontFamily:"'Shippori Mincho',serif", transition:"all 0.2s",
                background: isActive ? "rgba(201,168,76,0.15)" : "transparent",
                color: isActive ? C.gold : C.textMuted,
              }}>
              {tab.icon} {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── 履歴ビュー ── */}
      {view === "history" && (
        <React.Fragment>
          <Card>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
              <p style={{ fontFamily:"'Shippori Mincho',serif", fontSize:16, fontWeight:700, color:C.text }} data-i18n="依頼・注文履歴">依頼・注文履歴</p>
              <span style={{ fontSize:11, color:C.textMuted }}>{MOCK_HISTORY.length}件</span>
            </div>
            <p style={{ fontSize:11, color:C.textMuted, marginBottom:20 }}>過去の相談内容・返信・お支払いを確認できますンダ</p>

            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {MOCK_HISTORY.map(function(order){
                var isExpanded = expandedOrder === order.id;
                return (
                  <div key={order.id} style={{ borderRadius:12, border:"1px solid rgba(255,255,255,0.07)", overflow:"hidden", transition:"all 0.2s" }}>
                    {/* ヘッダー行 */}
                    <div onClick={function(){ setExpandedOrder(isExpanded ? null : order.id); }}
                      style={{ padding:"14px 16px", cursor:"pointer", display:"flex", alignItems:"center", gap:12,
                        background: isExpanded ? "rgba(201,168,76,0.05)" : "rgba(255,255,255,0.02)",
                      }}>
                      {/* 先生アイコン */}
                      <div style={{ width:38, height:38, borderRadius:"50%", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>
                        {order.emoji}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3, flexWrap:"wrap" }}>
                          <span style={{ fontFamily:"'Shippori Mincho',serif", fontSize:14, fontWeight:700, color:C.text }}>{order.expert}</span>
                          <span style={{ fontSize:10, padding:"2px 8px", borderRadius:20, background: STATUS_BG[order.status]||"rgba(255,255,255,0.05)", color: STATUS_COLOR[order.status]||C.textMuted, fontWeight:600 }}>{order.status}</span>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                          <span style={{ fontSize:11, color:C.textMuted }}>{order.type}</span>
                          <span style={{ fontSize:11, color:C.textMuted }}>·</span>
                          <span style={{ fontSize:11, color:C.goldDim }}>{order.price}</span>
                          <span style={{ fontSize:11, color:C.textMuted }}>·</span>
                          <span style={{ fontSize:11, color:C.textMuted }}>{order.date}</span>
                        </div>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
                        <span style={{ fontSize:11, color:C.textMuted }}>#{order.id}</span>
                        <span style={{ fontSize:12, color:C.textMuted, transition:"transform 0.2s", display:"inline-block", transform: isExpanded ? "rotate(180deg)" : "rotate(0)" }}>▼</span>
                      </div>
                    </div>

                    {/* 展開エリア */}
                    {isExpanded && (
                      <div style={{ padding:"0 16px 16px", background:"rgba(255,255,255,0.01)", animation:"fadeUp 0.2s ease both" }}>
                        <div style={{ height:1, background:"rgba(255,255,255,0.06)", marginBottom:14 }} />
                        <p style={{ fontSize:10, letterSpacing:"0.15em", color:C.goldDim, marginBottom:8 }}>相談内容</p>
                        <div style={{ padding:"12px 14px", borderRadius:10, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", fontSize:13, color:C.textSub, lineHeight:1.85, marginBottom: order.reply ? 14 : 0, fontFamily:"'Shippori Mincho',serif" }}>
                          {order.question}
                        </div>
                        {order.reply && (
                          <React.Fragment>
                            <p style={{ fontSize:10, letterSpacing:"0.15em", color:"rgba(100,200,100,0.7)", marginBottom:8 }}>{order.expert}からの返信</p>
                            <div style={{ padding:"12px 14px", borderRadius:10, background:"rgba(100,200,100,0.04)", border:"1px solid rgba(100,200,100,0.15)", fontSize:13, color:C.textSub, lineHeight:1.9, fontFamily:"'Shippori Mincho',serif" }}>
                              {order.reply}
                            </div>
                          </React.Fragment>
                        )}
                        {!order.reply && order.status === "完了" && (
                          <p style={{ fontSize:12, color:C.textMuted, textAlign:"center", paddingTop:8 }}>通話形式のため返信テキストはありませんンダ</p>
                        )}
                        <div style={{ display:"flex", justifyContent:"flex-end", marginTop:14, gap:8 }}>
                          <button style={{ padding:"6px 14px", borderRadius:8, background:"transparent", border:"1px solid rgba(201,168,76,0.2)", color:C.goldDim, cursor:"pointer", fontSize:11 }}
                            onClick={function(){ setView("new"); }}>
                            同じ先生に再相談
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </React.Fragment>
      )}

      {/* ── 新規相談ビュー ── */}
      {view === "new" && (
        <React.Fragment>

      {/* ステップ進捗インジケーター */}
      <Card>
        <div style={{ display:"flex", alignItems:"center", gap:0, justifyContent:"center" }}>
          {[
            { num:1, label:"鑑定士を選ぶ",    done: selectedExpert !== null, active: selectedExpert === null },
            { num:2, label:"相談形式を選ぶ",   done: selectedType !== null,   active: selectedExpert !== null && selectedType === null },
            { num:3, label:"相談内容を入力",   done: false,                   active: selectedExpert !== null && selectedType !== null },
          ].map(function(step, i) {
            return (
              <React.Fragment key={i}>
                {i > 0 && (
                  <div style={{ flex:1, height:2, background: (i === 1 && selectedExpert !== null) || (i === 2 && selectedType !== null) ? "rgba(201,168,76,0.5)" : "rgba(255,255,255,0.07)", margin:"0 8px" }} />
                )}
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                  <StepBadge num={step.num} active={step.active} done={step.done} />
                  <span style={{ fontSize:10, color: step.done ? C.gold : step.active ? C.textSub : C.textMuted, letterSpacing:"0.05em", whiteSpace:"nowrap" }}>{step.label}</span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </Card>

      {/* STEP 1: 鑑定士を選ぶ */}
      <Card>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
          <StepBadge num={1} active={selectedExpert === null} done={selectedExpert !== null} />
          <p style={{ fontFamily:"'Shippori Mincho',serif", fontSize:15, fontWeight:700, color: selectedExpert !== null ? C.gold : C.text }}>
            鑑定士を選ぶ
          </p>
          {selectedExpert !== null && expert && (
            <span style={{ fontSize:12, color:C.goldDim, marginLeft:4 }}>→ {expert.name}</span>
          )}
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {EXPERTS.map(function(ex) {
            var isSelected = selectedExpert === ex.id;
            return (
              <div key={ex.id} onClick={function(){ setSelectedExpert(ex.id); setPopoMsg(true); }}
                style={{ padding:"14px 16px", borderRadius:12, cursor:"pointer", transition:"all 0.2s",
                  background: isSelected ? "rgba(201,168,76,0.08)" : "rgba(255,255,255,0.02)",
                  border:"1px solid " + (isSelected ? C.borderHover : "rgba(255,255,255,0.07)"),
                }}>
                <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                  <div style={{ width:48, height:48, borderRadius:"50%", flexShrink:0,
                    background: isSelected ? "rgba(201,168,76,0.15)" : "rgba(255,255,255,0.04)",
                    border:"2px solid " + (isSelected ? C.gold : "rgba(255,255,255,0.1)"),
                    display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, position:"relative",
                  }}>
                    {ex.emoji}
                    <span style={{ position:"absolute", bottom:1, right:1, width:10, height:10, borderRadius:"50%",
                      background: ex.status === "online" ? "#4caf50" : "#ff9800", border:"2px solid #0e0608" }} />
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                      <span style={{ fontFamily:"'Shippori Mincho',serif", fontSize:15, fontWeight:700, color: isSelected ? C.gold : C.text }}>{ex.name}</span>
                      <span style={{ fontSize:10, color: ex.status === "online" ? "#4caf50" : "#ff9800" }}>● {ex.status === "online" ? "受付中" : "対応中"}</span>
                    </div>
                    <p style={{ fontSize:11, color:C.textMuted, marginBottom:6 }}>{ex.title} · {ex.exp}</p>
                    <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:6 }}>
                      {ex.spec.map(function(s, i){ return <span key={i} style={{ fontSize:10, padding:"2px 8px", borderRadius:20, background:"rgba(201,168,76,0.07)", border:"1px solid rgba(201,168,76,0.18)", color:C.goldDim }}>{s}</span>; })}
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ color:"#f0c040", fontSize:12 }}>★</span>
                      <span style={{ fontSize:12, color:C.gold, fontWeight:600 }}>{ex.rating}</span>
                      <span style={{ fontSize:11, color:C.textMuted }}>({ex.reviews.toLocaleString()}件)</span>
                      <span style={{ fontSize:11, color:C.textMuted }}>次の空き: <span style={{ color:C.textSub }}>{ex.nextSlot}</span></span>
                    </div>
                  </div>
                  <div style={{ width:22, height:22, borderRadius:"50%", border:"2px solid " + (isSelected ? C.gold : "rgba(255,255,255,0.15)"), display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    {isSelected && <div style={{ width:10, height:10, borderRadius:"50%", background:C.gold }} />}
                  </div>
                </div>
                {isSelected && (
                  <p style={{ fontSize:12, color:C.textSub, lineHeight:1.8, marginTop:12, paddingTop:12, borderTop:"1px solid rgba(255,255,255,0.06)" }}>{ex.bio}</p>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* STEP 2: 相談形式を選ぶ */}
      <Card style={{ opacity: selectedExpert ? 1 : 0.45, pointerEvents: selectedExpert ? "auto" : "none", transition:"opacity 0.3s" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
          <StepBadge num={2} active={selectedExpert !== null && selectedType === null} done={selectedType !== null} />
          <p style={{ fontFamily:"'Shippori Mincho',serif", fontSize:15, fontWeight:700, color: selectedType !== null ? C.gold : selectedExpert ? C.text : C.textMuted }}>
            相談形式を選ぶ
          </p>
          {selectedType !== null && consultType && (
            <span style={{ fontSize:12, color:C.goldDim, marginLeft:4 }}>→ {consultType.label}</span>
          )}
          {!selectedExpert && <span style={{ fontSize:11, color:C.textMuted, marginLeft:4 }}>（先に鑑定士を選んでください）</span>}
        </div>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          {CONSULT_TYPES.map(function(t) {
            var isSelected = selectedType === t.id;
            return (
              <div key={t.id} onClick={function(){ setSelectedType(isSelected ? null : t.id); }}
                style={{ flex:"1 1 120px", padding:"14px 12px", borderRadius:12, cursor:"pointer", textAlign:"center", transition:"all 0.2s",
                  background: isSelected ? "rgba(201,168,76,0.12)" : "rgba(255,255,255,0.02)",
                  border:"1px solid " + (isSelected ? C.borderHover : "rgba(255,255,255,0.07)"),
                }}>
                <p style={{ fontSize:22, marginBottom:6 }}>{t.icon}</p>
                <p style={{ fontFamily:"'Shippori Mincho',serif", fontSize:13, color: isSelected ? C.gold : C.textSub, fontWeight:600, marginBottom:3 }}>{t.label}</p>
                <p style={{ fontSize:13, color: isSelected ? C.gold : C.textMuted, fontWeight:500, marginBottom:3 }}>{t.price}</p>
                <p style={{ fontSize:10, color:C.textMuted }}>{t.desc}</p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* STEP 3: 相談内容を入力 */}
      <Card style={{ opacity: (selectedExpert && selectedType) ? 1 : 0.45, pointerEvents: (selectedExpert && selectedType) ? "auto" : "none", transition:"opacity 0.3s" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
          <StepBadge num={3} active={selectedExpert !== null && selectedType !== null} done={false} />
          <p style={{ fontFamily:"'Shippori Mincho',serif", fontSize:15, fontWeight:700, color: (selectedExpert && selectedType) ? C.text : C.textMuted }}>
            相談内容を入力
          </p>
          {(!selectedExpert || !selectedType) && <span style={{ fontSize:11, color:C.textMuted, marginLeft:4 }}>（鑑定士と形式を選んでください）</span>}
        </div>
        {selectedExpert && selectedType && (
          <div style={{ padding:"10px 14px", borderRadius:10, background:"rgba(201,168,76,0.05)", border:"1px solid rgba(201,168,76,0.15)", marginBottom:14, display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
            <span style={{ fontSize:12, color:C.goldDim }}>{expert ? expert.emoji + " " + expert.name : ""}</span>
            <span style={{ fontSize:11, color:"rgba(255,255,255,0.2)" }}>×</span>
            <span style={{ fontSize:12, color:C.goldDim }}>{consultType ? consultType.icon + " " + consultType.label + "（" + consultType.price + "）" : ""}</span>
          </div>
        )}
        <textarea
          value={message}
          onChange={function(e){ setMessage(e.target.value); }}
          placeholder="例：転職を考えています。今の大運・歳運から見て、来年動くのは吉でしょうか？具体的な時期や注意点も教えてください。"
          rows={4}
          style={{ width:"100%", padding:"14px 16px", borderRadius:12, background:"rgba(255,255,255,0.03)", border:"1px solid " + C.border, color:C.text, fontSize:13, resize:"vertical", outline:"none", lineHeight:1.8, marginBottom:14 }}
        />
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
          <p style={{ fontSize:11, color:C.textMuted }}>
            命式データ（{M.nichi.kan}{M.nichi.shi}日主・{M._calc.currentDaiun ? M._calc.currentDaiun.kan + M._calc.currentDaiun.shi + "大運" : "大運"}）が自動添付されますンダ
          </p>
          <button
            onClick={function(){ if(message.trim()) setSent(true); }}
            disabled={!message.trim()}
            style={{ padding:"11px 28px", borderRadius:10, cursor: message.trim() ? "pointer" : "default",
              background: message.trim() ? "linear-gradient(135deg,#b8922a,#C9A84C)" : "rgba(255,255,255,0.05)",
              border:"none", color: message.trim() ? "#1a0d02" : C.textMuted,
              fontFamily:"'Shippori Mincho',serif", fontSize:14, fontWeight:700, transition:"all 0.2s",
            }}
          >
            送信する
          </button>
        </div>
      </Card>
        </React.Fragment>
      )}
    </div>
  );
};

// ── ポポ吹き出し ──
// ── カスタムパンダアイコン（白×薄茶色）────────────────────────
const PANDA_SVG_INLINE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="1em" height="1em" style="vertical-align:-0.15em;display:inline-block;">
  <!-- 耳（薄茶色） -->
  <circle cx="10" cy="11" r="6" fill="#C4956A"/>
  <circle cx="30" cy="11" r="6" fill="#C4956A"/>
  <!-- 耳の内側（薄め） -->
  <circle cx="10" cy="11" r="3.5" fill="#E8C49A"/>
  <circle cx="30" cy="11" r="3.5" fill="#E8C49A"/>
  <!-- 顔（オフホワイト） -->
  <circle cx="20" cy="21" r="15" fill="#F7F3EE"/>
  <circle cx="20" cy="21" r="15" fill="none" stroke="#E8DDD0" stroke-width="0.5"/>
  <!-- 目パッチ（薄茶色） -->
  <ellipse cx="14" cy="18" rx="4.5" ry="4" fill="#C4956A"/>
  <ellipse cx="26" cy="18" rx="4.5" ry="4" fill="#C4956A"/>
  <!-- 目（ダークブラウン） -->
  <circle cx="14" cy="18" r="2.2" fill="#3D2B1F"/>
  <circle cx="26" cy="18" r="2.2" fill="#3D2B1F"/>
  <!-- 目のハイライト -->
  <circle cx="15" cy="17" r="0.8" fill="white"/>
  <circle cx="27" cy="17" r="0.8" fill="white"/>
  <!-- 鼻 -->
  <ellipse cx="20" cy="23.5" rx="2.5" ry="1.8" fill="#A0705A"/>
  <!-- 口 -->
  <path d="M17.5 25.5 Q20 27.5 22.5 25.5" stroke="#A0705A" stroke-width="1" fill="none" stroke-linecap="round"/>
  <!-- ほっぺ -->
  <circle cx="12" cy="25" r="3" fill="#E8B4A0" opacity="0.4"/>
  <circle cx="28" cy="25" r="3" fill="#E8B4A0" opacity="0.4"/>
</svg>`;

const PandaIcon = ({ size = 28 }) => (
  <span
    style={{ display:"inline-block", width:size, height:size, flexShrink:0, lineHeight:1 }}
    dangerouslySetInnerHTML={{ __html: PANDA_SVG_INLINE.replace('width="1em" height="1em"', 'width="' + size + '" height="' + size + '"') }}
  />
);

const PANDA_IMG_HTML = '<img src="data:image/svg+xml,%3Csvg xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22 viewBox%3D%220 0 40 40%22%3E%3Ccircle cx%3D%2210%22 cy%3D%2211%22 r%3D%226%22 fill%3D%22%23C4956A%22%2F%3E%3Ccircle cx%3D%2230%22 cy%3D%2211%22 r%3D%226%22 fill%3D%22%23C4956A%22%2F%3E%3Ccircle cx%3D%2210%22 cy%3D%2211%22 r%3D%223.5%22 fill%3D%22%23E8C49A%22%2F%3E%3Ccircle cx%3D%2230%22 cy%3D%2211%22 r%3D%223.5%22 fill%3D%22%23E8C49A%22%2F%3E%3Ccircle cx%3D%2220%22 cy%3D%2221%22 r%3D%2215%22 fill%3D%22%23F7F3EE%22%2F%3E%3Cellipse cx%3D%2214%22 cy%3D%2218%22 rx%3D%224.5%22 ry%3D%224%22 fill%3D%22%23C4956A%22%2F%3E%3Cellipse cx%3D%2226%22 cy%3D%2218%22 rx%3D%224.5%22 ry%3D%224%22 fill%3D%22%23C4956A%22%2F%3E%3Ccircle cx%3D%2214%22 cy%3D%2218%22 r%3D%222.2%22 fill%3D%22%233D2B1F%22%2F%3E%3Ccircle cx%3D%2226%22 cy%3D%2218%22 r%3D%222.2%22 fill%3D%22%233D2B1F%22%2F%3E%3Ccircle cx%3D%2215%22 cy%3D%2217%22 r%3D%220.8%22 fill%3D%22white%22%2F%3E%3Ccircle cx%3D%2227%22 cy%3D%2217%22 r%3D%220.8%22 fill%3D%22white%22%2F%3E%3Cellipse cx%3D%2220%22 cy%3D%2223.5%22 rx%3D%222.5%22 ry%3D%221.8%22 fill%3D%22%23A0705A%22%2F%3E%3Cpath d%3D%22M17.5 25.5 Q20 27.5 22.5 25.5%22 stroke%3D%22%23A0705A%22 stroke-width%3D%221%22 fill%3D%22none%22%2F%3E%3C%2Fsvg%3E" width="18" height="18" style="vertical-align:-0.1em;display:inline-block" alt=""/>';
const PopoSpeech = ({ text, delay = 0 }) => {
  // キーワードを白太字で強調
  const html = ((text || "").replace(/🐼/g, PANDA_IMG_HTML));
  return (
    <div style={{
      display: "flex", gap: 14, alignItems: "flex-start",
      background: "rgba(201,168,76,0.04)",
      border: "1px solid rgba(201,168,76,0.12)",
      borderRadius: 14, padding: "16px 18px",
      animation: "fadeUp 0.6s " + delay + "s ease both",
    }}>
      <PandaIcon size={32} />
      <p style={{
        fontFamily: "'Shippori Mincho', serif",
        fontSize: 15, lineHeight: 1.9, color: C.textSub, fontWeight: 400,
      }} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
};

// ── 命式変更モーダル ──────────────────────────────────────────
const MBTI_LIST = MBTI_TYPES_32; // 32通り統一
const HOUR_OPTIONS = [
  { label: "わからない", value: -1 },
  { label: "子の刻（23:00-01:00）", value: 0 },
  { label: "丑の刻（01:00-03:00）", value: 2 },
  { label: "寅の刻（03:00-05:00）", value: 4 },
  { label: "卯の刻（05:00-07:00）", value: 6 },
  { label: "辰の刻（07:00-09:00）", value: 8 },
  { label: "巳の刻（09:00-11:00）", value: 10 },
  { label: "午の刻（11:00-13:00）", value: 12 },
  { label: "未の刻（13:00-15:00）", value: 14 },
  { label: "申の刻（15:00-17:00）", value: 16 },
  { label: "酉の刻（17:00-19:00）", value: 18 },
  { label: "戌の刻（19:00-21:00）", value: 20 },
  { label: "亥の刻（21:00-23:00）", value: 22 },
];
const PLACE_LIST = Object.keys(window._PLACE_LON || {});

const inputStyle = {
  width: "100%", padding: "10px 14px", borderRadius: 10,
  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.25)",
  color: "#f0e6d0", fontSize: 13, outline: "none", fontFamily: "'Noto Sans JP',sans-serif",
};
const selectStyle = {
  ...inputStyle, background: "rgba(20,8,6,0.97)",
};
const labelStyle = { fontSize: 11, color: "rgba(240,230,208,0.45)", display: "block", marginBottom: 6 };

const EditModal = ({ initialUi, onSave, onClose }) => {
  const [form, setForm] = useState({
    lastName:  initialUi.lastName  || '',
    firstName: initialUi.firstName || '',
    year:      String(initialUi.year  || 1990),
    month:     String(initialUi.month || 1),
    day:       String(initialUi.day   || 1),
    hourInput: initialUi.hourInput !== undefined ? initialUi.hourInput : -1,
    gender:    initialUi.gender    || 'f',
    placeName: initialUi.placeName || '東京都',
    placeQuery: initialUi.placeName || '東京都',
    geoStatus: '',  // '' | 'loading' | 'ok' | 'error'
    mbti:      initialUi.mbti      || 'わからない',
  });

  const f = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleGeoSearch = async () => {
    if (!form.placeQuery.trim()) return;
    f('geoStatus', 'loading');
    try {
      const q = encodeURIComponent(form.placeQuery.trim());
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`, {
        headers: { 'Accept-Language': 'ja,en' }
      });
      const data = await res.json();
      if (data && data[0]) {
        const lon = parseFloat(data[0].lon);
        f('resolvedLon', lon);
        f('placeName', form.placeQuery.trim());
        f('geoStatus', 'ok');
      } else {
        f('geoStatus', 'error');
      }
    } catch(e) {
      f('geoStatus', 'error');
    }
  };

  const isValid = form.year && form.month && form.day
    && parseInt(form.year) >= 1900 && parseInt(form.year) <= new Date().getFullYear()
    && parseInt(form.month) >= 1 && parseInt(form.month) <= 12
    && parseInt(form.day) >= 1 && parseInt(form.day) <= 31;

  const handleSave = () => {
    if (!isValid) return;
    // 経度: Nominatim で取得済みなら使用、なければ都道府県マップ→デフォルト135
    const resolvedLon = form.resolvedLon !== undefined
      ? form.resolvedLon
      : ((window._PLACE_LON || {})[form.placeName] || 135);
    const newUi = {
      year:      parseInt(form.year),
      month:     parseInt(form.month),
      day:       parseInt(form.day),
      hourInput: Number(form.hourInput),
      gender:    form.gender,
      longitude: resolvedLon,
      mbti:      form.mbti,
      placeName: form.placeQuery || form.placeName,
      lastName:  form.lastName,
      firstName: form.firstName,
    };
    try { sessionStorage.setItem('fortune_input', JSON.stringify(newUi)); } catch(e) {}
    onSave(newUi);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(10,5,8,0.85)", backdropFilter: "blur(10px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px", overflowY: "auto",
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "linear-gradient(160deg,#1c0d0b 0%,#150909 100%)",
        border: "1px solid rgba(201,168,76,0.35)",
        borderRadius: 20, padding: "32px 28px", width: "100%", maxWidth: 500,
        boxShadow: "0 0 60px rgba(201,168,76,0.1), 0 8px 40px rgba(0,0,0,0.7)",
        animation: "fadeUp 0.3s ease both",
        position: "relative",
      }}>
        {/* 上部ライン */}
        <div style={{ position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(to right,transparent,rgba(201,168,76,0.5),transparent)",borderRadius:"20px 20px 0 0" }} />

        {/* ヘッダー */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:28 }}>
          <div>
            <p style={{ fontSize:10, letterSpacing:"0.4em", color:"#C9A84C", marginBottom:6, opacity:0.8 }}>EDIT MEISHIKI</p>
            <h2 style={{ fontFamily:"'Shippori Mincho',serif", fontSize:20, color:"#f0e6d0", fontWeight:700 }}>命式情報を変更する</h2>
          </div>
          <button onClick={onClose} style={{ width:34,height:34,borderRadius:"50%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",color:"rgba(240,230,208,0.5)",fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>×</button>
        </div>

        {/* 姓名 */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:18 }}>
          <div>
            <label style={labelStyle}>姓（任意）</label>
            <input value={form.lastName} onChange={e=>f('lastName',e.target.value)} placeholder="例: 山田" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>名（任意）</label>
            <input value={form.firstName} onChange={e=>f('firstName',e.target.value)} placeholder="例: 花子" style={inputStyle} />
          </div>
        </div>

        {/* 生年月日 */}
        <div style={{ marginBottom:18 }}>
          <label style={labelStyle}>生年月日 <span style={{color:"#C9A84C"}}>*</span></label>
          <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr", gap:10 }}>
            <input type="number" value={form.year} onChange={e=>f('year',e.target.value)} placeholder="年（例: 1995）" min="1900" max="2025" style={inputStyle} />
            <input type="number" value={form.month} onChange={e=>f('month',e.target.value)} placeholder="月" min="1" max="12" style={inputStyle} />
            <input type="number" value={form.day} onChange={e=>f('day',e.target.value)} placeholder="日" min="1" max="31" style={inputStyle} />
          </div>
        </div>

        {/* 生まれた時間 */}
        <div style={{ marginBottom:18 }}>
          <label style={labelStyle}>生まれた時間（わからなければスキップ可）</label>
          <select value={form.hourInput} onChange={e=>f('hourInput',e.target.value)} style={selectStyle}>
            {HOUR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* 性別・出生地 */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:18 }}>
          <div>
            <label style={labelStyle}>性別</label>
            <select value={form.gender} onChange={e=>f('gender',e.target.value)} style={selectStyle}>
              <option value="f">女性</option>
              <option value="m">男性</option>
              <option value="x">その他</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>出生地（都道府県・国名・都市名）</label>
            <div style={{ display:'flex', gap:6 }}>
              <input
                value={form.placeQuery}
                onChange={e => { f('placeQuery', e.target.value); f('geoStatus',''); }}
                onKeyDown={e => e.key==='Enter' && handleGeoSearch()}
                placeholder="例: 東京都 / Tokyo / Paris"
                style={{ ...inputStyle, flex:1 }}
              />
              <button
                type="button"
                onClick={handleGeoSearch}
                disabled={form.geoStatus==='loading'}
                style={{ padding:'10px 12px', borderRadius:10, cursor:'pointer', flexShrink:0,
                  background: form.geoStatus==='ok' ? 'rgba(80,160,80,0.2)' : 'rgba(201,168,76,0.15)',
                  border: `1px solid ${form.geoStatus==='ok' ? 'rgba(80,160,80,0.5)' : 'rgba(201,168,76,0.35)'}`,
                  color: form.geoStatus==='ok' ? 'rgba(120,200,120,0.9)' : '#C9A84C',
                  fontSize:12, fontFamily:"'Noto Sans JP',sans-serif",
                  transition:'all 0.2s', minWidth:52 }}
              >
                {form.geoStatus==='loading' ? '…' : form.geoStatus==='ok' ? '✓' : '検索'}
              </button>
            </div>
            {form.geoStatus==='ok' && (
              <p style={{ fontSize:10, color:'rgba(120,200,120,0.8)', marginTop:4 }}>
                東経{(form.resolvedLon||135).toFixed(2)}° で計算されますンダ
              </p>
            )}
            {form.geoStatus==='error' && (
              <p style={{ fontSize:10, color:'rgba(200,100,80,0.8)', marginTop:4 }}>
                見つからなかったンダ。別の書き方で試してほしいんダよ
              </p>
            )}
          </div>
        </div>

        {/* MBTI */}
        <div style={{ marginBottom:26 }}>
          <label style={labelStyle}>MBTIタイプ（わからなければスキップ可）</label>
          <select value={form.mbti} onChange={e=>f('mbti',e.target.value)} style={{...selectStyle, fontSize:12}}>
            {MBTI_LIST.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>

        {/* ボタン */}
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button onClick={onClose} style={{ padding:"10px 22px",borderRadius:10,background:"transparent",border:"1px solid rgba(255,255,255,0.1)",color:"rgba(240,230,208,0.45)",cursor:"pointer",fontSize:13,fontFamily:"'Noto Sans JP',sans-serif" }}>
            キャンセル
          </button>
          <button onClick={handleSave} disabled={!isValid} style={{
            padding:"10px 28px", borderRadius:10, cursor:isValid?"pointer":"default",
            background:isValid?"linear-gradient(135deg,#b8922a,#C9A84C)":"rgba(255,255,255,0.05)",
            border:"none", color:isValid?"#1a0d02":"rgba(240,230,208,0.25)",
            fontFamily:"'Shippori Mincho',serif", fontSize:14, fontWeight:700, transition:"all 0.2s",
          }}>
            ✦ 鑑定し直す
          </button>
        </div>

        {/* 注記 */}
        <p style={{ fontSize:10, color:"rgba(240,230,208,0.2)", marginTop:16, textAlign:"center", lineHeight:1.8 }}>
          変更すると命式・運勢カレンダー・大運がすべて再計算されますンダ🐼
        </p>
      </div>
    </div>
  );
};

// ── メイン ──
function FortuneResult() {
  const [activeTab, setActiveTab] = useState("meishiki");
  // 言語変更時にコンポーネントを再レンダするためのティック（window.PF_LANG 経由）
  const [_langTick, _setLangTick] = useState(0);
  React.useEffect(() => {
    const handler = () => _setLangTick(t => t + 1);
    window.addEventListener('pf-lang-change', handler);
    return () => window.removeEventListener('pf-lang-change', handler);
  }, []);
  const currentLang = (typeof window !== 'undefined' && window.PF_LANG && window.PF_LANG.getLang) ? window.PF_LANG.getLang() : 'jp';
  const [openSections, setOpenSections] = useState({gogyo:false, kakukyoku:false, tsuhen:false, juniu:false});
  const [acctOpen, setAcctOpen] = useState({info:false, plan:false});
  const [showAcctMenu, setShowAcctMenu] = useState(false);
  // マイアカウント編集用state（トップレベルに配置 - Rules of Hooks）
  const [acctEditName, setAcctEditName] = useState('');
  const [acctEditEmail, setAcctEditEmail] = useState('');
  const [acctNameEdit, setAcctNameEdit] = useState(false);
  const [acctEmailEdit, setAcctEmailEdit] = useState(false);
  const [acctPwEdit, setAcctPwEdit] = useState(false);
  const [acctSavedMsg, setAcctSavedMsg] = useState(false);
  // 初期値をsessionStorageから読み込み
  React.useEffect(() => {
    const ui = window._FORTUNE_INPUT || {};
    const saved = (() => { try { return JSON.parse(localStorage.getItem('pf_acct_info') || '{}'); } catch(e) { return {}; } })();
    const name = saved.displayName !== undefined ? saved.displayName : (ui.lastName || ui.firstName ? `${ui.lastName||''}${ui.firstName||''}` : '');
    setAcctEditName(name);
    setAcctEditEmail(ui.email || '');
  }, []);
  const toggleSection = (key) => setOpenSections(prev => ({...prev, [key]: !prev[key]}));
  const [timelineOffset, setTimelineOffset] = useState(0);  // 今日=0, 昨日=-1, 一昨日=-2（タイムライン＋詳細で共通）
  const [showFull, setShowFull] = useState({ love: false, work: false });
  const [mounted, setMounted] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [meishiki, setMeishiki] = useState(MEISHIKI);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [partners, setPartners] = useState([]);  // 相性占い登録リスト（タブ切り替えでも保持）


  useEffect(() => { setTimeout(() => setMounted(true), 100); }, []);
  useEffect(() => { window._pfSetActiveTab = setActiveTab; }, [setActiveTab]);

  // 命式更新ハンドラ
  const handleMeishikiSave = (newUi) => {
    setShowEditModal(false);
    setIsRecalculating(true);
    setTimeout(() => {
      const newCalc = window._calcMeishiki(newUi);
      window._MEISHIKI_CALC = newCalc;
      const newMeishiki = buildMeishiki(newCalc, newUi);
      setMeishiki(newMeishiki);
      setIsRecalculating(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 2200);
  };

  // コンポーネント内で使うMEISHIKI参照をstateから取得
  const M = meishiki;

  const gokyoColors = {
    moku: C.woodGreen, hi: C.fireRed, do: C.earthYellow, kin: C.metalWhite, sui: C.waterBlue,
  };
  const gokyoLabels = { moku: "木", hi: "火", do: "土", kin: "金", sui: "水" };

  return (
    <>
      {/* 命式変更モーダル */}
      {showEditModal && (
        <EditModal
          initialUi={M._ui}
          onSave={handleMeishikiSave}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {/* 鑑定中ローディング */}
      {isRecalculating && (() => {
        const RecalcLoading = () => {
          const [dots, setDots] = React.useState('');
          const [step, setStep] = React.useState(0);
          const steps = ['命式を読み解いているンダ…','四柱を計算しているンダ…','五行バランスを分析しているンダ…','鑑定結果を生成しているンダ…'];
          React.useEffect(() => {
            const d = setInterval(() => setDots(p => p.length < 3 ? p+'.' : ''), 400);
            const s = setInterval(() => setStep(p => (p+1)%steps.length), 700);
            return () => { clearInterval(d); clearInterval(s); };
          }, []);
          return (
            <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(14,6,8,0.97)', backdropFilter:'blur(8px)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:24 }}>
              <div style={{ fontSize:72, animation:'floatPanda 2s ease-in-out infinite', filter:'drop-shadow(0 8px 24px rgba(201,168,76,0.4))' }}><PandaIcon size={72} /></div>
              <div style={{ textAlign:'center' }}>
                <p style={{ fontFamily:"'Shippori Mincho',serif", fontSize:22, fontWeight:800, color:'#E8C96A', marginBottom:8 }}>ポポが鑑定中ンダ…</p>
                <p style={{ fontFamily:"'Shippori Mincho',serif", fontSize:14, color:'rgba(201,168,76,0.7)' }}>{steps[step]}{dots}</p>
              </div>
              <div style={{ width:240, height:4, background:'rgba(255,255,255,0.08)', borderRadius:2, overflow:'hidden' }}>
                <div style={{ height:'100%', background:'linear-gradient(90deg,#a07a24,#E8C96A)', borderRadius:2, animation:'loadingBar 2.2s ease forwards' }} />
              </div>
              <p style={{ fontSize:12, color:'rgba(255,255,255,0.3)', fontFamily:"'Shippori Mincho',serif" }}>四柱推命エンジンが全運勢を再計算しているんダ🐼</p>
              <style>{`@keyframes loadingBar { from{width:0%} to{width:100%} }`}</style>
            </div>
          );
        };
        return <RecalcLoading />;
      })()}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@400;500;700;800&family=Noto+Sans+JP:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${C.bg}; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes floatPanda {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes pulse {
          0%,100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        .fade-section { animation: fadeUp 0.7s ease both; }
        .shimmer-text {
          background: linear-gradient(135deg, #C9A84C 0%, #e8c97a 40%, #C9A84C 70%, #a07830 100%);
          background-size: 200% auto;
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
          animation: shimmer 4s linear infinite;
        }
        .pillar-cell {
          width: 68px; text-align: center; padding: 12px 6px;
          background: rgba(255,255,255,0.025);
          border-right: 1px solid rgba(255,255,255,0.05);
          transition: background 0.2s;
        }
        .pillar-cell:last-child { border-right: none; }
        .pillar-cell:hover { background: rgba(201,168,76,0.06); }
        .blur-overlay {
          position: absolute; inset: 0; border-radius: 14px;
          backdrop-filter: blur(7px);
          background: rgba(14,6,8,0.6);
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 16px; z-index: 2;
        }
        .pdf-btn {
          display: flex; align-items: center; gap: 10px;
          padding: 13px 28px; border-radius: 10px;
          background: transparent;
          border: 1px solid rgba(201,168,76,0.35);
          color: ${C.goldDim};
          font-family: 'Shippori Mincho', serif;
          font-size: 14px; cursor: pointer;
          transition: all 0.25s;
          letter-spacing: 0.05em;
        }
        .pdf-btn:hover {
          border-color: ${C.gold}; color: ${C.gold};
          box-shadow: 0 0 20px rgba(201,168,76,0.15);
        }
        .tab-content { animation: fadeUp 0.4s ease both; }
        @media (max-width: 640px) {
          .pillar-cell { width: 52px; }
          .cards-2col { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ minHeight: "100vh", background: C.bg, padding: "0 0 80px", fontFamily: "'Noto Sans JP', sans-serif", color: C.text }}>

        {/* ── ヘッダーバー ── */}
        <div style={{ borderBottom: `1px solid rgba(201,168,76,0.1)`, background: "rgba(14,6,8,0.97)", position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(16px)" }}>
          {/* 上段：ロゴ＋右アクション */}
          <div style={{ padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            {/* ロゴ */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <span style={{ fontSize: 20 }}><PandaIcon size={22} /></span>
              <span style={{ fontFamily: "'Shippori Mincho', serif", fontSize: 14, color: C.gold, letterSpacing: "0.12em" }}>PANDA FORTUNE</span>
            </div>

            {/* 右側ナビ */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
              {/* トップに戻る */}
              <button style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "6px 12px", borderRadius: 8, cursor: "pointer",
                background: "transparent", border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(240,230,208,0.5)", fontSize: 11,
                fontFamily: "'Noto Sans JP',sans-serif", letterSpacing: "0.05em",
                transition: "all 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(201,168,76,0.35)"; e.currentTarget.style.color = C.goldDim; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(240,230,208,0.5)"; }}
              >
                <span style={{ fontSize: 12 }}>🏠</span><span className="pf-hdr-label">{window.PF_LANG ? window.PF_LANG.t('トップ') : 'トップ'}</span>
              </button>

              {/* 命式情報を変更する */}
              <button style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "6px 12px", borderRadius: 8,
                cursor: "pointer",
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(240,230,208,0.5)",
                fontSize: 11,
                fontFamily: "'Noto Sans JP',sans-serif", letterSpacing: "0.05em",
                transition: "all 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(201,168,76,0.35)"; e.currentTarget.style.color = C.goldDim; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(240,230,208,0.5)"; }}
              onClick={() => setShowEditModal(true)}
              >
                <span style={{ fontSize: 12 }}>✏️</span><span className="pf-hdr-label">{window.PF_LANG ? window.PF_LANG.t('命式を変更') : '命式を変更'}</span>
              </button>

              {/* マイアカウント ドロップダウン */}
              <div style={{ position: "relative" }}>
                <button style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "6px 14px", borderRadius: 8, cursor: "pointer",
                  background: showAcctMenu ? "rgba(201,168,76,0.18)" : "rgba(201,168,76,0.1)",
                  border: `1px solid ${showAcctMenu ? C.borderHover : C.border}`,
                  color: C.gold, fontSize: 11,
                  fontFamily: "'Noto Sans JP',sans-serif", letterSpacing: "0.05em",
                  transition: "all 0.2s",
                }}
                onClick={() => setShowAcctMenu(v => !v)}
                >
                  <span style={{ fontSize: 12 }}>👤</span><span className="pf-hdr-label">{window.PF_LANG ? window.PF_LANG.t('マイアカウント') : 'マイアカウント'}</span> <span style={{ fontSize: 9, marginLeft: 2, opacity: 0.7 }}>{showAcctMenu ? '▲' : '▼'}</span>
                </button>
                {showAcctMenu && (
                  <>
                    {/* オーバーレイ */}
                    <div onClick={() => setShowAcctMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 199 }} />
                    {/* ドロップダウン */}
                    <div style={{
                      position: "absolute", top: "calc(100% + 8px)", right: 0,
                      width: 340, background: "rgba(18,10,6,0.98)",
                      border: "1px solid rgba(201,168,76,0.2)", borderRadius: 14,
                      boxShadow: "0 8px 32px rgba(0,0,0,0.5)", zIndex: 200,
                      overflow: "hidden",
                    }}>
                      <AccountDropdown meishiki={M} acctOpen={acctOpen} setAcctOpen={setAcctOpen} />
                    </div>
                  </>
                )}
              </div>

              {/* 言語切替プルダウン */}
              <div className="pf-lang-select-wrap">
                <select className="pf-lang-select" id="pf-lang-dd"
                  defaultValue={window.PF_LANG ? window.PF_LANG.getLang() : 'jp'}
                  onChange={e => { if(window.PF_LANG) window.PF_LANG.setLang(e.target.value); }}>
                  <option value="jp">🇯🇵 日本語</option>
                  <option value="kr">🇰🇷 한국어</option>
                </select>
                <span className="pf-lang-select-arrow">▼</span>
              </div>

            </div>
          </div>

          {/* 下段：命式サマリーバー */}
          <div style={{ padding: "8px 20px 10px", borderTop: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", gap: 16, overflowX: "auto" }}>
            <span style={{ fontSize: 11, color: C.textMuted, flexShrink: 0 }}>📍</span>
            {[
              { label: "日主",    value: `${M.nichi.kan}${M.nichi.shi}` },
              { label: "生年月日", value: `${M._ui.year}.${M._ui.month}.${M._ui.day}` },
              { label: "出生地",   value: M.birthPlace },
              { label: "MBTI",    value: M.mbti ? M.mbti + (MBTI_NAMES && MBTI_NAMES[M.mbti.replace(/-(A|T)$/,'')] ? '（'+MBTI_NAMES[M.mbti.replace(/-(A|T)$/,'')]+'）' : '') : '未設定' },
              { label: "大運",    value: M._calc.currentDaiun ? `${M._calc.currentDaiun.kan}${M._calc.currentDaiun.shi}（${M._calc.currentDaiun.ageFrom}-${M._calc.currentDaiun.ageTo}歳）` : '不明' },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                <span style={{ fontSize: 9, color: C.textMuted, letterSpacing: "0.08em" }}>{item.label}</span>
                <span style={{ fontSize: 11, color: C.textSub, fontFamily: "'Shippori Mincho',serif" }}>{item.value}</span>
                {i < 4 && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.1)", marginLeft: 6 }}>·</span>}
              </div>
            ))}
          </div>
        </div>

        <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 20px 0" }}>

          {/* ── タイトルブロック ── */}
          {(() => {
            const _ttlLang = (typeof window !== 'undefined' && window.PF_LANG && window.PF_LANG.getLang) ? window.PF_LANG.getLang() : 'jp';
            const _ttlIsKr = _ttlLang === 'kr';
            const _nameTxt = M.name.last || M.name.first
              ? `${M.name.last}${M.name.first}` + (_ttlIsKr ? '님' : 'さん')
              : `${M.nichi.kan}${M.nichi.shi}` + (_ttlIsKr ? '일간' : '日主');
            const _ttlSuffix = _ttlIsKr ? '의 명식' : 'の命式';
            return (
          <div className="fade-section" style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 12, animation: "floatPanda 3s ease-in-out infinite", display: "inline-block", filter: "drop-shadow(0 4px 16px rgba(201,168,76,0.3))" }}><PandaIcon size={36} /></div>
            <p style={{ fontSize: 10, letterSpacing: "0.45em", color: C.gold, marginBottom: 12, opacity: 0.8 }}>FORTUNE RESULT · {_ttlIsKr ? '감정 결과' : '鑑定結果'}</p>
            <h1 style={{ fontFamily: "'Shippori Mincho', serif", fontSize: "clamp(28px,5vw,42px)", fontWeight: 800, lineHeight: 1.3, marginBottom: 8 }}>
              <span className="shimmer-text">{_nameTxt}</span>{_ttlSuffix}
            </h1>
            <p style={{ fontSize: 13, color: C.textMuted, letterSpacing: "0.08em" }}>
              {M.birthDate} · {M.birthTime} · {M.birthPlace}
            </p>
            <div style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(80,140,200,0.1)", border: "1px solid rgba(80,140,200,0.25)", borderRadius: 20, padding: "4px 14px", fontSize: 11, color: C.waterBlue }}>
              📍 {_ttlIsKr ? '보정 완료' : '補正済み'} {M.correctedTime}{M.mbti ? ` · ${M.mbti}` : ''}
            </div>
          </div>
            );
          })()}

          {/* ── タブ ── */}
          <div style={{ display: "flex", gap: 8, marginBottom: 28, flexWrap: "wrap", justifyContent: "center" }}>
            {[
              { id: "meishiki", label: "基本命式",         icon: "☯️",  premium: false },
              { id: "timeline", label: "運勢タイムライン", icon: "📅",  premium: false },
              { id: "compat",   label: "相性占い",         icon: "💞",  premium: "LIGHT" },
              { id: "aichat",   label: "ポポに聞く",       icon: "🐼",  premium: "LIGHT" },
              // 韓国語モードでは専門家に相談タブを非表示
              ...(ACK.getLang() === 'kr' ? [] : [{ id: "expert", label: "専門家に相談", icon: "👨‍🏫", premium: "COMING" }]),

            ].map(t => (
              <div key={t.id} style={{ position: "relative" }}>
                {t.premium && (
                  <span style={{
                    position: "absolute", top: -8, right: -4, zIndex: 2,
                    fontSize: 9,
                    background: t.premium === "PREMIUM"
                      ? "linear-gradient(135deg,#b8922a,#e8c97a)"
                      : t.premium === "COMING"
                      ? "linear-gradient(135deg,#5a4a8a,#8a70c0)"
                      : "linear-gradient(135deg,#3a6a9a,#6aaada)",
                    color: "#fff", fontWeight: 700, padding: "1px 7px",
                    borderRadius: 10, letterSpacing: "0.05em", whiteSpace: "nowrap",
                  }}>{t.premium === "PREMIUM" ? "PREMIUM" : t.premium === "COMING" ? "COMING SOON" : "LIGHT〜"}</span>
                )}
                <TabBtn active={activeTab === t.id} onClick={() => setActiveTab(t.id)}>
                  <span style={{ marginRight: 5 }}>{t.icon}</span>{t.label}
                </TabBtn>
              </div>
            ))}
          </div>

          {/* ══════════════ 命式表タブ ══════════════ */}
          {activeTab === "meishiki" && (
            <div className="tab-content" style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* ① ポポ鑑定まとめ（最上部） */}
              <Card glow>
                <SectionLabel en="POPO'S READING · 総合鑑定" ja="ポポからの鑑定まとめ" />
                {(() => {
                  // ── 命式から動的生成 ──────────────────────────
                  const calc = M._calc;
                  const _GOGYO_PERSONA = {
                    '木': { name:'しなやかな竹のような人', icon:'🎋',
                            desc:'物事を深く感じ取り、美しいものに敏感な人ンダ。新しいことへの好奇心が強く、しなやかに成長し続ける力を持っているんダよ。',
                            traits:[{icon:'🌱',label:'成長型',desc:'変化の中で才能が開く'},{icon:'🎨',label:'感受性',desc:'美・芸術・感性に敏感'},{icon:'💡',label:'好奇心',desc:'学び続けることが力になる'}]},
                    '火': { name:'情熱の炎のような人', icon:'🔥',
                            desc:'情熱と行動力に満ちた人ンダ。やると決めたら猪突猛進で、まわりを自然に引っ張るエネルギーを持っているんダよ。',
                            traits:[{icon:'⚡',label:'行動力',desc:'やると決めたら動ける'},{icon:'✨',label:'カリスマ',desc:'自然と人が集まってくる'},{icon:'🎯',label:'直感型',desc:'感覚で正解をつかむ'}]},
                    '土': { name:'大地のような人', icon:'🌍',
                            desc:'揺るぎない安定感と誠実さを持つ人ンダ。困ったときに頼りになる存在で、周りの人をしっかり支える力があるんダよ。',
                            traits:[{icon:'🛡️',label:'安定型',desc:'揺れない軸を持っている'},{icon:'🤝',label:'誠実さ',desc:'信頼が最大の武器になる'},{icon:'🌳',label:'縁の木',desc:'長く続く関係を作れる'}]},
                    '金': { name:'輝く宝石のような人', icon:'💎',
                            desc:'高い美意識と強い意志を持つ人ンダ。物事を丁寧に整え、自分の基準を妥協しないこだわりの強さがあるんダよ。',
                            traits:[{icon:'🔮',label:'意志の強さ',desc:'一度決めたら曲げない'},{icon:'💫',label:'美意識',desc:'クオリティにこだわれる'},{icon:'📐',label:'几帳面',desc:'細部まで丁寧に仕上げる'}]},
                    '水': { name:'大きな川のような人', icon:'🌊',
                            desc:'思考が深く、感受性がとても豊かな人ンダ。好きになったら深く愛するタイプで、自分の価値観や信念を大切にするんダよ。',
                            traits:[{icon:'💧',label:'思慮深さ',desc:'物事の本質を見抜く力'},{icon:'🌙',label:'感受性',desc:'細かな変化を敏感に察する'},{icon:'🧭',label:'直感型',desc:'論理より感覚が当たる'}]},
                  };
                  // ── 天干×格局ごとの特性カード（20パターン） ──────────────────
                  const NIKCHU_TRAITS = {
                    // 甲（木）
                    '甲_普通格局': [{icon:'🌱',label:'成長力',desc:'変化の中で着実に伸びる'},{icon:'🤝',label:'誠実さ',desc:'信頼が最大の武器になる'},{icon:'💡',label:'知的好奇心',desc:'学び続けることが力になる'}],
                    '甲_従旺格':   [{icon:'🎯',label:'集中力',desc:'一点に注ぐ力は誰にも負けない'},{icon:'🦅',label:'独立心',desc:'自分の道を迷わず歩ける'},{icon:'🔭',label:'探求心',desc:'本質を追い求め続けられる'}],
                    // 乙（木）
                    '乙_普通格局': [{icon:'🌸',label:'感受性',desc:'美しいものに敏感に反応する'},{icon:'🎋',label:'しなやかさ',desc:'どんな環境でも折れずに適応'},{icon:'💞',label:'共感力',desc:'相手の気持ちに自然と寄り添う'}],
                    '乙_従旺格':   [{icon:'🎨',label:'芸術センス',desc:'感性が研ぎ澄まされている'},{icon:'🔥',label:'意志の強さ',desc:'一度決めたら曲げない芯'},{icon:'⏳',label:'忍耐力',desc:'時間をかけて結果を出せる'}],
                    // 丙（火）
                    '丙_普通格局': [{icon:'⚡',label:'行動力',desc:'やると決めたら動ける'},{icon:'✨',label:'カリスマ',desc:'自然と人が集まってくる'},{icon:'🎯',label:'直感型',desc:'感覚で正解をつかむ'}],
                    '丙_従旺格':   [{icon:'🔥',label:'情熱',desc:'ひとたび燃えたら止まらない'},{icon:'👑',label:'リーダーシップ',desc:'大きなビジョンで人を引っ張る'},{icon:'💥',label:'突破力',desc:'困難を正面から突き破れる'}],
                    // 丁（火）
                    '丁_普通格局': [{icon:'🌟',label:'感受性',desc:'人の気持ちを鋭く察する'},{icon:'🕯️',label:'温かさ',desc:'そばにいるだけで場が和む'},{icon:'🎭',label:'芸術的センス',desc:'表現力・創造力が豊か'}],
                    '丁_従旺格':   [{icon:'💎',label:'信念',desc:'何があっても揺るがない軸'},{icon:'🌙',label:'内なる情熱',desc:'静かに燃え続ける強い火'},{icon:'🧿',label:'直感力',desc:'見えないものを感じ取れる'}],
                    // 戊（土）
                    '戊_普通格局': [{icon:'🛡️',label:'包容力',desc:'どんな人でも受け止められる'},{icon:'🤝',label:'誠実さ',desc:'信頼されることが何より大切'},{icon:'🌳',label:'安定感',desc:'揺れない軸が周りを支える'}],
                    '戊_従旺格':   [{icon:'🏔️',label:'存在感',desc:'そこにいるだけで空気が変わる'},{icon:'⏳',label:'忍耐力',desc:'どんな困難も静かに乗り越える'},{icon:'🔒',label:'信頼感',desc:'任せれば絶対にやり遂げる'}],
                    // 己（土）
                    '己_普通格局': [{icon:'💐',label:'気遣い力',desc:'細やかな配慮が自然にできる'},{icon:'😊',label:'親しみやすさ',desc:'誰とでも自然に打ち解けられる'},{icon:'🪢',label:'縁結び',desc:'長く続く関係を作れる'}],
                    '己_従旺格':   [{icon:'🫂',label:'面倒見',desc:'弱い立場の人を自然にサポート'},{icon:'🕊️',label:'場の安心感',desc:'その場全体をやわらかく包む'},{icon:'🧭',label:'価値観の軸',desc:'内側に揺るぎない信念がある'}],
                    // 庚（金）
                    '庚_普通格局': [{icon:'⚔️',label:'実行力',desc:'目標に向かって迷わず動ける'},{icon:'⚖️',label:'正義感',desc:'不正を見ると黙っていられない'},{icon:'🔱',label:'突破力',desc:'困難を正面突破するエネルギー'}],
                    '庚_従旺格':   [{icon:'🗡️',label:'意志の強さ',desc:'一度決めたら何があっても曲げない'},{icon:'🦁',label:'義侠心',desc:'大切なものを守り抜く強さ'},{icon:'💠',label:'精神力',desc:'圧力の下でこそ力を発揮する'}],
                    // 辛（金）
                    '辛_普通格局': [{icon:'🌺',label:'美意識',desc:'クオリティにとことんこだわれる'},{icon:'🪶',label:'繊細さ',desc:'細部まで丁寧に感じ取れる'},{icon:'📐',label:'こだわり力',desc:'自分の基準を妥協しない'}],
                    '辛_従旺格':   [{icon:'🔮',label:'洞察力',desc:'物事の本質を瞬時に見抜く'},{icon:'💫',label:'孤高の美',desc:'他に代えがたい独自の輝き'},{icon:'✅',label:'完璧主義',desc:'高い基準が最高の仕事を生む'}],
                    // 壬（水）
                    '壬_普通格局': [{icon:'🧠',label:'知性',desc:'アイデアを現実に変える力'},{icon:'🌐',label:'社交性',desc:'どんな環境にも自然に溶け込む'},{icon:'🌊',label:'柔軟性',desc:'状況に応じてしなやかに対応'}],
                    '壬_従旺格':   [{icon:'🌌',label:'深い思慮',desc:'長期的な視点で戦略を立てられる'},{icon:'🔭',label:'洞察力',desc:'見えない本質を静かに観察する'},{icon:'🧪',label:'探求心',desc:'常に新しい世界を追い求める'}],
                    // 癸（水）
                    '癸_普通格局': [{icon:'💧',label:'感受性',desc:'細かな変化を敏感に察する'},{icon:'🌙',label:'繊細さ',desc:'他の人には見えないものが見える'},{icon:'🦋',label:'独自性',desc:'他には出せない唯一の輝き'}],
                    '癸_従旺格':   [{icon:'🌀',label:'深い直感',desc:'言語化できないものを感じ取る'},{icon:'🔮',label:'神秘的感性',desc:'芸術・精神世界への鋭い感応'},{icon:'🪞',label:'内省力',desc:'自分の奥底を深く見つめられる'}],
                  };
                  const JIKKAN_G = ['木','木','火','火','土','土','金','金','水','水'];
                  const JIKKAN_L = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
                  const dayKanIdx = JIKKAN_L.indexOf(calc.pillars.day.kan);
                  const dayGogyo = dayKanIdx >= 0 ? JIKKAN_G[dayKanIdx] : '水';
                  const persona = _GOGYO_PERSONA[dayGogyo] || _GOGYO_PERSONA['水'];
                  const ki = (calc.kishin||[]).join('・') || '';
                  const kj = (calc.kijin||[]).join('・') || '';
                  const kakukyoku = M.kakukyoku || '';
                  const mbti = M._ui?.mbti || '';
                  // 大運の吉凶判定（追い風/逆風テキスト）
                  const daiun = calc.currentDaiun;
                  const duKan = daiun?.kan || '';
                  const duGogyo = JIKKAN_G[JIKKAN_L.indexOf(duKan)] || '';
                  const duIki = ki && (calc.kishin||[]).includes(duGogyo);
                  const duImi = kj && (calc.kijin||[]).includes(duGogyo);
                  const windText = duIki ? `今はちょうど喜神「${ki}」と大運が重なる追い風の時期ンダ。` : duImi ? `今は忌神「${kj}」が大運に流れている時期なので、無理せず守りを固めながら動くといいんダ。` : `今の大運は命式的に中立な流れンダ。`;
                  // MBTI連動テキスト
                  const mbtiText = mbti ? `${mbti}らしく自分の「${mbti.includes('F') ? '感情・価値観' : '論理・仕組み'}」を軸にして動くと、` : '自分の軸をしっかり持って動くと、';
                  const NIKCHU_SELF_PROFILES = {
                    '甲子_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「大木が水に根を張る人」ンダ。知性と誠実さが自然と周りを引き寄せて、信頼される存在になれるタイプンダ。穏やかに見えて内側には揺るぎない芯があるから、一度決めたことはとことんやり遂げる力があるんダよ。完璧を求めすぎず、その誠実さのまま動けば、仕事も恋愛も自然とうまくいくんダ🐼',
                    '甲子_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「静水に映る大木のような人」ンダ。外からはクールに見えても、内側には誰にも負けない情熱と集中力があるんダ。一つのことを極めようとする力は本当に強くて、その道に入ったときの深さは他の人には出せないものがあるんダよ。自分の世界観を信じて進めば、自然と結果がついてくるんダ🐼',
                    '乙丑_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「肥沃な大地に根付く草花のような人」ンダ。しなやかで上品、そして人を包み込む温かさが自然とあふれてくるタイプンダ。地道な努力を積み重ねる力があって、焦らずじっくり育てていったものが最終的に大きな実を結ぶんダよ。自分の優しさを大切にしながら、本音も少しずつ伝えていくといいんダ🐼',
                    '乙丑_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「しなやかな中に鉄の意志を持つ人」ンダ。外見は穏やかで柔らかいけど、自分の価値観と美意識においては絶対に曲げないものがあるんダ。どんな困難な環境でも静かに力を蓄えながら前進できる忍耐力は、あなたの最大の武器ンダよ。その強さを信じて、自分のペースで進んでいけばいいんダ🐼',
                    '丙寅_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「山から昇る太陽のような人」ンダ。明るさと行動力で自然と周りを照らして、いる場所を温めるエネルギーがあるんダよ。向上心が強くてリーダーシップがあるから、自分から動いたときに一番輝けるタイプンダ。少し急ぎすぎる癖があるから、たまに立ち止まって周りを確認すると、もっとうまくいくんダ🐼',
                    '丙寅_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「全方位に輝く太陽のような人」ンダ。あなたのエネルギーは本当に強くて、何事にも全力で取り組む姿勢が周りを圧倒するんダ。大きなビジョンを描いて突き進む力は群を抜いているんダよ。そのエネルギーを自分の本当にやりたいことに向けたとき、驚くような結果が生まれるんダ🐼',
                    '丁卯_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「草木の中で揺れる灯火のような人」ンダ。繊細で温かくて、大切な人への思いやりが自然と深いタイプンダ。芸術的な感性と共感力に恵まれていて、人の気持ちを察することが得意なんダよ。傷つきやすい部分があるから、信頼できる人との時間を大切にすると、もっと自分らしく輝けるんダ🐼',
                    '丁卯_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「穏やかな外見に消えない炎を持つ人」ンダ。外からは静かに見えても、内側には誰にも消せない情熱の火があるんダよ。直感が鋭くて、人の本音や場の空気を瞬時に感じ取る力がある。その感性を信じて動いたとき、あなたは本当に強いんダ🐼',
                    '戊辰_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「変化の中でも揺るがない山の土のような人」ンダ。どっしりとした包容力と安定感があって、周りの人が自然と集まってくるタイプンダ。信頼されることを何より大切にして、一度心を許した人にはとことん尽くせるんダよ。その安定感を保ちながら、少し変化も楽しんでみると、さらに大きく育っていくんダ🐼',
                    '戊辰_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「山のような不動の存在感を持つ人」ンダ。困難に直面しても揺るがない精神的な強さがあって、周りの人の拠り所になれるタイプンダよ。信頼と義理を何より大切にするその価値観は、長い目で見て必ず報われるんダ。頑固さが出たときだけ、少し柔軟さを意識してみるといいんダ🐼',
                    '己巳_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「柔らかな中に確かな意志を持つ人」ンダ。親しみやすくて気遣いができて、人間関係を丁寧に育てていく力があるんダよ。内側の強さと表面の従順さが共存していて、それがあなたの独自の魅力ンダ。自分の本音も少しずつ伝えていくと、もっと深い関係が築けるんダ🐼',
                    '己巳_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「場全体を落ち着かせる不思議な力を持つ人」ンダ。表面は謙虚で穏やかだけど、内側には揺るぎない価値観と誇りがあるんダよ。面倒見がよくて、弱い立場の人を自然にサポートできるその優しさは本物ンダ。自分の感情もちゃんと表現していくと、関係がさらに深まるんダ🐼',
                    '庚午_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「炎に鍛えられた鋼のような人」ンダ。強さと情熱を兼ね備えていて、困難を正面突破しようとするエネルギーがあるんダよ。人を鼓舞する力も強くて、自分から動いたときに周りも動き始めるタイプンダ。白黒つけたがる性質があるから、グレーゾーンも少し許容すると、人間関係がもっとスムーズになるんダ🐼',
                    '庚午_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「情熱の火でさらに磨かれた刃のような人」ンダ。信念と意志の強さは圧倒的で、一度目標を定めたら何があっても突き進める力があるんダよ。義侠心も強くて、不正を見ると黙っていられない正義感の持ち主ンダ。プライドが高い分、素直に謝れる場面を作れると、さらに大きな人になれるんダ🐼',
                    '辛未_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「大地に育まれた宝石のような人」ンダ。繊細な美意識と内に秘めた強さが共存していて、磨かれた感性と堅実な実力があるんダよ。細部へのこだわりが際立っていて、質の高いものを作り出す力がある。理想と現実のギャップに悩むことがあるかもしれないけど、その高い基準があるからこそ輝けるんダ🐼',
                    '辛未_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「孤高に輝く磨き抜かれた宝石のような人」ンダ。鋭い観察眼と分析力があって、物事の本質を瞬時に見抜く力があるんダよ。大切な人への思いやりは深くて、守りたいと思った関係は一生守ろうとするタイプンダ。感情より理性が先に動くから、温かさを意識して表現してみるといいんダ🐼',
                    '壬申_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「山の麓を流れる大河のような人」ンダ。広い視野と柔軟な思考があって、どんな環境にも自然に溶け込める社交性があるんダよ。知性と実行力が高いレベルで融合していて、アイデアを現実に変える力もあるんダ。思考と感情の間で揺れることがあるから、時には直感を信じて動いてみるといいんダ🐼',
                    '壬申_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「深海のような知性を持つ探求者のような人」ンダ。表面は穏やかで流れるように人に合わせるけど、内側には深海のような思考の世界があるんダよ。洞察力と分析力に優れていて、物事の本質を静かに観察し続ける力がある。精神的なつながりを大切にして動くと、本当の意味で輝ける場所が見えてくるんダ🐼',
                    '癸酉_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「清らかな水が宝石を磨くような人」ンダ。繊細な感受性と磨かれた美意識があって、洗練された感性と内省的な深みがあるんダよ。表面はクールで自立して見えても、信頼した相手にだけ見せる温かさは本物ンダ。傷つきやすい繊細さがあるから、信頼できる人との時間を大切にしてほしいんダ🐼',
                    '癸酉_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「清らかな知性と深い直感を持つ人」ンダ。静水のように見えても底知れぬ深さがあって、外からは読めない複雑な内面世界を持っているんダよ。芸術や精神世界への感受性が特別に高くて、見えないものを感じ取る力があるんダ。自分の感性を信じて表現していくと、誰にも出せない独自の輝きが生まれるんダ🐼',
                    '甲戌_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「乾いた大地に立つ大木のような人」ンダ。行動力と堅実さを兼ね備えていて、逆境でも揺るがない強さがあるんダよ。責任感が強くて、任されたことは最後まで全力でやり遂げられるタイプンダ。義務感が強い分、自分のことも同じくらい大切にするといいんダ🐼',
                    '甲戌_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「乾いた大地でも折れずに立つ大木のような人」ンダ。周囲に流されない独立心と、自分の目指す道を確実に歩み続ける意志の強さがあるんダよ。対等で自立した関係を大切にして、ともに成長できるつながりを築いていけるタイプンダ。その信念の強さを信じて進んでいけば大丈夫ンダ🐼',
                    '乙亥_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「水の上に映る草花のような人」ンダ。柔らかな包容力と深い共感力があって、人の痛みに敏感で、困っている人を自然にサポートする優しさがあるんダよ。深いつながりを求めて、相手の感情に寄り添うことが得意なタイプンダ。自分の境界線を大切にすることも、同じくらい大事なんダ🐼',
                    '乙亥_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「水の深みに根を張る草花のような人」ンダ。直感力と感受性が特別に鋭くて、言葉にならないものを感じ取る霊感的なセンスがあるんダよ。真のつながりを何より大切にして、表面的な関係には興味が持てないタイプンダ。感情の揺れが大きいときは、自分を癒す時間をちゃんと取るといいんダ🐼',
                    '丙子_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「水面に輝く太陽のような人」ンダ。情熱と知性が高次元で融合していて、明るさと洞察力を兼ね備えているんダよ。どんな環境でも明るく前向きに取り組んで、周りに活気をもたらせるタイプンダ。感情の起伏が大きいから、自分の波に乗る方法を知ると、もっと力を発揮できるんダ🐼',
                    '丙子_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「水の鏡に映る太陽のような人」ンダ。内外ともにエネルギーがあふれていて、その存在が場の空気を変える力があるんダよ。知的好奇心と行動力が同時に高くて、思いついたら即実行できるタイプンダ。感情の熱が冷めるのも早いから、大切なものには意識的に時間をかけるといいんダ🐼',
                    '丁丑_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「大地の中で燃える灯火のような人」ンダ。穏やかで包み込むような温かさと、内側の静かな情熱が共存しているんだよ。じっくり時間をかけて信頼関係を築いて、長期的なコミットメントを大切にできるタイプンダよ。保守的な面があるから、新しいことへの挑戦が成長のカギになるんダ🐼',
                    '丁丑_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「大地の中で燃え続ける炉のような人」ンダ。表面は穏やかだけど、内側には誰も消せない強い信念があるんダよ。一つのことを極めようとする集中力と持続力は本当に際立っているンダ。自分の価値観に正直に、信じた道をまっすぐ進んでいけば大丈夫ンダ🐼',
                    '戊寅_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「虎の気に抱かれた大山のような人」ンダ。力強さと行動力があって、周りを自然にリードできる頼もしさがあるんだよ。困難を恐れずに前進できる勇気と、周りに安心感を与える存在感があるタイプンダ。相手の自主性を尊重する意識を持つと、もっと大きなリーダーになれるんダ🐼',
                    '戊寅_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「山岳地帯のような圧倒的な存在感を持つ人」ンダ。どんな状況でも揺るがない安定感があって、そこにいるだけで周りが落ち着くんだよ。信頼されることを最も大切にして、行動と責任が伴う重厚な人格があるタイプンダ。相手の気持ちを聞く姿勢を持つと、その存在感がさらに輝くんダ🐼',
                    '己卯_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「草木の気に包まれた柔らかな大地のような人」ンダ。繊細な感受性と内側の芯の強さが共存していて、人の感情を受け止める力に恵まれているんダよ。人当たりが良くて、誰とでも自然に打ち解けられる社交性があるタイプンダ。時には自分の願いを素直に伝えることが、大切な関係を深めるカギになるんダ🐼',
                    '己卯_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「豊かに草木が育つ大地のような人」ンダ。他者の感情に敏感で、誰の心もやわらかく受け止める能力があるんだよ。外柔内剛で、柔らかな外見の中に確かな信念があるタイプンダ。八方美人になりすぎず、本当に大切な人への特別感を大事にしていくといいんダ🐼',
                    '庚辰_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「大地の霊気に鍛えられた鋼のような人」ンダ。知性と実行力が高いレベルで融合していて、論理的思考と忍耐力が際立っているんだよ。物事を緻密に分析して確実に実行できるタイプンダ。完璧主義の傾向があるから、相手に高い基準を求めすぎないよう意識すると、関係がもっと楽になるんダ🐼',
                    '庚辰_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「大地の霊気に磨かれた重厚な鋼のような人」ンダ。鋭い判断力と問題解決能力があって、困難な状況ほど本領を発揮できるんだよ。義理と責任を何より重んじる強固な倫理観があるタイプンダ。一度決めたら長期的に大切にする誠実さが、あなたの最大の強みンダ🐼',
                    '辛巳_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「太陽の火に輝く磨かれた宝石のような人」ンダ。洗練された感性と内なる情熱を持っていて、直感力が鋭くてチャンスを素早く掴む才能があるんだよ。自然と相手を惹きつける魅力があるタイプンダ。親しい人ほど素直になれない不器用さがあるから、大切な人にはその感情を少しずつ伝えていくといいんダ🐼',
                    '辛巳_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「太陽の炎でさらに磨かれた宝石のような人」ンダ。強い意志と高い美意識があって、自分の基準に妥協しない姿勢が際立っているんだよ。見せない努力を積み重ねて、結果で証明するタイプンダ。感情を理性でコントロールしすぎると伝わらないから、温かさを表現する場面を意識的に作るといいんダ🐼',
                    '壬午_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「情熱の炎と知の深さが共鳴する大河のような人」ンダ。穏やかに見えて内面には熱い情熱を秘めていて、義理人情に厚く、一度心を許した相手にはどこまでも深い愛情を注げるんダよ。鋭い観察眼と分析力があって、物事の本質を見抜く力がある。そのバランスを大切にして動くと、自然とうまくいくんダ🐼',
                    '壬午_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「情熱の炎と深い知性が融合した稀有な人」ンダ。一見矛盾した二面性を持ちながら、それがあなた独自の魅力になっているんダよ。感情の深さと知性の高さが共存していて、周囲を引きつけるカリスマ性がある。感情の振れ幅を自覚して安定させていくと、その力が最大限に発揮されるんダ🐼',
                    '癸未_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「豊かな大地を潤す清らかな水のような人」ンダ。落ち着いた包容力と繊細な感性があって、人を育て支える力があるんだよ。場の空気を読む能力が高くて、自然と調和役になれるタイプンダ。優しさゆえに断れないことがあるから、時には自分の感情を最優先にすることも大切なんダ🐼',
                    '癸未_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「豊かな大地を静かに潤す清水のような人」ンダ。人の感情に敏感で、言葉にならない痛みや喜びを感じ取れる深い共感力があるんだよ。人を支え助けることに強い使命感を感じるタイプンダ。内なる感情の豊かさを表現する場を持つことで、よりいきいきと輝けるんダ🐼',
                    '甲申_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「金属の気に刻まれた大木のような人」ンダ。鋭い知性と行動力があって、困難に直面すると逆に燃えるタイプンダよ。戦略的に物事を進める力があって、競争環境で本領を発揮できるんダ。プライドの高さを認識して、弱みを見せられる相手を作ると、もっと生きやすくなるんダ🐼',
                    '甲申_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「金属の試練にも折れない大木のような人」ンダ。逆境が成長の糧になって、困難な状況ほど真価を発揮できる強靭な精神力があるんダよ。独立心が強くて自分の道を自分で切り開く意志がある。その強さの裏にある繊細さを、信頼できる人に見せられたとき、本当の意味でつながれるんダ🐼',
                    '乙酉_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「宝石の光に照らされる草花のような人」ンダ。繊細な美意識と知的な魅力があって、感性と知性の調和が際立っているんダよ。美しいものへのこだわりが生活全体ににじみ出ていて、上質な時間を大切にできるタイプンダ。批評家的な目が自分に向いたとき、完璧じゃなくていいと少し許してあげるといいんダ🐼',
                    '乙酉_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「宝石の輝きに映えるしなやかな草花のような人」ンダ。美への感受性が鋭くて、それが才能として開花しやすい命式なんだよ。内省的で自分の世界観を大切にしながら、それを外の世界に美しく表現できるタイプンダ。自分の繊細さを守るために壁を作りすぎず、少しずつ心を開いていくといいんダ🐼',
                    '丙戌_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「乾いた大地を照らす太陽のような人」ンダ。情熱と誠実さを兼ね備えていて、自分の信じることに真っ直ぐに突き進める力があるんダよ。正直で裏表がなくて、義侠心が強いタイプンダ。熱くなりすぎると周りへの配慮を忘れることがあるから、少し立ち止まる習慣を持つといいんダ🐼',
                    '丙戌_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「乾いた大地でさらに激しく燃える炎のような人」ンダ。信念のために全力で闘う姿勢と、圧倒的な存在感があるんだよ。正義感が強くて、不公平を見ると黙っていられないタイプンダ。感情の温度を少し意識して、大切な人が受け止めやすいペースで伝えていくといいんダ🐼',
                    '丁亥_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「深い水の底で輝く灯火のような人」ンダ。深い感受性と直感力があって、他者の見えないものを感じ取る鋭さがあるんダよ。表面は穏やかでミステリアスだけど、内側には消えることのない温かい炎があるタイプンダ。感情が揺れたときは一人の時間を大切にして、自分を整えていくといいんダ🐼',
                    '丁亥_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「深い水底に揺れる炎のような、相反する力を内包した人」ンダ。直感が鋭くて、霊感的なセンスを持っているんダよ。内省的で深い思考を持ちながら、大切な人への感情は燃えるように激しいタイプンダ。その強烈な内面世界を理解してくれる相手と、本当の意味でつながれるんダ🐼',
                    '戊子_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「水の気を蓄える大地のような人」ンダ。安定感と知性を兼ね備えていて、冷静に状況を判断して揺るぎない存在感で周りを安心させられるんダよ。包容力と論理的思考が融合しているタイプンダ。感情を理性でコントロールしすぎず、温かさを意識して表現することで、もっと深いつながりが生まれるんダ🐼',
                    '戊子_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「大きな川も静かに飲み込む大地のような人」ンダ。何事にも動じない精神的な安定があって、周りが自然と頼りにするタイプンダよ。知的で冷静で、感情より長期的な判断を重視できる強さがある。感情表現を少し増やすだけで、あなたの深さがもっと伝わるんダ🐼',
                    '己丑_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「肥沃な大地に重なる田畑のような人」ンダ。穏やかで誠実で、地道な努力を惜しまない信頼感があるんダよ。自分のペースを守りながら確実に前進して、言ったことは必ず実行するタイプンダ。変化を少しずつ楽しんでみると、さらに大きく成長できるんダ🐼',
                    '己丑_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「二重の大地が重なるような揺るぎない誠実さを持つ人」ンダ。信頼を最も大切にして、その信頼を守るためなら多大な努力を惜しまないんだよ。目立たない日々の積み重ねで確かな実力をつけていくタイプンダ。価値観の違う人との関係を少し受け入れてみると、世界がさらに広がるんダ🐼',
                    '庚寅_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「虎の気に乗る鋼の意志を持つ人」ンダ。勇気と行動力があって、大きな目標に向かって果敢に進める力があるんダよ。チャレンジ精神が旺盛で、困難に立ち向かう強さがあるタイプンダ。感情より行動が先走ることがあるから、相手の気持ちをゆっくり確認する姿勢も大切なんダ🐼',
                    '庚寅_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「虎の勇気を持つ鋼のような不屈の人」ンダ。どんな障害も力で突破しようとする不屈の精神があって、自分の力で運命を切り開くことに誇りを持てるタイプンダよ。圧倒的な存在感と頼もしさがある。負けず嫌いを仲間への尊重に変えると、もっと大きなことを成し遂げられるんダ🐼',
                    '辛卯_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「草花に包まれた磨かれた宝石のような人」ンダ。繊細な感性と確かな実力があって、美意識と優しさが融合しているんだよ。外は柔らかく穏やかだけど、芯には折れない信念があるタイプンダ。批判的な言葉に必要以上に傷つくことがあるから、自分への優しさも忘れないでほしいんダ🐼',
                    '辛卯_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「草木のしなやかさに磨かれた宝石のような人」ンダ。外見の柔らかさと内面の鋭さが共存する独特の魅力があるんだよ。審美眼が高くて、才能を美しい形で表現できるタイプンダ。感覚的に一致する相手を信じて、その感受性を大切に生かしていくといいんダ🐼',
                    '壬辰_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「龍の気に乗る大河のような人」ンダ。知的で包容力があって、スケールの大きな思考と行動力があるんだよ。時間をかけて大きなことを成し遂げる大器晩成型のタイプンダ。決断に時間がかかる傾向があるから、時には直感を信じて動いてみるといいんダ🐼',
                    '壬辰_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「龍のように天地を駆ける知性と洞察力を持つ人」ンダ。物事の本質を深いところで理解して、長期的な視点で戦略を立てられるんだよ。自然とリーダーの立場に立つカリスマ的な吸引力があるタイプンダ。感情の波を自覚して自己管理を意識すると、その力が最大限に発揮されるんダ🐼',
                    '癸巳_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「炎の気を受ける清らかな雨水のような人」ンダ。静かな知性と内なる情熱があって、感性と直感の鋭さが際立っているんだよ。表面は謙虚で落ち着いて見えても、内側には強い意志と情熱があるタイプンダ。感情と理性のバランスを取りながら、直感を信じて動くといいんダ🐼',
                    '癸巳_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「炎と水が相互作用する神秘的なエネルギーを持つ人」ンダ。感性が研ぎ澄まされていて、見えない世界を感じ取るセンスがあるんだよ。本質を追い求めて精神的な深みを持つタイプンダ。地に足のついた視点も大切にしながら、その感性を信じて歩んでいくといいんダ🐼',
                    '甲午_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「情熱の炎に燃え立つ大木のような人」ンダ。情熱と信念があって、まっすぐに目標に向かって全力で走れるエネルギーがあるんだよ。周りを引っ張るリーダーシップがあるタイプンダ。信念が強すぎると相手の意見を聞けなくなることがあるから、受け入れる姿勢を意識してみるといいんダ🐼',
                    '甲午_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「情熱の炎に燃え立つ圧倒的な生命力を持つ人」ンダ。どんな困難も成長の機会と捉える強靭な精神があって、理想が高くて向上心が強いんだよ。深く本気で愛して、相手の成長を全力で応援できるタイプンダ。完璧主義を少し手放して、相手の人間らしさも愛してみるといいんダ🐼',
                    '乙未_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「夏の大地に根付く草花のような人」ンダ。温かみと粘り強さがあって、人を大切にして関係を長く育てることに喜びを感じるタイプンダよ。相手の気持ちに寄り添って、自分より相手の幸せを優先できる優しさがある。尽くしすぎず、適切な距離感を保つことも大切なんダ🐼',
                    '乙未_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「夏の大地で力強く育つ草花のような生命力を持つ人」ンダ。人と人のつながりを最も大切にして、周りを温かく包み込める存在ンダよ。相手の気持ちを受け止める容量が大きくて、自然と相談される立場になるタイプンダ。感情移入が深すぎると消耗することがあるから、自分を癒す時間も大切にしてほしいんダ🐼',
                    '丙申_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「鋭い金属の気と交差する太陽のような人」ンダ。明るい行動力と知的な戦略眼があって、魅力と実力を兼ね備えているんだよ。場の雰囲気を盛り上げながら、内側では冷静に分析できるタイプンダ。気が多い面があるから、一つのことに深く集中する時間を意識的に作るといいんダ🐼',
                    '丙申_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「金属を溶かす炎のような圧倒的なエネルギーと変革力を持つ人」ンダ。停滞を嫌って常に前進しようとするパワーがあって、知的で行動的なタイプンダよ。アイデアを即座に実行に移せる能力がある。そのエネルギーを相手のペースに合わせながら使うと、もっと大きなことを動かせるんダ🐼',
                    '丁酉_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「磨かれた鏡に映る灯火のような人」ンダ。繊細な感性と内なる輝きがあって、洞察力と芸術的センスがあるんだよ。表面は控えめだけど、内側に強いこだわりと美意識があるタイプンダ。完璧主義が自分に向いたとき、十分にやれていると自分を認めてあげることも大切なんダ🐼',
                    '丁酉_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「金属の鏡に映る炎のような鋭い知性と情熱を持つ人」ンダ。洞察力が鋭くて、人の本音や隠れた才能を見抜く力があるんダよ。芸術や美への感受性が特に高いタイプンダ。感情を直接表現することが苦手なら、好意を小さな行動で示すことから始めてみるといいんダ🐼',
                    '戊戌_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「大地に重なる大山のような人」ンダ。どっしりとした安定感と揺るぎない信念があって、時間をかけて確実に目標を達成できるんだよ。精神的な重厚さと持続力が際立っているタイプンダ。変化を少し楽しむ余裕を持つと、関係がさらに豊かになるんダ🐼',
                    '戊戌_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「二重の山が重なる絶対的な存在感と不動の意志を持つ人」ンダ。精神的な強さが際立っていて、どんな嵐にも揺るがない安定があるんだよ。深い思慮と忍耐力で長期的な視点から物事を判断できるタイプンダ。その頑固さも魅力のうちだから、大切なところだけ少し柔軟にするといいんダ🐼',
                    '己亥_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「水の気に潤された柔らかな土地のような人」ンダ。柔らかな包容力と深い感受性があって、誰に対しても分け隔てなく優しくできるんダよ。困っている人を放っておけない温かい心があるタイプンダ。境界線が曖昧になりやすいから、自分の感情も同じくらい大切にしてほしいんダ🐼',
                    '己亥_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「深い水に潤された大地のような生命力と包容力を持つ人」ンダ。人の気持ちを吸収する能力がとても高くて、場の感情を敏感に察せるんだよ。母なる大地のような大きな愛情があって、人を育て支えることに喜びを感じるタイプンダ。時には自分の感情と境界線を大切にすることが必要なんダ🐼',
                    '庚子_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「知の泉に浸される鋼の意志を持つ人」ンダ。鋭い知性と決断力があって、冷静に物事を分析して的確に判断できるんだよ。頭の回転が速くて、論理的思考と実行力が融合しているタイプンダ。温かさを行動でも意識的に表現すると、もっと深いつながりが生まれるんダ🐼',
                    '庚子_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「知の泉に磨かれた鋼のような深い知性を持つ人」ンダ。思考の鋭さと洞察力が際立っていて、本質をクリアに見通せるんだよ。知的な会話と論理的な問題解決に喜びを感じるタイプンダ。感情より頭が先に動くから、心で感じることにも少し耳を傾けてみるといいんダ🐼',
                    '辛丑_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「大地に守られた磨かれた宝石のような人」ンダ。地道な努力と高い美意識があって、才能と堅実さが融合しているんダよ。目立つことを好まずに内側から着実に力をつけていくタイプンダ。自分の感情を内にため込まず、少しずつ表現していくと関係がさらに深まるんダ🐼',
                    '辛丑_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「大地に守られた宝石のような揺るぎない価値と美しさを持つ人」ンダ。自分の才能と美意識を深い確信を持って表現できるんだよ。地道な積み重ねで磨かれた実力が、長い目で見ると輝き続けるタイプンダ。その誠実さと美意識を信じて、自分のペースで進んでいけば大丈夫なんダ🐼',
                    '壬寅_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「虎の勢いと融合する大河のような人」ンダ。知性と勇気があって、新しい道を開拓する力があるんダよ。思考力と実行力が高いレベルで融合しているタイプンダ。飽きっぽい面があるから、大切なことへの意識的なコミットメントが関係を深める鍵になるんダ🐼',
                    '壬寅_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「虎のように知性と行動力を融合した圧倒的な推進力を持つ人」ンダ。知的好奇心が尽きることなく、常に新しい世界を探求し続けられるんだよ。洞察力と行動力が同時に発揮されるとき、驚くべき結果が生まれるタイプンダ。感情より知性が先に立つ分、心で感じることにも意識を向けていくといいんダ🐼',
                    '癸卯_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「柔らかな草木に染み込む清らかな水のような人」ンダ。穏やかな外見の中に鋭い感受性と洞察力があって、人の気持ちを言葉にしなくても理解できるんだよ。深い感情的つながりを求めるタイプンダ。精神的な疲れを一人で溜め込まず、信頼できる人に話してみるといいんダ🐼',
                    '癸卯_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「草木をしっとりと潤す清水のような深い感性と包容力を持つ人」ンダ。人の感情の機微を言語化できない部分まで感じ取れる特別な能力があるんだよ。内省的で豊かな内面世界があって、それが独自の魅力になっているタイプンダ。その感受性を守りながら、自分を保つエネルギーも大切にしてほしいんダ🐼',
                    '甲辰_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「龍の霊気を受ける大木のような人」ンダ。視野が広くてスケールの大きな目標を持てるタイプンダよ。理想と実行力が融合していて、大きなビジョンを着実に実現していける力がある。目標が大きいから、自分を大切にする時間も同じくらい確保するといいんダ🐼',
                    '甲辰_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「龍のエネルギーを受けた壮大な大木のような人」ンダ。理想の高さと実行力が際立っていて、大きな目標を持って人生を歩める力があるんだよ。周りに自然と希望を与えるリーダーシップがあるタイプンダ。理想が高いからこそ、現実の相手の人間らしさも愛する視点を大切にしてほしいんダ🐼',
                    '乙巳_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「太陽の炎に輝く草花のような人」ンダ。柔軟性と内なる情熱があって、変化への適応力が高いタイプンダよ。変化する環境の中でも自分らしさを失わず、しなやかに対応できる。感情表現が豊かで、相手への思いをストレートに伝えられる強みがあるんダ🐼',
                    '乙巳_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「太陽の炎を浴びて輝く草花のような輝かしいエネルギーを持つ人」ンダ。内なる情熱と外の世界への感受性が融合した独自の魅力があるんダよ。変化を恐れず、むしろ変化の中で最も輝けるタイプンダ。情熱と安定のバランスを意識していくと、さらに深い関係を築いていけるんダ🐼',
                    '丙午_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「二重の太陽のような圧倒的な輝きを持つ人」ンダ。情熱的で行動力に満ちていて、その場を明るく照らす存在感があるんだよ。人を惹きつける圧倒的なカリスマ性があるタイプンダ。熱しやすく冷めやすい面があるから、大切な関係には意識的に時間をかけるといいんダ🐼',
                    '丙午_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「二重の太陽のような灼熱のエネルギーと存在感を持つ人」ンダ。生まれながらのカリスマで、どんな場所でも自然と中心になれるんダよ。情熱と行動力は群を抜いていて、多くの人を照らす存在ンダ。その炎の強さをコントロールして、大切なものを守る方向に使っていくといいんダ🐼',
                    '丁未_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「豊かな大地を温める穏やかな炎のような人」ンダ。温かみと粘り強さがあって、人の心を動かす力があるんDよ。じっくりと関係を温めて、長期的に人の心に働きかけられるタイプンダ。変化を少し楽しむ余裕を持つと、関係がさらに豊かになるんダ🐼',
                    '丁未_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「豊かな大地を長く温め続ける炎のような穏やかだが揺るぎない情熱を持つ人」ンダ。表面の温かさの奥に消えることのない強い意志があるんダよ。長期的なコミットメントを大切にして、時間をかけて築いた関係を何より重視するタイプンダ。変化に対応する力を少しずつ育てると、さらに豊かな人生が広がるんダ🐼',
                    '戊申_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「鋭い金属の気を宿す大地のような人」ンダ。安定感と行動力があって、目標に向かって着実に動いて結果を出せるんだよ。実用性と堅実さが融合しているタイプンダ。感情表現を少し増やすと、大切な人にあなたの気持ちがもっと伝わるんダ🐼',
                    '戊申_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「鋭い金属を内包する大地のような圧倒的な安定感と潜在的な鋭さを持つ人」ンダ。外は穏やかだけど、内には強い判断力と意志があるんダよ。何事にも堅実に取り組んで、信頼される存在になれるタイプンダ。感情表現を少し意識的にしてみると、パートナーとの距離がさらに縮まるんダ🐼',
                    '己酉_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「宝石を磨く田畑の土のような人」ンダ。謙虚さと確かな実力があって、丁寧な努力と美意識が融合しているんだよ。目立たない場所でコツコツと力をつけて、時が来たときに輝きを放つタイプンダ。自分の魅力を十分に信じて、もっと自分を表に出してみるといいんダ🐼',
                    '己酉_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「宝石を静かに磨き続ける大地のような人」ンダ。謙虚さの中に揺るぎない価値があって、一度信頼した相手への誠実さは本物なんだよ。実力より謙虚さを前面に出すタイプだから、自分の才能をもっと積極的に表現してみるといいんダ🐼',
                    '庚戌_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「乾いた大地に宿る鋼のような人」ンダ。強い意志と誠実さがあって、言ったことは必ず実行する実直さがあるんだよ。自分に厳しく、信頼の厚い存在になれるタイプンダ。頑固すぎると摩擦が生まれることがあるから、時には柔軟さも意識してみるといいんダ🐼',
                    '庚戌_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「乾いた大地で鍛えられた鋼のような強靭な意志と誠実さを持つ人」ンダ。自分の価値観と信念を生き様で体現する、骨太な人格があるんだよ。困難な状況でも義理と誠実さを曲げない強さがあるタイプンダ。融通が利かない面があるから、相手に合わせる意識を少し持つと、関係がもっとスムーズになるんダ🐼',
                    '辛亥_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「深い水の気に包まれた磨かれた宝石のような人」ンダ。繊細な感受性と鋭い知性があって、神秘的な魅力があるんだよ。表面はクールで独立的に見えても、内側に豊かな感情世界があるタイプンダ。心を開くまでに時間がかかるのはあなたらしさだから、そのペースを大切にしていいんダ🐼',
                    '辛亥_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「深い水の気に抱かれた孤高に輝く宝石のような人」ンダ。鋭い洞察力と独自の美意識が融合した稀有な才能があるんだよ。内省的で精神世界が豊かで、芸術や哲学への感受性が際立っているタイプンダ。理想が高いからこそ、相手の人間らしさを愛する視点を大切にしていくといいんダ🐼',
                    '壬子_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「清らかな水源から流れ出す大河のような人」ンダ。知性と感受性が高いレベルで融合していて、直感と論理の両方で判断できる深みがあるんだよ。知的なつながりと感情的な深さを同時に求めるタイプンダ。感情の波を自覚して、信頼できる人に話すことで、もっと楽になれるんダ🐼',
                    '壬子_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「二重の水が渦を巻く底知れない知性と感受性を持つ人」ンダ。人の深層心理を読む力が特に鋭くて、言葉の裏にある意図を感じ取れるんだよ。思考の深さと広さが際立っているタイプンダ。内面世界が豊かすぎて孤独を感じやすいから、本当に理解してくれる人との時間を大切にしてほしいんダ🐼',
                    '癸丑_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「肥沃な大地に染み込む清らかな水のような人」ンダ。内省的な知性と安定した誠実さがあって、目立たないながらも着実に力を蓄えられるんだよ。思慮深くて持続力があるタイプンダ。感情表現にタイムラグがあるから、気持ちをリアルタイムで伝える練習をしてみるといいんダ🐼',
                    '癸丑_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「肥沃な大地を潤し続ける清水のような静かで揺るぎない誠実さと深みを持つ人」ンダ。表面は穏やかで目立たないけど、内側には豊かな感情世界と強い信念があるんだよ。人を長期的に支え続ける持続力と包容力が際立っているタイプンダ。愛情が伝わりにくい分、少し行動で示してみると関係がもっと深まるんダ🐼',
                    '甲寅_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「虎の勢いに乗る大木のような人」ンダ。強いリーダーシップと挑戦心があって、新しいことへのチャレンジを恐れない力があるんだよ。自分の道を切り開いて、相手を守り前に進む力強さがあるタイプンダ。相手のペースも大切にしながら動くと、もっと大きなことを成し遂げられるんダ🐼',
                    '甲寅_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「虎のように力強く茂る圧倒的な生命力と独立心を持つ人」ンダ。自分の力で道を切り開く意志の強さは他の追随を許さないんだよ。困難に立ち向かう勇気とリーダーとしての資質があるタイプンダ。強さの裏の繊細さを、信頼できる人に見せられたとき、本当の意味でつながれるんダ🐼',
                    '乙卯_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「草花の気に包まれる草花のような人」ンダ。優しさと芸術的感性があって、人への思いやりが自然とあふれるタイプンダよ。相手の感情に寄り添って、心のつながりを何より大切にできる。傷つきやすい繊細さがあるから、自分への優しさも忘れずにいてほしいんダ🐼',
                    '乙卯_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「春の草花が満開に咲き乱れるような豊かな感受性と優しさを持つ人」ンダ。人の気持ちに共感する力が特に高くて、その温かさで多くの人を癒せるんだよ。芸術や美への感受性が鋭いタイプンダ。感受性が強すぎると自分を見失うことがあるから、自分の軸を持ち続けることが大切なんダ🐼',
                    '丙辰_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「龍の霊気に乗る太陽の炎のような人」ンダ。情熱とスケールの大きな思考があって、カリスマ的な魅力があるんだよ。理想が高くて大きなビジョンを持ちながら情熱的に行動できるタイプンダ。理想と現実のギャップを楽しみながら、少しずつ形にしていくといいんダ🐼',
                    '丙辰_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「龍の霊気を受けた太陽のような壮大なビジョンと情熱を持つ人」ンダ。高い理想と圧倒的な行動力が融合して、大きな夢を実現しようとする力があるんダよ。カリスマ性と感化力があって、多くの人にインスピレーションを与えられるタイプンダ。完璧主義を少し手放して、プロセスも楽しんでみるといいんダ🐼',
                    '丁巳_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「巳の炎気に揺れる灯火のような人」ンダ。繊細な内面と秘めた情熱があって、感受性と直感力が際立っているんだよ。表面は穏やかで謙虚だけど、内側には消えることのない情熱と強い意志があるタイプンダ。感情の揺れを自分のリズムとして受け入れて、信頼できる人と分かち合えるといいんダ🐼',
                    '丁巳_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「巳の炎に揺れる灯火のような深い知恵と内なる情熱を持つ人」ンダ。表面の穏やかさの奥に誰にも消せない信念と感情の炎があるんだよ。洞察力と直感が特に鋭いタイプンダ。その感情の深さを信じて、本当に理解し合える相手との時間を大切にしてほしいんダ🐼',
                    '戊午_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「情熱の炎を宿す大地のような人」ンダ。安定感と情熱的なエネルギーがあって、存在感が大きいタイプンダよ。真剣で情熱的に関係を築いて、一度決めたら全力で向き合える。感情が高ぶったときは少し深呼吸して、周りへの配慮を忘れないようにするといいんダ🐼',
                    '戊午_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「情熱の炎を内包した大地のような安定感と熱い信念を持つ人」ンダ。穏やかに見えて内側に強い使命感があって、信じたことのために全力で行動できるんだよ。信頼と義理を何より大切にするタイプンダ。頑固さが出たとき、変化を少し楽しんでみると、さらに大きな可能性が開けるんダ🐼',
                    '己未_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「豊かな夏の土に重なる田畑のような人」ンダ。穏やかな包容力と実直な誠実さがあって、人間関係を丁寧に育てられるんだよ。長期的な信頼を積み上げていくタイプンダ。自分を後回しにしすぎず、同じくらい自分のことも大切にしていくといいんダ🐼',
                    '己未_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「豊かな大地が重なるような深い包容力と揺るぎない誠実さを持つ人」ンダ。人を受け入れ支える力が際立っていて、周りの拠り所になれるんだよ。目立たない献身と積み重ねで長い時間をかけて深い信頼を築いていくタイプンダ。変化の中に可能性を見つけていくと、さらに豊かな人生が広がるんダ🐼',
                    '庚申_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「金属の気に磨かれる鋼のような人」ンダ。鋭い知性と実行力があって、冷静かつ迅速に状況を判断できるんだよ。分析力と決断力が際立っているタイプンダ。感情的なつながりを大切にする人には、論理だけでなく温かさも伝えていくといいんダ🐼',
                    '庚申_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「金属が金属を磨く孤高の鋭さと完成された実力を持つ人」ンダ。思考の精度と行動の正確さが際立っていて、どんな問題も冷静に解決できるんだよ。自分の基準に妥協しない強い意志があるタイプンダ。完璧主義を少し手放すと、もっと自由に生きられるんダ🐼',
                    '辛酉_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「さらに宝石の輝きを受ける磨かれた宝石のような人」ンダ。高い美意識と洗練された感性があって、細部への徹底したこだわりと完成度への追求心があるんだよ。上品な魅力があるタイプンダ。完璧主義が自分へ向いたとき、十分に素敵だと認めてあげることも大切なんダ🐼',
                    '辛酉_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「最高に磨かれた完璧な美意識と孤高の輝きを持つ人」ンダ。美に関する感性と才能が際立っていて、その世界においては圧倒的な存在感があるんだよ。自分の価値観と美意識を妥協なく追求できるタイプンダ。完璧より人間らしさを大切にする視点を持つと、さらに深いつながりが生まれるんダ🐼',
                    '壬戌_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「乾いた大地を潤す大河のような人」ンダ。知性と誠実さがあって、状況を冷静に見渡して長期的な視点で判断できるんだよ。信頼できる存在になれるタイプンダ。ロマンティックな表現が少なくなることがあるから、時には温かさを意識して伝えてみるといいんダ🐼',
                    '壬戌_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「乾いた大地に深く染み込む大河のような忍耐強い知性と誠実さを持つ人」ンダ。長い時間をかけて確かなものを築く力があって、大器晩成型の輝きがあるんだよ。洞察力が鋭くて物事の本質を静かに見続けられるタイプンダ。愛情を行動で示すことも意識してみると、関係がさらに深まるんダ🐼',
                    '癸亥_普通格局': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「深い水に流れ込む清らかな水のような人」ンダ。深い感受性と霊感的な直感があって、人の感情の深層まで理解できるんだよ。神秘的な魅力がある唯一無二のタイプンダ。感受性が強すぎると精神的に疲れやすいから、自分を癒す時間を定期的に持つことが大切なんダ🐼',
                    '癸亥_従旺格': 'あなたの命式、ちゃんと読んだんダよ🐼 一言で言うと「深海のような底知れない感受性と洞察力を持つ人」ンダ。人間の感情と深層心理への理解が極めて深くて、言葉にならない何かを感じ取る能力があるんだよ。独自の精神世界を持つ比類ない魅力があるタイプンダ。本当の意味でわかり合える人との深いつながりを大切に育てていってほしいんダ🐼',
                  };
                  // ── 5セクション統合 総合鑑定文 ──────────────────────────
                  const myNikchu = calc.pillars.day.kan + calc.pillars.day.shi;
                  const myKakuType = (kakukyoku && kakukyoku.indexOf('従旺') >= 0) ? '従旺格' : '普通格局';
                  const myProfileKey = myNikchu + '_' + myKakuType;
                  const baseProfileJa = NIKCHU_SELF_PROFILES[myProfileKey] || NIKCHU_SELF_PROFILES[myNikchu + '_普通格局'] || '';
                  const baseProfileKr = NIKCHU_SELF_PROFILES_KR[myProfileKey] || NIKCHU_SELF_PROFILES_KR[myNikchu + '_普通格局'] || '';
                  // KR データが空なら JA にフォールバック
                  const baseProfile = (currentLang === 'kr' && baseProfileKr) ? baseProfileKr : baseProfileJa;

                  // 五行バランス：最強・最弱
                  const gv = M.gokyo;
                  const gogyoArr = [
                    {g:'木',v:gv.moku},{g:'火',v:gv.hi},{g:'土',v:gv.do},{g:'金',v:gv.kin},{g:'水',v:gv.sui}
                  ].sort((a,b)=>b.v-a.v);
                  const topG = gogyoArr[0];
                  const botG = gogyoArr[gogyoArr.length-1];
                  const gogyoText = (currentLang === 'kr')
                    ? buildGogyoText_KR(topG)
                    : `命式全体を見ると「${topG.g}」のエネルギーが最も強く（${Math.round(topG.v)}点）、${topG.g==='木'?'成長・創造・共感':topG.g==='火'?'情熱・表現・行動力':topG.g==='土'?'安定・誠実・包容力':topG.g==='金'?'意志・美意識・決断':'知性・感受性・直感'}が個性の核になっているんダ。`;
                  const weakText = (currentLang === 'kr')
                    ? buildWeakText_KR(botG)
                    : (botG.v === 0
                      ? `逆に「${botG.g}」はゼロで、${botG.g==='木'?'柔軟性・共感':botG.g==='火'?'情熱・自己表現':botG.g==='土'?'安定・継続力':botG.g==='金'?'決断・意志力':'知性・直感'}の面が課題になりやすいんダよ。`
                      : `「${botG.g}」が最も少ない（${Math.round(botG.v)}点）から、意識的に補うといいんダ。`);

                  // 格局・喜忌神
                  const isJuou = kakukyoku && kakukyoku.indexOf('従旺') >= 0;
                  const kakuText = isJuou
                    ? `格局は「${kakukyoku}」——命式のエネルギーが一方向に集中した特別な型ンダ。`
                    : `格局は「普通格局」で、5つの五行がバランスよく命式に分布しているんダ。`;
                  const kiText = (currentLang === 'kr')
                    ? buildKiText_KR(ki, kj)
                    : (ki ? `喜神は「${ki}」で、この気が流れてくる時期・場所・人が最大の追い風になるンダ。忌神「${kj}」の気が強い環境は消耗しやすいから注意が必要ンダよ。` : '');

                  // 通変星：最強
                  const tsSrc = (() => {
                    const JIKKAN_KK2 = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
                    const JIKKAN_GG2 = ['木','木','火','火','土','土','金','金','水','水'];
                    const ZOKAN_M = {子:['壬','癸'],丑:['己','癸','辛'],寅:['甲','丙','戊'],卯:['乙'],辰:['戊','乙','癸'],巳:['丙','庚','戊'],午:['丁','己'],未:['己','丁','乙'],申:['庚','壬','戊'],酉:['辛'],戌:['戊','辛','丁'],亥:['壬','甲']};
                    const SEI2={木:'火',火:'土',土:'金',金:'水',水:'木'};
                    const KOKU2={木:'土',火:'金',土:'水',金:'木',水:'火'};
                    const dK = calc.pillars.day.kan;
                    function ts2(ni,ti){const ni2=JIKKAN_KK2.indexOf(ni),ti2=JIKKAN_KK2.indexOf(ti);if(ni2<0||ti2<0)return'─';const ng=JIKKAN_GG2[ni2],tg=JIKKAN_GG2[ti2],s=(ni2%2)===(ti2%2);if(ng===tg)return s?'比肩':'劫財';if(SEI2[ng]===tg)return s?'食神':'傷官';if(KOKU2[ng]===tg)return s?'偏財':'正財';if(SEI2[tg]===ng)return s?'偏官':'正官';if(KOKU2[tg]===ng)return s?'偏印':'正印';return'比肩';}
                    const cnt={};
                    ['year','month','hour'].forEach(k=>{const p=calc.pillars[k];if(!p)return;cnt[ts2(dK,p.kan)]=(cnt[ts2(dK,p.kan)]||0)+1;});
                    Object.values(calc.pillars).forEach(p=>{if(!p)return;const zk=ZOKAN_M[p.shi]||[];zk.forEach(z=>{cnt[ts2(dK,z)]=(cnt[ts2(dK,z)]||0)+0.5;});});
                    return Object.entries(cnt).filter(([k])=>k!=='─').sort((a,b)=>b[1]-a[1]);
                  })();
                  const topTs = tsSrc[0]?.[0] || '';
                  const TS_DESC = {'比肩':'独立心が強く自分の力で道を切り開く','劫財':'勝負強さと競争心がある','食神':'自己表現・才能・創造性が豊か','傷官':'圧倒的な才能と反骨心がある','偏財':'行動力でお金と縁を引き寄せる','正財':'着実な努力で財を積み上げる','偏官':'強いプレッシャーで実力を発揮する','正官':'社会的評価と秩序を重んじる','偏印':'直感と学習能力が高い','正印':'学問・知識・保護との縁が深い'};
                  const tsText = topTs ? `通変星では「${topTs}」が最も強く命式に出ていて、${TS_DESC[topTs]||''}タイプンダ。` : '';

                  // 十二運星（日柱）
                  const dayUnsei = calc.pillars.day.unsei || calc.pillars.day.juniunsei || '';
                  const JUNIU_SHORT = {'長生':'才能が育ち続ける成長型','沐浴':'感受性が高く変化の多い','冠帯':'才能が開花し始める','建禄':'エネルギーが充実した実力発揮型','帝旺':'最もエネルギーが強い全盛型','衰':'経験を活かす成熟型','病':'内省が深い繊細型','死':'転換と再生のエネルギーを持つ','墓':'内に力を蓄える蓄積型','絶':'新サイクルへの転換点にいる','胎':'新しい可能性が宿り始めている','養':'育まれ守られる養成型'};
                  const juniuText = dayUnsei ? `日柱の十二運星は「${dayUnsei}」——${JUNIU_SHORT[dayUnsei]||''}んダ。` : '';

                  // 大運テキスト
                  // 普通格局の意味を充実
                  const kakuDetailText = (currentLang === 'kr')
                    ? buildKakuDetailText_KR(isJuou, kakukyoku)
                    : (isJuou
                      ? `格局は「${kakukyoku}」——命式のエネルギーが一方向に集中した特別な型ンダ。その五行の流れに乗って生きることで本来の力が最大化されるんダよ。`
                      : `格局は「普通格局」——5つの五行が命式にバランスよく分布している型ンダ。これは「どんな状況でも対応できる柔軟性を持つ」ということで、特定の分野に特化した才能より、幅広い場面で力を発揮できる強さがあるんダよ。`);

                  // 通変星の詳細テキスト
                  const TS_DETAIL2 = {
                    '比肩':'他人に頼らず自分の足で立つ独立心が強いんダ。競争を力に変えて、自分のペースで道を切り開いていくタイプンダよ。',
                    '劫財':'勝負どころで底力を発揮する星ンダ。仲間を巻き込む力があって、グループで動くときに特に輝くんダよ。',
                    '食神':'自己表現と創造性が際立った星ンダ。話術・芸術・グルメなど「楽しむ力」が才能になっていて、自分らしく生きるほど輝けるんダよ。',
                    '傷官':'圧倒的な才能と個性を持つ星ンダ。型にはまらない独自の感性があって、権威や常識への反骨心がむしろ才能の源泉になっているんダよ。',
                    '偏財':'動くことでお金と縁を引き寄せる星ンダ。行動力と社交性が財運につながっていて、じっとしているより動いた方が結果が出やすいタイプンダよ。',
                    '正財':'着実な努力で財を積み上げる星ンダ。一歩一歩丁寧に積み上げることで信頼と財の両方を手に入れていくタイプで、堅実さが最大の武器ンダよ。',
                    '偏官':'強いプレッシャーの中でこそ実力を発揮する星ンダ。厳しい環境や競争の激しい世界を舞台に、真価を発揮できるタイプンダよ。',
                    '正官':'社会的評価と誠実さを体現する星ンダ。ルールを守り信頼を積み上げることで地位と評価を手に入れていくタイプで、正直さが最大の強みンダよ。',
                    '偏印':'直感力と学習能力が高い星ンダ。型破りな発想と知的好奇心があって、教わるより自分で気づいて吸収する力が強いんダよ。母親・恩師・異質なサポーターとの縁が深いんダ。',
                    '正印':'学問・知識・文化への深い縁を持つ星ンダ。周りの人から自然に守られやすく、上の人や目上の人との縁が強い。資格・学問・専門性を磨くほど輝いていくんダよ。',
                  };
                  const tsTextDetail = topTs ? `通変星では「${topTs}」が最も強く命式に出ているんダ。${TS_DETAIL2[topTs]||''}` : '';

                  // 十二運星：固定の気質として説明
                  const JUNIU_NATURE = {
                    '長生':'生まれながらに「成長し続ける気質」を持っているんダ。好奇心が尽きず、どんな年齢になっても新しいことを吸収し続けられる性質があるんダよ。',
                    '沐浴':'生まれながらに「極めて豊かな感受性」を持っているんダ。感情の振れ幅が大きく、色気と多感さが個性の一部になっているんダよ。変化の多い人生を歩む傾向があるんダ。',
                    '冠帯':'生まれながらに「才能を形にする力」を持っているんダ。成長していく過程で本来の力が開花していくタイプで、努力が着実に結果につながる気質ンダよ。',
                    '建禄':'生まれながらに「充実したエネルギー」を持っているんダ。自立心が強く、自分の実力で道を切り開く力が備わっているんダよ。',
                    '帝旺':'生まれながらに「最強のエネルギー」を持っているんダ。カリスマ性と主体性が際立っていて、自然と存在感を放つ気質があるんダよ。',
                    '衰':'生まれながらに「経験を知恵に変える気質」を持っているんダ。派手さより深みを持ち、着実に積み上げることで本来の力を発揮するタイプンダよ。',
                    '病':'生まれながらに「繊細で鋭い感受性」を持っているんダ。直感力・芸術性・内省の深さが際立っていて、その繊細さ自体が才能の源泉になっているんダよ。',
                    '死':'生まれながらに「変革と再生のエネルギー」を持っているんダ。過去に執着せず次のステージへ進む力があって、転換期に最も力を発揮するタイプンダよ。',
                    '墓':'生まれながらに「内に力を蓄える気質」を持っているんダ。表には出にくいが底力と深みがあって、長期的に見れば圧倒的な力を持つタイプンダよ。',
                    '絶':'生まれながらに「転換と再創造の気質」を持っているんダ。既存の枠を超えて新しいサイクルを生み出す力があって、変化の局面で最も輝くタイプンダよ。',
                    '胎':'生まれながらに「可能性を内包する気質」を持っているんダ。目に見えないところで力を育てていく性質があって、じっくり熟成させるほど本来の力が深まっていくんダよ。周りからは掴みどころがなく見えることもあるが、その内側には豊かな世界がある。',
                    '養':'生まれながらに「環境に育まれる気質」を持っているんダ。人や環境から力をもらいながら成長するタイプで、良い師・良い環境・良い仲間との縁が人生を豊かにしていくんダよ。',
                  };
                  const juniuNatureText = (currentLang === 'kr')
                    ? buildJuniuNatureText_KR(dayUnsei)
                    : (dayUnsei ? `日柱の十二運星「${dayUnsei}」は、生まれ持った本質的な気質を示しているんダ。${JUNIU_NATURE[dayUnsei]||''}` : '');

                  // 大運テキストを充実
                  const duText = (currentLang === 'kr')
                    ? buildDuText_KR(duIki, duImi, ki, kj)
                    : (duIki
                      ? `そして今はちょうど喜神「${ki}」と大運が重なる追い風の時期ンダ。命式の強みが最大に発揮できるタイミングだから、積極的に動いていいんダよ。`
                      : duImi
                      ? `今は忌神「${kj}」が大運に流れている時期ンダ。命式にとって消耗しやすい流れだから、無理に攻めず守りを固めながら力を蓄える時期と考えるといいんダ。`
                      : `今の大運は命式に対して中立な流れンダ。大きな追い風も逆風もない時期だから、焦らず自分のペースで着実に積み上げていくのが一番ンダよ。`);

                  // 元命（月柱蔵干 × 日干 の通変星）— 節入り経過日数で 余気/中気/本気 を選定
                  const myGenmei = getGenmei(calc.pillars.day.kan, calc.pillars.month.shi, calc.pillars.month.daysFromSetsu);
                  const _genmeiTexts = getGenmeiTextsByLang(currentLang);
                  const myGenmeiData = myGenmei ? _genmeiTexts[myGenmei] : null;
                  // 元命テキストがあれば tsTextDetail を置換、無ければ従来の通変星説明を残す
                  const personaText = myGenmeiData ? myGenmeiData.text : tsTextDetail;
                  const popoText = `${baseProfile ? baseProfile + ' ' : ''}${gogyoText}${weakText}${kakuDetailText}${kiText}${personaText}${juniuNatureText}${duText}`;
                  // 天干×格局で特性カードを決定（20パターン）、なければ五行ベースにフォールバック
                  const traitKey = calc.pillars.day.kan + '_' + myKakuType;
                  const activeTraits = NIKCHU_TRAITS[traitKey] || persona.traits;
                  return (
                    <>
                      <PopoSpeech text={popoText} delay={0} />
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
                        {activeTraits.map((b, i) => (
                          <div key={i} style={{
                            flex: "1 1 120px", padding: "12px 14px", borderRadius: 12,
                            background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.18)",
                            display: "flex", alignItems: "flex-start", gap: 10,
                          }}>
                            <span style={{ fontSize: 20, flexShrink: 0 }}>{b.icon}</span>
                            <div>
                              <p style={{ fontFamily: "'Shippori Mincho',serif", fontSize: 13, color: C.gold, fontWeight: 700, marginBottom: 3 }}>{b.label}</p>
                              <p style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.5 }}>{b.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </Card>

              {/* ② 四柱表 */}
              <Card>
                <SectionLabel en="FOUR PILLARS · 四柱" ja="命式表（四柱）" />

                {/* 4柱カード横並び */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
                  {M.pillars.map((p, i) => {
                    const isDay = i === 2;
                    const isMonth = i === 1;
                    const zokan = M.zokan[i]?.zokan || [];
                    // 月柱のみ: 節入り経過日数から元命に該当する蔵干を算出（ハイライト用）
                    const genmeiKan = isMonth
                      ? getMonthZokan(p.shi, M._calc?.pillars?.month?.daysFromSetsu)
                      : null;
                    const GOGYO_COLOR = { '木':'#2a5a2a','火':'#a03020','土':'#6a4a20','金':'#7a6020','水':'#1a5a8a' };
                    const JIKKAN_G2 = ['木','木','火','火','土','土','金','金','水','水'];
                    const JIKKAN_L2 = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
                    const kanGogyo = JIKKAN_G2[JIKKAN_L2.indexOf(p.kan)] || '土';
                    const gc = GOGYO_COLOR[kanGogyo] || C.gold;
                    return (
                      <div key={i} style={{
                        borderRadius: 14,
                        border: isDay ? `1.5px solid ${C.gold}` : "1px solid rgba(80,60,30,0.18)",
                        background: isDay ? "#f0e4c8" : "#e8dcc0",
                        overflow: "hidden",
                        position: "relative",
                      }}>
                        {/* 柱ラベル */}
                        <div style={{
                          padding: "10px 0 8px",
                          textAlign: "center",
                          background: isDay ? "rgba(201,168,76,0.15)" : "rgba(80,60,30,0.06)",
                          borderBottom: "1px solid rgba(80,60,30,0.12)",
                        }}>
                          <p style={{ fontSize: 11, color: isDay ? "#8a6a20" : "#5a4a30", letterSpacing: "0.12em", fontWeight: isDay ? 700 : 400 }}>{p.label}</p>
                        </div>

                        {/* 天干 */}
                        <div style={{ padding: "16px 8px 10px", textAlign: "center", borderBottom: "1px solid rgba(80,60,30,0.10)" }}>
                          <p style={{ fontSize: 11, color: "rgba(60,40,20,0.4)", marginBottom: 6, letterSpacing: "0.1em" }}>天干</p>
                          {getTenkanIcon(p.kan) && (
                            <div style={{ width: 48, height: 48, margin: "0 auto 6px" }} dangerouslySetInnerHTML={{ __html: getTenkanIcon(p.kan) }} />
                          )}
                          <p style={{
                            fontSize: 44, fontFamily: "'Shippori Mincho',serif", fontWeight: 700, lineHeight: 1,
                            color: isDay ? "#8a6a20" : gc,
                          }}>{p.kan}</p>
                          <p style={{ fontSize: 12, color: isDay ? "#8a6a20" : "rgba(60,40,20,0.5)", marginTop: 6 }}>{getTenkanYomi(p.kan)}</p>
                          <p style={{ fontSize: 13, color: gc, marginTop: 4, fontWeight: 600 }}>{kanGogyo}</p>
                        </div>

                        {/* 地支 */}
                        {(() => {
                          const JUNISHI_G2 = ['水','土','木','木','土','火','火','土','金','金','土','水'];
                          const JUNISHI_L2 = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
                          const shiGogyo = JUNISHI_G2[JUNISHI_L2.indexOf(p.shi)] || '土';
                          const sgc = GOGYO_COLOR[shiGogyo] || "#5a4a30";
                          return (
                            <div style={{ padding: "14px 8px 10px", textAlign: "center", borderBottom: "1px solid rgba(80,60,30,0.10)" }}>
                              <p style={{ fontSize: 11, color: "rgba(60,40,20,0.4)", marginBottom: 6, letterSpacing: "0.1em" }}>地支</p>
                              {getChishiIcon(p.shi) && (
                                <div style={{ width: 48, height: 48, margin: "0 auto 6px" }} dangerouslySetInnerHTML={{ __html: getChishiIcon(p.shi) }} />
                              )}
                              <p style={{
                                fontSize: 44, fontFamily: "'Shippori Mincho',serif", fontWeight: 700, lineHeight: 1,
                                color: isDay ? "#8a6a20" : sgc,
                              }}>{p.shi}</p>
                              <p style={{ fontSize: 12, color: isDay ? "#8a6a20" : "rgba(60,40,20,0.5)", marginTop: 6 }}>{getChishiYomi(p.shi)}</p>
                              <p style={{ fontSize: 13, color: sgc, marginTop: 4, fontWeight: 600 }}>{shiGogyo}</p>
                            </div>
                          );
                        })()}

                        {/* 十神 */}
                        <div style={{ padding: "10px 6px", textAlign: "center", borderBottom: "1px solid rgba(80,60,30,0.10)" }}>
                          <p style={{ fontSize: 11, color: "rgba(60,40,20,0.4)", marginBottom: 4, letterSpacing: "0.1em" }}>十神</p>
                          <p style={{ fontSize: 14, color: isDay ? "#8a6a20" : "#3a3020", fontWeight: 600 }}>{p.jisshin || "—"}</p>
                        </div>

                        {/* 十二運 */}
                        <div style={{ padding: "10px 6px", textAlign: "center", borderBottom: "1px solid rgba(80,60,30,0.10)" }}>
                          <p style={{ fontSize: 11, color: "rgba(60,40,20,0.4)", marginBottom: 4, letterSpacing: "0.1em" }}>十二運</p>
                          <p style={{ fontSize: 14, color: "#4a3a20" }}>{p.unsei || "—"}</p>
                        </div>

                        {/* 蔵干（月柱は元命に該当する蔵干をゴールドで強調） */}
                        <div style={{ padding: "10px 6px 14px", textAlign: "center" }}>
                          <p style={{ fontSize: 11, color: "rgba(60,40,20,0.4)", marginBottom: 6, letterSpacing: "0.1em" }}>蔵干</p>
                          <div style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "center" }}>
                            {zokan.map((k, ki) => {
                              const isGenmei = isMonth && k === genmeiKan;
                              return (
                                <span key={ki} style={{
                                  fontSize: isGenmei ? 13 : 11,
                                  color: isGenmei ? "#8a6a20" : "#5a5040",
                                  fontFamily: "'Shippori Mincho',serif",
                                  fontWeight: isGenmei ? 700 : 400,
                                  letterSpacing: isGenmei ? '0.05em' : 'normal',
                                }} title={isGenmei ? '元命（月支採用蔵干）' : undefined}>
                                  {isGenmei ? '★' + k : k}
                                </span>
                              );
                            })}
                          </div>
                          {isMonth && genmeiKan && (
                            <p style={{ fontSize: 8, color: "#8a6a20", opacity: 0.7, marginTop: 4, letterSpacing: '0.05em' }}>★=元命</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 読み方ヒント */}
                <div style={{ padding: "10px 14px", background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)", fontSize: 12, color: C.textMuted, lineHeight: 1.8, marginBottom: 10 }}>
                  {langPick(AT.buildNichiPillarHint_JA, AT.buildNichiPillarHint_KR, M.nichi.kan, M.nichi.shi)}
                </div>

                <p style={{ fontSize: 10, color: "rgba(255,255,255,0.18)", letterSpacing: "0.05em" }}>
                  定気法 · 東京都 東経139.76° · +19分真太陽時補正済み
                </p>
              </Card>

              {/* ③ 五行バランス */}
              <Card>
                {/* アコーディオンヘッダー */}
                <div
                  onClick={() => toggleSection('gogyo')}
                  style={{
                    display:'flex', alignItems:'center', justifyContent:'space-between',
                    cursor:'pointer', padding:'4px 0 16px', userSelect:'none',
                    borderBottom: openSections['gogyo'] ? '1px solid rgba(201,168,76,0.15)' : 'none',
                    marginBottom: openSections['gogyo'] ? 20 : 0,
                  }}
                >
                  <div>
                    <p style={{ fontSize:10, letterSpacing:'0.4em', color:C.gold, fontFamily:'sans-serif', marginBottom:6, opacity:0.8 }}>FIVE ELEMENTS · 五行</p>
                    <h2 style={{ fontFamily:"'Shippori Mincho', serif", fontSize:22, color:C.text, fontWeight:700 }}>五行バランス</h2>
                  </div>
                  <div style={{ fontSize:16, color:C.gold, opacity:0.7, transition:'transform 0.25s', transform: openSections['gogyo'] ? 'rotate(180deg)' : 'rotate(0deg)', marginLeft:16, flexShrink:0 }}>
                    ▼
                  </div>
                </div>
                {openSections['gogyo'] && (
                <div>

                <div style={{ marginBottom: 16, padding: "10px 14px", background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)", fontSize: 12, color: C.textMuted, lineHeight: 1.8 }}>
                  📖 <span style={{ color: C.textSub }}>五行とは：</span>万物を「木・火・土・金・水」の5つのエネルギーで分類する考え方。命式内でのバランスが、性格・得意なこと・相性に影響するンダ。
                </div>
                {/* スパイダーチャート */}
                {(() => {
                  const gv = M.gokyo;
                  const keys   = ['moku','hi','do','kin','sui'];
                  const labels = ['木','火','土','金','水'];
                  const icons  = ['🌿','🔥','🪨','⚙️','💧'];
                  const colors_sp = ['#7EC87A','#E8745A','#C9A84C','#B8C8E0','#6EB4DC'];
                  const maxVal = 6;
                  const cx = 140, cy = 130, r = 100;
                  const angle = i => (Math.PI * 2 * i / 5) - Math.PI / 2;
                  const pt = (i, ratio) => ({
                    x: cx + r * ratio * Math.cos(angle(i)),
                    y: cy + r * ratio * Math.sin(angle(i)),
                  });
                  // グリッドレベル
                  const levels = [0.2, 0.4, 0.6, 0.8, 1.0];
                  const vals_sp = keys.map(k => Math.min((gv[k]||0) / maxVal, 1));
                  const dataPoints = vals_sp.map((v,i) => pt(i, Math.max(v, 0.04)));
                  const dataPath = dataPoints.map((p,i) => `${i===0?'M':'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z';
                  // ラベル位置（外側に少し出す）
                  const labelPts = labels.map((_,i) => {
                    const lp = pt(i, 1.28);
                    return { x: lp.x, y: lp.y, label: labels[i], icon: icons[i], color: colors_sp[i], val: Math.round(gv[keys[i]]) };
                  });
                  return (
                    <div style={{ display:'flex', alignItems:'center', gap:24, marginBottom:20, flexWrap:'wrap' }}>
                      <svg width="280" height="260" viewBox="0 0 280 260" style={{ flexShrink:0 }}>
                        {/* グリッド */}
                        {levels.map((lv, li) => {
                          const pts = labels.map((_,i) => pt(i, lv));
                          const path = pts.map((p,i)=>`${i===0?'M':'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z';
                          return <path key={li} d={path} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={li===4?1:0.6}/>;
                        })}
                        {/* 軸線 */}
                        {labels.map((_,i) => {
                          const ep = pt(i, 1);
                          return <line key={i} x1={cx} y1={cy} x2={ep.x.toFixed(1)} y2={ep.y.toFixed(1)} stroke="rgba(255,255,255,0.08)" strokeWidth="0.8"/>;
                        })}
                        {/* データ面 */}
                        <path d={dataPath} fill="rgba(201,168,76,0.18)" stroke="rgba(201,168,76,0.7)" strokeWidth="2" strokeLinejoin="round"/>
                        {/* データ点 */}
                        {dataPoints.map((p,i) => (
                          <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="4" fill={colors_sp[i]} stroke="rgba(0,0,0,0.4)" strokeWidth="1.5"/>
                        ))}
                        {/* ラベル */}
                        {labelPts.map((lp,i) => (
                          <g key={i}>
                            <text x={lp.x.toFixed(1)} y={(lp.y - 8).toFixed(1)}
                              textAnchor="middle" fontSize="18" dominantBaseline="middle">{lp.icon}</text>
                            <text x={lp.x.toFixed(1)} y={(lp.y + 10).toFixed(1)}
                              textAnchor="middle" fontSize="11" fill={lp.color} fontWeight="700">{lp.label}</text>
                            <text x={lp.x.toFixed(1)} y={(lp.y + 22).toFixed(1)}
                              textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.5)">{lp.val}</text>
                          </g>
                        ))}
                      </svg>
                      {/* 凡例バー（縦） */}
                      <div style={{ flex:1, minWidth:130, display:'flex', flexDirection:'column', gap:10 }}>
                        {keys.map((k,i) => {
                          const v = gv[k]||0;
                          const intV = Math.round(v);
                          const rank = v===0 ? '─ なし' : v >= maxVal*0.65 ? '◎ 強い' : v >= maxVal*0.35 ? '○ 普通' : '△ 少ない';
                          const pct = Math.min(v/maxVal*100, 100);
                          return (
                            <div key={k} style={{ display:'flex', alignItems:'center', gap:8 }}>
                              <span style={{ fontSize:13, fontFamily:"'Shippori Mincho',serif", fontWeight:700, color: intV>0 ? colors_sp[i] : 'rgba(255,255,255,0.2)', width:18, textAlign:'center' }}>{labels[i]}</span>
                              <div style={{ flex:1, height:8, background:'rgba(255,255,255,0.06)', borderRadius:4, overflow:'hidden' }}>
                                <div style={{ height:'100%', width:`${pct}%`, background:colors_sp[i], borderRadius:4, boxShadow: intV>0 ? `0 0 6px ${colors_sp[i]}66` : 'none' }}/>
                              </div>
                              <span style={{ fontSize:14, fontWeight:700, color: intV>0 ? colors_sp[i] : 'rgba(255,255,255,0.2)', width:16, textAlign:'right' }}>{intV}</span>
                              <span style={{ fontSize:10, color:'rgba(255,255,255,0.3)', width:44 }}>{rank}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* 五行解説カード（動的生成） */}
                {(() => {
                  const gv = M.gokyo; // {moku, hi, do, kin, sui}
                  const _gokLang = (typeof window !== 'undefined' && window.PF_LANG && window.PF_LANG.getLang) ? window.PF_LANG.getLang() : 'jp';
                  const _gokTxt = AT.getGogyoValsTextByLang(_gokLang);
                  const vals = [
                    { key:'sui', label:'水', val:gv.sui, emoji:'💧', color:C.waterBlue,  bg:'rgba(80,140,200,0.08)',  bd:'rgba(80,140,200,0.2)',
                      trait:_gokTxt['水'].trait, weak:_gokTxt['水'].weak, supply:_gokTxt['水'].supply },
                    { key:'hi',  label:'火', val:gv.hi,  emoji:'🔥', color:C.fireRed,    bg:'rgba(180,60,50,0.08)',   bd:'rgba(180,60,50,0.2)',
                      trait:_gokTxt['火'].trait, weak:_gokTxt['火'].weak, supply:_gokTxt['火'].supply },
                    { key:'do',  label:'土', val:gv.do,  emoji:'🏔️', color:C.earthYellow, bg:'rgba(160,130,50,0.07)', bd:'rgba(160,130,50,0.2)',
                      trait:_gokTxt['土'].trait, weak:_gokTxt['土'].weak, supply:_gokTxt['土'].supply },
                    { key:'moku',label:'木', val:gv.moku,emoji:'🌿', color:C.woodGreen,  bg:'rgba(100,180,80,0.06)',  bd:'rgba(100,180,80,0.15)',
                      trait:_gokTxt['木'].trait, weak:_gokTxt['木'].weak, supply:_gokTxt['木'].supply },
                    { key:'kin', label:'金', val:gv.kin, emoji:'⚙️', color:C.metalWhite,  bg:'rgba(180,170,150,0.06)', bd:'rgba(180,170,150,0.18)',
                      trait:_gokTxt['金'].trait, weak:_gokTxt['金'].weak, supply:_gokTxt['金'].supply },
                  ];
                  // 全5行を強さ順に並べ、役割ラベルを付与して全表示
                  const sorted = [...vals].sort((a,b)=>b.val-a.val);
                  const SEI  = {木:'火',火:'土',土:'金',金:'水',水:'木'};
                  const KOKU = {木:'土',火:'金',土:'水',金:'木',水:'火'};
                  const kishin = M.kishin || (M._calc && M._calc.kishin) || [];
                  const maxVal = sorted[0].val;
                  const minVal = sorted[sorted.length-1];

                  const roleLabel = (v, idx, item) => {
                    const isMin = (item.val===minVal.val && item.key===minVal.key);
                    const rel1  = SEI[sorted[0].label]===item.label||SEI[item.label]===sorted[0].label;
                    const clash = KOKU[sorted[0].label]===item.label||KOKU[item.label]===sorted[0].label;
                    return langPick(AT.gogyoRoleLabel_JA, AT.gogyoRoleLabel_KR, idx, item, sorted[0].label, kishin, isMin, rel1, clash);
                  };

                  const cardDesc = (item, idx) => {
                    const rel = SEI[sorted[0].label]===item.label||SEI[item.label]===sorted[0].label;
                    const clash = KOKU[sorted[0].label]===item.label||KOKU[item.label]===sorted[0].label;
                    return langPick(AT.gogyoCardDesc_JA, AT.gogyoCardDesc_KR, item, idx, sorted[0].label, rel, clash);
                  };

                  return (
                    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                      {sorted.map((item, idx) => (
                        <div key={item.key} style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"12px 16px", borderRadius:12, background:item.bg, border:`1px solid ${item.bd}` }}>
                          <div style={{ flexShrink:0, width:22, height:22, borderRadius:"50%", background:"rgba(255,255,255,0.06)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.3)", marginTop:2 }}>{idx+1}</div>
                          <div style={{ flex:1 }}>
                            <p style={{ fontSize:12, color:item.color, marginBottom:5, fontWeight:600 }}>
                              {item.emoji} {item.label}（{Math.round(item.val)}） → {roleLabel(item.val, idx, item)}
                            </p>
                            <p style={{ fontSize:12, color:C.textMuted, lineHeight:1.7 }}>{cardDesc(item, idx)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
                </div>
                )}
              </Card>

              {/* ④ 格局・喜忌神・特殊星 */}
              <Card>
                {/* アコーディオンヘッダー */}
                <div
                  onClick={() => toggleSection('kakukyoku')}
                  style={{
                    display:'flex', alignItems:'center', justifyContent:'space-between',
                    cursor:'pointer', padding:'4px 0 16px', userSelect:'none',
                    borderBottom: openSections['kakukyoku'] ? '1px solid rgba(201,168,76,0.15)' : 'none',
                    marginBottom: openSections['kakukyoku'] ? 20 : 0,
                  }}
                >
                  <div>
                    <p style={{ fontSize:10, letterSpacing:'0.4em', color:C.gold, fontFamily:'sans-serif', marginBottom:6, opacity:0.8 }}>STRUCTURE & STARS · 格局</p>
                    <h2 style={{ fontFamily:"'Shippori Mincho', serif", fontSize:22, color:C.text, fontWeight:700 }}>格局・喜忌神・特殊星</h2>
                    <p style={{ fontSize:12, color:C.textMuted, marginTop:4 }}>あなたの命式の型と、追い風・逆風のエネルギー</p>
                  </div>
                  <div style={{ fontSize:16, color:C.gold, opacity:0.7, transition:'transform 0.25s', transform: openSections['kakukyoku'] ? 'rotate(180deg)' : 'rotate(0deg)', marginLeft:16, flexShrink:0 }}>
                    ▼
                  </div>
                </div>
                {openSections['kakukyoku'] && (
                <div>

                <div style={{ marginBottom: 16, padding: "10px 14px", background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)", fontSize: 12, color: C.textMuted, lineHeight: 1.8 }}>
                  📖 <span style={{ color: C.textSub }}>格局とは：</span>命式全体の「型・キャラクター」のこと。同じ日主でも格局が違えば、まったく異なる人生の流れになるんダよ。
                </div>

                {/* 格局メイン（動的） */}
                {(() => {
                  const kk = M.kakukyoku || '';
                  // kishin/kijinは _calc から直接取得（最も確実）
                  const kiArr = (M._calc && M._calc.kishin) ? [...M._calc.kishin] : [];
                  const kjArr = (M._calc && M._calc.kijin)  ? [...M._calc.kijin]  : [];
                  const ki = kiArr.join('・') || '─';
                  const kj = kjArr.join('・') || '─';
                  // 日主五行
                  const nKan = M._calc ? M._calc.pillars.day.kan : '';
                  const JIKKAN_GOGYO_KK = ['木','木','火','火','土','土','金','金','水','水'];
                  const JIKKAN_KK = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
                  const nGogyo = JIKKAN_GOGYO_KK[JIKKAN_KK.indexOf(nKan)] || '';
                  const gv = M.gokyo;
                  const totalScore = (gv.moku+gv.hi+gv.do+gv.kin+gv.sui);
                  const dominantRatio = nGogyo ? (gv[{木:'moku',火:'hi',土:'do',金:'kin',水:'sui'}[nGogyo]]||0)/totalScore : 0;

                  const _kkLang = (typeof window !== 'undefined' && window.PF_LANG && window.PF_LANG.getLang) ? window.PF_LANG.getLang() : 'jp';
                  const KI_INFO_JA = {
                    木:{season:'春・朝',dir:'東',color:'緑・青',obj:'植物・木製品',lucky:'木・緑の場所'},
                    火:{season:'夏・昼',dir:'南',color:'赤・橙',obj:'明るい場所・炎',lucky:'火・明るい場所'},
                    土:{season:'土用・午後',dir:'中央',color:'黄・茶',obj:'土地・山',lucky:'土・山・大地'},
                    金:{season:'秋・夕',dir:'西',color:'白・金属',obj:'金属・鉱石',lucky:'金・金属・白'},
                    水:{season:'冬・夜',dir:'北',color:'黒・紺',obj:'水辺・川',lucky:'水・黒・夜'},
                  };
                  const KI_INFO = _kkLang === 'kr' ? AT.KI_INFO_KR : KI_INFO_JA;
                  const kiDesc = (() => {
                    const lines = kiArr.map(g=>KI_INFO[g]?(_kkLang==='kr'?`${KI_INFO[g].season}・${KI_INFO[g].dir}쪽・${KI_INFO[g].color}`:`${KI_INFO[g].season}・${KI_INFO[g].dir}方位・${KI_INFO[g].color}`):'').filter(Boolean);
                    if (!lines.length) return '';
                    return lines.join('\n') + (_kkLang==='kr' ? '\n이(가) 길해요.' : '\nが吉ンダよ。');
                  })();
                  const kjDesc = (() => {
                    const lines = kjArr.map(g=>KI_INFO[g]?(_kkLang==='kr'?`${KI_INFO[g].season}・${KI_INFO[g].dir}쪽・${KI_INFO[g].color}`:`${KI_INFO[g].season}・${KI_INFO[g].dir}方位・${KI_INFO[g].color}`):'').filter(Boolean);
                    if (!lines.length) return '';
                    return lines.join('\n') + (_kkLang==='kr' ? '\n의 방위・시간대는 소모되기 쉬워요.' : '\nの方位・時間帯は消耗しやすいんダ。');
                  })();

                  // 格局説明（充実版）
                  const SEI_KK = {木:'火',火:'土',土:'金',金:'水',水:'木'};
                  const KOKU_KK= {木:'土',火:'金',土:'水',金:'木',水:'火'};
                  const isJuou = kk.includes('従旺');
                  const kkDesc = (() => {
                    const kiStr = ki !== '─' ? ki : (_kkLang==='kr'?'희신':'喜神');
                    const kjStr = kj !== '─' ? kj : (_kkLang==='kr'?'기신':'忌神');
                    if(isJuou && nGogyo){
                      const seasons = kiArr.map(g=>KI_INFO[g]?.season||'').filter(Boolean).join('・');
                      return langPick(AT.buildKakukyokuDescJuou_JA, AT.buildKakukyokuDescJuou_KR, nGogyo, dominantRatio, kiStr, kjStr, seasons);
                    }
                    // 普通格局
                    const gogyoRanked = ['moku','hi','do','kin','sui']
                      .map(k=>({g:{moku:'木',hi:'火',do:'土',kin:'金',sui:'水'}[k],v:gv[k]}))
                      .sort((a,b)=>b.v-a.v);
                    const top = gogyoRanked[0].g;
                    const bot = gogyoRanked[gogyoRanked.length-1].g;
                    const lucky = KI_INFO[bot]?.lucky || (bot + (_kkLang==='kr'?'의 기':'の気'));
                    return langPick(AT.buildKakukyokuDescNormal_JA, AT.buildKakukyokuDescNormal_KR, top, gogyoRanked[0].v, kiStr, bot, gogyoRanked[gogyoRanked.length-1].v, lucky);
                  })();
                  return (
                    <>
                      <div style={{ marginBottom:20, padding:"18px 20px", borderRadius:14, background:"rgba(201,168,76,0.08)", border:"1px solid rgba(201,168,76,0.25)" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
                          <div>
                            <p style={{ fontSize:10, color:C.textMuted, letterSpacing:"0.15em", marginBottom:6 }}>あなたの格局</p>
                            <p style={{ fontFamily:"'Shippori Mincho',serif", fontSize:26, color:C.gold, fontWeight:800 }}>{M.kakukyoku}</p>
                          </div>
                          <div style={{ flex:1, minWidth:180 }}>
                            <p style={{ fontSize:13, color:C.textSub, lineHeight:1.8 }}>{kkDesc}</p>
                          </div>
                        </div>
                      </div>
                      {/* 喜神・忌神カード */}
                      {(() => {
                        const GOGYO_ICONS = { 木:'🌿', 火:'🔥', 土:'🪨', 金:'⚙️', 水:'💧' };
                        const GOGYO_COLOR = { 木:'#7EC87A', 火:'#E8745A', 土:'#C9A84C', 金:'#B8C8E0', 水:'#6EB4DC' };
                        const kiElements = kiArr.map(g => ({ g, icon: GOGYO_ICONS[g]||'', color: GOGYO_COLOR[g]||C.gold }));
                        const kjElements = kjArr.map(g => ({ g, icon: GOGYO_ICONS[g]||'', color: GOGYO_COLOR[g]||C.fireRed }));
                        return (
                          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:20 }}>
                            {/* 喜神 */}
                            <div style={{ borderRadius:16, overflow:'hidden', border:"1px solid rgba(100,180,220,0.3)" }}>
                              <div style={{ padding:"12px 16px 10px", background:"rgba(80,140,200,0.12)", borderBottom:"1px solid rgba(80,140,200,0.15)", display:"flex", alignItems:"center", gap:8 }}>
                                <span style={{ fontSize:18 }}>☀️</span>
                                <div>
                                  <p style={{ fontSize:10, color:"rgba(100,180,220,0.7)", letterSpacing:"0.15em" }}>LUCKY ENERGY</p>
                                  <p style={{ fontSize:13, color:C.waterBlue, fontWeight:700 }}>喜神 — 吉のエネルギー</p>
                                </div>
                              </div>
                              <div style={{ padding:"14px 16px", background:"rgba(80,140,200,0.05)" }}>
                                <div style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap" }}>
                                  {kiElements.map((el,i) => (
                                    <div key={i} style={{ display:"flex", alignItems:"center", gap:6, background:`rgba(255,255,255,0.05)`, border:`1px solid ${el.color}44`, borderRadius:10, padding:"6px 12px" }}>
                                      <span style={{ fontSize:20 }}>{el.icon}</span>
                                      <span style={{ fontFamily:"'Shippori Mincho',serif", fontSize:22, fontWeight:800, color:el.color }}>{el.g}</span>
                                    </div>
                                  ))}
                                </div>
                                <p style={{ fontSize:12, color:C.textMuted, lineHeight:1.9, whiteSpace:'pre-line' }}>{kiDesc || (_kkLang==='kr' ? `${ki}의 기가 강한 날・장소・사람이 순풍이 돼요.` : `${ki}の気が強い日・場所・人が追い風になるんダよ。`)}</p>
                              </div>
                            </div>
                            {/* 忌神 */}
                            <div style={{ borderRadius:16, overflow:'hidden', border:"1px solid rgba(180,60,50,0.3)" }}>
                              <div style={{ padding:"12px 16px 10px", background:"rgba(140,30,20,0.12)", borderBottom:"1px solid rgba(140,30,20,0.15)", display:"flex", alignItems:"center", gap:8 }}>
                                <span style={{ fontSize:18 }}>🌧️</span>
                                <div>
                                  <p style={{ fontSize:10, color:"rgba(200,100,90,0.7)", letterSpacing:"0.15em" }}>CAUTION ENERGY</p>
                                  <p style={{ fontSize:13, color:C.fireRed, fontWeight:700 }}>忌神 — 注意のエネルギー</p>
                                </div>
                              </div>
                              <div style={{ padding:"14px 16px", background:"rgba(140,30,20,0.05)" }}>
                                <div style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap" }}>
                                  {kjElements.map((el,i) => (
                                    <div key={i} style={{ display:"flex", alignItems:"center", gap:6, background:`rgba(255,255,255,0.04)`, border:`1px solid rgba(180,60,50,0.3)`, borderRadius:10, padding:"6px 12px" }}>
                                      <span style={{ fontSize:20 }}>{el.icon}</span>
                                      <span style={{ fontFamily:"'Shippori Mincho',serif", fontSize:22, fontWeight:800, color:"rgba(200,120,110,0.9)" }}>{el.g}</span>
                                    </div>
                                  ))}
                                </div>
                                <p style={{ fontSize:12, color:C.textMuted, lineHeight:1.9, whiteSpace:'pre-line' }}>{kjDesc || (_kkLang==='kr' ? `${kj}의 기가 강한 날은 소모되기 쉬워요.` : `${kj}の気が強い日は消耗しやすいんダ。`)}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </>
                  );
                })()}

                {/* 特殊星（動的） */}
                <div>
                  <p style={{ fontSize:11, color:C.textMuted, letterSpacing:"0.15em", marginBottom:12 }}>特殊星（持って生まれた星）</p>
                  {M.tokuseiboshi && M.tokuseiboshi.length > 0 ? (
                    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                      {(() => {
                        const _starLang = (typeof window !== 'undefined' && window.PF_LANG && window.PF_LANG.getLang) ? window.PF_LANG.getLang() : 'jp';
                        const STAR_DESC = getStarDescByLang(_starLang);
                        return M.tokuseiboshi.map((s,i) => (
                          <div key={i} style={{ display:"flex", gap:14, padding:"13px 16px", borderRadius:12, background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)" }}>
                            <span style={{ fontSize:11, padding:"3px 10px", height:"fit-content", border:`1px solid ${C.border}`, borderRadius:20, color:C.goldDim, whiteSpace:"nowrap", flexShrink:0 }}>✦ {s}</span>
                            <p style={{ fontSize:12, color:C.textMuted, lineHeight:1.7 }}>{STAR_DESC[s] || (_starLang==='kr' ? buildStarFallback_KR(s) : buildStarFallback_JA(s))}</p>
                          </div>
                        ));
                      })()}
                    </div>
                  ) : (
                    <p style={{ fontSize:12, color:C.textMuted }}>今回の命式には特殊星は見当たらないんダ。特殊星がないことはごく普通のことで、基本の五行バランスがより純粋に現れやすい命式ンダよ🐼</p>
                  )}
                </div>

                {/* 空亡（くうぼう）*/}
                {M.kuubouType && (() => {
                  const _kbLang = (typeof window !== 'undefined' && window.PF_LANG && window.PF_LANG.getLang) ? window.PF_LANG.getLang() : 'jp';
                  const KUUBOU_DESC = getKuubouDescByLang(_kbLang);
                  const desc = KUUBOU_DESC[M.kuubouType] || '';
                  return (
                    <div style={{ marginTop:24 }}>
                      <p style={{ fontSize:11, color:C.textMuted, letterSpacing:"0.15em", marginBottom:12 }}>空亡（くうぼう）</p>
                      <div style={{ display:"flex", gap:14, padding:"13px 16px", borderRadius:12, background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)" }}>
                        <span style={{ fontSize:11, padding:"3px 10px", height:"fit-content", border:`1px solid ${C.border}`, borderRadius:20, color:C.goldDim, whiteSpace:"nowrap", flexShrink:0 }}>✦ {M.kuubouType}</span>
                        <p style={{ fontSize:12, color:C.textMuted, lineHeight:1.7 }}>{desc}</p>
                      </div>
                    </div>
                  );
                })()}
                </div>
                )}
              </Card>


              {/* ⑤ 通変星（十神）全柱 */}
              <Card>
                {/* アコーディオンヘッダー */}
                <div
                  onClick={() => toggleSection('tsuhen')}
                  style={{
                    display:'flex', alignItems:'center', justifyContent:'space-between',
                    cursor:'pointer', padding:'4px 0 16px', userSelect:'none',
                    borderBottom: openSections['tsuhen'] ? '1px solid rgba(201,168,76,0.15)' : 'none',
                    marginBottom: openSections['tsuhen'] ? 20 : 0,
                  }}
                >
                  <div>
                    <p style={{ fontSize:10, letterSpacing:'0.4em', color:C.gold, fontFamily:'sans-serif', marginBottom:6, opacity:0.8 }}>TEN GODS · 通変星</p>
                    <h2 style={{ fontFamily:"'Shippori Mincho', serif", fontSize:22, color:C.text, fontWeight:700 }}>通変星（十神）</h2>
                    <p style={{ fontSize:12, color:C.textMuted, marginTop:4 }}>あなたと周りとの関係パターン</p>
                  </div>
                  <div style={{ fontSize:16, color:C.gold, opacity:0.7, transition:'transform 0.25s', transform: openSections['tsuhen'] ? 'rotate(180deg)' : 'rotate(0deg)', marginLeft:16, flexShrink:0 }}>
                    ▼
                  </div>
                </div>
                {openSections['tsuhen'] && (
                <div>

                <div style={{ marginBottom: 16, padding: "10px 14px", background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)", fontSize: 12, color: C.textMuted, lineHeight: 1.8 }}>
                  📖 <span style={{ color: C.textSub }}>通変星とは：</span>日主（あなた）と他の天干・蔵干の関係を10種類の「星」で表したもの。仕事・恋愛・お金・才能のパターンがわかるんダよ。
                </div>

                {(() => {
                  const calc = M._calc;
                  if (!calc) return null;
                  const pillars = calc.pillars;
                  const JIKKAN_KK  = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
                  const JIKKAN_G   = ['木','木','火','火','土','土','金','金','水','水'];
                  const JUNISHI_KK = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
                  // 蔵干分野表 (genmeiText.js _ZOKAN_ALLOCATION) を単一ソースとして参照
                  const ZOKAN_MAP  = {
                    子: getZokanList('子'), 丑: getZokanList('丑'), 寅: getZokanList('寅'),
                    卯: getZokanList('卯'), 辰: getZokanList('辰'), 巳: getZokanList('巳'),
                    午: getZokanList('午'), 未: getZokanList('未'), 申: getZokanList('申'),
                    酉: getZokanList('酉'), 戌: getZokanList('戌'), 亥: getZokanList('亥'),
                  };
                  const SEI_KK  = {木:'火',火:'土',土:'金',金:'水',水:'木'};
                  const KOKU_KK = {木:'土',火:'金',土:'水',金:'木',水:'火'};
                  function getTsuhen(niKan, tiKan) {
                    // 通変星: SEI=生む先, KOKU=剋す先
                    //   SEI[ng]===tg → 我生 → 食神/傷官
                    //   KOKU[ng]===tg→ 我克 → 偏財/正財
                    //   SEI[tg]===ng → 生我 → 偏印/正印
                    //   KOKU[tg]===ng→ 克我 → 偏官/正官
                    const ni = JIKKAN_KK.indexOf(niKan), ti = JIKKAN_KK.indexOf(tiKan);
                    if (ni < 0 || ti < 0) return '─';
                    const ng = JIKKAN_G[ni], tg = JIKKAN_G[ti], s = (ni%2)===(ti%2);
                    if (ng===tg) return s?'比肩':'劫財';
                    if (SEI_KK[ng]===tg) return s?'食神':'傷官';
                    if (KOKU_KK[ng]===tg) return s?'偏財':'正財';
                    if (SEI_KK[tg]===ng) return s?'偏印':'正印';
                    if (KOKU_KK[tg]===ng) return s?'偏官':'正官';
                    return '比肩';
                  }
                  const dayKan = pillars.day.kan;
                  const _tsLang = (typeof window !== 'undefined' && window.PF_LANG && window.PF_LANG.getLang) ? window.PF_LANG.getLang() : 'jp';
                  const TSUHEN_INFO = getTsuhenInfoByLang(_tsLang);
                  // 各柱の通変星を算出
                  const pillarRows = [
                    { label:'年柱', kan:pillars.year.kan,  shi:pillars.year.shi,  pillarKey:'year' },
                    { label:'月柱', kan:pillars.month.kan, shi:pillars.month.shi, pillarKey:'month' },
                    { label:'日柱', kan:dayKan,            shi:pillars.day.shi,   pillarKey:'day', isDay:true },
                    ...(pillars.hour ? [{ label:'時柱', kan:pillars.hour.kan, shi:pillars.hour.shi, pillarKey:'hour' }] : []),
                  ];
                  // 天干の通変星（表示用）
                  const kanTsuhen = pillarRows.map(r => r.isDay ? '─（日主）' : getTsuhen(dayKan, r.kan));
                  // 蔵干の通変星（地支から蔵干を取得・表示用）
                  const zokanTsuhen = pillarRows.map(r => {
                    const zk = ZOKAN_MAP[r.shi] || [];
                    return zk.map(k => ({ kan: k, ts: getTsuhen(dayKan, k) }));
                  });
                  // 出所トラッキング（どの柱から来た星か） — UI 表示専用
                  const tsSources = {}; // {星名: [{label, kan, type:'天干'|'蔵干'}]}
                  pillarRows.forEach((r, i) => {
                    if (!r.isDay) {
                      const ts = kanTsuhen[i];
                      if (!tsSources[ts]) tsSources[ts] = [];
                      tsSources[ts].push({ label:r.label, kan:r.kan, type:'天干' });
                    }
                    zokanTsuhen[i].forEach(z => {
                      if (!tsSources[z.ts]) tsSources[z.ts] = [];
                      tsSources[z.ts].push({ label:r.label, kan:z.kan, type:'蔵干' });
                    });
                  });
                  // ランキング・最強通変星はエンジンが算出済 (calc.jisshinCount = 蔵干分野表加重)
                  const tsCount = (M._calc && M._calc.jisshinCount) ? M._calc.jisshinCount : {};
                  const sortedTs = Object.entries(tsCount).filter(([k])=>k!=='─（日主）'&&k!=='─').sort((a,b)=>b[1]-a[1]);
                  return (
                    <>
                      {/* ポポコメント */}
                      <PopoSpeech text={(() => {
                        const top  = sortedTs[0]?.[0] || '';
                        const top2 = sortedTs[1]?.[0] || '';
                        const topCnt  = sortedTs[0]?.[1] || 0;
                        const top2Cnt = sortedTs[1]?.[1] || 0;
                        const info1 = TSUHEN_INFO[top]  || {};
                        const info2 = TSUHEN_INFO[top2] || {};
                        const JIKKAN_G2 = ['木','木','火','火','土','土','金','金','水','水'];
                        const JIKKAN_L2 = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
                        const dayGogyo = JIKKAN_G2[JIKKAN_L2.indexOf(dayKan)] || '水';
                        // 同点の星をまとめる
                        const tieStars = sortedTs.filter(([,c]) => c === sortedTs[2]?.[1] && c <= 1);
                        const _tsrLang = (typeof window !== 'undefined' && window.PF_LANG && window.PF_LANG.getLang) ? window.PF_LANG.getLang() : 'jp';
                        const _quote = (n) => _tsrLang==='kr' ? `"${(TSUHEN_INFO[n]||{}).icon||''}${n}"` : `「${(TSUHEN_INFO[n]||{}).icon||''}${n}」`;
                        const tieStarsParts = tieStars.length >= 3 ? tieStars.map(([n]) => _quote(n)) : [];
                        const otherStarsParts = (tieStars.length < 3) ? sortedTs.slice(2,5).map(([n]) => _quote(n)) : [];
                        return langPick(AT.buildTsuhenseiReading_JA, AT.buildTsuhenseiReading_KR, {
                          top, top2, topCnt, top2Cnt,
                          info1Icon: info1.icon, info2Icon: info2.icon,
                          info1Detail: info1.detail || '', info2Detail: info2.detail || '',
                          tieStarsParts, otherStarsParts, dayKan, dayGogyo,
                        });
                      })()}/>

                      {/* 上段：柱カード＋ランキング 横並び */}
                      <div style={{ display:'flex', gap:16, marginBottom:16, marginTop:16, alignItems:'flex-start' }}>

                        {/* 左：柱カード縦積み */}
                        <div style={{ display:'flex', flexDirection:'column', gap:6, width:220, flexShrink:0 }}>
                          <p style={{ fontSize:10, color:C.textMuted, letterSpacing:'0.1em', marginBottom:2 }}>各柱の通変星</p>
                          {pillarRows.map((r, i) => {
                            const ts = kanTsuhen[i];
                            const info = TSUHEN_INFO[ts] || {};
                            const zk = zokanTsuhen[i];
                            return (
                              <div key={i} style={{ borderRadius:10, border: r.isDay ? `1px solid ${C.gold}` : '1px solid rgba(255,255,255,0.07)', background: r.isDay ? 'rgba(201,168,76,0.06)' : 'rgba(255,255,255,0.02)', padding:'9px 12px' }}>
                                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                  <span style={{ fontSize:10, color: r.isDay ? C.gold : C.textMuted, letterSpacing:'0.08em', width:26, flexShrink:0 }}>{r.label}</span>
                                  <span style={{ fontFamily:"'Shippori Mincho',serif", fontSize:20, fontWeight:700, color: r.isDay ? C.gold : C.textSub, lineHeight:1, width:22, textAlign:'center' }}>{r.kan}</span>
                                  <div style={{ width:1, height:18, background:'rgba(255,255,255,0.08)', flexShrink:0 }}/>
                                  {r.isDay ? (
                                    <span style={{ fontSize:11, color:C.gold, opacity:0.6 }}>日主</span>
                                  ) : (
                                    <div style={{ flex:1, minWidth:0 }}>
                                      <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                                      <span style={{ display:'inline-flex', alignItems:'center', gap:4, background: info.bg||'rgba(255,255,255,0.04)', border:`1px solid ${info.bd||'rgba(255,255,255,0.1)'}`, borderRadius:20, padding:'2px 9px' }}>
                                        {info.icon && <span style={{ fontSize:12, color: info.color, lineHeight:1 }}>{info.icon}</span>}
                                        <span style={{ fontSize:13, fontWeight:700, color: info.color || C.textMuted, lineHeight:1 }}>{ts}</span>
                                      </span>
                                      {info.short && <span style={{ fontSize:9, color:C.textMuted }}>{info.short}</span>}
                                    </div>
                                    </div>
                                  )}
                                </div>
                                {zk.length > 0 && (
                                  <div style={{ display:'flex', gap:5, marginTop:6, paddingTop:6, borderTop:'1px solid rgba(255,255,255,0.04)', flexWrap:'wrap' }}>
                                    {zk.map((z,zi) => {
                                      const zi_info = TSUHEN_INFO[z.ts] || {};
                                      return (
                                        <span key={zi} style={{ fontSize:9, color: zi_info.color || C.textMuted, background:'rgba(255,255,255,0.04)', borderRadius:5, padding:'1px 6px', border:'1px solid rgba(255,255,255,0.06)', whiteSpace:'nowrap' }}>
                                          {zi_info.icon} {z.kan}→{z.ts}
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* 右：ランキング縦一列 */}
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ fontSize:10, color:C.textMuted, letterSpacing:'0.1em', marginBottom:6 }}>強さランキング</p>
                          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                            {sortedTs.slice(0,5).map(([name, cnt], idx) => {
                              const info = TSUHEN_INFO[name] || {};
                              const barW = Math.round((cnt / (sortedTs[0]?.[1]||1)) * 100);
                              return (
                                <div key={name} style={{ padding:'9px 12px', borderRadius:10, background: idx===0 ? (info.bg||'rgba(255,255,255,0.04)') : 'rgba(255,255,255,0.02)', border:`1px solid ${idx===0?(info.bd||'rgba(255,255,255,0.12)'):'rgba(255,255,255,0.05)'}` }}>
                                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                                    <span style={{ fontSize:10, color:'rgba(255,255,255,0.2)', width:14, flexShrink:0 }}>{idx+1}</span>
                                    <span style={{ display:'inline-flex', alignItems:'center', gap:4, background: info.bg||'rgba(255,255,255,0.04)', border:`1px solid ${info.bd||'rgba(255,255,255,0.1)'}`, borderRadius:20, padding:'2px 10px', flex:'0 0 auto' }}>
                                      {info.icon && <span style={{ fontSize:12, color: info.color, lineHeight:1 }}>{info.icon}</span>}
                                      <span style={{ fontSize:13, fontWeight:700, color: info.color || C.textSub, lineHeight:1 }}>{name}</span>
                                    </span>
                                    <span style={{ flex:1 }}/>
                                    <span style={{ fontSize:10, color:C.textMuted, flexShrink:0 }}>×{cnt.toFixed(1).replace('.0','')}</span>
                                    {idx===0 && <span style={{ fontSize:8, background:'rgba(201,168,76,0.2)', color:C.gold, padding:'1px 5px', borderRadius:5, flexShrink:0 }}>最強</span>}
                                  </div>
                                  <div style={{ height:2, background:'rgba(255,255,255,0.05)', borderRadius:2, overflow:'hidden', marginBottom:5, marginLeft:20 }}>
                                    <div style={{ height:'100%', width:`${barW}%`, background: info.color || C.gold, borderRadius:2, opacity:0.7 }}/>
                                  </div>
                                  <p style={{ fontSize:11, color:C.textMuted, lineHeight:1.6, marginLeft:20, marginBottom:5 }}>{info.detail}</p>
                                  {/* 出所タグ */}
                                  {tsSources[name] && (
                                    <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginLeft:20 }}>
                                      {tsSources[name].map((src, si) => (
                                        <span key={si} style={{ fontSize:9, padding:'1px 7px', borderRadius:5, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', color:C.textMuted, whiteSpace:'nowrap' }}>
                                          {src.label} {src.kan}（{src.type}）
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
                </div>
                )}
              </Card>

              {/* ⑥ 十二運星 全柱 */}
              <Card>
                {/* アコーディオンヘッダー */}
                <div
                  onClick={() => toggleSection('juniu')}
                  style={{
                    display:'flex', alignItems:'center', justifyContent:'space-between',
                    cursor:'pointer', padding:'4px 0 16px', userSelect:'none',
                    borderBottom: openSections['juniu'] ? '1px solid rgba(201,168,76,0.15)' : 'none',
                    marginBottom: openSections['juniu'] ? 20 : 0,
                  }}
                >
                  <div>
                    <p style={{ fontSize:10, letterSpacing:'0.4em', color:C.gold, fontFamily:'sans-serif', marginBottom:6, opacity:0.8 }}>TWELVE STAGES · 十二運星</p>
                    <h2 style={{ fontFamily:"'Shippori Mincho', serif", fontSize:22, color:C.text, fontWeight:700 }}>十二運星 — 全柱のエネルギー</h2>
                    <p style={{ fontSize:12, color:C.textMuted, marginTop:4 }}>あなたのエネルギーの質と強さ</p>
                  </div>
                  <div style={{ fontSize:16, color:C.gold, opacity:0.7, transition:'transform 0.25s', transform: openSections['juniu'] ? 'rotate(180deg)' : 'rotate(0deg)', marginLeft:16, flexShrink:0 }}>
                    ▼
                  </div>
                </div>
                {openSections['juniu'] && (
                <div>

                <div style={{ marginBottom: 16, padding: "10px 14px", background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)", fontSize: 12, color: C.textMuted, lineHeight: 1.8 }}>
                  📖 <span style={{ color: C.textSub }}>十二運星とは：</span>人生の「エネルギーのフェーズ」を12段階で示すもの。日主（自分）を基準に、各柱の地支との関係で決まるんダ。日柱が最重要ンダよ。
                </div>
                {(() => {
                  const calc = M._calc;
                  if (!calc) return null;
                  const pillars = calc.pillars;
                  const dayKan = pillars.day.kan;
                  const _juniuLang1 = (typeof window !== 'undefined' && window.PF_LANG && window.PF_LANG.getLang) ? window.PF_LANG.getLang() : 'jp';
                  const JUNIU_INFO = getJuniuInfoShort(_juniuLang1, C.textMuted);
                  const pillarList = [
                    { label:'年柱', key:'year',  note:'先祖・幼少期・社会的背景' },
                    { label:'月柱', key:'month', note:'仕事・社会・親との関係' },
                    { label:'日柱', key:'day',   note:'★ 自分自身・本質（最重要）', isDay:true },
                    ...(pillars.hour ? [{ label:'時柱', key:'hour', note:'晩年・子供・本音の才能' }] : []),
                  ];
                  const maxEnergy = 10;
                  return (
                    <>
                      {/* ポポコメント */}
                      <PopoSpeech text={(() => {
                        const dayUnsei = pillars.day.unsei || pillars.day.juniunsei || '不明';
                        const moUnsei  = pillars.month.unsei || pillars.month.juniunsei || '不明';
                        const infoD = JUNIU_INFO[dayUnsei] || {};
                        const infoM = JUNIU_INFO[moUnsei] || {};
                        const JIKKAN_G2 = ['木','木','火','火','土','土','金','金','水','水'];
                        const JIKKAN_L2 = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
                        const dayGogyo = JIKKAN_G2[JIKKAN_L2.indexOf(dayKan)] || '水';
                        return langPick(
                          AT.buildJuniunseiReading_JA,
                          AT.buildJuniunseiReading_KR,
                          dayUnsei, infoD.desc || '', moUnsei, infoM.desc || '', dayKan, dayGogyo, infoD.energy || 0
                        );
                      })()}/>

                      {/* 十二運星カード */}
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:20, marginTop:16 }}>
                        {pillarList.map(p => {
                          const pillarData = pillars[p.key];
                          if (!pillarData) return null;
                          const unsei = pillarData.unsei || pillarData.juniunsei || '不明';
                          const info = JUNIU_INFO[unsei] || JUNIU_INFO['不明'];
                          const barWidth = Math.round((info.energy / maxEnergy) * 100);
                          return (
                            <div key={p.key} style={{ borderRadius:12, border: p.isDay ? `1px solid ${C.gold}` : '1px solid rgba(255,255,255,0.08)', background: p.isDay ? 'rgba(201,168,76,0.05)' : 'rgba(255,255,255,0.02)', padding:'12px 8px', textAlign:'center' }}>
                              <p style={{ fontSize:10, color: p.isDay ? C.gold : C.textMuted, letterSpacing:'0.1em', marginBottom:4 }}>{p.label}</p>
                              <p style={{ fontSize:9, color:'rgba(255,255,255,0.25)', marginBottom:10 }}>{p.note}</p>
                              <p style={{ fontFamily:"'Shippori Mincho',serif", fontSize:24, fontWeight:700, color: info.color, lineHeight:1, marginBottom:8 }}>{unsei}</p>
                              {/* エネルギーバー */}
                              <div style={{ height:4, background:'rgba(255,255,255,0.06)', borderRadius:2, overflow:'hidden', marginBottom:8 }}>
                                <div style={{ height:'100%', width:`${barWidth}%`, background: info.bar, borderRadius:2 }}/>
                              </div>
                              <p style={{ fontSize:9, color:C.textMuted }}>エネルギー {info.energy}/10</p>
                            </div>
                          );
                        })}
                      </div>
                      {/* 日柱の詳細解説（最重要） */}
                      {(() => {
                        const dayUnsei = pillars.day.unsei || pillars.day.juniunsei || '不明';
                        const info = JUNIU_INFO[dayUnsei] || JUNIU_INFO['不明'];
                        return (
                          <div style={{ padding:'16px 18px', borderRadius:14, background:'rgba(201,168,76,0.07)', border:`1px solid rgba(201,168,76,0.25)`, marginBottom:16 }}>
                            <p style={{ fontSize:11, color:C.textMuted, letterSpacing:'0.12em', marginBottom:8 }}>日柱（自分自身）の十二運星</p>
                            <div style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
                              <p style={{ fontFamily:"'Shippori Mincho',serif", fontSize:36, color:C.gold, fontWeight:800, lineHeight:1 }}>{dayUnsei}</p>
                              <div style={{ flex:1, minWidth:180 }}>
                                <p style={{ fontSize:13, color:C.textSub, lineHeight:1.8 }}>{info.desc}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                      {/* 全柱の解説リスト */}
                      <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
                        {pillarList.map(p => {
                          const pillarData = pillars[p.key];
                          if (!pillarData) return null;
                          const unsei = pillarData.unsei || pillarData.juniunsei || '不明';
                          const info = JUNIU_INFO[unsei] || JUNIU_INFO['不明'];
                          return (
                            <div key={p.key} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'10px 14px', borderRadius:10, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)' }}>
                              <div style={{ minWidth:60, textAlign:'center' }}>
                                <p style={{ fontSize:10, color: p.isDay ? C.gold : C.textMuted, marginBottom:2 }}>{p.label}</p>
                                <p style={{ fontFamily:"'Shippori Mincho',serif", fontSize:18, fontWeight:700, color: info.color }}>{unsei}</p>
                              </div>
                              <div style={{ flex:1 }}>
                                <p style={{ fontSize:11, color:C.textMuted, marginBottom:3 }}>{p.note}</p>
                                <p style={{ fontSize:12, color:C.textSub, lineHeight:1.7 }}>{info.desc}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}
                </div>
                )}
              </Card>

            </div>
          )}


          {activeTab === "love" && (() => {
            const _detailD = new Date(); _detailD.setDate(_detailD.getDate() + timelineOffset);
            const todayS = calcDailyScore(M._calc, _detailD);
            const loveScore = todayS.love;
            const _loveExtra = {
              kiH: (calc => calc && (calc.kishin||[]).includes(todayS.dayKan ? (['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'].indexOf(todayS.dayKan) >= 0 ? ['木','木','火','火','土','土','金','金','水','水'][['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'].indexOf(todayS.dayKan)] : '') : ''))(M._calc),
              kjH: false,
              sgH: todayS.sgNichi || false,
              rkH: todayS.rkNichi || false,
            };
            const comment = genComment(loveScore, 'love', todayS.jisshin, _loveExtra);
            const _dayLabel = timelineOffset===0?'今日':timelineOffset===-1?'昨日':'一昨日';
            return (
            <div className="tab-content" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* 戻るボタン */}
              <button
                onClick={() => setActiveTab("timeline")}
                style={{ display:"flex", alignItems:"center", gap:8, alignSelf:"flex-start",
                  padding:"8px 16px", borderRadius:10, cursor:"pointer",
                  background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.1)",
                  color:"rgba(240,230,208,0.5)", fontSize:12,
                  fontFamily:"'Noto Sans JP',sans-serif", transition:"all 0.2s" }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(201,168,76,0.4)";e.currentTarget.style.color=C.goldDim;}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.1)";e.currentTarget.style.color="rgba(240,230,208,0.5)";}}
              >◁ 運勢タイムラインに戻る</button>
              <Card glow>
                <SectionLabel en="LOVE · 恋愛運" ja={`${_dayLabel}の恋愛運`} />
                {/* スコア1つ */}
                <div style={{ display:"flex", alignItems:"center", gap:24, marginBottom:20 }}>
                  <RadialScore value={loveScore} color="rgba(220,100,130,0.9)" size={80} />
                  <div>
                    <p style={{ fontSize:12, color:"rgba(220,100,130,0.7)", marginBottom:4 }}>
                      {todayS.dateStr} · {todayS.kanshi}日
                    </p>
                    <p style={{ fontSize:13, color:C.textSub, lineHeight:1.8 }}>{comment}</p>
                  </div>
                </div>
                {/* なぜこのスコアか */}
                <PopoSpeech text={(() => {
                  const SG={子:'丑',丑:'子',寅:'亥',亥:'寅',卯:'戌',戌:'卯',辰:'酉',酉:'辰',巳:'申',申:'巳',午:'未',未:'午'};
                  const RK={子:'午',午:'子',丑:'未',未:'丑',寅:'申',申:'寅',卯:'酉',酉:'卯',辰:'戌',戌:'辰',巳:'亥',亥:'巳'};
                  const ns  = M._calc.pillars.day.shi;
                  const ki  = (M._calc.kishin||[]).join('・') || '';
                  const js  = todayS.jisshin || '';
                  const kiH = ki && (M._calc.kishin||[]).includes(todayS.dayKan);
                  const sgH = SG[todayS.dayShi]===ns;
                  const rkH = RK[todayS.dayShi]===ns;
                  const score = loveScore;
                  const DL = _dayLabel;

                  if(sgH && score >= 75) return langPick(AT.buildLoveShigouDay_JA, AT.buildLoveShigouDay_KR, DL, todayS.kanshi);
                  if(js==='正官' && score >= 70) return langPick(AT.buildLoveSeikanDay_JA, AT.buildLoveSeikanDay_KR, todayS.kanshi, DL);
                  if((js==='食神'||js==='傷官') && score >= 65) return langPick(AT.buildLoveShokujinDay_JA, AT.buildLoveShokujinDay_KR, DL, todayS.kanshi, js);
                  if(js==='偏財' && score >= 65) return langPick(AT.buildLoveHenzaiDay_JA, AT.buildLoveHenzaiDay_KR, todayS.kanshi, DL);
                  if(rkH) return langPick(AT.buildLoveRokuchuuDay_JA, AT.buildLoveRokuchuuDay_KR, DL, todayS.kanshi);
                  if(score >= 75) return langPick(AT.buildLoveHighScoreDay_JA, AT.buildLoveHighScoreDay_KR, todayS.kanshi, DL, kiH, ki);
                  if(score >= 60) return langPick(AT.buildLoveMidScoreDay_JA, AT.buildLoveMidScoreDay_KR, todayS.kanshi, DL);
                  return langPick(AT.buildLoveLowScoreDay_JA, AT.buildLoveLowScoreDay_KR, DL, todayS.kanshi);
                })()} />
              </Card>

            </div>
          );})()}

          {/* ══════════════ 仕事タブ ══════════════ */}
          {activeTab === "work" && (() => {
            const _detailD = new Date(); _detailD.setDate(_detailD.getDate() + timelineOffset);
            const todayS = calcDailyScore(M._calc, _detailD);
            const workScore = todayS.work;
            const comment = genComment(workScore, 'work');
            const _dayLabel = timelineOffset===0?'今日':timelineOffset===-1?'昨日':'一昨日';
            const jisshin = todayS.jisshin || '─';
            const workBonus = ['食神','偏官','正官'].includes(jisshin)?'+10':['比肩','劫財'].includes(jisshin)?'+5':'補正なし';
            return (
            <div className="tab-content" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <button
                onClick={() => setActiveTab("timeline")}
                style={{ display:"flex", alignItems:"center", gap:8, alignSelf:"flex-start",
                  padding:"8px 16px", borderRadius:10, cursor:"pointer",
                  background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.1)",
                  color:"rgba(240,230,208,0.5)", fontSize:12,
                  fontFamily:"'Noto Sans JP',sans-serif", transition:"all 0.2s" }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(201,168,76,0.4)";e.currentTarget.style.color=C.goldDim;}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.1)";e.currentTarget.style.color="rgba(240,230,208,0.5)";}}
              >◁ 運勢タイムラインに戻る</button>
              <Card glow>
                <SectionLabel en="CAREER · 仕事運" ja={`${_dayLabel}の仕事運`} />
                <div style={{ display:"flex", alignItems:"center", gap:24, marginBottom:20 }}>
                  <RadialScore value={workScore} color="rgba(100,180,220,0.9)" size={80} />
                  <div>
                    <p style={{ fontSize:12, color:"rgba(100,180,220,0.7)", marginBottom:4 }}>
                      {todayS.dateStr} · {todayS.kanshi}日
                    </p>
                    <p style={{ fontSize:13, color:C.textSub, lineHeight:1.8 }}>{comment}</p>
                  </div>
                </div>
                <PopoSpeech text={(() => {
                  const ki  = (M._calc.kishin||[]).join('・') || '';
                  const js  = jisshin || '';
                  const kiH = ki && (M._calc.kishin||[]).includes(todayS.dayKan);
                  const score = workScore;
                  const DL = _dayLabel;

                  if(js==='正官') return langPick(AT.buildWorkSeikanDay_JA, AT.buildWorkSeikanDay_KR, todayS.kanshi, DL);
                  if(js==='食神') return langPick(AT.buildWorkShokujinDay_JA, AT.buildWorkShokujinDay_KR, DL, todayS.kanshi);
                  if(js==='傷官') return langPick(AT.buildWorkShougoanDay_JA, AT.buildWorkShougoanDay_KR, todayS.kanshi, DL);
                  if(js==='偏官') return langPick(AT.buildWorkHenkanDay_JA, AT.buildWorkHenkanDay_KR, todayS.kanshi, DL);
                  if(js==='偏印'||js==='正印') return langPick(AT.buildWorkInDay_JA, AT.buildWorkInDay_KR, DL, todayS.kanshi, js);
                  if(js==='劫財') return langPick(AT.buildWorkGouzaiDay_JA, AT.buildWorkGouzaiDay_KR, DL, todayS.kanshi);
                  if(score >= 78) return langPick(AT.buildWorkHighScoreDay_JA, AT.buildWorkHighScoreDay_KR, todayS.kanshi, DL, kiH, ki);
                  if(score >= 62) return langPick(AT.buildWorkMidScoreDay_JA, AT.buildWorkMidScoreDay_KR, todayS.kanshi, DL);
                  return langPick(AT.buildWorkLowScoreDay_JA, AT.buildWorkLowScoreDay_KR, DL, todayS.kanshi);
                })()} />
              </Card>
            </div>
          );})()}

                    {/* ══════════════ 金運タブ ══════════════ */}
          {activeTab === "money" && (() => {
            const _detailD = new Date(); _detailD.setDate(_detailD.getDate() + timelineOffset);
            const todayS = calcDailyScore(M._calc, _detailD);
            const moneyScore = todayS.money;
            const comment = genComment(moneyScore, 'money');
            const _dayLabel = timelineOffset===0?'今日':timelineOffset===-1?'昨日':'一昨日';
            const jisshinM = todayS.jisshin || '─';
            const moneyBonus = ['偏財','正財'].includes(jisshinM)?(`+${jisshinM==='偏財'?20:15}`):'補正なし';
            return (
            <div className="tab-content" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <button
                onClick={() => setActiveTab("timeline")}
                style={{ display:"flex", alignItems:"center", gap:8, alignSelf:"flex-start",
                  padding:"8px 16px", borderRadius:10, cursor:"pointer",
                  background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.1)",
                  color:"rgba(240,230,208,0.5)", fontSize:12,
                  fontFamily:"'Noto Sans JP',sans-serif", transition:"all 0.2s" }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(201,168,76,0.4)";e.currentTarget.style.color=C.goldDim;}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.1)";e.currentTarget.style.color="rgba(240,230,208,0.5)";}}
              >◁ 運勢タイムラインに戻る</button>
              <Card glow>
                <SectionLabel en="WEALTH · 金運" ja={`${_dayLabel}の金運`} />
                <div style={{ display:"flex", alignItems:"center", gap:24, marginBottom:20 }}>
                  <RadialScore value={moneyScore} color="rgba(160,200,100,0.9)" size={80} />
                  <div>
                    <p style={{ fontSize:12, color:"rgba(160,200,100,0.7)", marginBottom:4 }}>
                      {todayS.dateStr} · {todayS.kanshi}日
                    </p>
                    <p style={{ fontSize:13, color:C.textSub, lineHeight:1.8 }}>{comment}</p>
                  </div>
                </div>
                <PopoSpeech text={(() => {
                  const ki  = (M._calc.kishin||[]).join('・') || '';
                  const js  = jisshinM || '';
                  const kiH = ki && (M._calc.kishin||[]).includes(todayS.dayKan);
                  const score = moneyScore;
                  const DL = _dayLabel;

                  if(js==='偏財') return langPick(AT.buildMoneyHenzaiDay_JA, AT.buildMoneyHenzaiDay_KR, todayS.kanshi, DL);
                  if(js==='正財') return langPick(AT.buildMoneySeizaiDay_JA, AT.buildMoneySeizaiDay_KR, todayS.kanshi, DL);
                  if(js==='食神') return langPick(AT.buildMoneyShokujinDay_JA, AT.buildMoneyShokujinDay_KR, todayS.kanshi, DL);
                  if(js==='劫財') return langPick(AT.buildMoneyGouzaiDay_JA, AT.buildMoneyGouzaiDay_KR, todayS.kanshi, DL);
                  if(js==='比肩') return langPick(AT.buildMoneyHikenDay_JA, AT.buildMoneyHikenDay_KR, todayS.kanshi, DL);
                  if(js==='偏官') return langPick(AT.buildMoneyHenkanDay_JA, AT.buildMoneyHenkanDay_KR, todayS.kanshi, DL);
                  if(score >= 78) return langPick(AT.buildMoneyHighScoreDay_JA, AT.buildMoneyHighScoreDay_KR, todayS.kanshi, DL, kiH, ki);
                  if(score >= 62) return langPick(AT.buildMoneyMidScoreDay_JA, AT.buildMoneyMidScoreDay_KR, todayS.kanshi, DL);
                  return langPick(AT.buildMoneyLowScoreDay_JA, AT.buildMoneyLowScoreDay_KR, todayS.kanshi, DL);
                })()} />
              </Card>
            </div>
          );})()}

          {/* ══════════════ タイムラインタブ ══════════════ */}
          {activeTab === "timeline" && (
            <div className="tab-content" style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* 今日の運勢（トップ） */}
              <Card glow>
                {(() => {
                  const _tlD = new Date(); _tlD.setDate(_tlD.getDate() + timelineOffset);
                  const _tlS = calcDailyScore(M._calc, _tlD);
                  const _tlLabel = timelineOffset === 0 ? 'TODAY' : timelineOffset === -1 ? '昨日' : '一昨日';
                  return <SectionLabel en={`${_tlLabel} · ${_tlS.dateStr}`} ja="今日の運勢" />;
                })()}
                <TodayFortuneBlock onOpenDetail={(tab) => { setActiveTab(tab); }} calc={M._calc} offset={timelineOffset} setOffset={setTimelineOffset} />
              </Card>

              {/* 開運日カレンダー */}
              <Card>
                <KaiUnCalendar calc={M._calc} />
              </Card>

              {/* 大運・流年 十二運星 */}
              <Card>
                <SectionLabel en="CURRENT PHASE · 今のフェーズ" ja="今の大運・流年 十二運星" />
                <div style={{ marginBottom:16, padding:"10px 14px", background:"rgba(255,255,255,0.02)", borderRadius:10, border:"1px solid rgba(255,255,255,0.05)", fontSize:12, color:C.textMuted, lineHeight:1.8 }}>
                  📖 <span style={{ color:C.textSub }}>{tt('今のフェーズ：')}</span>{tt('命式の十二運星は生涯固定ですが、10年ごとの大運・毎年の流年にも十二運星が当たります。今あなたがどのエネルギーフェーズにいるかを示しているんダよ。')}
                </div>
                {(() => {
                  const calc = M._calc;
                  if (!calc) return null;
                  const du = calc.currentDaiun;
                  const dayKan = calc.pillars?.day?.kan || '';
                  const JIKKAN_L = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
                  const JUNISHI_L = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
                  const nowYear = new Date().getFullYear();
                  const yearKanIdx = ((nowYear - 4) % 10 + 10) % 10;
                  const yearShiIdx = ((nowYear - 4) % 12 + 12) % 12;
                  const yearKan = JIKKAN_L[yearKanIdx];
                  const yearShi = JUNISHI_L[yearShiIdx];
                  // 十二運星を計算（日主 × 地支）
                  const dayKanIdx = JIKKAN_L.indexOf(dayKan);
                  const duShiIdx  = du ? JUNISHI_L.indexOf(du.shi) : -1;
                  const duUnsei   = du && duShiIdx >= 0 ? _getJuniunsei(dayKan, duShiIdx) : '─';
                  const yrShiIdx  = JUNISHI_L.indexOf(yearShi);
                  const yrUnsei   = yrShiIdx >= 0 ? _getJuniunsei(dayKan, yrShiIdx) : '─';
                  const _juniuLang2 = (typeof window !== 'undefined' && window.PF_LANG && window.PF_LANG.getLang) ? window.PF_LANG.getLang() : 'jp';
                  const JUNIU_INFO = getJuniuInfoFull(_juniuLang2, C.textMuted);
                  const duInfo = JUNIU_INFO[duUnsei] || JUNIU_INFO['不明'];
                  const yrInfo = JUNIU_INFO[yrUnsei] || JUNIU_INFO['不明'];
                  return (
                    <>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
                        {/* 大運カード */}
                        <div style={{ borderRadius:14, overflow:'hidden', border:`1px solid ${duInfo.color.replace('0.9','0.3').replace('0.95','0.3')}` }}>
                          <div style={{ padding:"11px 16px 9px", background:`${duInfo.color.replace('0.9','0.2').replace('0.95','0.2')}`, borderBottom:`1px solid ${duInfo.color.replace('0.9','0.3').replace('0.95','0.3')}`, display:'flex', alignItems:'center', gap:8 }}>
                            <span style={{ fontSize:18 }}>{duInfo.icon}</span>
                            <div>
                              <p style={{ fontSize:9, color:'rgba(232,228,217,0.65)', letterSpacing:'0.15em' }}>MAJOR CYCLE · 大運</p>
                              <p style={{ fontSize:13, color:'rgba(232,228,217,0.95)', fontWeight:700 }}>{du ? `${du.ageFrom}〜${du.ageTo}歳` : '─'}</p>
                            </div>
                          </div>
                          <div style={{ padding:"14px 16px", background:'rgba(255,255,255,0.02)' }}>
                            <div style={{ display:'flex', alignItems:'baseline', gap:10, marginBottom:10 }}>
                              <span style={{ fontFamily:"'Shippori Mincho',serif", fontSize:32, fontWeight:800, color:duInfo.color, lineHeight:1 }}>{duUnsei}</span>
                              <span style={{ fontSize:12, color:C.textMuted }}>{duInfo.phase}</span>
                            </div>
                            <div style={{ height:4, background:'rgba(255,255,255,0.06)', borderRadius:2, overflow:'hidden', marginBottom:10 }}>
                              <div style={{ height:'100%', width:`${Math.round(duInfo.energy/10*100)}%`, background:duInfo.bar, borderRadius:2 }}/>
                            </div>
                            {du && <p style={{ fontSize:10, color:C.textMuted, marginBottom:6 }}>干支：<span style={{ color:C.textSub, fontFamily:"'Shippori Mincho',serif" }}>{du.kan}{du.shi}</span></p>}
                            <p style={{ fontSize:12, color:C.textMuted, lineHeight:1.7 }}>{duInfo.desc}</p>
                          </div>
                        </div>
                        {/* 流年カード */}
                        <div style={{ borderRadius:14, overflow:'hidden', border:`1px solid ${yrInfo.color.replace('0.9','0.3').replace('0.95','0.3')}` }}>
                          <div style={{ padding:"11px 16px 9px", background:`${yrInfo.color.replace('0.9','0.2').replace('0.95','0.2')}`, borderBottom:`1px solid ${yrInfo.color.replace('0.9','0.3').replace('0.95','0.3')}`, display:'flex', alignItems:'center', gap:8 }}>
                            <span style={{ fontSize:18 }}>{yrInfo.icon}</span>
                            <div>
                              <p style={{ fontSize:9, color:'rgba(232,228,217,0.65)', letterSpacing:'0.15em' }}>ANNUAL CYCLE · 流年</p>
                              <p style={{ fontSize:13, color:'rgba(232,228,217,0.95)', fontWeight:700 }}>{nowYear}年（{yearKan}{yearShi}）</p>
                            </div>
                          </div>
                          <div style={{ padding:"14px 16px", background:'rgba(255,255,255,0.02)' }}>
                            <div style={{ display:'flex', alignItems:'baseline', gap:10, marginBottom:10 }}>
                              <span style={{ fontFamily:"'Shippori Mincho',serif", fontSize:32, fontWeight:800, color:yrInfo.color, lineHeight:1 }}>{yrUnsei}</span>
                              <span style={{ fontSize:12, color:C.textMuted }}>{yrInfo.phase}</span>
                            </div>
                            <div style={{ height:4, background:'rgba(255,255,255,0.06)', borderRadius:2, overflow:'hidden', marginBottom:10 }}>
                              <div style={{ height:'100%', width:`${Math.round(yrInfo.energy/10*100)}%`, background:yrInfo.bar, borderRadius:2 }}/>
                            </div>
                            <p style={{ fontSize:10, color:C.textMuted, marginBottom:6 }}>今年の干支：<span style={{ color:C.textSub, fontFamily:"'Shippori Mincho',serif" }}>{yearKan}{yearShi}</span></p>
                            <p style={{ fontSize:12, color:C.textMuted, lineHeight:1.7 }}>{yrInfo.desc}</p>
                          </div>
                        </div>
                      </div>
                      <PopoSpeech text={(() => {
                        const JIKKAN_G2 = ['木','木','火','火','土','土','金','金','水','水'];
                        const dayGogyo = JIKKAN_G2[JIKKAN_L.indexOf(dayKan)] || '水';
                        const samePhase = duUnsei === yrUnsei;
                        return langPick(
                          AT.buildCurrentPhaseSpeech_JA,
                          AT.buildCurrentPhaseSpeech_KR,
                          duUnsei, duInfo.phase, yrUnsei, yrInfo.phase,
                          duInfo.desc, yrInfo.desc, dayKan, dayGogyo, samePhase
                        );
                      })()}/>
                    </>
                  );
                })()}
              </Card>

              {/* ⑤ 大運タイムライン */}
              <Card>
                <SectionLabel en="MAJOR CYCLES · 大運" ja="大運タイムライン" />
                <div style={{ marginBottom: 16, padding: "10px 14px", background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)", fontSize: 12, color: C.textMuted, lineHeight: 1.8 }}>
                  📖 <span style={{ color: C.textSub }}>大運とは：</span>人生を10年ごとに区切った「時代の流れ」のこと。大運が変わると、運気の方向性そのものが変わるんダよ。
                </div>

                {/* タイムラインカード（動的） */}
                {(() => {
                  const calc = M._calc;
                  if(!calc || !M._ui) return null;
                  // kiArr/kjArr/nGogyo を再宣言（格局IIFEとは別スコープのため）
                  const kiArr = (calc.kishin) ? [...calc.kishin] : [];
                  const kjArr = (calc.kijin)  ? [...calc.kijin]  : [];
                  const _JIKKAN_G2 = ['木','木','火','火','土','土','金','金','水','水'];
                  const _JIKKAN_L2 = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
                  const nGogyo = calc.pillars && calc.pillars.day
                    ? (_JIKKAN_G2[_JIKKAN_L2.indexOf(calc.pillars.day.kan)] || '')
                    : '';
                  const ki = kiArr.join('・') || '─';
                  const kj = kjArr.join('・') || '─';
                  const gvD = M.gokyo || {moku:0,hi:0,do:0,kin:0,sui:0};
                  const gogyoRankedD = [
                    {g:'木',v:gvD.moku},{g:'火',v:gvD.hi},{g:'土',v:gvD.do},
                    {g:'金',v:gvD.kin},{g:'水',v:gvD.sui}
                  ].sort((a,b)=>b.v-a.v);
                  const top = gogyoRankedD[0] ? gogyoRankedD[0].g : '';
                  const currentAge = new Date().getFullYear() - (M._ui.year||1990);
                  const daiunFull  = calc.daiunList || [];
                  const curIdx     = daiunFull.findIndex(d => currentAge >= d.ageFrom && currentAge <= d.ageTo);
                  const curDaiun   = curIdx>=0 ? daiunFull[curIdx] : daiunFull[0];

                  const JIKKAN_G = {甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水'};
                  const JUNISHI_G= {子:'水',丑:'土',寅:'木',卯:'木',辰:'土',巳:'火',午:'火',未:'土',申:'金',酉:'金',戌:'土',亥:'水'};
                  const SEI_D    = {木:'火',火:'土',土:'金',金:'水',水:'木'};
                  const KOKU_D   = {木:'土',火:'金',土:'水',金:'木',水:'火'};
                  const KI_INFO_D= {
                    木:{season:'春・朝',dir:'東',color:'緑・青'},火:{season:'夏・昼',dir:'南',color:'赤・橙'},
                    土:{season:'土用・午後',dir:'中央',color:'黄・茶'},金:{season:'秋・夕',dir:'西',color:'白・銀'},水:{season:'冬・夜',dir:'北',color:'黒・紺'},
                  };

                  return (
                    <>
                      <div style={{ display:"flex", gap:10, overflowX:"auto", paddingBottom:8, paddingTop:16, marginBottom:16 }}>
                        {daiunFull.map((d,i)=>{
                          const isCur  = i===curIdx;
                          const isPast = curIdx>=0 ? i<curIdx : false;
                          const dKanG  = JIKKAN_G[d.kan]||'';
                          const dShiG  = JUNISHI_G[d.shi]||'';
                          const isKi   = kiArr.includes(dKanG)||kiArr.includes(dShiG);
                          const isKj   = kjArr.includes(dKanG)||kjArr.includes(dShiG);
                          const accentColor = isCur?C.gold:isKi?'rgba(100,200,80,0.8)':isKj?'rgba(200,80,60,0.6)':'rgba(255,255,255,0.35)';
                          return (
                            <div key={i} style={{
                              minWidth:90, textAlign:"center", padding:"20px 10px 14px",
                              borderRadius:14,
                              border:`1px solid ${isCur?C.borderHover:isPast?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.07)"}`,
                              background:isCur?"rgba(201,168,76,0.1)":isPast?"rgba(255,255,255,0.01)":"rgba(255,255,255,0.02)",
                              position:"relative", flexShrink:0,
                              opacity:isPast?0.45:1,
                              overflow:"visible",
                            }}>
                              {isCur && <span style={{position:"absolute",top:-12,left:"50%",transform:"translateX(-50%)",fontSize:10,background:C.gold,color:"#1a0d02",padding:"2px 10px",borderRadius:10,whiteSpace:"nowrap",fontWeight:700,zIndex:1}}>現在</span>}
                              {isPast && <span style={{position:"absolute",top:-12,left:"50%",transform:"translateX(-50%)",fontSize:9,background:"rgba(255,255,255,0.08)",color:C.textMuted,padding:"2px 7px",borderRadius:8,whiteSpace:"nowrap",zIndex:1}}>過去</span>}
                              <p style={{fontSize:10,color:accentColor,marginBottom:8,letterSpacing:"0.03em"}}>{d.ageFrom}〜{d.ageTo}歳</p>
                              <p style={{fontFamily:"'Shippori Mincho',serif",fontSize:24,fontWeight:700,color:isCur?C.gold:C.textSub,lineHeight:1.2}}>{d.kan}</p>
                              <p style={{fontFamily:"'Shippori Mincho',serif",fontSize:24,fontWeight:700,color:isCur?C.gold:C.textSub,marginBottom:10}}>{d.shi}</p>
                              <div style={{fontSize:9,color:accentColor,letterSpacing:"0.05em"}}>{isKi?'✦ 吉':isKj?'▲ 注意':'─'}</div>
                            </div>
                          );
                        })}
                      </div>

                      {/* 現在の大運 詳細解説（動的） */}
                      {curDaiun && (()=>{
                        const dKanG = JIKKAN_G[curDaiun.kan]||'';
                        const dShiG = JUNISHI_G[curDaiun.shi]||'';
                        const isKiDaiun = kiArr.includes(dKanG)||kiArr.includes(dShiG);
                        const isKjDaiun = kjArr.includes(dKanG)||kjArr.includes(dShiG);
                        const nG = nGogyo;
                        const _duLang = (typeof window !== 'undefined' && window.PF_LANG && window.PF_LANG.getLang) ? window.PF_LANG.getLang() : 'jp';

                        // 大運の五行と自分の五行の関係
                        const kanRel  = (() => {
                          if(!dKanG||!nG) return '';
                          let type = 'flow';
                          if (SEI_D[dKanG]===nG) type = 'sei';
                          else if (KOKU_D[dKanG]===nG) type = 'koku';
                          else if (dKanG===nG) type = 'same';
                          return langPick(AT.buildDaiunKanRel_JA, AT.buildDaiunKanRel_KR, curDaiun.kan, dKanG, nG, type);
                        })();
                        const shiRel  = dShiG ? langPick(AT.buildDaiunShiRel_JA, AT.buildDaiunShiRel_KR, curDaiun.shi, dShiG) : '';

                        // 特徴・仕事・恋愛・注意 を五行の関係から生成
                        const feature = langPick(AT.buildDaiunFeature_JA, AT.buildDaiunFeature_KR, dKanG||dShiG, ki, kj, isKiDaiun, isKjDaiun);
                        const work    = langPick(AT.buildDaiunWork_JA, AT.buildDaiunWork_KR, isKiDaiun, isKjDaiun);
                        const isSeiOrShi  = SEI_D[dKanG]===nG||SEI_D[dShiG]===nG;
                        const isKokuOrShi = KOKU_D[dKanG]===nG||KOKU_D[dShiG]===nG;
                        const love    = langPick(AT.buildDaiunLove_JA, AT.buildDaiunLove_KR, isSeiOrShi, isKokuOrShi);
                        const kjSeasons = kjArr.map(g=>KI_INFO_D[g]?.season).filter(Boolean).join('・');
                        const caution = langPick(AT.buildDaiunCaution_JA, AT.buildDaiunCaution_KR, isKjDaiun, kj, kjSeasons, dShiG==='土', curDaiun.shi);
                        const _lbl = _duLang === 'kr' ? AT.buildDaiunDetailLabels_KR() : { daiun:'大運', kankei:'関係', tokucho:'特徴', shigoto:'仕事', renai:'恋愛', chui:'注意', curHeader:(f,t)=>`現在の大運（${f}〜${t}歳）について` };

                        return (
                          <div style={{padding:"16px 18px",borderRadius:14,background:"rgba(201,168,76,0.06)",border:"1px solid rgba(201,168,76,0.2)",marginBottom:16}}>
                            <p style={{fontSize:11,color:C.gold,letterSpacing:"0.1em",marginBottom:12,fontWeight:600}}>{_lbl.curHeader(curDaiun.ageFrom, curDaiun.ageTo)}</p>
                            <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:"10px 16px",fontSize:13}}>
                              {[
                                {label:_lbl.daiun, value:`${curDaiun.kan}${curDaiun.shi}（${curDaiun.kan}=${dKanG}・${curDaiun.shi}=${dShiG}）`},
                                {label:_lbl.kankei, value:kanRel+(shiRel?' '+shiRel:'')},
                                {label:_lbl.tokucho, value:feature},
                                {label:_lbl.shigoto, value:work},
                                {label:_lbl.renai, value:love},
                                {label:_lbl.chui, value:caution},
                              ].map((r,i)=>(
                                <React.Fragment key={i}>
                                  <span style={{color:C.textMuted,fontSize:11,paddingTop:3,whiteSpace:"nowrap"}}>{r.label}</span>
                                  <span style={{color:C.textSub,lineHeight:1.8}}>{r.value}</span>
                                </React.Fragment>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </>
                  );
                })()}

                <PopoSpeech
                  text={(() => {
                    const _ppLang = (typeof window !== 'undefined' && window.PF_LANG && window.PF_LANG.getLang) ? window.PF_LANG.getLang() : 'jp';
                    const calc = M._calc;
                    if(!calc || !M._ui) return _ppLang==='kr' ? AT.buildDaiunFallback_KR() : 'あなたの大運の流れを読み解いているンダ🐼';
                    const currentAge = new Date().getFullYear() - (M._ui.year||1990);
                    const daiunFull  = calc.daiunList || [];
                    const curIdx     = daiunFull.findIndex(function(d){ return currentAge >= d.ageFrom && currentAge <= d.ageTo; });
                    const curD       = curIdx>=0 ? daiunFull[curIdx] : daiunFull[0];
                    const nextD      = daiunFull[curIdx+1];
                    if(!curD) return _ppLang==='kr' ? AT.buildDaiunCheckingFallback_KR() : 'あなたの大運を確認しているんダ🐼';
                    const kiArr  = (calc.kishin||[]);
                    const kjArr  = (calc.kijin||[]);
                    const ki = kiArr.join('・') || '不明';
                    const kj = kjArr.join('・') || '不明';
                    const KG = {'甲':'木','乙':'木','丙':'火','丁':'火','戊':'土','己':'土','庚':'金','辛':'金','壬':'水','癸':'水'};
                    const SG = {'子':'水','丑':'土','寅':'木','卯':'木','辰':'土','巳':'火','午':'火','未':'土','申':'金','酉':'金','戌':'土','亥':'水'};
                    const SEI_D = {'木':'火','火':'土','土':'金','金':'水','水':'木'};
                    const KOKU_D = {'木':'土','火':'金','土':'水','金':'木','水':'火'};
                    const cKG = KG[curD.kan]||'';
                    const cSG = SG[curD.shi]||'';
                    const myG = KG[calc.pillars&&calc.pillars.day&&calc.pillars.day.kan ? calc.pillars.day.kan : '壬']||'水';
                    const isKi = kiArr.includes(cKG)||kiArr.includes(cSG);
                    const isKj = kjArr.includes(cKG)||kjArr.includes(cSG);
                    const nKG = nextD ? KG[nextD.kan]||'' : '';
                    const nSG = nextD ? SG[nextD.shi]||'' : '';
                    const nextIsKi = nextD && (kiArr.includes(nKG)||kiArr.includes(nSG));
                    const nextIsKj = nextD && (kjArr.includes(nKG)||kjArr.includes(nSG));
                    const isSei  = SEI_D[myG]===cKG || SEI_D[cKG]===myG;
                    const isKoku = KOKU_D[myG]===cKG || KOKU_D[cKG]===myG;
                    const isHiwa = myG===cKG;
                    const cName = curD.kan + curD.shi;
                    const period = curD.ageFrom + '〜' + curD.ageTo + '歳';
                    const NL = '\n';

                    const WHAT = {'木':'成長・学び・挑戦','火':'情熱・行動・表現','土':'安定・蓄積・人間関係','金':'決断・整理・質を高めること','水':'知恵・内省・感受性'};
                    const SCENE = {'木':'スキルを磨き・新しいことに挑戦し・経験を積むこと','火':'積極的に発信し・人脈を広げ・情熱的に動くこと','土':'人間関係を育て・地道に積み上げ・生活基盤を整えること','金':'不要なものを手放し・本質を見極め・質の高い環境を作ること','水':'深く学び・自分と向き合い・直感を磨くこと'};
                    const RISK = {'木':'焦って成果を求めすぎると根が浅いまま伸びようとして折れやすくなる','火':'行動力はあっても持続しにくく、燃え尽きて次につながらなくなりやすい','土':'変化を嫌がりすぎると停滞し、次の追い風に乗れなくなる','金':'完璧を求めすぎたり関係を切り捨てすぎると孤立しやすくなる','水':'考えすぎて動けなくなったり感情に流されすぎると軸を失う'};
                    const KIDO = {'木':'今蒔いた種（スキル・経験・挑戦）が次の大運で大きな木に育つ','火':'今燃やした情熱の余熱が次の大運で人を動かす力になる','土':'今固めた土台（信頼・習慣・基盤）が次の大運を支える礎になる','金':'今磨いた自分の核（判断力・本質）が次の大運で武器になる','水':'今深めた知恵と洞察が次の大運で流れを読む力になる'};
                    const DOBASE = {'木':'急いで成果を出そうとせず、長く使えるスキルを一つひとつ丁寧に身につけること','火':'燃え尽きないように定期的に休息を取り、情熱を持続させる仕組みを作ること','土':'一方で性急に変えすぎず、今の環境の中で信頼を積み重ねること','金':'完璧にならなくていい場面を見極めて、本当に大事なことだけに集中すること','水':'感情に流されそうなときほど立ち止まって、自分の軸を確認する習慣を持つこと'};
                    const DOACT = {'木':'新しいことに挑戦する・スキルを磨く・今まで迷っていたことに踏み出す','火':'アイデアを発信する・人脈を広げる・情熱を持って動ける分野を全力でやる','土':'人間関係を丁寧に育てる・コツコツ積み上げる・生活の基盤を整える','金':'不要なものを手放す・本当にやりたいことを選ぶ・質の高い環境を整える','水':'深く学ぶ・人と真剣に向き合う・自分の直感を磨く'};
                    const DOSLOW = {'木':'焦らず学び続けること。どんな小さな成長も次の大きな飛躍の種になっているんダ','火':'情熱を持ちながらも燃え尽きないペースを守ること。継続が一番の武器になる時期ンダ','土':'人間関係と生活の基盤を丁寧に整えること。今築いた信頼が次の大運で最大の資産になるんダ','金':'本当に大切なものと不要なものを見極める時期ンダ。手放せた分だけ次の大運で身軽に動けるよ','水':'深く考えることを恐れないこと。この時期の洞察と内省が次の大運で直感として働くんダ'};

                    let body = '';
                    if(isKi) {
                      if (_ppLang === 'kr') {
                        body = AT.buildDaiunBodyKi_KR(cName, period, cKG, isSei, isHiwa, myG);
                      } else {
                        const boost = isSei ? 'あなたの日主「'+myG+'」がこの大運の五行に生かされる形で、特に力が引き出されやすい状態ンダ。' : isHiwa ? 'あなたの日主「'+myG+'」と同じ気が流れていて、自分らしさが最大限に発揮されやすい時代ンダ。' : 'あなたの命式にとって追い風の気が流れていて、動いた分だけ結果がついてくる時代ンダ。';
                        body = '今の大運「'+cName+'（'+period+'）」は、あなたにとって命式的な追い風が吹いている時代ンダよ🌟' + NL + NL + 'この大運は「'+(WHAT[cKG]||cKG)+'」の気が流れていて、'+(SCENE[cKG]||cKG+'に関わること')+'がどんどん実りやすい状態ンダ。'+boost + NL + NL + '【今この時期にやるべきこと】' + NL + (DOACT[cKG]||'自分らしく動くこと') + NL + NL + 'こういう時期に動いた量が、人生の転換点になるんダよ🐼';
                      }
                    } else if(isKj) {
                      if (_ppLang === 'kr') {
                        body = AT.buildDaiunBodyKj_KR(cName, period, cKG, kj, isKoku, myG);
                      } else {
                        const myRelation = isKoku ? '「'+kj+'」の気があなたの「'+myG+'」と衝突する関係にあって' : 'あなたの命式が苦手とする「'+kj+'」の気が大運に流れていて';
                        body = '今の大運「'+cName+'（'+period+'）」は、'+myRelation+'、エネルギーが消耗しやすい時期に入っているんダ🐼' + NL + NL + 'この大運には「'+(WHAT[cKG]||cKG)+'」の気が流れているんダけど、あなたの命式にとっては向かい風になる気なんだよ。無理に攻め続けると消耗するし、焦れば焦るほど結果が出にくくなる——そういう構造になっているんダ。' + NL + NL + '【なぜ慎重さが必要なのか】' + NL + (RISK[cKG]||'無理に動きすぎると後から大きな反動が来やすい') + 'んだよ。この時期に力でねじ伏せようとすると、後で大きな反動が来やすいんダ。' + NL + NL + '【土台を固めるとは具体的に何か】' + NL + (DOBASE[cKG]||'今できることを丁寧にこなすこと') + 'ンダよ。' + NL + NL + (KIDO[cKG]||'今の積み上げが次の大運で活きてくる') + 'んダ。';
                      }
                    } else {
                      if (_ppLang === 'kr') {
                        body = AT.buildDaiunBodyNeutral_KR(cName, period, cKG, isSei, isHiwa, myG);
                      } else {
                        const neutralTone = isSei ? 'あなたの日主「'+myG+'」とは相生の関係にあって、静かに支えてくれるような流れンダ。' : isHiwa ? 'あなたの日主「'+myG+'」と同じ種類の気が流れていて、居心地はいいけど変化は少ない時代ンダ。' : '追い風でも逆風でもない、実力を積み上げるための静かな時期ンダ。';
                        body = '今の大運「'+cName+'（'+period+'）」は、'+neutralTone + NL + NL + 'この大運には「'+(WHAT[cKG]||cKG)+'」の気が流れていて、目立った成果は出にくいかもしれないけど、'+(SCENE[cKG]||'地道な積み上げ')+'に取り組むことが後から大きな力になる時代なんダよ🐼' + NL + NL + '【この時期の正しい動き方】' + NL + (DOSLOW[cKG]||'コツコツ積み上げることに集中すること') + 'ンダよ。' + NL + NL + (KIDO[cKG]||'今の積み上げが次の大運で活きてくる') + 'んダ。';
                      }
                    }

                    let nextMsg = '';
                    if(nextD) {
                      const nName = nextD.kan + nextD.shi;
                      const nPeriod = nextD.ageFrom + '〜' + nextD.ageTo + '歳';
                      const nType = nextIsKi ? 'ki' : nextIsKj ? 'kj' : 'neutral';
                      if (_ppLang === 'kr') {
                        nextMsg = AT.buildDaiunNextMsg_KR(nName, nPeriod, nType);
                      } else if (nType === 'ki') {
                        nextMsg = NL + NL + '【次の大運「'+nName+'（'+nPeriod+'）」について】' + NL + '次は喜神の気が流れる追い風の大運ンダよ🌟 今この時期にしっかり土台を作っておくほど、次の大運で一気に花開くんダ。今日やっていることは、すべて未来の自分への投資ンダよ🐼';
                      } else if (nType === 'kj') {
                        nextMsg = NL + NL + '【次の大運「'+nName+'（'+nPeriod+'）」について】' + NL + '次の大運も向かい風の気が続くンダ。だからこそ今から「消耗しない仕組み」を作ることが大切ンダよ。自分を守る選択を積み重ねることが、長い目で見た最大の開運になるんダ🐼';
                      } else {
                        nextMsg = NL + NL + '【次の大運「'+nName+'（'+nPeriod+'）」について】' + NL + '次の大運は中立の流れンダ。今の時期にどれだけ積み上げられるかが、次の大運の質を決めるんダよ。焦らず、でも確実に——それが今の自分にできる一番いい動き方ンダ🐼';
                      }
                    }
                    return body + nextMsg;
                  })()}
                  delay={0.1}
                />
              </Card>


              {/* 上半期 */}
              <Card>
                <SectionLabel en="2026 FIRST HALF · 1〜6月" ja="今年上半期の運勢" />
                {(() => {
                  const yr = new Date().getFullYear();
                  const curM = new Date().getMonth() + 1;
                  const h1 = [1,2,3,4,5,6].map(m => ({ m, ...calcMonthlyScore(M._calc, yr, m) }));
                  return (
                    <HalfYearBlock
                      months={h1.map(x => x.m + "月")}
                      kanshi={h1.map(x => x.kanshi)}
                      data={{ total: h1.map(x=>x.total), love: h1.map(x=>x.love), work: h1.map(x=>x.work), money: h1.map(x=>x.money) }}
                      currentMonth={curM >= 1 && curM <= 6 ? curM : null}
                      popoText={langPick(AT.buildH1Popo_JA, AT.buildH1Popo_KR, M.nichi.kan, M.nichi.shi, M.kakukyoku, M._calc.kishin.join('・'))}
                    />
                  );
                })()}
              </Card>

              {/* 下半期 */}
              <Card>
                <SectionLabel en="2026 SECOND HALF · 7〜12月" ja="今年下半期の運勢" />
                {(() => {
                  const yr = new Date().getFullYear();
                  const curM = new Date().getMonth() + 1;
                  const h2 = [7,8,9,10,11,12].map(m => ({ m, ...calcMonthlyScore(M._calc, yr, m) }));
                  return (
                    <HalfYearBlock
                      months={h2.map(x => x.m + "月")}
                      kanshi={h2.map(x => x.kanshi)}
                      data={{ total: h2.map(x=>x.total), love: h2.map(x=>x.love), work: h2.map(x=>x.work), money: h2.map(x=>x.money) }}
                      currentMonth={curM >= 7 && curM <= 12 ? curM : null}
                      popoText={langPick(AT.buildH2Popo_JA, AT.buildH2Popo_KR, M.nichi.kan, M.nichi.shi, M._calc.kijin.join('・'), M._calc.kishin.join('・'))}
                    />
                  );
                })()}
              </Card>
            </div>
          )}

          {/* ══════════════ 人間関係タブ ══════════════ */}
          {activeTab === "relation" && (
            <div className="tab-content" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <Card glow>
                <SectionLabel en="RELATIONSHIPS · 人間関係" ja="人間関係占い" />
                <PopoSpeech
                  text={`壬水は「包容力」の水ンダ。どんな人も受け入れてしまうから、人間関係で消耗しやすいんダよ。INFPの共感力と合わさると、境界線を引くのが苦手になりやすいんダ。自分の「忌神（土）」を持つ人との関係には特に注意してほしいんダ🐼`}
                />
              </Card>

              <Card>
                <SectionLabel en="COMPATIBILITY · 相性" ja="相性分析（最大10人）" />
                <div style={{ textAlign: "center", padding: "32px 0", color: C.textMuted, fontSize: 14 }}>
                  <p style={{ marginBottom: 12 }}>相手の生年月日を登録すると</p>
                  <p style={{ fontFamily: "'Shippori Mincho',serif", fontSize: 18, color: C.gold, marginBottom: 20 }}>五行相性スコアを算出します</p>
                  <button style={{ padding: "12px 28px", borderRadius: 10, background: "rgba(201,168,76,0.12)", border: `1px solid ${C.border}`, color: C.gold, fontFamily: "'Shippori Mincho',serif", fontSize: 14, cursor: "pointer" }}>
                    ＋ 相手を登録する
                  </button>
                  <p style={{ fontSize: 11, color: C.textMuted, marginTop: 12 }}>最大10人まで登録可能（ライトプラン）</p>
                </div>
              </Card>
            </div>
          )}

          {/* ══════════════ 相性占いタブ ══════════════ */}
          {activeTab === "compat" && <CompatTab partners={partners} setPartners={setPartners} />}

          {/* ══════════════ AIチャットタブ ══════════════ */}
          {activeTab === "aichat" && <AiChatTab meishiki={M} />}

          {/* ══════════════ 専門家に相談タブ ══════════════ */}
          {activeTab === "expert" && <ExpertTab meishiki={M} />}



        </div>
      </div>
    </>
  );
}

// ── マウントエントリ ──
// 元 panda-fortune-paid.html 7921-7922 行
//   const root = ReactDOM.createRoot(document.getElementById('root'));
//   root.render(<ErrorBoundary><FortuneResult /></ErrorBoundary>);
// を export default に差し替え。main.jsx からマウントされる。
export default function App() {
  return (
    <ErrorBoundary>
      <FortuneResult />
    </ErrorBoundary>
  );
}
