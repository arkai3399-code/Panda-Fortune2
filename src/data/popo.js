// ══════════════════════════════════════════════════════════════
//  PANDA FORTUNE — ポポチャット（AIチャット）用データ
//  元HTML 4765-4813行。AiChatTab で使用。
// ══════════════════════════════════════════════════════════════

/**
 * ポポチャットのカテゴリ（質問サジェスト）。
 * questions は命式（M）を受け取って動的に文字列を返す関数。
 * 元HTML 4765-4809行。
 */
// 現在の言語を取得
const _lang = () => (typeof window !== 'undefined' && window.PF_LANG && window.PF_LANG.getLang) ? window.PF_LANG.getLang() : 'jp';

// 質問オブジェクト: { ja, kr } を返す。
// AiChatTab は表示に q[lang]、generatePopoAnswer の入力には常に q.ja を渡す
// （generatePopoAnswer のパターンマッチは JA キーワード前提のため）。
export const POPO_CATS = [
  {
    label: '命式を知る',
    color: 'rgba(201,168,76,0.85)',
    bg: 'rgba(201,168,76,0.08)',
    border: 'rgba(201,168,76,0.3)',
    questions(M) {
      const kan = (M.nichi && M.nichi.kan) || '壬';
      const shi = (M.nichi && M.nichi.shi) || '午';
      const ki = ((M._calc && M._calc.kishin) || []).join('・');
      const kj = ((M._calc && M._calc.kijin)  || []).join('・');
      return [
        { ja: '私の命式を一言で教えて',                     kr: '내 명식을 한마디로 알려줘' },
        { ja: '格局「' + M.kakukyoku + '」の意味を詳しく教えて', kr: '격국 "' + M.kakukyoku + '"의 의미를 자세히 알려줘' },
        { ja: '喜神「' + ki + '」の活かし方は？',            kr: '희신 "' + ki + '"를 활용하는 방법은?' },
        { ja: '忌神「' + kj + '」を避けるには？',            kr: '기신 "' + kj + '"을(를) 피하려면?' },
        { ja: '日主「' + kan + shi + '」の特徴は？',         kr: '일주 "' + kan + shi + '"의 특징은?' },
        { ja: '私の五行バランスから何が分かる？',             kr: '내 오행 밸런스에서 무엇을 알 수 있어?' },
      ];
    },
  },
  {
    label: '今日の運勢',
    color: 'rgba(100,190,240,0.85)',
    bg: 'rgba(100,180,240,0.08)',
    border: 'rgba(100,180,240,0.3)',
    questions(M) {
      const du = M._calc && M._calc.currentDaiun;
      const duStr = du ? du.kan + du.shi : '大運';
      return [
        { ja: '今日の運勢を詳しく教えて',                  kr: '오늘의 운세를 자세히 알려줘' },
        { ja: '今日の恋愛運のアドバイスは？',              kr: '오늘의 연애운 조언은?' },
        { ja: '今日の仕事運のアドバイスは？',              kr: '오늘의 업무운 조언은?' },
        { ja: '今日の金運のアドバイスは？',                kr: '오늘의 금전운 조언은?' },
        { ja: '今の大運「' + duStr + '」の意味は？',       kr: '지금의 대운 "' + duStr + '"의 의미는?' },
        { ja: '今年はどんな年？',                         kr: '올해는 어떤 해야?' },
      ];
    },
  },
  {
    label: '相性占い',
    color: 'rgba(224,96,122,0.85)',
    bg: 'rgba(224,96,122,0.08)',
    border: 'rgba(224,96,122,0.3)',
    questions() {
      return [
        { ja: '私と相性のいい人の特徴は？',                kr: '나와 궁합이 좋은 사람의 특징은?' },
        { ja: '五行の相生・相剋が相性に与える影響は？',     kr: '오행의 상생・상극이 궁합에 미치는 영향은?' },
        { ja: '支合・干合が恋愛に与える影響は？',           kr: '지지합・천간합이 연애에 미치는 영향은?' },
        { ja: '六冲が恋愛に与える影響は？',                kr: '육충(六冲)이 연애에 미치는 영향은?' },
        { ja: '忌神と喜神が一致する相手との関係は？',       kr: '기신과 희신이 일치하는 상대와의 관계는?' },
        { ja: 'MBTI×命式で見る相性とは？',                kr: 'MBTI × 명식으로 보는 궁합이란?' },
      ];
    },
  },
];

/** localStorage 保存キー（v2: メッセージ単位タイムスタンプ） */
export const POPO_STORAGE_KEY = 'pf_popo_chat_v2';

/** 会話の有効期限 = 72時間 */
export const POPO_EXPIRE_MS = 72 * 60 * 60 * 1000;
