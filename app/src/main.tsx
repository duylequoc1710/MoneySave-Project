import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { processRecurringTransactions, seedIfEmpty } from './db'
import './index.css'

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    processRecurringTransactions().catch(() => {})
  }
})

// Khởi chạy an toàn: chỉ bổ sung danh mục mặc định nếu cơ sở dữ liệu trống,
// tuyệt đối không bao giờ tự động xóa hay can thiệp vào giao dịch thực tế của người dùng.
async function initApp() {
  await seedIfEmpty()
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
