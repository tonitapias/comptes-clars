import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom' // <--- 1. Afegeix l'import
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter> {/* <--- 2. Embolcalla l'App amb BrowserRouter */}
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)