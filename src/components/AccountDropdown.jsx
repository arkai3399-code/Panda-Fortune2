import React from 'react';
import { C } from '../data/theme.js';

// ── アカウントドロップダウン ──
// 元HTML 5051-5201行。
const AccountDropdown = ({ meishiki, acctOpen, setAcctOpen }) => {
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
                  <input value={editEmail} onChange={e => setEditEmail(e.target.value)} style={InputStyle} placeholder="新しいメールアドレス" type="email" />
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
                    <input type="password" placeholder="現在のパスワード" style={{...InputStyle, marginBottom:4}} />
                    <input type="password" placeholder="新しいパスワード" style={InputStyle} />
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
              <button onClick={() => { if(window.confirm('プランを解約しますか？\n解約後は次の更新日から請求が停止されます。')) { alert('Stripeカスタマーポータルへ接続（バックエンド接続後に有効化）🐼'); } }}
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

export default AccountDropdown;
