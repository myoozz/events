import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { Preview } from './components/ui/Preview.jsx'

// Dev-only entry for /ui-preview.html — renders the Phase-0 primitive preview.
ReactDOM.createRoot(document.getElementById('ui-preview-root')).render(
  <React.StrictMode>
    <Preview />
  </React.StrictMode>,
)
