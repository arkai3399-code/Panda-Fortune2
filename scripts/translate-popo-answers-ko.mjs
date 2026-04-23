// ══════════════════════════════════════════════════════════════
// generatePopoAnswer 内の全 JA 文字列リテラルを抽出 → DeepL で
// JA→KO 翻訳 → src/data/popoAnswersKr.js を生成。
//
// 実行: DEEPL_API_KEY=xxx node scripts/translate-popo-answers-ko.mjs
//
// ・src/components/tabs/AiChatTab.jsx を AST パース
// ・関数 generatePopoAnswer 内の StringLiteral / TemplateLiteral quasi
//   から JA を含むものを収集（純粋な漢字キーは除外）
// ・DeepL に 50件ずつバッチ送信、1秒ウェイト
// ・出力: src/data/popoAnswersKr.js
//   export const POPO_ANSWERS_JA_TO_KR = { '<ja>': '<kr>', ... }
//   export function translatePopoAnswer(jaText): string
//
// 実行後、AiChatTab.jsx 側で `import { translatePopoAnswer } from
// '../../data/popoAnswersKr.js';` し、KR モードでは
// `translatePopoAnswer(generatePopoAnswer(...))` で後処理する。
// ══════════════════════════════════════════════════════════════

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as parser from '@babel/parser';
import _traverse from '@babel/traverse';

const traverse = _traverse.default || _traverse;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const apiKey = process.env.DEEPL_API_KEY;
if (!apiKey) {
  console.error('❌ DEEPL_API_KEY 環境変数が設定されていません。');
  console.error('   例: DEEPL_API_KEY=xxxxx node scripts/translate-popo-answers-ko.mjs');
  process.exit(1);
}

const DEEPL_ENDPOINT = 'https://api-free.deepl.com/v2/translate';
const BATCH_SIZE = 50;
const WAIT_MS = 1000;
const SRC_PATH = path.join(ROOT, 'src', 'components', 'tabs', 'AiChatTab.jsx');
const OUT_PATH = path.join(ROOT, 'src', 'data', 'popoAnswersKr.js');
const TARGET_FN  = 'generatePopoAnswer';
const MIN_JA_LEN = 3; // この長さ未満の JA はスキップ（識別子的な短い漢字を避ける）

// ── JA を含むかどうかの判定 ────────────────────────────────
// Hiragana, katakana (excl. 常用 katakana 単独漢字), 句読点・絵文字付きJA を許容
// 純粋な漢字のみの短い文字列（"甲", "比肩" 等のキー）は除外する
function isMeaningfulJaText(s) {
  if (!s || typeof s !== 'string') return false;
  if (s.length < MIN_JA_LEN) return false;
  // ひらがなを含む、もしくは「ン」「ダ」を含む（ポポ語尾）、もしくは「ンダ」「んダ」「だよ」を含む
  // 純粋な漢字列は識別子なのでスキップ
  const hasHiragana = /[ぁ-んー]/.test(s);
  const hasPopoEnd  = /[ンダ]|んダ|ンダ|だよ/.test(s);
  if (!hasHiragana && !hasPopoEnd) return false;
  // ASCII のみ + 一文字の漢字などは除外（既に上で漢字のみは弾いている）
  return true;
}

// ── DeepL 呼び出し ─────────────────────────────────────────
async function translateBatch(texts) {
  const res = await fetch(DEEPL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `DeepL-Auth-Key ${apiKey}`,
    },
    body: JSON.stringify({
      text: texts,
      source_lang: 'JA',
      target_lang: 'KO',
      // 句読点や絵文字を保持しやすいように tag_handling を無効化
      preserve_formatting: true,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`DeepL API エラー ${res.status}: ${body.substring(0, 500)}`);
  }
  const json = await res.json();
  if (!json.translations || !Array.isArray(json.translations)) {
    throw new Error('DeepL レスポンス形式が不正: ' + JSON.stringify(json).substring(0, 300));
  }
  return json.translations.map(t => t.text);
}

async function translateAll(texts) {
  if (texts.length === 0) return [];
  const out = new Array(texts.length);
  const batches = Math.ceil(texts.length / BATCH_SIZE);
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const idx = Math.floor(i / BATCH_SIZE) + 1;
    process.stdout.write(`  バッチ ${idx}/${batches} (${batch.length}件)... `);
    const translated = await translateBatch(batch);
    for (let j = 0; j < translated.length; j++) out[i + j] = translated[j];
    console.log('✓');
    if (i + BATCH_SIZE < texts.length) {
      await new Promise(r => setTimeout(r, WAIT_MS));
    }
  }
  return out;
}

// ── ソース解析 ────────────────────────────────────────────
function collectJaStringsFromGeneratePopoAnswer(srcCode) {
  const ast = parser.parse(srcCode, {
    sourceType: 'module',
    plugins: ['jsx'],
  });

  const collected = new Set();

  traverse(ast, {
    FunctionDeclaration(p) {
      if (!p.node.id || p.node.id.name !== TARGET_FN) return;
      // generatePopoAnswer の内部だけを走査
      p.traverse({
        StringLiteral(sp) {
          const v = sp.node.value;
          if (isMeaningfulJaText(v)) collected.add(v);
        },
        TemplateLiteral(tp) {
          // テンプレートリテラルは quasi 部分（${} の間の文字列）ごとに分割収集
          for (const q of tp.node.quasis) {
            const v = q.value.cooked;
            if (isMeaningfulJaText(v)) collected.add(v);
          }
        },
      });
    },
  });

  return Array.from(collected);
}

// ── 出力ファイル生成 ──────────────────────────────────────
function buildOutputFile(jaToKr) {
  // JS リテラルとして安全にエスケープ
  function esc(s) {
    return JSON.stringify(s);
  }
  // 長い順に並べる（runtime での greedy 置換のため）
  const entries = Object.entries(jaToKr).sort((a, b) => b[0].length - a[0].length);
  const lines = entries.map(([ja, kr]) => `  [${esc(ja)}, ${esc(kr)}]`);
  return `// ════════════════════════════════════════════════════════════════
// 自動生成: scripts/translate-popo-answers-ko.mjs
// generatePopoAnswer 内の JA 文字列を DeepL で KO に翻訳した辞書
// 手動編集禁止（再実行で上書きされます）。
// 生成日時: ${new Date().toISOString()}
// 件数: ${entries.length}
// ════════════════════════════════════════════════════════════════

// 長い順にソート済み（greedy 置換のため変更しないこと）
const ENTRIES = [
${lines.join(',\n')}
];

export const POPO_ANSWERS_JA_TO_KR = Object.fromEntries(ENTRIES);

/**
 * generatePopoAnswer の出力（JA）を KR に変換する。
 * 動的に挿入された変数値（人名/数値など）はそのまま残る。
 * @param {string} jaText
 * @returns {string}
 */
export function translatePopoAnswer(jaText) {
  if (!jaText) return jaText;
  let out = jaText;
  for (const [ja, kr] of ENTRIES) {
    if (!ja || ja === kr) continue;
    if (out.indexOf(ja) >= 0) {
      out = out.split(ja).join(kr);
    }
  }
  return out;
}
`;
}

// ── メイン ────────────────────────────────────────────────
async function main() {
  console.log('━'.repeat(60));
  console.log('  generatePopoAnswer JA → KO 一括翻訳');
  console.log('━'.repeat(60));

  console.log(`\n[1/4] ソース読み込み: ${path.relative(ROOT, SRC_PATH)}`);
  const srcCode = fs.readFileSync(SRC_PATH, 'utf8');
  console.log(`  ${srcCode.length} 文字`);

  console.log(`\n[2/4] AST 解析 → 関数 ${TARGET_FN} 内の JA 文字列を抽出...`);
  const jaStrings = collectJaStringsFromGeneratePopoAnswer(srcCode);
  console.log(`  抽出件数: ${jaStrings.length}`);

  // 既存の出力があれば、未訳分のみ翻訳する（差分実行）
  let existing = {};
  if (fs.existsSync(OUT_PATH)) {
    try {
      const existingMod = await import('file://' + OUT_PATH + '?t=' + Date.now());
      existing = existingMod.POPO_ANSWERS_JA_TO_KR || {};
      console.log(`  既存 KR 訳: ${Object.keys(existing).length}件 (差分実行)`);
    } catch (e) {
      console.log(`  既存ファイル読み込み失敗、全件翻訳します: ${e.message}`);
    }
  }
  const need = jaStrings.filter(s => !existing[s]);
  console.log(`  翻訳対象: ${need.length}件 (既訳 ${jaStrings.length - need.length}件はスキップ)`);

  console.log('\n[3/4] DeepL 翻訳...');
  const translated = await translateAll(need);

  console.log('\n[4/4] 出力ファイル書き出し...');
  const merged = { ...existing };
  for (let i = 0; i < need.length; i++) {
    merged[need[i]] = translated[i];
  }
  // 抽出元から消えた古いキーもそのまま残す（破壊しない）
  const out = buildOutputFile(merged);
  fs.writeFileSync(OUT_PATH, out, 'utf8');
  console.log(`  ✓ ${path.relative(ROOT, OUT_PATH)} (${Object.keys(merged).length}件)`);

  console.log('\n━'.repeat(60));
  console.log('  完了 ✨');
  console.log('━'.repeat(60));
  console.log('\n次のステップ:');
  console.log('  1. AiChatTab.jsx の generatePopoAnswer 呼び出し箇所で');
  console.log('     KR モード時は translatePopoAnswer() で後処理する');
  console.log('  2. npx vite build で型チェック');
  console.log('  3. ブラウザで KR 切替して動作確認');
}

main().catch(e => {
  console.error('\n❌ エラー:', e.message);
  console.error(e.stack);
  process.exit(1);
});
