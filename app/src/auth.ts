import { DEFAULT_FIREBASE_CONFIG } from './firebaseConfig.ts'

export interface AuthUser {
  uid: string
  email: string
  displayName?: string
  idToken: string
  refreshToken: string
  expiresAt: number
}

const AUTH_STORAGE_KEY = 'moneysave_auth_user_v1'
let currentUser: AuthUser | null = loadStoredUser()
const authListeners = new Set<(u: AuthUser | null) => void>()

function loadStoredUser(): AuthUser | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed.uid === 'string' && typeof parsed.email === 'string') {
      return parsed as AuthUser
    }
  } catch {
    // ignore
  }
  return null
}

function saveUser(u: AuthUser | null) {
  currentUser = u
  if (typeof localStorage !== 'undefined') {
    if (u) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(u))
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY)
    }
  }
  authListeners.forEach(fn => fn(u))
}

export function getAuthUser(): AuthUser | null {
  return currentUser
}

export function subscribeAuth(listener: (u: AuthUser | null) => void): () => void {
  authListeners.add(listener)
  listener(currentUser)
  return () => authListeners.delete(listener)
}

function mapFirebaseError(raw: string): string {
  if (raw.includes('EMAIL_EXISTS')) {
    return 'Email này đã được đăng ký tài khoản. Vui lòng chọn tab Đăng Nhập.'
  }
  if (raw.includes('INVALID_LOGIN_CREDENTIALS') || raw.includes('EMAIL_NOT_FOUND') || raw.includes('INVALID_PASSWORD')) {
    return 'Email hoặc mật khẩu không chính xác. Vui lòng thử lại.'
  }
  if (raw.includes('WEAK_PASSWORD')) {
    return 'Mật khẩu phải có tối thiểu 6 ký tự.'
  }
  if (raw.includes('INVALID_EMAIL')) {
    return 'Địa chỉ email không đúng định dạng.'
  }
  if (raw.includes('OPERATION_NOT_ALLOWED')) {
    return 'Tính năng đăng nhập Email/Password chưa được kích hoạt trên Firebase Console. Vui lòng vào Authentication > Sign-in method > bật Email/Password.'
  }
  if (raw.includes('TOO_MANY_ATTEMPTS_TRY_LATER')) {
    return 'Bạn đã thử đăng nhập sai quá nhiều lần. Vui lòng thử lại sau vài phút.'
  }
  return raw || 'Đã xảy ra lỗi kết nối với máy chủ xác thực.'
}

/**
 * Đăng ký tài khoản mới bằng Email & Password
 */
export async function signUpWithEmail(email: string, pass: string): Promise<AuthUser> {
  const cleanEmail = email.trim().toLowerCase()
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Vui lòng nhập địa chỉ email hợp lệ.')
  }
  if (!pass || pass.length < 6) {
    throw new Error('Mật khẩu phải có tối thiểu 6 ký tự.')
  }

  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${DEFAULT_FIREBASE_CONFIG.apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: cleanEmail,
      password: pass,
      returnSecureToken: true,
    }),
  })

  const data = await res.json()
  if (!res.ok) {
    const msg = data?.error?.message || res.statusText
    throw new Error(mapFirebaseError(msg))
  }

  const expiresInSec = Number(data.expiresIn) || 3600
  const user: AuthUser = {
    uid: data.localId,
    email: data.email,
    idToken: data.idToken,
    refreshToken: data.refreshToken,
    expiresAt: Date.now() + expiresInSec * 1000,
  }

  saveUser(user)
  return user
}

/**
 * Đăng nhập bằng Email & Password
 */
export async function signInWithEmail(email: string, pass: string): Promise<AuthUser> {
  const cleanEmail = email.trim().toLowerCase()
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Vui lòng nhập địa chỉ email hợp lệ.')
  }
  if (!pass) {
    throw new Error('Vui lòng nhập mật khẩu.')
  }

  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${DEFAULT_FIREBASE_CONFIG.apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: cleanEmail,
      password: pass,
      returnSecureToken: true,
    }),
  })

  const data = await res.json()
  if (!res.ok) {
    const msg = data?.error?.message || res.statusText
    throw new Error(mapFirebaseError(msg))
  }

  const expiresInSec = Number(data.expiresIn) || 3600
  const user: AuthUser = {
    uid: data.localId,
    email: data.email,
    idToken: data.idToken,
    refreshToken: data.refreshToken,
    expiresAt: Date.now() + expiresInSec * 1000,
  }

  saveUser(user)
  return user
}

/**
 * Đăng xuất tài khoản
 */
export function signOutUser() {
  saveUser(null)
}

/**
 * Tự động làm mới Firebase Token nếu sắp hết hạn
 */
export async function refreshTokenIfNeeded(): Promise<string | null> {
  if (!currentUser) return null
  const now = Date.now()
  // Nếu token còn hạn trên 5 phút thì không cần refresh
  if (currentUser.expiresAt - now > 5 * 60 * 1000) {
    return currentUser.idToken
  }

  try {
    const url = `https://securetoken.googleapis.com/v1/token?key=${DEFAULT_FIREBASE_CONFIG.apiKey}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: currentUser.refreshToken,
      }),
    })
    if (!res.ok) return currentUser.idToken
    const data = await res.json()
    const expiresInSec = Number(data.expires_in) || 3600
    currentUser.idToken = data.id_token
    currentUser.refreshToken = data.refresh_token
    currentUser.expiresAt = Date.now() + expiresInSec * 1000
    saveUser(currentUser)
    return currentUser.idToken
  } catch {
    return currentUser.idToken
  }
}
