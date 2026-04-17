// ══════════════════════════════════════════════════════════════
//  PANDA FORTUNE — ポポチャット（AIチャット）用データ
//  元HTML 4765-4813行。AiChatTab で使用。
// ══════════════════════════════════════════════════════════════

/**
 * ポポチャットのカテゴリ（質問サジェスト）。
 * questions は命式（M）を受け取って動的に文字列を返す関数。
 * 元HTML 4765-4809行。
 */
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
        '私の命式を一言で教えて',
        '格局「' + M.kakukyoku + '」の意味を詳しく教えて',
        '喜神「' + ki + '」の活かし方は？',
        '忌神「' + kj + '」を避けるには？',
        '日主「' + kan + shi + '」の特徴は？',
        '私の五行バランスから何が分かる？',
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
        '今日の運勢を詳しく教えて',
        '今日の恋愛運のアドバイスは？',
        '今日の仕事運のアドバイスは？',
        '今日の金運のアドバイスは？',
        '今の大運「' + duStr + '」の意味は？',
        '今年はどんな年？',
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
        '私と相性のいい人の特徴は？',
        '五行の相生・相剋が相性に与える影響は？',
        '支合・干合が恋愛に与える影響は？',
        '六冲が恋愛に与える影響は？',
        '忌神と喜神が一致する相手との関係は？',
        'MBTI×命式で見る相性とは？',
      ];
    },
  },
];

/** localStorage 保存キー（v2: メッセージ単位タイムスタンプ） */
export const POPO_STORAGE_KEY = 'pf_popo_chat_v2';

/** 会話の有効期限 = 72時間 */
export const POPO_EXPIRE_MS = 72 * 60 * 60 * 1000;
