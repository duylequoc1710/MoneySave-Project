/**
 * S4a – Sao lưu / khôi phục qua Google Drive của CHÍNH người dùng (không qua máy chủ nào của MoneySave).
 *
 * - Đăng nhập: Google Identity Services (token model) – không client secret, không redirect, không refresh token.
 *   Mã truy cập (~1 giờ) chỉ giữ trong bộ nhớ, KHÔNG lưu localStorage.
 * - Quyền `drive.file`: app chỉ thấy file/thư mục do chính nó tạo (thư mục "MoneySave Backup").
 * - Quy ước file: `MoneySave-YYYY-MM-DD.json`, mỗi ngày 1 file (sao lưu lại trong ngày → ghi đè), giữ tối đa
 *   DRIVE_KEEP bản mới nhất, bản cũ hơn bị xoá (chỉ trong thư mục của app).
 * - Phần đầu file là các hàm thuần (unit test được, xem googleDrive.test.ts).
 */

export const GOOGLE_CLIENT_ID =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_CLIENT_ID) ||
  '356324629636-1qot1jbqm32k5v15tlatr37ong8o6ja4.apps.googleusercontent.com'
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file'
export const DRIVE_FOLDER_NAME = 'MoneySave Backup'
export const DRIVE_KEEP = 30
const FOLDER_MIME = 'application/vnd.google-apps.folder'
const NAME_RE = /^MoneySave-(\d{4}-\d{2}-\d{2})\.json$/

export interface DriveFile {
  id: string
  name: string
  modifiedTime?: string
  size?: string
}

// ---------------- Hàm thuần ----------------

/** Tên file sao lưu theo NGÀY ĐỊA PHƯƠNG (không dùng toISOString để tránh lệch múi giờ). */
export function driveBackupName(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `MoneySave-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.json`
}

/** Ngày YYYY-MM-DD trong tên file, hoặc null nếu không phải file sao lưu của app. */
export function backupDateFromName(name: string): string | null {
  return NAME_RE.exec(name)?.[1] ?? null
}

/** Chỉ giữ file sao lưu đúng quy ước, mới nhất trước (theo ngày trong tên, rồi modifiedTime). */
export function sortBackups(files: DriveFile[]): DriveFile[] {
  return files
    .filter(f => backupDateFromName(f.name))
    .sort(
      (a, b) =>
        backupDateFromName(b.name)!.localeCompare(backupDateFromName(a.name)!) ||
        (b.modifiedTime ?? '').localeCompare(a.modifiedTime ?? ''),
    )
}

/** id các file cần xoá để chỉ còn `keep` bản mới nhất. File không đúng quy ước tên thì KHÔNG bao giờ xoá. */
export function pickFilesToPrune(files: DriveFile[], keep = DRIVE_KEEP): string[] {
  return sortBackups(files)
    .slice(keep)
    .map(f => f.id)
}

/** Thân request multipart/related (metadata JSON + nội dung) cho Drive upload API. */
export function buildMultipartBody(metadata: object, content: string, boundary: string): string {
  return (
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${content}\r\n--${boundary}--`
  )
}

/** Escape chuỗi trong câu truy vấn `q` của Drive. */
export function driveQ(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

// ---------------- Trạng thái kết nối (chỉ cờ, không lưu token) ----------------
const CONNECTED_KEY = 'moneysave_gdrive_connected'
const LAST_DRIVE_BACKUP_KEY = 'moneysave_gdrive_last_backup_at'

function lsGet(k: string): string | null {
  try {
    return localStorage.getItem(k)
  } catch {
    return null
  }
}
function lsSet(k: string, v: string | null) {
  try {
    if (v === null) localStorage.removeItem(k)
    else localStorage.setItem(k, v)
  } catch {
    /* ignore */
  }
}

export function isDriveConnected(): boolean {
  return lsGet(CONNECTED_KEY) === '1'
}
export function lastDriveBackupAt(): number | null {
  const v = Number(lsGet(LAST_DRIVE_BACKUP_KEY))
  return Number.isFinite(v) && v > 0 ? v : null
}

// ---------------- Google Identity Services ----------------
interface TokenResponse {
  access_token?: string
  expires_in?: number | string
  error?: string
  error_description?: string
}
interface TokenClient {
  requestAccessToken: (o?: { prompt?: string }) => void
}
type GoogleWin = Window & {
  google?: {
    accounts: {
      oauth2: {
        initTokenClient: (cfg: {
          client_id: string
          scope: string
          callback: (r: TokenResponse) => void
          error_callback?: (e: { type?: string; message?: string }) => void
        }) => TokenClient
        revoke: (token: string, done?: () => void) => void
      }
    }
  }
}

let gisPromise: Promise<void> | null = null
let tokenClient: TokenClient | null = null
let token: { value: string; exp: number } | null = null
let pending: { resolve: (t: string) => void; reject: (e: Error) => void } | null = null

/** Tải thư viện đăng nhập Google trước (gọi khi mở trang Cài đặt) để lúc bấm nút mở popup ngay – iOS chặn popup nếu chờ tải. */
export function preloadGoogleDrive(): Promise<void> {
  if (gisPromise) return gisPromise
  gisPromise = new Promise<void>((resolve, reject) => {
    if ((window as GoogleWin).google?.accounts?.oauth2) return resolve()
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => {
      gisPromise = null
      reject(new Error('Không tải được thư viện đăng nhập Google (kiểm tra kết nối mạng).'))
    }
    document.head.appendChild(s)
  }).then(() => {
    tokenClient = (window as GoogleWin).google!.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: DRIVE_SCOPE,
      callback: r => {
        const p = pending
        pending = null
        if (r.access_token) {
          token = { value: r.access_token, exp: Date.now() + (Number(r.expires_in) || 3600) * 1000 - 60_000 }
          lsSet(CONNECTED_KEY, '1')
          p?.resolve(r.access_token)
        } else {
          p?.reject(new Error(r.error_description || r.error || 'Google từ chối cấp quyền.'))
        }
      },
      error_callback: e => {
        const p = pending
        pending = null
        const msg =
          e?.type === 'popup_closed'
            ? 'Bạn đã đóng cửa sổ đăng nhập Google.'
            : e?.type === 'popup_failed_to_open'
              ? 'Trình duyệt chặn cửa sổ đăng nhập Google. Hãy bấm lại nút (hoặc cho phép cửa sổ bật lên).'
              : e?.message || 'Đăng nhập Google thất bại.'
        p?.reject(new Error(msg))
      },
    })
  })
  return gisPromise
}

/**
 * Lấy mã truy cập. PHẢI gọi ngay trong sự kiện bấm nút (trước mọi `await`) để popup không bị chặn.
 * Có mã còn hạn → trả luôn, không hiện popup.
 */
export function getDriveToken(): Promise<string> {
  if (token && token.exp > Date.now()) return Promise.resolve(token.value)
  const request = () =>
    new Promise<string>((resolve, reject) => {
      pending?.reject(new Error('Yêu cầu đăng nhập mới thay thế yêu cầu cũ.'))
      pending = { resolve, reject }
      // Đã kết nối trước đó → không hỏi lại màn hình chọn quyền (Google tự đóng popup nếu đã cho phép)
      tokenClient!.requestAccessToken({ prompt: isDriveConnected() ? '' : 'consent' })
    })
  if (tokenClient) return request()
  return preloadGoogleDrive().then(request)
}

/** Ngắt kết nối: thu hồi quyền trên Google + xoá cờ trên máy. File trên Drive giữ nguyên. */
export async function disconnectDrive(): Promise<void> {
  const t = token?.value
  token = null
  lsSet(CONNECTED_KEY, null)
  lsSet(LAST_DRIVE_BACKUP_KEY, null)
  const g = (window as GoogleWin).google
  if (t && g) await new Promise<void>(r => g.accounts.oauth2.revoke(t, () => r()))
}

// ---------------- Drive REST ----------------
const API = 'https://www.googleapis.com/drive/v3'
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3'

async function api<T>(tok: string, url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, { ...init, headers: { Authorization: `Bearer ${tok}`, ...(init.headers ?? {}) } })
  if (res.status === 401) {
    token = null
    throw new Error('Phiên Google đã hết hạn – bấm lại để đăng nhập.')
  }
  if (!res.ok) {
    let detail = ''
    try {
      detail = ((await res.json()) as { error?: { message?: string } }).error?.message ?? ''
    } catch {
      /* ignore */
    }
    throw new Error(`Google Drive lỗi ${res.status}${detail ? ': ' + detail : ''}`)
  }
  if (res.status === 204) return undefined as T
  const ct = res.headers.get('content-type') ?? ''
  return (ct.includes('json') && !url.includes('alt=media') ? res.json() : res.text()) as Promise<T>
}

async function listFiles(tok: string, q: string): Promise<DriveFile[]> {
  const params = new URLSearchParams({
    q,
    spaces: 'drive',
    fields: 'files(id,name,modifiedTime,size)',
    pageSize: '200',
  })
  const r = await api<{ files: DriveFile[] }>(tok, `${API}/files?${params}`)
  return r.files ?? []
}

async function findFolder(tok: string): Promise<string | null> {
  const files = await listFiles(tok, `name='${driveQ(DRIVE_FOLDER_NAME)}' and mimeType='${FOLDER_MIME}' and trashed=false`)
  return files[0]?.id ?? null
}

async function ensureFolder(tok: string): Promise<string> {
  const id = await findFolder(tok)
  if (id) return id
  const r = await api<{ id: string }>(tok, `${API}/files?fields=id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: DRIVE_FOLDER_NAME, mimeType: FOLDER_MIME }),
  })
  return r.id
}

/** Danh sách bản sao lưu trên Drive, mới nhất trước. */
export async function listDriveBackups(tok: string): Promise<DriveFile[]> {
  const folder = await findFolder(tok)
  if (!folder) return []
  return sortBackups(await listFiles(tok, `'${driveQ(folder)}' in parents and trashed=false`))
}

/** Tải lên bản sao lưu hôm nay (ghi đè nếu đã có trong ngày) rồi dọn bản cũ. */
export async function uploadDriveBackup(tok: string, json: string, now = new Date()): Promise<{ name: string; overwritten: boolean; pruned: number }> {
  const folder = await ensureFolder(tok)
  const name = driveBackupName(now)
  const files = await listFiles(tok, `'${driveQ(folder)}' in parents and trashed=false`)
  const existing = files.find(f => f.name === name)
  const boundary = 'msb' + Math.random().toString(36).slice(2)
  const headers = { 'Content-Type': `multipart/related; boundary=${boundary}` }
  if (existing) {
    await api(tok, `${UPLOAD}/files/${existing.id}?uploadType=multipart&fields=id`, {
      method: 'PATCH',
      headers,
      body: buildMultipartBody({ name }, json, boundary),
    })
  } else {
    await api(tok, `${UPLOAD}/files?uploadType=multipart&fields=id`, {
      method: 'POST',
      headers,
      body: buildMultipartBody({ name, parents: [folder], mimeType: 'application/json' }, json, boundary),
    })
  }
  lsSet(LAST_DRIVE_BACKUP_KEY, String(Date.now()))
  // Dọn bản cũ: chỉ xoá sau khi tải lên thành công; lỗi dọn dẹp không làm hỏng lượt sao lưu.
  const all = existing ? files : [...files, { id: '__new__', name }]
  let pruned = 0
  for (const id of pickFilesToPrune(all)) {
    if (id === '__new__') continue
    try {
      await api(tok, `${API}/files/${id}`, { method: 'DELETE' })
      pruned++
    } catch {
      /* bỏ qua */
    }
  }
  return { name, overwritten: !!existing, pruned }
}

export async function downloadDriveBackup(tok: string, id: string): Promise<string> {
  return api<string>(tok, `${API}/files/${encodeURIComponent(id)}?alt=media`)
}
