/**
 * S4b – Đồng bộ nhiều máy qua 1 file `MoneySave Sync/moneysave-sync.json` trên Google Drive của CHÍNH người dùng.
 * Không qua máy chủ MoneySave, không tốn chi phí cho chủ app. Firebase vẫn chạy song song trong giai đoạn chuyển.
 * Quy tắc quyết định: `decideSync` (googleDrive.ts, có unit test). Kéo về luôn qua `importAll(source: 'sync')`
 * → tự lưu bản an toàn trước khi ghi đè.
 */
import { db, exportAll, importAll } from './db'
import { getDeviceId, getLocalMutatedAt } from './cloudSync'
import { saveSafetySnapshot } from './safetyBackup'
import {
  LAST_DRIVE_SYNC_KEY,
  decideSync,
  downloadDriveBackup,
  getDriveSyncMeta,
  getDriveToken,
  hasDriveToken,
  isDriveSyncOn,
  shouldAutoDriveSync,
  uploadDriveSync,
} from './googleDrive'

/** Phát sau mỗi lượt đồng bộ xong để thẻ Cài đặt cập nhật dòng "lần đồng bộ cuối". */
export const DRIVE_SYNC_EVENT = 'moneysave-drive-synced'

export function getLastDriveSyncAt(): number {
  try {
    return Number(localStorage.getItem(LAST_DRIVE_SYNC_KEY)) || 0
  } catch {
    return 0
  }
}
function setLastDriveSyncAt(ts: number) {
  try {
    localStorage.setItem(LAST_DRIVE_SYNC_KEY, String(ts))
  } catch {
    /* bộ nhớ trình duyệt bị chặn – lần sau coi như đồng bộ lần đầu (có chốt hỏi) */
  }
}

export interface DriveConflictInfo {
  remoteUpdatedAt: number
  remoteTxCount: number
  localTxCount: number
}
export type DriveSyncResult = 'pushed' | 'pulled' | 'noop' | 'cancelled'

let inFlight: Promise<DriveSyncResult> | null = null

/** Một lượt đồng bộ; gọi trùng lúc đang chạy thì dùng chung lượt đó. `resolveConflict` trả 'local' | 'remote' | null (huỷ). */
export function driveSyncNow(
  tok: string,
  resolveConflict?: (info: DriveConflictInfo) => Promise<'local' | 'remote' | null>,
): Promise<DriveSyncResult> {
  if (inFlight) return inFlight
  inFlight = driveSyncInner(tok, resolveConflict).finally(() => {
    inFlight = null
  })
  return inFlight
}

async function driveSyncInner(
  tok: string,
  resolveConflict?: (info: DriveConflictInfo) => Promise<'local' | 'remote' | null>,
): Promise<DriveSyncResult> {
  const remote = await getDriveSyncMeta(tok)
  const localTxCount = await db.txs.count()
  const deviceId = getDeviceId()
  let decision = decideSync(remote, {
    lastSync: getLastDriveSyncAt(),
    localMut: getLocalMutatedAt(),
    deviceId,
    hasData: localTxCount > 0,
  })
  if (decision === 'conflict') {
    const choice = resolveConflict
      ? await resolveConflict({ remoteUpdatedAt: remote!.updatedAt, remoteTxCount: remote!.txCount, localTxCount })
      : null
    if (!choice) return 'cancelled'
    decision = choice === 'remote' ? 'pull' : 'push'
    // Giữ bản máy này → lưu bản trên Drive vào "Bản sao an toàn" trước khi bị ghi đè (lấy lại được)
    if (decision === 'push') await saveSafetySnapshot(await downloadDriveBackup(tok, remote!.id), 'Bản trên Drive trước khi bị thay (đồng bộ)', 'sync')
  }
  if (decision === 'pull') {
    const json = await downloadDriveBackup(tok, remote!.id)
    await importAll(json, db, { source: 'sync' })
    setLastDriveSyncAt(Date.now())
    window.dispatchEvent(new Event(DRIVE_SYNC_EVENT)) // sau import: các hook đã đánh dấu "sửa cục bộ" sớm hơn mốc này → không đẩy ngược lại
    return 'pulled'
  }
  if (decision === 'push') {
    const now = Date.now() // lấy mốc TRƯỚC khi xuất: sửa trong lúc tải lên sẽ mới hơn mốc → lượt sau đẩy tiếp
    const json = await exportAll(db)
    await uploadDriveSync(tok, json, { updatedAt: now, deviceId, txCount: localTxCount }, remote?.id)
    setLastDriveSyncAt(now)
    window.dispatchEvent(new Event(DRIVE_SYNC_EVENT))
    return 'pushed'
  }
  return 'noop'
}

let autoStarted = false

/**
 * Tự đồng bộ ngầm (S4b-2): khi mở app, khi quay lại tab, và 1,5 s sau khi sửa dữ liệu.
 * Chỉ chạy khi công tắc bật VÀ mã Google còn hạn – không bao giờ bật popup đăng nhập ngầm. Lỗi mạng bỏ qua im lặng.
 * Firebase (`startRealtimeCloudSyncEngine`) vẫn chạy song song, độc lập.
 */
export function startDriveAutoSync(resolveConflict: (info: DriveConflictInfo) => Promise<'local' | 'remote' | null>) {
  if (autoStarted || typeof window === 'undefined') return
  autoStarted = true
  let timer: ReturnType<typeof setTimeout> | undefined
  let conflictDismissed = false // đã huỷ hộp hỏi 1 lần → tự đồng bộ không hỏi lại trong lượt mở app này (nút "Đồng bộ ngay" vẫn hỏi)
  const run = () => {
    if (!shouldAutoDriveSync({ on: isDriveSyncOn(), hasToken: hasDriveToken(), online: navigator.onLine })) return
    getDriveToken()
      .then(tok => driveSyncNow(tok, conflictDismissed ? undefined : resolveConflict))
      .then(r => {
        if (r === 'cancelled') conflictDismissed = true
      })
      .catch(() => {})
  }
  const schedule = () => {
    clearTimeout(timer)
    timer = setTimeout(run, 1500)
  }
  for (const tbl of [db.funds, db.categories, db.txs, db.budgets, db.recurrings, db.savingsGoals]) {
    tbl.hook('creating', schedule)
    tbl.hook('updating', schedule)
    tbl.hook('deleting', schedule)
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') run()
  })
  setTimeout(run, 1500)
}
