// ══════════════════════════════════════════════════════════════
// 相性タブの相手プロフィール(NIKCHU_PROFILES 120件)を DeepL で韓国語翻訳
// 実行: DEEPL_API_KEY=xxx node scripts/translate-compatProfiles-ko.mjs
// 出力: src/data/compatDataKr.js
// ══════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const apiKey = process.env.DEEPL_API_KEY;
if (!apiKey) {
  console.error('❌ DEEPL_API_KEY 環境変数が未設定です。');
  console.error('   例: DEEPL_API_KEY=xxxxx node scripts/translate-compatProfiles-ko.mjs');
  process.exit(1);
}

const DEEPL_ENDPOINT = 'https://api-free.deepl.com/v2/translate';
const BATCH_SIZE = 50;
const WAIT_MS = 1000;
const SRC_PATH = path.join(ROOT, 'src', 'compat', 'compatScript.js');
const OUT_PATH = path.join(ROOT, 'src', 'data', 'compatDataKr.js');

// ── ソース抽出 ───────────────────────────────────────────────
function extractBlock(src, declaration) {
  const idx = src.indexOf(declaration);
  if (idx < 0) throw new Error(`"${declaration}" が見つかりません`);
  const bs = src.indexOf('{', idx);
  let d=0, i=bs, inStr=false, q=null, esc=false;
  while (i < src.length) {
    const c = src[i];
    if (esc) esc=false;
    else if (c === '\\') esc=true;
    else if (inStr) { if (c===q) inStr=false; }
    else if (c==='"' || c==="'") { inStr=true; q=c; }
    else if (c==='{') d++;
    else if (c==='}') { d--; if (d===0) { i++; break; } }
    i++;
  }
  return src.substring(bs, i);
}

function parseKeyText(blk) {
  const entries = [];
  const lines = blk.split('\n');
  for (const line of lines) {
    const m = line.match(/^\s*'([^']+)'\s*:\s*'((?:[^'\\]|\\.)*)'\s*,?\s*$/);
    if (m) {
      const text = m[2].replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      entries.push({ key: m[1], text });
    }
  }
  return entries;
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
  if (!res.ok) throw new Error(`DeepL API ${res.status}: ${(await res.text()).substring(0, 400)}`);
  const json = await res.json();
  return json.translations.map(t => t.text);
}

async function translateAll(texts, label) {
  const out = new Array(texts.length);
  const batches = Math.ceil(texts.length / BATCH_SIZE);
  console.log(`  ${label}: ${texts.length}件 (${batches}バッチ)`);
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    process.stdout.write(`    バッチ ${Math.floor(i/BATCH_SIZE)+1}/${batches}... `);
    const t = await translateBatch(batch);
    for (let j = 0; j < t.length; j++) out[i + j] = t[j];
    console.log('✓');
    if (i + BATCH_SIZE < texts.length) await new Promise(r => setTimeout(r, WAIT_MS));
  }
  return out;
}

// ── メイン ────────────────────────────────────────────────
async function main() {
  console.log('━'.repeat(60));
  console.log('  相性 相手プロフィール JA → KO 一括翻訳');
  console.log('━'.repeat(60));

  console.log('\n[1/3] ソース抽出 (src/compat/compatScript.js)...');
  const src = fs.readFileSync(SRC_PATH, 'utf-8');
  const blk = extractBlock(src, 'var NIKCHU_PROFILES = ');
  const entries = parseKeyText(blk);
  console.log(`  NIKCHU_PROFILES: ${entries.length}件`);

  if (entries.length === 0) {
    console.error('❌ エントリ抽出に失敗しました。');
    process.exit(1);
  }

  console.log('\n[2/3] DeepL 翻訳...');
  const texts = entries.map(e => e.text);
  const ko = await translateAll(texts, 'NIKCHU_PROFILES');

  console.log('\n[3/3] compatDataKr.js の NIKCHU_PROFILES_KR を更新...');
  const esc = s => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');

  let newBlock = 'export const NIKCHU_PROFILES_KR = {\n';
  for (let i = 0; i < entries.length; i++) {
    newBlock += `  '${entries[i].key}': '${esc(ko[i])}',\n`;
  }
  newBlock += '};';

  // 既存ファイルがあれば該当セクションのみ上書き
  let fileExists = false, existing = '';
  try { existing = fs.readFileSync(OUT_PATH, 'utf-8'); fileExists = true; } catch {}

  if (fileExists && existing.includes('export const NIKCHU_PROFILES_KR')) {
    const re = /export const NIKCHU_PROFILES_KR = \{[\s\S]*?\};/;
    existing = existing.replace(re, newBlock);
    fs.writeFileSync(OUT_PATH, existing, 'utf-8');
    console.log('  既存ファイルの NIKCHU_PROFILES_KR セクションのみ上書き');
  } else {
    const header = '// ════════════════════════════════════════════════════════════════\n'
      + '// 相性タブ 相手プロフィール（韓国語版）— DeepL API 自動生成\n'
      + `// 生成日時: ${new Date().toISOString()}\n`
      + '// 出典: src/compat/compatScript.js の NIKCHU_PROFILES\n'
      + '// ════════════════════════════════════════════════════════════════\n\n';
    fs.writeFileSync(OUT_PATH, header + newBlock + '\n', 'utf-8');
    console.log('  新規ファイル作成');
  }

  console.log(`\n✅ 完了！ ${OUT_PATH}`);
  console.log(`   NIKCHU_PROFILES_KR: ${entries.length}件`);
}

main().catch(err => {
  console.error('\n❌ エラー:', err.message);
  if (err.stack) console.error(err.stack.split('\n').slice(0, 5).join('\n'));
  process.exit(1);
});
