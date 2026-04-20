// ══════════════════════════════════════════════════════════════
// 鑑定まとめテキストの日本語→韓国語翻訳スクリプト
// App.jsx から NIKCHU_SELF_PROFILES / JUNIU_NATURE を抽出して DeepL で翻訳
// 実行: DEEPL_API_KEY=xxx node scripts/translate-meishiki-ko.mjs
// 出力: src/data/meishikiTextsKr.js
// ══════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const apiKey = process.env.DEEPL_API_KEY;
if (!apiKey) {
  console.error('❌ DEEPL_API_KEY 環境変数が未設定です。');
  console.error('   例: DEEPL_API_KEY=xxxxx node scripts/translate-meishiki-ko.mjs');
  process.exit(1);
}

const DEEPL_ENDPOINT = 'https://api-free.deepl.com/v2/translate';
const BATCH_SIZE = 50;
const WAIT_MS = 1000;
const APP_JSX = path.join(ROOT, 'src', 'App.jsx');
const OUT_PATH = path.join(ROOT, 'src', 'data', 'meishikiTextsKr.js');

// ── App.jsx からオブジェクトリテラルを抽出 ───────────────────
function extractObjectBlock(src, declaration) {
  const idx = src.indexOf(declaration);
  if (idx < 0) throw new Error(`宣言 "${declaration}" が見つかりません`);
  const braceStart = src.indexOf('{', idx);
  let depth = 0, i = braceStart, inStr = false, q = null, esc = false, inTpl = false;
  while (i < src.length) {
    const ch = src[i];
    if (esc) { esc = false; }
    else if (ch === '\\') esc = true;
    else if (inStr) {
      if (ch === q) { inStr = false; q = null; }
    } else if (inTpl) {
      if (ch === '`') inTpl = false;
    } else if (ch === '`') { inTpl = true; }
    else if (ch === '"' || ch === "'") { inStr = true; q = ch; }
    else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) { i++; break; }
    }
    i++;
  }
  return src.substring(braceStart, i);
}

// { 'キー': 'テキスト', ... } から {key, text} 配列を作る
function parseKeyTextEntries(block) {
  // シングルクォート内にシングルクォートが含まれるケースを考慮したパース
  // 簡易版: 行単位で 'KEY': 'VAL' パターンをマッチ
  const entries = [];
  const lines = block.split('\n');
  for (const line of lines) {
    const m = line.match(/^\s*'([^']+)'\s*:\s*'((?:[^'\\]|\\.)*)'\s*,?\s*$/);
    if (m) {
      // \n や \' のアンエスケープ
      const text = m[2].replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      entries.push({ key: m[1], text });
    }
  }
  return entries;
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
    }),
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
  console.log('  鑑定まとめ JA → KO 一括翻訳');
  console.log('━'.repeat(60));

  console.log('\n[1/3] ソース抽出 (src/App.jsx)...');
  const appSrc = fs.readFileSync(APP_JSX, 'utf-8');
  const profilesBlock = extractObjectBlock(appSrc, 'const NIKCHU_SELF_PROFILES = ');
  const juniuBlock = extractObjectBlock(appSrc, 'const JUNIU_NATURE = ');
  const profileEntries = parseKeyTextEntries(profilesBlock);
  const juniuEntries = parseKeyTextEntries(juniuBlock);
  console.log(`  NIKCHU_SELF_PROFILES: ${profileEntries.length}件`);
  console.log(`  JUNIU_NATURE: ${juniuEntries.length}件`);

  if (profileEntries.length === 0 || juniuEntries.length === 0) {
    console.error('❌ エントリ抽出に失敗しました。手動確認が必要です。');
    process.exit(1);
  }

  console.log('\n[2/3] DeepL 翻訳...');
  const profileTexts = profileEntries.map(e => e.text);
  const juniuTexts = juniuEntries.map(e => e.text);
  const profileKo = await translateAll(profileTexts, 'NIKCHU_SELF_PROFILES');
  const juniuKo = await translateAll(juniuTexts, 'JUNIU_NATURE');

  console.log('\n[3/3] meishikiTextsKr.js の NIKCHU/JUNIU セクションを更新（テンプレート関数は保持）...');
  // JS エスケープ
  const esc = s => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');

  let profilesBlockStr = 'export const NIKCHU_SELF_PROFILES_KR = {\n';
  for (let i = 0; i < profileEntries.length; i++) {
    profilesBlockStr += `  '${profileEntries[i].key}': '${esc(profileKo[i])}',\n`;
  }
  profilesBlockStr += '};';

  let juniuBlockStr = 'export const JUNIU_NATURE_KR = {\n';
  for (let i = 0; i < juniuEntries.length; i++) {
    juniuBlockStr += `  '${juniuEntries[i].key}': '${esc(juniuKo[i])}',\n`;
  }
  juniuBlockStr += '};';

  // 既存ファイルがあれば NIKCHU/JUNIU セクションだけを上書き（テンプレート関数は保持）
  let fileExists = false;
  let existingContent = '';
  try { existingContent = fs.readFileSync(OUT_PATH, 'utf-8'); fileExists = true; } catch {}

  if (fileExists && existingContent.includes('export const NIKCHU_SELF_PROFILES_KR')
                 && existingContent.includes('export const JUNIU_NATURE_KR')) {
    // 既存の NIKCHU_SELF_PROFILES_KR = {...}; を置換
    const profRe = /export const NIKCHU_SELF_PROFILES_KR = \{[\s\S]*?\};/;
    existingContent = existingContent.replace(profRe, profilesBlockStr);
    const juniuRe = /export const JUNIU_NATURE_KR = \{[\s\S]*?\};/;
    existingContent = existingContent.replace(juniuRe, juniuBlockStr);
    fs.writeFileSync(OUT_PATH, existingContent, 'utf-8');
    console.log('  既存ファイルの該当セクションのみ上書き（テンプレート関数は保持）');
  } else {
    // 新規作成
    const header = '// ════════════════════════════════════════════════════════════════\n'
      + '// 鑑定まとめテキスト（韓国語版）— DeepL API 自動生成\n'
      + `// 生成日時: ${new Date().toISOString()}\n`
      + '// ════════════════════════════════════════════════════════════════\n\n';
    fs.writeFileSync(OUT_PATH, header + profilesBlockStr + '\n\n' + juniuBlockStr + '\n', 'utf-8');
    console.log('  新規ファイルを作成（テンプレート関数は App.jsx 側で手動追加してください）');
  }
  console.log(`\n✅ 完了！ 出力先: ${OUT_PATH}`);
  console.log(`   NIKCHU_SELF_PROFILES_KR: ${profileEntries.length}件`);
  console.log(`   JUNIU_NATURE_KR: ${juniuEntries.length}件`);
}

main().catch(err => {
  console.error('\n❌ エラー:', err.message);
  if (err.stack) console.error(err.stack.split('\n').slice(0, 5).join('\n'));
  process.exit(1);
});
