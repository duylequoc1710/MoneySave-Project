/**
 * S4b – Đồng bộ nhiều máy qua 1 file `MoneySave Sync/moneysave-sync.json` trên Google Drive của CHÍNH người dùng.
 * Không qua máy chủ MoneySave, không tốn chi phí cho chủ app. Firebase vẫn chạy song song trong giai đoạn chuyển.
 * Quy tắc quyết định: `decideSync` (googleDrive.ts, có unit test). Kéo về luôn qua `importAll(source: 'sync')`
 * → tự lưu bản an toàn trước khi ghi đè.
 */
import { db, exportAll, importAll } from './db'
import { getDeviceId, getLocalMutatedAt } from './cloudSync'
import { LAST_DRIVE_SYNC_KEY, decideSync, downloadDriveBackup, getDriveSyncMeta, uploadDriveSync } from './googleDrive'

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
  }
  if (decision === 'pull') {
    const json = await downloadDriveBackup(tok, remote!.id)
    await importAll(json, db, { source: 'sync' })
    setLastDriveSyncAt(Date.now()) // sau import: các hook đã đánh dấu "sửa cục bộ" sớm hơn mốc này → không đẩy ngược lại
    return 'pulled'
  }
  if (decision === 'push') {
    const now = Date.now() // lấy mốc TRƯỚC khi xuất: sửa trong lúc tải lên sẽ mới hơn mốc → lượt sau đẩy tiếp
    const json = await exportAll(db)
    await uploadDriveSync(tok, json, { updatedAt: now, deviceId, txCount: localTxCount }, remote?.id)
    setLastDriveSyncAt(now)
    return 'pushed'
  }
  return 'noop'
}
