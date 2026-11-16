import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { db, type Category, type Fund, type Tx } from '../db'
import {
  applyTheme,
  buildExcelXml,
  getStoredTheme,
  type ThemeMode,
} from '../lib'
import SafetySnapshotsCard from '../components/SafetySnapshotsCard'
import { canPickSaveFile, downloadFile, getRememberedFileName } from '../backupFile'
import { runBackup, runRestoreFromFile } from '../components/backupActions'
import DriveBackupRows from '../components/DriveBackupCard'
import { auditData, type DataIssue } from '../dataAudit'
import {
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

  const download = downloadFile

  function handleExportExcel() {
    const xml = buildExcelXml(funds, cats, txs)
    const dateStr = new Date().toISOString().slice(0, 10)
    download(`MoneySave-BaoCao-${dateStr}.xls`, xml, 'application/vnd.ms-excel;charset=utf-8')
  }

  // Máy tính (Chrome/Edge): hiện tên file sao lưu đang được ghi đè
  const [backupFileName, setBackupFileName] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    getRememberedFileName().then(n => alive && setBackupFileName(n))
    return () => {
      alive = false
    }
  }, [])

  async function handleBackup(chooseNewLocation = false) {
    if (await runBackup({ chooseNewLocation })) setBackupFileName(await getRememberedFileName())
  }

  return (
    <>
      <div className="ledger-topbar" style={{ marginBottom: 14 }}>
        <h1 style={{ margin: 0 }}>⚙️ Cài đặt</h1>
      </div>

      {/* 1. TÀI KHOẢN & ĐỒNG BỘ NHIỀU THIẾT BỊ */}
      <h2>☁️ TÀI KHOẢN & ĐỒNG BỘ</h2>
      <div className="card">
        {authUser ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: 'var(--acc)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {authUser.email.slice(0, 1).toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis' }}>{authUser.email}</div>
                <div
                  className={syncSnap.status === 'error' ? 'exp' : syncSnap.status === 'synced' ? 'inc' : 'mut'}
                  style={{ fontSize: 12.5, marginTop: 2 }}
                >
                  {syncSnap.status === 'syncing'
                    ? '🔄 Đang đồng bộ...'
                    : syncSnap.status === 'error'
                      ? '⚠️ Đồng bộ lỗi'
                      : syncSnap.lastSyncedAt
                        ? `✅ Đã đồng bộ lúc ${format(new Date(syncSnap.lastSyncedAt), 'HH:mm dd/MM/yyyy')}`
                        : '⏳ Sẵn sàng đồng bộ'}
                </div>
              </div>
            </div>
            <small className="mut" style={{ display: 'block', margin: '10px 0', lineHeight: 1.45 }}>
              Tự động đồng bộ giữa các thiết bị đăng nhập tài khoản này (dữ liệu được mã hoá trước khi gửi lên Cloud).
            </small>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn on" style={{ fontSize: 12.5, padding: '6px 12px' }} onClick={handleSyncNow}>
                🔄 Đồng bộ ngay
              </button>
              <button
                type="button"
                className="btn"
                style={{ fontSize: 12.5, padding: '6px 12px' }}
                onClick={() => {
                  signOutUser()
                  setSyncMsg('Đã đăng xuất. Dữ liệu vẫn nằm trên máy này (chế độ chỉ lưu trên máy).')
                }}
              >
                Đăng xuất
              </button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '4px 0' }}>
            <div style={{ fontSize: 26, marginBottom: 4 }}>🔐</div>
            <b style={{ fontSize: 15 }}>Chưa đăng nhập – dữ liệu chỉ lưu trên máy này</b>
            <p className="mut" style={{ fontSize: 13, margin: '4px 0 12px', lineHeight: 1.4 }}>
              Đăng nhập bằng Email & Mật khẩu để tự động đồng bộ giữa điện thoại và máy tính.
            </p>
            <button
              type="button"
              className="btn on"
              style={{ width: '100%', padding: '11px', fontSize: 14.5, fontWeight: 700, borderRadius: 12 }}
              onClick={() => setShowAuthModal(true)}
            >
              🔑 Đăng nhập hoặc Đăng ký
            </button>
          </div>
        )}

        {(syncMsg || syncSnap.lastError) && (
          <div className={`credit-advice ${syncSnap.lastError ? 'due-soon' : 'optimal'}`} style={{ marginTop: 12 }}>
            {syncMsg || syncSnap.lastError}
          </div>
        )}
      </div>

      {/* 2. GIAO DIỆN */}
      <h2>🎨 GIAO DIỆN</h2>
      <div className="card">
        <div className="seg">
          <button type="button" className={theme === 'dark' ? 'on' : ''} onClick={() => handleThemeChange('dark')}>
            🌙 Tối
          </button>
          <button type="button" className={theme === 'light' ? 'on' : ''} onClick={() => handleThemeChange('light')}>
            ☀️ Sáng
          </button>
          <button type="button" className={theme === 'system' ? 'on' : ''} onClick={() => handleThemeChange('system')}>
            📱 Theo máy
          </button>
        </div>
      </div>

      {/* 3. DỮ LIỆU CÁ NHÂN (OFFLINE-FIRST) */}
      <h2>💾 SAO LƯU & KHÔI PHỤC</h2>
      <div className="card" style={{ padding: '4px 16px' }}>
        <DriveBackupRows />

        <div className="row">
          <div className="ico round" style={{ background: '#3b82f624' }}>
            💾
          </div>
          <div className="grow">
            <b>Sao lưu ra file</b>
            <small>
              {backupFileName
                ? `Ghi đè vào file "${backupFileName}" đã chọn trên máy`
                : 'Lưu file MoneySave-SaoLuu.json vào Tệp / iCloud / Google Drive. Lưu cùng chỗ và chọn "Thay thế" để bản mới ghi đè bản cũ'}
            </small>
            {canPickSaveFile() && backupFileName && (
              <button type="button" className="btn" style={{ marginTop: 6, padding: '7px 12px', fontSize: 12 }} onClick={() => handleBackup(true)}>
                Đổi nơi lưu
              </button>
            )}
          </div>
          <button type="button" className="btn pri" onClick={() => handleBackup()}>
            Sao lưu
          </button>
        </div>

        <div className="row">
          <div className="ico round" style={{ background: '#8b5cf624' }}>
            ⬆️
          </div>
          <div className="grow">
            <b>Khôi phục từ file</b>
            <small>Chọn file từ Tệp / iCloud / Google Drive – xem trước số giao dịch & ngày sao lưu trước khi ghi đè</small>
          </div>
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
            Khôi phục
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={e => {
              runRestoreFromFile(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </div>

        <div className="row">
          <div className="ico round" style={{ background: '#22c55e24' }}>
            📊
          </div>
          <div className="grow">
            <b>Xuất báo cáo Excel</b>
            <small>Xuất báo cáo 2 Sheet (Sổ giao dịch & Danh sách ví) mở trực tiếp bằng Excel</small>
          </div>
          <button type="button" className="btn pri" onClick={handleExportExcel}>
            Xuất Excel
          </button>
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

      {/* 5. THÔNG TIN LƯU TRỮ TRÊN THIẾT BỊ */}
      <h2>🛡️ DỮ LIỆU TRÊN MÁY NÀY</h2>
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
          🔒 Dữ liệu lưu ngay trên thiết bị này. Khi đăng nhập đồng bộ, dữ liệu được mã hoá (AES-256) trước khi gửi lên Cloud.
        </p>
        <a
          className="row"
          href="/privacy.html"
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: 'none', color: 'inherit', borderBottom: 0, padding: '8px 0 0' }}
        >
          <div className="ico round" style={{ background: '#64748b24' }}>
            📜
          </div>
          <div className="grow">
            <b>Chính sách quyền riêng tư</b>
            <small>Dữ liệu lưu ở đâu, quyền Google Drive, cách xoá dữ liệu</small>
          </div>
          <span className="mut" style={{ fontSize: 17 }}>›</span>
        </a>
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
        <div className="mut" style={{ fontSize: 12, marginTop: 2 }}>
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
