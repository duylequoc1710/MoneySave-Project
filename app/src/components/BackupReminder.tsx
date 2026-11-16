import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { backupReminderState, BACKUP_REMIND_DAYS, snoozeBackupReminder } from '../safetyBackup'
import { isDriveConnected, lastDriveBackupAt, preloadGoogleDrive } from '../googleDrive'
import { runBackup, runDriveBackup } from './backupActions'

const DRIVE_EVERY_MS = 24 * 3600_000
const DRIVE_SNOOZE_KEY = 'moneysave_gdrive_snooze_until'

/**
 * Đã kết nối Google Drive và quá 24 giờ chưa sao lưu lên Drive → trả về số giờ (null = chưa lần nào); không cần → undefined.
 * Không tự sao lưu ngầm: Google yêu cầu người dùng chạm để cấp mã truy cập mới (mã chỉ sống ~1 giờ).
 */
function driveReminderState(now = Date.now()): { hoursSince: number | null } | undefined {
  if (!isDriveConnected()) return undefined
  try {
    if (Number(localStorage.getItem(DRIVE_SNOOZE_KEY)) > now) return undefined
  } catch {
    /* ignore */
  }
  const last = lastDriveBackupAt()
  if (last && now - last < DRIVE_EVERY_MS) return undefined
  return { hoursSince: last ? Math.floor((now - last) / 3600_000) : null }
}

/** Thanh nhắc sao lưu: Google Drive mỗi 24 giờ (nếu đã kết nối), hoặc file JSON nếu quá 7 ngày (chỉ khi có giao dịch). */
export default function BackupReminder() {
  const txCount = useLiveQuery(() => db.txs.count(), [], 0)
  const [drive, setDrive] = useState(() => driveReminderState())
  const [state, setState] = useState(() => backupReminderState())

  useEffect(() => {
    if (drive) preloadGoogleDrive().catch(() => {})
  }, [drive])

  if (!txCount) return null

  if (drive) {
    const label =
      drive.hoursSince === null
        ? 'Chưa sao lưu lên Google Drive lần nào.'
        : drive.hoursSince < 48
          ? `Đã ${drive.hoursSince} giờ chưa sao lưu lên Google Drive.`
          : `Đã ${Math.floor(drive.hoursSince / 24)} ngày chưa sao lưu lên Google Drive.`
    return (
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', margin: '8px 0' }}>
        <span style={{ fontSize: 20 }}>☁️</span>
        <div className="grow" style={{ fontSize: 13 }}>{label}</div>
        <button
          type="button"
          className="btn pri"
          style={{ padding: '6px 12px', fontSize: 12 }}
          onClick={() => {
            // gọi ngay trong sự kiện chạm để popup Google không bị chặn
            runDriveBackup({ silentSuccess: true }).then(ok => {
              if (ok) {
                setDrive(undefined)
                setState(undefined)
              }
            })
          }}
        >
          Sao lưu Drive
        </button>
        <button
          type="button"
          className="btn"
          style={{ padding: '6px 10px', fontSize: 12 }}
          onClick={() => {
            try {
              localStorage.setItem(DRIVE_SNOOZE_KEY, String(Date.now() + DRIVE_EVERY_MS))
            } catch {
              /* ignore */
            }
            setDrive(undefined)
          }}
        >
          Để sau
        </button>
      </div>
    )
  }

  if (!state) return null

  async function backupNow() {
    if (await runBackup()) setState(undefined)
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
