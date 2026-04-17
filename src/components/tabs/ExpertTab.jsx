import React, { useState } from 'react';
import { C } from '../../data/theme.js';
import { EXPERTS, CONSULT_TYPES, MOCK_HISTORY } from '../../data/experts.js';
import Card from '../common/Card.jsx';
import PandaIcon from '../common/PandaIcon.jsx';

// ── 専門家に相談タブ ──
// 元HTML 5203-5562行。
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

export default ExpertTab;
