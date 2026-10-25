import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { processRecurringTransactions, seedIfEmpty } from './db'
import { seedDemoData3Months } from './demoData'
import './index.css'

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    processRecurringTransactions().catch(() => {})
  }
})

seedDemoData3Months()
  .then(() => seedIfEmpty())
  .then(() => processRecurringTransactions())
  .then(() =>
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <HashRouter>
          <App />
        </HashRouter>
      </StrictMode>,
    ),
  )
