import React, { useState } from 'react';
import { PLACE_LON } from '../engines/meishikiEngine.js';
import { MBTI_TYPES_32 } from '../data/mbtiNames.js';

// ── 命式変更モーダル ──────────────────────────────────────────
// 元HTML 5622-5851行。
//
// NOTE: 元実装では window._PLACE_LON を参照していたが、
// Phase 2 で meishikiEngine.js の export PLACE_LON に置換している。
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
const PLACE_LIST = Object.keys(PLACE_LON);

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
      : ((PLACE_LON)[form.placeName] || 135);
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

export default EditModal;
