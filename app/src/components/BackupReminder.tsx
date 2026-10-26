import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, exportAll } from '../db'
import { backupReminderState, BACKUP_REMIND_DAYS, markBackupDownloaded, snoozeBackupReminder } from '../safetyBackup'

/** Thanh nhắc tải file sao lưu JSON nếu đã quá 7 ngày (chỉ khi có giao dịch). */
export default function BackupReminder() {
  const txCount = useLiveQuery(() => db.txs.count(), [], 0)
  const [state, setState] = useState(() => backupReminderState())
  if (!state || !txCount) return null

  async function backupNow() {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([await exportAll()], { type: 'application/json' }))
    a.download = `moneysave-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    markBackupDownloaded()
    setState(undefined)
  }

  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', margin: '8px 0' }}>
      <span style={{ fontSize: 20 }}>💾</span>
      <div className="grow" style={{ fontSize: 13 }}>
        {state.daysSince === null
          ? 'Bạn chưa tải file sao lưu dữ liệu lần nào.'
          : `Đã ${state.daysSince} ngày (quá ${BACKUP_REMIND_DAYS} ngày) chưa sao lưu dữ liệu.`}
      </div>
      <button type="button" className="btn pri" style={{ padding: '6px 12px', fontSize: 12 }} onClick={backupNow}>
        Sao lưu
      </button>
      <button
        type="button"
        className="btn"
        style={{ padding: '6px 10px', fontSize: 12 }}
        onClick={() => {
          snoozeBackupReminder(3)
          setState(undefined)
        }}
      >
        Để sau
      </button>
    </div>
  )
}
