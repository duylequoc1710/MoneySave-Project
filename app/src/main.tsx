import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { processRecurringTransactions, seedIfEmpty } from './db'
import './index.css'
import { installSheetScrollLock } from './scrollLock'

installSheetScrollLock()

// PWA: luôn cập nhật bản mới sau deploy.
// - Kiểm tra bản mới khi mở app, khi quay lại app và mỗi 30 phút.
// - Khi có bản mới: nạp lại trang ngay, trừ lúc đang mở form nhập liệu (đợi đóng form) để không mất dữ liệu đang gõ.
const updateSW = registerSW({
  immediate: true,
  onRegisteredSW(_url, reg) {
    if (!reg) return
    const check = () => reg.update().catch(() => {})
    setInterval(check, 30 * 60 * 1000)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check()
    })
  },
  onNeedRefresh() {
    const tryReload = () => {
      if (document.querySelector('.sheetbg')) setTimeout(tryReload, 3000)
      else updateSW(true)
    }
    tryReload()
  },
})

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
