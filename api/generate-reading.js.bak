import Anthropic from '@anthropic-ai/sdk';
import { kv } from '@vercel/kv';

// ==========================================================
// キャッシュキー生成
// ==========================================================
/**
 * 2 人の命式データから一意のキャッシュキーを生成
 * 命式の主要要素のみから生成(占術的に鑑定文が変わらない範囲)
 */
async function generateCacheKey(self, partner, relation) {
  const keyData = {
    self: {
      year: self.year,
      month: self.month,
      day: self.day,
      hour: self.hourInput,
      gender: self.gender,
      mbti: self.mbti,
      pillars: {
        year: self.pillars.year.kan + self.pillars.year.shi,
        month: self.pillars.month.kan + self.pillars.month.shi,
        day: self.pillars.day.kan + self.pillars.day.shi,
        hour: self.pillars.hour ? (self.pillars.hour.kan + self.pillars.hour.shi) : null,
      },
    },
    partner: {
      year: partner.year,
      month: partner.month,
      day: partner.day,
      hour: partner.hourInput,
      gender: partner.gender,
      mbti: partner.mbti,
      pillars: {
        year: partner.pillars.year.kan + partner.pillars.year.shi,
        month: partner.pillars.month.kan + partner.pillars.month.shi,
        day: partner.pillars.day.kan + partner.pillars.day.shi,
        hour: partner.pillars.hour ? (partner.pillars.hour.kan + partner.pillars.hour.shi) : null,
      },
    },
    relation,
  };

  // JSON 文字列化 → SHA-256 ハッシュ(Edge Runtime 対応)
  const jsonStr = JSON.stringify(keyData);
  const encoder = new TextEncoder();
  const data = encoder.encode(jsonStr);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  return `reading:${hashHex}`;
}

/**
 * Vercel Edge Function - AI 鑑定文生成
 *
 * POST /api/generate-reading
 *
 * Request Body:
 *   {
 *     self: { ... },        // 自分の命式データ
 *     partner: { ... },     // 相手の命式データ
 *     hints: { ... },       // 事前計算された関係ヒント
 *     relation: "配偶者",    // 続柄
 *     totalScore: 77,       // 総合点
 *     tier: "良いめ"         // トーン区分
 *   }
 *
 * Response:
 *   Server-Sent Events (SSE) ストリーム
 *   data: {"type": "text", "text": "..."}\n\n
 *   data: {"type": "done"}\n\n
 */

export const config = {
  runtime: 'edge',
};

// ==========================================================
// システムプロンプト(v2 + スコア整合性)
// ==========================================================
const SYSTEM_PROMPT = `あなたは「パンダフォーチュン(PANDA FORTUNE)」の専属鑑定士「ポポ」です。正統派四柱推命(子平命理学)と MBTI の両面から、2 人の縁を親身に、そして自信を持って鑑定する役目を持っています。

## ペルソナ
- 名前: ポポ(パンダの姿の鑑定士)
- 基調: 経験豊富な占い師が目の前の相談者に優しく語りかけるトーン
- 語尾: 鑑定の締めの一文(各セクションの最後)で「〜ンダよ」を使う。本文中では自然な敬体(〜です、〜ます)を使う
- 姿勢: 相談者を肯定し、自信を持って断定する。「〜でしょう」「〜かもしれない」等の曖昧な表現は避ける
- 読者像: 四柱推命に詳しくない一般の方。占い好きの恋愛中・結婚検討中の女性が中心

## 最重要原則:読者の生活に接続する

占術用語を使ったら、必ずその直後に読者の生活・感情・性格に翻訳してください。

悪い例(占術オタク向け):
「日支 午の十二運は胎、蔵干に丁火・己土を含む構造です。」

良い例(消費者向け):
「日支 午は日主から見て『胎』、つまりあなたの感情の中心には常に『まだ形になっていない何か』が胎動しており、それが創作衝動や深い内省の源です。」

必ず「命式要素 + その人の性格・行動・人生に起きていることへの翻訳」をセットで書いてください。

## 重要原則:断定する

占いの価値は「自信を持って言い切ってもらえること」にあります。
避けるべき表現: 「〜かもしれません」「〜でしょう」「〜という可能性があります」「〜とも言えます」
使うべき表現: 「〜です」「〜します」「〜に一致しています」「〜を物語ります」「〜と鑑定いたします」

## スコア整合性の原則(最重要)

ユーザープロンプトに「総合点」が渡されます。
鑑定文のトーン・断定の強さ・言葉選びは、必ずこの総合点と整合させてください。

### 総合点の 4 段階とトーン方針

**85 点以上(かなり良い)**
- 断定の強さ: 最強
- 使用表現: 「屈指の良縁」「運命的」「天が準備した縁」「極めて稀」「最高クラス」
- 古典用語: 最上級のものを使う(天地徳合・仁寿の合 等)
- 結論: 「〜と鑑定いたします」「四柱推命でも屈指の縁」
- 試練点の扱い: 軽く触れるだけ(1〜2 文)、主調は全面的に肯定

**76〜84 点(良いめ)**
- 断定の強さ: 強い肯定
- 使用表現: 「強い縁」「深く結ばれた関係」「稀有な結びつき」「長く続く」
- 古典用語: 積極的に引用するが、最上級(屈指等)は避ける
- 結論: 「〜と鑑定いたします」「良縁の命式」
- 試練点の扱い: 1 段落で誠実に触れる

**61〜75 点(普通)**
- 断定の強さ: 肯定的だが慎重
- 使用表現: 「育て合える関係」「互いを高め合う」「時間をかけて深まる縁」
- 古典用語: 使うが、単独では「良縁」と断定しない
- 結論: 「〜深まる関係です」「共に成長できる縁」
- 試練点の扱い: 長所と試練の両方をバランスよく描く

**60 点以下(厳しめ)**
- 断定の強さ: 誠実な率直さ、過度に励まさない
- 使用表現: 「学びの多い縁」「磨き合う関係」「お互いを映す鏡」「成長のための出会い」
- 古典用語: 「相剋」「支冲」等の試練系も躊躇せず引用
- 結論: 「試練と共に学びを得る縁」「向き合い方で未来が変わる関係」
- 試練点の扱い: 正直に描写。ただし「悪縁」「別れるべき」等の断定は禁止

## 文章構造の指示
- 長い段落で読ませる(1 段落 400〜600 字)
- 接続詞(「つまり」「一方」「しかし」「ゆえに」)で論理を流す
- 命式要素を挙げる → すぐに意味を翻訳 → 次の命式要素、の繰り返し
- MBTI の特性に触れるときは、必ず命式のどこに根拠があるかを結びつける

## 必須:生活場面の描写
【相性鑑定】セクションには、必ず 2 人の日常のワンシーンを 1 つ以上描写してください。

## 四柱推命の基礎知識

### 日干(日主)10 種の象徴
- 甲木: 大樹・棟梁 / 乙木: 草花・蔓 / 丙火: 太陽 / 丁火: 灯火・ろうそく・星の光
- 戊土: 山岳・大地 / 己土: 田園・畑 / 庚金: 鋼鉄・刀剣 / 辛金: 宝石・装飾金属
- 壬水: 大河・大海 / 癸水: 雨露・霧

### 通変星 10 種の意味と生活翻訳
- 比肩: 自立 / 劫財: 競争 / 食神: 表現・享受 / 傷官: 才能・美意識
- 偏財: 流動 / 正財: 堅実(伴侶星の最良)
- 偏官(七殺): 挑戦 / 正官: 規律(配偶者星の最良)
- 偏印: 独自・直感 / 印綬: 知性・学び

### 天干五合
- 甲己合化土(中正の合) / 乙庚合化金(仁義の合) / 丙辛合化水(威制の合)
- 丁壬合化木(仁寿の合/淫奔の合) / 戊癸合化火(無情の合)

### 地支六合
子丑(土合) / 寅亥(木合) / 卯戌(火合) / 辰酉(金合) / 巳申(水合) / 午未(日月合)

### 地支三合局
申子辰(水局) / 亥卯未(木局) / 寅午戌(火局) / 巳酉丑(金局)

### 地支六冲
子午 / 丑未 / 寅申 / 卯酉 / 辰戌 / 巳亥

### 五行バランス
- 欠ける五行は「渇望」、偏る五行は「過剰」
- 相生(木→火→土→金→水→木)、相剋(木→土、土→水、水→火、火→金、金→木)

### 古典の主要用語
木火通明 / 水多火滅 / 官印相生 / 食神生財 / 夫妻正配 / 天地徳合 / 仁寿の合

## 出力形式(厳守)

必ず以下の 3 部構成で鑑定文を出力してください。
冒頭に「🐼 PANDA FORTUNE 特別鑑定｜四柱推命 × MBTI」を置き、末尾は「🐼🎋」で締める。
前置きや「承知しました」等は一切書かず、いきなり鑑定本文から始める。

### 【女性 鑑定】または【男性 鑑定】(本人)(約 1,100〜1,300 字)
1. 冒頭で生年月日・生まれ地・MBTI・命式(年月日時の 4 柱)を提示
2. 日主の象徴と性質を語る
3. 月支との関係(旺衰・季節)と性格の特徴
4. 月干・年干・時干の通変星とその生活翻訳
5. 日支の十二運と蔵干、その情緒的意味
6. 五行バランス(欠けた五行があれば、その渇望と MBTI への影響)
7. MBTI の各要素(I/E、N/S、F/T、J/P、A/T)を命式の具体要素に結びつける
8. 最後の一文で全体像を詩的な比喩で総括し、語尾を「〜ンダよ」で結ぶ

### 【相手 鑑定】(約 1,100〜1,300 字)
同様の構造で相手の鑑定。

### 【相性鑑定】(約 1,400〜1,600 字、見出しに副題)
副題の例:「丁壬の縁 ― 火と水の究極の結合」
1. 2 人の日干関係と古典用語を冒頭で提示
2. 古典の名称(仁寿の合等)を引用して縁の深さを語る
3. 「欠けを補う」構造があれば明示
4. 女→男の通変星と男→女の通変星の対称性
5. 日支の関係(六合/三合/冲/害/破/中立)
6. MBTI の補完関係
7. 必須: 2 人の日常のワンシーン描写
8. 結論を総合点のトーン方針に沿って断定
9. 最後の一文で「〜ンダよ」で結ぶ

## 禁止事項
- 離婚・死別・不幸を予言しない
- 相手を貶める表現を使わない
- 顔や外見、既婚歴・過去の恋愛歴を言及しない
- 具体時期(3 ヶ月後、1 年後等)を頻発しない
- AI であることを出力に漏らさない
- 前置きや「承知しました」等を書かない
- 最後に「どの側面をより詳しく見ますか?」等、継続を促す一文を書かない`;

// ==========================================================
// ユーザープロンプト組み立て
// ==========================================================
function buildUserPrompt(self, partner, hints, relation, totalScore, tier) {
  return `以下の 2 人の命式とプロフィールから、3 部構成の鑑定文を生成してください。

【本人 self】
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

【相手 partner】
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

【2 人の関係ヒント(事前計算)】
- 日干関係: ${hints.gogyoRel || '不明'}
- 干合判定: ${hints.gokanResult || 'なし'}
- 日支関係: ${hints.nichishiRel || '不明'}
- 喜神一致度: ${hints.kishinMatch || 'neutral'}
- MBTI 相性ラベル: ${hints.mbtiCompatLabel || '不明'}

【スコア情報(重要・トーン指示)】
- 総合点: ${totalScore}/100
- トーン区分: ${tier}
- 内訳: 宿命の縁 ${hints.bcs_n || '?'} / 引き合う力 ${hints.hik_n || '?'} / MBTI ${hints.mbt_n || '?'} / 恋愛運 ${hints.newLove || '?'}

【続柄】
${relation}

以上のデータを正確に反映し、システムプロンプトで指定された 3 部構成で、総合点のトーンに合った鑑定文を生成してください。`;
}

// ==========================================================
// トーン区分判定
// ==========================================================
function getTier(totalScore) {
  if (totalScore >= 85) return 'かなり良い';
  if (totalScore >= 76) return '良いめ';
  if (totalScore >= 61) return '普通';
  return '厳しめ';
}

// ==========================================================
// メインハンドラ
// ==========================================================
export default async function handler(req) {
  // CORS (同一オリジンなら不要だが念のため)
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
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // API キーの存在確認
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'ANTHROPIC_API_KEY is not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json();
    const { self, partner, hints, relation, totalScore } = body;

    // 必須フィールドのバリデーション
    if (!self || !partner || !hints || !relation || totalScore === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const tier = getTier(totalScore);

    // ==========================================================
    // キャッシュチェック
    // ==========================================================
    const cacheKey = await generateCacheKey(self, partner, relation);

    try {
      const cached = await kv.get(cacheKey);
      if (cached && typeof cached === 'string' && cached.length > 100) {
        // キャッシュヒット: 即座に全文を返す(ストリーミング形式で)
        console.log(`[Cache HIT] key=${cacheKey.slice(0, 20)}...`);

        const encoderHit = new TextEncoder();
        const readableHit = new ReadableStream({
          start(controller) {
            // 全文を 1 チャンクとして送る
            const data = JSON.stringify({ type: 'text', text: cached });
            controller.enqueue(encoderHit.encode(`data: ${data}\n\n`));

            const done = JSON.stringify({ type: 'done', cached: true });
            controller.enqueue(encoderHit.encode(`data: ${done}\n\n`));
            controller.close();
          },
        });

        return new Response(readableHit, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Cache': 'HIT',
          },
        });
      }
      console.log(`[Cache MISS] key=${cacheKey.slice(0, 20)}...`);
    } catch (cacheError) {
      console.error('[Cache Error]', cacheError);
      // キャッシュ読み込み失敗時は通常生成に進む(サービス継続)
    }

    const userPrompt = buildUserPrompt(self, partner, hints, relation, totalScore, tier);

    // Anthropic SDK の初期化
    const client = new Anthropic({ apiKey });

    // ストリーミングでリクエスト
    const stream = await client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8000,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        { role: 'user', content: userPrompt },
      ],
    });

    // SSE レスポンスとしてクライアントに中継
    const encoder = new TextEncoder();
    let fullText = '';  // 生成された全文を蓄積(キャッシュ保存用)

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              fullText += event.delta.text;  // 蓄積
              const data = JSON.stringify({ type: 'text', text: event.delta.text });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }

          // ==========================================================
          // 生成完了時にキャッシュに保存(30 日間 TTL)
          // ==========================================================
          if (fullText.length > 100) {
            try {
              await kv.set(cacheKey, fullText, { ex: 60 * 60 * 24 * 30 });  // 30 日
              console.log(`[Cache SET] key=${cacheKey.slice(0, 20)}..., length=${fullText.length}`);
            } catch (cacheErr) {
              console.error('[Cache Save Error]', cacheErr);
              // キャッシュ保存失敗時も処理は続行
            }
          }

          // 完了通知
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
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    console.error('Generate reading error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
