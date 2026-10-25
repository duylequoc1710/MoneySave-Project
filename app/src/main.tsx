import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { processRecurringTransactions, seedIfEmpty } from './db'
import { clearAllToCleanState } from './demoData'
import './index.css'

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    processRecurringTransactions().catch(() => {})
  }
})

// Dọn dẹp dữ liệu test mẫu cũ về trạng thái sạch 0 ₫ để sẵn sàng sử dụng thực tế
async function initApp() {
  const PURGE_KEY = 'moneysave_purge_demo_v5'
  if (typeof localStorage !== 'undefined' && localStorage.getItem(PURGE_KEY) !== 'done') {
    await clearAllToCleanState()
    localStorage.setItem(PURGE_KEY, 'done')
  } else {
    await seedIfEmpty()
  }
  await processRecurringTransactions().catch(() => {})
}

initApp().then(() =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <HashRouter>
        <App />
      </HashRouter>
    </StrictMode>,
  ),
)
