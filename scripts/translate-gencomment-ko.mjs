// ══════════════════════════════════════════════════════════════
// genComment() の100+ 運勢コメントを DeepL で韓国語翻訳
// src/App.jsx の _genCommentJa(...) から return 文字列を抽出
// → DeepL → src/i18n/translations.js + src/data/translations.js の両方に追記
// 実行: DEEPL_API_KEY=xxx node scripts/translate-gencomment-ko.mjs
// ══════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const apiKey = process.env.DEEPL_API_KEY;
if (!apiKey) {
  console.error('❌ DEEPL_API_KEY 環境変数が未設定です。');
  process.exit(1);
}

const DEEPL_ENDPOINT = 'https://api-free.deepl.com/v2/translate';
const BATCH_SIZE = 50;
const WAIT_MS = 1000;
const APP_JSX = path.join(ROOT, 'src', 'App.jsx');
const I18N_PATH = path.join(ROOT, 'src', 'i18n', 'translations.js');
const DATA_PATH = path.join(ROOT, 'src', 'data', 'translations.js');

// ── _genCommentJa の return 文字列を抽出 ───────────────────
function extractReturnStrings() {
  const src = fs.readFileSync(APP_JSX, 'utf-8').split('\n');
  const fnStart = src.findIndex(l => /function _genCommentJa\s*\(/.test(l));
  if (fnStart < 0) throw new Error('_genCommentJa が見つかりません');

  // 関数末尾まで（ブレースカウント）
  let depth = 0, started = false, end = -1;
  for (let i = fnStart; i < src.length; i++) {
    for (const ch of src[i]) {
      if (ch === '{') { depth++; started = true; }
      else if (ch === '}') {
        depth--;
        if (started && depth === 0) { end = i; break; }
      }
    }
    if (end >= 0) break;
  }
  if (end < 0) throw new Error('_genCommentJa の終端が見つかりません');

  const body = src.slice(fnStart, end + 1);
  const strs = new Set();
  for (const line of body) {
    // return '...' パターン（シングルクォート、\' エスケープ対応）
    const m = line.match(/return\s+'((?:[^'\\]|\\.)*)'\s*;/);
    if (m) {
      const unescaped = m[1].replace(/\\'/g, "'");
      if (unescaped.trim().length > 0) strs.add(unescaped);
    }
  }
  return [...strs];
}

// ── DeepL ─────────────────────────────────────────────────
async function translateBatch(texts) {
  const res = await fetch(DEEPL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `DeepL-Auth-Key ${apiKey}`,
    },
    body: JSON.stringify({ text: texts, source_lang: 'JA', target_lang: 'KO' }),
  });
  if (!res.ok) throw new Error(`DeepL ${res.status}: ${(await res.text()).substring(0, 400)}`);
  const json = await res.json();
  return json.translations.map(t => t.text);
}

async function translateAll(texts) {
  const out = new Array(texts.length);
  const batches = Math.ceil(texts.length / BATCH_SIZE);
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    process.stdout.write(`  バッチ ${Math.floor(i/BATCH_SIZE)+1}/${batches} (${batch.length}件)... `);
    const t = await translateBatch(batch);
    for (let j = 0; j < t.length; j++) out[i + j] = t[j];
    console.log('✓');
    if (i + BATCH_SIZE < texts.length) await new Promise(r => setTimeout(r, WAIT_MS));
  }
  return out;
}

// ── 翻訳辞書ファイルへの追記 ────────────────────────────
function appendToDictFile(filePath, entries, { objectStart, objectEnd }) {
  let src = fs.readFileSync(filePath, 'utf-8');
  const endIdx = src.indexOf(objectEnd);
  if (endIdx < 0) throw new Error(`${filePath} で "${objectEnd}" が見つかりません`);

  // 各エントリを追加。既にキーが存在する場合はスキップ
  const addition = [];
  for (const { ja, kr } of entries) {
    // シングルクォート・バックスラッシュのエスケープ
    const jaEsc = ja.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const krEsc = kr.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    // 既に存在するか確認
    if (src.includes(`'${jaEsc}':`)) continue;
    addition.push(`    '${jaEsc}':{kr:'${krEsc}',cn:'',en:''},`);
  }
  if (addition.length === 0) return { added: 0 };

  // objectEnd の直前に挿入
  const marker = '    // ── genComment() 運勢コメント翻訳（自動生成） ──\n';
  const block = marker + addition.join('\n') + '\n';
  src = src.substring(0, endIdx) + block + src.substring(endIdx);
  fs.writeFileSync(filePath, src, 'utf-8');
  return { added: addition.length };
}

// ── メイン ────────────────────────────────────────────────
async function main() {
  console.log('━'.repeat(60));
  console.log('  genComment() 運勢コメント JA → KO 翻訳');
  console.log('━'.repeat(60));

  console.log('\n[1/3] _genCommentJa の return 文字列を抽出...');
  const jaList = extractReturnStrings();
  console.log(`  抽出件数: ${jaList.length}件 (ユニーク)`);

  if (jaList.length === 0) {
    console.error('❌ 抽出失敗');
    process.exit(1);
  }

  console.log('\n[2/3] DeepL 翻訳...');
  const krList = await translateAll(jaList);
  const entries = jaList.map((ja, i) => ({ ja, kr: krList[i] }));

  console.log('\n[3/3] 翻訳辞書ファイルへ追記...');
  // i18n/translations.js は `};` がオブジェクト末尾
  const r1 = appendToDictFile(I18N_PATH, entries, { objectEnd: '\n};' });
  console.log(`  src/i18n/translations.js: +${r1.added}件`);
  // data/translations.js は `\n  };` がオブジェクト末尾
  const r2 = appendToDictFile(DATA_PATH, entries, { objectEnd: '\n  };' });
  console.log(`  src/data/translations.js: +${r2.added}件`);

  console.log('\n✅ 完了！');
}

main().catch(err => {
  console.error('\n❌ エラー:', err.message);
  if (err.stack) console.error(err.stack.split('\n').slice(0, 5).join('\n'));
  process.exit(1);
});
