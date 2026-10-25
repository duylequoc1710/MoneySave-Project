import { useState } from 'react'
import { signInWithEmail, signUpWithEmail, type AuthUser } from '../auth.ts'

interface AuthLandingProps {
  onSuccess: (user: AuthUser) => void
  onSkip?: () => void
}

export default function AuthLanding({ onSuccess, onSkip }: AuthLandingProps) {
  const [mode, setMode] = useState<'login' | 'register'>('register')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      onSuccess(user)
    } catch (err) {
      setError((err as Error).message || 'Đã xảy ra lỗi, vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg, #000000)',
        padding: '24px 16px',
        color: 'var(--fg, #ffffff)',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 440,
          padding: '32px 24px',
          borderRadius: 24,
          background: 'var(--card, #16181c)',
          border: '1px solid var(--bd, #262930)',
          boxShadow: '0 20px 48px rgba(0,0,0,0.4)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <img
            src="/logo-moneysave-nav.png"
            alt="MoneySave"
            style={{ height: 42, objectFit: 'contain', marginBottom: 12 }}
          />
          <h1 style={{ fontSize: 20, margin: '0 0 6px 0', fontWeight: 800, letterSpacing: -0.3 }}>
            {mode === 'register' ? 'Tạo Tài Khoản MoneySave' : 'Đăng Nhập Tài Khoản'}
          </h1>
          <p className="mut" style={{ fontSize: 13.5, margin: 0, lineHeight: 1.5 }}>
            {mode === 'register'
              ? 'Tạo tài khoản cá nhân / gia đình để bắt đầu ghi chép & đồng bộ tức thì'
              : 'Đăng nhập để tự động khôi phục và đồng bộ toàn bộ sổ chi tiêu của bạn'}
          </p>
        </div>

        {/* Tab chuyển đổi Đăng ký / Đăng nhập */}
        <div
          style={{
            display: 'flex',
            background: 'color-mix(in srgb, var(--fg) 6%, transparent)',
            borderRadius: 14,
            padding: 4,
            marginBottom: 20,
          }}
        >
          <button
            type="button"
            onClick={() => {
              setMode('register')
              setError(null)
            }}
            style={{
              flex: 1,
              padding: '9px 12px',
              border: 0,
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              background: mode === 'register' ? 'var(--acc, #28c76f)' : 'transparent',
              color: mode === 'register' ? '#ffffff' : 'var(--mut)',
              transition: 'all 0.15s ease',
            }}
          >
            Đăng Ký
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('login')
              setError(null)
            }}
            style={{
              flex: 1,
              padding: '9px 12px',
              border: 0,
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              background: mode === 'login' ? 'var(--acc, #28c76f)' : 'transparent',
              color: mode === 'login' ? '#ffffff' : 'var(--mut)',
              transition: 'all 0.15s ease',
            }}
          >
            Đăng Nhập
          </button>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #ef4444',
              color: '#f87171',
              borderRadius: 12,
              padding: '12px 14px',
              fontSize: 13,
              marginBottom: 16,
              lineHeight: 1.45,
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label className="fld" style={{ marginBottom: 14, display: 'block' }}>
            <span style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }}>
              Địa chỉ Email
            </span>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@example.com"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '12px 14px',
                borderRadius: 12,
                border: '1px solid var(--bd)',
                background: 'var(--bg)',
                color: 'var(--fg)',
                fontSize: 14.5,
              }}
            />
          </label>

          <label className="fld" style={{ marginBottom: 20, display: 'block' }}>
            <span style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }}>
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
                padding: '12px 14px',
                borderRadius: 12,
                border: '1px solid var(--bd)',
                background: 'var(--bg)',
                color: 'var(--fg)',
                fontSize: 14.5,
              }}
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="btn on"
            style={{
              width: '100%',
              padding: '12px',
              fontSize: 15,
              fontWeight: 700,
              borderRadius: 12,
              background: 'var(--acc, #28c76f)',
              color: '#fff',
              border: 0,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(40,199,111,0.3)',
            }}
          >
            {loading
              ? '⏳ Đang xử lý...'
              : mode === 'register'
                ? 'Tạo Tài Khoản Mới'
                : 'Đăng Nhập Ngay'}
          </button>
        </form>

        {onSkip && (
          <div style={{ textAlign: 'center', marginTop: 18 }}>
            <button
              type="button"
              onClick={onSkip}
              className="link-green"
              style={{
                background: 'none',
                border: 0,
                fontSize: 13,
                cursor: 'pointer',
                color: 'var(--mut)',
              }}
            >
              Tiếp tục dùng thử ngoại tuyến (Không cần tài khoản) ›
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
