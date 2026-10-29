import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AnalyticsProvider } from 'tracky'
import { App } from './App'
import { installPreviewTransport, PREVIEW_ENDPOINT } from './preview'
import './playground.css'

installPreviewTransport()

const container = document.getElementById('root')

if (!container) {
  throw new Error('The playground root element is missing.')
}

createRoot(container).render(
  <StrictMode>
    <AnalyticsProvider
      endpoint={PREVIEW_ENDPOINT}
      options={{ batchSize: 1, maxRetries: 0, flushIntervalMs: 0 }}
    >
      <App />
    </AnalyticsProvider>
  </StrictMode>,
)
