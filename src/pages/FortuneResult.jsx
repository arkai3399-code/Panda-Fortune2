import React, { useState, useEffect } from 'react';
import { C } from '../data/theme.js';
import { MBTI_NAMES, MBTI_TYPES_32, HOURS } from '../data/mbtiNames.js';
import { calcMeishiki, loadInitialFortuneInput, _getJuniunsei } from '../engines/meishikiEngine.js';
import { getMbtiInfo } from '../engines/mbtiEngine.js';
import { buildMeishiki } from '../logic/buildMeishiki.js';
import {
  calcDailyScore,
  calcMonthlyScore,
  genComment,
  getFlowMonthKanshi,
  getLuckyLevel,
  getKaiUnRank,
} from '../logic/fortuneCalc.js';
import { useLang } from '../i18n/useLang.js';
import { langPick } from '../i18n/templateHelpers.js';
import * as AT from '../data/appTemplatesKr.js';
import { getZokanList, getMonthZokan } from '../data/genmeiText.js';
import { getStarDescByLang, buildStarFallback_JA, buildStarFallback_KR, getKuubouDescByLang, getTsuhenInfoByLang } from '../data/meishikiInlineDescs.js';
import { getTenkanIcon, getTenkanYomi } from '../data/tenkanIcons.js';
import TodayFortuneBlock from '../components/blocks/TodayFortuneBlock.jsx';
import HalfYearBlock from '../components/blocks/HalfYearBlock.jsx';
import KaiUnCalendar from '../components/blocks/KaiUnCalendar.jsx';
import CompatTab from '../components/tabs/CompatTab.jsx';
import CompatDetailPage from './CompatDetailPage.jsx';
import AiChatTab from '../components/tabs/AiChatTab.jsx';
import ExpertTab from '../components/tabs/ExpertTab.jsx';
import AccountDropdown from '../components/AccountDropdown.jsx';
import EditModal from '../components/EditModal.jsx';
import Card from '../components/common/Card.jsx';
import TabBtn from '../components/common/TabBtn.jsx';
import SectionLabel from '../components/common/SectionLabel.jsx';
import RadialScore from '../components/common/RadialScore.jsx';
import PandaIcon from '../components/common/PandaIcon.jsx';
import PopoSpeech from '../components/common/PopoSpeech.jsx';

// ══════════════════════════════════════════════════════════════
//  PANDA FORTUNE — ルートページ（FortuneResult）
//  元HTML 5854-7917行 function FortuneResult() { ... }
//
//  元実装との主な差分:
//    - window._FORTUNE_INPUT   → props initialUi / loadInitialFortuneInput()
//    - window._calcMeishiki    → import calcMeishiki
//    - window._MEISHIKI_CALC   → 削除（ローカル state のみで保持）
//    - window.PF_LANG.t(...)   → useLang().t
//    - window.PF_LANG.getLang/setLang → useLang().lang / setLang
//    - MEISHIKI                → useMemo で buildMeishiki を呼び出し計算
//
//  そのまま残している window.* 参照:
//    - window._pfSetActiveTab   compat-detail → メインのタブ切替ブリッジ。Phase 6 で置換予定。
//    - window.scrollTo          標準API。
// ══════════════════════════════════════════════════════════════

function FortuneResult({ initialCalc, initialUi: initialUiProp }) {
  const { t, lang, setLang } = useLang();
  const initialUi = initialUiProp || loadInitialFortuneInput();
  const initialCalcVal = initialCalc || calcMeishiki(initialUi);
  const MEISHIKI = React.useMemo(() => buildMeishiki(initialCalcVal, initialUi), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [activeTab, setActiveTab] = useState("meishiki");
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
    const ui = initialUi || {};
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
  const [compatDetailPartner, setCompatDetailPartner] = useState(null);  // 相性詳細ページに表示するパートナー（nullで通常タブ表示）


  useEffect(() => { setTimeout(() => setMounted(true), 100); }, []);
  useEffect(() => { window._pfSetActiveTab = setActiveTab; }, [setActiveTab]);

  // 命式更新ハンドラ
  const handleMeishikiSave = (newUi) => {
    setShowEditModal(false);
    setIsRecalculating(true);
    setTimeout(() => {
      const newCalc = calcMeishiki(newUi);
      
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

  // 相性詳細ページ表示時は他のUIを隠す
  if (compatDetailPartner) {
    return (
      <CompatDetailPage
        partner={compatDetailPartner}
        myCalc={M._calc}
        myInput={M._ui}
        onBack={() => { setCompatDetailPartner(null); window.scrollTo(0, 0); }}
      />
    );
  }

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
                <span style={{ fontSize: 12 }}>🏠</span><span className="pf-hdr-label">{t('トップ')}</span>
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
                <span style={{ fontSize: 12 }}>✏️</span><span className="pf-hdr-label">{t('命式を変更')}</span>
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
                  <span style={{ fontSize: 12 }}>👤</span><span className="pf-hdr-label">{t('マイアカウント')}</span> <span style={{ fontSize: 9, marginLeft: 2, opacity: 0.7 }}>{showAcctMenu ? '▲' : '▼'}</span>
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
                  defaultValue={lang}
                  onChange={e => { setLang(e.target.value); }}>
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
              ...((typeof window !== 'undefined' && window.PF_LANG && window.PF_LANG.getLang && window.PF_LANG.getLang() === 'kr') ? [] : [{ id: "expert", label: "専門家に相談", icon: "👨‍🏫", premium: "COMING" }]),

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
                  const baseProfile = NIKCHU_SELF_PROFILES[myProfileKey] || NIKCHU_SELF_PROFILES[myNikchu + '_普通格局'] || '';

                  // 五行バランス：最強・最弱
                  const gv = M.gokyo;
                  const gogyoArr = [
                    {g:'木',v:gv.moku},{g:'火',v:gv.hi},{g:'土',v:gv.do},{g:'金',v:gv.kin},{g:'水',v:gv.sui}
                  ].sort((a,b)=>b.v-a.v);
                  const topG = gogyoArr[0];
                  const botG = gogyoArr[gogyoArr.length-1];
                  const gogyoText = `命式全体を見ると「${topG.g}」のエネルギーが最も強く（${Math.round(topG.v)}点）、${topG.g==='木'?'成長・創造・共感':topG.g==='火'?'情熱・表現・行動力':topG.g==='土'?'安定・誠実・包容力':topG.g==='金'?'意志・美意識・決断':'知性・感受性・直感'}が個性の核になっているんダ。`;
                  const weakText = botG.v === 0
                    ? `逆に「${botG.g}」はゼロで、${botG.g==='木'?'柔軟性・共感':botG.g==='火'?'情熱・自己表現':botG.g==='土'?'安定・継続力':botG.g==='金'?'決断・意志力':'知性・直感'}の面が課題になりやすいんダよ。`
                    : `「${botG.g}」が最も少ない（${Math.round(botG.v)}点）から、意識的に補うといいんダ。`;

                  // 格局・喜忌神
                  const isJuou = kakukyoku && kakukyoku.indexOf('従旺') >= 0;
                  const kakuText = isJuou
                    ? `格局は「${kakukyoku}」——命式のエネルギーが一方向に集中した特別な型ンダ。`
                    : `格局は「普通格局」で、5つの五行がバランスよく命式に分布しているんダ。`;
                  const kiText = ki ? `喜神は「${ki}」で、この気が流れてくる時期・場所・人が最大の追い風になるンダ。忌神「${kj}」の気が強い環境は消耗しやすいから注意が必要ンダよ。` : '';

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
                  const kakuDetailText = isJuou
                    ? `格局は「${kakukyoku}」——命式のエネルギーが一方向に集中した特別な型ンダ。その五行の流れに乗って生きることで本来の力が最大化されるんダよ。`
                    : `格局は「普通格局」——5つの五行が命式にバランスよく分布している型ンダ。これは「どんな状況でも対応できる柔軟性を持つ」ということで、特定の分野に特化した才能より、幅広い場面で力を発揮できる強さがあるんダよ。`;

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
                  const juniuNatureText = dayUnsei ? `日柱の十二運星「${dayUnsei}」は、生まれ持った本質的な気質を示しているんダ。${JUNIU_NATURE[dayUnsei]||''}` : '';

                  // 大運テキストを充実
                  const duText = duIki
                    ? `そして今はちょうど喜神「${ki}」と大運が重なる追い風の時期ンダ。命式の強みが最大に発揮できるタイミングだから、積極的に動いていいんダよ。`
                    : duImi
                    ? `今は忌神「${kj}」が大運に流れている時期ンダ。命式にとって消耗しやすい流れだから、無理に攻めず守りを固めながら力を蓄える時期と考えるといいんダ。`
                    : `今の大運は命式に対して中立な流れンダ。大きな追い風も逆風もない時期だから、焦らず自分のペースで着実に積み上げていくのが一番ンダよ。`;

                  const popoText = `${baseProfile ? baseProfile + ' ' : ''}${gogyoText}${weakText}${kakuDetailText}${kiText}${tsTextDetail}${juniuNatureText}${duText}`;
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
                    const genmeiKan = isMonth
                      ? getMonthZokan(p.shi, M._calc?.pillars?.month?.daysFromSetsu)
                      : null;
                    const GOGYO_COLOR = { '木':'#7EC87A','火':'#E8745A','土':'#C9A84C','金':'#B8C8E0','水':'#6EB4DC' };
                    const JIKKAN_G2 = ['木','木','火','火','土','土','金','金','水','水'];
                    const JIKKAN_L2 = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
                    const kanGogyo = JIKKAN_G2[JIKKAN_L2.indexOf(p.kan)] || '土';
                    const gc = GOGYO_COLOR[kanGogyo] || C.gold;
                    return (
                      <div key={i} style={{
                        borderRadius: 14,
                        border: isDay ? `1.5px solid ${C.gold}` : "1px solid rgba(255,255,255,0.08)",
                        background: isDay ? "rgba(201,168,76,0.07)" : "rgba(255,255,255,0.02)",
                        overflow: "hidden",
                        position: "relative",
                      }}>
                        {/* 柱ラベル */}
                        <div style={{
                          padding: "8px 0 6px",
                          textAlign: "center",
                          background: isDay ? "rgba(201,168,76,0.12)" : "rgba(255,255,255,0.03)",
                          borderBottom: "1px solid rgba(255,255,255,0.05)",
                        }}>
                          <p style={{ fontSize: 11, color: isDay ? C.gold : C.textMuted, letterSpacing: "0.12em", fontWeight: isDay ? 700 : 400 }}>{p.label}</p>
                          {isDay && <p style={{ fontSize: 9, color: C.gold, opacity: 0.7, marginTop: 2 }}>あなた自身</p>}
                        </div>

                        {/* 天干 */}
                        <div style={{ padding: "14px 8px 8px", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                          <p style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", marginBottom: 4, letterSpacing: "0.1em" }}>天干</p>
                          {getTenkanIcon(p.kan) && (
                            <div style={{ width: 48, height: 48, margin: "0 auto 4px" }} dangerouslySetInnerHTML={{ __html: getTenkanIcon(p.kan) }} />
                          )}
                          <p style={{
                            fontSize: 36, fontFamily: "'Shippori Mincho',serif", fontWeight: 700, lineHeight: 1,
                            color: isDay ? C.goldLight : gc,
                          }}>{p.kan}</p>
                          <p style={{ fontSize: 10, color: isDay ? C.gold : "rgba(255,255,255,0.35)", marginTop: 4, opacity: 0.7 }}>{getTenkanYomi(p.kan)}</p>
                          <p style={{ fontSize: 9, color: gc, marginTop: 3, opacity: 0.8 }}>{kanGogyo}</p>
                        </div>

                        {/* 地支 */}
                        {(() => {
                          const JUNISHI_G2 = ['水','土','木','木','土','火','火','土','金','金','土','水'];
                          const JUNISHI_L2 = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
                          const shiGogyo = JUNISHI_G2[JUNISHI_L2.indexOf(p.shi)] || '土';
                          const sgc = GOGYO_COLOR[shiGogyo] || C.textSub;
                          return (
                            <div style={{ padding: "10px 8px 8px", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                              <p style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", marginBottom: 4, letterSpacing: "0.1em" }}>地支</p>
                              <p style={{
                                fontSize: 36, fontFamily: "'Shippori Mincho',serif", fontWeight: 700, lineHeight: 1,
                                color: isDay ? C.goldLight : sgc,
                              }}>{p.shi}</p>
                              <p style={{ fontSize: 9, color: sgc, marginTop: 5, opacity: 0.8 }}>{shiGogyo}</p>
                            </div>
                          );
                        })()}

                        {/* 十神 */}
                        <div style={{ padding: "8px 6px", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                          <p style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", marginBottom: 4, letterSpacing: "0.1em" }}>十神</p>
                          <p style={{ fontSize: 12, color: isDay ? C.gold : C.textSub, fontWeight: 600 }}>{p.jisshin || "—"}</p>
                        </div>

                        {/* 十二運 */}
                        <div style={{ padding: "8px 6px", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                          <p style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", marginBottom: 4, letterSpacing: "0.1em" }}>十二運</p>
                          <p style={{ fontSize: 12, color: C.textMuted }}>{p.unsei || "—"}</p>
                        </div>

                        {/* 蔵干（月柱は元命に該当する蔵干をゴールドで強調） */}
                        <div style={{ padding: "8px 6px 12px", textAlign: "center" }}>
                          <p style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", marginBottom: 6, letterSpacing: "0.1em" }}>蔵干</p>
                          <div style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "center" }}>
                            {zokan.map((k, ki) => {
                              const isGenmei = isMonth && k === genmeiKan;
                              return (
                                <span key={ki} style={{
                                  fontSize: isGenmei ? 13 : 11,
                                  color: isGenmei ? C.gold : C.textMuted,
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
                            <p style={{ fontSize: 8, color: C.gold, opacity: 0.7, marginTop: 4, letterSpacing: '0.05em' }}>★=元命</p>
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
                  const vals = [
                    { key:'sui', label:'水', val:gv.sui, emoji:'💧', color:C.waterBlue,  bg:'rgba(80,140,200,0.08)',  bd:'rgba(80,140,200,0.2)',
                      trait:'直感力・柔軟性・知性が高い。流れに乗る力が強く、環境に応じて自在に形を変えられる。',
                      weak:'水が少ないと、直感が鈍く固執しやすくなる傾向があるんダ。',
                      supply:'水を補うには、北方位・黒・夜・冬・水辺が吉ンダよ。' },
                    { key:'hi',  label:'火', val:gv.hi,  emoji:'🔥', color:C.fireRed,    bg:'rgba(180,60,50,0.08)',   bd:'rgba(180,60,50,0.2)',
                      trait:'表現力・情熱・華やかさ。行動力があり、まわりを巻き込む熱量を持っているんダ。',
                      weak:'火が少ないと、自己表現が苦手で引っ込み思案になりやすいんダ。',
                      supply:'火を補うには、南方位・赤・昼・夏・明るい場所が吉ンダよ。' },
                    { key:'do',  label:'土', val:gv.do,  emoji:'🏔️', color:C.earthYellow, bg:'rgba(160,130,50,0.07)', bd:'rgba(160,130,50,0.2)',
                      trait:'安定感・誠実さ・信頼性。地に足がついた判断力と、人を支える包容力があるんダ。',
                      weak:'土が少ないと、根気がなく気持ちが安定しにくい傾向があるんダ。',
                      supply:'土を補うには、中央・黄・午後・土用・山や大地が吉ンダよ。' },
                    { key:'moku',label:'木', val:gv.moku,emoji:'🌿', color:C.woodGreen,  bg:'rgba(100,180,80,0.06)',  bd:'rgba(100,180,80,0.15)',
                      trait:'成長・創造・柔軟性。新しいことへの好奇心と、しなやかに伸びていく力があるんダ。',
                      weak:'木が少ないと、発想が固まりやすく新しいことへの踏み出しが遅くなりやすいんダ。',
                      supply:'木を補うには、東方位・緑・朝・春・植物のある場所が吉ンダよ。' },
                    { key:'kin', label:'金', val:gv.kin, emoji:'⚙️', color:C.metalWhite,  bg:'rgba(180,170,150,0.06)', bd:'rgba(180,170,150,0.18)',
                      trait:'意志の強さ・鋭さ・美意識。妥協しない精神と、物事を整える力があるんダ。',
                      weak:'金が少ないと、決断力が鈍く優柔不断になりやすい傾向があるんダ。',
                      supply:'金を補うには、西方位・白・夕・秋・金属・鉱物が吉ンダよ。' },
                  ];
                  // 全5行を強さ順に並べ、役割ラベルを付与して全表示
                  const sorted = [...vals].sort((a,b)=>b.val-a.val);
                  const SEI  = {木:'火',火:'土',土:'金',金:'水',水:'木'};
                  const KOKU = {木:'土',火:'金',土:'水',金:'木',水:'火'};
                  const kishin = M.kishin || (M._calc && M._calc.kishin) || [];
                  const maxVal = sorted[0].val;
                  const minVal = sorted[sorted.length-1];

                  const roleLabel = (v, idx, item) => {
                    if(idx===0) return 'あなたの核となる個性';
                    if(item.val===0) return kishin.includes(item.label)?'補うと運気アップ（喜神）':'補いたいエネルギー';
                    if(kishin.includes(item.label)) return '喜神 — 追い風の気';
                    if(item.val===minVal.val && item.key===minVal.key) return kishin.includes(item.label)?'補うと運気アップ（喜神）':'補いたいエネルギー';
                    const rel1 = SEI[sorted[0].label]===item.label||SEI[item.label]===sorted[0].label;
                    const clash = KOKU[sorted[0].label]===item.label||KOKU[item.label]===sorted[0].label;
                    if(rel1)  return `${sorted[0].label}を支える相生の気`;
                    if(clash) return `${sorted[0].label}と対立しやすい気`;
                    return 'バランスの取れたエネルギー';
                  };

                  const cardDesc = (item, idx) => {
                    if(item.val===0) return item.supply;
                    if(idx===0) return item.trait;
                    const rel = SEI[sorted[0].label]===item.label||SEI[item.label]===sorted[0].label;
                    const clash = KOKU[sorted[0].label]===item.label||KOKU[item.label]===sorted[0].label;
                    if(rel)   return item.trait+` ${sorted[0].label}と${item.label}は相生の関係なので、この2つが高いとエネルギーが自然に循環するんダ。`;
                    if(clash) return item.trait+` ただし${sorted[0].label}と${item.label}は相剋の関係にあるため、バランスに注意ンダよ。`;
                    if(item.val<=1.5) return item.weak+' '+item.supply;
                    return item.trait;
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

                  const KI_INFO = {
                    木:{season:'春・朝',dir:'東',color:'緑・青',obj:'植物・木製品',lucky:'木・緑の場所'},
                    火:{season:'夏・昼',dir:'南',color:'赤・橙',obj:'明るい場所・炎',lucky:'火・明るい場所'},
                    土:{season:'土用・午後',dir:'中央',color:'黄・茶',obj:'土地・山',lucky:'土・山・大地'},
                    金:{season:'秋・夕',dir:'西',color:'白・金属',obj:'金属・鉱石',lucky:'金・金属・白'},
                    水:{season:'冬・夜',dir:'北',color:'黒・紺',obj:'水辺・川',lucky:'水・黒・夜'},
                  };
                  const kiDesc = (() => {
                    const lines = kiArr.map(g=>KI_INFO[g]?`${KI_INFO[g].season}・${KI_INFO[g].dir}方位・${KI_INFO[g].color}`:'').filter(Boolean);
                    return lines.length ? lines.join('\n') + '\nが吉ンダよ。' : '';
                  })();
                  const kjDesc = (() => {
                    const lines = kjArr.map(g=>KI_INFO[g]?`${KI_INFO[g].season}・${KI_INFO[g].dir}方位・${KI_INFO[g].color}`:'').filter(Boolean);
                    return lines.length ? lines.join('\n') + '\nの方位・時間帯は消耗しやすいんダ。' : '';
                  })();

                  // 格局説明（充実版）
                  const SEI_KK = {木:'火',火:'土',土:'金',金:'水',水:'木'};
                  const KOKU_KK= {木:'土',火:'金',土:'水',金:'木',水:'火'};
                  const isJuou = kk.includes('従旺');
                  const kkDesc = (() => {
                    const kiStr = ki !== '─' ? ki : '喜神';
                    const kjStr = kj !== '─' ? kj : '忌神';
                    if(isJuou && nGogyo){
                      return `あなたの命式は「${nGogyo}」のエネルギーが全体の${Math.round(dominantRatio*100)}%以上を占める特別な型ンダ。`
                        +`${nGogyo}の気に逆らうより「${nGogyo}らしく」生きることで本来の力が最大になるんダよ。`
                        +`喜神の「${kiStr}」が流れてくる${kiArr.map(g=>KI_INFO[g]?.season||'').filter(Boolean).join('・')||'時期'}は特に追い風ンダ。`
                        +`逆に忌神の「${kjStr}」が強まる時期は無理をしないことが大切ンダ🐼`;
                    }
                    // 普通格局
                    const gogyoRanked = ['moku','hi','do','kin','sui']
                      .map(k=>({g:{moku:'木',hi:'火',do:'土',kin:'金',sui:'水'}[k],v:gv[k]}))
                      .sort((a,b)=>b.v-a.v);
                    const top = gogyoRanked[0].g;
                    const bot = gogyoRanked[gogyoRanked.length-1].g;
                    return `あなたの命式は5つの五行がバランスよく分布している「普通格局」ンダ。`
                      +`中でも「${top}」が最も強く（${gogyoRanked[0].v}点）、あなたの個性の核になっているんダよ。`
                      +`喜神の「${kiStr}」の流れが来る時期・場所・人が最大の追い風になるんダ。`
                      +`逆に「${bot}」は最も少ないエネルギーで（${gogyoRanked[gogyoRanked.length-1].v}点）、ここを補う${KI_INFO[bot]?.lucky||bot+'の気'}を意識すると運気が安定するんダよ🐼`;
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
                                <p style={{ fontSize:12, color:C.textMuted, lineHeight:1.9, whiteSpace:'pre-line' }}>{kiDesc || `${ki}の気が強い日・場所・人が追い風になるんダよ。`}</p>
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
                                <p style={{ fontSize:12, color:C.textMuted, lineHeight:1.9, whiteSpace:'pre-line' }}>{kjDesc || `${kj}の気が強い日は消耗しやすいんダ。`}</p>
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
                    // SEI[tg]===ng → 生我 → 偏印/正印
                    // KOKU[tg]===ng→ 克我 → 偏官/正官
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
                  // 天干の通変星
                  const kanTsuhen = pillarRows.map(r => r.isDay ? '─（日主）' : getTsuhen(dayKan, r.kan));
                  // 蔵干の通変星（地支から蔵干を取得）
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
                  // ランキングはエンジンが算出済 (calc.jisshinCount = 蔵干分野表加重)
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
                  const JUNIU_INFO = {
                    '長生': { energy:8,  color:'rgba(100,200,120,0.9)', bar:'rgba(100,200,120,0.7)', desc:'才能が芽吹き始める時期。新しいことへの感受性が高く、成長の可能性に満ちている。' },
                    '沐浴': { energy:4,  color:'rgba(150,200,180,0.8)', bar:'rgba(150,200,180,0.5)', desc:'感受性が極めて高く多感なフェーズ。芸術的才能・色気・変化の多い人生を示す。' },
                    '冠帯': { energy:7,  color:'rgba(120,190,100,0.9)', bar:'rgba(120,190,100,0.6)', desc:'才能が形になり始める成長期。社会デビューや新しい役割に縁がある。' },
                    '建禄': { energy:9,  color:'rgba(80,200,100,0.9)',  bar:'rgba(80,200,100,0.75)', desc:'エネルギーが充実した実力発揮の時期。自立心が強く、仕事で力を発揮できる。' },
                    '帝旺': { energy:10, color:'rgba(200,168,60,0.95)', bar:'rgba(200,168,60,0.85)', desc:'最もエネルギーが強い全盛期。カリスマ性・主体性・存在感が際立つ。' },
                    '衰':   { energy:6,  color:'rgba(180,160,80,0.8)',  bar:'rgba(180,160,80,0.55)', desc:'エネルギーを保ちながら次を見据える時期。経験を活かした堅実な動き方が吉。' },
                    '病':   { energy:3,  color:'rgba(160,130,100,0.8)', bar:'rgba(160,130,100,0.4)', desc:'内省が深まり繊細さが増すフェーズ。直感力・芸術性が上がるが体調管理が大切。' },
                    '死':   { energy:2,  color:'rgba(140,120,160,0.8)', bar:'rgba(140,120,160,0.35)',desc:'古いものを手放して次の準備をする転換期。変革・再生のエネルギーが宿る。' },
                    '墓':   { energy:5,  color:'rgba(120,100,180,0.8)', bar:'rgba(120,100,180,0.5)', desc:'内に秘めた力が蓄積される時期。表には出ないが、底力と深みが増していく。' },
                    '絶':   { energy:1,  color:'rgba(160,100,140,0.8)', bar:'rgba(160,100,140,0.3)', desc:'新しいサイクルの始まる転換点。過去を断ち切って新境地へ向かうエネルギー。' },
                    '胎':   { energy:3,  color:'rgba(180,120,120,0.8)', bar:'rgba(180,120,120,0.35)',desc:'可能性が宿り始める段階。新しい才能・縁・プロジェクトの種が芽生える時期。' },
                    '養':   { energy:5,  color:'rgba(160,140,100,0.8)', bar:'rgba(160,140,100,0.45)',desc:'育まれ守られる時期。環境・人・組織に支えられながら力を蓄えるフェーズ。' },
                    '不明': { energy:0,  color:C.textMuted, bar:'rgba(100,100,100,0.3)', desc:'─' },
                  };
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
                        return `十二運星で命式を読み解いたんダよ🐼 日柱（あなた自身）は「${dayUnsei}」ンダ。${infoD.desc || ''}` +
                               ` 月柱（社会・仕事）は「${moUnsei}」で、${infoM.desc || ''}` +
                               ` 日主「${dayKan}（${dayGogyo}）」と組み合わせると、${infoD.energy >= 8 ? 'エネルギーが強く自分の力で道を切り開けるタイプ' : infoD.energy >= 5 ? '内に力を蓄えながら着実に進んでいくタイプ' : '変化や転換を経て深みを増していくタイプ'}ンダよ🐼`;
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

                  if(sgH && score >= 75) return `${DL}「${todayS.kanshi}」は、あなたの命式にとって特別な日ンダ。日支の支合が成立しているから、配偶者宮——つまり「縁を引き寄せる扉」が開いている状態なんダよ。運命的な出会いとか、ずっと言えなかった気持ちを伝えるとか、そういう動きが今日は命式に後押しされているんダ。「なんとなく今日じゃなくていいか」って思う気持ちがあっても、今日動いた方がいいんダよ。後回しにしてきたことを、今日一つだけ動かしてみてほしいんダ🐼`;

                  if(js==='正官' && score >= 70) return `「${todayS.kanshi}」${DL}は「正官」の星が立っているんダ。正官は地位・誠実さ・真剣な縁を表す星で、恋愛でいうと「本物の縁が動く」日なんダよ。軽い出会いより、長く続くような深い関係が結ばれやすい。${DL}出会った人や、${DL}深まった関係は、あとから振り返ったとき「あの日が転機だった」と思うような意味を持つことが多いんダよ。真剣な気持ちがあるなら、${DL}それを行動に変えてみてほしいんダ🐼`;

                  if((js==='食神'||js==='傷官') && score >= 65) return `${DL}「${todayS.kanshi}」日は「${js}」の星が立っていて、あなたの感性や表現力が自然に輝く日ンダ。恋愛は技術じゃなくて「その人らしさ」で動くんダよ。${DL}は無理に計算しなくていい。ただ素直に、感じたことを言葉や態度で出してみてほしいんダ。あなたの「ありのまま」が一番の武器になる日なんダよ。気になる相手がいるなら、今日の自分を見せてみてほしいんダ🐼`;

                  if(js==='偏財' && score >= 65) return `「${todayS.kanshi}」${DL}は「偏財」の星ンダ。偏財は行動力と異性縁を同時に持つ星で、待っていても縁は来なくて、動いた人に縁が引き寄せられる日なんダよ。気になる相手への連絡、新しい場所への外出、普段と違う行動——${DL}は「動いたもの勝ち」の日ンダ。好奇心のままに動いてみてほしいんダよ🐼`;

                  if(rkH) return `${DL}「${todayS.kanshi}」日は、あなたの日支と六冲の関係にあるんダ。六冲というのは「エネルギーが真正面からぶつかる」状態で、感情が揺れやすく、言葉が意図と違う方向に伝わってしまうことがあるんダよ。大事な告白や、感情的になりそうな話し合いは${DL}じゃない方がいいんダ。${DL}は相手の言葉を真に受けすぎず、自分の気持ちをいったん落ち着かせることに使ってほしいんダよ🐼`;

                  if(score >= 75) return `「${todayS.kanshi}」${DL}は恋愛運が高めの日ンダ。${kiH?`喜神「${ki}」の流れが天干に乗っていて、命式全体に追い風が吹いているんダよ。`:''}恋愛は「タイミング」で動くことがとても多いんダ。${DL}は命式がそのタイミングをくれているから、気になっていること・気になっている相手に対して、一歩踏み出してほしいんダよ🐼`;

                  if(score >= 60) return `「${todayS.kanshi}」${DL}の恋愛運は穏やかな流れンダ。大きな動きより、今ある関係を丁寧に育てることに向いている日なんだよ。好きな人がいるなら、派手なアクションより「相手が嬉しいと思う小さなこと」を一つやってみてほしいんダ。そういう積み重ねが、長い目で見たとき本物の縁を育てていくんだよ🐼`;

                  return `${DL}「${todayS.kanshi}」日は、命式的に恋愛への後押しが弱い日ンダ。これは「縁がない」ということじゃなくて、「${DL}は自分のエネルギーを恋愛に使う日じゃない」ということなんダよ。好きな人のことを考える時間より、自分を磨くことや、自分が楽しいと思えることに使った方が、結果的に魅力が上がって縁も引き寄せられるんダ。焦らなくていいんダよ🐼`;
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

                  if(js==='正官') return `「${todayS.kanshi}」${DL}は「正官」の星が立っているんダ。正官というのは、地位・評価・信頼という、仕事の核心に関わる星なんダよ。${DL}は「ちゃんとやっている人がちゃんと見てもらえる」日ンダ。先送りにしていた報告や提案、上の人への連絡——${DL}動いたことは、いつも以上にきちんと届くんダよ。評価が気になっていたなら、${DL}一歩出てみてほしいんダ🐼`;

                  if(js==='食神') return `${DL}「${todayS.kanshi}」日は「食神」の日ンダ。食神は才能・表現・創造性を司る星で、仕事でいうと「自分の得意が一番輝く日」なんダよ。マニュアル通りに動くより、自分なりの工夫やアイデアを出した方がずっといい結果になる。${DL}は「正解」を探すより「自分らしい答え」を出す日ンダよ。眠っているアイデアがあるなら、${DL}それを形にしてみてほしいんダ🐼`;

                  if(js==='傷官') return `「${todayS.kanshi}」${DL}は「傷官」の星ンダ。傷官は天才性と反骨心を持つ星で、${DL}は常識や既存のやり方に疑問を感じやすい日なんだよ。それは弱点じゃなくてあなたの才能が目覚めているサインンダ。ただ上の人への言い方には気をつけて——${DL}は「伝え方」に少しだけ丁寧さを足すと、あなたの才能が正しく伝わるんダよ🐼`;

                  if(js==='偏官') return `「${todayS.kanshi}」${DL}は「偏官」の星ンダ。偏官は行動力・突破力・プレッシャー耐性に関わる星で、${DL}は「攻める」動きに向いている日なんダよ。難しそうだと思っていた仕事、少し高い目標——${DL}はそういうものに手を伸ばすといい。ただ、体力と集中力の消費が激しい日でもあるから、無理し過ぎず、やりきったら早めに休んでほしいんダよ🐼`;

                  if(js==='偏印'||js==='正印') return `${DL}「${todayS.kanshi}」日は「${js}」の星ンダ。印星は学習・知識・内省に関わる星で、${DL}は「インプットの日」と思うといいんだよ。人から学ぶ、本を読む、考えをまとめる——アウトプットより情報を取り込むことに向いている日ンダ。${DL}吸収したことが、あとで大きな仕事のアイデアに変わることがあるんダよ🐼`;

                  if(js==='劫財') return `${DL}「${todayS.kanshi}」日は「劫財」の星が立っているんダ。劫財は競争や横取り、思わぬ妨害が起きやすい星なんダよ。大切な交渉・重要な契約・感情的になりそうな話し合いは、${DL}じゃない方がいいんダ。${DL}は自分のペースをしっかり守って、周りの雑音に振り回されないように動くといいんダよ🐼`;

                  if(score >= 78) return `「${todayS.kanshi}」${DL}は仕事運が高めの日ンダ。${kiH?`喜神「${ki}」の流れが来ていて、あなたの命式に追い風が吹いているんダよ。`:''}こういう日は「やろうかどうか迷っていること」を動かすのに最適なんダ。迷っていた連絡、腰が重かった提案——${DL}一つ動かしてみてほしいんダよ。思っていたより物事がスムーズに進むことが多い日ンダ🐼`;

                  if(score >= 62) return `「${todayS.kanshi}」${DL}の仕事運は穏やかな流れンダ。大きな動きより、今やるべきことを丁寧にこなすことに集中する日なんダよ。${DL}コツコツやった積み上げが、あとで「あのとき頑張っていてよかった」と思える土台になっていくんダ。地味でも着実に、今日を大切に使ってほしいんダよ🐼`;

                  return `${DL}「${todayS.kanshi}」日は、命式的に仕事への追い風が少ない日ンダ。焦って動いても空回りしやすいから、${DL}は「攻める日」ではなく「整える日」として使うといいんだよ。デスクの整理、タスクの整理、気になっていた小さなことの後始末——そういうことに使うと、次に追い風が来たとき一番うまく動けるんダよ🐼`;
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

                  if(js==='偏財') return `「${todayS.kanshi}」${DL}は「偏財」の星が立っているんダ。偏財は「動いた人にお金がついてくる」星なんだよ。コツコツ型じゃなくて、チャンスをつかんで大きく動くことで金運が開くタイプの日ンダ。思わぬところからお金が動いたり、財に関わるいい縁が舞い込むこともあるんだよ。${DL}は「面白そう」「やってみたい」という直感を大切にして動いてほしいんダ。ただし、勢いに乗りすぎて後から後悔するような出費だけは注意ンダよ💰🐼`;

                  if(js==='正財') return `「${todayS.kanshi}」${DL}は「正財」の星ンダ。正財はコツコツ積み上げた努力がお金という形で返ってくる星なんだよ。${DL}は「地味だけど確実な行動」が一番金運に直結する日ンダ。丁寧な仕事・約束をきちんと守ること・小さな信頼の積み重ね——そういうことが${DL}は直接お金の流れを引き寄せるんダよ。派手な動きより、誠実な積み上げを選んでほしいんダ🐼`;

                  if(js==='食神') return `「${todayS.kanshi}」${DL}は「食神」の星ンダ。食神は才能・表現・創造性から財が生まれる星なんだよ。${DL}は「好きなことをやること」「得意なことを発揮すること」が、そのまま金運アップにつながっていくんダ。義務感でやる仕事より、楽しんでやる仕事の方が今日は実入りが良くなりやすいんだよ。あなたが「これは自分の得意だな」と思えることを、${DL}は一つ全力でやってみてほしいんダ🐼`;

                  if(js==='劫財') return `「${todayS.kanshi}」${DL}は「劫財」の星が立っているんダ。劫財は散財・横取り・思わぬ出費が起きやすい星で、今日は金運的に守りの日なんダよ。衝動買い、勢いでの出費、よく考えていない投資——こういうものは${DL}じゃなくていいんダ。財布の紐をしっかり締めて、「${DL}は使わない日」と決めておくだけで、金運の流れが変わってくるんだよ🐼`;

                  if(js==='比肩') return `「${todayS.kanshi}」${DL}は「比肩」の星ンダ。比肩は独立心と競争を表す星で、金運的には「財が散りやすい」日なんダよ。人への奢りや見栄のための出費、競争心からの浪費——こういうことが起きやすいから気をつけてほしいんダ。${DL}は自分のためにお金を使うより、将来のために貯めることを意識した方がいい日ンダよ🐼`;

                  if(js==='偏官') return `「${todayS.kanshi}」${DL}は「偏官」の星ンダ。偏官はプレッシャーと出費が重なりやすい星なんだよ。急な出費や、立場上断れない支払いが発生しやすい日ンダ。それ自体は仕方ないんだけど、${DL}は余分な出費をなるべく控えて、財布に余裕を持っておくといいんダよ🐼`;

                  if(score >= 78) return `「${todayS.kanshi}」${DL}は金運の流れがいい日ンダ。${kiH?`喜神「${ki}」の気が天干に乗っていて、命式に追い風が来ているんダよ。`:''}こういう日はお金に関わる行動を少し積極的にしてみていいんダ。気になっていた投資の下調べ、副収入になりそうなことへの一歩、普段より少しだけ広い視野でお金を動かしてみてほしいんダよ🐼`;

                  if(score >= 62) return `「${todayS.kanshi}」${DL}の金運は穏やかな流れンダ。大きく動かすより、今あるお金と向き合う日にするといいんだよ。家計の見直し、使っているサービスの整理、将来のための小さな貯め——地味だけど、こういうことをやった日の積み重ねが、あとから大きな安心になっていくんダよ🐼`;

                  return `「${todayS.kanshi}」${DL}は、命式的に金運への後押しが少ない日ンダ。焦ってお金を動かしても空回りしやすいから、今日は「守る日」と決めてほしいんダよ。高額の買い物や重要な金銭の判断、新しい投資——こういうことは別の日に持ち越すのが賢いんダ。今日は計画を立てる・情報を集める・将来への準備をする日として使ってほしいんダよ🐼`;
                })()} />
              </Card>
            </div>
          );})()}

          {/* ══════════════ タイムラインタブ ══════════════ */}
          {activeTab === "timeline" && (
            <div className="tab-content" style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* 今日の運勢（トップ） */}
              <Card glow>
                <SectionLabel en="TODAY · 2026年3月12日（水）" ja="今日の運勢" />
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
                  📖 <span style={{ color:C.textSub }}>今のフェーズ：</span>命式の十二運星は生涯固定ですが、10年ごとの大運・毎年の流年にも十二運星が当たります。今あなたがどのエネルギーフェーズにいるかを示しているんダよ。
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
                  const JUNIU_INFO = {
                    '長生':{ energy:8,  color:'rgba(100,200,120,0.9)', bar:'rgba(100,200,120,0.7)', icon:'🌱', phase:'成長期', desc:'才能が芽吹き、感受性が高まっている時期。新しいことを始めるのに最適ンダ。' },
                    '沐浴':{ energy:4,  color:'rgba(150,200,180,0.8)', bar:'rgba(150,200,180,0.5)', icon:'🌊', phase:'感受期', desc:'感受性が極めて高く多感な時期。感情の波に乗りやすく、恋愛や芸術が活発になるんダ。' },
                    '冠帯':{ energy:7,  color:'rgba(120,190,100,0.9)', bar:'rgba(120,190,100,0.6)', icon:'🎓', phase:'開花期', desc:'才能が形になり始める時期。周囲から認められる機会が増えてくるんダよ。' },
                    '建禄':{ energy:9,  color:'rgba(80,200,100,0.9)',  bar:'rgba(80,200,100,0.75)',icon:'💪', phase:'充実期', desc:'エネルギーが充実した実力発揮の時期。独立・自立に向けて動くと結果が出やすいんダ。' },
                    '帝旺':{ energy:10, color:'rgba(201,168,76,0.95)', bar:'rgba(201,168,76,0.85)',icon:'👑', phase:'全盛期', desc:'最もエネルギーが強い全盛期。カリスマ性が頂点に達し、主体的に動けば大きな成果が出るんダよ。' },
                    '衰':  { energy:6,  color:'rgba(180,160,80,0.8)',  bar:'rgba(180,160,80,0.55)',icon:'🍂', phase:'成熟期', desc:'経験を活かして堅実に進む時期。派手な動きより着実な積み上げが吉ンダ。' },
                    '病':  { energy:3,  color:'rgba(160,130,100,0.8)', bar:'rgba(160,130,100,0.4)',icon:'🌙', phase:'内省期', desc:'内省が深まる繊細な時期。無理せず、体調と心を整えることが最優先ンダよ。' },
                    '死':  { energy:2,  color:'rgba(140,120,160,0.8)', bar:'rgba(140,120,160,0.35)',icon:'🍃', phase:'転換期', desc:'古いものを手放して次のサイクルへ向かう時期。手放すことで新しい縁が入ってくるんダ。' },
                    '墓':  { energy:5,  color:'rgba(120,100,180,0.8)', bar:'rgba(120,100,180,0.5)', icon:'🌰', phase:'蓄積期', desc:'表には出ないが、内側に力が蓄積されている時期。焦らず、種をまき続けるんダよ。' },
                    '絶':  { energy:1,  color:'rgba(160,100,140,0.8)', bar:'rgba(160,100,140,0.3)', icon:'🌫️', phase:'転換点', desc:'新サイクルが始まる転換点。今までの流れが変わり、新しい方向性が見え始めるんダ。' },
                    '胎':  { energy:3,  color:'rgba(180,120,120,0.8)', bar:'rgba(180,120,120,0.35)',icon:'🥚', phase:'宿り期', desc:'新しい可能性が宿り始める時期。まだ見えないが、着実に次のエネルギーが育っているんダよ。' },
                    '養':  { energy:5,  color:'rgba(160,140,100,0.8)', bar:'rgba(160,140,100,0.45)',icon:'🌿', phase:'養成期', desc:'育まれ守られる時期。無理に動かず、環境や人に甘えながら力を蓄えるのが正解ンダ。' },
                    '─':   { energy:0,  color:C.textMuted, bar:'rgba(100,100,100,0.3)', icon:'─', phase:'─', desc:'─' },
                    '不明': { energy:0, color:C.textMuted, bar:'rgba(100,100,100,0.3)', icon:'？', phase:'─', desc:'─' },
                  };
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
                        const duAge = du ? `${du.ageFrom}〜${du.ageTo}歳の大運` : '今の大運';
                        const samePhase = duUnsei === yrUnsei;
                        return `今のあなたは「${duUnsei}（${duInfo.phase}）」の大運と「${yrUnsei}（${yrInfo.phase}）」の流年が重なっているんダよ🐼` +
                          ` ${duInfo.desc}` +
                          (samePhase ? ` 大運と流年が同じフェーズなので、このエネルギーが特に強く出ているんダ。` : ` 流年は「${yrInfo.desc}」`) +
                          ` 日主「${dayKan}（${dayGogyo}）」にとって、今はどう動くべきかのヒントがここに隠れているんダよ🐼`;
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

                        // 大運の五行と自分の五行の関係
                        const kanRel  = (() => {
                          if(!dKanG||!nG) return '';
                          if(SEI_D[dKanG]===nG) return `天干「${curDaiun.kan}（${dKanG}）」があなたの日主「${nG}」を生む相生の関係ンダ。`;
                          if(KOKU_D[dKanG]===nG) return `天干「${curDaiun.kan}（${dKanG}）」があなたの日主「${nG}」を剋す相剋の関係ンダ。`;
                          if(dKanG===nG) return `天干「${curDaiun.kan}（${dKanG}）」があなたの日主と同じ五行ンダ。`;
                          return `天干「${curDaiun.kan}（${dKanG}）」の${dKanG}の気が流れる時期ンダ。`;
                        })();
                        const shiRel  = dShiG ? `地支「${curDaiun.shi}（${dShiG}）」の影響も加わるんダ。` : '';

                        // 特徴・仕事・恋愛・注意 を五行の関係から生成
                        const feature = isKiDaiun
                          ? `「${dKanG||dShiG}」の気があなたの喜神（${ki}）に一致する「喜神期」ンダ。実力が外に出やすく、行動したことが結果につながりやすい時期ンダよ。`
                          : isKjDaiun
                          ? `「${dKanG||dShiG}」の気があなたの忌神（${kj}）に一致する「忌神期」ンダ。慎重に動くことで消耗を防げるんダよ。`
                          : `五行的には中立の時期ンダ。特別な追い風も逆風もないので、自分のペースで着実に動くのが吉ンダよ。`;

                        const work = isKiDaiun
                          ? '実績を積み上げるのに最適な時期ンダ。アイデアや提案が通りやすく、新しいことを始めるにも良い大運ンダよ。'
                          : isKjDaiun
                          ? '大きな賭けや転職など、リスクの高い動きは一段落してから行うのが吉ンダ。地道な積み上げを続けてほしいんダよ。'
                          : '着実に積み上げることが重要な時期ンダ。焦らず自分の専門性を深めていくといい大運ンダよ。';

                        const love = SEI_D[dKanG]===nG||SEI_D[dShiG]===nG
                          ? '縁が深まりやすく、出会い・関係の進展に追い風の時期ンダ。積極的に動くといい結果が出やすいんダよ。'
                          : KOKU_D[dKanG]===nG||KOKU_D[dShiG]===nG
                          ? '感情の波が大きくなりやすい時期ンダ。焦らず、じっくりと相手を見極めることが大切ンダよ。'
                          : '恋愛は安定した時期ンダ。日常の積み重ねを大切にすると、関係が深まっていくんダよ。';

                        const caution = isKjDaiun
                          ? `忌神（${kj}）が強まる時期なので、${kjArr.map(g=>KI_INFO_D[g]?.season).filter(Boolean).join('・')||'消耗しやすい時期'}は無理をしないことが特に大切ンダ。`
                          : dShiG==='土' ? `地支「${curDaiun.shi}（土）」が含まれるため、土旺の時期（土用・年末年始）は体調管理に注意ンダ。`
                          : '大きな問題はないが、大運の切り替わりの前後1〜2年はエネルギーの変化期。無理な行動は避けてほしいんダよ。';

                        return (
                          <div style={{padding:"16px 18px",borderRadius:14,background:"rgba(201,168,76,0.06)",border:"1px solid rgba(201,168,76,0.2)",marginBottom:16}}>
                            <p style={{fontSize:11,color:C.gold,letterSpacing:"0.1em",marginBottom:12,fontWeight:600}}>現在の大運（{curDaiun.ageFrom}〜{curDaiun.ageTo}歳）について</p>
                            <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:"10px 16px",fontSize:13}}>
                              {[
                                {label:"大運", value:`${curDaiun.kan}${curDaiun.shi}（${curDaiun.kan}=${dKanG}・${curDaiun.shi}=${dShiG}）`},
                                {label:"関係", value:kanRel+(shiRel?' '+shiRel:'')},
                                {label:"特徴", value:feature},
                                {label:"仕事", value:work},
                                {label:"恋愛", value:love},
                                {label:"注意", value:caution},
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
                    const calc = M._calc;
                    if(!calc || !M._ui) return 'あなたの大運の流れを読み解いているンダ🐼';
                    const currentAge = new Date().getFullYear() - (M._ui.year||1990);
                    const daiunFull  = calc.daiunList || [];
                    const curIdx     = daiunFull.findIndex(function(d){ return currentAge >= d.ageFrom && currentAge <= d.ageTo; });
                    const curD       = curIdx>=0 ? daiunFull[curIdx] : daiunFull[0];
                    const nextD      = daiunFull[curIdx+1];
                    if(!curD) return 'あなたの大運を確認しているんダ🐼';
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
                      const boost = isSei ? 'あなたの日主「'+myG+'」がこの大運の五行に生かされる形で、特に力が引き出されやすい状態ンダ。' : isHiwa ? 'あなたの日主「'+myG+'」と同じ気が流れていて、自分らしさが最大限に発揮されやすい時代ンダ。' : 'あなたの命式にとって追い風の気が流れていて、動いた分だけ結果がついてくる時代ンダ。';
                      body = '今の大運「'+cName+'（'+period+'）」は、あなたにとって命式的な追い風が吹いている時代ンダよ🌟' + NL + NL + 'この大運は「'+(WHAT[cKG]||cKG)+'」の気が流れていて、'+(SCENE[cKG]||cKG+'に関わること')+'がどんどん実りやすい状態ンダ。'+boost + NL + NL + '【今この時期にやるべきこと】' + NL + (DOACT[cKG]||'自分らしく動くこと') + NL + NL + 'こういう時期に動いた量が、人生の転換点になるんダよ🐼';
                    } else if(isKj) {
                      const myRelation = isKoku ? '「'+kj+'」の気があなたの「'+myG+'」と衝突する関係にあって' : 'あなたの命式が苦手とする「'+kj+'」の気が大運に流れていて';
                      body = '今の大運「'+cName+'（'+period+'）」は、'+myRelation+'、エネルギーが消耗しやすい時期に入っているんダ🐼' + NL + NL + 'この大運には「'+(WHAT[cKG]||cKG)+'」の気が流れているんダけど、あなたの命式にとっては向かい風になる気なんだよ。無理に攻め続けると消耗するし、焦れば焦るほど結果が出にくくなる——そういう構造になっているんダ。' + NL + NL + '【なぜ慎重さが必要なのか】' + NL + (RISK[cKG]||'無理に動きすぎると後から大きな反動が来やすい') + 'んだよ。この時期に力でねじ伏せようとすると、後で大きな反動が来やすいんダ。' + NL + NL + '【土台を固めるとは具体的に何か】' + NL + (DOBASE[cKG]||'今できることを丁寧にこなすこと') + 'ンダよ。' + NL + NL + (KIDO[cKG]||'今の積み上げが次の大運で活きてくる') + 'んダ。';
                    } else {
                      const neutralTone = isSei ? 'あなたの日主「'+myG+'」とは相生の関係にあって、静かに支えてくれるような流れンダ。' : isHiwa ? 'あなたの日主「'+myG+'」と同じ種類の気が流れていて、居心地はいいけど変化は少ない時代ンダ。' : '追い風でも逆風でもない、実力を積み上げるための静かな時期ンダ。';
                      body = '今の大運「'+cName+'（'+period+'）」は、'+neutralTone + NL + NL + 'この大運には「'+(WHAT[cKG]||cKG)+'」の気が流れていて、目立った成果は出にくいかもしれないけど、'+(SCENE[cKG]||'地道な積み上げ')+'に取り組むことが後から大きな力になる時代なんダよ🐼' + NL + NL + '【この時期の正しい動き方】' + NL + (DOSLOW[cKG]||'コツコツ積み上げることに集中すること') + 'ンダよ。' + NL + NL + (KIDO[cKG]||'今の積み上げが次の大運で活きてくる') + 'んダ。';
                    }

                    let nextMsg = '';
                    if(nextD) {
                      const nName = nextD.kan + nextD.shi;
                      const nPeriod = nextD.ageFrom + '〜' + nextD.ageTo + '歳';
                      if(nextIsKi) {
                        nextMsg = NL + NL + '【次の大運「'+nName+'（'+nPeriod+'）」について】' + NL + '次は喜神の気が流れる追い風の大運ンダよ🌟 今この時期にしっかり土台を作っておくほど、次の大運で一気に花開くんダ。今日やっていることは、すべて未来の自分への投資ンダよ🐼';
                      } else if(nextIsKj) {
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
          {activeTab === "compat" && <CompatTab partners={partners} setPartners={setPartners} myCalc={M._calc} onShowDetail={(p) => { setCompatDetailPartner(p); window.scrollTo(0, 0); }} />}

          {/* ══════════════ AIチャットタブ ══════════════ */}
          {activeTab === "aichat" && <AiChatTab meishiki={M} />}

          {/* ══════════════ 専門家に相談タブ ══════════════ */}
          {activeTab === "expert" && <ExpertTab meishiki={M} />}



        </div>
      </div>
    </>
  );
}

export default FortuneResult;
