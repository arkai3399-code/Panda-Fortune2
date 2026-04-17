import React, { useState, useEffect } from 'react';
import { C } from '../../data/theme.js';
import { EMPTY_PARTNER, HOURS, MBTI_TYPES_32, RELATIONS } from '../../data/mbtiNames.js';
import { calcFullCompatScore, calcCompatScore } from '../../logic/compatCalc.js';
import SectionLabel from '../common/SectionLabel.jsx';
import Card from '../common/Card.jsx';
import PandaIcon from '../common/PandaIcon.jsx';
import PopoSpeech from '../common/PopoSpeech.jsx';

// ── 相性占いタブ ──
// 元HTML 3847-4201行。
//
// NOTE: compat-detail 切替 (window._pfShowCompat / _pfCompatPartner /
// _pfResetAnalyzing) は Phase 6 までの暫定で window.* への参照を残している。
// Phase 6 で compat-detail を React 化した際にここも差し替える。
const CompatTab = ({ partners, setPartners, myCalc, onShowDetail }) => {
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
    const sc = calcFullCompatScore(newP, myCalc);
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
        const sc = calcFullCompatScore(p, myCalc);
        if (sc) setScoreCache(prev => ({ ...prev, [p.id]: sc }));
      }
    });
  }, [partners, myCalc]);

  // 鑑定結果からUI用の文章フィールドを生成
  const buildStrength = (r) => {
    if (r.hasShigou) return `支合が成立しているんダ。お互いを自然に引き寄せ合う、強い縁を持つ2人ンダよ🐼`;
    if (r.hasKango)  return `日主同士に干合が結ばれているんダ。考え方や価値観が自然と調和する相性ンダよ🐼`;
    if (r.compatType === '相生型') return `五行が相生の関係——${r.myG}と${r.ptG}が育て合う、やさしく続く相性ンダよ🐼`;
    if (r.compatType === '比和型') return `同じ${r.myG}の気を持つ2人ンダ。感覚や価値観が似ていて、一緒にいて楽な相性ンダよ🐼`;
    return `互いの違いが補い合う、バランス型の組み合わせンダよ🐼`;
  };
  const buildCaution = (r) => {
    if (r.compatType === '相剋型') return `五行が相剋の関係ンダ。言葉選びと距離感を丁寧にすれば、刺激が学びに変わる相性ンダよ🐼`;
    if (r.total < 60) return `急ぎすぎず、お互いのペースを尊重してほしいんダ。焦らない時間が2人を育てるんダよ🐼`;
    if (r.hasShigou || r.hasKango) return `引き合う力が強いぶん、依存に偏りやすい関係ンダ。自分の軸を持ち続けてほしいんダよ🐼`;
    return `ちょっとしたすれ違いは誰にでもあるんダ。違いを否定せず受け止めると良い関係が続くんダよ🐼`;
  };
  const buildAdvice = (r) => {
    return `「${r.typeLabel}」の2人ンダ🐼 総合${r.total}点。命式相性${r.birthCompatScore}・引き合う力${r.hikiai}・MBTI相性${r.mbtiScore}の流れンダよ。無理に合わせようとせず、自然体で過ごす時間を大切にしてほしいんダ。`;
  };

  const analyze = async (partner, idx) => {
    setActivePartner(idx);
    setAnalyzing(true);
    // Save partner data to sessionStorage (legacy互換)
    try { sessionStorage.setItem('compat_partner', JSON.stringify(partner)); } catch(e){}
    // 演出ディレイ後に詳細ページへ遷移
    setTimeout(() => {
      setAnalyzing(false);
      if (typeof onShowDetail === 'function') {
        onShowDetail(partner);
      }
    }, 1500);
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

      {/* ── ヘッダーカード ── */}
      <Card glow>
        <SectionLabel en="COMPATIBILITY · 相性占い" ja="相性占い" />
        <PopoSpeech text="好きな人や気になる相手の情報を入力してほしいんダ。四柱推命×MBTIで、2人の相性を徹底的に読み解くんダよ。最大10人まで登録できるんダ🐼" />
      </Card>

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
        <Card>
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <p style={{ fontSize: 36, marginBottom: 16 }}>💞</p>
            <p style={{ fontFamily: "'Shippori Mincho',serif", fontSize: 18, color: C.gold, marginBottom: 10 }}>まだ相手が登録されていないんダ</p>
            <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 24, lineHeight: 1.8 }}>気になる人・パートナーの情報を入力して<br />相性鑑定を始めてほしいんダ🐼</p>
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

export default CompatTab;
