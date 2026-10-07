import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/fonts.css'
import './styles/tokens.css'
import './styles/base.css'
import App from './App.tsx'
import { googleKonfiguriert, rueckkehrVerarbeiten } from './data/gmail/googleAuth.ts'

const root = document.getElementById('root')
if (!root) throw new Error('Element #root fehlt in index.html')

// Rücksprung von Google: Token übernehmen und sofort aus der Adresse entfernen
if (googleKonfiguriert()) rueckkehrVerarbeiten()

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
