import { useEffect, useState } from 'react'
import { NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import Overview from './pages/Overview'
import Ledger from './pages/Ledger'
import Budgets from './pages/Budgets'
import Accounts from './pages/Accounts'
import Settings from './pages/Settings'
import TxForm from './components/TxForm'
import AuthLanding from './components/AuthLanding'
import { applyTheme, getStoredTheme } from './lib'
import {
  startRealtimeCloudSyncEngine,
  subscribeSyncState,
  type SyncStateSnapshot,
} from './cloudSync'
import { getAuthUser, subscribeAuth, type AuthUser } from './auth.ts'

export default function App() {
  const [addingTx, setAddingTx] = useState(false)
  const [syncSnap, setSyncSnap] = useState<SyncStateSnapshot>({
    status: 'idle',
    lastSyncedAt: null,
    lastError: null,
    remoteUpdatedAt: null,
  })
  const [authUser, setAuthUser] = useState<AuthUser | null>(getAuthUser())
  const [skipAuth, setSkipAuth] = useState(false)
  const nav = useNavigate()

  useEffect(() => {
    applyTheme(getStoredTheme())
    startRealtimeCloudSyncEngine()
    const unsubAuth = subscribeAuth(setAuthUser)
    const unsubSync = subscribeSyncState(setSyncSnap)
    return () => {
      unsubAuth()
      unsubSync()
    }
  }, [])

  const accountLabel = authUser ? `👤 ${authUser.email}` : '🔑 Đăng nhập / Đăng ký'

  if (!authUser && !skipAuth) {
    return (
      <AuthLanding
        onSuccess={user => {
          setAuthUser(user)
        }}
        onSkip={() => setSkipAuth(true)}
      />
    )
  }

  return (
    <div className="shell">
      <nav className="nav">
        <NavLink to="/" className="brand" title="MoneySave – Trang chủ">
          <img
            src="/logo-moneysave-nav.png"
            alt="MoneySave"
            className="brand-logo brand-logo-dark"
          />
          <img
            src="/logo-moneysave-nav-light.png"
            alt="MoneySave"
            className="brand-logo brand-logo-light"
          />
        </NavLink>
        <NavLink to="/" end>
          <span>🏠</span>Tổng quan
        </NavLink>
        <NavLink to="/ledger">
          <span>👛</span>Sổ giao dịch
        </NavLink>
        <NavLink to="/budgets">
          <span>📅</span>Ngân sách
        </NavLink>
        <NavLink to="/accounts">
          <span>👤</span>Ví của tôi
        </NavLink>
        <NavLink to="/settings">
          <span>⚙️</span>Cài đặt
        </NavLink>

        <div className="desktop-nav-footer">
          <button
            type="button"
            className="desktop-sync-pill"
            onClick={() => nav('/settings')}
            title={
              authUser
                ? `Tài khoản: ${authUser.email}\nTrạng thái: ${
                    syncSnap.status === 'error'
                      ? '⚠️ Lỗi đồng bộ: ' + (syncSnap.lastError ?? '')
                      : syncSnap.status === 'syncing'
                        ? '🔄 Đang đồng bộ...'
                        : '✅ Đã đồng bộ an toàn (E2EE)'
                  }`
                : 'Nhấp để Đăng nhập / Đăng ký'
            }
          >
            <span
              className={`sync-dot ${
                syncSnap.status === 'error' ? 'error' : ''
              }`}
            />
            <span className="sync-text">{accountLabel}</span>
          </button>
        </div>
      </nav>
      <main>
        {/* Thanh thương hiệu MoneySave trên giao diện Mobile */}
        <header className="mobile-brand-bar">
          <NavLink to="/" className="mobile-brand-link" title="MoneySave">
            <img
              src="/logo-moneysave-nav.png"
              alt="MoneySave"
              className="brand-logo brand-logo-dark"
            />
            <img
              src="/logo-moneysave-nav-light.png"
              alt="MoneySave"
              className="brand-logo brand-logo-light"
            />
          </NavLink>
          <button
            type="button"
            className="pill-tag"
            style={{
              fontSize: 10.5,
              border: 0,
              cursor: 'pointer',
              color: syncSnap.status === 'error' ? 'var(--exp)' : 'var(--acc)',
            }}
            onClick={() => nav('/settings')}
            title="Tài khoản & Đồng bộ Đám mây"
          >
            {accountLabel}
          </button>
        </header>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/ledger" element={<Ledger />} />
          <Route path="/budgets" element={<Budgets />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
      <button className="ml-fab-pill" onClick={() => setAddingTx(true)}>
        <span style={{ fontSize: 20, fontWeight: 400 }}>＋</span> Thêm giao dịch
      </button>
      {addingTx && <TxForm onClose={() => setAddingTx(false)} />}
    </div>
  )
}
