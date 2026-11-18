import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/nunito-sans/latin-400.css'
import '@fontsource/nunito-sans/latin-ext-400.css'
import '@fontsource/nunito-sans/latin-500.css'
import '@fontsource/nunito-sans/latin-ext-500.css'
import '@fontsource/nunito-sans/latin-600.css'
import '@fontsource/nunito-sans/latin-ext-600.css'
import '@fontsource/nunito-sans/latin-700.css'
import '@fontsource/nunito-sans/latin-ext-700.css'
import 'flag-icons/css/flag-icons.min.css'
import './index.css'
import './refinement.css'
import './theme.css'
import './styles/mobile/mobile.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`/sw.js?v=${encodeURIComponent(__APP_VERSION__)}`, { scope: '/' }).catch(() => {
      // Core play remains available when service-worker registration is blocked.
    })
  })
}
