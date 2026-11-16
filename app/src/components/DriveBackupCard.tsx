import { useEffect, useState } from 'react'
import { ChevronRight, Cloud, FileText, LifeBuoy, RefreshCw } from 'lucide-react'
import { createPortal } from 'react-dom'
import { fmtDmy } from '../lib'
import {
  DRIVE_FOLDER_NAME,
  type DriveFile,
  backupDateFromName,
  disconnectDrive,
  isDriveConnected,
  isDriveSyncOn,
  lastDriveBackupAt,
  preloadGoogleDrive,
  setDriveSyncOn,
} from '../googleDrive'
import { DRIVE_SYNC_EVENT, getLastDriveSyncAt } from '../driveSync'
import { fetchDriveBackupList, fmtDateTime, runDriveBackup, runDriveRestore, runDriveSyncNow } from './backupActions'
import { showAlert, showConfirm } from './AppDialog'

/** Các dòng "Google Drive" trong thẻ Dữ liệu cá nhân (Cài đặt) – S4a. */
export default function DriveBackupRows() {
  const [connected, setConnected] = useState(isDriveConnected)
  const [lastAt, setLastAt] = useState(lastDriveBackupAt)
  const [list, setList] = useState<DriveFile[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [syncOn, setSyncOn] = useState(isDriveSyncOn)
  const [lastSync, setLastSync] = useState(getLastDriveSyncAt)

  useEffect(() => {
    const onSynced = () => setLastSync(getLastDriveSyncAt())
    window.addEventListener(DRIVE_SYNC_EVENT, onSynced)
    return () => window.removeEventListener(DRIVE_SYNC_EVENT, onSynced)
  }, [])

  // Tải trước thư viện Google để lúc bấm nút popup mở ngay (iOS chặn popup nếu phải chờ tải)
  useEffect(() => {
    preloadGoogleDrive().catch(() => {
      /* báo lỗi khi người dùng bấm */
    })
  }, [])

  const refresh = () => {
    setConnected(isDriveConnected())
    setLastAt(lastDriveBackupAt())
    setSyncOn(isDriveSyncOn())
    setLastSync(getLastDriveSyncAt())
  }

  // Bật công tắc = đồng bộ ngay (cần thao tác chạm để đăng nhập Google); huỷ/lỗi → tắt lại
  function handleSync(turnOn = false) {
    if (turnOn) setDriveSyncOn(true)
    setBusy(true)
    runDriveSyncNow().then(ok => {
      if (turnOn && !ok) setDriveSyncOn(false)
      setBusy(false)
      refresh()
    })
  }

  function handleToggleSync() {
    if (syncOn) {
      setDriveSyncOn(false)
      refresh()
    } else handleSync(true)
  }

  // Không đặt `await` trước runDriveBackup/fetchDriveBackupList: cần giữ "thao tác chạm" để mở popup Google
  function handleBackup() {
    setBusy(true)
    runDriveBackup().finally(() => {
      setBusy(false)
      refresh()
    })
  }

  function handleOpenList() {
    setBusy(true)
    fetchDriveBackupList().then(files => {
      setBusy(false)
      refresh()
      if (!files) return
      if (files.length === 0) {
        void showAlert({ title: 'Chưa có bản sao lưu', message: `Thư mục "${DRIVE_FOLDER_NAME}" trên Drive chưa có bản sao lưu nào.`, icon: '☁️' })
        return
      }
      setList(files)
    })
  }

  async function handleDisconnect() {
    const ok = await showConfirm({
      title: 'Ngắt kết nối Google Drive?',
      message: 'Ứng dụng sẽ không còn quyền ghi vào Drive. Các bản sao lưu đã có trên Drive vẫn được giữ nguyên.',
      confirmText: 'Ngắt kết nối',
      tone: 'warning',
    })
    if (!ok) return
    await disconnectDrive()
    refresh()
  }

  const lastText = lastAt ? `Lần gần nhất: ${new Date(lastAt).toLocaleString('vi-VN')}` : 'Chưa sao lưu lên Drive lần nào'

  return (
    <>
      <div className="row">
        <div className="ico round" style={{ background: '#f59e0b24' }}>
          <Cloud size={22} style={{ color: 'var(--warn)' }} />
        </div>
        <div className="grow">
          <b>Sao lưu lên Google Drive</b>
          <small>
            Lưu vào thư mục "{DRIVE_FOLDER_NAME}" trên Drive của chính bạn (app chỉ thấy file do nó tạo). Mỗi ngày 1 bản, giữ 30 bản gần nhất.
            {connected && <> · {lastText}</>}
          </small>
          {connected && (
            <button type="button" className="btn" style={{ marginTop: 6, padding: '4px 10px', fontSize: 12 }} onClick={handleDisconnect}>
              Ngắt kết nối
            </button>
          )}
        </div>
        <button type="button" className="btn pri" disabled={busy} onClick={handleBackup}>
          {busy ? '…' : 'Sao lưu'}
        </button>
      </div>

      <div className="row">
        <div className="ico round" style={{ background: '#f59e0b24' }}>
          <RefreshCw size={22} style={{ color: 'var(--warn)' }} />
        </div>
        <div className="grow">
          <b>Đồng bộ nhiều máy qua Drive</b>
          <small>Các máy cùng tài khoản Google</small>
          {syncOn && <small>{lastSync ? `Lần cuối: ${fmtDateTime(lastSync)}` : 'Chưa đồng bộ lần nào'}</small>}
          {syncOn && (
            <button type="button" className="btn" disabled={busy} style={{ marginTop: 6, minHeight: 44 }} onClick={() => handleSync()}>
              {busy ? 'Đang đồng bộ…' : 'Đồng bộ ngay'}
            </button>
          )}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={syncOn}
          aria-label="Đồng bộ nhiều máy qua Drive"
          className="switch"
          disabled={busy}
          onClick={handleToggleSync}
        />
      </div>

      <div className="row">
        <div className="ico round" style={{ background: '#f59e0b24' }}>
          <LifeBuoy size={22} style={{ color: 'var(--warn)' }} />
        </div>
        <div className="grow">
          <b>Khôi phục từ Google Drive</b>
          <small>Chọn một bản sao lưu trên Drive – xem trước trước khi ghi đè, dữ liệu hiện tại được tự lưu bản sao an toàn</small>
        </div>
        <button type="button" className="btn" disabled={busy} onClick={handleOpenList}>
          Chọn bản
        </button>
      </div>

      {list &&
        createPortal(
          <div className="sheetbg" style={{ zIndex: 100 }} onClick={() => setList(null)}>
            <div
              className="sheet"
              style={{ maxHeight: '80dvh', display: 'flex', flexDirection: 'column', paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="ledger-topbar" style={{ marginBottom: 12 }}>
                <button type="button" className="close-pill-btn" onClick={() => setList(null)}>
                  Đóng
                </button>
                <b style={{ fontSize: 17 }}>Bản sao lưu trên Drive</b>
                <span style={{ width: 48 }} />
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <div className="card" style={{ padding: '2px 14px' }}>
                  {list.map(f => {
                    const d = backupDateFromName(f.name)
                    const kb = f.size ? Math.max(1, Math.round(Number(f.size) / 1024)) : null
                    return (
                      <div
                        key={f.id}
                        className="row"
                        style={{ cursor: 'pointer', padding: '10px 0' }}
                        onClick={() => {
                          setList(null)
                          void runDriveRestore(f)
                        }}
                      >
                        <div className="ico round" style={{ background: '#f59e0b24', width: 38, height: 38, flexShrink: 0 }}>
                          <FileText size={22} style={{ color: 'var(--warn)' }} />
                        </div>
                        <div className="grow" style={{ minWidth: 0 }}>
                          <b style={{ fontSize: 15, display: 'block' }}>Ngày {d ? fmtDmy(d) : f.name}</b>
                          <small className="mut" style={{ fontSize: 12 }}>
                            {f.modifiedTime ? `Cập nhật ${new Date(f.modifiedTime).toLocaleString('vi-VN')}` : f.name}
                            {kb ? ` · ${kb} KB` : ''}
                          </small>
                        </div>
                        <ChevronRight size={18} className="mut" />
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
