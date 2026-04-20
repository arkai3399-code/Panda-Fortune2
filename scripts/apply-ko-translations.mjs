// ══════════════════════════════════════════════════════════════
// scripts/translated-ko.json の ui セクションを
// src/i18n/translations.js / src/data/translations.js の kr 値にマージ
// 実行: node scripts/apply-ko-translations.mjs
// ══════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const JSON_PATH = path.join(ROOT, 'scripts', 'translated-ko.json');
const I18N_PATH = path.join(ROOT, 'src', 'i18n', 'translations.js');
const DATA_PATH = path.join(ROOT, 'src', 'data', 'translations.js');

const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));
const uiMap = data.ui || {};
console.log(`KR翻訳辞書: ${Object.keys(uiMap).length}件`);

// JSリテラル内の kr 値を上書きする関数
function upsertKr(src, jaKey, krVal) {
  // エスケープ: '基本命式' のJP key はそのままパターンに使える
  const jaEsc = jaKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // 'JP':{...kr:'OLD'...} の OLD 部分を NEW に置換
  const re = new RegExp(`('${jaEsc}'\\s*:\\s*\\{[^}]*?kr:\\s*)'((?:[^'\\\\]|\\\\.)*)'`);
  const m = src.match(re);
  if (!m) return { src, status: 'not_found' };
  const krEsc = krVal.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  if (m[2] === krEsc) return { src, status: 'unchanged' };
  return { src: src.replace(re, `$1'${krEsc}'`), status: 'updated' };
}

function applyTo(filePath) {
  let src = fs.readFileSync(filePath, 'utf-8');
  const stats = { not_found: 0, unchanged: 0, updated: 0 };
  for (const [ja, kr] of Object.entries(uiMap)) {
    const r = upsertKr(src, ja, kr);
    src = r.src;
    stats[r.status]++;
  }
  fs.writeFileSync(filePath, src, 'utf-8');
  return stats;
}

console.log('\n--- i18n/translations.js ---');
console.log(applyTo(I18N_PATH));
console.log('\n--- data/translations.js ---');
console.log(applyTo(DATA_PATH));
console.log('\n✅ 完了');
