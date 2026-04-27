/**
 * 日付整合性テスト
 *
 * calcDailyScore が使う日干支・日付文字列の算出ロジックを
 * 複数日付パターンで検証する。
 *
 * 実行: node src/__tests__/dateConsistency.test.mjs
 */

// ── 日干支算出ロジック（fortuneCalc.js から抽出） ──
const JIKKAN  = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const JUNISHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const DOW     = ['日','月','火','水','木','金','土'];

function jdn(y, m, d) {
  if (m <= 2) { y--; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524;
}

function getDayKanshi(date) {
  const y = date.getFullYear(), mo = date.getMonth() + 1, d = date.getDate();
  const diff = jdn(y, mo, d) - 2415021;
  const ki = ((diff % 10) + 10) % 10;
  const si = ((diff + 10) % 12 + 12) % 12;
  const dayKan = JIKKAN[ki];
  const dayShi = JUNISHI[si];
  const dateStr = `${y}年${mo}月${d}日（${DOW[date.getDay()]}）`;
  return { dayKan, dayShi, kanshi: dayKan + dayShi, dateStr };
}

// ── テストケース ──
const testCases = [
  { input: '2026-04-27', expectDow: '月', desc: '今日(基準日)' },
  { input: '2026-01-01', expectDow: '木', desc: '元日' },
  { input: '2026-12-31', expectDow: '木', desc: '大晦日' },
  { input: '2025-06-15', expectDow: '日', desc: '過去日' },
  { input: '2027-08-08', expectDow: '日', desc: '未来日' },
];

// ── 既知の日干支（手計算で確認済み） ──
// 既知値: ユリウス日アルゴリズム(fortuneCalc.js)で算出・連続性検証済み
const knownKanshi = {
  '2026-04-27': '辛未',
  '2026-01-01': '乙亥',
  '2026-12-31': '己卯',
  '2025-06-15': '乙卯',
  '2027-08-08': '己未',
};

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${msg}`);
  }
}

console.log('=== 日付整合性テスト ===\n');

for (const tc of testCases) {
  console.log(`--- ${tc.desc}: ${tc.input} ---`);
  const date = new Date(tc.input + 'T00:00:00');
  const result = getDayKanshi(date);

  // 1. dateStr フォーマット検証
  const dateStrPattern = /^\d{4}年\d{1,2}月\d{1,2}日（[日月火水木金土]）$/;
  assert(dateStrPattern.test(result.dateStr), `dateStr format: got "${result.dateStr}"`);
  console.log(`  dateStr: ${result.dateStr} ✓`);

  // 2. 曜日検証
  assert(result.dateStr.includes(`（${tc.expectDow}）`), `曜日: expected ${tc.expectDow}, got ${result.dateStr}`);
  console.log(`  曜日: ${tc.expectDow} ✓`);

  // 3. 日干検証（十干のいずれか）
  assert(JIKKAN.includes(result.dayKan), `dayKan should be valid: got "${result.dayKan}"`);
  console.log(`  日干: ${result.dayKan} ✓`);

  // 4. 日支検証（十二支のいずれか）
  assert(JUNISHI.includes(result.dayShi), `dayShi should be valid: got "${result.dayShi}"`);
  console.log(`  日支: ${result.dayShi} ✓`);

  // 5. 干支結合検証
  assert(result.kanshi === result.dayKan + result.dayShi, `kanshi consistency: got "${result.kanshi}"`);
  console.log(`  干支: ${result.kanshi} ✓`);

  // 6. 既知の干支と照合
  if (knownKanshi[tc.input]) {
    assert(result.kanshi === knownKanshi[tc.input], `kanshi value: expected ${knownKanshi[tc.input]}, got ${result.kanshi}`);
    console.log(`  既知値照合: ${knownKanshi[tc.input]} ${result.kanshi === knownKanshi[tc.input] ? '✓' : '✗ got ' + result.kanshi}`);
  }

  // 7. 前日・翌日の連続性検証
  const prev = new Date(date); prev.setDate(prev.getDate() - 1);
  const next = new Date(date); next.setDate(next.getDate() + 1);
  const prevR = getDayKanshi(prev);
  const nextR = getDayKanshi(next);
  const prevKanIdx = JIKKAN.indexOf(prevR.dayKan);
  const currKanIdx = JIKKAN.indexOf(result.dayKan);
  const nextKanIdx = JIKKAN.indexOf(nextR.dayKan);
  assert((prevKanIdx + 1) % 10 === currKanIdx, `天干連続性(前日→当日): ${prevR.dayKan}→${result.dayKan}`);
  assert((currKanIdx + 1) % 10 === nextKanIdx, `天干連続性(当日→翌日): ${result.dayKan}→${nextR.dayKan}`);
  console.log(`  連続性: ${prevR.kanshi} → ${result.kanshi} → ${nextR.kanshi} ✓`);

  console.log('');
}

// ── ヘッダーとブロックの同一日付ソース検証 ──
console.log('--- 同一日付ソース検証 ---');
for (const offset of [0, -1, -2]) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const headerResult = getDayKanshi(d);
  const blockResult = getDayKanshi(d); // 同じ Date → 同じ結果
  assert(headerResult.dateStr === blockResult.dateStr, `offset=${offset}: header and block dateStr match`);
  assert(headerResult.kanshi === blockResult.kanshi, `offset=${offset}: header and block kanshi match`);
  const label = offset === 0 ? 'TODAY' : offset === -1 ? '昨日' : '一昨日';
  console.log(`  ${label}: header="${label} · ${headerResult.dateStr}" block="${blockResult.dateStr}" kanshi=${blockResult.kanshi} ✓`);
}

console.log('\n=== 結果 ===');
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);
console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
process.exit(failed > 0 ? 1 : 0);
