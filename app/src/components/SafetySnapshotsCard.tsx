import { useCallback, useEffect, useState } from 'react'
import { format } from 'date-fns'
import { importAll } from '../db'
import { deleteSafetySnapshot, listSafetySnapshots, type SafetySnapshot } from '../safetyBackup'
import { showAlert, showConfirm } from './AppDialog'

/**
 * Danh sách bản sao an toàn tự động (lưu trên thiết bị, CSDL riêng) – cho phép khôi phục
 * hoặc tải về nếu lỡ khôi phục/đồng bộ/xoá nhầm.
 */
export default function SafetySnapshotsCard() {
  const [items, setItems] = useState<SafetySnapshot[]>([])

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
      await importAll(s.json)
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
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([s.json], { type: 'application/json' }))
    a.download = `moneysave-safety-${format(new Date(s.createdAt), 'yyyyMMdd-HHmm')}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="card" style={{ padding: '4px 16px' }}>
      <div className="row" style={{ borderBottom: items.length ? undefined : 0 }}>
        <div className="ico round" style={{ background: '#f59e0b24' }}>
          🛟
        </div>
        <div className="grow">
          <b>Bản sao an toàn tự động</b>
          <small>
            Tự lưu trên máy trước khi Khôi phục / Đồng bộ ghi đè / Xoá sạch và mỗi ngày 1 bản (giữ 15 bản gần nhất, không ảnh hưởng dữ liệu chính)
          </small>
        </div>
      </div>
      {items.length === 0 && <small className="mut" style={{ display: 'block', padding: '0 0 12px' }}>Chưa có bản sao nào.</small>}
      {items.map(s => (
        <div className="row" key={s.id}>
          <div className="grow">
            <b style={{ fontSize: 14 }}>{format(new Date(s.createdAt), 'dd/MM/yyyy HH:mm')}</b>
            <small>
              {s.reason} · {s.txCount} giao dịch · {s.fundCount} ví
            </small>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" className="btn" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => restore(s)}>
              Khôi phục
            </button>
            <button type="button" className="btn" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => download(s)}>
              Tải
            </button>
            <button
              type="button"
              className="btn dng"
              style={{ padding: '4px 10px', fontSize: 12 }}
              onClick={async () => {
                if (s.id == null) return
                const ok = await showConfirm({
                  title: 'Xoá bản sao an toàn?',
                  message: 'Bạn có chắc muốn xoá bản sao này khỏi thiết bị không?',
                  danger: true,
                  confirmText: 'Xoá bản sao',
                })
                if (ok) {
                  await deleteSafetySnapshot(s.id)
                  await reload()
                }
              }}
            >
              Xoá
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
