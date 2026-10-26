import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { db, exportAll, importAll, type Category, type Fund, type Tx } from '../db'
import {
  applyTheme,
  buildCsvContent,
  buildExcelXml,
  getStoredTheme,
  type ThemeMode,
} from '../lib'
import SafetySnapshotsCard from '../components/SafetySnapshotsCard'
import { markBackupDownloaded } from '../safetyBackup'
import { auditData, type DataIssue } from '../dataAudit'
import { clearAllToCleanState, seedDemoData3Months } from '../demoData'
import {
  getDeviceId,
  subscribeSyncState,
  syncNowSmart,
  type SyncStateSnapshot,
} from '../cloudSync'
import { getAuthUser, signOutUser, subscribeAuth, type AuthUser } from '../auth.ts'
import AuthModal from '../components/AuthModal.tsx'

const NO_FUNDS: Fund[] = []
const NO_CATS: Category[] = []
const NO_TXS: Tx[] = []

export default function Settings() {
  const [theme, setTheme] = useState<ThemeMode>(() => getStoredTheme())
  const fileRef = useRef<HTMLInputElement>(null)

  // Cloud Sync: luôn tự động đồng bộ khi đã đăng nhập tài khoản
  const [syncMsg, setSyncMsg] = useState<string | null>(null)
  const [syncSnap, setSyncSnap] = useState<SyncStateSnapshot>({
    status: 'idle',
    lastSyncedAt: null,
    lastError: null,
    remoteUpdatedAt: null,
  })
  const [authUser, setAuthUser] = useState<AuthUser | null>(getAuthUser())
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [auditIssues, setAuditIssues] = useState<DataIssue[] | null>(null)

  useEffect(() => {
    return subscribeAuth(setAuthUser)
  }, [])

  useEffect(() => {
    return subscribeSyncState(setSyncSnap)
  }, [])

  const funds = useLiveQuery(() => db.funds.toArray(), [], NO_FUNDS)
  const cats = useLiveQuery(() => db.categories.toArray(), [], NO_CATS)
  const txs = useLiveQuery(() => db.txs.toArray(), [], NO_TXS)
  const recurringsCount = useLiveQuery(() => db.recurrings.count(), [], 0)
  const budgetsCount = useLiveQuery(() => db.budgets.count(), [], 0)

  function handleThemeChange(next: ThemeMode) {
    setTheme(next)
    applyTheme(next)
  }

  async function handleAudit() {
    const [f, c, t, b, r] = await Promise.all([
      db.funds.toArray(),
      db.categories.toArray(),
      db.txs.toArray(),
      db.budgets.toArray(),
      db.recurrings.toArray(),
    ])
    setAuditIssues(auditData({ funds: f, categories: c, txs: t, budgets: b, recurrings: r }))
  }

  async function handleSyncNow() {
    setSyncMsg(null)
    const res = await syncNowSmart()
    if (res === 'pushed') setSyncMsg('✅ Đã mã hoá và đẩy dữ liệu máy này lên Cloud.')
    else if (res === 'pulled') setSyncMsg('✅ Đã tải và giải mã bản cập nhật mới nhất từ Cloud.')
    else setSyncMsg('✅ Dữ liệu đã được đồng bộ, không có thay đổi mới.')
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
    download(`MoneySave-BaoCao-${dateStr}.xls`, xml, 'application/vnd.ms-excel;charset=utf-8')
  }

  function handleExportCsv() {
    const csv = buildCsvContent(funds, cats, txs)
    const dateStr = new Date().toISOString().slice(0, 10)
    download(`MoneySave-GiaoDich-${dateStr}.csv`, csv, 'text/csv;charset=utf-8')
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

      {/* 1. ĐỒNG BỘ ĐA THIẾT BỊ (FIREBASE AUTH & REALTIME E2EE) */}
      <h2>☁️ TÀI KHOẢN & ĐỒNG BỘ</h2>
      <div className="card">
        {authUser ? (
          <div
            style={{
              padding: 14,
              borderRadius: 14,
              background: 'rgba(43, 194, 85, 0.12)',
              border: '1px solid var(--acc)',
              marginBottom: 14,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: 'var(--acc)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 10px rgba(43,194,85,0.3)',
                  }}
                >
                  {authUser.email.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{authUser.email}</div>
                  <div className="mut" style={{ fontSize: 12, marginTop: 2 }}>
                    👑 Tài khoản Cá nhân / Admin · UID: <code>{authUser.uid.slice(0, 8)}…</code>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn on"
                  style={{ fontSize: 12.5, padding: '6px 12px' }}
                  onClick={handleSyncNow}
                >
                  🔄 Đồng Bộ Ngay
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{ fontSize: 12.5, padding: '6px 12px' }}
                  onClick={() => {
                    signOutUser()
                    setSyncMsg('Đã đăng xuất tài khoản. Ứng dụng chuyển về chế độ lưu trữ cục bộ (Offline).')
                  }}
                >
                  Đăng Xuất
                </button>
              </div>
            </div>
            <div
              style={{
                marginTop: 10,
                fontSize: 12.5,
                color: 'var(--acc)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>✅</span>
              <span>
                Toàn bộ ví và giao dịch đang được tự động mã hóa AES-256 và đồng bộ thời gian thực theo tài khoản này.
              </span>
            </div>
          </div>
        ) : (
          <div
            className="trend-callout"
            style={{
              padding: 16,
              borderRadius: 14,
              marginBottom: 14,
              textAlign: 'center',
              border: '1px solid var(--bd)',
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 6 }}>🔐</div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: 16, fontWeight: 700 }}>
              Đăng Nhập Tài Khoản Cá Nhân / Gia Đình
            </h3>
            <p className="mut" style={{ fontSize: 13, margin: '0 0 14px 0', lineHeight: 1.4 }}>
              Đăng nhập bằng Email & Mật khẩu để tự động đồng bộ tức thì giữa Điện thoại & Máy tính mà không cần cấu hình thủ công.
            </p>
            <button
              type="button"
              className="btn on"
              style={{
                width: '100%',
                padding: '11px',
                fontSize: 14.5,
                fontWeight: 700,
                borderRadius: 12,
              }}
              onClick={() => setShowAuthModal(true)}
            >
              🔑 Đăng Nhập hoặc Đăng Ký Tài Khoản
            </button>
          </div>
        )}

        {/* Trạng thái đồng bộ hiện tại */}
        <div
          className="trend-callout"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <div>
            <div>
              Trạng thái:{' '}
              <b
                className={
                  syncSnap.status === 'error'
                    ? 'exp'
                    : syncSnap.status === 'synced'
                      ? 'inc'
                      : ''
                }
              >
                {syncSnap.status === 'syncing'
                  ? '🔄 Đang mã hóa & đồng bộ...'
                  : syncSnap.status === 'synced'
                    ? '✅ Đã đồng bộ an toàn (E2EE)'
                    : syncSnap.status === 'error'
                      ? '⚠️ Lỗi kết nối / giải mã'
                      : authUser
                        ? '⏳ Sẵn sàng đồng bộ'
                        : '🔒 Chưa đăng nhập (Chỉ lưu trên máy này)'}
              </b>
            </div>
            {syncSnap.lastSyncedAt && (
              <div className="mut" style={{ fontSize: 12, marginTop: 2 }}>
                Lần đồng bộ cuối: {format(new Date(syncSnap.lastSyncedAt), 'HH:mm:ss dd/MM/yyyy')} · Thiết bị:{' '}
                <code>{getDeviceId()}</code>
              </div>
            )}
          </div>
        </div>

        {(syncMsg || syncSnap.lastError) && (
          <div
            className={`credit-advice ${syncSnap.lastError ? 'due-soon' : 'optimal'}`}
            style={{ marginBottom: 12 }}
          >
            {syncMsg || syncSnap.lastError}
          </div>
        )}
      </div>

      {/* 2. GIAO DIỆN (DARK THEME / LIGHT THEME) */}
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

      {/* 3. DỮ LIỆU CÁ NHÂN (OFFLINE-FIRST) */}
      <h2>🔒 DỮ LIỆU CÁ NHÂN & XUẤT BÁO CÁO (OFFLINE-FIRST)</h2>
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
              download(`moneysave-backup-${dateStr}.json`, await exportAll(), 'application/json')
              markBackupDownloaded()
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

        <div className="row" style={{ borderBottom: auditIssues ? undefined : 0 }}>
          <div className="ico round" style={{ background: '#14b8a624' }}>
            🔍
          </div>
          <div className="grow">
            <b>Kiểm tra toàn vẹn dữ liệu</b>
            <small>Rà soát giao dịch/ví/định kỳ có lỗi hoặc bất thường (chỉ đọc, không sửa dữ liệu)</small>
          </div>
          <button type="button" className="btn" onClick={handleAudit}>
            Kiểm tra
          </button>
        </div>
        {auditIssues && (
          <div style={{ padding: '4px 0 12px', fontSize: 13, lineHeight: 1.5 }}>
            {auditIssues.length === 0 ? (
              <span className="inc">✅ Dữ liệu toàn vẹn, không phát hiện vấn đề.</span>
            ) : (
              auditIssues.map((i, idx) => (
                <div key={idx} className={i.level === 'error' ? 'exp' : 'mut'}>
                  {i.level === 'error' ? '❌' : '⚠️'} {i.message}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <SafetySnapshotsCard />

      {/* 4. QUẢN LÝ DỮ LIỆU KIỂM THỬ (DEMO) */}
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
              if (confirm('⚠️ Thao tác này GHI ĐÈ toàn bộ dữ liệu hiện tại bằng dữ liệu mẫu (một bản sao an toàn sẽ được lưu tự động trước đó). Tiếp tục?')) {
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
              if (confirm('⚠️ Thao tác này XOÁ SẠCH toàn bộ dữ liệu hiện tại (kể cả dữ liệu thật). Một bản sao an toàn sẽ được lưu tự động trước đó. Tiếp tục?')) {
                await clearAllToCleanState()
                alert('Đã xoá sạch dữ liệu test về 0 ₫.')
              }
            }}
          >
            Xoá sạch
          </button>
        </div>
      </div>

      {/* 5. THÔNG TIN LƯU TRỮ TRÊN THIẾT BỊ */}
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
          🔒 <b>100% dữ liệu lưu cục bộ (IndexedDB)</b> ngay trên trình duyệt thiết bị của bạn; khi bật Đồng bộ Đám mây, dữ liệu luôn được mã hóa đầu cuối <code>AES-256</code> trước khi rời khỏi thiết bị.
        </p>
      </div>

      <footer
        style={{
          marginTop: 28,
          paddingTop: 16,
          paddingBottom: 20,
          borderTop: '1px solid var(--bd)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--fg)' }}>
          MoneySave · Quản Lý Tài Chính Cá Nhân & Gia Đình
        </div>
        <div className="mut" style={{ fontSize: 12.5, marginTop: 4 }}>
          Tác giả: <b>Duylequoc1710</b>
        </div>
        <div className="mut" style={{ fontSize: 11.5, marginTop: 2 }}>
          Bản quyền © {new Date().getFullYear()} · Phiên bản {__APP_VERSION__}
        </div>
      </footer>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={user => {
          setSyncMsg(`🎉 Chào mừng ${user.email}! Ứng dụng đang tự động đồng bộ ví của bạn...`)
        }}
      />
    </>
  )
}
