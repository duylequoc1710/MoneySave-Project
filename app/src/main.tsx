import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { exportAll, processRecurringTransactions, seedIfEmpty } from './db'
import { ensureDailySnapshot } from './safetyBackup'
import { syncNowSmart } from './cloudSync'
import './index.css'
import { installSheetScrollLock } from './scrollLock'

installSheetScrollLock()

// Chặn quét khối và kéo thả vô tình gây đơ giao diện trên web app / PWA
if (typeof window !== 'undefined') {
  window.addEventListener('dragstart', e => {
    const target = e.target as HTMLElement | null
    if (target?.tagName !== 'INPUT' && target?.tagName !== 'TEXTAREA') {
      e.preventDefault()
    }
  })
  window.addEventListener('selectstart', e => {
    const target = e.target as HTMLElement | null
    if (target?.tagName !== 'INPUT' && target?.tagName !== 'TEXTAREA' && !target?.isContentEditable) {
      // Chỉ cho phép chọn chữ trong input, textarea hoặc contenteditable
      const sel = window.getSelection()
      if (sel && sel.rangeCount > 0) {
        sel.removeAllRanges()
      }
    }
  })
}

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
      else {
        try {
          sessionStorage.setItem('moneysave_just_updated', '1')
        } catch {
          /* ignore */
        }
        updateSW(true)
      }
    }
    tryReload()
  },
})

// §2.4 (S3): khi quay lại app, KÉO bản mới nhất từ Cloud TRƯỚC rồi mới sinh giao dịch định kỳ.
// Nếu sinh trước, máy bị coi là "vừa chỉnh sửa" → có thể đẩy dữ liệu cũ đè bản mới hơn của thiết bị khác.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    syncNowSmart(true)
      .catch(() => 'noop' as const)
      .then(() => processRecurringTransactions())
      .catch(() => {})
  }
})

// Khởi chạy an toàn: chỉ bổ sung danh mục mặc định nếu cơ sở dữ liệu trống,
// tuyệt đối không bao giờ tự động xóa hay can thiệp vào giao dịch thực tế của người dùng.
// LƯU Ý (2026-11-16): PHẢI chạy xong trước khi render. App khởi động bộ đồng bộ Cloud (hook Dexie);
// nếu seed/định kỳ ghi dữ liệu sau khi hook đã gắn, máy sẽ bị coi là "vừa chỉnh sửa" và có thể đẩy
// dữ liệu cũ/mặc định đè lên Cloud. Snapshot hằng ngày chỉ tốn thời gian 1 lần/ngày.
async function initApp() {
  await seedIfEmpty()
  // Bản sao an toàn hằng ngày (trước khi bất kỳ tiến trình tự động nào ghi dữ liệu)
  await ensureDailySnapshot(() => exportAll())
  await processRecurringTransactions().catch(() => {})
}

// Xin trình duyệt giữ dữ liệu lâu dài (giảm nguy cơ iOS/Safari tự dọn IndexedDB). Không chặn khởi động.
try {
  navigator.storage?.persist?.().catch(() => {})
} catch {
  /* ignore */
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
