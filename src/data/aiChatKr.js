// ════════════════════════════════════════════════════════════════
// AiChatTab (포포에게 묻기) 의 KR 빌더
// ════════════════════════════════════════════════════════════════

export function getLang() {
  if (typeof window !== 'undefined' && window.PF_LANG && window.PF_LANG.getLang) {
    return window.PF_LANG.getLang();
  }
  return 'jp';
}

// ── 헤더 서브텍스트 ──
export function buildHeaderSubtext_JA(kan, shi, kakukyoku) {
  return `${kan}${shi}日主・${kakukyoku}をもとに答えるンダよ🐼`;
}
export function buildHeaderSubtext_KR(kan, shi, kakukyoku) {
  return `${kan}${shi}일간・${kakukyoku}을 바탕으로 답해 드려요🐼`;
}

// ── makeInitialMessages 본문 ──
export function buildInitialGreeting_JA(opts) {
  const { kan, shi, kaku, ki, kj, mbti, kanGogyo, moJisshin, mbtiComment, duComment } = opts;
  const NL = '\n';
  const GOGYO_OPEN_JA = {
    '木': 'しなやかで好奇心旺盛な木の気を持つ人ンダよ🌱',
    '火': '情熱と行動力にあふれた火の気を持つ人ンダよ🔥',
    '土': '揺るぎない安定感を持つ土の気の人ンダよ🌍',
    '金': '高い意志と美意識を持つ金の気の人ンダよ💎',
    '水': '深い思慮と感受性を持つ水の気の人ンダよ🌊',
  };
  return 'こんにちはンダ🐼 ポポだよ！あなたの命式、ちゃんと全部読んだんダ。' + NL + NL +
    '日主「' + kan + shi + '」——' + (GOGYO_OPEN_JA[kanGogyo] || '') + NL +
    '格局は「' + kaku + '」で、喜神「' + ki + '」が追い風、忌神「' + kj + '」が向かい風ンダ。' + NL +
    (moJisshin ? moJisshin + NL : '') +
    (mbtiComment ? mbtiComment + NL : '') +
    (duComment ? duComment + NL : '') + NL +
    '命式・今日の運勢・相性のこと、なんでも聞いてほしいんダよ。下のボタンから選んでもいいし、直接入力してもOKンダ🐼';
}
export function buildInitialGreeting_KR(opts) {
  const { kan, shi, kaku, ki, kj, mbti, kanGogyo, moJisshin, mbtiComment, duComment } = opts;
  const NL = '\n';
  const GOGYO_OPEN_KR = {
    '木': '유연하고 호기심이 왕성한 목의 기운을 가진 사람이에요🌱',
    '火': '열정과 행동력이 넘치는 화의 기운을 가진 사람이에요🔥',
    '土': '흔들림 없는 안정감을 가진 토의 기운을 가진 사람이에요🌍',
    '金': '높은 의지와 미의식을 가진 금의 기운을 가진 사람이에요💎',
    '水': '깊은 사려와 감수성을 가진 수의 기운을 가진 사람이에요🌊',
  };
  return '안녕하세요🐼 포포예요! 당신의 명식, 전부 꼼꼼히 읽었어요.' + NL + NL +
    '일간 "' + kan + shi + '"——' + (GOGYO_OPEN_KR[kanGogyo] || '') + NL +
    '격국은 "' + kaku + '"이고, 희신 "' + ki + '"이 순풍, 기신 "' + kj + '"이 역풍이에요.' + NL +
    (moJisshin ? moJisshin + NL : '') +
    (mbtiComment ? mbtiComment + NL : '') +
    (duComment ? duComment + NL : '') + NL +
    '명식・오늘의 운세・궁합에 관한 것, 무엇이든 물어보세요. 아래 버튼에서 골라도 되고, 직접 입력해도 괜찮아요🐼';
}

// makeInitialMessages 내부에서 쓰는 보조 빌더 (JA/KR)
export function buildMoJisshin_JA(jisshin) {
  return jisshin ? '月柱の十神「' + jisshin + '」が社会での動き方に影響しているンダ。' : '';
}
export function buildMoJisshin_KR(jisshin) {
  return jisshin ? '월주의 십신 "' + jisshin + '"이 사회에서의 움직임 방식에 영향을 주고 있어요.' : '';
}
export function buildDuComment_JA(duStr, kishin, kijin, du, JIKKAN_G) {
  if (!duStr) return '';
  const isKi = (kishin && du && kishin.includes(JIKKAN_G[du.kan]));
  const isKj = (kijin && du && kijin.includes(JIKKAN_G[du.kan]));
  return '今は大運「' + duStr + '」の時期——' +
    (isKi ? '喜神と重なる吉の流れの中にいるンダ🐼' :
     isKj ? '少し守りを意識しながら動く時期ンダ🐼' :
            '着実に積み上げていく時期ンダ🐼');
}
export function buildDuComment_KR(duStr, kishin, kijin, du, JIKKAN_G) {
  if (!duStr) return '';
  const isKi = (kishin && du && kishin.includes(JIKKAN_G[du.kan]));
  const isKj = (kijin && du && kijin.includes(JIKKAN_G[du.kan]));
  return '지금은 대운 "' + duStr + '"의 시기——' +
    (isKi ? '희신과 겹치는 길한 흐름 속에 있어요🐼' :
     isKj ? '조금 수비를 의식하며 움직이는 시기예요🐼' :
            '착실하게 쌓아 올리는 시기예요🐼');
}
export function buildMbtiComment_JA(mbti, kanGogyo) {
  if (!mbti) return '';
  const trait = (kanGogyo === '水' || kanGogyo === '木') ? '感受性と直感力が際立つ個性'
              : kanGogyo === '火' ? '情熱と表現力が突出した個性'
              : kanGogyo === '金' ? '意志の強さと美意識が光る個性'
                                  : '包容力と安定感が際立つ個性';
  return 'MBTIの「' + mbti + '」と命式が重なると、' + trait + 'になるんダよ。';
}
export function buildMbtiComment_KR(mbti, kanGogyo) {
  if (!mbti) return '';
  const trait = (kanGogyo === '水' || kanGogyo === '木') ? '감수성과 직감력이 돋보이는 개성'
              : kanGogyo === '火' ? '열정과 표현력이 두드러진 개성'
              : kanGogyo === '金' ? '의지의 강함과 미의식이 빛나는 개성'
                                  : '포용력과 안정감이 돋보이는 개성';
  return 'MBTI "' + mbti + '"와 명식이 겹치면, ' + trait + '이 돼요.';
}

// ── generatePopoAnswer 의 default 폴백 ──
export function buildDefaultAnswer_JA(q, kan, shi, kaku, ki, kj, duStr, duIsKi, duIsKj) {
  const NL = '\n';
  return '「' + q + '」について答えるンダよ🐼' + NL + NL +
    'あなたの命式（' + kan + shi + '日主・' + kaku + '）から見ると——' + NL +
    '喜神「' + ki + '」が流れてくる時期や場所・人に身を置くことが一番の開運のカギンダよ。' + NL +
    '忌神「' + kj + '」が強まる時期は無理せず守りに入って、喜神の時期に思い切り動く。' + NL +
    '今の大運「' + duStr + '」は' + (duIsKi ? '吉の流れンダ。今こそ動き時ンダよ🐼' : duIsKj ? '守りの時期ンダ。土台固めに集中するといいんダよ🐼' : '中立の流れンダ。着実に積み上げるといいんダよ🐼');
}
export function buildDefaultAnswer_KR(q, kan, shi, kaku, ki, kj, duStr, duIsKi, duIsKj) {
  const NL = '\n';
  return '"' + q + '"에 대해 답해 드릴게요🐼' + NL + NL +
    '당신의 명식(' + kan + shi + '일간・' + kaku + ')에서 보면——' + NL +
    '희신 "' + ki + '"이 흘러오는 시기나 장소・사람에 몸을 두는 것이 가장 큰 개운의 열쇠예요.' + NL +
    '기신 "' + kj + '"이 강해지는 시기는 무리하지 말고 수비에 들어가, 희신의 시기에 마음껏 움직이세요.' + NL +
    '지금의 대운 "' + duStr + '"은 ' + (duIsKi ? '길한 흐름이에요. 지금이야말로 움직일 때예요🐼' : duIsKj ? '수비의 시기예요. 토대 다지기에 집중하면 좋아요🐼' : '중립의 흐름이에요. 착실히 쌓아 올리면 좋아요🐼');
}

// ── 안내문구 (KR 모드 시 답변이 일부 일본어를 포함할 수 있다는 알림) ──
export const KR_NOTICE = '※ 일부 답변은 아직 일본어로 표시될 수 있어요🐼';
