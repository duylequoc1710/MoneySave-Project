import { db, describeBackup, exportAll, importAll } from '../db'
import { saveBackupFile, type SaveResult } from '../backupFile'
import { markBackupDownloaded } from '../safetyBackup'
import { fmtDmy, ymd } from '../lib'
import { type DriveConflictInfo, type DriveSyncResult, driveSyncNow } from '../driveSync'
import { showAlert, showConfirm } from './AppDialog'
import {
  DRIVE_FOLDER_NAME,
  DRIVE_KEEP,
  type DriveFile,
  downloadDriveBackup,
  getDriveToken,
  listDriveBackups,
  uploadDriveBackup,
} from '../googleDrive'

const RESULT_MSG: Record<Exclude<SaveResult, 'cancelled'>, string> = {
  overwritten: 'Đã ghi đè bản sao lưu mới nhất vào file đã chọn trên máy.',
  saved: 'Đã lưu file sao lưu. Các lần sau sẽ tự ghi đè vào đúng file này.',
  shared:
    'Đã chuyển file sang ứng dụng bạn chọn.\nMẹo: luôn lưu vào cùng một thư mục (Tệp/iCloud hoặc Google Drive) và chọn "Thay thế" để chỉ giữ 1 file mới nhất.',
  downloaded: 'Đã tải file sao lưu về máy (thư mục Tải về).',
}

/** Sao lưu toàn bộ dữ liệu ra 1 file duy nhất (bản mới ghi đè bản cũ). */
export async function runBackup(opts: { chooseNewLocation?: boolean; silentSuccess?: boolean } = {}): Promise<boolean> {
  try {
    const json = await exportAll()
    const res = await saveBackupFile(json, {
      chooseNewLocation: opts.chooseNewLocation,
      onNeedGesture: () =>
        showConfirm({
          title: 'Bản sao lưu đã sẵn sàng',
          message: 'Bấm "Lưu / Chia sẻ" để chọn nơi lưu file (Tệp, iCloud Drive, Google Drive…).',
          icon: '💾',
          confirmText: 'Lưu / Chia sẻ',
        }),
    })
    if (res === 'cancelled') return false
    markBackupDownloaded()
    if (!opts.silentSuccess) await showAlert({ title: 'Sao lưu xong', message: RESULT_MSG[res], tone: 'success', icon: '💾' })
    return true
  } catch (e) {
    await showAlert({ title: 'Lỗi sao lưu', message: (e as Error).message, tone: 'danger' })
    return false
  }
}

/** Khôi phục từ file: đọc & hiển thị thông tin bản sao lưu, so sánh với dữ liệu hiện tại, xác nhận rồi mới ghi đè. */
export async function runRestoreFromFile(file?: File): Promise<void> {
  if (!file) return
  try {
    await confirmAndRestore(await file.text(), `File: ${file.name}`)
  } catch (e) {
    await showAlert({ title: 'Lỗi khôi phục', message: 'Lỗi khôi phục: ' + (e as Error).message, tone: 'danger' })
  }
}

/** Xem trước + xác nhận + ghi đè (dùng chung cho file trên máy và Google Drive). Trả về true nếu đã khôi phục. */
export async function confirmAndRestore(json: string, sourceLabel: string): Promise<boolean> {
  const s = describeBackup(json)
  const [curTx, curFunds] = await Promise.all([db.txs.count(), db.funds.count()])
  const when = s.exportedAt ? new Date(s.exportedAt).toLocaleString('vi-VN') : 'không rõ'
  const range = s.firstDate && s.lastDate ? `${fmtDmy(s.firstDate)} → ${fmtDmy(s.lastDate)}` : '—'
  const ok = await showConfirm({
    title: 'Khôi phục từ bản sao lưu?',
    icon: '🛟',
    tone: 'warning',
    confirmText: 'Khôi phục',
    message:
      `${sourceLabel}\nSao lưu lúc: ${when}\n` +
      `• ${s.txs} giao dịch (${range})\n• ${s.funds} ví · ${s.categories} nhóm · ${s.budgets} ngân sách · ${s.recurrings} định kỳ · ${s.savingsGoals} kế hoạch\n\n` +
      `Dữ liệu hiện tại trên máy: ${curTx} giao dịch · ${curFunds} ví.\n` +
      `Dữ liệu hiện tại sẽ được TỰ LƯU thành bản sao an toàn trước khi ghi đè (có thể khôi phục lại).`,
  })
  if (!ok) return false
  await importAll(json, db, { source: 'restore' })
  await showAlert({ title: 'Khôi phục thành công', message: `Đã khôi phục ${s.txs} giao dịch, ${s.funds} ví.`, tone: 'success' })
  return true
}

// ---------------- Google Drive (S4a) ----------------

/**
 * Sao lưu lên Google Drive của người dùng. Gọi TRỰC TIẾP trong onClick: dòng đầu tiên xin mã truy cập
 * trước mọi `await` để iOS/Safari không chặn cửa sổ đăng nhập Google.
 */
export async function runDriveBackup(opts: { silentSuccess?: boolean } = {}): Promise<boolean> {
  const tokenP = getDriveToken()
  try {
    const tok = await tokenP
    const json = await exportAll()
    const r = await uploadDriveBackup(tok, json)
    markBackupDownloaded()
    if (!opts.silentSuccess)
      await showAlert({
        title: 'Đã sao lưu lên Google Drive',
        message:
          `File "${r.name}" trong thư mục "${DRIVE_FOLDER_NAME}" trên Drive của bạn` +
          (r.overwritten ? ' (ghi đè bản cùng ngày).' : '.') +
          `\nGiữ tối đa ${DRIVE_KEEP} bản gần nhất (mỗi ngày 1 bản).`,
        tone: 'success',
        icon: '☁️',
      })
    return true
  } catch (e) {
    await showAlert({ title: 'Lỗi sao lưu Google Drive', message: (e as Error).message, tone: 'danger' })
    return false
  }
}

/** Lấy danh sách bản sao lưu trên Drive (gọi trực tiếp trong onClick, cùng lý do như trên). Lỗi → báo và trả null. */
export async function fetchDriveBackupList(): Promise<DriveFile[] | null> {
  const tokenP = getDriveToken()
  try {
    return await listDriveBackups(await tokenP)
  } catch (e) {
    await showAlert({ title: 'Lỗi Google Drive', message: (e as Error).message, tone: 'danger' })
    return null
  }
}

export async function runDriveRestore(file: DriveFile): Promise<boolean> {
  const tokenP = getDriveToken()
  try {
    const json = await downloadDriveBackup(await tokenP, file.id)
    return await confirmAndRestore(json, `Google Drive: ${file.name}`)
  } catch (e) {
    await showAlert({ title: 'Lỗi khôi phục', message: 'Lỗi khôi phục: ' + (e as Error).message, tone: 'danger' })
    return false
  }
}

// ---------------- Đồng bộ nhiều máy qua Drive (S4b) ----------------

/** dd/MM/yyyy HH:mm cho mốc thời gian (ms). */
export function fmtDateTime(ts: number): string {
  const d = new Date(ts)
  return `${fmtDmy(ymd(d))} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/**
 * Hỏi giữ bản nào khi cả Drive lẫn máy này đều có dữ liệu (lần đầu đồng bộ). Hai bước để chạm nhầm ra ngoài = huỷ,
 * không bao giờ tự ghi đè.
 */
export async function askDriveConflict(info: DriveConflictInfo): Promise<'local' | 'remote' | null> {
  const facts =
    `• Trên Google Drive: ${info.remoteTxCount} giao dịch, cập nhật ${fmtDateTime(info.remoteUpdatedAt)}\n` +
    `• Trên máy này: ${info.localTxCount} giao dịch\n\n`
  if (
    await showConfirm({
      title: 'Hai bản dữ liệu khác nhau',
      icon: '🔄',
      tone: 'warning',
      message: facts + 'Dùng bản trên Google Drive cho máy này? Dữ liệu hiện tại trên máy sẽ được lưu vào "Bản sao an toàn" trước khi thay.',
      confirmText: 'Dùng bản trên Drive',
      cancelText: 'Không',
    })
  )
    return 'remote'
  const keepLocal = await showConfirm({
    title: 'Giữ bản trên máy này?',
    icon: '🔄',
    tone: 'warning',
    message: facts + 'Bản trên máy này sẽ thay bản trên Google Drive (các máy khác sẽ nhận bản này). Bản trên Drive được lưu vào "Bản sao an toàn" của máy này trước khi thay.',
    confirmText: 'Giữ bản máy này',
    cancelText: 'Huỷ, chưa đồng bộ',
  })
  return keepLocal ? 'local' : null
}

const SYNC_MSG: Record<DriveSyncResult, string> = {
  pushed: 'Đã gửi dữ liệu của máy này lên Google Drive.',
  pulled: 'Đã nhận dữ liệu mới từ Google Drive.',
  noop: 'Dữ liệu đã khớp, không có gì mới.',
  cancelled: 'Đã huỷ, chưa đồng bộ.',
}

/** Bấm "Đồng bộ ngay": xin mã Google NGAY trong sự kiện bấm (trước mọi await) để iOS không chặn popup. */
export async function runDriveSyncNow(): Promise<boolean> {
  const tokenP = getDriveToken()
  try {
    const r = await driveSyncNow(await tokenP, askDriveConflict)
    await showAlert({ title: r === 'cancelled' ? 'Chưa đồng bộ' : 'Đồng bộ xong', message: SYNC_MSG[r], tone: r === 'cancelled' ? 'info' : 'success', icon: '🔄' })
    return r !== 'cancelled'
  } catch (e) {
    await showAlert({ title: 'Lỗi đồng bộ Google Drive', message: (e as Error).message, tone: 'danger' })
    return false
  }
}
