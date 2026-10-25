import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { DemoStoreProvider } from './hooks/useDemoStore'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DemoStoreProvider>
      <App />
    </DemoStoreProvider>
  </StrictMode>,
)
