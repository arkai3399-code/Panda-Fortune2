// ════════════════════════════════════════════════════════════════
// 動的テンプレート（変数埋込の日本語文）を言語別に切り替えるヘルパー
// translateDOM は完全一致検索しかできないため、
// `${variable}` を含むテンプレートは JA/KR 関数ペアで対応する必要がある
// ════════════════════════════════════════════════════════════════

/**
 * 現在の言語を取得（window.PF_LANG 経由）
 */
export function getCurrentLang() {
  if (typeof window !== 'undefined' && window.PF_LANG && window.PF_LANG.getLang) {
    return window.PF_LANG.getLang();
  }
  return 'jp';
}

/**
 * JA/KR テンプレート関数ペアから言語別の文字列を返す
 * @param {Function} jaFn - 日本語テンプレート関数
 * @param {Function} krFn - 韓国語テンプレート関数
 * @param  {...any} args - 両関数に渡す引数
 * @returns {string}
 */
export function langPick(jaFn, krFn, ...args) {
  const lang = getCurrentLang();
  if (lang === 'kr' && typeof krFn === 'function') {
    try {
      return krFn(...args);
    } catch (e) {
      // KR 側で例外が出た場合は JA にフォールバック
      console.warn('[langPick] KR template failed, fallback to JA:', e.message);
    }
  }
  return jaFn(...args);
}

/**
 * 単一の日本語文字列を KR 辞書で翻訳（既存 PF_LANG.t のラッパー）
 */
export function tt(jaText) {
  if (!jaText) return jaText;
  if (typeof window !== 'undefined' && window.PF_LANG && window.PF_LANG.t) {
    const translated = window.PF_LANG.t(jaText);
    return translated || jaText;
  }
  return jaText;
}
