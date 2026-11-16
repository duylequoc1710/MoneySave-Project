import { useCallback, useEffect, useState } from 'react'
import { LifeBuoy } from 'lucide-react'
import { format } from 'date-fns'
import { importAll } from '../db'
import { downloadFile } from '../backupFile'
import { listSafetySnapshots, type SafetySnapshot } from '../safetyBackup'
import { showAlert, showConfirm } from './AppDialog'

/**
 * Danh sách bản sao an toàn tự động (lưu trên thiết bị, CSDL riêng) – cho phép khôi phục
 * hoặc tải về nếu lỡ khôi phục/đồng bộ/xoá nhầm.
 */
const SHOW_FIRST = 3

export default function SafetySnapshotsCard() {
  const [items, setItems] = useState<SafetySnapshot[]>([])
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? items : items.slice(0, SHOW_FIRST)

  const reload = useCallback(async () => setItems(await listSafetySnapshots()), [])
  useEffect(() => {
    let alive = true
    listSafetySnapshots().then(r => alive && setItems(r))
    return () => {
      alive = false
    }
  }, [])

  async function restore(s: SafetySnapshot) {
    const label = format(new Date(s.createdAt), 'dd/MM/yyyy HH:mm')
    const ok = await showConfirm({
      title: `Khôi phục bản sao ${label}?`,
      message: `Bản sao gồm ${s.txCount} giao dịch. Dữ liệu hiện tại sẽ được tự lưu thành một bản sao mới trước khi ghi đè.`,
      icon: '🛟',
      tone: 'warning',
      confirmText: 'Khôi phục',
    })
    if (!ok) return
    try {
      await importAll(s.json, undefined, { source: 'restore' })
      await showAlert({
        title: 'Khôi phục thành công',
        message: 'Đã khôi phục dữ liệu từ bản sao an toàn.',
        tone: 'success',
      })
      await reload()
    } catch (e) {
      await showAlert({
        title: 'Lỗi khôi phục',
        message: 'Lỗi khôi phục: ' + (e as Error).message,
        tone: 'danger',
      })
    }
  }

  function download(s: SafetySnapshot) {
    downloadFile(`moneysave-safety-${format(new Date(s.createdAt), 'yyyyMMdd-HHmm')}.json`, s.json, 'application/json')
  }

  return (
    <div className="card" style={{ padding: '4px 16px' }}>
      <div className="row" style={{ borderBottom: items.length ? undefined : 0 }}>
        <div className="ico round" style={{ background: '#f59e0b24' }}>
          <LifeBuoy size={22} style={{ color: 'var(--warn)' }} />
        </div>
        <div className="grow">
          <b>Bản sao an toàn tự động</b>
          <small>
            Lưới an toàn tự động trên máy: lưu mỗi ngày và trước khi khôi phục / đồng bộ ghi đè. Tự xoay vòng tối đa 15 bản – không cần dọn tay
          </small>
        </div>
      </div>
      {items.length === 0 && <small className="mut" style={{ display: 'block', padding: '0 0 12px' }}>Chưa có bản sao nào.</small>}
      {visible.map(s => (
        <div className="row" key={s.id}>
          <div className="grow">
            <b style={{ fontSize: 14 }}>{format(new Date(s.createdAt), 'dd/MM/yyyy HH:mm')}</b>
            <small>
              {s.reason} · {s.txCount} giao dịch · {s.fundCount} ví
            </small>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn" style={{ padding: '7px 12px', fontSize: 12 }} onClick={() => restore(s)}>
              Khôi phục
            </button>
            <button type="button" className="btn" style={{ padding: '7px 12px', fontSize: 12 }} onClick={() => download(s)}>
              Tải
            </button>
          </div>
        </div>
      ))}
      {items.length > SHOW_FIRST && (
        <button
          type="button"
          className="btn"
          style={{ width: '100%', margin: '8px 0 12px', fontSize: 13 }}
          onClick={() => setShowAll(v => !v)}
        >
          {showAll ? 'Thu gọn' : `Xem thêm ${items.length - SHOW_FIRST} bản cũ hơn`}
        </button>
      )}
    </div>
  )
}
