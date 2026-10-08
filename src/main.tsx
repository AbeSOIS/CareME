import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/noto-sans/latin-400.css'
import '@fontsource/noto-sans/latin-600.css'
import '@fontsource/noto-sans/latin-700.css'
import '@fontsource/noto-sans-sinhala/400.css'
import '@fontsource/noto-sans-sinhala/600.css'
import '@fontsource/noto-sans-tamil/400.css'
import '@fontsource/noto-sans-tamil/600.css'
import './styles/index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
