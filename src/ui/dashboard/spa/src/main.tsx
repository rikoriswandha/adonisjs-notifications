import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App.tsx'

declare global {
  interface Window {
    __DASHBOARD_BASE_PATH__?: string
    __DASHBOARD_INITIAL_DATA__?: { metrics: unknown; inbox: unknown }
  }
}

const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  )
}
