import React from 'react';
import { C } from '../../data/theme.js';
import { calcDailyScore, genComment } from '../../logic/fortuneCalc.js';
import { OFFSET_LABELS } from '../../data/dailyLog.js';
import PandaIcon from '../common/PandaIcon.jsx';

// ── 今日の運勢ブロック ──
// 元HTML 3156-3467行。
export default function TodayFortuneBlock({ onOpenDetail, calc, offset, setOffset }) {
  const isToday = offset === 0;
  const canGoBack = offset > -2;

  // calc から動的に日運スコアを生成
  // ── 3日間のキャッシュをlocalStorageで管理 ──────────────────────────
  const buildLog = (offsetDays) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const s = calcDailyScore(calc, d);
    const js = s.jisshin || '';
    const ki = (calc.kishin || []).join('・') || '';
    const kj = (calc.kijin  || []).join('・') || '';
    const kiH = ki && (calc.kishin || []).includes(s.dayKan);
    const _JIKKAN_G2  = { '甲':'木','乙':'木','丙':'火','丁':'火','戊':'土','己':'土','庚':'金','辛':'金','壬':'水','癸':'水' };
    const _JUNISHI_G2 = { '子':'水','丑':'土','寅':'木','卯':'木','辰':'土','巳':'火','午':'火','未':'土','申':'金','酉':'金','戌':'土','亥':'水' };
    const SG_B = { 子:'丑',丑:'子',寅:'亥',亥:'寅',卯:'戌',戌:'卯',辰:'酉',酉:'辰',巳:'申',申:'巳',午:'未',未:'午' };
    const RK_B = { 子:'午',午:'子',丑:'未',未:'丑',寅:'申',申:'寅',卯:'酉',酉:'卯',辰:'戌',戌:'辰',巳:'亥',亥:'巳' };
    const ns = calc.pillars.day.shi;
    const sgH = SG_B[s.dayShi] === ns;
    const rkH = RK_B[s.dayShi] === ns;
    const label = offsetDays === 0 ? '今日' : offsetDays === -1 ? '昨日' : '一昨日';

    // ポポコメント：十神・喜忌神・支合・六冲・スコアを全て使って詳細生成
    const kjH    = kj && (calc.kijin || []).includes(s.dayKan);
    const kjShiH = (calc.kijin || []).includes(_JUNISHI_G2[s.dayShi] || '');
    const kiShiH = (calc.kishin || []).includes(_JUNISHI_G2[s.dayShi] || '');
    // eslint-disable-next-line no-unused-vars
    const dayKanGogyo = _JIKKAN_G2[s.dayKan] || '';
    // eslint-disable-next-line no-unused-vars
    const dayShiGogyo = _JUNISHI_G2[s.dayShi] || '';

    // 最低・最高の運をテキストで
    const scores3 = [{ k: '恋愛', v: s.love }, { k: '仕事', v: s.work }, { k: '金運', v: s.money }];
    const lowest  = scores3.slice().sort((a, b) => a.v - b.v)[0];
    const highest = scores3.slice().sort((a, b) => b.v - a.v)[0];

    // ── 十神ごとの個別メッセージテーブル ────────────────────────────
    // eslint-disable-next-line no-unused-vars
    const _kiGogyoTip = ki === '水' ? '静かな場所や水のそばで過ごす'
      : ki === '金' ? '白や銀のものを身につける・整理整頓する'
      : ki === '木' ? '緑を見る・植物のそばにいる'
      : ki === '火' ? '明るい場所や人のそばへ出る'
      : '規則正しい生活リズムを守る';

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
    if (sgH && s.total >= 72) {
      popo = `${label}（${s.kanshi}日）は縁のエネルギーが特別に開いていた日だったんダ🐼 今日の干支「${s.dayShi}」があなたの生まれ日の地支「${ns}」と特別な関係にあって、恋愛・縁・出会いに関わることが命式的に後押しされていたんだよ。${highest.k}運が${highest.v}点と一番高かったのも偶然じゃないんダ。${label}誰かと会ったり、連絡が来たり、気持ちを伝えたりした瞬間があったなら——それは命式が用意してくれたタイミングだったんダよ🐼`;
    } else if (rkH && s.total < 65) {
      popo = `${label}（${s.kanshi}日）は感情が揺れやすく、気持ちが伝わりにくい日だったんダ🐼 今日の干支「${s.dayShi}」とあなたの生まれ日の地支「${ns}」が対立する関係にあって、言葉が意図と違う方向に伝わったり、タイミングがすれ違いやすい流れだったんだよ。${lowest.k}運${lowest.v}点もそのサインンダ。今日誰かと揉めたり、うまくいかなかった気がするなら——それは相手のせいでも自分のせいでもなく、日の流れのせいだからんダ。引きずらなくていいんダよ🐼`;
    } else if (kjH && kjShiH) {
      const _tip = ki === '水' ? '好きな飲み物をゆっくり飲む'
        : ki === '金' ? '部屋を少し片付ける'
        : ki === '木' ? '外の空気を吸いに行く'
        : ki === '火' ? '明るい音楽を流す'
        : 'いつもより少し早く寝る';
      popo = `${label}（${s.kanshi}日）は、あなたにとって向かい風が重なった日だったんダ🐼 空気の流れがあなたの命式と合っていない日で、何をやってもひと手間余計にかかる感じがあったとしたら、それは本当のことだったんだよ。${lowest.k}運${lowest.v}点——今日は力を入れる日じゃなく、${_tip}だけで十分な日だったんダ。今日をやり過ごせたこと自体が、ちゃんと正解だったんダよ🐼`;
    } else if (s.total >= 78) {
      popo = _goodMsgs[js] || `${label}（${s.kanshi}日）は全体的に追い風が来ていた日だったんダ🐼 ${highest.k}運が${highest.v}点と最も高く、命式的に後押しされる流れの中で${label}動いたことはしっかり力になっているんだよ。今日の自分をちゃんと認めてほしいんダよ🐼`;
    } else if (s.total >= 62) {
      popo = _midMsgs[js] || `${label}（${s.kanshi}日）は${highest.k}運${highest.v}点と、3つの中では${highest.k}が一番乗っていた日だったんダ🐼 大きな波はなくても、着実に積み上げた時間は必ず後から力になってくるんだよ。今日のコツコツは裏切らないんダよ🐼`;
    } else {
      popo = _badMsgs[js] || `${label}（${s.kanshi}日）は命式的に流れが整いにくい日だったんダ🐼 ${lowest.k}運${lowest.v}点が最も低く、今日だけを見ると空回りが多かったかもしれないんだよ。でも、こういう日に無理せず過ごせたことが、次の追い風が来たときの土台になるんダ。今日をちゃんとやり過ごせたこと——それだけで十分ンダよ🐼`;
    }

    // ── localStorage で3日間保存（4日目に消去） ──────────────────────
    const dateKey = `pf_daily_${d.getFullYear()}_${d.getMonth() + 1}_${d.getDate()}`;
    try {
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 3);
      Object.keys(localStorage).filter((k) => k.startsWith('pf_daily_')).forEach((k) => {
        const parts = k.replace('pf_daily_', '').split('_');
        if (parts.length === 3) {
          const kd = new Date(+parts[0], +parts[1] - 1, +parts[2]);
          if (kd < cutoff) localStorage.removeItem(k);
        }
      });
      if (offsetDays === 0) {
        localStorage.setItem(dateKey, JSON.stringify({
          total: s.total, love: s.love, work: s.work, money: s.money,
          kanshi: s.kanshi, jisshin: js, savedAt: Date.now(),
        }));
      }
    } catch (e) { /* noop */ }

    return {
      date: s.dateStr,
      kanshi: s.kanshi,
      scores: [
        { label: '総合運', value: s.total, color: '#C9A84C',              icon: '☯️', comment: genComment(s.total, 'total', js, { kiH, kjH, sgH, rkH }), tab: null },
        { label: '恋愛運', value: s.love,  color: 'rgba(220,100,130,0.9)', icon: '💕', comment: genComment(s.love,  'love',  js, { kiH, kjH, sgH, rkH }), tab: 'love' },
        { label: '仕事運', value: s.work,  color: 'rgba(100,180,220,0.9)', icon: '💼', comment: genComment(s.work,  'work',  js, { kiH, kjH, sgH, rkH }), tab: 'work' },
        { label: '金運',   value: s.money, color: 'rgba(160,200,100,0.9)', icon: '💰', comment: genComment(s.money, 'money', js, { kiH, kjH, sgH, rkH }), tab: 'money' },
      ],
      popo,
    };
  };

  const log = buildLog(offset);

  return (
    <div>
      {/* ── 日付ナビゲーション ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 10 }}>

        {/* ◁ 昨日へ */}
        <button
          onClick={() => canGoBack && setOffset((o) => o - 1)}
          disabled={!canGoBack}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 10, cursor: canGoBack ? 'pointer' : 'default',
            background: 'transparent',
            border: `1px solid ${canGoBack ? 'rgba(201,168,76,0.3)' : 'rgba(255,255,255,0.05)'}`,
            color: canGoBack ? C.goldDim : 'rgba(255,255,255,0.12)',
            fontSize: 12, fontFamily: "'Noto Sans JP',sans-serif",
            transition: 'all 0.2s', flexShrink: 0,
          }}
          onMouseEnter={(e) => canGoBack && (e.currentTarget.style.borderColor = C.gold, e.currentTarget.style.color = C.gold)}
          onMouseLeave={(e) => canGoBack && (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)', e.currentTarget.style.color = C.goldDim)}
        >
          ◁ {offset === 0 ? '昨日の運勢' : '一昨日の運勢'}
        </button>

        {/* 中央：日付 */}
        <div style={{ textAlign: 'center', flex: 1 }}>
          <p style={{ fontFamily: "'Shippori Mincho',serif", fontSize: 15, color: isToday ? C.goldLight : C.textSub, fontWeight: 600 }}>
            {log.date}
          </p>
          <p style={{ fontSize: 12, color: C.textMuted, marginTop: 3 }}>
            <span style={{ fontFamily: "'Shippori Mincho',serif", color: C.goldDim }}>{log.kanshi}</span>日
            {isToday && (
              <span style={{ marginLeft: 8, fontSize: 10, background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.45)', borderRadius: 10, padding: '1px 9px', color: C.gold }}>TODAY</span>
            )}
            {!isToday && (
              <span style={{ marginLeft: 8, fontSize: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '1px 9px', color: C.textMuted }}>{OFFSET_LABELS[String(offset)].badge}</span>
            )}
          </p>
        </div>

        {/* 今日に戻るボタン（今日以外のとき表示） */}
        {!isToday ? (
          <button
            onClick={() => setOffset(0)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '8px 14px', borderRadius: 10, cursor: 'pointer',
              background: 'rgba(201,168,76,0.08)',
              border: '1px solid rgba(201,168,76,0.3)',
              color: C.goldDim, fontSize: 12,
              fontFamily: "'Noto Sans JP',sans-serif",
              transition: 'all 0.2s', flexShrink: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.gold; e.currentTarget.style.color = C.gold; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)'; e.currentTarget.style.color = C.goldDim; }}
          >
            今日 ▷
          </button>
        ) : (
          <div style={{ width: 80, flexShrink: 0 }} />
        )}
      </div>

      {/* ── ドットインジケーター ── */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
        {[0, -1, -2].map((o) => (
          <button key={o} onClick={() => setOffset(o)} style={{
            width: o === offset ? 28 : 8, height: 8, borderRadius: 4,
            background: o === offset ? C.gold : 'rgba(255,255,255,0.12)',
            border: 'none', cursor: 'pointer', padding: 0,
            transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
            boxShadow: o === offset ? '0 0 8px rgba(201,168,76,0.6)' : 'none',
          }} />
        ))}
      </div>

      {/* ── 過去3日間の総合運推移バー（常時表示） ── */}
      <div style={{ marginBottom: 20, padding: '14px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12 }}>
        <p style={{ fontSize: 10, color: C.gold, letterSpacing: '0.2em', marginBottom: 12 }}>過去3日間の総合運推移</p>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
          {[-2, -1, 0].map((o) => {
            const l = buildLog(o);
            const totalScore = l.scores.find((ss) => ss.label === '総合運')?.value ?? 0;
            const barH = Math.max(14, (totalScore / 100) * 64);
            const isActive = o === offset;
            return (
              <div key={o} onClick={() => setOffset(o)} style={{ flex: 1, textAlign: 'center', cursor: 'pointer' }}>
                <p style={{ fontSize: 13, fontFamily: "'Shippori Mincho',serif", fontWeight: 700, color: isActive ? C.gold : C.textMuted, marginBottom: 6 }}>{totalScore}</p>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', height: 64 }}>
                  <div style={{
                    width: '55%', height: barH, borderRadius: '5px 5px 0 0',
                    background: isActive
                      ? `linear-gradient(to top, ${C.gold}, ${C.goldLight})`
                      : o === 0 ? 'rgba(201,168,76,0.25)' : 'rgba(255,255,255,0.1)',
                    boxShadow: isActive ? '0 0 12px rgba(201,168,76,0.5)' : 'none',
                    transition: 'all 0.3s ease',
                    border: isActive ? '1px solid rgba(201,168,76,0.6)' : '1px solid rgba(255,255,255,0.06)',
                  }} />
                </div>
                <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '0 auto', width: '80%' }} />
                <p style={{ fontSize: 11, color: isActive ? C.gold : C.textMuted, marginTop: 6, fontWeight: isActive ? 600 : 300 }}>{OFFSET_LABELS[String(o)].short}</p>
                <p style={{ fontSize: 9, color: 'rgba(240,230,208,0.2)', fontFamily: "'Shippori Mincho',serif", marginTop: 2 }}>{l.kanshi}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div key={`popo-${offset}`} style={{ animation: 'fadeUp 0.4s 0.1s ease both', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '18px 20px', borderRadius: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {/* 総合点 */}
          {(() => {
            const totalScore = log.scores.find((x) => x.label === '総合運');
            const val = totalScore ? totalScore.value : 0;
            const scoreColor = val >= 75 ? '#E8C96A' : val >= 60 ? 'rgba(200,190,150,0.9)' : 'rgba(180,150,130,0.8)';
            return (
              <div style={{ flexShrink: 0, textAlign: 'center', minWidth: 64 }}>
                <div style={{ fontFamily: "'Shippori Mincho',serif", fontSize: 42, fontWeight: 900, color: scoreColor, lineHeight: 1 }}>{val}</div>
                <div style={{ fontSize: 9, color: 'rgba(240,230,208,0.35)', marginTop: 4, letterSpacing: '0.1em' }}>総合点</div>
              </div>
            );
          })()}
          {/* 縦線 */}
          <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />
          {/* ポポコメント */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flexShrink: 0, width: 32, height: 32, borderRadius: '50%', background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, marginTop: 2 }}><PandaIcon size={20} /></div>
            <p style={{ fontFamily: "'Shippori Mincho',serif", fontSize: 13, lineHeight: 1.9, color: 'rgba(232,228,217,0.8)' }}>{log.popo}</p>
          </div>
        </div>
      </div>

      {/* ── スコアカード（恋愛・仕事・金運 3列） ── */}
      <div key={offset} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20, animation: 'fadeUp 0.35s ease both' }}>
        {log.scores.filter((d) => !!d.tab).map((d, i) => (
          <div
            key={i}
            onClick={() => onOpenDetail && onOpenDetail(d.tab, offset)}
            style={{
              padding: '14px 12px 12px',
              background: 'rgba(255,255,255,0.02)',
              border: `1px solid ${d.color}30`,
              borderRadius: 14,
              cursor: 'pointer',
              transition: 'all 0.2s',
              position: 'relative',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${d.color}60`; e.currentTarget.style.background = `${d.color}08`; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = `${d.color}30`; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
          >
            <p style={{ fontSize: 10, color: 'rgba(240,230,208,0.45)', letterSpacing: '0.06em', marginBottom: 8 }}>{d.icon} {d.label}</p>
            <p style={{ fontFamily: "'Shippori Mincho',serif", fontSize: 28, fontWeight: 900, color: d.color, lineHeight: 1, marginBottom: 6 }}>
              {d.value}<span style={{ fontSize: 10, fontWeight: 400, color: 'rgba(240,230,208,0.3)', marginLeft: 2 }}>/100</span>
            </p>
            <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)', marginBottom: 8, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: d.value + '%', background: d.color, borderRadius: 2, opacity: 0.7 }} />
            </div>
            <p style={{ fontSize: 10, color: 'rgba(240,230,208,0.45)', lineHeight: 1.6 }}>{d.comment}</p>
            <span style={{ position: 'absolute', bottom: 8, right: 10, fontSize: 9, color: `${d.color}70`, letterSpacing: '0.05em' }}>詳細 ›</span>
          </div>
        ))}
      </div>

    </div>
  );
}
