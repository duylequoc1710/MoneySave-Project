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
import { clearAllToCleanState, seedDemoData3Months } from '../demoData'
import {
  deriveVaultDocId,
  getCloudSyncConfig,
  getDeviceId,
  parseFirebaseConfigInput,
  pullCloudToLocal,
  pushLocalToCloud,
  saveCloudSyncConfig,
  subscribeSyncState,
  syncNowSmart,
  type SyncStateSnapshot,
} from '../cloudSync'
import { getAuthUser, signOutUser, subscribeAuth, type AuthUser } from '../auth.ts'
import AuthModal from '../components/AuthModal.tsx'

const NO_FUNDS: Fund[] = []
const NO_CATS: Category[] = []
const NO_TXS: Tx[] = []

const REALTIME_DB_RULES_SNIPPET = `{
  "rules": {
    "moneysave_vaults": {
      "$vaultId": {
        ".read": true,
        ".write": true
      }
    }
  }
}`

const FIRESTORE_RULES_SNIPPET = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /moneysave_vaults/{vaultId} {
      allow read, write: if request.resource == null
        || (request.resource.data.ciphertext is string
            && request.resource.data.ciphertext.size() < 950000);
    }
  }
}`

export default function Settings() {
  const [theme, setTheme] = useState<ThemeMode>(() => getStoredTheme())
  const fileRef = useRef<HTMLInputElement>(null)

  // Cloud Sync E2EE state
  const initCfg = getCloudSyncConfig()
  const [syncEnabled, setSyncEnabled] = useState(initCfg.enabled)
  const [rawFirebaseInput, setRawFirebaseInput] = useState(initCfg.projectId)
  const [apiKey, setApiKey] = useState(initCfg.apiKey ?? '')
  const [syncId, setSyncId] = useState(initCfg.syncId)
  const [passphrase, setPassphrase] = useState(initCfg.passphrase)
  const [showPass, setShowPass] = useState(false)
  const [vaultDocId, setVaultDocId] = useState<string>('')
  const [showAdvancedSync, setShowAdvancedSync] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)
  const [syncSnap, setSyncSnap] = useState<SyncStateSnapshot>({
    status: 'idle',
    lastSyncedAt: null,
    lastError: null,
    remoteUpdatedAt: null,
  })
  const [authUser, setAuthUser] = useState<AuthUser | null>(getAuthUser())
  const [showAuthModal, setShowAuthModal] = useState(false)

  useEffect(() => {
    return subscribeAuth(setAuthUser)
  }, [])

  useEffect(() => {
    return subscribeSyncState(setSyncSnap)
  }, [])

  useEffect(() => {
    if (syncId.trim() && passphrase) {
      deriveVaultDocId(syncId, passphrase).then(setVaultDocId).catch(() => setVaultDocId(''))
    } else {
      setVaultDocId('')
    }
  }, [syncId, passphrase])

  const funds = useLiveQuery(() => db.funds.toArray(), [], NO_FUNDS)
  const cats = useLiveQuery(() => db.categories.toArray(), [], NO_CATS)
  const txs = useLiveQuery(() => db.txs.toArray(), [], NO_TXS)
  const recurringsCount = useLiveQuery(() => db.recurrings.count(), [], 0)
  const budgetsCount = useLiveQuery(() => db.budgets.count(), [], 0)

  function handleThemeChange(next: ThemeMode) {
    setTheme(next)
    applyTheme(next)
  }

  function handleFirebaseInputPaste(val: string) {
    const parsed = parseFirebaseConfigInput(val)
    if (parsed.databaseUrl) {
      setRawFirebaseInput(parsed.databaseUrl)
    } else if (parsed.projectId) {
      setRawFirebaseInput(parsed.projectId)
    } else {
      setRawFirebaseInput(val)
    }
    if (parsed.apiKey) setApiKey(parsed.apiKey)
  }

  function currentDraftConfig(enabledOverride = syncEnabled) {
    const parsed = parseFirebaseConfigInput(rawFirebaseInput)
    return {
      enabled: enabledOverride,
      projectId: parsed.projectId || rawFirebaseInput.trim(),
      apiKey: parsed.apiKey || apiKey.trim(),
      databaseUrl: parsed.databaseUrl || (rawFirebaseInput.includes('http') ? rawFirebaseInput.trim() : ''),
      syncId: syncId.trim(),
      passphrase,
    }
  }

  async function handleSaveAndSync() {
    setSyncMsg(null)
    const cfg = currentDraftConfig(syncEnabled)
    saveCloudSyncConfig(cfg)
    if (!cfg.enabled) {
      setSyncMsg('Đã lưu cấu hình (Chế độ Offline-first, tắt đồng bộ tự động).')
      return
    }
    if ((!cfg.projectId && !cfg.databaseUrl) || !cfg.syncId || !cfg.passphrase) {
      setSyncMsg('⚠️ Vui lòng nhập URL Realtime Database (hoặc Project ID), Mã định danh (Sync ID) và Mật khẩu mã hóa.')
      return
    }
    const res = await syncNowSmart()
    if (res === 'pushed') {
      setSyncMsg('✅ Đã mã hóa AES-256 và đẩy dữ liệu lên Firebase thành công!')
    } else if (res === 'pulled') {
      setSyncMsg('✅ Đã tải và giải mã bản cập nhật mới nhất từ Firebase!')
    } else if (syncSnap.status !== 'error') {
      setSyncMsg('✅ Đã lưu cấu hình và kết nối đồng bộ thành công!')
    }
  }

  async function handleManualPush() {
    setSyncMsg(null)
    const cfg = currentDraftConfig(true)
    setSyncEnabled(true)
    saveCloudSyncConfig(cfg)
    try {
      await pushLocalToCloud(cfg)
      setSyncMsg('✅ Đã mã hóa AES-256 và ghi đè dữ liệu máy này lên Cloud thành công!')
    } catch (e) {
      setSyncMsg('❌ ' + (e as Error).message)
    }
  }

  async function handleManualPull() {
    setSyncMsg(null)
    const cfg = currentDraftConfig(true)
    setSyncEnabled(true)
    saveCloudSyncConfig(cfg)
    try {
      const ok = await pullCloudToLocal(cfg)
      if (ok) {
        setSyncMsg('✅ Đã tải và giải mã dữ liệu từ Cloud về máy này thành công!')
      } else {
        setSyncMsg('ℹ️ Trên Cloud chưa có dữ liệu cho Mã phòng & Mật khẩu này. Hãy bấm "Đẩy lên Cloud" trước.')
      }
    } catch (e) {
      setSyncMsg('❌ ' + (e as Error).message)
    }
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

      {/* 1. ĐỒNG BỘ ĐÁM MÂY REALTIME (FIREBASE FIRESTORE + E2EE AES-256) */}
      {/* 1. ĐỒNG BỘ ĐA THIẾT BỊ (FIREBASE AUTH & REALTIME E2EE) */}
      <h2>☁️ TÀI KHOẢN & ĐỒNG BỘ ĐA THIẾT BỊ (REALTIME E2EE)</h2>
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
                  onClick={() => handleSaveAndSync()}
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

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingBottom: 12,
            marginBottom: 12,
            borderBottom: '1px solid var(--bd)',
          }}
        >
          <div>
            <b style={{ fontSize: 15 }}>Tự động đồng bộ Realtime</b>
            <small className="mut" style={{ display: 'block', marginTop: 2 }}>
              Mã hóa đầu cuối <b>AES-GCM 256-bit</b> trước khi gửi lên Cloud
            </small>
          </div>
          <button
            type="button"
            className={`ios-switch ${syncEnabled ? 'on' : ''}`}
            onClick={() => {
              const next = !syncEnabled
              setSyncEnabled(next)
              saveCloudSyncConfig(currentDraftConfig(next))
            }}
            aria-label="Bật đồng bộ đám mây"
          />
        </div>

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
                      : syncEnabled
                        ? '⏳ Sẵn sàng đồng bộ'
                        : '🔒 Đang tắt (Chỉ lưu trên máy này)'}
              </b>
            </div>
            {syncSnap.lastSyncedAt && (
              <div className="mut" style={{ fontSize: 12, marginTop: 2 }}>
                Lần đồng bộ cuối: {format(new Date(syncSnap.lastSyncedAt), 'HH:mm:ss dd/MM/yyyy')} · Thiết bị:{' '}
                <code>{getDeviceId()}</code>
              </div>
            )}
          </div>
          {vaultDocId && (
            <span className="pill-tag" title={`Mã định danh Két sắt: ${vaultDocId}`}>
              🔑 {vaultDocId.slice(0, 12)}…
            </span>
          )}
        </div>

        {(syncMsg || syncSnap.lastError) && (
          <div
            className={`credit-advice ${syncSnap.lastError ? 'due-soon' : 'optimal'}`}
            style={{ marginBottom: 12 }}
          >
            {syncMsg || syncSnap.lastError}
          </div>
        )}

        {/* Cấu hình nâng cao (Dành cho Developer / Tự cấu hình Firebase Server thủ công) */}
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px dashed var(--bd)' }}>
          <button
            type="button"
            className="link-green"
            style={{
              background: 'none',
              border: 0,
              padding: '4px 0',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
            onClick={() => setShowAdvancedSync(v => !v)}
          >
            <span>{showAdvancedSync ? '▾' : '▸'}</span>
            <span>⚙️ Cấu hình máy chủ Firebase tùy chỉnh (Dành cho Developer / Tự lưu trữ)</span>
          </button>

          {showAdvancedSync && (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label className="fld">
                <span>1. URL Realtime Database hoặc Firebase Project ID</span>
                <input
                  value={rawFirebaseInput}
                  onChange={e => handleFirebaseInputPaste(e.target.value)}
                  placeholder="VD: https://moneysave-project-default-rtdb.asia-southeast1.firebasedatabase.app"
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label className="fld">
                  <span>2. Mã định danh cá nhân (Sync ID)</span>
                  <input
                    value={syncId}
                    onChange={e => setSyncId(e.target.value)}
                    placeholder="VD: moneysave-vault"
                  />
                </label>
                <label className="fld">
                  <span>Web API Key (Tuỳ chọn)</span>
                  <input
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder="Tự điền nếu dán firebaseConfig"
                  />
                </label>
              </div>

              <label className="fld">
                <span>3. Mật khẩu Mã hóa đầu cuối (Passphrase E2EE – AES-256)</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={passphrase}
                    onChange={e => setPassphrase(e.target.value)}
                    placeholder="Nhập mật khẩu bí mật dùng chung giữa Điện thoại & Mac..."
                  />
                  <button
                    type="button"
                    className="btn"
                    style={{ flex: 'none' }}
                    onClick={() => setShowPass(v => !v)}
                    title="Hiện/ẩn mật khẩu"
                  >
                    {showPass ? '🙈' : '👁'}
                  </button>
                </div>
                <small className="mut" style={{ display: 'block', marginTop: 4, fontSize: 12 }}>
                  🛡️ <b>Zero-Knowledge E2EE:</b> Mật khẩu này không bao giờ gửi lên mạng. Dữ liệu được mã hóa bằng thuật toán{' '}
                  <code>PBKDF2 (100,000 vòng) + AES-GCM 256-bit</code> ngay trên máy trước khi đẩy lên Firestore.
                </small>
              </label>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn pri"
                  style={{ flex: 1, minWidth: 160 }}
                  onClick={handleSaveAndSync}
                >
                  🔄 Lưu & Đồng bộ ngay
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={handleManualPush}
                  title="Mã hóa dữ liệu máy này và ghi đè lên Cloud"
                >
                  ⬆️ Đẩy máy này lên Cloud
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={handleManualPull}
                  title="Tải dữ liệu từ Cloud về và giải mã vào máy này"
                >
                  ⬇️ Tải từ Cloud về máy
                </button>
              </div>

              <div style={{ marginTop: 6, paddingTop: 10, borderTop: '1px dashed var(--bd)' }}>
                <button
                  type="button"
                  className="link-green"
                  style={{ background: 'none', border: 0, padding: 0, fontSize: 13 }}
                  onClick={() => setShowGuide(g => !g)}
                >
                  {showGuide ? '▾ Ẩn hướng dẫn cài đặt Firebase' : '▸ 📖 Hướng dẫn cấu hình Firebase (Realtime Database hoặc Firestore)'}
                </button>

                {showGuide && (
                  <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.55 }} className="mut">
                    <div style={{ marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid var(--bd)' }}>
                      <b style={{ color: 'var(--fg)', display: 'block', marginBottom: 4 }}>
                        🟢 Cách 1: Sử dụng Realtime Database (Đơn giản nhất, copy link database dán vào ô số 1):
                      </b>
                      <p style={{ marginBottom: 4 }}>
                        Vào tab <b>Rules</b> của Realtime Database, dán đoạn JSON sau rồi bấm <b>Publish</b>:
                      </p>
                      <pre
                        style={{
                          background: 'var(--bg)',
                          border: '1px solid var(--bd)',
                          borderRadius: 10,
                          padding: 10,
                          overflowX: 'auto',
                          fontSize: 11.5,
                          color: 'var(--fg)',
                          marginBottom: 6,
                        }}
                      >
                        {REALTIME_DB_RULES_SNIPPET}
                      </pre>
                      <button
                        type="button"
                        className="btn"
                        style={{ fontSize: 12, padding: '5px 10px' }}
                        onClick={() => {
                          navigator.clipboard?.writeText(REALTIME_DB_RULES_SNIPPET)
                          setSyncMsg('📋 Đã copy Realtime Database Rules vào bộ nhớ tạm!')
                        }}
                      >
                        📋 Copy Realtime Database Rules
                      </button>
                    </div>

                    <div>
                      <b style={{ color: 'var(--fg)', display: 'block', marginBottom: 4 }}>
                        🔵 Cách 2: Sử dụng Cloud Firestore:
                      </b>
                      <p style={{ marginBottom: 4 }}>
                        Vào tab <b>Rules</b> của Firestore Database, dán đoạn mã sau rồi bấm <b>Publish</b>:
                      </p>
                      <pre
                        style={{
                          background: 'var(--bg)',
                          border: '1px solid var(--bd)',
                          borderRadius: 10,
                          padding: 10,
                          overflowX: 'auto',
                          fontSize: 11.5,
                          color: 'var(--fg)',
                          marginBottom: 6,
                        }}
                      >
                        {FIRESTORE_RULES_SNIPPET}
                      </pre>
                      <button
                        type="button"
                        className="btn"
                        style={{ fontSize: 12, padding: '5px 10px' }}
                        onClick={() => {
                          navigator.clipboard?.writeText(FIRESTORE_RULES_SNIPPET)
                          setSyncMsg('📋 Đã copy Firestore Rules vào bộ nhớ tạm!')
                        }}
                      >
                        📋 Copy Firestore Rules
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
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
          Bản quyền © {new Date().getFullYear()} · Phiên bản 2.1.0
        </div>
      </footer>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={user => {
          setSyncMsg(`🎉 Chào mừng ${user.email}! Ứng dụng đang tự động đồng bộ ví của bạn...`)
          setTimeout(() => handleSaveAndSync(), 400)
        }}
      />
    </>
  )
}
