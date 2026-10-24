import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, exportAll, importAll, type Category, type Fund } from '../db'
import { effectOn, money } from '../lib'

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#eab308', '#ef4444', '#06b6d4']

function download(name: string, content: string, mime: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([content], { type: mime }))
  a.download = name
  a.click()
}

export default function Accounts() {
  const funds = useLiveQuery(() => db.funds.toArray(), []) ?? []
  const cats = useLiveQuery(() => db.categories.toArray(), []) ?? []
  const txs = useLiveQuery(() => db.txs.toArray(), []) ?? []
  const budgets = useLiveQuery(() => db.budgets.toArray(), []) ?? []
  const [fundEdit, setFundEdit] = useState<Fund | null>(null)
  const [catEdit, setCatEdit] = useState<Category | null>(null)
  const file = useRef<HTMLInputElement>(null)

  const balance = (f: Fund) => f.initialBalance + txs.reduce((a, t) => a + effectOn(t, f.id!), 0)
  const bMap = new Map(budgets.map(b => [b.categoryId, b]))

  async function setBudget(c: Category) {
    const v = prompt(`Ngân sách tháng cho "${c.name}" (₫). Để trống hoặc 0 để bỏ:`, String(bMap.get(c.id!)?.limit ?? ''))
    if (v === null) return
    const n = Number(v.replace(/[^\d]/g, ''))
    const old = bMap.get(c.id!)
    if (!n) { if (old?.id) await db.budgets.delete(old.id); return }
    if (old?.id) await db.budgets.put({ ...old, limit: n })
    else await db.budgets.add({ categoryId: c.id!, limit: n })
  }

  async function delCat(c: Category) {
    const used = await db.txs.where('categoryId').equals(c.id!).count()
    if (used) return alert(`Nhóm đang có ${used} giao dịch, không thể xoá.`)
    if (confirm(`Xoá nhóm "${c.name}"?`)) await db.categories.delete(c.id!)
  }
  async function delFund(f: Fund) {
    const used = txs.filter(t => t.fundId === f.id || t.toFundId === f.id).length
    if (used) return alert(`Quỹ đang có ${used} giao dịch. Hãy chuyển/xoá giao dịch trước.`)
    if (confirm(`Xoá quỹ "${f.name}"?`)) await db.funds.delete(f.id!)
  }

  async function exportCsv() {
    const fm = new Map(funds.map(f => [f.id, f.name])), cm = new Map(cats.map(c => [c.id, c.name]))
    const rows = [['Ngày', 'Loại', 'Số tiền', 'Nhóm', 'Quỹ', 'Quỹ nhận', 'Ghi chú'],
      ...[...txs].sort((a, b) => a.date.localeCompare(b.date)).map(t => [t.date, t.type, t.amount, cm.get(t.categoryId ?? -1) ?? '', fm.get(t.fundId) ?? '', fm.get(t.toFundId ?? -1) ?? '', t.note])]
    download('moneygo.csv', '\ufeff' + rows.map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n'), 'text/csv')
  }
  async function restore(f?: File) {
    if (!f) return
    if (!confirm('Khôi phục sẽ GHI ĐÈ toàn bộ dữ liệu hiện tại. Tiếp tục?')) return
    try { await importAll(await f.text()); alert('Đã khôi phục.') } catch (e) { alert((e as Error).message) }
  }

  return (
    <>
      <h1>Tài khoản chung</h1>

      <h2>Quỹ</h2>
      <div className="card" style={{ padding: '0 14px' }}>
        {funds.map(f => (
          <div className="row" key={f.id} onClick={() => setFundEdit(f)} style={{ cursor: 'pointer' }}>
            <div className="ico" style={{ background: f.color + '22' }}>{f.icon}</div>
            <div className="grow"><b>{f.name}</b><small>Gồm các nhóm: {cats.filter(c => c.fundId === f.id).map(c => c.name).join(', ') || 'tất cả / chưa gán'}</small></div>
            <b>{money(balance(f))}</b>
          </div>
        ))}
      </div>
      <button className="btn" onClick={() => setFundEdit({ name: '', icon: '💰', color: COLORS[0], initialBalance: 0 })}>+ Thêm quỹ</button>

      <h2>Nhóm giao dịch</h2>
      {(['expense', 'income'] as const).map(type => (
        <div key={type}>
          <div className="mut" style={{ fontSize: 13, margin: '8px 4px' }}>{type === 'expense' ? 'Nhóm chi' : 'Nhóm thu'}</div>
          <div className="card" style={{ padding: '0 14px' }}>
            {cats.filter(c => c.type === type).map(c => (
              <div className="row" key={c.id}>
                <div className="ico" style={{ background: c.color + '22' }} onClick={() => setCatEdit(c)}>{c.icon}</div>
                <div className="grow" onClick={() => setCatEdit(c)} style={{ cursor: 'pointer' }}>
                  <b>{c.name}</b>
                  <small>{c.fundId ? 'Quỹ: ' + funds.find(f => f.id === c.fundId)?.name : 'Không gán quỹ'}</small>
                </div>
                {type === 'expense' && <button className="btn" onClick={() => setBudget(c)}>{bMap.get(c.id!) ? money(bMap.get(c.id!)!.limit) : 'Ngân sách'}</button>}
              </div>
            ))}
          </div>
        </div>
      ))}
      <button className="btn" onClick={() => setCatEdit({ name: '', type: 'expense', icon: '🏷️', color: COLORS[4] })}>+ Thêm nhóm</button>

      <h2>Dữ liệu</h2>
      <div className="card" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn" onClick={async () => download('moneygo-backup.json', await exportAll(), 'application/json')}>⬇ Sao lưu (JSON)</button>
        <button className="btn" onClick={() => file.current?.click()}>⬆ Khôi phục</button>
        <button className="btn" onClick={exportCsv}>Xuất CSV</button>
        <input ref={file} type="file" accept=".json" hidden onChange={e => { restore(e.target.files?.[0]); e.target.value = '' }} />
      </div>
      <p className="mut" style={{ fontSize: 12 }}>Dữ liệu đang lưu trên thiết bị này. Hãy sao lưu định kỳ.</p>

      {fundEdit && <FundForm f={fundEdit} onDel={delFund} onClose={() => setFundEdit(null)} />}
      {catEdit && <CatForm c={catEdit} funds={funds} onDel={delCat} onClose={() => setCatEdit(null)} />}
    </>
  )
}

function Colors({ v, on }: { v: string; on: (c: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
      {COLORS.map(c => <button key={c} onClick={() => on(c)} aria-label={c} style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: v === c ? '3px solid var(--fg)' : '0', cursor: 'pointer' }} />)}
    </div>
  )
}

function FundForm({ f, onClose, onDel }: { f: Fund; onClose: () => void; onDel: (f: Fund) => void }) {
  const [v, setV] = useState({ ...f, initialBalance: String(f.initialBalance) as unknown as number })
  async function save() {
    if (!v.name.trim()) return
    const data = { ...v, initialBalance: Number(String(v.initialBalance).replace(/[^\d-]/g, '')) || 0 }
    if (f.id) await db.funds.put(data); else await db.funds.add(data)
    onClose()
  }
  return (
    <div className="sheetbg" onClick={onClose}><div className="sheet" onClick={e => e.stopPropagation()}>
      <h1>{f.id ? 'Sửa quỹ' : 'Thêm quỹ'}</h1>
      <label className="fld"><span>Tên quỹ</span><input value={v.name} onChange={e => setV({ ...v, name: e.target.value })} autoFocus /></label>
      <label className="fld"><span>Biểu tượng (emoji)</span><input value={v.icon} onChange={e => setV({ ...v, icon: e.target.value })} /></label>
      <label className="fld"><span>Số dư ban đầu (₫)</span><input inputMode="numeric" value={v.initialBalance} onChange={e => setV({ ...v, initialBalance: e.target.value as unknown as number })} /></label>
      <Colors v={v.color} on={c => setV({ ...v, color: c })} />
      <div style={{ display: 'flex', gap: 8 }}>
        {f.id && <button className="btn dng" onClick={() => { onDel(f); onClose() }}>Xoá</button>}
        <button className="btn" style={{ flex: 1 }} onClick={onClose}>Huỷ</button>
        <button className="btn pri" style={{ flex: 2 }} onClick={save}>Lưu</button>
      </div>
    </div></div>
  )
}

function CatForm({ c, funds, onClose, onDel }: { c: Category; funds: Fund[]; onClose: () => void; onDel: (c: Category) => void }) {
  const [v, setV] = useState(c)
  async function save() {
    if (!v.name.trim()) return
    if (c.id) await db.categories.put(v); else await db.categories.add(v)
    onClose()
  }
  return (
    <div className="sheetbg" onClick={onClose}><div className="sheet" onClick={e => e.stopPropagation()}>
      <h1>{c.id ? 'Sửa nhóm' : 'Thêm nhóm'}</h1>
      {!c.id && <div className="seg">{(['expense', 'income'] as const).map(t => <button key={t} className={v.type === t ? 'on' : ''} onClick={() => setV({ ...v, type: t })}>{t === 'expense' ? 'Chi' : 'Thu'}</button>)}</div>}
      <label className="fld"><span>Tên nhóm</span><input value={v.name} onChange={e => setV({ ...v, name: e.target.value })} autoFocus /></label>
      <label className="fld"><span>Biểu tượng (emoji)</span><input value={v.icon} onChange={e => setV({ ...v, icon: e.target.value })} /></label>
      <label className="fld"><span>Thuộc quỹ</span>
        <select value={v.fundId ?? ''} onChange={e => setV({ ...v, fundId: e.target.value ? Number(e.target.value) : null })}>
          <option value="">Không gán</option>
          {funds.map(f => <option key={f.id} value={f.id}>{f.icon} {f.name}</option>)}
        </select></label>
      <Colors v={v.color} on={col => setV({ ...v, color: col })} />
      <div style={{ display: 'flex', gap: 8 }}>
        {c.id && <button className="btn dng" onClick={() => { onDel(c); onClose() }}>Xoá</button>}
        <button className="btn" style={{ flex: 1 }} onClick={onClose}>Huỷ</button>
        <button className="btn pri" style={{ flex: 2 }} onClick={save}>Lưu</button>
      </div>
    </div></div>
  )
}
