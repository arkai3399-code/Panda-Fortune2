/**
 * AI 鑑定文表示パネル (vanilla DOM 版 / 3 セクション分割版)
 *
 * /api/generate-self-reading → /api/generate-partner-reading → /api/generate-compat-reading
 * の順で呼び出し、各セクションを順次表示する。
 *
 * 各 API は独立キャッシュを持つため、本人/相手/相性のどれかがキャッシュヒットすれば
 * そのセクションは即座に表示される。
 */

let _abortController = null;

/**
 * 初期化: パネルを描画し、イベントを接続する
 */
export function initAiReadingPanel({ reqData }) {
  const panel = document.getElementById('pf-ai-reading-panel');
  if (!panel) {
    console.warn('[AiReadingPanel] #pf-ai-reading-panel が存在しません');
    return;
  }
  if (_abortController) {
    try { _abortController.abort(); } catch (_) {}
    _abortController = null;
  }
  _renderIdle(panel, reqData);
}

function _setSynthesisVisibility(visible) {
  const el = document.getElementById('pf-synthesis-subsections');
  if (el) el.style.display = visible ? '' : 'none';
}

function _setFallbackNotice(show) {
  let note = document.getElementById('pf-ai-fallback-notice');
  if (show) {
    if (!note) {
      note = document.createElement('div');
      note.id = 'pf-ai-fallback-notice';
      note.className = 'pf-ai-fallback-notice';
      note.innerHTML = '<p>AI 鑑定がご用意できませんでした。代わりに詳細分析をご覧くださいンダ。</p>';
      const syn = document.getElementById('pf-synthesis-subsections');
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
  _setSynthesisVisibility(true);
  _setFallbackNotice(false);
  panel.innerHTML = `
    <div class="pf-ai-idle">
      <div class="pf-ai-description">
        <p>🐼 ポポがお二人の命式を正統派四柱推命で読み解き、</p>
        <p>本人 → 相手 → 相性の 3 部構成・約 3,600 字の特別鑑定をお届けします。</p>
        <p class="pf-ai-note">※初回生成は少し時間がかかるンダ</p>
      </div>
      <button type="button" class="pf-ai-button" id="pf-ai-button">
        あなただけの鑑定文を読む
      </button>
    </div>
  `;
  const btn = panel.querySelector('#pf-ai-button');
  if (btn) btn.addEventListener('click', () => _runAll(panel, reqData));
}

function _renderSectionFrame(panel) {
  panel.innerHTML = `
    <div class="pf-ai-reading-text">
      <div class="pf-ai-section" id="pf-ai-self-section">
        <div class="pf-ai-section-loading">🐼 ポポが本人を読み解き中ンダ...</div>
        <pre class="pf-ai-section-content"></pre>
        <span class="pf-ai-cursor pf-ai-section-cursor">▊</span>
        <p class="pf-ai-cache-note" style="display:none;">(前回と同じ鑑定をお届けしました)</p>
      </div>
      <div class="pf-ai-section" id="pf-ai-partner-section" style="display:none;">
        <div class="pf-ai-section-loading">🐼 ポポが相手を読み解き中ンダ...</div>
        <pre class="pf-ai-section-content"></pre>
        <span class="pf-ai-cursor pf-ai-section-cursor">▊</span>
        <p class="pf-ai-cache-note" style="display:none;">(前回と同じ鑑定をお届けしました)</p>
      </div>
      <div class="pf-ai-section" id="pf-ai-compat-section" style="display:none;">
        <div class="pf-ai-section-loading">🐼 ポポが二人の縁を読み解き中ンダ...</div>
        <pre class="pf-ai-section-content"></pre>
        <span class="pf-ai-cursor pf-ai-section-cursor">▊</span>
        <p class="pf-ai-cache-note" style="display:none;">(前回と同じ鑑定をお届けしました)</p>
      </div>
    </div>
  `;
}

function _renderError(panel, reqData) {
  panel.innerHTML = `
    <div class="pf-ai-idle">
      <div class="pf-ai-description">
        <p>🐼 AI 鑑定の生成に失敗しましたンダ。</p>
        <p class="pf-ai-note">下の詳細分析をご覧ください。再試行することもできます。</p>
      </div>
      <button type="button" class="pf-ai-button" id="pf-ai-retry">もう一度試す</button>
    </div>
  `;
  const btn = panel.querySelector('#pf-ai-retry');
  if (btn) btn.addEventListener('click', () => _runAll(panel, reqData));
}

function _showSection(sectionId) {
  const el = document.getElementById(`pf-ai-${sectionId}-section`);
  if (el) el.style.display = '';
}

function _getSectionEls(sectionId) {
  const root = document.getElementById(`pf-ai-${sectionId}-section`);
  if (!root) return null;
  return {
    root,
    loading: root.querySelector('.pf-ai-section-loading'),
    content: root.querySelector('.pf-ai-section-content'),
    cursor: root.querySelector('.pf-ai-section-cursor'),
    cacheNote: root.querySelector('.pf-ai-cache-note'),
  };
}

// =============================================================
// 3 セクション順次実行
// =============================================================
async function _runAll(panel, reqData) {
  window.__pfAiReqData = reqData;

  _setSynthesisVisibility(false);
  _setFallbackNotice(false);
  _renderSectionFrame(panel);

  _abortController = new AbortController();
  const signal = _abortController.signal;

  try {
    // 1. 本人鑑定
    _showSection('self');
    await _streamToSection({
      url: '/api/generate-self-reading',
      body: { self: reqData.self },
      sectionId: 'self',
      signal,
    });

    // 2. 相手鑑定
    _showSection('partner');
    await _streamToSection({
      url: '/api/generate-partner-reading',
      body: { partner: reqData.partner },
      sectionId: 'partner',
      signal,
    });

    // 3. 相性鑑定
    _showSection('compat');
    await _streamToSection({
      url: '/api/generate-compat-reading',
      body: {
        self: reqData.self,
        partner: reqData.partner,
        hints: reqData.hints,
        relation: reqData.relation,
        totalScore: reqData.totalScore,
      },
      sectionId: 'compat',
      signal,
    });

    // 完了時は synthesis を隠したまま
    _setSynthesisVisibility(false);
  } catch (err) {
    if (err.name === 'AbortError') {
      console.log('[AiReadingPanel] Generation aborted');
      return;
    }
    console.error('[AiReadingPanel] AI reading error:', err);
    _renderError(panel, reqData);
    _setSynthesisVisibility(true);
    _setFallbackNotice(true);
  }
}

async function _streamToSection({ url, body, sectionId, signal }) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) throw new Error(`HTTP ${response.status} at ${url}`);

  const isCached = response.headers.get('X-Cache') === 'HIT';
  const els = _getSectionEls(sectionId);
  if (!els) throw new Error(`Section elements not found: ${sectionId}`);

  // 読み取り開始前にローディングを消す
  if (els.loading) els.loading.style.display = 'none';

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let accumulated = '';

  try {
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
            if (els.content) els.content.textContent = accumulated;
          } else if (data.type === 'done') {
            if (els.cursor) els.cursor.style.display = 'none';
            if (isCached && els.cacheNote) els.cacheNote.style.display = '';
            return;
          } else if (data.type === 'error') {
            throw new Error(data.message || 'Generation failed');
          }
        } catch (parseErr) {
          console.error('[AiReadingPanel] Parse error:', parseErr, 'line:', line);
        }
      }
    }
  } finally {
    if (els.cursor) els.cursor.style.display = 'none';
  }
}
