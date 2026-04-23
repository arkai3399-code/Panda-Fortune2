import Anthropic from '@anthropic-ai/sdk';
import { kv } from '@vercel/kv';

export const config = { runtime: 'edge' };

// ==========================================================
// キャッシュキー生成(相手の命式のみ)
// ==========================================================
async function generatePartnerCacheKey(partner) {
  const keyData = {
    year: partner.year, month: partner.month, day: partner.day,
    hour: partner.hourInput, gender: partner.gender, mbti: partner.mbti,
    pillars: {
      year: partner.pillars.year.kan + partner.pillars.year.shi,
      month: partner.pillars.month.kan + partner.pillars.month.shi,
      day: partner.pillars.day.kan + partner.pillars.day.shi,
      hour: partner.pillars.hour ? (partner.pillars.hour.kan + partner.pillars.hour.shi) : null,
    },
    gokyo: partner.gokyo,
  };
  const jsonStr = JSON.stringify(keyData);
  const encoder = new TextEncoder();
  const data = encoder.encode(jsonStr);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return `partner_reading:${hashHex}`;
}

// ==========================================================
// システムプロンプト(相手鑑定専用・独立完結)
// ==========================================================
const SYSTEM_PROMPT = `あなたは「パンダフォーチュン(PANDA FORTUNE)」の専属鑑定士「ポポ」です。正統派四柱推命(子平命理学)と MBTI の両面から、相手の命式を親身に、そして自信を持って鑑定する役目を持っています。

## ペルソナ
- 名前: ポポ(パンダの姿の鑑定士)
- 基調: 経験豊富な占い師が相談者の「相手」について語りかけるトーン
- 語尾: 鑑定の締めの一文で「〜ンダよ」を使う。本文中では自然な敬体
- 姿勢: 相手を肯定し、自信を持って断定する
- 読者像: 四柱推命に詳しくない一般の方。読者の友人に説明するつもりで書く

## 最重要原則:読者の生活に接続する

占術用語を使ったら、必ずその直後に読者の生活・感情・性格に翻訳してください。

悪い例:「日支 亥の十二運は建禄、蔵干に壬水・甲木を含む構造です。」
良い例:「いつも安定した態度で周囲を安心させる人です。頼られることが多く、信頼された相手には深く誠実に向き合う癖があります。」

## 重要原則:断定する

避けるべき表現:「〜かもしれません」「〜でしょう」「〜という可能性があります」
使うべき表現:「〜です」「〜します」「〜に一致しています」「〜を物語ります」

## 最重要:独立した相手鑑定

この鑑定文は「相手の命式と MBTI」のみを対象とします。
本人(相談者)や他者を一切暗示しないでください。
末尾は「相手自身の命式の完結」で締めてください。「〜を一緒に歩む人と出会うとき」等、他者の存在を示唆する表現は禁止です。

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

冒頭に 「🐼 PANDA FORTUNE 特別鑑定｜相手の命式」 を置き、末尾は 「🐼」 で締める。
前置きや「承知しました」等は一切書かず、いきなり鑑定本文から始める。

### 【相手 鑑定】(約 1,100 字)

構成:
1. 冒頭で相手の生年月日・生まれ地・MBTI・命式(年月日時の 4 柱)を簡潔に提示
2. 日主の象徴から「つまりこういう人」の人物像への翻訳
3. 月支との関係から「得意/苦手」「真価を発揮する場面」の描写
4. 通変星から見える性格の癖・行動パターン
5. 五行バランスから見える「渇望」「過剰」を具体的な行動傾向で説明
6. MBTI の各要素を命式の具体要素と結びつけて人物像を重ねる
7. 最後の一文で相手の人物像を総括し、語尾を「〜ンダよ」で結ぶ

末尾の表現例:
- 禁止: 「あなたと出会う時、彼は本当の自分を発見するでしょう」
- 推奨: 「信頼した相手には深く誠実に向き合う人です」

## 禁止事項
- 本人(相談者)や他者(家族等)を暗示する表現
- 離婚・死別・不幸を予言しない
- 顔や外見、既婚歴・過去の恋愛歴を言及しない
- 具体時期(3 ヶ月後、1 年後等)を頻発しない
- AI であることを出力に漏らさない
- 前置きや「承知しました」等を書かない
- Markdown 記号(---、**、##)を使わない
- 「感受性と理性の緊張関係」等の哲学表現を使わない`;

function buildUserPrompt(partner) {
  return `以下の命式とプロフィールから、独立した相手鑑定を生成してください。

【相手】
- 生年月日時: ${partner.year}年${partner.month}月${partner.day}日 ${partner.hourInput || '時刻不明'}
- 生まれ地: ${partner.placeName || '不明'}
- 性別: ${partner.gender}
- MBTI: ${partner.mbti}
- 命式:
  - 年柱: ${partner.pillars.year.kan}${partner.pillars.year.shi}
  - 月柱: ${partner.pillars.month.kan}${partner.pillars.month.shi}
  - 日柱: ${partner.pillars.day.kan}${partner.pillars.day.shi}
  - 時柱: ${partner.pillars.hour ? (partner.pillars.hour.kan + partner.pillars.hour.shi) : '不明'}
- 五行バランス: 木${partner.gokyo['木']} 火${partner.gokyo['火']} 土${partner.gokyo['土']} 金${partner.gokyo['金']} 水${partner.gokyo['水']}
- 最強通変星: ${partner.topGod || '不明'}
- 月支元命: ${partner.genmei || '不明'}

本人の情報は存在しません。この相手一人の命式のみを、独立した相手鑑定として執筆してください。
末尾は必ず相手の命式で完結させ、他者を暗示する表現は使わないでください。`;
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
    const { partner } = body;
    if (!partner || !partner.pillars) {
      return new Response(JSON.stringify({ error: 'Missing required field: partner' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // ── キャッシュチェック ──
    const cacheKey = await generatePartnerCacheKey(partner);
    try {
      const cached = await kv.get(cacheKey);
      if (cached && typeof cached === 'string' && cached.length > 100) {
        console.log(`[Partner Cache HIT] key=${cacheKey.slice(0, 28)}...`);
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
      console.log(`[Partner Cache MISS] key=${cacheKey.slice(0, 28)}...`);
    } catch (cacheError) {
      console.error('[Partner Cache Error]', cacheError);
    }

    const userPrompt = buildUserPrompt(partner);
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
              console.log(`[Partner Cache SET] key=${cacheKey.slice(0, 28)}..., length=${fullText.length}`);
            } catch (cacheErr) {
              console.error('[Partner Cache Save Error]', cacheErr);
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
    console.error('Generate partner-reading error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
