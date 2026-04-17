import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';

const client = new Anthropic();

const TYPES = ['INFP','ENFP','INFJ','ENFJ','INTJ','ENTJ','INTP','ENTP',
               'ISFP','ESFP','ISTP','ESTP','ISFJ','ESFJ','ISTJ','ESTJ'];

const DESC = {
  INFP: '詩人肌で親切な理想主義者。豊かな内面世界と深い共感力を持ち、価値観に従って生きる。創造的な自己表現を好み、大義のために献身する。',
  ENFP: '情熱的で創造力あふれる自由人。可能性を見る目と人を鼓舞する力を持ち、新しいアイデアへの好奇心が尽きない。',
  INFJ: '寡黙で洞察力鋭い提唱者。人間の心理を深く読み解き、理想実現に向けて行動する。強い共感力と価値観を持つ。',
  ENFJ: 'カリスマ的リーダー。人々の可能性を見抜き鼓舞する。感情的知性が高く調和を大切にする。',
  INTJ: '戦略的な建築家。長期ビジョンと論理で複雑な問題を解く。独立心が強く効率を追求する。',
  ENTJ: '強い意志を持つ指揮官。目標に向かって人を動かすリーダー。論理的で決断力がある。',
  INTP: '革新的な論理学者。知識欲旺盛で複雑な理論の分析に喜びを見出す。独創的な思考を持つ。',
  ENTP: '機知に富む討論者。知的好奇心でアイデアを多角的に探求する。議論を楽しむ。',
  ISFP: '魅力的なアドベンチャラー。感性豊かで現在の瞬間を大切にし、芸術や自然に深く共感する。',
  ESFP: 'エネルギッシュなエンターテイナー。楽観的で社交的、人々を楽しませることに喜びを感じる。',
  ISTP: '実際的な職人。問題解決が得意であらゆるツールを直感的に扱う。冷静で効率的。',
  ESTP: '観察力鋭いアントレプレナー。行動力があり実体験から素早く学ぶ。社交的でリスクを恐れない。',
  ISFJ: '献身的な擁護者。大切な人を守るために行動し、細やかな気配りで周りを支える。',
  ESFJ: '温かい領事。人々の調和と幸福を第一に考え、周りを気にかける社交的な存在。',
  ISTJ: '信頼できるロジスティシャン。事実重視で約束を必ず守る責任感の持ち主。',
  ESTJ: '有能な管理者。秩序とルールで組織をまとめ、目標達成に向けて行動する。'
};

const COMPAT = {
  INFP:{INFP:5,ENFP:5,INFJ:5,ENFJ:5,INTJ:4,ENTJ:4,INTP:5,ENTP:4,ISFP:2,ESFP:1,ISTP:1,ESTP:1,ISFJ:2,ESFJ:1,ISTJ:1,ESTJ:1},
  ENFP:{INFP:5,ENFP:5,INFJ:4,ENFJ:5,INTJ:4,ENTJ:2,INTP:5,ENTP:5,ISFP:1,ESFP:2,ISTP:1,ESTP:2,ISFJ:1,ESFJ:2,ISTJ:1,ESTJ:1},
  INFJ:{INFP:5,ENFP:4,INFJ:5,ENFJ:5,INTJ:5,ENTJ:4,INTP:5,ENTP:4,ISFP:1,ESFP:1,ISTP:1,ESTP:1,ISFJ:5,ESFJ:2,ISTJ:1,ESTJ:1},
  ENFJ:{INFP:5,ENFP:5,INFJ:5,ENFJ:5,INTJ:4,ENTJ:4,INTP:4,ENTP:5,ISFP:2,ESFP:2,ISTP:1,ESTP:2,ISFJ:5,ESFJ:5,ISTJ:2,ESTJ:2},
  INTJ:{INFP:4,ENFP:4,INFJ:5,ENFJ:4,INTJ:5,ENTJ:5,INTP:5,ENTP:5,ISFP:1,ESFP:1,ISTP:2,ESTP:1,ISFJ:1,ESFJ:1,ISTJ:2,ESTJ:1},
  ENTJ:{INFP:4,ENFP:2,INFJ:4,ENFJ:4,INTJ:5,ENTJ:5,INTP:5,ENTP:5,ISFP:1,ESFP:1,ISTP:2,ESTP:2,ISFJ:1,ESFJ:1,ISTJ:2,ESTJ:2},
  INTP:{INFP:5,ENFP:5,INFJ:5,ENFJ:4,INTJ:5,ENTJ:5,INTP:5,ENTP:5,ISFP:1,ESFP:1,ISTP:2,ESTP:2,ISFJ:1,ESFJ:1,ISTJ:1,ESTJ:1},
  ENTP:{INFP:4,ENFP:5,INFJ:4,ENFJ:5,INTJ:5,ENTJ:5,INTP:5,ENTP:5,ISFP:1,ESFP:2,ISTP:2,ESTP:2,ISFJ:1,ESFJ:2,ISTJ:1,ESTJ:1},
  ISFP:{INFP:2,ENFP:1,INFJ:1,ENFJ:2,INTJ:1,ENTJ:1,INTP:1,ENTP:1,ISFP:5,ESFP:5,ISTP:5,ESTP:5,ISFJ:5,ESFJ:4,ISTJ:4,ESTJ:2},
  ESFP:{INFP:1,ENFP:2,INFJ:1,ENFJ:2,INTJ:1,ENTJ:1,INTP:1,ENTP:2,ISFP:5,ESFP:5,ISTP:4,ESTP:5,ISFJ:4,ESFJ:5,ISTJ:2,ESTJ:5},
  ISTP:{INFP:1,ENFP:1,INFJ:1,ENFJ:1,INTJ:2,ENTJ:2,INTP:2,ENTP:2,ISFP:5,ESFP:4,ISTP:5,ESTP:5,ISFJ:4,ESFJ:4,ISTJ:5,ESTJ:5},
  ESTP:{INFP:1,ENFP:2,INFJ:1,ENFJ:2,INTJ:1,ENTJ:2,INTP:2,ENTP:2,ISFP:5,ESFP:5,ISTP:5,ESTP:5,ISFJ:2,ESFJ:5,ISTJ:5,ESTJ:5},
  ISFJ:{INFP:2,ENFP:1,INFJ:5,ENFJ:5,INTJ:1,ENTJ:1,INTP:1,ENTP:1,ISFP:5,ESFP:4,ISTP:4,ESTP:2,ISFJ:5,ESFJ:5,ISTJ:5,ESTJ:5},
  ESFJ:{INFP:1,ENFP:2,INFJ:2,ENFJ:5,INTJ:1,ENTJ:1,INTP:1,ENTP:2,ISFP:4,ESFP:5,ISTP:4,ESTP:5,ISFJ:5,ESFJ:5,ISTJ:4,ESTJ:5},
  ISTJ:{INFP:1,ENFP:1,INFJ:1,ENFJ:2,INTJ:2,ENTJ:2,INTP:1,ENTP:1,ISFP:4,ESFP:2,ISTP:5,ESTP:5,ISFJ:5,ESFJ:4,ISTJ:5,ESTJ:5},
  ESTJ:{INFP:1,ENFP:1,INFJ:1,ENFJ:2,INTJ:1,ENTJ:2,INTP:1,ENTP:1,ISFP:2,ESFP:5,ISTP:5,ESTP:5,ISFJ:5,ESFJ:5,ISTJ:5,ESTJ:5}
};

const LEVEL = {
  5: 'Very compatible（深い共鳴・N同士またはS同士で価値観の軸が一致）',
  4: 'Compatible（良い縁・共通の世界観があり補い合える）',
  2: 'Somewhat（努力が必要・違いを意識的に乗り越える必要がある）',
  1: 'Incompatible（根本的な違い・N×Sで情報処理の軸が根本的に異なる）'
};

// 120ユニークペアを生成
function getPairs() {
  const pairs = [];
  const seen = new Set();
  for (const a of TYPES) {
    for (const b of TYPES) {
      if (a === b) continue;
      const key = [a,b].sort().join('_');
      if (!seen.has(key)) { seen.add(key); pairs.push([a,b]); }
    }
  }
  return pairs;
}

async function generatePair(t1, t2) {
  const raw = COMPAT[t1]?.[t2] || 2;
  const lv = LEVEL[raw] || LEVEL[2];

  const prompt = `あなたはパンダキャラクター「ポポ」として、MBTIの相性テキストを書きます。
語尾は「んダ」「んダよ」「んダよ🐼」を使ってください。
「あなた」は${t1}、「相手」は${t2}です。

【${t1}の特徴】${DESC[t1]}
【${t2}の特徴】${DESC[t2]}
【相性レベル】${lv}

以下の4フィールドをそれぞれ80〜200文字で書いてください。
相性レベルに忠実なトーンで（Incompatibleなら課題を正直に伝え、Very compatibleなら深い共鳴を表現）。

JSONのみ返答（説明文なし・マークダウン不要）:
{"title":"（${t1}と${t2}の関係タイトル、10文字以内）","attraction":"（引き合う理由）","friction":"（すれ違いの根本）","growthKey":"（成長のカギ）","best":"（2人が深くつながる瞬間）"}`;

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }]
  });

  const text = msg.content[0].text.trim();
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('JSON not found: ' + text.substring(0, 100));
  return JSON.parse(m[0]);
}

async function main() {
  const pairs = getPairs();
  const results = {};
  const outFile = './scripts/mbti-pairs-generated.json';

  // 既存ファイルがあれば読み込んで再開
  if (fs.existsSync(outFile)) {
    Object.assign(results, JSON.parse(fs.readFileSync(outFile, 'utf8')));
    console.log(`再開: ${Object.keys(results).length}件読み込み済み`);
  }

  for (let i = 0; i < pairs.length; i++) {
    const [a, b] = pairs[i];
    const key = `${a}_${b}`;
    if (results[key]) {
      console.log(`スキップ: ${key}`);
      continue;
    }

    console.log(`[${i+1}/${pairs.length}] ${a} × ${b} 生成中...`);
    try {
      results[key] = await generatePair(a, b);
      // 逆順も同じデータをコピー
      results[`${b}_${a}`] = results[key];
      console.log(`✓ ${key}: ${results[key].title}`);

      // 10件ごとに中間保存
      if (i % 10 === 0) {
        fs.writeFileSync(outFile, JSON.stringify(results, null, 2));
      }

      await new Promise(r => setTimeout(r, 500));
    } catch(e) {
      console.error(`✗ ${key}: ${e.message}`);
      await new Promise(r => setTimeout(r, 3000));
      i--; // リトライ
    }
  }

  // 最終保存
  fs.writeFileSync(outFile, JSON.stringify(results, null, 2));
  console.log(`\n完了！ ${Object.keys(results).length}件生成`);
  console.log(`保存先: ${outFile}`);
}

main().catch(console.error);
