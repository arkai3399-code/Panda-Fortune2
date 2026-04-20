// ══════════════════════════════════════════════════════════════
// DeepL API で日本語テキストを韓国語に一括翻訳するスクリプト
// 実行: DEEPL_API_KEY=xxx node scripts/translate-ko.mjs
// 出力: scripts/translated-ko.json
// ══════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const apiKey = process.env.DEEPL_API_KEY;
const TRANSLATE_ALL = process.env.TRANSLATE_ALL === '1';  // 1 なら既存 kr 訳も全て上書き
if (!apiKey) {
  console.error('❌ DEEPL_API_KEY 環境変数が設定されていません。');
  console.error('   例: DEEPL_API_KEY=xxxxx node scripts/translate-ko.mjs');
  console.error('   （既存 kr 訳を全て再翻訳したい場合は TRANSLATE_ALL=1 を追加）');
  process.exit(1);
}

const DEEPL_ENDPOINT = 'https://api-free.deepl.com/v2/translate';
const BATCH_SIZE = 50;          // DeepL は 50 件/リクエスト まで安全
const WAIT_MS = 1000;           // バッチ間ウェイト
const OUT_PATH = path.join(ROOT, 'scripts', 'translated-ko.json');

// ── ソース収集 ─────────────────────────────────────────────
async function loadSources() {
  // UI 翻訳辞書（ES モジュール経由で取得）
  const i18nUrl = 'file://' + path.join(ROOT, 'src', 'i18n', 'translations.js');
  const i18n = await import(i18nUrl);
  const T = i18n.TRANSLATIONS || {};

  const uiEntries = [];
  for (const [ja, langMap] of Object.entries(T)) {
    uiEntries.push({
      ja,
      existingKr: (langMap && typeof langMap.kr === 'string' && langMap.kr.trim()) ? langMap.kr : null
    });
  }

  // 元命テキスト
  const genmeiUrl = 'file://' + path.join(ROOT, 'src', 'data', 'genmeiText.js');
  const genmeiMod = await import(genmeiUrl);
  const GENMEI = genmeiMod.GENMEI_TEXTS || {};

  return { uiEntries, GENMEI };
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

// ── メイン ────────────────────────────────────────────────
async function main() {
  console.log('━'.repeat(60));
  console.log('  DeepL JA → KO 一括翻訳スクリプト');
  console.log('━'.repeat(60));

  console.log('\n[1/4] ソース読み込み...');
  const { uiEntries, GENMEI } = await loadSources();
  console.log(`  UI辞書: ${uiEntries.length}件`);
  const genmeiKeys = Object.keys(GENMEI);
  console.log(`  元命: ${genmeiKeys.length}星 × 2フィールド(short/text) = ${genmeiKeys.length * 2}件`);

  console.log('\n[2/4] 翻訳対象を抽出...');
  // TRANSLATE_ALL=1 なら既存 kr 訳があっても全て再翻訳
  const uiNeedTranslation = TRANSLATE_ALL ? uiEntries : uiEntries.filter(e => !e.existingKr);
  const uiAlreadyTranslated = uiEntries.length - uiNeedTranslation.length;
  console.log(`  モード: ${TRANSLATE_ALL ? '全件再翻訳 (TRANSLATE_ALL=1)' : '未翻訳のみ'}`);
  console.log(`  UI翻訳対象: ${uiNeedTranslation.length}件`);
  if (!TRANSLATE_ALL) console.log(`  UI既存訳あり（スキップ）: ${uiAlreadyTranslated}件`);

  const uiJaList = uiNeedTranslation.map(e => e.ja);

  // 元命は毎回全件翻訳（既存 kr 辞書には含まれないため）
  const genmeiJaList = [];
  const genmeiMapping = []; // {key: '比肩', field: 'short' | 'text'}
  for (const k of genmeiKeys) {
    genmeiJaList.push(GENMEI[k].short);
    genmeiMapping.push({ key: k, field: 'short' });
    genmeiJaList.push(GENMEI[k].text);
    genmeiMapping.push({ key: k, field: 'text' });
  }

  const allTexts = [...uiJaList, ...genmeiJaList];
  console.log(`  翻訳総件数: ${allTexts.length}件 (バッチ数: ${Math.ceil(allTexts.length / BATCH_SIZE)})`);

  if (allTexts.length === 0) {
    console.log('\n✅ 翻訳対象なし。既存 kr 辞書のみで出力します。');
  } else {
    console.log('\n[3/4] DeepL API 呼び出し...');
    const translated = await translateAll(allTexts);

    console.log('\n[4/4] 結果を集約...');
    const uiResult = {};
    for (let i = 0; i < uiNeedTranslation.length; i++) {
      uiResult[uiNeedTranslation[i].ja] = translated[i];
    }
    // 既存の kr 訳も含めて完全な辞書にする（TRANSLATE_ALL でない場合のフォールバック）
    for (const e of uiEntries) {
      if (e.existingKr && !uiResult[e.ja]) uiResult[e.ja] = e.existingKr;
    }
    const genmeiResult = {};
    for (let i = 0; i < genmeiMapping.length; i++) {
      const m = genmeiMapping[i];
      if (!genmeiResult[m.key]) genmeiResult[m.key] = {};
      genmeiResult[m.key][m.field] = translated[uiNeedTranslation.length + i];
    }

    const output = {
      generatedAt: new Date().toISOString(),
      source: 'DeepL API (free)',
      direction: 'JA → KO',
      stats: {
        ui_total: Object.keys(uiResult).length,
        ui_newly_translated: uiNeedTranslation.length,
        ui_pre_existing: uiAlreadyTranslated,
        genmei_types: genmeiKeys.length,
      },
      ui: uiResult,
      genmei: genmeiResult,
    };

    fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2), 'utf-8');
    console.log(`\n✅ 完了！ 保存先: ${OUT_PATH}`);
    console.log(`   UI: ${output.stats.ui_total}件 (新規 ${output.stats.ui_newly_translated} + 既存 ${output.stats.ui_pre_existing})`);
    console.log(`   元命: ${output.stats.genmei_types}星`);
    return;
  }

  // 翻訳対象なし → 既存辞書だけで出力
  const fallbackUi = {};
  for (const e of uiEntries) if (e.existingKr) fallbackUi[e.ja] = e.existingKr;
  const fallbackOutput = {
    generatedAt: new Date().toISOString(),
    stats: { ui_total: Object.keys(fallbackUi).length, ui_newly_translated: 0, ui_pre_existing: uiAlreadyTranslated, genmei_types: 0 },
    ui: fallbackUi,
    genmei: {},
  };
  fs.writeFileSync(OUT_PATH, JSON.stringify(fallbackOutput, null, 2), 'utf-8');
  console.log(`\n既存辞書のみを ${OUT_PATH} に出力しました。`);
}

main().catch(err => {
  console.error('\n❌ エラー:', err.message);
  if (err.stack) console.error(err.stack.split('\n').slice(0, 5).join('\n'));
  process.exit(1);
});
