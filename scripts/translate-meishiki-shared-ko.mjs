// ══════════════════════════════════════════════════════════════
// meishikiSharedTexts.js の JA データを DeepL で韓国語翻訳
//   ・GOGYO_TRAITS_JA (5項目 × 3フィールド)
//   ・JUNIU_INFO_SHORT_JA (13項目 × 1フィールド)
//   ・JUNIU_INFO_FULL_JA (14項目 × 2フィールド)
// → 同ファイル内の *_KR 空オブジェクトを上書き生成
// 実行: DEEPL_API_KEY=xxx node scripts/translate-meishiki-shared-ko.mjs
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
const SRC_PATH = path.join(ROOT, 'src', 'data', 'meishikiSharedTexts.js');

async function translateBatch(texts) {
  const res = await fetch(DEEPL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type':'application/json', 'Authorization':`DeepL-Auth-Key ${apiKey}` },
    body: JSON.stringify({ text: texts, source_lang: 'JA', target_lang: 'KO' }),
  });
  if (!res.ok) throw new Error(`DeepL ${res.status}: ${(await res.text()).substring(0, 400)}`);
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

async function main() {
  console.log('━'.repeat(60));
  console.log('  meishikiSharedTexts 共通データ JA → KO 翻訳');
  console.log('━'.repeat(60));

  console.log('\n[1/3] JAデータを import...');
  const mod = await import('file://' + SRC_PATH);
  const { GOGYO_TRAITS_JA, JUNIU_INFO_SHORT_JA, JUNIU_INFO_FULL_JA } = mod;

  // 翻訳対象を平坦化（各項目を {path, text} ペアで列挙）
  const allItems = [];
  for (const [k, v] of Object.entries(GOGYO_TRAITS_JA)) {
    allItems.push({ section: 'gogyo', key: k, field: 'trait',  text: v.trait });
    allItems.push({ section: 'gogyo', key: k, field: 'weak',   text: v.weak });
    allItems.push({ section: 'gogyo', key: k, field: 'supply', text: v.supply });
  }
  for (const [k, v] of Object.entries(JUNIU_INFO_SHORT_JA)) {
    allItems.push({ section: 'short', key: k, field: 'desc', text: v.desc });
  }
  for (const [k, v] of Object.entries(JUNIU_INFO_FULL_JA)) {
    allItems.push({ section: 'full', key: k, field: 'phase', text: v.phase });
    allItems.push({ section: 'full', key: k, field: 'desc',  text: v.desc });
  }
  console.log(`  合計 ${allItems.length}件`);

  console.log('\n[2/3] DeepL 翻訳...');
  const krTexts = await translateAll(allItems.map(x => x.text), '全項目');

  console.log('\n[3/3] meishikiSharedTexts.js の *_KR を更新...');
  // セクション別に結果を組み立て
  const gogyoKr = {}, shortKr = {}, fullKr = {};
  allItems.forEach((item, i) => {
    const kr = krTexts[i];
    if (item.section === 'gogyo') {
      if (!gogyoKr[item.key]) gogyoKr[item.key] = {};
      gogyoKr[item.key][item.field] = kr;
    } else if (item.section === 'short') {
      if (!shortKr[item.key]) shortKr[item.key] = {};
      shortKr[item.key][item.field] = kr;
    } else if (item.section === 'full') {
      if (!fullKr[item.key]) fullKr[item.key] = {};
      fullKr[item.key][item.field] = kr;
    }
  });

  // JS リテラル化
  const esc = s => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');

  function buildGogyoKr() {
    let out = 'export const GOGYO_TRAITS_KR = {\n';
    for (const k of Object.keys(gogyoKr)) {
      out += `  ${k}: {\n`;
      out += `    trait:  '${esc(gogyoKr[k].trait)}',\n`;
      out += `    weak:   '${esc(gogyoKr[k].weak)}',\n`;
      out += `    supply: '${esc(gogyoKr[k].supply)}',\n`;
      out += `  },\n`;
    }
    out += '};';
    return out;
  }
  function buildShortKr() {
    let out = 'export const JUNIU_INFO_SHORT_KR = {\n';
    for (const k of Object.keys(shortKr)) {
      out += `  '${k}': { desc: '${esc(shortKr[k].desc)}' },\n`;
    }
    out += '};';
    return out;
  }
  function buildFullKr() {
    let out = 'export const JUNIU_INFO_FULL_KR = {\n';
    for (const k of Object.keys(fullKr)) {
      out += `  '${k}': { phase: '${esc(fullKr[k].phase)}', desc: '${esc(fullKr[k].desc)}' },\n`;
    }
    out += '};';
    return out;
  }

  // 既存ファイルの *_KR 空オブジェクトを置換
  let src = fs.readFileSync(SRC_PATH, 'utf-8');
  src = src.replace(/export const GOGYO_TRAITS_KR = \{[\s\S]*?\};/, buildGogyoKr());
  src = src.replace(/export const JUNIU_INFO_SHORT_KR = \{[\s\S]*?\};/, buildShortKr());
  src = src.replace(/export const JUNIU_INFO_FULL_KR = \{[\s\S]*?\};/, buildFullKr());
  fs.writeFileSync(SRC_PATH, src, 'utf-8');

  console.log(`  GOGYO_TRAITS_KR: ${Object.keys(gogyoKr).length}項目`);
  console.log(`  JUNIU_INFO_SHORT_KR: ${Object.keys(shortKr).length}項目`);
  console.log(`  JUNIU_INFO_FULL_KR: ${Object.keys(fullKr).length}項目`);
  console.log(`\n✅ 完了！`);
}

main().catch(err => {
  console.error('\n❌ エラー:', err.message);
  if (err.stack) console.error(err.stack.split('\n').slice(0, 5).join('\n'));
  process.exit(1);
});
