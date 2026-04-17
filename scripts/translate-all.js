#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════
// PANDA FORTUNE — DeepL API 一括翻訳スクリプト
//
// 用途: 全日本語テキストを KR・CN・EN に翻訳して言語別JSONに保存
//
// 実行方法:
//   DEEPL_API_KEY=xxxx node scripts/translate-all.js
//
// 出力:
//   src/translations/kr.json
//   src/translations/cn.json
//   src/translations/en.json
//
// 注意:
//   - DeepL API Free: 月500,000文字まで
//   - DeepL API Pro: 従量課金（$20/1M文字）
//   - 本スクリプトの全テキストは約 200万文字 × 3言語 = 600万文字
//   - Free プランでは分割実行が必要
//   - 途中再開機能あり（既存の出力JSONがあればスキップ）
// ══════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const https = require('https');

// ── 設定 ──────────────────────────────────────────────────
const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
if (!DEEPL_API_KEY) {
  console.error('エラー: 環境変数 DEEPL_API_KEY が設定されていません');
  console.error('使い方: DEEPL_API_KEY=xxxx node scripts/translate-all.js');
  process.exit(1);
}

// DeepL APIのエンドポイント（Freeプランは api-free.deepl.com）
const IS_FREE = DEEPL_API_KEY.endsWith(':fx');
const API_HOST = IS_FREE ? 'api-free.deepl.com' : 'api.deepl.com';
const API_PATH = '/v2/translate';

// 言語マッピング（PF_LANG のキー → DeepL の target_lang）
const LANG_MAP = {
  kr: 'KO',
  cn: 'ZH',
  en: 'EN-US',
};

const ROOT = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT, 'src', 'translations');
const MBTI_JSON = path.join(process.env.HOME, 'Desktop', 'mbti-texts-all.json');

// ── レート制限 ────────────────────────────────────────────
const BATCH_SIZE = 50;        // 1回のAPI呼び出しで送るテキスト数
const DELAY_MS = 500;         // API呼び出し間の待機時間(ms)
const MAX_CHARS_PER_RUN = 400000; // 1回の実行で翻訳する最大文字数（Freeプラン対応）

// ── DeepL API 呼び出し ───────────────────────────────────
function translateBatch(texts, targetLang) {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams();
    postData.append('source_lang', 'JA');
    postData.append('target_lang', targetLang);
    texts.forEach(t => postData.append('text', t));

    const body = postData.toString();
    const options = {
      hostname: API_HOST,
      port: 443,
      path: API_PATH,
      method: 'POST',
      headers: {
        'Authorization': 'DeepL-Auth-Key ' + DEEPL_API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error('DeepL API error ' + res.statusCode + ': ' + data));
          return;
        }
        try {
          const json = JSON.parse(data);
          const results = json.translations.map(t => t.text);
          resolve(results);
        } catch (e) {
          reject(new Error('DeepL response parse error: ' + e.message));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── テキスト収集 ──────────────────────────────────────────

function collectAllTexts() {
  const texts = {};

  // 1. MBTIペアテキスト（1024エントリ × 5フィールド）
  console.log('[収集] MBTIペアテキスト...');
  if (fs.existsSync(MBTI_JSON)) {
    const mbti = JSON.parse(fs.readFileSync(MBTI_JSON, 'utf8'));
    for (const [key, entry] of Object.entries(mbti)) {
      const fields = ['title', 'attraction', 'friction', 'growthKey', 'best'];
      for (const f of fields) {
        if (entry[f]) {
          texts['mbti:' + key + ':' + f] = entry[f];
        }
      }
    }
    console.log('  → ' + Object.keys(mbti).length + 'エントリ × 5フィールド');
  } else {
    console.warn('  ⚠ ' + MBTI_JSON + ' が見つかりません。先に mbti-texts-all.json を作成してください。');
  }

  // 2. compatScript.js の長文テキスト（固定文字列を抽出）
  console.log('[収集] compatScript.js の長文...');
  const compatSrc = fs.readFileSync(path.join(ROOT, 'src/compat/compatScript.js'), 'utf8');
  const compatTexts = extractJapaneseStrings(compatSrc, 'compat');
  for (const [k, v] of Object.entries(compatTexts)) texts[k] = v;
  console.log('  → ' + Object.keys(compatTexts).length + '件');

  // 3. compatCalcFull.js の長文テキスト
  console.log('[収集] compatCalcFull.js の長文...');
  const calcSrc = fs.readFileSync(path.join(ROOT, 'src/logic/compatCalcFull.js'), 'utf8');
  const calcTexts = extractJapaneseStrings(calcSrc, 'calcFull');
  for (const [k, v] of Object.entries(calcTexts)) texts[k] = v;
  console.log('  → ' + Object.keys(calcTexts).length + '件');

  // 4. compatData.js の長文テキスト（ADV_BY_TYPE, GOGYO_HOWSEE 等）
  console.log('[収集] compatData.js のテーブルテキスト...');
  const dataSrc = fs.readFileSync(path.join(ROOT, 'src/data/compatData.js'), 'utf8');
  const dataTexts = extractJapaneseStrings(dataSrc, 'data');
  for (const [k, v] of Object.entries(dataTexts)) texts[k] = v;
  console.log('  → ' + Object.keys(dataTexts).length + '件');

  // 5. App.jsx の長文テキスト（ポポ鑑定文、エラーメッセージ等）
  console.log('[収集] App.jsx の長文...');
  const appSrc = fs.readFileSync(path.join(ROOT, 'src/App.jsx'), 'utf8');
  const appTexts = extractJapaneseStrings(appSrc, 'app');
  for (const [k, v] of Object.entries(appTexts)) texts[k] = v;
  console.log('  → ' + Object.keys(appTexts).length + '件');

  return texts;
}

/**
 * JSソースコードから20文字以上の日本語文字列リテラルを抽出
 */
function extractJapaneseStrings(source, prefix) {
  const result = {};
  // シングルクォート文字列を抽出（連結は無視、単一リテラルのみ）
  const regex = /'([^']{20,})'/g;
  let match;
  let idx = 0;
  while ((match = regex.exec(source)) !== null) {
    const text = match[1];
    // 日本語（ひらがな・カタカナ・漢字）を含むもののみ
    if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(text)) {
      // コメント行・CSS文字列を除外
      if (text.includes('font-family') || text.includes('border-radius') || text.includes('background:')) continue;
      const key = prefix + ':str:' + idx;
      result[key] = text;
      idx++;
    }
  }
  return result;
}

// ── メイン処理 ────────────────────────────────────────────

async function main() {
  console.log('══════════════════════════════════════════════');
  console.log('PANDA FORTUNE — DeepL 一括翻訳');
  console.log('API: ' + API_HOST + ' (' + (IS_FREE ? 'Free' : 'Pro') + ')');
  console.log('══════════════════════════════════════════════\n');

  // テキスト収集
  const allTexts = collectAllTexts();
  const keys = Object.keys(allTexts);
  const values = Object.values(allTexts);
  const totalChars = values.reduce((sum, t) => sum + t.length, 0);

  console.log('\n[統計]');
  console.log('  翻訳対象テキスト数: ' + keys.length);
  console.log('  総文字数: ' + totalChars.toLocaleString() + '文字');
  console.log('  × 3言語 = ' + (totalChars * 3).toLocaleString() + '文字（DeepL課金対象）');

  if (totalChars * 3 > 500000 && IS_FREE) {
    console.warn('\n  ⚠ Free プランの月間上限（500,000文字）を超える可能性があります。');
    console.warn('  → MAX_CHARS_PER_RUN = ' + MAX_CHARS_PER_RUN + ' で分割実行します。');
  }

  // 出力ディレクトリ作成
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // 各言語で翻訳
  for (const [pfLang, deeplLang] of Object.entries(LANG_MAP)) {
    const outPath = path.join(OUTPUT_DIR, pfLang + '.json');

    // 既存の翻訳結果を読み込み（途中再開用）
    let existing = {};
    if (fs.existsSync(outPath)) {
      existing = JSON.parse(fs.readFileSync(outPath, 'utf8'));
      console.log('\n[' + pfLang.toUpperCase() + '] 既存翻訳: ' + Object.keys(existing).length + '件をスキップ');
    }

    // 未翻訳のテキストだけを抽出
    const todoKeys = keys.filter(k => !existing[k]);
    const todoValues = todoKeys.map(k => allTexts[k]);

    if (todoKeys.length === 0) {
      console.log('[' + pfLang.toUpperCase() + '] 全て翻訳済み → スキップ');
      continue;
    }

    console.log('\n[' + pfLang.toUpperCase() + '] 翻訳開始: ' + todoKeys.length + '件');

    // 文字数制限に基づいて今回翻訳する範囲を決定
    let charCount = 0;
    let runLimit = todoKeys.length;
    for (let i = 0; i < todoKeys.length; i++) {
      charCount += todoValues[i].length;
      if (charCount > MAX_CHARS_PER_RUN) {
        runLimit = i;
        console.log('  → 文字数制限により ' + runLimit + '件で打ち切り（' + charCount + '文字）');
        break;
      }
    }

    const runKeys = todoKeys.slice(0, runLimit);
    const runValues = todoValues.slice(0, runLimit);

    // バッチに分割して翻訳
    let translated = 0;
    let errors = 0;
    for (let i = 0; i < runValues.length; i += BATCH_SIZE) {
      const batchTexts = runValues.slice(i, i + BATCH_SIZE);
      const batchKeys = runKeys.slice(i, i + BATCH_SIZE);

      try {
        const results = await translateBatch(batchTexts, deeplLang);
        for (let j = 0; j < results.length; j++) {
          existing[batchKeys[j]] = results[j];
        }
        translated += results.length;
        process.stdout.write('\r  進捗: ' + translated + '/' + runKeys.length + ' (' + Math.round(translated / runKeys.length * 100) + '%)');
      } catch (e) {
        console.error('\n  ⚠ バッチエラー (i=' + i + '): ' + e.message);
        errors++;
        if (errors > 5) {
          console.error('  → エラーが多すぎるため中断。途中結果を保存します。');
          break;
        }
      }

      // 途中保存（10バッチごと）
      if ((i / BATCH_SIZE) % 10 === 9) {
        fs.writeFileSync(outPath, JSON.stringify(existing, null, 2), 'utf8');
      }

      await sleep(DELAY_MS);
    }

    // 最終保存
    fs.writeFileSync(outPath, JSON.stringify(existing, null, 2), 'utf8');
    console.log('\n  完了: ' + outPath + ' (' + Object.keys(existing).length + '件)');
  }

  console.log('\n══════════════════════════════════════════════');
  console.log('全言語の翻訳が完了しました。');
  console.log('出力先: ' + OUTPUT_DIR + '/');
  console.log('══════════════════════════════════════════════');
}

main().catch(e => {
  console.error('致命的エラー:', e);
  process.exit(1);
});
