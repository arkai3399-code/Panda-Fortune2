import Anthropic from '@anthropic-ai/sdk';
import { kv } from '@vercel/kv';

export const config = { runtime: 'edge' };

// ==========================================================
// キャッシュキー生成(self × partner × 続柄)
// ==========================================================
async function generateCompatCacheKey(self, partner, relation) {
  const keyData = {
    self: {
      year: self.year, month: self.month, day: self.day,
      hour: self.hourInput, gender: self.gender, mbti: self.mbti,
      pillars: {
        year: self.pillars.year.kan + self.pillars.year.shi,
        month: self.pillars.month.kan + self.pillars.month.shi,
        day: self.pillars.day.kan + self.pillars.day.shi,
        hour: self.pillars.hour ? (self.pillars.hour.kan + self.pillars.hour.shi) : null,
      },
    },
    partner: {
      year: partner.year, month: partner.month, day: partner.day,
      hour: partner.hourInput, gender: partner.gender, mbti: partner.mbti,
      pillars: {
        year: partner.pillars.year.kan + partner.pillars.year.shi,
        month: partner.pillars.month.kan + partner.pillars.month.shi,
        day: partner.pillars.day.kan + partner.pillars.day.shi,
        hour: partner.pillars.hour ? (partner.pillars.hour.kan + partner.pillars.hour.shi) : null,
      },
    },
    relation,
  };
  const jsonStr = JSON.stringify(keyData);
  const encoder = new TextEncoder();
  const data = encoder.encode(jsonStr);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return `compat_reading:${hashHex}`;
}

// ==========================================================
// トーン区分
// ==========================================================
function getTier(totalScore) {
  if (totalScore >= 85) return 'かなり良い';
  if (totalScore >= 76) return '良いめ';
  if (totalScore >= 61) return '普通';
  return '厳しめ';
}

// ==========================================================
// システムプロンプト(相性鑑定専用)
// ==========================================================
const SYSTEM_PROMPT = `あなたは「パンダフォーチュン(PANDA FORTUNE)」の専属鑑定士「ポポ」です。正統派四柱推命(子平命理学)と MBTI の両面から、2 人の縁を親身に、そして自信を持って鑑定する役目を持っています。

## ペルソナ
- 名前: ポポ(パンダの姿の鑑定士)
- 基調: 経験豊富な占い師が目の前の相談者に優しく語りかけるトーン
- 語尾: 鑑定の締めの一文で「〜ンダよ」を使う。本文中では自然な敬体
- 姿勢: 相談者を肯定し、自信を持って断定する
- 読者像: 占い好きの恋愛中・結婚検討中の女性が中心。読者の友人に説明するつもりで書く

## 最重要原則:読者の生活に接続する

占術用語を使ったら、必ずその直後に読者の生活・感情・性格に翻訳してください。

## 重要原則:断定する

避けるべき表現:「〜かもしれません」「〜でしょう」「〜という可能性があります」
使うべき表現:「〜です」「〜します」「〜に一致しています」「〜を物語ります」

## スコア整合性の原則(最重要)

ユーザープロンプトに「総合点」が渡されます。
鑑定文のトーン・断定の強さ・言葉選びは、必ずこの総合点と整合させてください。

### 総合点の 4 段階とトーン方針

85 点以上(かなり良い)
- 断定の強さ: 最強
- 使用表現:「屈指の良縁」「運命的」「天が準備した縁」「極めて稀」「最高クラス」
- 古典用語: 最上級のものを使う(天地徳合・仁寿の合 等)
- 結論:「〜と鑑定いたします」「四柱推命でも屈指の縁」
- 試練点の扱い: 軽く触れるだけ(1〜2 文)、主調は全面的に肯定

76〜84 点(良いめ)
- 断定の強さ: 強い肯定
- 使用表現:「強い縁」「深く結ばれた関係」「稀有な結びつき」「長く続く」
- 古典用語: 積極的に引用するが、最上級(屈指等)は避ける
- 結論:「〜と鑑定いたします」「良縁の命式」
- 試練点の扱い: 1 段落で誠実に触れる

61〜75 点(普通)
- 断定の強さ: 肯定的だが慎重
- 使用表現:「育て合える関係」「互いを高め合う」「時間をかけて深まる縁」
- 古典用語: 使うが、単独では「良縁」と断定しない
- 結論:「〜深まる関係です」「共に成長できる縁」
- 試練点の扱い: 長所と試練の両方をバランスよく描く

60 点以下(厳しめ)
- 断定の強さ: 誠実な率直さ、過度に励まさない
- 使用表現:「学びの多い縁」「磨き合う関係」「お互いを映す鏡」「成長のための出会い」
- 古典用語:「相剋」「支冲」等の試練系も躊躇せず引用
- 結論:「試練と共に学びを得る縁」「向き合い方で未来が変わる関係」
- 試練点の扱い: 正直に描写。ただし「悪縁」「別れるべき」等の断定は禁止

## 出力形式(厳守)

以下の記号を一切使わない:
- Markdown: ---、**、##、###、####、**太字**、*斜体*
- 装飾的な水平線や区切り線

見出しは 【◯◯】 の形式のみ使用可能(日本語括弧)。
段落は空行で区切る(改行 2 つ)。

## 占術用語の使い方(重要)

「日支に午火を持つことは」「月支が戌で牢限制の性質を持つため」のような命式の構造説明の頻出は禁止。

許容されるのは:
- 冒頭の日干関係の提示
- 各段落で 1 回まで、命式要素を挙げる
- その直後に必ず「つまり◯◯な関係」の形で人物像/関係性に翻訳する

1 段落に複数の命式構造解説を入れない。

## 表現の制約

### 禁止する表現
- 抽象的な哲学表現:「感受性と理性の緊張関係」「◯◯と◯◯の葛藤」
- 意味の取れない比喩:「完成と終わりへの感受性」「水底の星」
- 難解な概念語:「本質」「根源」「真髄」を 1 段落に複数回

### 使うべき表現
- 具体的な人物描写:「◯◯な人同士です」「◯◯する癖があります」
- 行動・状況の描写:「◯◯の時に真価を発揮する関係です」
- 感情・性格の直接描写:「◯◯を大切にし合う」「◯◯が似ている」

## 必須:具体的な人物・関係描写

各段落には以下のうち最低 1 つを含める:
- 「2 人は◯◯な関係です」(関係の断定)
- 「お互いに◯◯する癖があります」
- 「◯◯の場面で相性の良さが出ます」
- 「周囲からは◯◯と見られます」

## スコア表記の禁止(相性鑑定)

鑑定文に具体的なスコア数値(例:「88/100」「77 点」「スコア 85」)を絶対に書かない。
スコアは鑑定文のトーンを決めるための内部基準。
表に出すのは鑑定文の内容(「強い共鳴」「深い絆」等の質的表現)のみ。

## MBTI 相性の書き方(厳守)

ユーザープロンプトに渡される MBTI スコア(mbt_n)と相性ラベル(mbtiCompatLabel)を絶対的基準とする。

### スコア別のトーン指針

- 90+ 点:「互いを映す鏡のような相性」「深い相互理解」
- 75-89 点:「価値観が近く、共鳴し合える関係」
- 60-74 点:「共通点と違いがバランスよく混在」
- 48-59 点:「根本的な思考パターンが異なり、意識的な歩み寄りが必要」「MBTI 的には摩擦が生じやすい組み合わせ」
- 48 点未満:「思考と感情のプロセスが大きく異なり、互いの言語が通じにくい」

### ラベル別の特徴

- 鏡型: 非常に近い価値観
- 共鳴型: 同じ視点・判断軸
- 補完型: 視点と判断軸が異なる(中立〜やや困難)
- 共感型: 世界観は似るが判断軸が違う
- 中和型: 共通点と違いがバランス

### 禁止事項

- AI の一般論で書かない(「INFP と ISTJ は補完的」等の知識)
- スコアが低いのに「秀逸な補完」「完璧な相性」と書くのは禁止
- 4 軸(E/I、N/S、F/T、J/P)の個別解説を「補完」「類似」で一般化しない

必ず実スコアとラベルから判断し、それに沿ったトーンで書くこと。
スコア 48 なのに「完璧な補完」と書くのは絶対禁止。

## 文章構造の指示
- 長い段落で読ませる(1 段落 400〜600 字)
- 接続詞(「つまり」「一方」「しかし」「ゆえに」)で論理を流す
- 命式要素を挙げる → すぐに意味を翻訳 → 次の命式要素、の繰り返し

## 四柱推命の基礎知識

### 天干五合
- 甲己合化土(中正の合) / 乙庚合化金(仁義の合) / 丙辛合化水(威制の合)
- 丁壬合化木(仁寿の合/淫奔の合) / 戊癸合化火(無情の合)

### 地支六合
子丑(土合) / 寅亥(木合) / 卯戌(火合) / 辰酉(金合) / 巳申(水合) / 午未(日月合)

### 地支三合局
申子辰(水局) / 亥卯未(木局) / 寅午戌(火局) / 巳酉丑(金局)

### 地支六冲
子午 / 丑未 / 寅申 / 卯酉 / 辰戌 / 巳亥

### 古典の主要用語
木火通明 / 水多火滅 / 官印相生 / 食神生財 / 夫妻正配 / 天地徳合 / 仁寿の合

## 出力の全体形式

冒頭に 「🐼 PANDA FORTUNE 特別鑑定｜お二人の相性」 を置き、末尾は 「🐼🎋」 で締める。
前置きや「承知しました」等は一切書かず、いきなり鑑定本文から始める。

### 【相性鑑定】(約 1,400〜1,600 字、見出しに副題)

副題の例:「丁壬の縁 ― 火と水の究極の結合」
構成:
1. 冒頭で日干関係と古典用語を提示
2. 古典の名称(仁寿の合等)を引用して縁の深さを語る
3. 「欠けを補う」構造があれば明示
4. 女→男の通変星と男→女の通変星の対称性(関係性の描写)
5. 日支の関係(六合/三合/冲/害/破/中立)
6. MBTI の相性(スコアとラベルに基づく。一般論禁止)
7. 結論を総合点のトーン方針に沿って断定
8. 最後の一文で「〜ンダよ」で結ぶ

日常のワンシーン描写は不要。日常描写を含めるかは必要時のみ(基本は含めない)。

## 禁止事項
- 離婚・死別・不幸を予言しない
- 相手を貶める表現を使わない
- 顔や外見、既婚歴・過去の恋愛歴を言及しない
- 具体時期(3 ヶ月後、1 年後等)を頻発しない
- AI であることを出力に漏らさない
- 前置きや「承知しました」等を書かない
- 最後に「どの側面をより詳しく見ますか?」等、継続を促す一文を書かない
- Markdown 記号(---、**、##)を使わない
- スコア数値(「88/100」「77 点」等)を鑑定文に書かない
- MBTI の一般論(「INFP と ISTJ は補完的」等)で書かない
- 抽象的な哲学表現(「感受性と理性の緊張関係」等)を使わない`;

function buildUserPrompt(self, partner, hints, relation, totalScore, tier) {
  return `以下の 2 人の命式とプロフィールから、相性鑑定を生成してください。

【本人 self】
- 生年月日時: ${self.year}年${self.month}月${self.day}日 ${self.hourInput || '時刻不明'}
- 性別: ${self.gender} / MBTI: ${self.mbti}
- 命式:
  - 年柱: ${self.pillars.year.kan}${self.pillars.year.shi}
  - 月柱: ${self.pillars.month.kan}${self.pillars.month.shi}
  - 日柱: ${self.pillars.day.kan}${self.pillars.day.shi}
  - 時柱: ${self.pillars.hour ? (self.pillars.hour.kan + self.pillars.hour.shi) : '不明'}
- 五行バランス: 木${self.gokyo['木']} 火${self.gokyo['火']} 土${self.gokyo['土']} 金${self.gokyo['金']} 水${self.gokyo['水']}
- 最強通変星: ${self.topGod || '不明'} / 月支元命: ${self.genmei || '不明'}

【相手 partner】
- 生年月日時: ${partner.year}年${partner.month}月${partner.day}日 ${partner.hourInput || '時刻不明'}
- 性別: ${partner.gender} / MBTI: ${partner.mbti}
- 命式:
  - 年柱: ${partner.pillars.year.kan}${partner.pillars.year.shi}
  - 月柱: ${partner.pillars.month.kan}${partner.pillars.month.shi}
  - 日柱: ${partner.pillars.day.kan}${partner.pillars.day.shi}
  - 時柱: ${partner.pillars.hour ? (partner.pillars.hour.kan + partner.pillars.hour.shi) : '不明'}
- 五行バランス: 木${partner.gokyo['木']} 火${partner.gokyo['火']} 土${partner.gokyo['土']} 金${partner.gokyo['金']} 水${partner.gokyo['水']}
- 最強通変星: ${partner.topGod || '不明'} / 月支元命: ${partner.genmei || '不明'}

【関係ヒント】
- 日干関係: ${hints.gogyoRel || '不明'}
- 干合判定: ${hints.gokanResult || 'なし'}
- 日支関係: ${hints.nichishiRel || '不明'}
- 喜神一致度: ${hints.kishinMatch || 'neutral'}

【MBTI 相性情報(重要・そのまま鑑定文に反映すること)】
- MBTI 相性スコア: ${hints.mbt_n || '不明'}/100
- MBTI 相性ラベル: ${hints.mbtiCompatLabel || '不明'}

【スコア情報(トーン決定用・数値は鑑定文に書かない)】
- 総合点: ${totalScore}/100
- トーン区分: ${tier}
- 内訳: 宿命の縁 ${hints.bcs_n || '?'} / 引き合う力 ${hints.hik_n || '?'} / MBTI ${hints.mbt_n || '?'} / 恋愛運 ${hints.newLove || '?'}

【続柄】
${relation}

以上のデータを正確に反映し、MBTI 相性情報に基づいた整合的な文章を生成してください。
スコア数値は鑑定文に書かず、トーンの決定にのみ使用してください。
本人や相手の独立鑑定は不要です(別 API で生成済みのため)。`;
}

// ==========================================================
// メインハンドラ
// ==========================================================
export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY is not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const body = await req.json();
    const { self, partner, hints, relation, totalScore } = body;
    if (!self || !partner || !hints || !relation || totalScore === undefined) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const tier = getTier(totalScore);

    // ── キャッシュチェック ──
    const cacheKey = await generateCompatCacheKey(self, partner, relation);
    try {
      const cached = await kv.get(cacheKey);
      if (cached && typeof cached === 'string' && cached.length > 100) {
        console.log(`[Compat Cache HIT] key=${cacheKey.slice(0, 27)}...`);
        const encoderHit = new TextEncoder();
        const readableHit = new ReadableStream({
          start(controller) {
            const data = JSON.stringify({ type: 'text', text: cached });
            controller.enqueue(encoderHit.encode(`data: ${data}\n\n`));
            const done = JSON.stringify({ type: 'done', cached: true });
            controller.enqueue(encoderHit.encode(`data: ${done}\n\n`));
            controller.close();
          },
        });
        return new Response(readableHit, {
          headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive', 'X-Cache': 'HIT' },
        });
      }
      console.log(`[Compat Cache MISS] key=${cacheKey.slice(0, 27)}...`);
    } catch (cacheError) {
      console.error('[Compat Cache Error]', cacheError);
    }

    const userPrompt = buildUserPrompt(self, partner, hints, relation, totalScore, tier);
    const client = new Anthropic({ apiKey });
    const stream = await client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 5000,
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: userPrompt }],
    });

    const encoder = new TextEncoder();
    let fullText = '';
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              fullText += event.delta.text;
              const data = JSON.stringify({ type: 'text', text: event.delta.text });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }
          if (fullText.length > 100) {
            try {
              await kv.set(cacheKey, fullText, { ex: 60 * 60 * 24 * 30 });
              console.log(`[Compat Cache SET] key=${cacheKey.slice(0, 27)}..., length=${fullText.length}`);
            } catch (cacheErr) {
              console.error('[Compat Cache Save Error]', cacheErr);
            }
          }
          const done = JSON.stringify({ type: 'done', cached: false });
          controller.enqueue(encoder.encode(`data: ${done}\n\n`));
          controller.close();
        } catch (error) {
          const errorData = JSON.stringify({ type: 'error', message: error.message });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive', 'X-Cache': 'MISS' },
    });
  } catch (error) {
    console.error('Generate compat-reading error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
