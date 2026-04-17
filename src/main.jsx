import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// NOTE: index.css / 各 engine / compat スクリプトの副作用 import は App.jsx 内で行う
// （App.jsx は panda-fortune-paid.html の babel スクリプトを移植した本体）
ReactDOM.createRoot(document.getElementById('root')).render(<App />)
