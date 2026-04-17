import React from 'react';

// ErrorBoundary（エラー表示用）
// 元HTML 2114-2145行。
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, stack: null };
  }
  componentDidCatch(error, info) {
    this.setState({ error: error.message, stack: info.componentStack });
  }
  static getDerivedStateFromError(e) {
    return { error: e.message, stack: e.stack || '' };
  }
  render() {
    if (this.state.error) return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
        background: '#fff', color: '#111', fontFamily: 'monospace',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 32, boxSizing: 'border-box', overflowY: 'auto',
      }}>
        <div style={{ maxWidth: 720, width: '100%' }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>🐼💥 Reactエラー</div>
          <div style={{ background: '#fee', border: '2px solid #c00', borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <b style={{ color: '#c00', fontSize: 15 }}>エラーメッセージ</b><br />
            <pre style={{ marginTop: 8, whiteSpace: 'pre-wrap', fontSize: 13, color: '#900' }}>{this.state.error}</pre>
          </div>
          {this.state.stack && (
            <details open>
              <summary style={{ cursor: 'pointer', fontSize: 12, color: '#555', marginBottom: 6 }}>📋 コンポーネントスタック</summary>
              <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 6, fontSize: 11, overflowX: 'auto', whiteSpace: 'pre-wrap', color: '#444' }}>{this.state.stack}</pre>
            </details>
          )}
          <button onClick={() => this.setState({ error: null, stack: null })} style={{ marginTop: 16, padding: '10px 24px', background: '#c00', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>✕ 閉じて試す</button>
        </div>
      </div>
    );
    return this.props.children;
  }
}
