import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_LANG,
  SUPPORTED_LANGS,
  translate,
  toHtmlLang,
} from './translations.js';

/**
 * ══════════════════════════════════════════════════════════════
 *  PANDA FORTUNE — 言語コンテキスト
 *
 *  元HTML の `window.PF_LANG` と同等の API を React の世界で提供する。
 *  （t / getLang / setLang の3つ）
 *
 *  使い方:
 *    // アプリのルートで
 *    <LangProvider>
 *      <App />
 *    </LangProvider>
 *
 *    // コンポーネント内で
 *    const { t, lang, setLang } = useLang();
 *    return <h1>{t('基本命式')}</h1>;
 *
 *  後方互換: LangProvider マウント時に window.PF_LANG を同じ形で公開する。
 *  これにより、まだ React 化されていない（compat-detail 等の）DOM 書き換え
 *  コードからも従来どおり window.PF_LANG.t(...) などが呼べる。
 * ══════════════════════════════════════════════════════════════
 */

const STORAGE_KEY = 'pf_lang';

const LangContext = createContext({
  lang: DEFAULT_LANG,
  setLang: () => {},
  t: (jp) => jp,
});

/**
 * 初期言語を localStorage から読み込む（失敗したら DEFAULT_LANG）。
 */
function loadInitialLang() {
  try {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (saved && SUPPORTED_LANGS.includes(saved)) return saved;
  } catch (e) {
    /* noop */
  }
  return DEFAULT_LANG;
}

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => loadInitialLang());

  // 言語変更時: localStorage 永続化 + <html lang> 更新
  const setLang = useCallback((nextLang) => {
    if (!SUPPORTED_LANGS.includes(nextLang)) return;
    setLangState(nextLang);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, nextLang);
      }
    } catch (e) {
      /* noop */
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = toHtmlLang(nextLang);
    }
  }, []);

  // マウント時に <html lang> を同期
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = toHtmlLang(lang);
    }
  }, [lang]);

  // 翻訳関数（現在の lang にクロージャされたヘルパー）
  const t = useCallback(
    (jp) => translate(jp, lang),
    [lang],
  );

  // 後方互換: window.PF_LANG に t / getLang / setLang を公開する。
  // compat-detail など、まだ React 化されていないコードから参照できるように。
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.PF_LANG = {
      t: (jp) => translate(jp, lang),
      getLang: () => lang,
      setLang,
    };
  }, [lang, setLang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return React.createElement(LangContext.Provider, { value }, children);
}

/**
 * コンポーネントから言語・翻訳にアクセスするフック。
 * @returns {{ lang: string, setLang: (l: string) => void, t: (jp: string) => string }}
 */
export function useLang() {
  return useContext(LangContext);
}
