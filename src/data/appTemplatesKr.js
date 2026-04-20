// ════════════════════════════════════════════════════════════════
// App.jsx の動的テンプレート（変数埋込の日本語）の JA/KR ペア
// 各関数は langPick(buildXxx_JA, buildXxx_KR, ...args) で使用
// ════════════════════════════════════════════════════════════════

// ── CURRENT PHASE カード・ポポスピーチ（App.jsx 行5592-5595） ──
export function buildCurrentPhaseSpeech_JA(duUnsei, duPhase, yrUnsei, yrPhase, duDesc, yrDesc, dayKan, dayGogyo, samePhase) {
  return `今のあなたは「${duUnsei}（${duPhase}）」の大運と「${yrUnsei}（${yrPhase}）」の流年が重なっているんダよ🐼` +
    ` ${duDesc}` +
    (samePhase ? ` 大運と流年が同じフェーズなので、このエネルギーが特に強く出ているんダ。` : ` 流年は「${yrDesc}」`) +
    ` 日主「${dayKan}（${dayGogyo}）」にとって、今はどう動くべきかのヒントがここに隠れているんダよ🐼`;
}
export function buildCurrentPhaseSpeech_KR(duUnsei, duPhase, yrUnsei, yrPhase, duDesc, yrDesc, dayKan, dayGogyo, samePhase) {
  return `지금의 당신은 "${duUnsei}(${duPhase})"의 대운과 "${yrUnsei}(${yrPhase})"의 유년이 겹치고 있어요🐼` +
    ` ${duDesc}` +
    (samePhase ? ` 대운과 유년이 같은 페이즈이기 때문에, 이 에너지가 특히 강하게 나타나고 있어요.` : ` 유년은 "${yrDesc}"`) +
    ` 일주 "${dayKan}(${dayGogyo})"에게 있어, 지금 어떻게 움직여야 할지의 힌트가 여기에 숨겨져 있어요🐼`;
}

// ── 上半期 popoText ──
export function buildH1Popo_JA(kan, shi, kakukyoku, kishinJoined) {
  return `上半期の運勢を${kan}${shi}日主・${kakukyoku}の命式で計算したンダよ🐼 喜神「${kishinJoined}」が強まる月がピークになるんダ。`;
}
export function buildH1Popo_KR(kan, shi, kakukyoku, kishinJoined) {
  return `상반기 운세를 ${kan}${shi}일간・${kakukyoku} 명식으로 계산했어요🐼 희신 "${kishinJoined}"이(가) 강해지는 달이 피크가 돼요.`;
}
// ── 下半期 popoText ──
export function buildH2Popo_JA(kan, shi, kijinJoined, kishinJoined) {
  return `下半期の運勢を${kan}${shi}日主の命式で計算したンダ🐼 忌神「${kijinJoined}」が強まる月は慎重に、喜神「${kishinJoined}」の月に動くと吉ンダよ。`;
}
export function buildH2Popo_KR(kan, shi, kijinJoined, kishinJoined) {
  return `하반기 운세를 ${kan}${shi}일간 명식으로 계산했어요🐼 기신 "${kijinJoined}"이(가) 강해지는 달은 신중하게, 희신 "${kishinJoined}"의 달에 움직이면 길해요.`;
}

// ── 日柱ヒント（命式テーブル下、行4594付近） ──
export function buildNichiPillarHint_JA(kan, shi) {
  return `日柱（${kan}${shi}）が「あなた自身」を表す最も重要な柱。天干・地支の五行色はその気の属性を示しているンダよ。`;
}
export function buildNichiPillarHint_KR(kan, shi) {
  return `일주(${kan}${shi})가 "당신 자신"을 나타내는 가장 중요한 기둥이에요. 천간・지지의 오행 색은 그 기의 속성을 나타내고 있어요.`;
}

// ── 通変星読解ポポ（行5087付近、全文ビルダー）──
// args: {top, top2, topCnt, top2Cnt, info1Icon, info2Icon, info1Detail, info2Detail, tieStarsParts, otherStarsParts, dayKan, dayGogyo}
function _fmtCount(n) { return n.toFixed(1).replace('.0',''); }
export function buildTsuhenseiReading_JA(args) {
  const { top, top2, topCnt, top2Cnt, info1Icon, info2Icon, info1Detail, info2Detail, tieStarsParts, otherStarsParts, dayKan, dayGogyo } = args;
  const tieNote = (tieStarsParts && tieStarsParts.length >= 3)
    ? ` また${tieStarsParts.join('・')}も同点で命式に存在しているンダ。`
    : (otherStarsParts && otherStarsParts.length > 0)
      ? ` ほかに${otherStarsParts.join('・')}も命式に出ているンダ。`
      : '';
  return `命式の通変星を全部読み解いたんダよ🐼` +
    ` 一番強く出ているのは「${info1Icon||''}${top}」（×${_fmtCount(topCnt)}）で、${info1Detail||''}` +
    (top2 ? ` 次に「${info2Icon||''}${top2}」（×${_fmtCount(top2Cnt)}）で、${info2Detail||''}` : '') +
    tieNote +
    ` 日主「${dayKan}（${dayGogyo}）」との関係でこのパターンが生まれているんダ。この組み合わせが、あなたの人生の流れの土台になっているんダよ🐼`;
}
export function buildTsuhenseiReading_KR(args) {
  const { top, top2, topCnt, top2Cnt, info1Icon, info2Icon, info1Detail, info2Detail, tieStarsParts, otherStarsParts, dayKan, dayGogyo } = args;
  const tieNote = (tieStarsParts && tieStarsParts.length >= 3)
    ? ` 또한 ${tieStarsParts.join('・')}도 동점으로 명식에 존재하고 있어요.`
    : (otherStarsParts && otherStarsParts.length > 0)
      ? ` 그 외에 ${otherStarsParts.join('・')}도 명식에 나와 있어요.`
      : '';
  return `명식의 통변성을 모두 읽어봤어요🐼` +
    ` 가장 강하게 나타나는 것은 "${info1Icon||''}${top}"(×${_fmtCount(topCnt)})로, ${info1Detail||''}` +
    (top2 ? ` 다음으로 "${info2Icon||''}${top2}"(×${_fmtCount(top2Cnt)})로, ${info2Detail||''}` : '') +
    tieNote +
    ` 일간 "${dayKan}(${dayGogyo})"과의 관계에서 이 패턴이 생겨나고 있어요. 이 조합이, 당신의 인생 흐름의 토대가 되고 있어요🐼`;
}

// ── 十二運星 読解ポポ（行5257付近・全文） ──
export function buildJuniunseiReading_JA(dayUnsei, descD, moUnsei, descM, dayKan, dayGogyo, energyD) {
  const typeText = energyD >= 8
    ? 'エネルギーが強く自分の力で道を切り開けるタイプ'
    : energyD >= 5
      ? '内に力を蓄えながら着実に進んでいくタイプ'
      : '変化や転換を経て深みを増していくタイプ';
  return `十二運星で命式を読み解いたんダよ🐼 日柱（あなた自身）は「${dayUnsei}」ンダ。${descD || ''}` +
    ` 月柱（社会・仕事）は「${moUnsei}」で、${descM || ''}` +
    ` 日主「${dayKan}（${dayGogyo}）」と組み合わせると、${typeText}ンダよ🐼`;
}
export function buildJuniunseiReading_KR(dayUnsei, descD, moUnsei, descM, dayKan, dayGogyo, energyD) {
  const typeText = energyD >= 8
    ? '에너지가 강해 자신의 힘으로 길을 개척할 수 있는 타입'
    : energyD >= 5
      ? '내면에 힘을 쌓으며 착실하게 나아가는 타입'
      : '변화나 전환을 거쳐 깊이를 더해가는 타입';
  return `십이운성으로 명식을 읽어봤어요🐼 일주(당신 자신)는 "${dayUnsei}"이에요. ${descD || ''}` +
    ` 월주(사회・일)는 "${moUnsei}"이고, ${descM || ''}` +
    ` 일간 "${dayKan}(${dayGogyo})"와(과) 조합하면, ${typeText}이에요🐼`;
}

// ── 五行バランス 最強型 説明（行4825付近） ──
export function buildGogyoDominant_JA(nGogyo, dominantRatio) {
  return `あなたの命式は「${nGogyo}」のエネルギーが全体の${Math.round(dominantRatio * 100)}%以上を占める特別な型ンダ。`;
}
export function buildGogyoDominant_KR(nGogyo, dominantRatio) {
  return `당신의 명식은 "${nGogyo}"의 에너지가 전체의 ${Math.round(dominantRatio * 100)}% 이상을 차지하는 특별한 형태예요.`;
}

// ── 五行 vals データ（trait/weak/supply 多言語） ──
export const GOGYO_VALS_TEXT_JA = {
  水: { trait:'直感力・柔軟性・知性が高い。流れに乗る力が強く、環境に応じて自在に形を変えられる。', weak:'水が少ないと、直感が鈍く固執しやすくなる傾向があるんダ。', supply:'水を補うには、北方位・黒・夜・冬・水辺が吉ンダよ。' },
  火: { trait:'表現力・情熱・華やかさ。行動力があり、まわりを巻き込む熱量を持っているんダ。', weak:'火が少ないと、自己表現が苦手で引っ込み思案になりやすいんダ。', supply:'火を補うには、南方位・赤・昼・夏・明るい場所が吉ンダよ。' },
  土: { trait:'安定感・誠実さ・信頼性。地に足がついた判断力と、人を支える包容力があるんダ。', weak:'土が少ないと、根気がなく気持ちが安定しにくい傾向があるんダ。', supply:'土を補うには、中央・黄・午後・土用・山や大地が吉ンダよ。' },
  木: { trait:'成長・創造・柔軟性。新しいことへの好奇心と、しなやかに伸びていく力があるんダ。', weak:'木が少ないと、発想が固まりやすく新しいことへの踏み出しが遅くなりやすいんダ。', supply:'木を補うには、東方位・緑・朝・春・植物のある場所が吉ンダよ。' },
  金: { trait:'意志の強さ・鋭さ・美意識。妥協しない精神と、物事を整える力があるんダ。', weak:'金が少ないと、決断力が鈍く優柔不断になりやすい傾向があるんダ。', supply:'金を補うには、西方位・白・夕・秋・金属・鉱物が吉ンダよ。' },
};
export const GOGYO_VALS_TEXT_KR = {
  水: { trait:'직관력・유연성・지성이 높아요. 흐름에 올라타는 힘이 강하고, 환경에 따라 자유자재로 형태를 바꿀 수 있어요.', weak:'수가 적으면, 직관이 둔해지고 고집스러워지기 쉬운 경향이 있어요.', supply:'수를 보충하려면, 북쪽・검정・밤・겨울・물가가 길해요.' },
  火: { trait:'표현력・열정・화려함. 행동력이 있고, 주변을 끌어들이는 열량을 가지고 있어요.', weak:'화가 적으면, 자기 표현이 서툴러 내성적이 되기 쉬워요.', supply:'화를 보충하려면, 남쪽・빨강・낮・여름・밝은 장소가 길해요.' },
  土: { trait:'안정감・성실함・신뢰성. 땅에 발을 딛고 있는 판단력과, 사람을 지지하는 포용력이 있어요.', weak:'토가 적으면, 끈기가 없고 마음이 안정되기 어려운 경향이 있어요.', supply:'토를 보충하려면, 중앙・노랑・오후・토용・산이나 대지가 길해요.' },
  木: { trait:'성장・창조・유연성. 새로운 것에 대한 호기심과, 유연하게 뻗어나가는 힘이 있어요.', weak:'목이 적으면, 발상이 굳어지기 쉽고 새로운 것에 대한 한 발이 늦어지기 쉬워요.', supply:'목을 보충하려면, 동쪽・초록・아침・봄・식물이 있는 장소가 길해요.' },
  金: { trait:'의지의 강함・날카로움・미의식. 타협하지 않는 정신과, 사물을 정리하는 힘이 있어요.', weak:'금이 적으면, 결단력이 둔해져 우유부단해지기 쉬운 경향이 있어요.', supply:'금을 보충하려면, 서쪽・흰색・저녁・가을・금속・광물이 길해요.' },
};
export function getGogyoValsTextByLang(lang) {
  return lang === 'kr' ? GOGYO_VALS_TEXT_KR : GOGYO_VALS_TEXT_JA;
}

// ── 五行 roleLabel ──
export function gogyoRoleLabel_JA(idx, item, sortedTopLabel, kishin, isMin, rel, clash) {
  if (idx === 0) return 'あなたの核となる個性';
  if (item.val === 0) return kishin.includes(item.label) ? '補うと運気アップ（喜神）' : '補いたいエネルギー';
  if (kishin.includes(item.label)) return '喜神 — 追い風の気';
  if (isMin) return kishin.includes(item.label) ? '補うと運気アップ（喜神）' : '補いたいエネルギー';
  if (rel)   return `${sortedTopLabel}を支える相生の気`;
  if (clash) return `${sortedTopLabel}と対立しやすい気`;
  return 'バランスの取れたエネルギー';
}
export function gogyoRoleLabel_KR(idx, item, sortedTopLabel, kishin, isMin, rel, clash) {
  if (idx === 0) return '당신의 핵심이 되는 개성';
  if (item.val === 0) return kishin.includes(item.label) ? '보충하면 운기 상승 (희신)' : '보충하고 싶은 에너지';
  if (kishin.includes(item.label)) return '희신 — 순풍의 기';
  if (isMin) return kishin.includes(item.label) ? '보충하면 운기 상승 (희신)' : '보충하고 싶은 에너지';
  if (rel)   return `${sortedTopLabel}을(를) 지원하는 상생의 기`;
  if (clash) return `${sortedTopLabel}과(와) 대립하기 쉬운 기`;
  return '균형 잡힌 에너지';
}

// ── 五行 cardDesc ──
export function gogyoCardDesc_JA(item, idx, sortedTopLabel, rel, clash) {
  const t = (GOGYO_VALS_TEXT_JA[item.label] || {});
  if (item.val === 0) return t.supply;
  if (idx === 0) return t.trait;
  if (rel)   return t.trait + ` ${sortedTopLabel}と${item.label}は相生の関係なので、この2つが高いとエネルギーが自然に循環するんダ。`;
  if (clash) return t.trait + ` ただし${sortedTopLabel}と${item.label}は相剋の関係にあるため、バランスに注意ンダよ。`;
  if (item.val <= 1.5) return t.weak + ' ' + t.supply;
  return t.trait;
}
export function gogyoCardDesc_KR(item, idx, sortedTopLabel, rel, clash) {
  const t = (GOGYO_VALS_TEXT_KR[item.label] || {});
  if (item.val === 0) return t.supply;
  if (idx === 0) return t.trait;
  if (rel)   return t.trait + ` ${sortedTopLabel}과(와) ${item.label}은(는) 상생의 관계이기 때문에, 이 둘이 높으면 에너지가 자연스럽게 순환해요.`;
  if (clash) return t.trait + ` 다만 ${sortedTopLabel}과(와) ${item.label}은(는) 상극의 관계에 있기 때문에, 균형에 주의해야 해요.`;
  if (item.val <= 1.5) return t.weak + ' ' + t.supply;
  return t.trait;
}

// ── 格局 narrative kkDesc ──
export function buildKakukyokuDescJuou_JA(nGogyo, dominantRatio, kiStr, kjStr, seasons) {
  return `あなたの命式は「${nGogyo}」のエネルギーが全体の${Math.round(dominantRatio*100)}%以上を占める特別な型ンダ。`
    +`${nGogyo}の気に逆らうより「${nGogyo}らしく」生きることで本来の力が最大になるんダよ。`
    +`喜神の「${kiStr}」が流れてくる${seasons||'時期'}は特に追い風ンダ。`
    +`逆に忌神の「${kjStr}」が強まる時期は無理をしないことが大切ンダ🐼`;
}
export function buildKakukyokuDescJuou_KR(nGogyo, dominantRatio, kiStr, kjStr, seasons) {
  return `당신의 명식은 "${nGogyo}"의 에너지가 전체의 ${Math.round(dominantRatio*100)}% 이상을 차지하는 특별한 형태예요. `
    +`${nGogyo}의 기에 거스르기보다 "${nGogyo}답게" 사는 것으로 본래의 힘이 최대가 돼요. `
    +`희신 "${kiStr}"이(가) 흘러오는 ${seasons||'시기'}는 특히 순풍이에요. `
    +`반대로 기신 "${kjStr}"이(가) 강해지는 시기는 무리하지 않는 것이 중요해요🐼`;
}
export function buildKakukyokuDescNormal_JA(top, topV, kiStr, bot, botV, lucky) {
  return `あなたの命式は5つの五行がバランスよく分布している「普通格局」ンダ。`
    +`中でも「${top}」が最も強く（${topV}点）、あなたの個性の核になっているんダよ。`
    +`喜神の「${kiStr}」の流れが来る時期・場所・人が最大の追い風になるんダ。`
    +`逆に「${bot}」は最も少ないエネルギーで（${botV}点）、ここを補う${lucky}を意識すると運気が安定するんダよ🐼`;
}
export function buildKakukyokuDescNormal_KR(top, topV, kiStr, bot, botV, lucky) {
  return `당신의 명식은 5가지 오행이 균형 있게 분포된 "보통격국"이에요. `
    +`그 중에서도 "${top}"이(가) 가장 강하고(${topV}점), 당신의 개성의 핵이 되고 있어요. `
    +`희신 "${kiStr}"의 흐름이 오는 시기・장소・사람이 가장 큰 순풍이 돼요. `
    +`반대로 "${bot}"은(는) 가장 적은 에너지로(${botV}점), 이를 보충하는 ${lucky}을(를) 의식하면 운기가 안정돼요🐼`;
}

// ── 喜神/忌神 desc lines ──
export const KI_INFO_KR = {
  木:{season:'봄・아침',dir:'동',color:'초록・파랑',obj:'식물・목제품',lucky:'목・초록 장소'},
  火:{season:'여름・낮',dir:'남',color:'빨강・주황',obj:'밝은 장소・불꽃',lucky:'화・밝은 장소'},
  土:{season:'토용・오후',dir:'중앙',color:'노랑・갈색',obj:'토지・산',lucky:'토・산・대지'},
  金:{season:'가을・저녁',dir:'서',color:'흰색・금속',obj:'금속・광석',lucky:'금・금속・흰색'},
  水:{season:'겨울・밤',dir:'북',color:'검정・남색',obj:'물가・강',lucky:'수・검정・밤'},
};
export function buildKiDescTail_KR() { return '\n이(가) 길해요.'; }
export function buildKjDescTail_KR() { return '\n의 방위・시간대는 소모되기 쉬워요.'; }

// ── 大運 詳細解説 (curDaiun detail block) ──
export function buildDaiunKanRel_JA(kan, dKanG, nG, type) {
  if (type === 'sei')   return `天干「${kan}（${dKanG}）」があなたの日主「${nG}」を生む相生の関係ンダ。`;
  if (type === 'koku')  return `天干「${kan}（${dKanG}）」があなたの日主「${nG}」を剋す相剋の関係ンダ。`;
  if (type === 'same')  return `天干「${kan}（${dKanG}）」があなたの日主と同じ五行ンダ。`;
  return `天干「${kan}（${dKanG}）」の${dKanG}の気が流れる時期ンダ。`;
}
export function buildDaiunKanRel_KR(kan, dKanG, nG, type) {
  if (type === 'sei')   return `천간 "${kan}(${dKanG})"이(가) 당신의 일간 "${nG}"을(를) 낳는 상생의 관계예요.`;
  if (type === 'koku')  return `천간 "${kan}(${dKanG})"이(가) 당신의 일간 "${nG}"을(를) 극하는 상극의 관계예요.`;
  if (type === 'same')  return `천간 "${kan}(${dKanG})"이(가) 당신의 일간과 같은 오행이에요.`;
  return `천간 "${kan}(${dKanG})"의 ${dKanG}의 기가 흐르는 시기예요.`;
}
export function buildDaiunShiRel_JA(shi, dShiG) { return `地支「${shi}（${dShiG}）」の影響も加わるんダ。`; }
export function buildDaiunShiRel_KR(shi, dShiG) { return `지지 "${shi}(${dShiG})"의 영향도 더해져요.`; }

export function buildDaiunFeature_JA(g, ki, kj, isKi, isKj) {
  if (isKi) return `「${g}」の気があなたの喜神（${ki}）に一致する「喜神期」ンダ。実力が外に出やすく、行動したことが結果につながりやすい時期ンダよ。`;
  if (isKj) return `「${g}」の気があなたの忌神（${kj}）に一致する「忌神期」ンダ。慎重に動くことで消耗を防げるんダよ。`;
  return `五行的には中立の時期ンダ。特別な追い風も逆風もないので、自分のペースで着実に動くのが吉ンダよ。`;
}
export function buildDaiunFeature_KR(g, ki, kj, isKi, isKj) {
  if (isKi) return `"${g}"의 기가 당신의 희신(${ki})과 일치하는 "희신기"예요. 실력이 밖으로 나오기 쉽고, 행동한 것이 결과로 이어지기 쉬운 시기예요.`;
  if (isKj) return `"${g}"의 기가 당신의 기신(${kj})과 일치하는 "기신기"예요. 신중하게 움직임으로써 소모를 막을 수 있어요.`;
  return `오행적으로는 중립의 시기예요. 특별한 순풍도 역풍도 없기 때문에, 자신의 페이스로 착실하게 움직이는 것이 길해요.`;
}
export function buildDaiunWork_JA(isKi, isKj) {
  if (isKi) return '実績を積み上げるのに最適な時期ンダ。アイデアや提案が通りやすく、新しいことを始めるにも良い大運ンダよ。';
  if (isKj) return '大きな賭けや転職など、リスクの高い動きは一段落してから行うのが吉ンダ。地道な積み上げを続けてほしいんダよ。';
  return '着実に積み上げることが重要な時期ンダ。焦らず自分の専門性を深めていくといい大運ンダよ。';
}
export function buildDaiunWork_KR(isKi, isKj) {
  if (isKi) return '실적을 쌓아 올리기에 최적의 시기예요. 아이디어나 제안이 통하기 쉽고, 새로운 것을 시작하기에도 좋은 대운이에요.';
  if (isKj) return '큰 도박이나 이직 등, 리스크가 높은 움직임은 일단락된 후에 하는 것이 길해요. 꾸준한 축적을 계속해 주세요.';
  return '착실하게 쌓아 올리는 것이 중요한 시기예요. 서두르지 말고 자신의 전문성을 깊게 하면 좋은 대운이에요.';
}
export function buildDaiunLove_JA(isSeiOrShi, isKokuOrShi) {
  if (isSeiOrShi) return '縁が深まりやすく、出会い・関係の進展に追い風の時期ンダ。積極的に動くといい結果が出やすいんダよ。';
  if (isKokuOrShi) return '感情の波が大きくなりやすい時期ンダ。焦らず、じっくりと相手を見極めることが大切ンダよ。';
  return '恋愛は安定した時期ンダ。日常の積み重ねを大切にすると、関係が深まっていくんダよ。';
}
export function buildDaiunLove_KR(isSeiOrShi, isKokuOrShi) {
  if (isSeiOrShi) return '인연이 깊어지기 쉽고, 만남・관계의 진전에 순풍의 시기예요. 적극적으로 움직이면 좋은 결과가 나오기 쉬워요.';
  if (isKokuOrShi) return '감정의 파도가 커지기 쉬운 시기예요. 서두르지 말고, 천천히 상대를 파악하는 것이 중요해요.';
  return '연애는 안정된 시기예요. 일상의 축적을 소중히 하면, 관계가 깊어져요.';
}
export function buildDaiunCaution_JA(isKj, kj, kjSeasons, isDoShi, shi) {
  if (isKj) return `忌神（${kj}）が強まる時期なので、${kjSeasons||'消耗しやすい時期'}は無理をしないことが特に大切ンダ。`;
  if (isDoShi) return `地支「${shi}（土）」が含まれるため、土旺の時期（土用・年末年始）は体調管理に注意ンダ。`;
  return '大きな問題はないが、大運の切り替わりの前後1〜2年はエネルギーの変化期。無理な行動は避けてほしいんダよ。';
}
export function buildDaiunCaution_KR(isKj, kj, kjSeasons, isDoShi, shi) {
  if (isKj) return `기신(${kj})이 강해지는 시기이기 때문에, ${kjSeasons||'소모되기 쉬운 시기'}는 무리하지 않는 것이 특히 중요해요.`;
  if (isDoShi) return `지지 "${shi}(토)"가 포함되어 있기 때문에, 토왕의 시기(토용・연말연시)는 컨디션 관리에 주의해야 해요.`;
  return '큰 문제는 없지만, 대운의 전환 전후 1~2년은 에너지의 변화기. 무리한 행동은 피해주세요.';
}
// 大運詳細 행 라벨
export function buildDaiunDetailLabels_KR() {
  return { daiun: '대운', kankei: '관계', tokucho: '특징', shigoto: '일', renai: '연애', chui: '주의', curHeader: (from, to) => `현재 대운 (${from}~${to}세)에 대해` };
}

// ── 大運 popo speech (5731+) maps & body builder ──
export const DAIUN_WHAT_KR = {'木':'성장・배움・도전','火':'열정・행동・표현','土':'안정・축적・인간관계','金':'결단・정리・질을 높이는 것','水':'지혜・내성・감수성'};
export const DAIUN_SCENE_KR = {'木':'스킬을 갈고닦고・새로운 것에 도전하고・경험을 쌓는 것','火':'적극적으로 발신하고・인맥을 넓히고・열정적으로 움직이는 것','土':'인간관계를 키우고・꾸준히 쌓아 올리고・생활 기반을 정비하는 것','金':'불필요한 것을 놓아주고・본질을 간파하고・질 높은 환경을 만드는 것','水':'깊이 배우고・자신과 마주하고・직감을 갈고닦는 것'};
export const DAIUN_RISK_KR = {'木':'서둘러 성과를 추구하면 뿌리가 얕은 채로 뻗으려다 부러지기 쉬워져요','火':'행동력은 있어도 지속하기 어려워, 다 타버려 다음으로 이어지지 않게 되기 쉬워요','土':'변화를 너무 싫어하면 정체되어, 다음 순풍을 타지 못하게 돼요','金':'완벽을 너무 추구하거나 관계를 너무 잘라내면 고립되기 쉬워요','水':'너무 생각하다 움직이지 못하거나 감정에 너무 휩쓸리면 축을 잃어요'};
export const DAIUN_KIDO_KR = {'木':'지금 뿌린 씨앗(스킬・경험・도전)이 다음 대운에서 큰 나무로 자라요','火':'지금 태운 열정의 여열이 다음 대운에서 사람을 움직이는 힘이 돼요','土':'지금 다진 토대(신뢰・습관・기반)가 다음 대운을 지지하는 초석이 돼요','金':'지금 갈고닦은 자신의 핵(판단력・본질)이 다음 대운에서 무기가 돼요','水':'지금 깊게 한 지혜와 통찰이 다음 대운에서 흐름을 읽는 힘이 돼요'};
export const DAIUN_DOBASE_KR = {'木':'서둘러 성과를 내려 하지 말고, 오래 쓸 수 있는 스킬을 하나하나 정성껏 익히는 것','火':'다 타버리지 않도록 정기적으로 휴식을 취하고, 열정을 지속시키는 시스템을 만드는 것','土':'한편으로 성급하게 너무 바꾸지 말고, 지금의 환경 속에서 신뢰를 쌓는 것','金':'완벽하지 않아도 되는 장면을 간파하고, 정말 중요한 것에만 집중하는 것','水':'감정에 휩쓸릴 것 같을 때일수록 멈춰서서, 자신의 축을 확인하는 습관을 가지는 것'};
export const DAIUN_DOACT_KR = {'木':'새로운 것에 도전한다・스킬을 갈고닦는다・지금까지 망설였던 것에 발을 내디딘다','火':'아이디어를 발신한다・인맥을 넓힌다・열정을 가지고 움직일 수 있는 분야를 전력으로 한다','土':'인간관계를 정성껏 키운다・차근차근 쌓아 올린다・생활의 기반을 정비한다','金':'불필요한 것을 놓아준다・정말 하고 싶은 것을 선택한다・질 높은 환경을 정비한다','水':'깊이 배운다・사람과 진지하게 마주한다・자신의 직감을 갈고닦는다'};
export const DAIUN_DOSLOW_KR = {'木':'서두르지 않고 계속 배우는 것. 어떤 작은 성장도 다음 큰 비약의 씨앗이 되고 있어요','火':'열정을 가지면서도 다 타지 않을 페이스를 지키는 것. 지속이 가장 큰 무기가 되는 시기예요','土':'인간관계와 생활의 기반을 정성껏 정비하는 것. 지금 쌓은 신뢰가 다음 대운에서 최대의 자산이 돼요','金':'정말 소중한 것과 불필요한 것을 간파하는 시기예요. 놓아준 만큼 다음 대운에서 가볍게 움직일 수 있어요','水':'깊게 생각하는 것을 두려워하지 않는 것. 이 시기의 통찰과 내성이 다음 대운에서 직감으로 작용해요'};

export function buildDaiunBodyKi_KR(cName, period, cKG, isSei, isHiwa, myG) {
  const NL = '\n';
  const boost = isSei ? `당신의 일간 "${myG}"이(가) 이 대운의 오행에 의해 살아나는 형태로, 특히 힘이 끌어내져지기 쉬운 상태예요.` : isHiwa ? `당신의 일간 "${myG}"과 같은 기가 흐르고 있어, 자신다움이 최대한 발휘되기 쉬운 시대예요.` : `당신의 명식에 있어 순풍의 기가 흐르고 있어, 움직인 만큼 결과가 따라오는 시대예요.`;
  return `지금의 대운 "${cName}(${period})"은(는) 당신에게 명식적인 순풍이 부는 시대예요🌟` + NL + NL + `이 대운은 "${DAIUN_WHAT_KR[cKG]||cKG}"의 기가 흐르고 있어, ${DAIUN_SCENE_KR[cKG]||cKG+'에 관한 것'}이(가) 점점 결실을 맺기 쉬운 상태예요. ${boost}` + NL + NL + `【지금 이 시기에 해야 할 것】` + NL + (DAIUN_DOACT_KR[cKG]||'자신답게 움직이는 것') + NL + NL + `이런 시기에 움직인 양이, 인생의 전환점이 돼요🐼`;
}
export function buildDaiunBodyKj_KR(cName, period, cKG, kj, isKoku, myG) {
  const NL = '\n';
  const myRelation = isKoku ? `"${kj}"의 기가 당신의 "${myG}"과 충돌하는 관계에 있어` : `당신의 명식이 어려워하는 "${kj}"의 기가 대운에 흐르고 있어`;
  return `지금의 대운 "${cName}(${period})"은(는), ${myRelation}, 에너지가 소모되기 쉬운 시기에 들어가 있어요🐼` + NL + NL + `이 대운에는 "${DAIUN_WHAT_KR[cKG]||cKG}"의 기가 흐르고 있지만, 당신의 명식에 있어서는 역풍이 되는 기예요. 무리하게 계속 공격하면 소모되고, 서두르면 서두를수록 결과가 나오기 어려워져요——그런 구조로 되어 있어요.` + NL + NL + `【왜 신중함이 필요한가】` + NL + (DAIUN_RISK_KR[cKG]||'무리하게 너무 움직이면 나중에 큰 반동이 오기 쉬워요') + `요. 이 시기에 힘으로 누르려 하면, 나중에 큰 반동이 오기 쉬워요.` + NL + NL + `【토대를 다진다는 것은 구체적으로 무엇인가】` + NL + (DAIUN_DOBASE_KR[cKG]||'지금 할 수 있는 것을 정성껏 해내는 것') + `이에요.` + NL + NL + (DAIUN_KIDO_KR[cKG]||'지금의 축적이 다음 대운에서 살아나요') + `요.`;
}
export function buildDaiunBodyNeutral_KR(cName, period, cKG, isSei, isHiwa, myG) {
  const NL = '\n';
  const neutralTone = isSei ? `당신의 일간 "${myG}"과는 상생의 관계에 있어, 조용히 지지해주는 듯한 흐름이에요.` : isHiwa ? `당신의 일간 "${myG}"과 같은 종류의 기가 흐르고 있어, 편안하지만 변화는 적은 시대예요.` : `순풍도 역풍도 아닌, 실력을 쌓아 올리기 위한 조용한 시기예요.`;
  return `지금의 대운 "${cName}(${period})"은(는), ${neutralTone}` + NL + NL + `이 대운에는 "${DAIUN_WHAT_KR[cKG]||cKG}"의 기가 흐르고 있어, 두드러진 성과는 나오기 어려울지도 모르지만, ${DAIUN_SCENE_KR[cKG]||'꾸준한 축적'}에 임하는 것이 나중에 큰 힘이 되는 시대예요🐼` + NL + NL + `【이 시기의 올바른 움직임 방식】` + NL + (DAIUN_DOSLOW_KR[cKG]||'차근차근 쌓아 올리는 것에 집중하는 것') + `이에요.` + NL + NL + (DAIUN_KIDO_KR[cKG]||'지금의 축적이 다음 대운에서 살아나요') + `요.`;
}
export function buildDaiunNextMsg_KR(nName, nPeriod, type) {
  const NL = '\n';
  const head = NL + NL + `【다음 대운 "${nName}(${nPeriod})"에 대해】` + NL;
  if (type === 'ki') return head + `다음은 희신의 기가 흐르는 순풍의 대운이에요🌟 지금 이 시기에 확실히 토대를 만들어 두는 만큼, 다음 대운에서 단번에 꽃피워요. 오늘 하고 있는 것은, 모두 미래의 자신에 대한 투자예요🐼`;
  if (type === 'kj') return head + `다음 대운도 역풍의 기가 계속돼요. 그러므로 지금부터 "소모되지 않는 시스템"을 만드는 것이 중요해요. 자신을 지키는 선택을 쌓아가는 것이, 긴 안목으로 본 최대의 개운이 돼요🐼`;
  return head + `다음 대운은 중립의 흐름이에요. 지금 시기에 얼마나 쌓아 올릴 수 있는지가, 다음 대운의 질을 결정해요. 서두르지 말고, 그러나 확실히——그것이 지금의 자신이 할 수 있는 가장 좋은 움직임이에요🐼`;
}
export function buildDaiunFallback_KR() { return '당신의 대운의 흐름을 읽어보고 있어요🐼'; }
export function buildDaiunCheckingFallback_KR() { return '당신의 대운을 확인하고 있어요🐼'; }

// ── 五行相生・対立のショートラベル（行4720付近） ──
export function buildGogyoSupportLabel_JA(label) {
  return `${label}を支える相生の気`;
}
export function buildGogyoSupportLabel_KR(label) {
  return `${label}을(를) 지원하는 상생의 기`;
}
export function buildGogyoConflictLabel_JA(label) {
  return `${label}と対立しやすい気`;
}
export function buildGogyoConflictLabel_KR(label) {
  return `${label}과(와) 대립하기 쉬운 기`;
}

// ── 日運 恋愛 詳細コメント（行5355+の各条件分岐）──
export function buildLoveShigouDay_JA(DL, kanshi) {
  return `${DL}「${kanshi}」は、あなたの命式にとって特別な日ンダ。日支の支合が成立しているから、配偶者宮——つまり「縁を引き寄せる扉」が開いている状態なんダよ。運命的な出会いとか、ずっと言えなかった気持ちを伝えるとか、そういう動きが今日は命式に後押しされているんダ。「なんとなく今日じゃなくていいか」って思う気持ちがあっても、今日動いた方がいいんダよ。後回しにしてきたことを、今日一つだけ動かしてみてほしいんダ🐼`;
}
export function buildLoveShigouDay_KR(DL, kanshi) {
  return `${DL} "${kanshi}"은(는) 당신의 명식에 있어 특별한 날이에요. 일지의 지지합이 성립되어 있어, 배우자궁—즉 "인연을 끌어당기는 문"이 열려 있는 상태예요. 운명적인 만남이나, 오랫동안 말하지 못했던 마음을 전하는 것 같은 움직임이 오늘은 명식에 의해 지지를 받고 있어요. "왠지 오늘이 아니어도 괜찮겠지"라는 마음이 있더라도, 오늘 움직이는 편이 좋아요. 미뤄왔던 것 하나만이라도 오늘 움직여보길 바라요🐼`;
}

export function buildLoveSeikanDay_JA(kanshi, DL) {
  return `「${kanshi}」${DL}は「正官」の星が立っているんダ。正官は地位・誠実さ・真剣な縁を表す星で、恋愛でいうと「本物の縁が動く」日なんダよ。軽い出会いより、長く続くような深い関係が結ばれやすい。${DL}出会った人や、${DL}深まった関係は、あとから振り返ったとき「あの日が転機だった」と思うような意味を持つことが多いんダよ。真剣な気持ちがあるなら、${DL}それを行動に変えてみてほしいんダ🐼`;
}
export function buildLoveSeikanDay_KR(kanshi, DL) {
  return `"${kanshi}" ${DL}은(는) "정관"의 별이 떠 있어요. 정관은 지위・성실함・진지한 인연을 나타내는 별로, 연애에서는 "진짜 인연이 움직이는" 날이에요. 가벼운 만남보다 오래 이어질 깊은 관계가 맺어지기 쉬워요. ${DL} 만난 사람이나 ${DL} 깊어진 관계는, 나중에 돌이켜봤을 때 "그 날이 전환점이었다"고 생각할 만한 의미를 가지는 경우가 많아요. 진지한 마음이 있다면 ${DL} 그것을 행동으로 옮겨보길 바라요🐼`;
}

export function buildLoveShokujinDay_JA(DL, kanshi, js) {
  return `${DL}「${kanshi}」日は「${js}」の星が立っていて、あなたの感性や表現力が自然に輝く日ンダ。恋愛は技術じゃなくて「その人らしさ」で動くんダよ。${DL}は無理に計算しなくていい。ただ素直に、感じたことを言葉や態度で出してみてほしいんダ。あなたの「ありのまま」が一番の武器になる日なんダよ。気になる相手がいるなら、今日の自分を見せてみてほしいんダ🐼`;
}
export function buildLoveShokujinDay_KR(DL, kanshi, js) {
  return `${DL} "${kanshi}"날은 "${js}"의 별이 떠 있어서, 당신의 감성이나 표현력이 자연스럽게 빛나는 날이에요. 연애는 기술이 아니라 "그 사람다움"으로 움직이는 거예요. ${DL}은(는) 무리하게 계산하지 않아도 돼요. 그냥 솔직하게, 느낀 것을 말이나 태도로 표현해 보길 바라요. 당신의 "있는 그대로"가 가장 큰 무기가 되는 날이에요. 신경 쓰이는 상대가 있다면, 오늘의 자신을 보여줘 보길 바라요🐼`;
}

export function buildLoveHenzaiDay_JA(kanshi, DL) {
  return `「${kanshi}」${DL}は「偏財」の星ンダ。偏財は行動力と異性縁を同時に持つ星で、待っていても縁は来なくて、動いた人に縁が引き寄せられる日なんダよ。気になる相手への連絡、新しい場所への外出、普段と違う行動——${DL}は「動いたもの勝ち」の日ンダ。好奇心のままに動いてみてほしいんダよ🐼`;
}
export function buildLoveHenzaiDay_KR(kanshi, DL) {
  return `"${kanshi}" ${DL}은(는) "편재"의 별이에요. 편재는 행동력과 이성 인연을 동시에 가진 별로, 기다리고만 있어서는 인연이 오지 않고, 움직인 사람에게 인연이 끌리는 날이에요. 신경 쓰이는 상대에게 연락, 새로운 장소로의 외출, 평소와 다른 행동——${DL}은(는) "움직인 사람이 이기는" 날이에요. 호기심이 가는 대로 움직여 보길 바라요🐼`;
}

export function buildLoveRokuchuuDay_JA(DL, kanshi) {
  return `${DL}「${kanshi}」日は、あなたの日支と六冲の関係にあるんダ。六冲というのは「エネルギーが真正面からぶつかる」状態で、感情が揺れやすく、言葉が意図と違う方向に伝わってしまうことがあるんダよ。大事な告白や、感情的になりそうな話し合いは${DL}じゃない方がいいんダ。${DL}は相手の言葉を真に受けすぎず、自分の気持ちをいったん落ち着かせることに使ってほしいんダよ🐼`;
}
export function buildLoveRokuchuuDay_KR(DL, kanshi) {
  return `${DL} "${kanshi}"날은 당신의 일지와 육충의 관계에 있어요. 육충이란 "에너지가 정면으로 부딪히는" 상태로, 감정이 흔들리기 쉽고, 말이 의도와 다른 방향으로 전달되는 경우가 있어요. 중요한 고백이나 감정적으로 될 것 같은 대화는 ${DL}이 아닌 편이 좋아요. ${DL}은(는) 상대의 말을 너무 진지하게 받아들이지 않고, 자신의 감정을 일단 진정시키는 데 사용하길 바라요🐼`;
}

export function buildLoveHighScoreDay_JA(kanshi, DL, kiH, ki) {
  return `「${kanshi}」${DL}は恋愛運が高めの日ンダ。${kiH ? `喜神「${ki}」の流れが天干に乗っていて、命式全体に追い風が吹いているんダよ。` : ''}恋愛は「タイミング」で動くことがとても多いんダ。${DL}は命式がそのタイミングをくれているから、気になっていること・気になっている相手に対して、一歩踏み出してほしいんダよ🐼`;
}
export function buildLoveHighScoreDay_KR(kanshi, DL, kiH, ki) {
  return `"${kanshi}" ${DL}은(는) 연애운이 높은 날이에요. ${kiH ? `희신 "${ki}"의 흐름이 천간에 타고 있어, 명식 전체에 순풍이 불고 있어요. ` : ''}연애는 "타이밍"으로 움직이는 경우가 정말 많아요. ${DL}은(는) 명식이 그 타이밍을 주고 있으니, 신경 쓰이는 일이나 신경 쓰이는 상대에 대해, 한 걸음 내디뎌 보길 바라요🐼`;
}
export function buildLoveMidScoreDay_JA(kanshi, DL) {
  return `「${kanshi}」${DL}の恋愛運は穏やかな流れンダ。大きな動きより、今ある関係を丁寧に育てることに向いている日なんだよ。好きな人がいるなら、派手なアクションより「相手が嬉しいと思う小さなこと」を一つやってみてほしいんダ。そういう積み重ねが、長い目で見たとき本物の縁を育てていくんだよ🐼`;
}
export function buildLoveMidScoreDay_KR(kanshi, DL) {
  return `"${kanshi}" ${DL}의 연애운은 잔잔한 흐름이에요. 큰 움직임보다는, 지금의 관계를 세심하게 키우는 것이 적합한 날이에요. 좋아하는 사람이 있다면, 화려한 액션보다 "상대가 기뻐할 만한 작은 일"을 하나 해보길 바라요. 그런 누적이 긴 안목으로 봤을 때 진짜 인연을 키워가는 거예요🐼`;
}
export function buildLoveLowScoreDay_JA(DL, kanshi) {
  return `${DL}「${kanshi}」日は、命式的に恋愛への後押しが弱い日ンダ。これは「縁がない」ということじゃなくて、「${DL}は自分のエネルギーを恋愛に使う日じゃない」ということなんダよ。好きな人のことを考える時間より、自分を磨くことや、自分が楽しいと思えることに使った方が、結果的に魅力が上がって縁も引き寄せられるんダ。焦らなくていいんダよ🐼`;
}
export function buildLoveLowScoreDay_KR(DL, kanshi) {
  return `${DL} "${kanshi}"날은 명식적으로 연애에 대한 지원이 약한 날이에요. 이것은 "인연이 없다"는 뜻이 아니라, "${DL}은(는) 자신의 에너지를 연애에 쓸 날이 아니다"라는 뜻이에요. 좋아하는 사람을 생각하는 시간보다, 자신을 가꾸는 것이나 자신이 즐겁다고 생각하는 것에 쓰는 편이, 결과적으로 매력이 올라가 인연도 끌어당겨져요. 조급해하지 않아도 돼요🐼`;
}

// ── 仕事運 詳細コメント（行5417-5433）──
export function buildWorkSeikanDay_JA(kanshi, DL) {
  return `「${kanshi}」${DL}は「正官」の星が立っているんダ。正官というのは、地位・評価・信頼という、仕事の核心に関わる星なんダよ。${DL}は「ちゃんとやっている人がちゃんと見てもらえる」日ンダ。先送りにしていた報告や提案、上の人への連絡——${DL}動いたことは、いつも以上にきちんと届くんダよ。評価が気になっていたなら、${DL}一歩出てみてほしいんダ🐼`;
}
export function buildWorkSeikanDay_KR(kanshi, DL) {
  return `"${kanshi}" ${DL}은(는) "정관"의 별이 떠 있어요. 정관은 지위・평가・신뢰라는, 일의 핵심과 관련된 별이에요. ${DL}은(는) "제대로 하는 사람이 제대로 인정받는" 날이에요. 미뤄왔던 보고나 제안, 윗사람에게의 연락——${DL} 움직인 것은, 평소보다 더 제대로 전달돼요. 평가가 신경 쓰였다면, ${DL} 한 걸음 내디뎌 보길 바라요🐼`;
}
export function buildWorkShokujinDay_JA(DL, kanshi) {
  return `${DL}「${kanshi}」日は「食神」の日ンダ。食神は才能・表現・創造性を司る星で、仕事でいうと「自分の得意が一番輝く日」なんダよ。マニュアル通りに動くより、自分なりの工夫やアイデアを出した方がずっといい結果になる。${DL}は「正解」を探すより「自分らしい答え」を出す日ンダよ。眠っているアイデアがあるなら、${DL}それを形にしてみてほしいんダ🐼`;
}
export function buildWorkShokujinDay_KR(DL, kanshi) {
  return `${DL} "${kanshi}"날은 "식신"의 날이에요. 식신은 재능・표현・창조성을 관장하는 별로, 일에서는 "자신의 특기가 가장 빛나는 날"이에요. 매뉴얼대로 움직이기보다, 자기만의 궁리와 아이디어를 내는 편이 훨씬 좋은 결과가 돼요. ${DL}은(는) "정답"을 찾기보다 "나다운 답"을 내는 날이에요. 잠자고 있는 아이디어가 있다면, ${DL} 그것을 형태로 만들어 보길 바라요🐼`;
}
export function buildWorkShougoanDay_JA(kanshi, DL) {
  return `「${kanshi}」${DL}は「傷官」の星ンダ。傷官は天才性と反骨心を持つ星で、${DL}は常識や既存のやり方に疑問を感じやすい日なんだよ。それは弱点じゃなくてあなたの才能が目覚めているサインンダ。ただ上の人への言い方には気をつけて——${DL}は「伝え方」に少しだけ丁寧さを足すと、あなたの才能が正しく伝わるんダよ🐼`;
}
export function buildWorkShougoanDay_KR(kanshi, DL) {
  return `"${kanshi}" ${DL}은(는) "상관"의 별이에요. 상관은 천재성과 반골 기질을 가진 별로, ${DL}은(는) 상식이나 기존의 방식에 의문을 느끼기 쉬운 날이에요. 그건 약점이 아니라 당신의 재능이 깨어나고 있는 신호예요. 다만 윗사람에게 말하는 방식에는 주의해 주세요——${DL}은(는) "전달 방식"에 조금만 더 정중함을 더하면, 당신의 재능이 올바르게 전달돼요🐼`;
}
export function buildWorkHenkanDay_JA(kanshi, DL) {
  return `「${kanshi}」${DL}は「偏官」の星ンダ。偏官は行動力・突破力・プレッシャー耐性に関わる星で、${DL}は「攻める」動きに向いている日なんダよ。難しそうだと思っていた仕事、少し高い目標——${DL}はそういうものに手を伸ばすといい。ただ、体力と集中力の消費が激しい日でもあるから、無理し過ぎず、やりきったら早めに休んでほしいんダよ🐼`;
}
export function buildWorkHenkanDay_KR(kanshi, DL) {
  return `"${kanshi}" ${DL}은(는) "편관"의 별이에요. 편관은 행동력・돌파력・프레셔 내성에 관련된 별로, ${DL}은(는) "공격하는" 움직임에 적합한 날이에요. 어려워 보였던 일, 조금 높은 목표——${DL}은(는) 그런 것에 손을 뻗는 게 좋아요. 다만, 체력과 집중력 소모가 큰 날이기도 하니, 무리하지 말고, 해낸 후에는 일찍 쉬길 바라요🐼`;
}
export function buildWorkInDay_JA(DL, kanshi, js) {
  return `${DL}「${kanshi}」日は「${js}」の星ンダ。印星は学習・知識・内省に関わる星で、${DL}は「インプットの日」と思うといいんだよ。人から学ぶ、本を読む、考えをまとめる——アウトプットより情報を取り込むことに向いている日ンダ。${DL}吸収したことが、あとで大きな仕事のアイデアに変わることがあるんダよ🐼`;
}
export function buildWorkInDay_KR(DL, kanshi, js) {
  return `${DL} "${kanshi}"날은 "${js}"의 별이에요. 인성은 학습・지식・내성에 관련된 별로, ${DL}은(는) "인풋의 날"이라고 생각하면 좋아요. 사람에게서 배우고, 책을 읽고, 생각을 정리한다——아웃풋보다 정보를 받아들이는 것에 적합한 날이에요. ${DL} 흡수한 것이, 나중에 큰 일의 아이디어로 바뀌는 경우가 있어요🐼`;
}
export function buildWorkGouzaiDay_JA(DL, kanshi) {
  return `${DL}「${kanshi}」日は「劫財」の星が立っているんダ。劫財は競争や横取り、思わぬ妨害が起きやすい星なんダよ。大切な交渉・重要な契約・感情的になりそうな話し合いは、${DL}じゃない方がいいんダ。${DL}は自分のペースをしっかり守って、周りの雑音に振り回されないように動くといいんダよ🐼`;
}
export function buildWorkGouzaiDay_KR(DL, kanshi) {
  return `${DL} "${kanshi}"날은 "겁재"의 별이 떠 있어요. 겁재는 경쟁이나 탈취, 예상치 못한 방해가 일어나기 쉬운 별이에요. 중요한 협상・중요한 계약・감정적이 될 것 같은 대화는, ${DL}이 아닌 편이 좋아요. ${DL}은(는) 자신의 페이스를 확실히 지키고, 주위의 잡음에 휘둘리지 않도록 움직이면 좋아요🐼`;
}
export function buildWorkHighScoreDay_JA(kanshi, DL, kiH, ki) {
  return `「${kanshi}」${DL}は仕事運が高めの日ンダ。${kiH ? `喜神「${ki}」の流れが来ていて、あなたの命式に追い風が吹いているんダよ。` : ''}こういう日は「やろうかどうか迷っていること」を動かすのに最適なんダ。迷っていた連絡、腰が重かった提案——${DL}一つ動かしてみてほしいんダよ。思っていたより物事がスムーズに進むことが多い日ンダ🐼`;
}
export function buildWorkHighScoreDay_KR(kanshi, DL, kiH, ki) {
  return `"${kanshi}" ${DL}은(는) 업무운이 높은 날이에요. ${kiH ? `희신 "${ki}"의 흐름이 오고 있어, 당신의 명식에 순풍이 불고 있어요. ` : ''}이런 날은 "할까 말까 망설이고 있는 것"을 움직이는 데 최적이에요. 망설였던 연락, 엉덩이가 무거웠던 제안——${DL} 하나 움직여 보길 바라요. 생각보다 일이 원활하게 진행되는 경우가 많은 날이에요🐼`;
}
export function buildWorkMidScoreDay_JA(kanshi, DL) {
  return `「${kanshi}」${DL}の仕事運は穏やかな流れンダ。大きな動きより、今やるべきことを丁寧にこなすことに集中する日なんダよ。${DL}コツコツやった積み上げが、あとで「あのとき頑張っていてよかった」と思える土台になっていくんダ。地味でも着実に、今日を大切に使ってほしいんダよ🐼`;
}
export function buildWorkMidScoreDay_KR(kanshi, DL) {
  return `"${kanshi}" ${DL}의 업무운은 잔잔한 흐름이에요. 큰 움직임보다, 지금 해야 할 것을 세심하게 해내는 것에 집중하는 날이에요. ${DL} 꾸준히 쌓아 올린 누적이, 나중에 "그때 열심히 했어서 다행이었다"고 느낄 토대가 돼요. 수수하더라도 착실하게, 오늘을 소중히 써주길 바라요🐼`;
}
export function buildWorkLowScoreDay_JA(DL, kanshi) {
  return `${DL}「${kanshi}」日は、命式的に仕事への追い風が少ない日ンダ。焦って動いても空回りしやすいから、${DL}は「攻める日」ではなく「整える日」として使うといいんだよ。デスクの整理、タスクの整理、気になっていた小さなことの後始末——そういうことに使うと、次に追い風が来たとき一番うまく動けるんダよ🐼`;
}
export function buildWorkLowScoreDay_KR(DL, kanshi) {
  return `${DL} "${kanshi}"날은 명식적으로 일에 대한 순풍이 적은 날이에요. 조급하게 움직여도 헛돌기 쉬우니, ${DL}은(는) "공격하는 날"이 아니라 "정리하는 날"로 쓰면 좋아요. 책상 정리, 태스크 정리, 신경 쓰였던 작은 것들의 뒷정리——그런 것에 쓰면, 다음에 순풍이 올 때 가장 잘 움직일 수 있어요🐼`;
}

// ── 金運 詳細コメント（行5478-5494）──
export function buildMoneyHenzaiDay_JA(kanshi, DL) {
  return `「${kanshi}」${DL}は「偏財」の星が立っているんダ。偏財は「動いた人にお金がついてくる」星なんだよ。コツコツ型じゃなくて、チャンスをつかんで大きく動くことで金運が開くタイプの日ンダ。思わぬところからお金が動いたり、財に関わるいい縁が舞い込むこともあるんだよ。${DL}は「面白そう」「やってみたい」という直感を大切にして動いてほしいんダ。ただし、勢いに乗りすぎて後から後悔するような出費だけは注意ンダよ💰🐼`;
}
export function buildMoneyHenzaiDay_KR(kanshi, DL) {
  return `"${kanshi}" ${DL}은(는) "편재"의 별이 떠 있어요. 편재는 "움직인 사람에게 돈이 따라오는" 별이에요. 꾸준형이 아니라, 기회를 잡아 크게 움직이는 것으로 금전운이 열리는 타입의 날이에요. 예상치 못한 곳에서 돈이 움직이거나, 재물과 관련된 좋은 인연이 찾아오기도 해요. ${DL}은(는) "재미있어 보인다" "해보고 싶다"는 직감을 소중히 여기며 움직여 보길 바라요. 다만, 기세에 올라탐으로 나중에 후회할 만한 지출만은 주의하세요💰🐼`;
}
export function buildMoneySeizaiDay_JA(kanshi, DL) {
  return `「${kanshi}」${DL}は「正財」の星ンダ。正財はコツコツ積み上げた努力がお金という形で返ってくる星なんだよ。${DL}は「地味だけど確実な行動」が一番金運に直結する日ンダ。丁寧な仕事・約束をきちんと守ること・小さな信頼の積み重ね——そういうことが${DL}は直接お金の流れを引き寄せるんダよ。派手な動きより、誠実な積み上げを選んでほしいんダ🐼`;
}
export function buildMoneySeizaiDay_KR(kanshi, DL) {
  return `"${kanshi}" ${DL}은(는) "정재"의 별이에요. 정재는 꾸준히 쌓아 올린 노력이 돈이라는 형태로 돌아오는 별이에요. ${DL}은(는) "수수하지만 확실한 행동"이 가장 금전운에 직결되는 날이에요. 세심한 일・약속을 확실히 지키는 것・작은 신뢰의 누적——그런 것이 ${DL}은(는) 직접 돈의 흐름을 끌어당겨요. 화려한 움직임보다, 성실한 누적을 선택해 주길 바라요🐼`;
}
export function buildMoneyShokujinDay_JA(kanshi, DL) {
  return `「${kanshi}」${DL}は「食神」の星ンダ。食神は才能・表現・創造性から財が生まれる星なんだよ。${DL}は「好きなことをやること」「得意なことを発揮すること」が、そのまま金運アップにつながっていくんダ。義務感でやる仕事より、楽しんでやる仕事の方が今日は実入りが良くなりやすいんだよ。あなたが「これは自分の得意だな」と思えることを、${DL}は一つ全力でやってみてほしいんダ🐼`;
}
export function buildMoneyShokujinDay_KR(kanshi, DL) {
  return `"${kanshi}" ${DL}은(는) "식신"의 별이에요. 식신은 재능・표현・창조성에서 재물이 생겨나는 별이에요. ${DL}은(는) "좋아하는 일을 하는 것" "특기를 발휘하는 것"이, 그대로 금전운 상승으로 이어져요. 의무감으로 하는 일보다, 즐기며 하는 일 쪽이 오늘은 수입이 좋아지기 쉬워요. 당신이 "이건 나의 특기다"라고 생각되는 것을, ${DL}은(는) 하나 전력으로 해보길 바라요🐼`;
}
export function buildMoneyGouzaiDay_JA(kanshi, DL) {
  return `「${kanshi}」${DL}は「劫財」の星が立っているんダ。劫財は散財・横取り・思わぬ出費が起きやすい星で、今日は金運的に守りの日なんダよ。衝動買い、勢いでの出費、よく考えていない投資——こういうものは${DL}じゃなくていいんダ。財布の紐をしっかり締めて、「${DL}は使わない日」と決めておくだけで、金運の流れが変わってくるんだよ🐼`;
}
export function buildMoneyGouzaiDay_KR(kanshi, DL) {
  return `"${kanshi}" ${DL}은(는) "겁재"의 별이 떠 있어요. 겁재는 낭비・탈취・예상치 못한 지출이 일어나기 쉬운 별로, 오늘은 금전운적으로 수비의 날이에요. 충동 구매, 기세에 의한 지출, 잘 생각하지 않은 투자——이런 것은 ${DL}이 아니어도 돼요. 지갑의 끈을 꽉 죄고, "${DL}은(는) 쓰지 않는 날"이라고 정해두는 것만으로, 금전운의 흐름이 변화돼요🐼`;
}
export function buildMoneyHikenDay_JA(kanshi, DL) {
  return `「${kanshi}」${DL}は「比肩」の星ンダ。比肩は独立心と競争を表す星で、金運的には「財が散りやすい」日なんダよ。人への奢りや見栄のための出費、競争心からの浪費——こういうことが起きやすいから気をつけてほしいんダ。${DL}は自分のためにお金を使うより、将来のために貯めることを意識した方がいい日ンダよ🐼`;
}
export function buildMoneyHikenDay_KR(kanshi, DL) {
  return `"${kanshi}" ${DL}은(는) "비견"의 별이에요. 비견은 독립심과 경쟁을 나타내는 별로, 금전운적으로는 "재물이 흩어지기 쉬운" 날이에요. 남에게 대접이나 허영심을 위한 지출, 경쟁심에서 나오는 낭비——이런 일이 일어나기 쉬우니 조심해 주길 바라요. ${DL}은(는) 자신을 위해 돈을 쓰기보다, 장래를 위해 저축하는 것을 의식하는 편이 좋은 날이에요🐼`;
}
export function buildMoneyHenkanDay_JA(kanshi, DL) {
  return `「${kanshi}」${DL}は「偏官」の星ンダ。偏官はプレッシャーと出費が重なりやすい星なんだよ。急な出費や、立場上断れない支払いが発生しやすい日ンダ。それ自体は仕方ないんだけど、${DL}は余分な出費をなるべく控えて、財布に余裕を持っておくといいんダよ🐼`;
}
export function buildMoneyHenkanDay_KR(kanshi, DL) {
  return `"${kanshi}" ${DL}은(는) "편관"의 별이에요. 편관은 프레셔와 지출이 겹치기 쉬운 별이에요. 갑작스러운 지출이나, 입장상 거절할 수 없는 지불이 발생하기 쉬운 날이에요. 그 자체는 어쩔 수 없지만, ${DL}은(는) 여분의 지출을 가능한 한 줄이고, 지갑에 여유를 두는 것이 좋아요🐼`;
}
export function buildMoneyHighScoreDay_JA(kanshi, DL, kiH, ki) {
  return `「${kanshi}」${DL}は金運の流れがいい日ンダ。${kiH ? `喜神「${ki}」の気が天干に乗っていて、命式に追い風が来ているんダよ。` : ''}こういう日はお金に関わる行動を少し積極的にしてみていいんダ。気になっていた投資の下調べ、副収入になりそうなことへの一歩、普段より少しだけ広い視野でお金を動かしてみてほしいんダよ🐼`;
}
export function buildMoneyHighScoreDay_KR(kanshi, DL, kiH, ki) {
  return `"${kanshi}" ${DL}은(는) 금전운의 흐름이 좋은 날이에요. ${kiH ? `희신 "${ki}"의 기가 천간에 타고 있어, 명식에 순풍이 오고 있어요. ` : ''}이런 날은 돈과 관련된 행동을 조금 적극적으로 해봐도 좋아요. 신경 쓰였던 투자의 사전 조사, 부수입이 될 만한 것에의 첫걸음, 평소보다 조금 더 넓은 시야로 돈을 움직여 보길 바라요🐼`;
}
export function buildMoneyMidScoreDay_JA(kanshi, DL) {
  return `「${kanshi}」${DL}の金運は穏やかな流れンダ。大きく動かすより、今あるお金と向き合う日にするといいんだよ。家計の見直し、使っているサービスの整理、将来のための小さな貯め——地味だけど、こういうことをやった日の積み重ねが、あとから大きな安心になっていくんダよ🐼`;
}
export function buildMoneyMidScoreDay_KR(kanshi, DL) {
  return `"${kanshi}" ${DL}의 금전운은 잔잔한 흐름이에요. 크게 움직이기보다, 지금 있는 돈과 마주하는 날로 하면 좋아요. 가계 점검, 사용 중인 서비스 정리, 장래를 위한 작은 저축——수수하지만, 이런 것을 한 날의 누적이, 나중에 큰 안심이 돼요🐼`;
}
export function buildMoneyLowScoreDay_JA(kanshi, DL) {
  return `「${kanshi}」${DL}は、命式的に金運への後押しが少ない日ンダ。焦ってお金を動かしても空回りしやすいから、今日は「守る日」と決めてほしいんダよ。高額の買い物や重要な金銭の判断、新しい投資——こういうことは別の日に持ち越すのが賢いんダ。今日は計画を立てる・情報を集める・将来への準備をする日として使ってほしいんダよ🐼`;
}
export function buildMoneyLowScoreDay_KR(kanshi, DL) {
  return `"${kanshi}" ${DL}은(는), 명식적으로 금전운에 대한 지원이 적은 날이에요. 조급하게 돈을 움직여도 헛돌기 쉬우니, 오늘은 "지키는 날"이라고 정해주길 바라요. 고액의 구매나 중요한 금전 판단, 새로운 투자——이런 것은 다른 날로 미루는 게 현명해요. 오늘은 계획을 세우고・정보를 모으고・장래를 위한 준비를 하는 날로 쓰길 바라요🐼`;
}

// ════════════════════════════════════════════════════════════════
// 日運 総合ポポスピーチ（App.jsx 行1187-1236）
// 29テンプレ + 4フォールバック + 3特殊条件 = 計36件
// 全て FN(label, s, ctx) 形式。ctx = {highest, lowest, ns, tip, ki}
// ════════════════════════════════════════════════════════════════

// ── 高スコア（78+）十神別 ──
export const dailyPopo_goodMsgs_KR = {
  '正官': (label, s) => `${label}은(는) 일이나 인간관계에서 성실함이 빛나는 날이었어요🐼 ${s.kanshi}일의 에너지가 당신의 명식에 실려 있어, 노력이나 진지한 태도가 주위에 제대로 전달되기 쉬운 상태였어요. 업무운이 ${s.work}점으로 높았던 것도 납득이 가요. ${label} 임한 것은, 시간이 지나고 나서 "그날 해두길 잘했다"고 느껴질 날이 될 거예요🐼`,
  '食神': (label, s) => `${label}("${s.kanshi}"일)은(는) 당신다움이 마음껏 드러날 수 있는 날이었어요🐼 좋아하는 것・잘하는 것에 관련될수록 운이 올라가는 흐름으로, 연애운도 ${s.love}점으로 높았어요. 무리하게 맞추기보다 "있는 그대로"가 모든 것이 잘 풀리는 날——그런 명식의 흐름이 왔어요. ${label} 움직인 것・만든 것은, 자신도 모르게 누군가의 마음을 움직이고 있을지도 몰라요🐼`,
  '偏財': (label, s) => `"${s.kanshi}"일은 "움직일수록 끌어당기는" 흐름이 온 날이었어요🐼 ${label}의 금전운 ${s.money}점・연애운 ${s.love}점은, 적극적으로 밖에 나간 사람일수록 그 혜택을 받기 쉬웠음을 보여주고 있어요. 계속 미뤄두었던 일을 움직인다면, 이런 날이었어요. 오늘의 당신에게——무엇 하나라도 움직였다면, 그것이 정답이에요🐼`,
  '正財': (label, s) => `${label}("${s.kanshi}"일)은(는) 세심함과 성실함이 보답받는 날이었어요🐼 금전운이 ${s.money}점으로 높고, 꾸준히 쌓아온 것이 서서히 형태로 드러나기 쉬운 흐름이었어요. 화려한 움직임보다 "꾸준히 해온 사람이 보답받는" 타이밍이에요. ${label}의 자신을 돌아봤을 때, 작더라도 제대로 앞으로 나아갈 수 있었다면, 그것만으로도 충분히 정답이에요🐼`,
  '偏官': (label, s) => `"${s.kanshi}"일의 당신에게는 돌파력이 깃들어 있었어요🐼 평소라면 망설였을 일에 뛰어들 수 있는 에너지가 와 있고, 총합 ${s.total}점의 높은 흐름 속에서 가장 중요한 것은 "행동한 양"이었어요. 연애에서도 일에서도, 조금 용기를 내 움직인 순간이, 나중에 돌아보면 전환점이 되는 경우가 많은 날이에요. ${label}의 한 걸음은, 생각보다 큰 의미가 있어요🐼`,
  '傷官': (label, s) => `${label}은(는) 자신의 개성을 당당하게 드러낼 수 있는 날이었어요🐼 "${s.kanshi}"일의 흐름은 "평범할 필요는 없다"고 명식이 응원하고 있고, 연애운 ${s.love}점도 높았어요. 조금 특이하다고 여겨져도 상관없어요——오히려 그 개성이 오늘 당신의 최대 무기였어요. ${label} 나답게 움직인 순간이, 가장 빛나던 순간이었어요🐼`,
};

// ── 中スコア（62-77）十神別 ──
export const dailyPopo_midMsgs_KR = {
  '正官': (label, s) => `${label}("${s.kanshi}"일)은(는) 견실하게 쌓아가는 날이었어요🐼 업무운 ${s.work}점으로, 눈에 띄는 성과보다 "신뢰를 조금씩 쌓는" 데 적합한 흐름이었어요. 오늘의 성실한 행동이, 서서히 주위의 평가로 이어져요. 조급해하지 말고 꾸준히——그것이 ${label}의 가장 옳은 움직임 방식이었어요🐼`,
  '食神': (label, s) => `"${s.kanshi}"일은, 잘하는 것에 집중할수록 충실감이 있는 날이었어요🐼 큰 결과가 아니더라도, 자신의 페이스로 좋아하는 것을 할 수 있었던 시간이 있었다면 충분해요. 연애운 ${s.love}점도 보여주듯, 자연스러운 자신으로 있을수록 좋은 인연이 가까워지는 흐름이었어요🐼`,
  '偏財': (label, s) => `${label}("${s.kanshi}"일)은(는) 인연과 만남에 움직임이 생기기 쉬운 날이었어요🐼 금전운도 연애도, 가만히 있는 것보다 조금만 밖에 나가는 편이 좋은 흐름으로, 총합 ${s.total}점은 "우선 한 걸음"을 응원하고 있었어요. 크게 움직이지 않아도 돼요——사소한 대화나 행동이, 나중에 소중한 인연이었다고 깨닫는 경우가 있어요🐼`,
  '正財': (label, s) => `"${s.kanshi}"일은 꾸준함이 가장 큰 무기가 되는 날이었어요🐼 금전운 ${s.money}점은 "꾸준형" 행동이 그대로 결과로 이어지는 흐름을 보여주고 있고, 충동적으로 움직이기보다 계획대로 진행하는 편이 후회가 없는 날이었어요. ${label} 세심하게 해낸 것은, 쌓여서 반드시 돌아와요🐼`,
  '偏官': (label, s) => `${label}("${s.kanshi}"일)은(는) 행동력이 올라간 만큼, 조금 소모되기 쉬운 날이기도 했어요🐼 총합 ${s.total}점에 업무운 ${s.work}점——의욕은 있었을 텐데 헛돌은 느낌이 있었다면, 에너지 방향을 조금 좁히면 좋은 날이었어요. 무리해서 전부 하지 않아도 돼요. 하나만 마무리하면 충분해요🐼`,
  '傷官': (label, s) => `"${s.kanshi}"일은 감성과 표현력이 높아지는 날이었어요🐼 연애운 ${s.love}점도 보여주듯, 말이나 행동으로 평소보다 조금 더 솔직하게 마음을 드러낼 수 있는 흐름이 왔어요. "조금 심했나"라고 생각된 순간이 있었다면, 그건 오늘의 당신이 솔직했을 뿐이에요. 끌고 가지 않아도 돼요🐼`,
  '正印': (label, s, ctx) => `${label}("${s.kanshi}"일)은(는) "흡수하는" 데 적합한 날이었어요🐼 무언가를 읽거나, 사람의 이야기를 듣거나, 조용히 생각한 시간이 있었다면, 그것이 오늘의 정답이에요. ${ctx.lowest.k}운이 ${ctx.lowest.v}점이었던 것은, 밖으로 향하기보다 안으로 향하는 날이었기 때문이에요. 오늘 인풋한 것은, 나중에 서서히 힘이 돼요🐼`,
  '偏印': (label, s) => `"${s.kanshi}"일은 직감이 예민해지기 쉬운 날이었어요🐼 논리보다 감각, 계획보다 반짝임이 적중하기 쉬운 흐름으로, 무언가 문득 떠오른 것이 있었다면, 거기엔 확실히 의미가 있어요. ${label}의 직감——메모해 두길 바라요🐼`,
  '比肩': (label, s) => `${label}("${s.kanshi}"일)은(는) 자기 축을 되찾는 날이었어요🐼 누군가에게 너무 맞추느라 지쳐 있었다면, 오늘은 그 반동이 오기 쉬운 흐름이었어요. 총합 ${s.total}점은 "자신의 페이스를 지킨 사람이 가장 잘 풀리는 날"을 보여주고 있었어요. 주위에서 뭐라 생각하든, 나답게 있는 것이 오늘의 가장 큰 정답이에요🐼`,
  '劫財': (label, s) => `"${s.kanshi}"일은 주위와의 마찰이 생기기 쉬운 흐름이었어요🐼 총합 ${s.total}점으로 억제되어 있던 것은, 누군가와 경쟁하거나 경쟁심이 너무 고조되어 있었기 때문일 수 있어요. ${label} 누군가에게 짜증이 난 순간이 있었다면, 상대보다 "자신의 컨디션"에 눈을 돌리는 편이 좋은 날이었어요. 오늘 일은 끌고 가지 않아도 돼요🐼`,
};

// ── 低スコア（〜61）十神別 ──
export const dailyPopo_badMsgs_KR = {
  '正財': (label, s, ctx) => `${label}("${s.kanshi}"일)은(는) 방어하는 게 정답인 날이었어요🐼 "${s.kanshi}"일의 흐름은 당신의 특기 방향과 어긋나 있어, 세심하게 하고 있어도 헛돌기 쉬운 날이었어요. 특히 ${ctx.lowest.k}운이 ${ctx.lowest.v}점으로 낮았던 것도, "오늘은 내보내기보다 쌓아두는 날"의 신호예요. 조급하게 움직이지 않은 사람이 가장 현명한 날이었어요🐼`,
  '偏財': (label, s, ctx) => `"${s.kanshi}"일은 적극적으로 움직이고 싶어지는 마음과는 반대로, 흐름이 따라오지 않는 날이었어요🐼 ${ctx.lowest.k}운 ${ctx.lowest.v}점이 보여주듯, 오늘은 "움직일수록 엇갈림이 늘어나는" 흐름이었어요. 내일이나 모레, 조금 더 흐름이 정돈된 날에 같은 일을 하면 훨씬 잘 풀려요. ${label}을(를) 극복할 수 있었다면, 그걸로 충분해요🐼`,
  '傷官': (label, s, ctx) => `${label}("${s.kanshi}"일)은(는) 감정이 겉으로 드러나기 쉬워, 예상치 못한 엇갈림이 생기기 쉬운 날이었어요🐼 누군가에게 뭔가 말하고 싶어지거나, 자기 생각을 밀어붙이고 싶어지는 흐름으로, ${ctx.lowest.k}운 ${ctx.lowest.v}점도 "오늘의 충동에는 타지 않는 편이 좋다"를 보여주고 있었어요. 하고 싶은 말은 적어두고, 진정된 날에 다시 전하면 좋아요. 오늘의 자신을 나무라지 않길 바라요🐼`,
  '劫財': (label, s, ctx) => `"${s.kanshi}"일은 누군가와 경쟁하거나, 비교하는 에너지가 강해지기 쉬운 날이었어요🐼 ${ctx.lowest.k}운이 ${ctx.lowest.v}점으로 낮아, 소모된 느낌이 있었다면, 그건 명식적으로 "불필요한 것을 내려놓는 날"이었기 때문이에요. 돈도 감정도 에너지도, 오늘은 한 번 리셋되는 날——그렇게 생각하면 조금 편해져요. 내일부터의 자신을 위한 준비가 된 날이에요🐼`,
  '偏官': (label, s, ctx) => `${label}("${s.kanshi}"일)은(는) 의욕은 있는데 헛돌기 쉬운, 안타까운 날이었어요🐼 "${s.kanshi}"일의 흐름은 당신의 명식과 맞물리지 않고, 힘을 쏟을수록 피로만 쌓이는 상태였어요. ${ctx.lowest.k}운 ${ctx.lowest.v}점은 "오늘은 쉴 용기를 가졌으면" 하는 신호예요. 너무 열심히 한 자신에게, 오늘 밤은 제대로 보상을 줘보길 바라요🐼`,
  '比肩': (label, s, ctx) => `"${s.kanshi}"일은 고독감이나 "나만 열심히 하고 있다"는 느낌이 들기 쉬운 날이었어요🐼 ${ctx.lowest.k}운 ${ctx.lowest.v}점도, 밖을 향한 에너지보다 안으로 향한 시간 쪽이 충실했던 날이었음을 보여주고 있어요. 오늘의 자기 시간——외롭다고 느꼈더라도, 그건 "자신을 리셋하기 위한 필요한 시간"이었어요. 푹 쉬길 바라요🐼`,
  '正印': (label, s, ctx) => `${label}("${s.kanshi}"일)은(는) 조급함을 느끼기 쉽지만, 천천히 움직이는 날이었어요🐼 배우거나 읽는 것에 에너지가 향하는 날로, 밖으로의 행동보다 안으로의 축적이 적합했어요. ${ctx.lowest.k}운 ${ctx.lowest.v}점은 "오늘은 아웃풋보다 충전"의 신호예요. ${label} 조용히 보낼 수 있었던 시간이 있었다면, 그게 가장 큰 정답이었어요🐼`,
  '偏印': (label, s, ctx) => `"${s.kanshi}"일은 직감과 현실이 맞물리지 않는 날이었어요🐼 "뭔가 잘 안 돼"라는 감각이 있었다면, 그건 명식적으로 흐름이 자신의 방향을 향하지 않는 날이었기 때문이에요. ${ctx.lowest.k}운 ${ctx.lowest.v}점——오늘은 계획보다 반짝임에 타기 쉽고, 나중에 "왜 그걸 했을까"라고 생각할 행동이 나오기 쉬운 날이에요. 충동적인 결정은 내일로 미루길 바라요🐼`,
  '正官': (label, s, ctx) => `${label}("${s.kanshi}"일)은(는) 노력이 헛돌기 쉬운 날이었어요🐼 평소처럼 성실하게 하고 있는데 왠지 평가받지 못하고・전달되지 않는 감각이 있었다면, 그건 명식 탓이에요. ${ctx.lowest.k}운 ${ctx.lowest.v}점——오늘의 "전달되지 않았다"는, 당신의 실력이나 성의와는 관계가 없어요. 시기가 맞물리면 제대로 전달돼요. 끌고 가지 않길 바라요🐼`,
};

// ── 特殊条件メッセージ ──
export function buildDailyPopoShigou_KR(label, s, ctx) {
  return `${label}("${s.kanshi}"일)은(는) 인연의 에너지가 특별히 열려 있던 날이었어요🐼 오늘의 간지 "${s.dayShi}"이(가) 당신의 생일의 지지 "${ctx.ns}"와(과) 특별한 관계에 있어, 연애・인연・만남에 관련된 것이 명식적으로 지지를 받고 있었어요. ${ctx.highest.k}운이 ${ctx.highest.v}점으로 가장 높았던 것도 우연이 아니에요. ${label} 누군가를 만나거나, 연락이 오거나, 마음을 전한 순간이 있었다면——그건 명식이 준비해 준 타이밍이었어요🐼`;
}
export function buildDailyPopoRokuchuu_KR(label, s, ctx) {
  return `${label}("${s.kanshi}"일)은(는) 감정이 흔들리기 쉽고, 마음이 전달되기 어려운 날이었어요🐼 오늘의 간지 "${s.dayShi}"와(과) 당신의 생일의 지지 "${ctx.ns}"이(가) 대립하는 관계에 있어, 말이 의도와 다른 방향으로 전달되거나, 타이밍이 엇갈리기 쉬운 흐름이었어요. ${ctx.lowest.k}운 ${ctx.lowest.v}점도 그 신호예요. 오늘 누군가와 다투거나, 잘 안 된 느낌이 든다면——그건 상대 탓도 자기 탓도 아니고, 날의 흐름 탓이에요. 끌고 가지 않아도 돼요🐼`;
}
export function buildDailyPopoKjDouble_KR(label, s, ctx) {
  return `${label}("${s.kanshi}"일)은(는), 당신에게 있어 역풍이 겹친 날이었어요🐼 공기의 흐름이 당신의 명식과 맞지 않는 날로, 무엇을 해도 한 단계 더 수고가 드는 느낌이 있었다면, 그건 진실이었어요. ${ctx.lowest.k}운 ${ctx.lowest.v}점——오늘은 힘을 쏟을 날이 아니라, ${ctx.tip}만으로도 충분한 날이었어요. 오늘을 넘겨낼 수 있었던 것 자체가, 제대로 정답이었어요🐼`;
}
export function buildDailyPopoGoodFallback_KR(label, s, ctx) {
  return `${label}("${s.kanshi}"일)은(는) 전체적으로 순풍이 오고 있던 날이었어요🐼 ${ctx.highest.k}운이 ${ctx.highest.v}점으로 가장 높고, 명식적으로 지지받는 흐름 속에서 ${label} 움직인 것은 확실히 힘이 되고 있어요. 오늘의 자신을 제대로 인정해 주길 바라요🐼`;
}
export function buildDailyPopoMidFallback_KR(label, s, ctx) {
  return `${label}("${s.kanshi}"일)은(는) ${ctx.highest.k}운 ${ctx.highest.v}점으로, 셋 중에서는 ${ctx.highest.k}이(가) 가장 잘 실려 있던 날이었어요🐼 큰 파도는 없어도, 착실히 쌓아 올린 시간은 반드시 나중에 힘이 돼요. 오늘의 꾸준함은 배신하지 않아요🐼`;
}
export function buildDailyPopoBadFallback_KR(label, s, ctx) {
  return `${label}("${s.kanshi}"일)은(는) 명식적으로 흐름이 정돈되기 어려운 날이었어요🐼 ${ctx.lowest.k}운 ${ctx.lowest.v}점이 가장 낮고, 오늘만 보면 헛돌기가 많았을지도 몰라요. 하지만 이런 날에 무리하지 않고 보낼 수 있었던 것이, 다음 순풍이 올 때의 토대가 돼요. 오늘을 제대로 넘길 수 있었던 것——그것만으로도 충분해요🐼`;
}
