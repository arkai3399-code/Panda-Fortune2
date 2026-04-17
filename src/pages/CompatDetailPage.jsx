import React from 'react';
import '../styles/compatDetail.css';
import { calcFullCompatScore } from '../logic/compatCalc.js';
import { calcMeishiki } from '../engines/meishikiEngine.js';
import { KOKU_MAP } from '../data/mbtiNames.js';

// ══════════════════════════════════════════════════════════════
//  PANDA FORTUNE — 相性詳細鑑定ページ（CompatDetailPage）
//  元HTML 7929-8655行 #pf-compat-view をReact化
//  ロジック: panda-fortune-paid.html _pfRunCompatScript 相当
// ══════════════════════════════════════════════════════════════

// ── 五行/十干/十二支マッピング ──
const JIKKAN  = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const GOGYO_K = ['木','木','火','火','土','土','金','金','水','水'];
const SEI     = { 木:'火', 火:'土', 土:'金', 金:'水', 水:'木' };
const KOKU    = { 木:'土', 火:'金', 土:'水', 金:'木', 水:'火' };
const SHIGOU  = { 子:'丑', 丑:'子', 寅:'亥', 亥:'寅', 卯:'戌', 戌:'卯', 辰:'酉', 酉:'辰', 巳:'申', 申:'巳', 午:'未', 未:'午' };
const ROKUCHUU = { 子:'午', 午:'子', 丑:'未', 未:'丑', 寅:'申', 申:'寅', 卯:'酉', 酉:'卯', 辰:'戌', 戌:'辰', 巳:'亥', 亥:'巳' };
const KANGO   = { 甲:'己', 己:'甲', 乙:'庚', 庚:'乙', 丙:'辛', 辛:'丙', 丁:'壬', 壬:'丁', 戊:'癸', 癸:'戊' };
const SNAME   = { 子:'子（ね）', 丑:'丑（うし）', 寅:'寅（とら）', 卯:'卯（う）', 辰:'辰（たつ）', 巳:'巳（み）', 午:'午（うま）', 未:'未（ひつじ）', 申:'申（さる）', 酉:'酉（とり）', 戌:'戌（いぬ）', 亥:'亥（い）' };

// 柱ごとの "星" ラベル（天干の五行 → 日本語の星名）
const KAN_STAR = {
  '甲':'挑戦の星','乙':'しなやかな星','丙':'情熱の星','丁':'優しさの星',
  '戊':'安定の星','己':'包容の星','庚':'行動力の星','辛':'美意識の星',
  '壬':'知性の星','癸':'感受性の星',
};

// MBTI 4軸の一致/補完の判定
const matchAxis = (a, b) => (a === b ? 'm' : 'd');
const matchLabel = (a, b) => (a === b ? 'ぴったり一致' : '補い合う');

// パンダSVGアイコン（元HTMLと同一の data URL）
const PopoSvg = ({ size = 28 }) => (
  <img
    src="data:image/svg+xml,%3Csvg xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22 viewBox%3D%220 0 40 40%22%3E%3Ccircle cx%3D%2210%22 cy%3D%2211%22 r%3D%226%22 fill%3D%22%23C4956A%22%2F%3E%3Ccircle cx%3D%2230%22 cy%3D%2211%22 r%3D%226%22 fill%3D%22%23C4956A%22%2F%3E%3Ccircle cx%3D%2210%22 cy%3D%2211%22 r%3D%223.5%22 fill%3D%22%23E8C49A%22%2F%3E%3Ccircle cx%3D%2230%22 cy%3D%2211%22 r%3D%223.5%22 fill%3D%22%23E8C49A%22%2F%3E%3Ccircle cx%3D%2220%22 cy%3D%2221%22 r%3D%2215%22 fill%3D%22%23F7F3EE%22%2F%3E%3Cellipse cx%3D%2214%22 cy%3D%2218%22 rx%3D%224.5%22 ry%3D%224%22 fill%3D%22%23C4956A%22%2F%3E%3Cellipse cx%3D%2226%22 cy%3D%2218%22 rx%3D%224.5%22 ry%3D%224%22 fill%3D%22%23C4956A%22%2F%3E%3Ccircle cx%3D%2214%22 cy%3D%2218%22 r%3D%222.2%22 fill%3D%22%233D2B1F%22%2F%3E%3Ccircle cx%3D%2226%22 cy%3D%2218%22 r%3D%222.2%22 fill%3D%22%233D2B1F%22%2F%3E%3Ccircle cx%3D%2215%22 cy%3D%2217%22 r%3D%220.8%22 fill%3D%22white%22%2F%3E%3Ccircle cx%3D%2227%22 cy%3D%2217%22 r%3D%220.8%22 fill%3D%22white%22%2F%3E%3Cellipse cx%3D%2220%22 cy%3D%2223.5%22 rx%3D%222.5%22 ry%3D%221.8%22 fill%3D%22%23A0705A%22%2F%3E%3Cpath d%3D%22M17.5 25.5 Q20 27.5 22.5 25.5%22 stroke%3D%22%23A0705A%22 stroke-width%3D%221%22 fill%3D%22none%22%2F%3E%3C%2Fsvg%3E"
    width={size}
    height={size}
    style={{ verticalAlign: 'middle', margin: '0 2px' }}
    alt="popo"
  />
);

function CompatDetailPage({ partner, myCalc, myInput, onBack }) {
  // ── 相手の命式を計算 ──
  const ptCalc = React.useMemo(() => {
    if (!partner) return null;
    const genderMap = { '女性': 'f', '男性': 'm', 'その他': 'x' };
    const ptHourRaw = partner.hour !== undefined
      ? partner.hour
      : (partner.hourInput !== undefined ? partner.hourInput : 'わからない');
    let ptHourInput = -1;
    if (ptHourRaw in KOKU_MAP) ptHourInput = KOKU_MAP[ptHourRaw];
    else {
      const parsed = Number(ptHourRaw);
      ptHourInput = isNaN(parsed) ? -1 : parsed;
    }
    try {
      return calcMeishiki({
        year:      parseInt(partner.year)  || 0,
        month:     parseInt(partner.month) || 0,
        day:       parseInt(partner.day)   || 0,
        hourInput: ptHourInput,
        gender:    genderMap[partner.gender] || partner.gender || 'f',
        longitude: partner.longitude !== undefined ? Number(partner.longitude) : 135,
        mbti:      partner.mbti || '',
      });
    } catch (e) { return null; }
  }, [partner]);

  const compat = React.useMemo(() => {
    if (!partner || !myCalc) return null;
    return calcFullCompatScore(partner, myCalc);
  }, [partner, myCalc]);

  if (!partner || !myCalc || !ptCalc || !compat) {
    return (
      <div className="pf-compat-view">
        <div className="content" style={{ paddingTop: 40 }}>
          <button className="back-btn" onClick={onBack}>◁ 相性占いに戻る</button>
          <div className="card">
            <p style={{ color: 'rgba(232,228,217,.7)', fontFamily: "'Shippori Mincho',serif" }}>鑑定データを読み込めませんでした。</p>
          </div>
        </div>
      </div>
    );
  }

  // ── 名前/生年月日/MBTI の整形 ──
  const rawName = (partner.name || 'お相手').trim();
  const ptName  = rawName.endsWith('さん') ? rawName : rawName + 'さん';
  const ptBirth = `${partner.year}.${partner.month}.${partner.day}`;
  const ptGender = partner.gender || '';
  const ptMbti  = partner.mbti && partner.mbti !== 'わからない' ? partner.mbti : '';

  const myInputObj = myInput || {};
  const myGenderLabel = myInputObj.gender === 'f' ? '女性' : myInputObj.gender === 'm' ? '男性' : '';
  const myBirth = myInputObj.year ? `${myInputObj.year}.${myInputObj.month}.${myInputObj.day}` : '';
  let myMbti = (myCalc && myCalc.input && myCalc.input.mbti) || myInputObj.mbti || '';
  if (myMbti === 'わからない') myMbti = '';
  if (myMbti && !/-(A|T)$/.test(myMbti)) myMbti = myMbti + '-A';
  const myMbtiBase = myMbti ? myMbti.replace(/-(A|T)$/, '') : '';
  const ptMbtiBase = ptMbti ? ptMbti.replace(/-(A|T)$/, '') : '';

  // ── 日主の五行 ──
  const myKan = myCalc?.pillars?.day?.kan || '壬';
  const ptKan = ptCalc?.pillars?.day?.kan || '庚';
  const myKanIdx = JIKKAN.indexOf(myKan);
  const ptKanIdx = JIKKAN.indexOf(ptKan);
  const myGogyo = GOGYO_K[myKanIdx] || '水';
  const ptGogyo = GOGYO_K[ptKanIdx] || '金';

  // ── 相性タイプ判定 ──
  let compatType = '中和型';
  if (SEI[myGogyo] === ptGogyo || SEI[ptGogyo] === myGogyo) compatType = '相生型';
  else if (myGogyo === ptGogyo) compatType = '比和型';
  else if (KOKU[myGogyo] === ptGogyo || KOKU[ptGogyo] === myGogyo) compatType = '相剋型';

  const vsLabel = compatType === '相生型' ? '引き合うタイプ'
    : compatType === '比和型' ? '似た者同士タイプ'
    : compatType === '相剋型' ? '刺激し合うタイプ'
    : 'バランスタイプ';

  const baseScore  = compat.total;
  const scoreLabel = baseScore >= 80 ? 'とても強い相性ンダ ✨'
    : baseScore >= 70 ? 'よい相性ンダ🐼'
    : baseScore >= 60 ? 'お互いを高め合える関係ンダ'
    : '刺激し合える関係ンダ';

  // スコア・アーク（円周長 515、最大 422）
  const arcDash = Math.round((baseScore / 100) * 515);

  // サブスコア
  const ssMeishiki = compat.birthCompatScore;
  const ssHikiai   = compat.hikiai;
  const ssMbti     = compat.mbtiScore;
  const ssLove     = compat.loveScore;
  const LOVE_RELS = ['恋人・パートナー','気になる人','配偶者','婚約者','元交際相手'];
  const isLoveGroup = LOVE_RELS.includes(partner.relation);

  // ── 相手の4柱 ──
  const ptPillars = [
    { label: '生まれ年', kan: ptCalc.pillars.year.kan,  shi: ptCalc.pillars.year.shi,  star: KAN_STAR[ptCalc.pillars.year.kan]  || '─' },
    { label: '生まれ月', kan: ptCalc.pillars.month.kan, shi: ptCalc.pillars.month.shi, star: KAN_STAR[ptCalc.pillars.month.kan] || '─' },
    { label: '本命 ★',  kan: ptCalc.pillars.day.kan,   shi: ptCalc.pillars.day.shi,   star: KAN_STAR[ptCalc.pillars.day.kan]   || '─', main: true },
    { label: '生まれ時間', kan: ptCalc.pillars.hour?.kan || '─', shi: ptCalc.pillars.hour?.shi || '─', star: KAN_STAR[ptCalc.pillars.hour?.kan] || '─' },
  ];

  // ── 性格カード: MBTIに応じた表示 ──
  const partnerPersonality = (() => {
    const t = ptMbtiBase;
    if (t === 'ENFJ') return { name: '太陽のような人', traits: ['行動力がある','人好き','面倒見がいい','情熱的'], desc: `エネルギッシュで、まわりの人を自然に引っ張るタイプンダ。生年月日の占いでも「情熱と行動力の星」を持っていて、あなたに積極的にアプローチしてくれるんダよ。` };
    if (t === 'INFP') return { name: '夢見る詩人', traits: ['感受性豊か','共感力が高い','理想主義','静かに情熱的'], desc: `内面の世界を大切にする人ンダ。あなたに深い共感と優しさを届けてくれる、静かで確かな存在ンダよ。` };
    if (t === 'INFJ') return { name: '静かな導き手', traits: ['直感的','誠実','思慮深い','洞察力'], desc: `言葉の奥を読み取るのが得意な人ンダ。あなたの本音を自然に理解してくれる、深い絆を築きやすいタイプンダよ。` };
    if (t === 'ENFP') return { name: '自由な風の人', traits: ['好奇心旺盛','情熱的','創造的','人懐っこい'], desc: `心のままに動くタイプンダ。あなたに新しい景色と刺激をくれる、一緒にいて飽きない存在ンダよ。` };
    if (t && t.startsWith('I')) return { name: '内に秘めた静けさの人', traits: ['思慮深い','聞き上手','誠実','奥行きがある'], desc: `派手さより本質を大切にするタイプンダ。あなたとじっくり心を通わせることができる人ンダよ。` };
    if (t && t.startsWith('E')) return { name: '外に開いた明るい人', traits: ['社交的','行動力','ポジティブ','引っ張る力'], desc: `まわりを明るくする力を持つタイプンダ。あなたに新しい刺激と勢いをくれる存在ンダよ。` };
    return { name: 'あなたとの相性を持つ人', traits: ['個性的','バランス','優しい','誠実'], desc: `${ptName}は${ptGogyo}の気を持つ人ンダ。あなたの${myGogyo}の気と重なって独自のリズムが生まれるんダよ。` };
  })();

  // ── 相手の全体ポポ総評 ──
  const topPopoText = compatType === '相生型'
    ? `${ptName}はあなたにとってとってもいいエネルギーをくれる人なんダよ🐼 ${ptName}がそばにいるだけで、あなたの${myGogyo}の気が自然と整うんダ。2人の気質が育て合う関係ンダから、長く一緒にいるほどよくなっていく組み合わせンダよ✨`
    : compatType === '比和型'
    ? `あなたと${ptName}は同じ「${myGogyo}の気」を持っているんダ🐼 感覚や価値観が近くて、一緒にいて自然体でいられる相性ンダよ。お互いの弱点も分かり合えるから、長く続きやすい組み合わせンダ✨`
    : compatType === '相剋型'
    ? `${ptName}はあなたに刺激をくれる人ンダ🐼 ${myGogyo}と${ptGogyo}はぶつかり合う関係だけど、乗り越えるほどに絆が深まっていくタイプンダよ。「違い」を成長の糧にできる2人ンダ✨`
    : `あなたと${ptName}は、直接的な引力や反発がない穏やかな組み合わせンダ🐼 お互いの選択と努力でどこまでも深まれる、自由度の高い相性ンダよ。`;

  // ── How they see you (MBTI別のチップ) ──
  const thinkChips = (() => {
    if (ptMbtiBase === 'ENFJ') return ['知的で神秘的','守ってあげたい','その深さに惹かれる','唯一無二の存在'];
    if (ptMbtiBase && ptMbtiBase.startsWith('I')) return ['静かで落ち着く','一緒にいて楽','深い話ができる','信頼できる'];
    if (ptMbtiBase && ptMbtiBase.startsWith('E')) return ['刺激的','一緒にいて楽しい','新鮮な発見','頼りになる'];
    return ['大切にしたい人','唯一無二の存在','もっと知りたい','そばにいたい'];
  })();
  const thinkBody = `${ptName}にとって、あなたは「自分にはない、とても大切な何か」を持っている人として映るんダよ`;

  // ── Astrology 5項目 ──
  const astroItems = (() => {
    const items = [];
    // ① 五行相性
    if (compatType === '相生型') {
      const seier  = SEI[myGogyo] === ptGogyo ? myGogyo : ptGogyo;
      const seied  = SEI[myGogyo] === ptGogyo ? ptGogyo : myGogyo;
      items.push({
        icon: '💧',
        title: `エネルギーの流れ：${ptName}がそばにいると${seied}の気が高まる`,
        subtitle: `${myGogyo} × ${ptGogyo} · 相生型`,
        desc: `生年月日の占いで「${seier}の気を持つ人は、${seied}の気を持つ人を高める」という関係があるんダ。${ptName}は${seier}の気、あなたは${seied}の気ンダよ。長く付き合っても消耗しにくい理想的な組み合わせンダ🐼`,
        score: compat.birthCompatScore,
      });
    } else if (compatType === '比和型') {
      items.push({
        icon: '🌀',
        title: `同じ「${myGogyo}の気」を持つ同士の共鳴`,
        subtitle: `${myGogyo} × ${ptGogyo} · 比和型`,
        desc: `あなたも${ptName}も、日主が「${myGogyo}の気」ンダ。話の前提が合いやすく「この人はわかってくれる」という感覚が自然に生まれるんダよ。弱点も共有しているから、お互いに批判せず受け入れやすいんダ🐼`,
        score: compat.birthCompatScore,
      });
    } else if (compatType === '相剋型') {
      items.push({
        icon: '🔥',
        title: `エネルギーがぶつかり合い、互いを鍛える`,
        subtitle: `${myGogyo} × ${ptGogyo} · 相剋型`,
        desc: `これは摩擦が生まれやすい組み合わせだけど、乗り越えるほどに絆が深まるタイプの相性ンダよ。${ptName}との衝突を「成長のきっかけ」として受け取ることが、この関係を豊かにするカギンダ🐼`,
        score: compat.birthCompatScore,
      });
    } else {
      items.push({
        icon: '⚖️',
        title: 'バランスのとれた安定した気質の組み合わせ',
        subtitle: `${myGogyo} × ${ptGogyo} · 中和型`,
        desc: `大きな衝突も強い引力も目立たない分、お互いの努力と選択次第でいくらでも深まれる関係ンダよ。安定した土台がある組み合わせンダ🐼`,
        score: compat.birthCompatScore,
      });
    }
    // ② 日柱相性
    const mDS = myCalc.pillars.day.shi, pDS = ptCalc.pillars.day.shi;
    const mDK = myCalc.pillars.day.kan, pDK = ptCalc.pillars.day.kan;
    if (SHIGOU[mDS] === pDS) {
      items.push({
        icon: '🔗',
        title: '生まれ日の地支が支合 — 深い縁がある',
        subtitle: `${mDK}${mDS} × ${pDK}${pDS}`,
        desc: `あなたの生まれ日の地支「${SNAME[mDS] || mDS}」と${ptName}の「${SNAME[pDS] || pDS}」は支合の関係ンダ。2人の生活リズムが自然と噛み合いやすく、一緒にいて「なんか合う」と感じやすいんダ🐼`,
        score: Math.min(99, compat.birthCompatScore + 8),
      });
    } else if (ROKUCHUU[mDS] === pDS) {
      items.push({
        icon: '⚡',
        title: '生まれ日の地支が六冲 — 行動パターンが衝突しやすい',
        subtitle: `${mDK}${mDS} × ${pDK}${pDS}`,
        desc: `「${SNAME[mDS] || mDS}」と「${SNAME[pDS] || pDS}」は真向から対立するペアンダ。お互いの「当たり前」が違うことを念頭に、話し合う習慣が大切ンダよ🐼`,
        score: Math.max(20, compat.birthCompatScore - 10),
        cautionBadge: true,
      });
    } else if (mDS === pDS) {
      items.push({
        icon: '🔗',
        title: '生まれ日の地支が一致 — 生活リズムが近い',
        subtitle: `${mDK}${mDS} × ${pDK}${pDS}`,
        desc: `2人とも生まれ日の地支が「${SNAME[mDS] || mDS}」で同じンダ。生活リズムや行動パターン、物事への向き合い方がとても近いことを示すんダよ🐼`,
        score: Math.min(99, compat.birthCompatScore + 5),
      });
    } else if (KANGO[mDK] === pDK) {
      items.push({
        icon: '🌟',
        title: '生まれ日の天干が干合 — 根本的な性質が引き合う',
        subtitle: `${mDK} × ${pDK}`,
        desc: `あなたの日干「${mDK}」と${ptName}の日干「${pDK}」は干合の関係ンダ。2人の根本的な性質が深いところで引き合っているんダよ🐼`,
        score: Math.min(99, compat.birthCompatScore + 6),
      });
    } else {
      items.push({
        icon: '🔗',
        title: `生まれ日の干支（${mDK}${mDS} × ${pDK}${pDS}）の組み合わせ`,
        subtitle: `${mDK}${mDS} × ${pDK}${pDS}`,
        desc: `生活リズムや行動パターンは独自の個性を持っているから、お互いの「普通」が違う場面が出やすいんダよ。それを面白いと思えるかどうかがこの関係のカギンダ🐼`,
        score: compat.birthCompatScore,
      });
    }
    // ③ 引き合う力
    const hasShigou  = SHIGOU[mDS] === pDS;
    const hasKango   = KANGO[mDK] === pDK;
    if (hasShigou && hasKango) {
      items.push({
        icon: '💫',
        title: '日支支合＋日干干合 — 二重の引力がある',
        subtitle: '強い引力',
        desc: `日支の支合と日干の干合が同時に起きているンダ。命式の中でも特に強い引力を示す組み合わせで、初対面から不思議と気になってしまう、または一緒にいると妙に落ち着く——その両方を感じやすいんダよ🐼`,
        score: compat.hikiai,
      });
    } else if (hasShigou) {
      items.push({
        icon: '✨',
        title: '日支が支合 — 出会った瞬間から気になりやすい',
        subtitle: '引き合う力',
        desc: `2人の日支「${SNAME[mDS] || mDS}」と「${SNAME[pDS] || pDS}」は支合の関係ンダ。出会った瞬間から理由なく「なんか気になる」と感じる引力が生まれやすいんダよ🐼`,
        score: compat.hikiai,
      });
    } else if (hasKango) {
      items.push({
        icon: '🌟',
        title: '日干が干合 — 根本から惹かれ合う',
        subtitle: '引き合う力',
        desc: `${mDK}と${pDK}は干合の関係ンダ。根本的な性質が深いところで引き合っていて、一緒にいると自然と落ち着く空気が生まれるんダよ🐼`,
        score: compat.hikiai,
      });
    } else {
      items.push({
        icon: '🔮',
        title: '静かな引力 — じわじわ育つ縁',
        subtitle: '引き合う力',
        desc: `派手な運命の引力ではないけれど、時間をかけてゆっくり育つタイプの縁ンダ。焦らず積み重ねた分だけ深まる関係ンダよ🐼`,
        score: compat.hikiai,
      });
    }
    // ④ 月柱相性
    const mMS = myCalc.pillars.month.shi, pMS = ptCalc.pillars.month.shi;
    items.push({
      icon: '🌙',
      title: '感情リズムの相性（月柱）',
      subtitle: `${myCalc.pillars.month.kan}${mMS} × ${ptCalc.pillars.month.kan}${pMS}`,
      desc: SHIGOU[mMS] === pMS
        ? `2人の月柱に支合があるンダ。感情の波が合いやすく、気持ちの通じやすい相性ンダよ🐼`
        : ROKUCHUU[mMS] === pMS
        ? `月柱が六冲の関係ンダ。感情の波が違うタイミングで来るから、相手の気持ちを言葉で確認する習慣が大切ンダよ🐼`
        : `感情の流れは独自のリズムを持つ2人ンダ。違いを尊重する余裕が、関係を長続きさせる鍵になるんダよ🐼`,
      score: compat.birthCompatScore,
    });
    // ⑤ 年柱相性
    const myYK = myCalc.pillars.year.kan, ptYK = ptCalc.pillars.year.kan;
    const myYG = GOGYO_K[JIKKAN.indexOf(myYK)];
    const ptYG = GOGYO_K[JIKKAN.indexOf(ptYK)];
    items.push({
      icon: '🌳',
      title: '根本気質の相性（年柱）',
      subtitle: `${myYK}${myCalc.pillars.year.shi} × ${ptYK}${ptCalc.pillars.year.shi}`,
      desc: myYG === ptYG
        ? `年柱の五行が同じ（${myYG}）ンダ。育った環境や価値観のベースが近い2人ンダよ🐼`
        : SEI[myYG] === ptYG || SEI[ptYG] === myYG
        ? `年柱の五行が相生の関係（${myYG}⇔${ptYG}）ンダ。根本の部分で育て合える縁ンダよ🐼`
        : `年柱の五行は直接の相生相剋ではないンダ。根本の気質に違いがある分、新鮮さが続く2人ンダよ🐼`,
      score: compat.birthCompatScore,
    });
    return items;
  })();

  // ── MBTI 4軸 ──
  const axisRows = (() => {
    const mE = myMbtiBase[0], tE = ptMbtiBase[0];
    const mN = myMbtiBase[1], tN = ptMbtiBase[1];
    const mF = myMbtiBase[2], tF = ptMbtiBase[2];
    const mJ = myMbtiBase[3], tJ = ptMbtiBase[3];
    const sameOrDiff = (a, b) => a === b;
    return [
      {
        label: '外向き vs 内向き（E/I）',
        you:  `あなた：${mE === 'E' ? '外向き（E）' : '内向き（I）'}`,
        them: `${ptName}：${tE === 'E' ? '外向き（E）' : '内向き（I）'}`,
        same: sameOrDiff(mE, tE),
        desc: sameOrDiff(mE, tE)
          ? '2人とも同じエネルギーの向きンダ。行動のテンポが合いやすく、疲れ方も似ているんダよ。'
          : `${ptName}の社交力があなたの世界を広げてくれるンダ。あなたの深い内面が、${ptName}に「考える豊かさ」を与えるんダよ。`,
      },
      {
        label: '直感 vs 現実（N/S）',
        you:  `あなた：${mN === 'N' ? '直感（N）' : '現実（S）'}`,
        them: `${ptName}：${tN === 'N' ? '直感（N）' : '現実（S）'}`,
        same: sameOrDiff(mN, tN),
        desc: sameOrDiff(mN, tN)
          ? '2人とも同じ情報の受け取り方をするンダ。話の前提が揃っていて、意図の伝わり方がとても早いんダよ。'
          : '情報の受け取り方が違うから、相手の話を「そういう見方もあるのか」と面白がれると関係が深まるンダよ。',
      },
      {
        label: '感情重視 vs 論理重視（F/T）',
        you:  `あなた：${mF === 'F' ? '感情（F）' : '論理（T）'}`,
        them: `${ptName}：${tF === 'F' ? '感情（F）' : '論理（T）'}`,
        same: sameOrDiff(mF, tF),
        desc: sameOrDiff(mF, tF)
          ? '2人とも判断軸が同じンダ。価値観のズレが起きにくい、とても大事な一致ンダよ。'
          : '感情と論理の違いは、お互いの弱点を補い合える強みンダ。結論を急がず、両方の視点を尊重してほしいんダよ。',
      },
      {
        label: '計画的 vs 柔軟（J/P）',
        you:  `あなた：${mJ === 'J' ? '計画的（J）' : '柔軟（P）'}`,
        them: `${ptName}：${tJ === 'J' ? '計画的（J）' : '柔軟（P）'}`,
        same: sameOrDiff(mJ, tJ),
        desc: sameOrDiff(mJ, tJ)
          ? '2人とも生活のリズムが揃うンダ。予定の組み方や物事の決め方で揉めにくい相性ンダよ。'
          : `${tJ === 'J' ? ptName + 'が予定を立ててリードしてくれるから、あなたは安心してついていけるンダ' : 'あなたが流れを作り、' + ptName + 'が柔軟に受け止めてくれるンダ'}。ただ「何でも決められすぎる」と感じたら素直に伝えることが大切ンダよ。`,
      },
    ];
  })();

  // 各月のタイムライン（12ヶ月）— 元HTMLの静的サンプルを踏襲
  const timingRows = [
    { month: '1月', stars: '⭐⭐☆☆☆', desc: '様子見の時期。焦らずゆっくりお互いを知るといいンダ。', level: 'normal' },
    { month: '2月', stars: '⭐⭐⭐☆☆', desc: 'じわじわと距離が縮まりやすい時期ンダ。', level: 'normal' },
    { month: '3月', stars: '⭐⭐⭐⭐', desc: '2人のノリが自然と合いやすい時期ンダよ。一緒にいると楽しい！と感じる瞬間が増えるんダ。デートや旅行の計画を立てるのにぴったりンダ。', level: 'good' },
    { month: '4月', stars: '⭐⭐☆☆☆', desc: '小さな勘違いやすれ違いが起きやすい月ンダ。LINEだけで済まさず、直接話すようにするといいんダよ。', level: 'care' },
    { month: '5月', stars: '⭐⭐⭐⭐⭐', desc: '占いで2人のエネルギーが最も高まる月ンダ✨ 告白・大切な話し合い・プロポーズに最適なんダよ。', level: 'best' },
    { month: '6月', stars: '⭐⭐⭐☆☆', desc: '5月の流れを穏やかに続けられる安定期ンダ。', level: 'normal' },
    { month: '7月', stars: '⭐⭐⭐☆☆', desc: '穏やかに過ごせる月。深い話をするのにいい時期ンダ。', level: 'normal' },
    { month: '8月', stars: '⭐⭐☆☆☆', desc: '夏の疲れで言葉がきつくなりやすい月ンダ。休む時間を大切にしてほしいんダよ。', level: 'care' },
    { month: '9月', stars: '⭐⭐⭐☆☆', desc: '落ち着いてお互いを見つめ直せる時期ンダ。', level: 'normal' },
    { month: '10月', stars: '⭐⭐⭐⭐', desc: '2人の関係が一段深まりやすい月ンダ。秋のデートで心の距離が縮まるんダよ。', level: 'good' },
    { month: '11月', stars: '⭐⭐⭐⭐⭐', desc: '2人の「引き合う力」が最も強まる時期ンダ。話し合えば自然とまとまりやすい空気になるんダよ🐼', level: 'best' },
    { month: '12月', stars: '⭐⭐⭐☆☆', desc: '11月の余韻が続く安定期。2人で1年を振り返るのにいい時期ンダ。', level: 'normal' },
  ];

  // ── 強み・気をつけること ──
  const strengths = [
    `${compatType === '相生型' ? 'エネルギーが自然に育て合う関係ンダ' : compatType === '比和型' ? '感覚や価値観が近くて安心できる関係ンダ' : compatType === '相剋型' ? '違いが刺激になり成長し合える関係ンダ' : '穏やかでバランスのとれた関係ンダ'}`,
    `${ptName}といるとあなたの${myGogyo}の気が整いやすいンダ`,
    (compat.hasShigou || compat.hasKango) ? '命式同士に引き合う星があるンダ' : '自然体で過ごせる時間が2人を育てるンダ',
    '2人の生活リズムは工夫次第で自然と揃えられるンダ',
    'MBTIの補い合いで、視野が広がりやすい2人ンダ',
  ];
  const cautions = [
    compatType === '相剋型' ? '衝突が起きやすいから、言葉選びを丁寧にしてほしいンダ' : '近すぎると境界があいまいになりやすいから距離感に注意ンダ',
    '黙って距離を置く癖はすれ違いを深めやすいンダ',
    '感情的になったら一度深呼吸してから話してほしいンダ',
    '相手の「当たり前」が自分と同じとは限らないことを覚えておいてほしいンダ',
    '引き合う力が強いぶん、依存に偏らないよう自分の軸を持ち続けてほしいンダ',
  ];

  // ── 最終ポポコメント ──
  const finalPopo = `総合的に見て、あなたと${ptName}の相性は「${compat.typeLabel}」ンダ✨ 生年月日の占いで${compat.birthCompatScore}点、引き合う力${compat.hikiai}点、MBTI相性${compat.mbtiScore}点の流れンダよ。無理に合わせようとせず、自然体で過ごす時間を大切にしてほしいんダ。大事な話をするなら5月と11月がベストンダよ🐼`;

  return (
    <div className="pf-compat-view">
      {/* ══ HEADER ══ */}
      <div className="hdr">
        <div className="hdr-top">
          <div className="hdr-logo">🐼 PANDA FORTUNE</div>
          <div className="hdr-btns">
            <div className="hb" onClick={onBack}>🏠 トップ</div>
            <div className="hb">✎ 命式を変更</div>
            <div className="hb on">👤 マイアカウント</div>
          </div>
        </div>
      </div>

      {/* ══ TITLE ══ */}
      <div className="title-block">
        <div className="t-panda">💞</div>
        <div className="t-sub">COMPATIBILITY DETAIL · 相 性 詳 細 鑑 定</div>
        <div className="t-main">あなた × {ptName}の相性</div>
        <div className="t-chip">
          生年月日占い{myMbti ? `（${myMbti}）` : ''} × {ptName}{ptMbti ? `（${ptMbti}）` : ''} · {vsLabel}
        </div>
      </div>

      {/* ══ CONTENT ══ */}
      <div className="content">
        <button className="back-btn" onClick={onBack}>◁ 相性占いに戻る</button>

        {/* ① 総合スコア */}
        <div className="card gold-border">
          <div className="sec-label">
            <span className="sec-en">TOTAL SCORE</span>
            <span className="sec-ja">総合相性スコア</span>
          </div>

          {/* ペアビジュアル */}
          <div className="pair-row">
            <div className="person">
              <div className="avatar you">あなた</div>
              <div className="p-name">あなた</div>
              <div className="p-sub">{myBirth}{myGenderLabel ? ` · ${myGenderLabel}` : ''}</div>
              {myMbti && <div className="p-mbti mbti-you">{myMbti}</div>}
            </div>
            <div className="vs-area">
              <div className="vs-hearts">💞</div>
              <div style={{ fontFamily: "'Shippori Mincho',serif", fontSize: 11, color: 'var(--gold-dim)', margin: '2px 0' }}>{scoreLabel.replace(/ン?ダ.*$/, '')}</div>
              <div className="vs-label">{vsLabel}</div>
            </div>
            <div className="person">
              <div className="avatar them">{(partner.name || 'A')[0]}</div>
              <div className="p-name">{ptName}</div>
              <div style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 20, background: 'rgba(224,96,122,.1)', border: '1px solid rgba(224,96,122,.22)', fontSize: 10, color: 'rgba(224,96,122,.8)', marginTop: 4 }}>
                {partner.relation || '恋人・パートナー'}
              </div>
              <div className="p-sub">{ptBirth}{ptGender ? ` · ${ptGender}` : ''}</div>
              {ptMbti && <div className="p-mbti mbti-them">{ptMbti}</div>}
            </div>
          </div>

          {/* スコアリング */}
          <div className="total-score">
            <div style={{ textAlign: 'center', padding: '24px 0 4px', position: 'relative' }}>
              <svg width="200" height="200" viewBox="0 0 200 200" style={{ display: 'block', margin: '0 auto' }}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#a07a24" />
                    <stop offset="100%" stopColor="#F0DC88" />
                  </linearGradient>
                </defs>
                <circle cx="100" cy="100" r="82" fill="none" stroke="rgba(255,255,255,.04)" strokeWidth="14" />
                <circle cx="100" cy="100" r="82" fill="none" stroke="url(#scoreGrad)" strokeWidth="14"
                  strokeDasharray={`${arcDash} 515`} strokeDashoffset="0" strokeLinecap="round" transform="rotate(-90 100 100)" />
              </svg>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none' }}>
                <div style={{ fontFamily: "'Shippori Mincho',serif", fontSize: 56, fontWeight: 900, color: 'var(--gold-l)', lineHeight: 1 }}>{baseScore}</div>
                <div style={{ fontSize: 12, color: 'var(--gold-dim)', letterSpacing: '.1em', marginTop: 2 }}>/100</div>
              </div>
            </div>
            <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)', letterSpacing: '.06em', paddingBottom: 20 }}>{scoreLabel}</div>

            <div style={{ textAlign: 'center', marginBottom: 24, fontSize: 14, color: 'var(--sub)', letterSpacing: '.05em', fontFamily: "'Shippori Mincho',serif" }}>
              <span>あなた</span>
              <span style={{ margin: '0 10px', color: 'var(--gold-dim)' }}>×</span>
              <span>{ptName}</span>
            </div>

            {/* サブスコア */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 8, padding: '4px 0' }}>
              {[
                { label: '生年月日', value: ssMeishiki, color: 'var(--gold)',   dotColor: 'var(--gold)',                 barGrad: 'linear-gradient(90deg,#a07a24,#F0DC88)', labelColor: 'rgba(201,168,76,.7)' },
                { label: '引き合う力', value: ssHikiai,   color: 'var(--blue)',   dotColor: 'var(--blue)',                 barGrad: 'linear-gradient(90deg,#2a6aaa,#64C8F0)', labelColor: 'rgba(100,180,240,.7)' },
                { label: 'MBTI相性',  value: ssMbti,     color: 'var(--purple)', dotColor: 'var(--purple)',               barGrad: 'linear-gradient(90deg,#6a3aaa,#B496F0)', labelColor: 'rgba(180,150,240,.7)' },
                ...(isLoveGroup ? [{ label: '恋愛運', value: ssLove, color: 'var(--pink)', dotColor: 'var(--pink)', barGrad: 'linear-gradient(90deg,#aa2a4a,#F06080)', labelColor: 'rgba(224,96,122,.7)' }] : []),
              ].map((r, i, arr) => (
                <div key={r.label} style={{ display: 'flex', alignItems: 'center', padding: '12px 4px', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, width: 120, flexShrink: 0 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: r.dotColor, flexShrink: 0 }}></div>
                    <span style={{ fontSize: 11, color: r.labelColor, letterSpacing: '.04em' }}>{r.label}</span>
                  </div>
                  <div style={{ flex: 1, margin: '0 12px', height: 4, borderRadius: 2, background: 'rgba(255,255,255,.05)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${r.value}%`, background: r.barGrad, borderRadius: 2, transition: 'width 1s cubic-bezier(.4,0,.2,1)' }}></div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, width: 44, textAlign: 'right', flexShrink: 0, justifyContent: 'flex-end' }}>
                    <span style={{ fontFamily: "'Shippori Mincho',serif", fontSize: 22, fontWeight: 900, color: r.color, lineHeight: 1 }}>{r.value}</span>
                    <span style={{ fontSize: 9, color: 'var(--muted)' }}>点</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ポポ総評 */}
          <div className="popo">
            <PopoSvg size={28} />
            <p className="popo-tx">{topPopoText}</p>
          </div>
        </div>

        {/* ② 相手はどんな人か */}
        <div className="card">
          <div className="sec-label">
            <span className="sec-en">PERSONALITY</span>
            <span className="sec-ja">相手はどんな人か</span>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div className="pers-card pink" style={{ borderColor: 'rgba(224,96,122,.25)' }}>
              <div className="pc-head" style={{ color: 'rgba(224,96,122,.65)' }}>PARTNER · {ptName}{ptMbti ? `（${ptMbti}）` : ''}</div>
              <div className="pc-name" style={{ color: 'rgba(224,96,122,.9)' }}>{partnerPersonality.name}</div>
              <div className="pc-traits">
                {partnerPersonality.traits.map((t) => (
                  <span key={t} className="trait pk">{t}</span>
                ))}
              </div>
              <div className="pc-desc">{partnerPersonality.desc}</div>
            </div>
          </div>

          {/* Aさんの詳細（4柱） */}
          <div style={{ background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 14, padding: '18px 20px', marginBottom: 14 }}>
            <div style={{ fontSize: 10, letterSpacing: '.2em', color: 'rgba(224,96,122,.55)', marginBottom: 10 }}>
              {ptName}の生年月日占い · {partner.year}年{partner.month}月{partner.day}日生まれ
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 14, textAlign: 'center' }}>
              {ptPillars.map((p) => (
                <div key={p.label} style={{
                  padding: '10px 8px',
                  borderRadius: 10,
                  background: p.main ? 'rgba(201,168,76,.08)' : 'rgba(255,255,255,.03)',
                  border: p.main ? '1px solid rgba(201,168,76,.28)' : '1px solid rgba(255,255,255,.06)',
                }}>
                  <div style={{ fontSize: 9, color: p.main ? 'var(--gold-dim)' : 'var(--muted)', marginBottom: 4 }}>{p.label}</div>
                  <div style={{ fontFamily: "'Shippori Mincho',serif", fontSize: 22, fontWeight: 700, color: p.main ? 'var(--gold-l)' : undefined }}>{p.kan}</div>
                  <div style={{ fontFamily: "'Shippori Mincho',serif", fontSize: 18, color: p.main ? 'var(--gold-l)' : undefined }}>{p.shi}</div>
                  <div style={{ fontSize: 10, color: p.main ? 'var(--gold-dim)' : 'var(--muted)', marginTop: 2 }}>{p.star}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(232,228,217,.6)', lineHeight: 1.9, fontFamily: "'Shippori Mincho',serif" }}>
              {ptName}は「{ptGogyo}の気」を持つ人ンダ。{ptGogyo === '水' ? '水のような感受性' : ptGogyo === '火' ? '情熱のエネルギー' : ptGogyo === '木' ? 'しなやかな成長力' : ptGogyo === '金' ? '強い意志と美意識' : '揺るぎない安定感'}を持っていて、あなたの「{myGogyo}の気」と{compatType === '相生型' ? '自然に育て合う' : compatType === '比和型' ? '共鳴し合う' : compatType === '相剋型' ? '刺激を生み合う' : '穏やかに補い合う'}関係ンダよ🐼
            </div>
          </div>
        </div>

        {/* ③ 相手があなたをどう思っているか */}
        <div className="card">
          <div className="sec-label">
            <span className="sec-en">HOW THEY SEE YOU</span>
            <span className="sec-ja">相手があなたをどう思っているか</span>
          </div>
          <div className="think-card">
            <div className="think-head">
              <span className="think-emoji">👁</span>
              <span className="think-title">{ptName}の目から見たあなた</span>
            </div>
            <div className="think-body">
              {thinkBody}<PopoSvg size={20} />
            </div>
            <div className="think-chips">
              {thinkChips.map((c) => <span key={c} className="tch">{c}</span>)}
            </div>
          </div>
        </div>

        {/* ④ 生年月日占いの相性詳細 */}
        <div className="card">
          <div className="sec-label">
            <span className="sec-en">ASTROLOGY COMPATIBILITY</span>
            <span className="sec-ja">生年月日占いで見る相性</span>
          </div>
          <div className="shijuu-section">
            {astroItems.map((it, i) => {
              const scoreColor = it.score >= 85 ? 'var(--gold)' : it.score >= 72 ? 'var(--blue)' : it.score >= 60 ? 'var(--green)' : 'rgba(200,110,90,.9)';
              const badgeCls = it.cautionBadge ? 'caution' : it.score >= 88 ? 'great' : it.score >= 78 ? 'good' : it.score >= 68 ? 'good' : 'caution';
              const badgeLabel = it.cautionBadge ? '注意' : it.score >= 88 ? '最高' : it.score >= 78 ? '良好' : it.score >= 68 ? '普通' : it.score >= 55 ? '要注意' : '厳しい';
              return (
                <div key={i} className="item-row" style={i === astroItems.length - 1 ? { borderBottom: 'none' } : undefined}>
                  <div className="item-icon">{it.icon}</div>
                  <div className="item-body">
                    <div className="item-title">{it.title}<span className={`sbadge ${badgeCls}`}>{badgeLabel}</span></div>
                    <div className="item-subtitle">{it.subtitle}</div>
                    <div className="item-desc">{it.desc}</div>
                  </div>
                  <div className="item-score">
                    <div className="is-val" style={{ color: scoreColor }}>{it.score}</div>
                    <div className="is-lbl">/100</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ⑤ MBTIの相性詳細 */}
        {myMbti && ptMbti && (
          <div className="card">
            <div className="sec-label">
              <span className="sec-en">MBTI COMPATIBILITY</span>
              <span className="sec-ja">MBTIの相性</span>
            </div>

            <div className="mbti-pair">
              <div className="mbti-box" style={{ background: 'rgba(80,140,210,.12)', border: '1px solid rgba(80,140,210,.28)', color: 'rgba(140,190,240,.9)' }}>{myMbti}</div>
              <div className="mbti-arrow">×</div>
              <div className="mbti-box" style={{ background: 'rgba(224,96,122,.1)', border: '1px solid rgba(224,96,122,.25)', color: 'rgba(224,96,122,.9)' }}>{ptMbti}</div>
              <div style={{ marginLeft: 12, padding: '5px 14px', borderRadius: 20, background: 'rgba(160,120,220,.1)', border: '1px solid rgba(160,120,220,.25)', fontSize: 12, color: 'rgba(180,150,240,.85)', fontFamily: "'Shippori Mincho',serif", fontWeight: 700 }}>
                {ssMbti}点・{ssMbti >= 85 ? 'とても相性が良い' : ssMbti >= 72 ? 'お互いを高め合うタイプ' : ssMbti >= 60 ? 'お互いを補い合うタイプ' : 'やや擦り合わせが必要'}
              </div>
            </div>

            <div className="mbti-axis">
              {axisRows.map((r) => (
                <div key={r.label} className="axis-row">
                  <div className="axis-head">
                    <span className="axis-lbl">{r.label}</span>
                    <span className={`axis-match ${r.same ? 'm' : 'd'}`}>{r.same ? 'ぴったり一致' : '補い合う'}</span>
                  </div>
                  <div className="axis-bars">
                    <span className={`ab ${r.same ? 'same' : 'you-axis'}`}>{r.you}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)', padding: '0 4px' }}>×</span>
                    <span className={`ab ${r.same ? 'same' : 'them-axis'}`}>{r.them}</span>
                  </div>
                  <div className="axis-desc">{r.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ✦ 四柱推命 × MBTI 統合 */}
        <div className="card" style={{ border: '1.5px solid rgba(201,168,76,.28)', background: 'linear-gradient(160deg,rgba(201,168,76,.07) 0%,rgba(160,120,220,.05) 100%)' }}>
          <div className="sec-label">
            <span className="sec-en" style={{ color: 'rgba(201,168,76,.7)' }}>✦ SYNTHESIS</span>
            <span className="sec-ja" style={{ fontSize: 18 }}>2つの占いが重なると見えてくるもの</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.8, marginBottom: 20 }}>
            四柱推命（生年月日）とMBTIという異なる2つのアプローチを<strong style={{ color: 'var(--gold-dim)' }}>4つの軸</strong>で重ねると、2人の本質的な縁が見えてくるんダよ。
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
            <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(80,140,210,.06)', border: '1px solid rgba(80,140,210,.16)' }}>
              <div style={{ fontSize: 9, letterSpacing: '.15em', color: 'rgba(140,190,240,.5)', marginBottom: 8 }}>あなたの命式 × MBTI</div>
              <div style={{ fontFamily: "'Shippori Mincho',serif", fontSize: 13, fontWeight: 700, color: 'rgba(140,190,240,.9)', marginBottom: 6 }}>{myGogyo}の気 × {myMbti || '—'}</div>
              <div style={{ fontSize: 12, color: 'rgba(232,228,217,.72)', lineHeight: 1.9, fontFamily: "'Shippori Mincho',serif" }}>
                あなたは「{myGogyo}の気」を持つ人ンダ。{myGogyo === '水' ? '静かな感受性と深い内面' : myGogyo === '木' ? 'しなやかな成長力' : myGogyo === '火' ? '熱い情熱と行動力' : myGogyo === '金' ? '強い意志と美意識' : '揺るぎない安定感'}が、MBTIの個性と重なって独自のリズムを生み出すんダよ。
              </div>
            </div>
            <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(224,96,122,.05)', border: '1px solid rgba(224,96,122,.16)' }}>
              <div style={{ fontSize: 9, letterSpacing: '.15em', color: 'rgba(224,96,122,.5)', marginBottom: 8 }}>{ptName}の命式 × MBTI</div>
              <div style={{ fontFamily: "'Shippori Mincho',serif", fontSize: 13, fontWeight: 700, color: 'rgba(224,96,122,.9)', marginBottom: 6 }}>{ptGogyo}の気 × {ptMbti || '—'}</div>
              <div style={{ fontSize: 12, color: 'rgba(232,228,217,.72)', lineHeight: 1.9, fontFamily: "'Shippori Mincho',serif" }}>
                {ptName}は「{ptGogyo}の気」を持つ人ンダ。{ptGogyo === '水' ? '深い感受性' : ptGogyo === '木' ? 'まっすぐな成長力' : ptGogyo === '火' ? '情熱と行動力' : ptGogyo === '金' ? '意志の強さ' : '包容の安定感'}が、MBTIの個性と重なって、あなたとの関係にしっかりした土台を作るんダよ。
              </div>
            </div>
          </div>

          <div style={{ padding: '20px 22px', borderRadius: 14, background: 'rgba(201,168,76,.07)', border: '1px solid rgba(201,168,76,.22)' }}>
            <div style={{ fontSize: 9, letterSpacing: '.2em', color: 'rgba(201,168,76,.6)', marginBottom: 10 }}>✦ 2つの占いが重なって見えてくること</div>
            <div style={{ fontSize: 14, color: 'rgba(232,228,217,.88)', lineHeight: 2.1, fontFamily: "'Shippori Mincho',serif" }}>
              四柱推命で見ると{compatType}、MBTIで見ると{ssMbti >= 78 ? '調和度が高い' : ssMbti >= 60 ? '補い合う' : '距離感が必要な'}関係ンダ。2つの占いを重ねると、{compatType === '相生型' ? 'お互いを高め合う縁' : compatType === '比和型' ? '自然体でいられる縁' : compatType === '相剋型' ? '乗り越えるたびに深まる縁' : '穏やかに寄り添う縁'}として姿を現すンダよ。大事なのは「どう付き合うか」ンダ🐼
            </div>
          </div>
        </div>

        {/* ⑥ 二人の相性のいい時期 */}
        <div className="card">
          <div className="sec-label">
            <span className="sec-en">BEST TIMING</span>
            <span className="sec-ja">二人の相性がいい時期</span>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, background: 'rgba(201,168,76,.1)', border: '1px solid rgba(201,168,76,.25)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gold)', flexShrink: 0 }}></div>
              <span style={{ fontSize: 11, color: 'rgba(232,208,120,.85)' }}>最高の時期</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, background: 'rgba(100,200,80,.08)', border: '1px solid rgba(100,200,80,.22)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(100,200,80,.85)', flexShrink: 0 }}></div>
              <span style={{ fontSize: 11, color: 'rgba(120,210,90,.85)' }}>いい時期</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.1)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,.25)', flexShrink: 0 }}></div>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>ふつう</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, background: 'rgba(200,80,60,.08)', border: '1px solid rgba(200,80,60,.22)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(200,80,60,.8)', flexShrink: 0 }}></div>
              <span style={{ fontSize: 11, color: 'rgba(210,100,80,.85)' }}>注意が必要な時期</span>
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 52, top: 0, bottom: 0, width: 2, background: 'rgba(255,255,255,.07)' }}></div>

            {timingRows.map((row, i) => {
              const isLast = i === timingRows.length - 1;
              if (row.level === 'best') {
                return (
                  <div key={row.month} style={{ display: 'flex', gap: 0, alignItems: 'flex-start', marginBottom: isLast ? 0 : 4 }}>
                    <div style={{ width: 52, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 12, position: 'relative', zIndex: 1 }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg,#a07a24,#E8C96A)', border: '2px solid var(--gold-l)', boxShadow: '0 0 16px rgba(201,168,76,.55)' }}></div>
                    </div>
                    <div style={{ flex: 1, padding: '8px 0 8px 16px', borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,.04)' }}>
                      <div style={{ background: 'rgba(201,168,76,.07)', border: '1px solid rgba(201,168,76,.3)', borderRadius: 12, padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: "'Shippori Mincho',serif", fontSize: 20, fontWeight: 800, color: 'var(--gold-l)', minWidth: 28 }}>{row.month}</span>
                          <span style={{ padding: '3px 12px', borderRadius: 20, background: 'rgba(201,168,76,.18)', border: '1px solid rgba(201,168,76,.4)', fontSize: 10, color: 'var(--gold)', fontWeight: 700 }}>★ ベスト</span>
                          <span style={{ fontSize: 13, color: 'var(--gold)' }}>{row.stars}</span>
                        </div>
                        <div style={{ fontSize: 14, color: 'rgba(232,208,120,.85)', lineHeight: 1.9, fontFamily: "'Shippori Mincho',serif" }}>{row.desc}<PopoSvg size={20} /></div>
                      </div>
                    </div>
                  </div>
                );
              }
              if (row.level === 'good') {
                return (
                  <div key={row.month} style={{ display: 'flex', gap: 0, alignItems: 'flex-start', marginBottom: isLast ? 0 : 4 }}>
                    <div style={{ width: 52, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 12, position: 'relative', zIndex: 1 }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(100,200,80,.7)', border: '2px solid rgba(100,200,80,.9)', boxShadow: '0 0 10px rgba(100,200,80,.4)' }}></div>
                    </div>
                    <div style={{ flex: 1, padding: '8px 0 8px 16px', borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,.04)' }}>
                      <div style={{ background: 'rgba(100,200,80,.05)', border: '1px solid rgba(100,200,80,.18)', borderRadius: 12, padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: "'Shippori Mincho',serif", fontSize: 18, fontWeight: 800, color: 'rgba(120,210,90,.9)', minWidth: 28 }}>{row.month}</span>
                          <span style={{ padding: '2px 10px', borderRadius: 20, background: 'rgba(100,200,80,.15)', border: '1px solid rgba(100,200,80,.3)', fontSize: 10, color: 'rgba(120,210,90,.9)', fontWeight: 700 }}>いい時期</span>
                          <span style={{ fontSize: 12, color: 'rgba(120,210,90,.7)' }}>{row.stars}</span>
                        </div>
                        <div style={{ fontSize: 13, color: 'rgba(232,228,217,.7)', lineHeight: 1.85, fontFamily: "'Shippori Mincho',serif" }}>{row.desc}</div>
                      </div>
                    </div>
                  </div>
                );
              }
              if (row.level === 'care') {
                return (
                  <div key={row.month} style={{ display: 'flex', gap: 0, alignItems: 'flex-start', marginBottom: isLast ? 0 : 4 }}>
                    <div style={{ width: 52, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 12, position: 'relative', zIndex: 1 }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(200,80,60,.6)', border: '2px solid rgba(200,80,60,.8)', boxShadow: '0 0 10px rgba(200,80,60,.3)' }}></div>
                    </div>
                    <div style={{ flex: 1, padding: '8px 0 8px 16px', borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,.04)' }}>
                      <div style={{ background: 'rgba(200,80,60,.05)', border: '1px solid rgba(200,80,60,.18)', borderRadius: 12, padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: "'Shippori Mincho',serif", fontSize: 18, fontWeight: 800, color: 'rgba(210,100,80,.9)', minWidth: 28 }}>{row.month}</span>
                          <span style={{ padding: '2px 10px', borderRadius: 20, background: 'rgba(200,80,60,.12)', border: '1px solid rgba(200,80,60,.3)', fontSize: 10, color: 'rgba(210,100,80,.9)', fontWeight: 700 }}>⚠ 注意</span>
                          <span style={{ fontSize: 12, opacity: .5 }}>{row.stars}</span>
                        </div>
                        <div style={{ fontSize: 13, color: 'rgba(232,228,217,.65)', lineHeight: 1.85, fontFamily: "'Shippori Mincho',serif" }}>{row.desc}<PopoSvg size={20} /></div>
                      </div>
                    </div>
                  </div>
                );
              }
              // normal
              return (
                <div key={row.month} style={{ display: 'flex', gap: 0, alignItems: 'flex-start', marginBottom: isLast ? 0 : 4 }}>
                  <div style={{ width: 52, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 14, position: 'relative', zIndex: 1 }}>
                    <div style={{ width: 13, height: 13, borderRadius: '50%', background: 'rgba(255,255,255,.18)', border: '2px solid rgba(255,255,255,.25)' }}></div>
                  </div>
                  <div style={{ flex: 1, padding: '10px 0 10px 16px', borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontFamily: "'Shippori Mincho',serif", fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,.45)', minWidth: 36 }}>{row.month}</span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,.22)' }}>{row.stars}</span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,.3)' }}>{row.desc}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 強みと注意点 */}
          <div className="advice-grid" style={{ marginTop: 8 }}>
            <div className="adv pos">
              <div className="adv-head">
                <span className="adv-em">✦</span>
                <span className="adv-title pos">2人の強み</span>
              </div>
              <ul className="adv-list">
                {strengths.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
            <div className="adv neg">
              <div className="adv-head">
                <span className="adv-em">⚠</span>
                <span className="adv-title neg">気をつけること</span>
              </div>
              <ul className="adv-list">
                {cautions.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          </div>

          {/* 最終ポポコメント */}
          <div className="popo" style={{ marginTop: 4 }}>
            <PopoSvg size={28} />
            <p className="popo-tx">{finalPopo}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CompatDetailPage;
