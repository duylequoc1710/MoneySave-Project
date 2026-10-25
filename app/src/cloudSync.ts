import { db, exportAll, importAll } from './db.ts'
import { getAuthUser, subscribeAuth } from './auth.ts'
import { DEFAULT_FIREBASE_CONFIG } from './firebaseConfig.ts'

export interface CloudSyncConfig {
  enabled: boolean
  projectId: string
  apiKey?: string
  databaseUrl?: string
  syncId: string
  passphrase: string
}

export interface EncryptedVaultPayload {
  v: 1
  alg: 'AES-GCM-256/PBKDF2-SHA256'
  salt: string // base64
  iv: string // base64
  ciphertext: string // base64
  updatedAt: number
  deviceId: string
  checksum: string
}

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error'

export interface SyncStateSnapshot {
  status: SyncStatus
  lastSyncedAt: number | null
  lastError: string | null
  remoteUpdatedAt: number | null
}

const SYNC_CONFIG_KEY = 'moneysave_cloud_sync_cfg_v1'
const SYNC_META_KEY = 'moneysave_cloud_sync_meta_v1'
const DEVICE_ID_KEY = 'moneysave_device_id_v1'
const LOCAL_MUTATION_KEY = 'moneysave_local_mutated_at_v1'

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i)
  }
  return out
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export function getDeviceId(): string {
  if (typeof localStorage === 'undefined') return 'node-test-device'
  let id = localStorage.getItem(DEVICE_ID_KEY)
  if (!id) {
    const rand = crypto.getRandomValues(new Uint8Array(6))
    id = 'dev-' + toHex(rand)
    localStorage.setItem(DEVICE_ID_KEY, id)
  }
  return id
}

/**
 * Cho phép người dùng dán linh hoạt:
 * - Link Realtime Database (ví dụ: `https://moneysave-project-default-rtdb.asia-southeast1.firebasedatabase.app`)
 * - Hoặc chỉ `projectId` (ví dụ: `moneysave-12345`)
 * - Hoặc toàn bộ đoạn mã `const firebaseConfig = { projectId: "...", databaseURL: "...", apiKey: "..." }`
 */
export function parseFirebaseConfigInput(raw: string): { projectId: string; apiKey: string; databaseUrl: string } {
  const trimmed = raw.trim()
  if (!trimmed) return { projectId: '', apiKey: '', databaseUrl: '' }

  const projMatch = trimmed.match(/["']?projectId["']?\s*:\s*["']([^"']+)["']/)
  const keyMatch = trimmed.match(/["']?apiKey["']?\s*:\s*["']([^"']+)["']/)
  const dbUrlMatch = trimmed.match(/["']?databaseURL["']?\s*:\s*["']([^"']+)["']/)

  if (projMatch || dbUrlMatch) {
    return {
      projectId: projMatch ? projMatch[1].trim() : '',
      apiKey: keyMatch ? keyMatch[1].trim() : '',
      databaseUrl: dbUrlMatch ? dbUrlMatch[1].trim() : '',
    }
  }

  // Nếu người dùng dán trực tiếp đường dẫn URL của Realtime Database
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const cleanUrl = trimmed.replace(/\/$/, '')
    const hostMatch = cleanUrl.match(/https?:\/\/([^.]+)/)
    const derivedProj = hostMatch ? hostMatch[1].replace(/-default-rtdb$/, '') : ''
    return {
      projectId: derivedProj,
      apiKey: '',
      databaseUrl: cleanUrl,
    }
  }

  // Nếu người dùng chỉ nhập mã projectId đơn thuần (ví dụ: moneysave-personal)
  const cleanId = trimmed.replace(/[^a-zA-Z0-9-]/g, '')
  return { projectId: cleanId, apiKey: '', databaseUrl: '' }
}

/**
 * Băm SHA-256 để tạo Document ID ẩn danh trên Firestore từ (syncId + passphrase).
 * Không ai trên Firestore có thể đoán được Document ID nếu không có cả syncId và mật khẩu.
 */
export async function deriveVaultDocId(syncId: string, passphrase: string): Promise<string> {
  const enc = new TextEncoder()
  const data = enc.encode(`moneysave-e2ee-v1:${syncId.trim().toLowerCase()}:${passphrase}`)
  const hashBuf = await crypto.subtle.digest('SHA-256', data)
  return 'vault_' + toHex(new Uint8Array(hashBuf)).slice(0, 40)
}

async function deriveAesKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: 100_000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

/**
 * Mã hóa đầu cuối (E2EE) chuỗi JSON sao lưu bằng chuẩn AES-GCM 256-bit
 */
export async function encryptVault(
  plaintextJson: string,
  passphrase: string,
  deviceId = getDeviceId(),
  updatedAt = Date.now(),
): Promise<EncryptedVaultPayload> {
  if (!passphrase) throw new Error('Vui lòng nhập mật khẩu mã hóa (Passphrase)')
  const enc = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveAesKey(passphrase, salt)

  const plainBytes = enc.encode(plaintextJson)
  const cipherBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    plainBytes,
  )
  const digestBuf = await crypto.subtle.digest('SHA-256', plainBytes)

  return {
    v: 1,
    alg: 'AES-GCM-256/PBKDF2-SHA256',
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(cipherBuf)),
    updatedAt,
    deviceId,
    checksum: toHex(new Uint8Array(digestBuf)).slice(0, 16),
  }
}

/**
 * Giải mã đầu cuối (E2EE) gói dữ liệu từ Firestore về lại chuỗi JSON MoneySave
 */
export async function decryptVault(payload: EncryptedVaultPayload, passphrase: string): Promise<string> {
  if (!passphrase) throw new Error('Thiếu mật khẩu giải mã (Passphrase)')
  const salt = fromBase64(payload.salt)
  const iv = fromBase64(payload.iv)
  const cipherBytes = fromBase64(payload.ciphertext)
  const key = await deriveAesKey(passphrase, salt)

  try {
    const plainBuf = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as unknown as BufferSource },
      key,
      cipherBytes as unknown as BufferSource,
    )
    return new TextDecoder().decode(plainBuf)
  } catch {
    throw new Error('Không thể giải mã dữ liệu: Mật khẩu mã hóa (Passphrase) không đúng hoặc dữ liệu bị hỏng.')
  }
}

export function getCloudSyncConfig(): CloudSyncConfig {
  if (typeof localStorage === 'undefined') {
    return { enabled: false, projectId: '', apiKey: '', databaseUrl: '', syncId: '', passphrase: '' }
  }
  try {
    const raw = localStorage.getItem(SYNC_CONFIG_KEY)
    if (!raw) return { enabled: false, projectId: '', apiKey: '', databaseUrl: '', syncId: '', passphrase: '' }
    const parsed = JSON.parse(raw)
    return {
      enabled: Boolean(parsed.enabled),
      projectId: String(parsed.projectId ?? ''),
      apiKey: String(parsed.apiKey ?? ''),
      databaseUrl: String(parsed.databaseUrl ?? ''),
      syncId: String(parsed.syncId ?? ''),
      passphrase: String(parsed.passphrase ?? ''),
    }
  } catch {
    return { enabled: false, projectId: '', apiKey: '', databaseUrl: '', syncId: '', passphrase: '' }
  }
}

/**
 * Trả về cấu hình đồng bộ đang có hiệu lực:
 * - Nếu người dùng đã đăng nhập tài khoản (Firebase Auth), tự động đồng bộ theo User UID
 *   và mã hóa E2EE bằng khóa tài khoản riêng.
 * - Nếu chưa đăng nhập, dùng cấu hình thủ công hoặc offline-first.
 */
export function getActiveCloudSyncConfig(): CloudSyncConfig {
  const user = getAuthUser()
  if (user) {
    return {
      enabled: true,
      projectId: DEFAULT_FIREBASE_CONFIG.projectId,
      apiKey: DEFAULT_FIREBASE_CONFIG.apiKey,
      databaseUrl: DEFAULT_FIREBASE_CONFIG.databaseURL,
      syncId: `usr_${user.uid}`,
      passphrase: `ms-e2ee-vault:${user.uid}:${user.email}`,
    }
  }
  return getCloudSyncConfig()
}

export function saveCloudSyncConfig(cfg: CloudSyncConfig) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(cfg))
  }
  notifySyncListeners()
}

export function getLastSyncedAt(): number | null {
  if (typeof localStorage === 'undefined') return null
  const v = Number(localStorage.getItem(SYNC_META_KEY))
  return Number.isFinite(v) && v > 0 ? v : null
}

function setLastSyncedAt(ts: number) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(SYNC_META_KEY, String(ts))
  }
}

export function getLocalMutatedAt(): number {
  if (typeof localStorage === 'undefined') return 0
  return Number(localStorage.getItem(LOCAL_MUTATION_KEY)) || 0
}

export function markLocalMutated() {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(LOCAL_MUTATION_KEY, String(Date.now()))
  }
}

function getEffectiveRtdbUrl(cfg: CloudSyncConfig): string | null {
  if (cfg.databaseUrl && cfg.databaseUrl.trim()) {
    return cfg.databaseUrl.trim().replace(/\/$/, '')
  }
  if (cfg.projectId && (cfg.projectId.includes('firebasedatabase.app') || cfg.projectId.includes('firebaseio.com'))) {
    let u = cfg.projectId.trim()
    if (!u.startsWith('http')) u = 'https://' + u
    return u.replace(/\/$/, '')
  }
  return null
}

function buildFirestoreDocUrl(cfg: CloudSyncConfig, docId: string): string {
  const base = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(cfg.projectId.trim())}/databases/(default)/documents/moneysave_vaults/${encodeURIComponent(docId)}`
  if (cfg.apiKey?.trim()) {
    return `${base}?key=${encodeURIComponent(cfg.apiKey.trim())}`
  }
  return base
}

/**
 * Đọc gói dữ liệu mã hóa từ Cloud (tự động nhận diện Realtime Database hoặc Firestore)
 */
export async function fetchRemoteVault(cfg: CloudSyncConfig): Promise<EncryptedVaultPayload | null> {
  const docId = await deriveVaultDocId(cfg.syncId, cfg.passphrase)
  const rtdbUrl = getEffectiveRtdbUrl(cfg)

  if (rtdbUrl) {
    // Kết nối Firebase Realtime Database
    const url = `${rtdbUrl}/moneysave_vaults/${encodeURIComponent(docId)}.json`
    const res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } })
    if (res.status === 404) return null
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      throw new Error(`Realtime Database lỗi (${res.status}): ${errText.slice(0, 140) || res.statusText}`)
    }
    const data = await res.json()
    if (!data || !data.ciphertext) return null
    return data as EncryptedVaultPayload
  }

  // Kết nối Cloud Firestore REST API
  const url = buildFirestoreDocUrl(cfg, docId)
  const res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } })
  if (res.status === 404) return null
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Firestore lỗi (${res.status}): ${errText.slice(0, 140) || res.statusText}`)
  }
  const doc = await res.json()
  const f = doc?.fields
  if (!f?.ciphertext?.stringValue) return null
  return {
    v: 1,
    alg: 'AES-GCM-256/PBKDF2-SHA256',
    salt: String(f.salt?.stringValue ?? ''),
    iv: String(f.iv?.stringValue ?? ''),
    ciphertext: String(f.ciphertext?.stringValue ?? ''),
    updatedAt: Number(f.updatedAt?.integerValue ?? 0),
    deviceId: String(f.deviceId?.stringValue ?? ''),
    checksum: String(f.checksum?.stringValue ?? ''),
  }
}

/**
 * Ghi gói dữ liệu đã mã hóa AES-256 lên Cloud (tự động nhận diện Realtime Database hoặc Firestore)
 */
export async function pushEncryptedVaultToRemote(
  cfg: CloudSyncConfig,
  payload: EncryptedVaultPayload,
): Promise<void> {
  const docId = await deriveVaultDocId(cfg.syncId, cfg.passphrase)
  const rtdbUrl = getEffectiveRtdbUrl(cfg)

  if (rtdbUrl) {
    // Ghi lên Firebase Realtime Database REST API (PUT ghi đè node két sắt ẩn danh)
    const url = `${rtdbUrl}/moneysave_vaults/${encodeURIComponent(docId)}.json`
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      throw new Error(`Không thể đẩy lên Realtime Database (${res.status}): ${errText.slice(0, 160) || res.statusText}`)
    }
    return
  }

  // Ghi lên Cloud Firestore REST API
  const url = buildFirestoreDocUrl(cfg, docId)
  const body = {
    fields: {
      v: { integerValue: String(payload.v) },
      alg: { stringValue: payload.alg },
      salt: { stringValue: payload.salt },
      iv: { stringValue: payload.iv },
      ciphertext: { stringValue: payload.ciphertext },
      updatedAt: { integerValue: String(payload.updatedAt) },
      deviceId: { stringValue: payload.deviceId },
      checksum: { stringValue: payload.checksum },
    },
  }
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Không thể đẩy lên Firestore (${res.status}): ${errText.slice(0, 160) || res.statusText}`)
  }
}

// ================= QUẢN LÝ TRẠNG THÁI & ĐỒNG BỘ REALTIME TỰ ĐỘNG =================

let syncState: SyncStateSnapshot = {
  status: 'idle',
  lastSyncedAt: getLastSyncedAt(),
  lastError: null,
  remoteUpdatedAt: null,
}

const listeners = new Set<(s: SyncStateSnapshot) => void>()

function notifySyncListeners() {
  const snap = { ...syncState }
  listeners.forEach(fn => fn(snap))
}

export function subscribeSyncState(fn: (s: SyncStateSnapshot) => void): () => void {
  listeners.add(fn)
  fn({ ...syncState })
  return () => listeners.delete(fn)
}

let isApplyingRemoteImport = false
let pushDebounceTimer: ReturnType<typeof setTimeout> | null = null

/**
 * Đẩy dữ liệu hiện tại của máy lên Cloud (Mã hóa E2EE trước khi gửi)
 */
export async function pushLocalToCloud(customCfg?: CloudSyncConfig): Promise<EncryptedVaultPayload> {
  const cfg = customCfg ?? getActiveCloudSyncConfig()
  if (!cfg.projectId || !cfg.syncId || !cfg.passphrase) {
    throw new Error('Vui lòng nhập đầy đủ thông tin hoặc đăng nhập tài khoản.')
  }
  syncState = { ...syncState, status: 'syncing', lastError: null }
  notifySyncListeners()
  try {
    const json = await exportAll(db)
    const now = Date.now()
    const payload = await encryptVault(json, cfg.passphrase, getDeviceId(), now)
    await pushEncryptedVaultToRemote(cfg, payload)
    setLastSyncedAt(now)
    syncState = {
      status: 'synced',
      lastSyncedAt: now,
      lastError: null,
      remoteUpdatedAt: now,
    }
    notifySyncListeners()
    return payload
  } catch (e) {
    const msg = (e as Error).message
    syncState = { ...syncState, status: 'error', lastError: msg }
    notifySyncListeners()
    throw e
  }
}

/**
 * Tải dữ liệu từ Cloud về máy này và giải mã E2EE
 */
export async function pullCloudToLocal(customCfg?: CloudSyncConfig): Promise<boolean> {
  const cfg = customCfg ?? getActiveCloudSyncConfig()
  if (!cfg.projectId || !cfg.syncId || !cfg.passphrase) {
    throw new Error('Vui lòng nhập đầy đủ thông tin hoặc đăng nhập tài khoản.')
  }
  syncState = { ...syncState, status: 'syncing', lastError: null }
  notifySyncListeners()
  try {
    const remote = await fetchRemoteVault(cfg)
    if (!remote) {
      syncState = { ...syncState, status: 'idle', lastError: null }
      notifySyncListeners()
      return false
    }
    const decryptedJson = await decryptVault(remote, cfg.passphrase)
    isApplyingRemoteImport = true
    try {
      await importAll(decryptedJson, db)
    } finally {
      setTimeout(() => {
        isApplyingRemoteImport = false
      }, 400)
    }
    setLastSyncedAt(remote.updatedAt)
    syncState = {
      status: 'synced',
      lastSyncedAt: remote.updatedAt,
      lastError: null,
      remoteUpdatedAt: remote.updatedAt,
    }
    notifySyncListeners()
    return true
  } catch (e) {
    const msg = (e as Error).message
    syncState = { ...syncState, status: 'error', lastError: msg }
    notifySyncListeners()
    throw e
  }
}

/**
 * Đồng bộ 2 chiều thông minh (Smart Realtime Sync):
 * - Nếu trên Cloud chưa có bản ghi nào -> tự động đẩy dữ liệu máy hiện tại lên Cloud.
 * - Nếu bản trên Cloud mới hơn bản máy hiện tại (do thiết bị khác vừa cập nhật) -> tự động tải về và giải mã.
 * - Nếu máy hiện tại có thay đổi mới hơn bản trên Cloud -> tự động mã hóa và đẩy lên Cloud.
 * - Hỗ trợ cờ silent: khi chạy ngầm định kỳ (polling) hoặc chuyển tab, kiểm tra im lặng không gây giật / nháy lại toàn bộ giao diện nếu không có thay đổi.
 */
export async function syncNowSmart(silent = false): Promise<'pushed' | 'pulled' | 'noop'> {
  const cfg = getActiveCloudSyncConfig()
  if (!cfg.enabled || !cfg.projectId || !cfg.syncId || !cfg.passphrase) return 'noop'
  if (syncState.status === 'syncing') return 'noop'

  if (!silent) {
    syncState = { ...syncState, status: 'syncing', lastError: null }
    notifySyncListeners()
  }

  try {
    const remote = await fetchRemoteVault(cfg)
    const lastSync = getLastSyncedAt() ?? 0
    const localMut = getLocalMutatedAt()

    if (!remote) {
      await pushLocalToCloud(cfg)
      return 'pushed'
    }

    // Nếu bản trên Cloud được cập nhật từ thiết bị khác và mới hơn lần đồng bộ cuối của máy này
    if (remote.updatedAt > lastSync && remote.deviceId !== getDeviceId() && remote.updatedAt >= localMut) {
      const decryptedJson = await decryptVault(remote, cfg.passphrase)
      isApplyingRemoteImport = true
      try {
        await importAll(decryptedJson, db)
      } finally {
        setTimeout(() => {
          isApplyingRemoteImport = false
        }, 400)
      }
      setLastSyncedAt(remote.updatedAt)
      syncState = {
        status: 'synced',
        lastSyncedAt: remote.updatedAt,
        lastError: null,
        remoteUpdatedAt: remote.updatedAt,
      }
      notifySyncListeners()
      return 'pulled'
    }

    // Nếu máy này vừa có chỉnh sửa mới hơn lần đồng bộ cuối
    if (localMut > lastSync) {
      await pushLocalToCloud(cfg)
      return 'pushed'
    }

    // Nếu chạy ngầm (silent) và không có dữ liệu mới, giữ nguyên trạng thái không kích hoạt re-render toàn app
    if (!silent) {
      syncState = {
        status: 'synced',
        lastSyncedAt: lastSync || remote.updatedAt,
        lastError: null,
        remoteUpdatedAt: remote.updatedAt,
      }
      notifySyncListeners()
    }
    return 'noop'
  } catch (e) {
    const msg = (e as Error).message
    if (!silent) {
      syncState = { ...syncState, status: 'error', lastError: msg }
      notifySyncListeners()
    }
    return 'noop'
  }
}

let realtimeStarted = false

/**
 * Khởi chạy bộ lắng nghe thay đổi IndexedDB cục bộ (Auto-Push sau 1.5s)
 * và bộ lắng nghe Cloud định kỳ / khi chuyển qua lại giữa Điện thoại & Máy tính (Auto-Pull)
 */
export function startRealtimeCloudSyncEngine() {
  if (realtimeStarted || typeof window === 'undefined') return
  realtimeStarted = true

  const scheduleAutoPush = () => {
    if (isApplyingRemoteImport) return
    markLocalMutated()
    const cfg = getActiveCloudSyncConfig()
    if (!cfg.enabled || !cfg.projectId || !cfg.syncId || !cfg.passphrase) return
    if (pushDebounceTimer) clearTimeout(pushDebounceTimer)
    pushDebounceTimer = setTimeout(() => {
      pushLocalToCloud(cfg).catch(() => {})
    }, 1500)
  }

  // Lắng nghe thay đổi tài khoản đăng nhập (Login / Logout)
  subscribeAuth(user => {
    if (user) {
      setTimeout(() => {
        syncNowSmart().catch(() => {})
      }, 300)
    } else {
      syncState = { ...syncState, status: 'idle', lastError: null }
      notifySyncListeners()
    }
  })

  // Lắng nghe mọi thao tác Thêm / Sửa / Xoá trên tất cả các bảng của Dexie
  const tables = [db.funds, db.categories, db.txs, db.budgets, db.recurrings]
  for (const tbl of tables) {
    tbl.hook('creating', () => scheduleAutoPush())
    tbl.hook('updating', () => scheduleAutoPush())
    tbl.hook('deleting', () => scheduleAutoPush())
  }

  // Đồng bộ ngay khi mở app
  setTimeout(() => {
    syncNowSmart().catch(() => {})
  }, 1200)

  // Tự động kiểm tra im lặng khi người dùng mở lại tab / mở điện thoại lên hoặc có mạng trở lại
  window.addEventListener('focus', () => {
    syncNowSmart(true).catch(() => {})
  })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      syncNowSmart(true).catch(() => {})
    }
  })
  window.addEventListener('online', () => {
    syncNowSmart(false).catch(() => {})
  })

  // Polling nhẹ mỗi 30 giây khi đang mở ứng dụng để nhận cập nhật Realtime từ thiết bị khác (chạy ngầm hoàn toàn im lặng)
  setInterval(() => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      syncNowSmart(true).catch(() => {})
    }
  }, 30_000)
}
