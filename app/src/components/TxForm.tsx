import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Tx, type TxType } from '../db'
import { ymd } from '../lib'

export default function TxForm({ tx, onClose }: { tx?: Tx; onClose: () => void }) {
  const funds = useLiveQuery(() => db.funds.filter(f => !f.archived).toArray(), []) ?? []
  const cats = useLiveQuery(() => db.categories.toArray(), []) ?? []
  const [type, setType] = useState<TxType>(tx?.type ?? 'expense')
  const [amount, setAmount] = useState(tx ? String(tx.amount) : '')
  const [date, setDate] = useState(tx?.date ?? ymd(new Date()))
  const [fundId, setFundId] = useState<number | ''>(tx?.fundId ?? '')
  const [toFundId, setToFundId] = useState<number | ''>(tx?.toFundId ?? '')
  const [categoryId, setCategoryId] = useState<number | ''>(tx?.categoryId ?? '')
  const [note, setNote] = useState(tx?.note ?? '')
  const [err, setErr] = useState('')

  const list = cats.filter(c => c.type === type)
  const fid = fundId === '' ? funds[0]?.id : fundId

  async function save() {
    const amt = Number(amount.replace(/[^\d.]/g, ''))
    if (!amt || amt <= 0) return setErr('Nhập số tiền hợp lệ')
    if (fid == null) return setErr('Chưa có quỹ')
    if (type === 'transfer' && (toFundId === '' || toFundId === fid)) return setErr('Chọn quỹ nhận khác quỹ nguồn')
    const cat = type === 'transfer' ? null : (categoryId === '' ? list[0]?.id ?? null : categoryId)
    const data: Tx = {
      type, amount: amt, date, fundId: fid,
      toFundId: type === 'transfer' ? Number(toFundId) : null,
      categoryId: cat, note, createdAt: tx?.createdAt ?? Date.now(),
    }
    if (tx?.id) await db.txs.put({ ...data, id: tx.id })
    else await db.txs.add(data)
    onClose()
  }
  async function del() {
    if (tx?.id && confirm('Xoá giao dịch này?')) {
      await db.txs.delete(tx.id)
      onClose()
    }
  }

  return (
    <div className="sheetbg" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <h1>{tx ? 'Sửa giao dịch' : 'Thêm giao dịch'}</h1>
        <div className="seg">
          {(['expense', 'income', 'transfer'] as TxType[]).map(t => (
            <button key={t} className={type === t ? 'on' : ''} onClick={() => { setType(t); setCategoryId('') }}>
              {t === 'expense' ? 'Chi' : t === 'income' ? 'Thu' : 'Chuyển quỹ'}
            </button>
          ))}
        </div>
        <label className="fld"><span>Số tiền (₫)</span>
          <input inputMode="numeric" autoFocus value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" /></label>
        {type !== 'transfer' && (
          <label className="fld"><span>Nhóm</span>
            <select value={categoryId === '' ? list[0]?.id ?? '' : categoryId} onChange={e => {
              const id = Number(e.target.value)
              setCategoryId(id)
              const cf = cats.find(c => c.id === id)?.fundId
              if (cf) setFundId(cf)
            }}>
              {list.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select></label>
        )}
        <label className="fld"><span>{type === 'transfer' ? 'Từ quỹ' : 'Quỹ'}</span>
          <select value={fid ?? ''} onChange={e => setFundId(Number(e.target.value))}>
            {funds.map(f => <option key={f.id} value={f.id}>{f.icon} {f.name}</option>)}
          </select></label>
        {type === 'transfer' && (
          <label className="fld"><span>Đến quỹ</span>
            <select value={toFundId} onChange={e => setToFundId(Number(e.target.value))}>
              <option value="">— chọn —</option>
              {funds.filter(f => f.id !== fid).map(f => <option key={f.id} value={f.id}>{f.icon} {f.name}</option>)}
            </select></label>
        )}
        <label className="fld"><span>Ngày (có thể chọn tương lai)</span>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
        <label className="fld"><span>Ghi chú</span><input value={note} onChange={e => setNote(e.target.value)} /></label>
        {err && <p className="exp" style={{ marginBottom: 10 }}>{err}</p>}
        <div style={{ display: 'flex', gap: 8 }}>
          {tx && <button className="btn dng" onClick={del}>Xoá</button>}
          <button className="btn" style={{ flex: 1 }} onClick={onClose}>Huỷ</button>
          <button className="btn pri" style={{ flex: 2 }} onClick={save}>Lưu</button>
        </div>
      </div>
    </div>
  )
}
