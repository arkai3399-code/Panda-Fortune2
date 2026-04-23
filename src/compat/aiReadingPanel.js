/**
 * AI 鑑定文表示パネル (vanilla DOM 版)
 *
 * compatScript.js から呼び出され、#pf-ai-reading-panel 内に
 * 「あなただけの鑑定文を読む」ボタンを描画する。
 * クリックで /api/generate-reading を SSE で呼び出し、ストリーミング表示する。
 *
 * 成功時: #pf-acc-synthesis を非表示にする
 * 失敗時: #pf-acc-synthesis を表示したままフォールバック通知を出す
 */

let _abortController = null;

/**
 * 初期化: パネルを描画し、イベントを接続する
 * @param {Object} params
 * @param {Object} params.reqData - /api/generate-reading に送るペイロード
 */
export function initAiReadingPanel({ reqData }) {
  const panel = document.getElementById('pf-ai-reading-panel');
  if (!panel) {
    console.warn('[AiReadingPanel] #pf-ai-reading-panel が存在しません');
    return;
  }

  // 同じ _pfRunCompatScript が再呼び出されたら前回の通信を中止
  if (_abortController) {
    try { _abortController.abort(); } catch (_) {}
    _abortController = null;
  }

  // 初期状態(idle)を描画
  _renderIdle(panel, reqData);
}

/** 既存 synthesis セクションの表示/非表示 */
function _setSynthesisVisibility(visible) {
  const el = document.getElementById('pf-acc-synthesis');
  if (el) el.style.display = visible ? '' : 'none';
}

/** フォールバック通知の表示/非表示 */
function _setFallbackNotice(show) {
  let note = document.getElementById('pf-ai-fallback-notice');
  if (show) {
    if (!note) {
      note = document.createElement('div');
      note.id = 'pf-ai-fallback-notice';
      note.className = 'pf-ai-fallback-notice';
      note.innerHTML = '<p>AI 鑑定がご用意できませんでした。代わりに詳細分析をご覧くださいンダ。</p>';
      const syn = document.getElementById('pf-acc-synthesis');
      if (syn && syn.parentNode) syn.parentNode.insertBefore(note, syn);
    }
    note.style.display = '';
  } else if (note) {
    note.style.display = 'none';
  }
}

// =============================================================
// 各状態のレンダラ
// =============================================================
function _renderIdle(panel, reqData) {
  _setSynthesisVisibility(true); // idle 状態では synthesis も見せる
  _setFallbackNotice(false);
  panel.innerHTML = `
    <div class="pf-ai-idle">
      <div class="pf-ai-description">
        <p>🐼 ポポがお二人の命式を正統派四柱推命で読み解き、</p>
        <p>約 3,600 字の特別鑑定をお届けします。</p>
        <p class="pf-ai-note">※ 生成には 15〜25 秒ほどかかります</p>
      </div>
      <button type="button" class="pf-ai-button" id="pf-ai-button">
        あなただけの鑑定文を読む
      </button>
    </div>
  `;
  const btn = panel.querySelector('#pf-ai-button');
  if (btn) btn.addEventListener('click', () => _startGeneration(panel, reqData));
}

function _renderLoading(panel) {
  panel.innerHTML = `
    <div class="pf-ai-loading">
      <div class="pf-ai-spinner">🐼</div>
      <p class="pf-ai-loading-text">ポポが鑑定中ンダ...</p>
      <p class="pf-ai-loading-sub">お二人の縁を深く読み解いています</p>
    </div>
  `;
}

function _renderStreamingStart(panel) {
  panel.innerHTML = `
    <div class="pf-ai-reading-text">
      <pre id="pf-ai-reading-pre"></pre>
      <span class="pf-ai-cursor" id="pf-ai-cursor">▊</span>
      <p class="pf-ai-cache-note" id="pf-ai-cache-note" style="display:none;">(前回と同じ鑑定をお届けしました)</p>
    </div>
  `;
}

function _renderError(panel) {
  panel.innerHTML = `
    <div class="pf-ai-idle">
      <div class="pf-ai-description">
        <p>🐼 AI 鑑定の生成に失敗しましたンダ。</p>
        <p class="pf-ai-note">下の詳細分析をご覧ください。再試行することもできます。</p>
      </div>
      <button type="button" class="pf-ai-button" id="pf-ai-retry">
        もう一度試す
      </button>
    </div>
  `;
  const btn = panel.querySelector('#pf-ai-retry');
  if (btn) {
    btn.addEventListener('click', () => {
      // リクエストデータは再取得が必要なので panel.dataset から復元できるように
      // ここでは compatScript 側の再実行に任せる(ユーザーに再計算を促すのみ)
      const savedReq = window.__pfAiReqData;
      if (savedReq) _startGeneration(panel, savedReq);
    });
  }
}

// =============================================================
// メイン: SSE ストリーム生成処理
// =============================================================
async function _startGeneration(panel, reqData) {
  // retry 用にグローバル退避
  window.__pfAiReqData = reqData;

  _setSynthesisVisibility(false); // 生成開始時点で synthesis を隠す
  _setFallbackNotice(false);
  _renderLoading(panel);

  _abortController = new AbortController();
  const signal = _abortController.signal;

  try {
    const response = await fetch('/api/generate-reading', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqData),
      signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const cacheHeader = response.headers.get('X-Cache');
    const isCached = cacheHeader === 'HIT';

    _renderStreamingStart(panel);
    const preEl = document.getElementById('pf-ai-reading-pre');
    const cursorEl = document.getElementById('pf-ai-cursor');
    const cacheNote = document.getElementById('pf-ai-cache-note');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let accumulated = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr) continue;

        try {
          const data = JSON.parse(jsonStr);
          if (data.type === 'text') {
            accumulated += data.text;
            if (preEl) preEl.textContent = accumulated;
          } else if (data.type === 'done') {
            // 生成完了
            if (cursorEl) cursorEl.style.display = 'none';
            if (isCached && cacheNote) cacheNote.style.display = '';
            _setSynthesisVisibility(false); // 成功時は synthesis を隠したまま
            return;
          } else if (data.type === 'error') {
            throw new Error(data.message || 'Generation failed');
          }
        } catch (parseErr) {
          console.error('[AiReadingPanel] Parse error:', parseErr, 'line:', line);
        }
      }
    }
    // ループが done イベントなしで終了した場合も成功扱い
    if (cursorEl) cursorEl.style.display = 'none';
  } catch (err) {
    if (err.name === 'AbortError') {
      console.log('[AiReadingPanel] Generation aborted');
      return;
    }
    console.error('[AiReadingPanel] AI reading error:', err);
    _renderError(panel);
    _setSynthesisVisibility(true);  // エラー時は synthesis にフォールバック
    _setFallbackNotice(true);
  }
}
