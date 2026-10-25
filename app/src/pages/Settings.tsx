import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, exportAll, importAll, type Category, type Fund, type Tx } from '../db'
import {
  applyTheme,
  buildCsvContent,
  buildExcelXml,
  getStoredTheme,
  type ThemeMode,
} from '../lib'
import { clearAllToCleanState, seedDemoData3Months } from '../demoData'

const NO_FUNDS: Fund[] = []
const NO_CATS: Category[] = []
const NO_TXS: Tx[] = []

export default function Settings() {
  const [theme, setTheme] = useState<ThemeMode>(() => getStoredTheme())
  const fileRef = useRef<HTMLInputElement>(null)

  const funds = useLiveQuery(() => db.funds.toArray(), [], NO_FUNDS)
  const cats = useLiveQuery(() => db.categories.toArray(), [], NO_CATS)
  const txs = useLiveQuery(() => db.txs.toArray(), [], NO_TXS)
  const recurringsCount = useLiveQuery(() => db.recurrings.count(), [], 0)
  const budgetsCount = useLiveQuery(() => db.budgets.count(), [], 0)

  function handleThemeChange(next: ThemeMode) {
    setTheme(next)
    applyTheme(next)
  }

  function download(name: string, content: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType })
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: name,
    })
    a.click()
    URL.revokeObjectURL(a.href)
  }

  function handleExportExcel() {
    const xml = buildExcelXml(funds, cats, txs)
    const dateStr = new Date().toISOString().slice(0, 10)
    download(`MoneyGo-BaoCao-${dateStr}.xls`, xml, 'application/vnd.ms-excel;charset=utf-8')
  }

  function handleExportCsv() {
    const csv = buildCsvContent(funds, cats, txs)
    const dateStr = new Date().toISOString().slice(0, 10)
    download(`MoneyGo-GiaoDich-${dateStr}.csv`, csv, 'text/csv;charset=utf-8')
  }

  async function handleRestore(file?: File) {
    if (!file) return
    try {
      await importAll(await file.text())
      alert('Đã khôi phục dữ liệu thành công!')
    } catch (e) {
      alert('Lỗi khôi phục: ' + (e as Error).message)
    }
  }

  return (
    <>
      <div className="ledger-topbar" style={{ marginBottom: 14 }}>
        <h1 style={{ margin: 0 }}>⚙️ Cài đặt</h1>
      </div>

      {/* 1. GIAO DIỆN (DARK THEME / LIGHT THEME) */}
      <h2>🎨 GIAO DIỆN HIỂN THỊ (THEME)</h2>
      <div className="card">
        <div className="seg" style={{ marginBottom: 12 }}>
          <button
            type="button"
            className={theme === 'dark' ? 'on' : ''}
            onClick={() => handleThemeChange('dark')}
          >
            🌙 Tối (Dark)
          </button>
          <button
            type="button"
            className={theme === 'light' ? 'on' : ''}
            onClick={() => handleThemeChange('light')}
          >
            ☀️ Sáng (Light)
          </button>
          <button
            type="button"
            className={theme === 'system' ? 'on' : ''}
            onClick={() => handleThemeChange('system')}
          >
            📱 Hệ thống
          </button>
        </div>

        <div
          className="row"
          style={{ cursor: 'pointer' }}
          onClick={() => handleThemeChange('dark')}
        >
          <div className="ico round" style={{ background: '#6366f124' }}>
            🌙
          </div>
          <div className="grow">
            <b>Giao diện Tối (Dark Theme)</b>
            <small>Nền đen OLED chuẩn MoneyLover, dịu mắt và tiết kiệm pin</small>
          </div>
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: theme === 'dark' ? 'var(--acc)' : 'transparent',
              border: theme === 'dark' ? 'none' : '1.5px solid var(--bd)',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {theme === 'dark' ? '✓' : ''}
          </span>
        </div>

        <div
          className="row"
          style={{ cursor: 'pointer' }}
          onClick={() => handleThemeChange('light')}
        >
          <div className="ico round" style={{ background: '#eab30824' }}>
            ☀️
          </div>
          <div className="grow">
            <b>Giao diện Sáng (Light Theme)</b>
            <small>Nền sáng thanh lịch, độ tương phản cao khi dùng ngoài trời</small>
          </div>
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: theme === 'light' ? 'var(--acc)' : 'transparent',
              border: theme === 'light' ? 'none' : '1.5px solid var(--bd)',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {theme === 'light' ? '✓' : ''}
          </span>
        </div>

        <div
          className="row"
          style={{ cursor: 'pointer' }}
          onClick={() => handleThemeChange('system')}
        >
          <div className="ico round" style={{ background: '#14b8a624' }}>
            📱
          </div>
          <div className="grow">
            <b>Tự động theo thiết bị (System)</b>
            <small>Tự động chuyển Sáng / Tối theo cài đặt của iOS, Android hoặc macOS</small>
          </div>
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: theme === 'system' ? 'var(--acc)' : 'transparent',
              border: theme === 'system' ? 'none' : '1.5px solid var(--bd)',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {theme === 'system' ? '✓' : ''}
          </span>
        </div>
      </div>

      {/* 2. DỮ LIỆU CÁ NHÂN (OFFLINE-FIRST) */}
      <h2>🔒 DỮ LIỆU CÁ NHÂN (OFFLINE-FIRST)</h2>
      <div className="card" style={{ padding: '4px 16px' }}>
        <div className="row">
          <div className="ico round" style={{ background: '#22c55e24' }}>
            📊
          </div>
          <div className="grow">
            <b>Xuất file Excel (.xls)</b>
            <small>Xuất báo cáo 2 Sheet (Sổ giao dịch & Danh sách ví) mở trực tiếp bằng Excel</small>
          </div>
          <button type="button" className="btn pri" onClick={handleExportExcel}>
            Xuất Excel
          </button>
        </div>

        <div className="row">
          <div className="ico round" style={{ background: '#06b6d424' }}>
            📄
          </div>
          <div className="grow">
            <b>Xuất file CSV (.csv)</b>
            <small>Định dạng bảng phẳng UTF-8 dùng cho Google Sheets / phân tích dữ liệu</small>
          </div>
          <button type="button" className="btn" onClick={handleExportCsv}>
            Xuất CSV
          </button>
        </div>

        <div className="row">
          <div className="ico round" style={{ background: '#3b82f624' }}>
            ⬇️
          </div>
          <div className="grow">
            <b>Sao lưu toàn bộ (JSON)</b>
            <small>Lưu trọn vẹn 100% Ví, Nhóm, Giao dịch, Ngân sách & Định kỳ ra file</small>
          </div>
          <button
            type="button"
            className="btn"
            onClick={async () => {
              const dateStr = new Date().toISOString().slice(0, 10)
              download(`moneygo-backup-${dateStr}.json`, await exportAll(), 'application/json')
            }}
          >
            Sao lưu
          </button>
        </div>

        <div className="row">
          <div className="ico round" style={{ background: '#8b5cf624' }}>
            ⬆️
          </div>
          <div className="grow">
            <b>Khôi phục dữ liệu (JSON)</b>
            <small>Nạp lại dữ liệu từ file sao lưu JSON từ máy tính hoặc điện thoại khác</small>
          </div>
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
            Khôi phục
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            hidden
            onChange={e => {
              handleRestore(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </div>
      </div>

      {/* 3. QUẢN LÝ DỮ LIỆU KIỂM THỬ (DEMO) */}
      <h2>🧪 CÔNG CỤ DỮ LIỆU KIỂM THỬ (TEST DATA)</h2>
      <div className="card" style={{ padding: '4px 16px' }}>
        <div className="row">
          <div className="ico round" style={{ background: '#10b98124' }}>
            🧪
          </div>
          <div className="grow">
            <b>Nạp lại dữ liệu mẫu (3 tháng)</b>
            <small>Khôi phục bộ dữ liệu mẫu đầy đủ (Tháng 7–11/2026) để kiểm thử tính năng</small>
          </div>
          <button
            type="button"
            className="btn"
            onClick={async () => {
              if (confirm('Nạp lại bộ dữ liệu mẫu 3 tháng để kiểm thử?')) {
                await seedDemoData3Months(true)
                alert('Đã nạp đầy đủ dữ liệu mẫu 3 tháng!')
              }
            }}
          >
            Nạp mẫu
          </button>
        </div>

        <div className="row">
          <div className="ico round" style={{ background: '#ef444424' }}>
            🗑️
          </div>
          <div className="grow">
            <b className="exp">Xoá sạch dữ liệu test (Về 0 ₫)</b>
            <small>Xoá toàn bộ giao dịch mẫu để bắt đầu ghi chép chi tiêu thực tế từ đầu</small>
          </div>
          <button
            type="button"
            className="btn dng"
            onClick={async () => {
              if (confirm('Xoá sạch toàn bộ dữ liệu test để bắt đầu dùng thực tế từ 0 ₫?')) {
                await clearAllToCleanState()
                alert('Đã xoá sạch dữ liệu test về 0 ₫.')
              }
            }}
          >
            Xoá sạch
          </button>
        </div>
      </div>

      {/* 4. THÔNG TIN LƯU TRỮ TRÊN THIẾT BỊ */}
      <h2>🛡️ TRẠNG THÁI LƯU TRỮ CỤC BỘ</h2>
      <div className="card">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 10 }}>
          <div className="group-stat-box" style={{ cursor: 'default' }}>
            <div>
              <small className="mut">Ví & Thẻ tín dụng</small>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{funds.length} ví</div>
            </div>
          </div>
          <div className="group-stat-box" style={{ cursor: 'default' }}>
            <div>
              <small className="mut">Tổng số giao dịch</small>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{txs.length} giao dịch</div>
            </div>
          </div>
          <div className="group-stat-box" style={{ cursor: 'default' }}>
            <div>
              <small className="mut">Nhóm Thu / Chi</small>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{cats.length} nhóm</div>
            </div>
          </div>
          <div className="group-stat-box" style={{ cursor: 'default' }}>
            <div>
              <small className="mut">Ngân sách & Định kỳ</small>
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                {budgetsCount} NS · {recurringsCount} ĐK
              </div>
            </div>
          </div>
        </div>
        <p className="mut" style={{ fontSize: 12.5, lineHeight: 1.5 }}>
          🔒 <b>100% dữ liệu lưu cục bộ (IndexedDB)</b> ngay trên trình duyệt thiết bị của bạn, không gửi về bất kỳ máy chủ bên thứ ba nào.
        </p>
      </div>
    </>
  )
}
