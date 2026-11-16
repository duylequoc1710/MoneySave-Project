import { kvGet, kvSet } from './safetyBackup'

/**
 * Lưu file sao lưu ra ngoài ứng dụng – một file DUY NHẤT, bản mới ghi đè bản cũ:
 * 1. Máy tính (Chrome/Edge – File System Access API): lần đầu chọn nơi lưu, các lần sau ghi đè thẳng vào file đó.
 * 2. iPhone / Android (Web Share API): mở bảng chia sẻ → "Lưu vào Tệp" (iCloud Drive / Trên iPhone), Google Drive, Zalo…
 *    Tên file cố định nên khi lưu cùng thư mục, hệ điều hành hỏi "Thay thế" → giữ 1 file mới nhất.
 * 3. Dự phòng: tải file thông thường.
 */
export const BACKUP_FILE_NAME = 'MoneySave-SaoLuu.json'
const HANDLE_KEY = 'backupFileHandle'

export type SaveResult = 'overwritten' | 'saved' | 'shared' | 'downloaded' | 'cancelled'

type PermissionHandle = FileSystemFileHandle & {
  queryPermission?: (d: { mode: 'readwrite' }) => Promise<PermissionState>
  requestPermission?: (d: { mode: 'readwrite' }) => Promise<PermissionState>
}
type SavePickerWindow = Window & {
  showSaveFilePicker?: (o: {
    suggestedName?: string
    types?: { description: string; accept: Record<string, string[]> }[]
  }) => Promise<FileSystemFileHandle>
}

const isAbort = (e: unknown) => (e as { name?: string })?.name === 'AbortError'

async function writeHandle(h: FileSystemFileHandle, content: string) {
  const w = await h.createWritable()
  await w.write(content)
  await w.close()
}

/** Có hỗ trợ ghi đè trực tiếp vào file trên máy tính không (Chrome/Edge desktop). */
export function canPickSaveFile(): boolean {
  return typeof window !== 'undefined' && typeof (window as SavePickerWindow).showSaveFilePicker === 'function'
}

export async function getRememberedFileName(): Promise<string | null> {
  if (!canPickSaveFile()) return null
  const h = await kvGet<FileSystemFileHandle>(HANDLE_KEY)
  return h?.name ?? null
}

/** Tải file thông thường; trì hoãn thu hồi URL để Safari kịp lưu. */
export function downloadFile(name: string, content: string, mimeType: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }))
  const a = Object.assign(document.createElement('a'), { href: url, download: name })
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/**
 * Chia sẻ file qua bảng chia sẻ hệ điều hành. Trả về null nếu thiết bị không hỗ trợ.
 * `onNeedGesture`: iOS yêu cầu thao tác chạm mới nếu việc chuẩn bị dữ liệu mất thời gian → hỏi người dùng bấm lại.
 */
export async function shareFile(
  name: string,
  content: string,
  mimeType: string,
  onNeedGesture?: () => Promise<boolean>,
): Promise<'shared' | 'cancelled' | null> {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function' || typeof File === 'undefined') return null
  // Chỉ dùng bảng chia sẻ trên thiết bị cảm ứng (máy Mac/PC: bảng chia sẻ không có mục "Lưu" → tải file)
  if (typeof matchMedia === 'function' && !matchMedia('(pointer: coarse)').matches) return null
  const file = new File([content], name, { type: mimeType })
  if (typeof navigator.canShare === 'function' && !navigator.canShare({ files: [file] })) return null
  const doShare = () => navigator.share({ files: [file], title: name })
  try {
    await doShare()
    return 'shared'
  } catch (e) {
    if (isAbort(e)) return 'cancelled'
    if ((e as { name?: string })?.name === 'NotAllowedError' && onNeedGesture) {
      if (!(await onNeedGesture())) return 'cancelled'
      try {
        await doShare()
        return 'shared'
      } catch (e2) {
        if (isAbort(e2)) return 'cancelled'
      }
    }
    return null
  }
}

export async function saveBackupFile(
  content: string,
  opts: { chooseNewLocation?: boolean; onNeedGesture?: () => Promise<boolean> } = {},
): Promise<SaveResult> {
  const mime = 'application/json'
  // 1) Máy tính: ghi đè vào file đã chọn trước đó
  if (canPickSaveFile()) {
    try {
      if (!opts.chooseNewLocation) {
        const h = await kvGet<PermissionHandle>(HANDLE_KEY)
        if (h) {
          let perm = (await h.queryPermission?.({ mode: 'readwrite' })) ?? 'granted'
          if (perm !== 'granted') perm = (await h.requestPermission?.({ mode: 'readwrite' })) ?? 'denied'
          if (perm === 'granted') {
            await writeHandle(h, content)
            return 'overwritten'
          }
        }
      }
      const h = await (window as SavePickerWindow).showSaveFilePicker!({
        suggestedName: BACKUP_FILE_NAME,
        types: [{ description: 'MoneySave backup', accept: { [mime]: ['.json'] } }],
      })
      await writeHandle(h, content)
      await kvSet(HANDLE_KEY, h)
      return 'saved'
    } catch (e) {
      if (isAbort(e)) return 'cancelled'
      // lỗi khác → thử cách dưới
    }
  }
  // 2) Điện thoại: bảng chia sẻ
  const shared = await shareFile(BACKUP_FILE_NAME, content, mime, opts.onNeedGesture)
  if (shared) return shared
  // 3) Dự phòng
  downloadFile(BACKUP_FILE_NAME, content, mime)
  return 'downloaded'
}
