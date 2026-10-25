import { useState } from 'react'
import { signInWithEmail, signUpWithEmail, type AuthUser } from '../auth.ts'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (user: AuthUser) => void
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      let user: AuthUser
      if (mode === 'login') {
        user = await signInWithEmail(email, password)
      } else {
        user = await signUpWithEmail(email, password)
      }
      onSuccess?.(user)
      onClose()
    } catch (err) {
      setError((err as Error).message || 'Đã xảy ra lỗi, vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="modal-backdrop"
      onClick={e => {
        if (e.target === e.currentTarget && !loading) onClose()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 16,
      }}
    >
      <div
        className="modal-card"
        style={{
          background: 'var(--card-bg, #1c1c1e)',
          color: 'var(--fg, #ffffff)',
          border: '1px solid var(--bd, #2c2c2e)',
          borderRadius: 20,
          width: '100%',
          maxWidth: 420,
          padding: 24,
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <img
            src="/logo-moneysave-nav.png"
            alt="MoneySave"
            style={{ height: 36, objectFit: 'contain', marginBottom: 8 }}
          />
          <h2 style={{ fontSize: 18, margin: 0, fontWeight: 700 }}>
            {mode === 'login' ? 'Đăng Nhập MoneySave' : 'Tạo Tài Khoản Mới'}
          </h2>
          <p className="mut" style={{ fontSize: 13, margin: '6px 0 0 0' }}>
            {mode === 'login'
              ? 'Đồng bộ Realtime tự động trên mọi điện thoại & máy tính'
              : 'Dành riêng cho bạn hoặc thành viên gia đình sử dụng chung app'}
          </p>
        </div>

        {/* Tab chuyển đổi Đăng nhập / Đăng ký */}
        <div
          style={{
            display: 'flex',
            background: 'var(--bg, #121214)',
            borderRadius: 12,
            padding: 4,
            marginBottom: 18,
          }}
        >
          <button
            type="button"
            onClick={() => {
              setMode('login')
              setError(null)
            }}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: 0,
              borderRadius: 8,
              fontSize: 13.5,
              fontWeight: 600,
              cursor: 'pointer',
              background: mode === 'login' ? 'var(--acc, #2bc255)' : 'transparent',
              color: mode === 'login' ? '#ffffff' : 'var(--mut, #8e8e93)',
              transition: 'all 0.2s',
            }}
          >
            Đăng Nhập
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register')
              setError(null)
            }}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: 0,
              borderRadius: 8,
              fontSize: 13.5,
              fontWeight: 600,
              cursor: 'pointer',
              background: mode === 'register' ? 'var(--acc, #2bc255)' : 'transparent',
              color: mode === 'register' ? '#ffffff' : 'var(--mut, #8e8e93)',
              transition: 'all 0.2s',
            }}
          >
            Đăng Ký
          </button>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #ef4444',
              color: '#f87171',
              borderRadius: 10,
              padding: '10px 14px',
              fontSize: 13,
              marginBottom: 14,
              lineHeight: 1.4,
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label className="fld" style={{ marginBottom: 12, display: 'block' }}>
            <span style={{ fontSize: 13, fontWeight: 500, marginBottom: 4, display: 'block' }}>
              Địa chỉ Email
            </span>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="ví dụ: duyle@gmail.com"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 14px',
                borderRadius: 10,
                border: '1px solid var(--bd, #333)',
                background: 'var(--bg, #000)',
                color: 'var(--fg, #fff)',
                fontSize: 14,
              }}
            />
          </label>

          <label className="fld" style={{ marginBottom: 18, display: 'block' }}>
            <span style={{ fontSize: 13, fontWeight: 500, marginBottom: 4, display: 'block' }}>
              Mật khẩu {mode === 'register' && <small className="mut">(tối thiểu 6 ký tự)</small>}
            </span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 14px',
                borderRadius: 10,
                border: '1px solid var(--bd, #333)',
                background: 'var(--bg, #000)',
                color: 'var(--fg, #fff)',
                fontSize: 14,
              }}
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 12,
              border: 0,
              background: 'var(--acc, #2bc255)',
              color: '#ffffff',
              fontSize: 15,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            {loading ? 'Đang xử lý kết nối...' : mode === 'login' ? 'Đăng Nhập Ngay' : 'Tạo Tài Khoản Mới'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            style={{
              background: 'none',
              border: 0,
              color: 'var(--mut, #888)',
              fontSize: 13,
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: 4,
            }}
          >
            Tiếp tục dùng thử ngoại tuyến (Không cần tài khoản)
          </button>
        </div>
      </div>
    </div>
  )
}
