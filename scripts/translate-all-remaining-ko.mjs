// ══════════════════════════════════════════════════════════════
// 残り日本語データを DeepL で一括翻訳する統合スクリプト
//
// 対象:
//  ✅ Target 1: compatData.js NIKCHU_PROFILES — 既に compatDataKr.js で対応済み（スキップ）
//  🔶 Target 2: mbtiRelationTypes.js (1024+エントリ) → mbtiRelationTypesKr.js 生成
//  🔶 Target 3: compatScript.js 行620-935 の純粋文字列 → 翻訳辞書に追加
//
// 実行:
//   DEEPL_API_KEY=xxx node scripts/translate-all-remaining-ko.mjs
// オプション:
//   SKIP_MBTI=1 : Target 2 をスキップ
//   SKIP_COMPAT=1 : Target 3 をスキップ
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

const MBTI_SRC_PATH   = path.join(ROOT, 'src', 'data', 'mbtiRelationTypes.js');
const MBTI_OUT_PATH   = path.join(ROOT, 'src', 'data', 'mbtiRelationTypesKr.js');
const COMPAT_SRC_PATH = path.join(ROOT, 'src', 'compat', 'compatScript.js');
const I18N_PATH       = path.join(ROOT, 'src', 'i18n', 'translations.js');
const DATA_PATH       = path.join(ROOT, 'src', 'data', 'translations.js');
const CDKR_PATH       = path.join(ROOT, 'src', 'data', 'compatDataKr.js');

// ── DeepL ─────────────────────────────────────────────────
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
  if (texts.length === 0) return [];
  const out = new Array(texts.length);
  const batches = Math.ceil(texts.length / BATCH_SIZE);
  console.log(`  ${label}: ${texts.length}件 (${batches}バッチ)`);
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    process.stdout.write(`    バッチ ${Math.floor(i/BATCH_SIZE)+1}/${batches} (${batch.length}件)... `);
    const t = await translateBatch(batch);
    for (let j = 0; j < t.length; j++) out[i + j] = t[j];
    console.log('✓');
    if (i + BATCH_SIZE < texts.length) await new Promise(r => setTimeout(r, WAIT_MS));
  }
  return out;
}

// ── Target 1 check ─────────────────────────────────────────
async function checkTarget1() {
  console.log('\n[Target 1] compatData.js NIKCHU_PROFILES の KR 対応状況確認...');
  try {
    const a = await import('file://' + path.join(ROOT, 'src', 'data', 'compatData.js'));
    const b = await import('file://' + CDKR_PATH);
    const ja = Object.keys(a.NIKCHU_PROFILES || {});
    const kr = Object.keys(b.NIKCHU_PROFILES_KR || {});
    const missing = ja.filter(k => !kr.includes(k));
    console.log(`  JA: ${ja.length}件 / KR: ${kr.length}件 / 未翻訳: ${missing.length}件`);
    if (missing.length === 0) {
      console.log('  ✅ 対応済み。スキップします。');
    } else {
      console.log('  ⚠️  未翻訳あり。compatDataKr.js の更新は translate-compatProfiles-ko.mjs を使ってください。');
    }
  } catch (e) {
    console.log('  ⚠️  チェック失敗:', e.message);
  }
}

// ── Target 2: MBTI_RELATION_TYPES ──────────────────────────
async function translateTarget2() {
  if (process.env.SKIP_MBTI === '1') {
    console.log('\n[Target 2] SKIP_MBTI=1 のためスキップ');
    return;
  }
  console.log('\n[Target 2] mbtiRelationTypes.js (1024+件) を翻訳...');

  // import でエントリ取得
  const mod = await import('file://' + MBTI_SRC_PATH);
  const T = mod.MBTI_RELATION_TYPES || {};
  const keys = Object.keys(T);
  console.log(`  エントリ数: ${keys.length}`);

  if (keys.length === 0) {
    console.log('  ⚠️  エントリ0件。スキップ。');
    return;
  }

  // 重複排除: type / subtype は 16-20 種しかない。desc は 1024 件別々
  const uniqueType = new Set();
  const uniqueSubtype = new Set();
  const uniqueDesc = new Set();
  for (const k of keys) {
    const v = T[k];
    if (v.type) uniqueType.add(v.type);
    if (v.subtype) uniqueSubtype.add(v.subtype);
    if (v.desc) uniqueDesc.add(v.desc);
  }
  console.log(`  ユニーク: type=${uniqueType.size}, subtype=${uniqueSubtype.size}, desc=${uniqueDesc.size}`);

  // 翻訳（重複排除済みリストで省コスト化）
  const typeList = [...uniqueType];
  const subtypeList = [...uniqueSubtype];
  const descList = [...uniqueDesc];
  const allSources = [...typeList, ...subtypeList, ...descList];
  console.log(`  合計 ${allSources.length}件 翻訳`);
  const translated = await translateAll(allSources, '  MBTI 重複排除後');

  const typeMap = {}, subtypeMap = {}, descMap = {};
  for (let i = 0; i < typeList.length; i++) typeMap[typeList[i]] = translated[i];
  for (let i = 0; i < subtypeList.length; i++) subtypeMap[subtypeList[i]] = translated[typeList.length + i];
  for (let i = 0; i < descList.length; i++) descMap[descList[i]] = translated[typeList.length + subtypeList.length + i];

  // 出力ファイル構築
  const esc = s => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
  let out = '// ════════════════════════════════════════════════════════════════\n';
  out += '// MBTI_RELATION_TYPES の韓国語版 — DeepL API 自動生成\n';
  out += `// 生成日時: ${new Date().toISOString()}\n`;
  out += `// エントリ数: ${keys.length}\n`;
  out += '// ════════════════════════════════════════════════════════════════\n\n';
  out += 'export const MBTI_RELATION_TYPES_KR = {\n';
  for (const k of keys) {
    const v = T[k];
    const krType = typeMap[v.type] || v.type;
    const krSubtype = subtypeMap[v.subtype] || v.subtype;
    const krDesc = descMap[v.desc] || v.desc;
    out += `  '${k}': { type: '${esc(krType)}', subtype: '${esc(krSubtype)}', desc: '${esc(krDesc)}' },\n`;
  }
  out += '};\n\n';
  out += '// 言語別 accessor\n';
  out += 'export function getMbtiRelationByLang(key, lang, jaDict) {\n';
  out += `  if (lang === 'kr' && MBTI_RELATION_TYPES_KR[key]) return MBTI_RELATION_TYPES_KR[key];\n`;
  out += '  return jaDict[key];\n';
  out += '}\n';

  fs.writeFileSync(MBTI_OUT_PATH, out, 'utf-8');
  console.log(`  ✅ 出力: ${MBTI_OUT_PATH}`);
  console.log(`     KR エントリ: ${keys.length}件`);
}

// ── Target 3: compatScript.js 行620-935 の静的文字列 ──────
async function translateTarget3() {
  if (process.env.SKIP_COMPAT === '1') {
    console.log('\n[Target 3] SKIP_COMPAT=1 のためスキップ');
    return;
  }
  console.log('\n[Target 3] compatScript.js の narrative 静的文字列を抽出・翻訳...');

  const src = fs.readFileSync(COMPAT_SRC_PATH, 'utf-8').split('\n');
  // 行620-935をスキャン。pattern: `attr_title = '...'` / `attr_desc = '...'` / `gogyo_title = '...'` 等
  // 純粋な単一行文字列リテラル代入のみ抽出（変数埋込なし）
  const found = new Set();
  const START = 619, END = 935;
  const re = /^\s*\w+(?:_\w+)*\s*=\s*'((?:[^'\\]|\\.)*)'\s*;?\s*$/;
  for (let i = START; i < END && i < src.length; i++) {
    const m = src[i].match(re);
    if (m) {
      const text = m[1].replace(/\\'/g, "'");
      // 1文字記号や空文字、短すぎる物は除外
      if (text.trim().length >= 5 && /[\u3040-\u30ff\u4e00-\u9fff]/.test(text)) {
        found.add(text);
      }
    }
  }
  console.log(`  抽出: ${found.size}件のユニーク静的文字列`);

  if (found.size === 0) {
    console.log('  対象なし');
    return;
  }

  const jaList = [...found];
  // 既に辞書にあるキーは除外
  const i18nSrc = fs.readFileSync(I18N_PATH, 'utf-8');
  const toTranslate = jaList.filter(ja => {
    const escaped = ja.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/'/g, "\\'");
    return !i18nSrc.includes(`'${ja.replace(/'/g, "\\'")}':`);
  });
  console.log(`  うち未登録: ${toTranslate.length}件`);

  if (toTranslate.length === 0) {
    console.log('  全件既に辞書にあります。スキップ。');
    return;
  }

  const translated = await translateAll(toTranslate, '  narrative 静的文字列');

  // translations.js 両方に追記
  function appendDict(filePath, objectEnd) {
    let s = fs.readFileSync(filePath, 'utf-8');
    const endIdx = s.indexOf(objectEnd);
    if (endIdx < 0) throw new Error(`${filePath} で "${objectEnd}" が見つかりません`);
    let added = 0;
    const additions = [];
    for (let i = 0; i < toTranslate.length; i++) {
      const ja = toTranslate[i];
      const kr = translated[i];
      const jaEsc = ja.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      const krEsc = kr.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      if (s.includes(`'${jaEsc}':`)) continue;
      additions.push(`    '${jaEsc}':{kr:'${krEsc}',cn:'',en:''},`);
      added++;
    }
    if (added === 0) return 0;
    const marker = '    // ── compatScript.js narrative 静的文字列（自動生成） ──\n';
    s = s.substring(0, endIdx) + marker + additions.join('\n') + '\n' + s.substring(endIdx);
    fs.writeFileSync(filePath, s, 'utf-8');
    return added;
  }
  const a1 = appendDict(I18N_PATH, '\n};');
  const a2 = appendDict(DATA_PATH, '\n  };');
  console.log(`  ✅ 辞書追加: i18n=${a1}件, data=${a2}件`);
}

// ── メイン ────────────────────────────────────────────────
async function main() {
  console.log('━'.repeat(60));
  console.log('  残日本語データ 一括翻訳スクリプト');
  console.log('━'.repeat(60));

  await checkTarget1();
  await translateTarget2();
  await translateTarget3();

  console.log('\n━'.repeat(60));
  console.log('  全完了');
  console.log('━'.repeat(60));
  console.log('\n次のステップ:');
  console.log('  1. mbtiRelationTypesKr.js を MBTI 関係タイプ表示箇所で使うよう lang-aware 化');
  console.log('  2. フェーズ2: compatScript.js 行620-935 を lang-aware テンプレートに');
  console.log('  3. フェーズ3以降: 他のカテゴリ対応');
}

main().catch(err => {
  console.error('\n❌ エラー:', err.message);
  if (err.stack) console.error(err.stack.split('\n').slice(0, 5).join('\n'));
  process.exit(1);
});
