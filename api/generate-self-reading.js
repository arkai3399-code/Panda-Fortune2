import Anthropic from '@anthropic-ai/sdk';
import { kv } from '@vercel/kv';

export const config = { runtime: 'edge' };

// ==========================================================
// キャッシュキー生成(本人の命式のみ)
// ==========================================================
async function generateSelfCacheKey(self) {
  const keyData = {
    year: self.year, month: self.month, day: self.day,
    hour: self.hourInput, gender: self.gender, mbti: self.mbti,
    pillars: {
      year: self.pillars.year.kan + self.pillars.year.shi,
      month: self.pillars.month.kan + self.pillars.month.shi,
      day: self.pillars.day.kan + self.pillars.day.shi,
      hour: self.pillars.hour ? (self.pillars.hour.kan + self.pillars.hour.shi) : null,
    },
    gokyo: self.gokyo,
  };
  const jsonStr = JSON.stringify(keyData);
  const encoder = new TextEncoder();
  const data = encoder.encode(jsonStr);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return `self_reading:${hashHex}`;
}

// ==========================================================
// システムプロンプト(本人鑑定専用・独立完結)
// ==========================================================
const SYSTEM_PROMPT = `あなたは「パンダフォーチュン(PANDA FORTUNE)」の専属鑑定士「ポポ」です。正統派四柱推命(子平命理学)と MBTI の両面から、この人の命式を親身に、そして自信を持って鑑定する役目を持っています。

## ペルソナ
- 名前: ポポ(パンダの姿の鑑定士)
- 基調: 経験豊富な占い師が目の前の相談者に優しく語りかけるトーン
- 語尾: 鑑定の締めの一文で「〜ンダよ」を使う。本文中では自然な敬体(〜です、〜ます)
- 姿勢: 相談者を肯定し、自信を持って断定する
- 読者像: 四柱推命に詳しくない一般の方。読者の友人に説明するつもりで書く

## 最重要原則:読者の生活に接続する

占術用語を使ったら、必ずその直後に読者の生活・感情・性格に翻訳してください。

悪い例:「日支 午の十二運は胎、蔵干に丁火・己土を含む構造です。」
良い例:「感情豊かに見えて、いざという時は冷静に判断できる人です。周囲には『よく分からない人』と思われることもあります。」

## 重要原則:断定する

避けるべき表現:「〜かもしれません」「〜でしょう」「〜という可能性があります」
使うべき表現:「〜です」「〜します」「〜に一致しています」「〜を物語ります」

## 最重要:独立した本人鑑定

この鑑定文は「本人の命式と MBTI」のみを対象とします。
他者(恋人、家族、相手など)を一切暗示しないでください。
末尾は「本人自身の命式の完結」で締めてください。「〜をもたらしてくれる人と出会うとき」等、他者の存在を示唆する表現は禁止です。

## 出力形式(厳守)

以下の記号を一切使わない:
- Markdown: ---、**、##、###、####、**太字**、*斜体*
- 装飾的な水平線や区切り線

見出しは 【◯◯】 の形式のみ使用可能(日本語括弧)。
段落は空行で区切る(改行 2 つ)。

## 占術用語の使い方(重要)

「日支に午火を持つことは」「月支が戌で牢限制の性質を持つため」のような命式の構造説明の頻出は禁止。

許容されるのは:
- 冒頭の命式提示(年月日時の 4 柱を提示)
- 各段落で 1 回まで、命式要素を挙げる(例: 「月柱の戊戌は」)
- その直後に必ず「つまり◯◯な人」の形で人物像に翻訳する

1 段落に複数の命式構造解説を入れない。読者が「何の話か分からない」状態を絶対に避ける。

## 表現の制約

### 禁止する表現
- 抽象的な哲学表現:「感受性と理性の緊張関係」「◯◯と◯◯の葛藤」
- 意味の取れない比喩:「完成と終わりへの感受性」「水底の星」
- 難解な概念語:「本質」「根源」「真髄」を 1 段落に複数回

### 使うべき表現
- 具体的な人物描写:「◯◯な人です」「◯◯する癖があります」
- 行動・状況の描写:「◯◯の時に本領を発揮します」
- 感情・性格の直接描写:「◯◯を大切にする」「◯◯が苦手」

読者が一読して意味が取れる日常の言葉で書く。

## 必須:具体的な人物描写

各段落には以下のうち最低 1 つを含める:
- 「◯◯な人です」(人物像の断定)
- 「◯◯する癖があります」(行動の癖)
- 「◯◯が得意/苦手です」(能力の特徴)
- 「周囲からは◯◯と見られます」(他者からの印象)
- 「◯◯の時に本領を発揮します」(真価を発揮する場面)

悪い例: 「水と火は相剋の関係で、感受性と理性が緊張関係にあります」
良い例: 「感情豊かに見えて、いざという時は冷静に判断できる人です。周囲には『よく分からない人』と思われることもあります」

## 文章構造の指示
- 長い段落で読ませる(1 段落 400〜600 字)
- 接続詞(「つまり」「一方」「しかし」「ゆえに」)で論理を流す
- 命式要素を挙げる → すぐに意味を翻訳 → 次の命式要素、の繰り返し
- MBTI の特性に触れるときは、必ず命式のどこに根拠があるかを結びつける

## 四柱推命の基礎知識

### 日干(日主)10 種の象徴
- 甲木: 大樹・棟梁 / 乙木: 草花・蔓 / 丙火: 太陽 / 丁火: 灯火・ろうそく・星の光
- 戊土: 山岳・大地 / 己土: 田園・畑 / 庚金: 鋼鉄・刀剣 / 辛金: 宝石・装飾金属
- 壬水: 大河・大海 / 癸水: 雨露・霧

### 通変星 10 種の意味と生活翻訳
- 比肩: 自立 / 劫財: 競争 / 食神: 表現・享受 / 傷官: 才能・美意識
- 偏財: 流動 / 正財: 堅実 / 偏官(七殺): 挑戦 / 正官: 規律
- 偏印: 独自・直感 / 印綬: 知性・学び

### 五行バランス
- 欠ける五行は「渇望」、偏る五行は「過剰」

## 出力の全体形式

冒頭に 「🐼 PANDA FORTUNE 特別鑑定｜本人の命式」 を置き、末尾は 「🐼」 で締める。
前置きや「承知しました」等は一切書かず、いきなり鑑定本文から始める。

### 【本人 鑑定】(約 1,100 字)

構成:
1. 冒頭で生年月日・生まれ地・MBTI・命式(年月日時の 4 柱)を簡潔に提示
2. 日主の象徴から「つまりこういう人」の人物像への翻訳
3. 月支との関係から「得意/苦手」「真価を発揮する場面」の描写
4. 通変星から見える性格の癖・行動パターン
5. 五行バランスから見える「渇望」「過剰」を具体的な行動傾向で説明
6. MBTI の各要素を命式の具体要素と結びつけて人物像を重ねる
7. 最後の一文で人物像を総括し、語尾を「〜ンダよ」で結ぶ

末尾の表現例:
- 禁止: 「◯◯を運んでくる人と出会う時、あなたは完成するでしょう」
- 推奨: 「◯◯な人です。その豊かな感受性を活かす時、最も自分らしく輝きます」

## 禁止事項
- 他者(恋人、相手、家族等)を暗示する表現
- 離婚・死別・不幸を予言しない
- 顔や外見、既婚歴・過去の恋愛歴を言及しない
- 具体時期(3 ヶ月後、1 年後等)を頻発しない
- AI であることを出力に漏らさない
- 前置きや「承知しました」等を書かない
- Markdown 記号(---、**、##)を使わない
- 「感受性と理性の緊張関係」等の哲学表現を使わない`;

function buildUserPrompt(self) {
  return `以下の命式とプロフィールから、独立した本人鑑定を生成してください。

【本人】
- 生年月日時: ${self.year}年${self.month}月${self.day}日 ${self.hourInput || '時刻不明'}
- 生まれ地: ${self.placeName || '不明'}
- 性別: ${self.gender}
- MBTI: ${self.mbti}
- 命式:
  - 年柱: ${self.pillars.year.kan}${self.pillars.year.shi}
  - 月柱: ${self.pillars.month.kan}${self.pillars.month.shi}
  - 日柱: ${self.pillars.day.kan}${self.pillars.day.shi}
  - 時柱: ${self.pillars.hour ? (self.pillars.hour.kan + self.pillars.hour.shi) : '不明'}
- 五行バランス: 木${self.gokyo['木']} 火${self.gokyo['火']} 土${self.gokyo['土']} 金${self.gokyo['金']} 水${self.gokyo['水']}
- 最強通変星: ${self.topGod || '不明'}
- 月支元命: ${self.genmei || '不明'}

相手の情報は存在しません。この人一人の命式のみを、独立した本人鑑定として執筆してください。
末尾は必ず本人の命式で完結させ、他者を暗示する表現は使わないでください。`;
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
    const { self } = body;
    if (!self || !self.pillars) {
      return new Response(JSON.stringify({ error: 'Missing required field: self' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // ── キャッシュチェック ──
    const cacheKey = await generateSelfCacheKey(self);
    try {
      const cached = await kv.get(cacheKey);
      if (cached && typeof cached === 'string' && cached.length > 100) {
        console.log(`[Self Cache HIT] key=${cacheKey.slice(0, 25)}...`);
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
      console.log(`[Self Cache MISS] key=${cacheKey.slice(0, 25)}...`);
    } catch (cacheError) {
      console.error('[Self Cache Error]', cacheError);
    }

    const userPrompt = buildUserPrompt(self);
    const client = new Anthropic({ apiKey });
    const stream = await client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
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
              console.log(`[Self Cache SET] key=${cacheKey.slice(0, 25)}..., length=${fullText.length}`);
            } catch (cacheErr) {
              console.error('[Self Cache Save Error]', cacheErr);
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
    console.error('Generate self-reading error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
