import { db, describeBackup, exportAll, importAll } from '../db'
import { saveBackupFile, type SaveResult } from '../backupFile'
import { markBackupDownloaded } from '../safetyBackup'
import { fmtDmy } from '../lib'
import { showAlert, showConfirm } from './AppDialog'

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
    const json = await file.text()
    const s = describeBackup(json)
    const [curTx, curFunds] = await Promise.all([db.txs.count(), db.funds.count()])
    const when = s.exportedAt ? new Date(s.exportedAt).toLocaleString('vi-VN') : 'không rõ'
    const range = s.firstDate && s.lastDate ? `${fmtDmy(s.firstDate)} → ${fmtDmy(s.lastDate)}` : '—'
    const ok = await showConfirm({
      title: 'Khôi phục từ file sao lưu?',
      icon: '🛟',
      tone: 'warning',
      confirmText: 'Khôi phục',
      message:
        `File: ${file.name}\nSao lưu lúc: ${when}\n` +
        `• ${s.txs} giao dịch (${range})\n• ${s.funds} ví · ${s.categories} nhóm · ${s.budgets} ngân sách · ${s.recurrings} định kỳ · ${s.savingsGoals} kế hoạch\n\n` +
        `Dữ liệu hiện tại trên máy: ${curTx} giao dịch · ${curFunds} ví.\n` +
        `Dữ liệu hiện tại sẽ được TỰ LƯU thành bản sao an toàn trước khi ghi đè (có thể khôi phục lại).`,
    })
    if (!ok) return
    await importAll(json, db, { source: 'restore' })
    await showAlert({ title: 'Khôi phục thành công', message: `Đã khôi phục ${s.txs} giao dịch, ${s.funds} ví.`, tone: 'success' })
  } catch (e) {
    await showAlert({ title: 'Lỗi khôi phục', message: 'Lỗi khôi phục: ' + (e as Error).message, tone: 'danger' })
  }
}
