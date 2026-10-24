import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { addMonths, endOfMonth, format, startOfMonth } from 'date-fns'
import { db, type Tx } from '../db'
import { dayLabel, money, monthKey, monthLabel, ymd } from '../lib'
import TxForm from '../components/TxForm'

export default function Ledger() {
  const [cur, setCur] = useState(() => startOfMonth(new Date()))
  const [q, setQ] = useState('')
  const [fundFilter, setFundFilter] = useState(0)
  const [edit, setEdit] = useState<Tx | 'new' | null>(null)

  const from = ymd(startOfMonth(cur)), to = ymd(endOfMonth(cur))
  const txs = useLiveQuery(() => db.txs.where('date').between(from, to, true, true).toArray(), [from, to]) ?? []
  const funds = useLiveQuery(() => db.funds.toArray(), []) ?? []
  const cats = useLiveQuery(() => db.categories.toArray(), []) ?? []
  const fMap = useMemo(() => new Map(funds.map(f => [f.id!, f])), [funds])
  const cMap = useMemo(() => new Map(cats.map(c => [c.id!, c])), [cats])

  const nowK = monthKey(new Date()), curK = monthKey(cur)
  const rel = curK === nowK ? 'Tháng này' : curK > nowK ? 'Tương lai' : 'Đã qua'

  const shown = txs.filter(t =>
    (fundFilter === 0 || t.fundId === fundFilter || t.toFundId === fundFilter) &&
    (!q || (t.note + (cMap.get(t.categoryId ?? -1)?.name ?? '')).toLowerCase().includes(q.toLowerCase())))
  const days = useMemo(() => {
    const m = new Map<string, Tx[]>()
    const sorted = [...shown].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
    sorted.forEach(t => m.set(t.date, [...(m.get(t.date) ?? []), t]))
    return [...m.entries()]
  }, [shown])
  const inc = shown.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const exp = shown.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  return (
    <>
      <h1>Sổ giao dịch</h1>
      <div className="monthbar">
        <button onClick={() => setCur(addMonths(cur, -1))}>‹</button>
        <div className="lbl" onClick={() => setCur(startOfMonth(new Date()))} style={{ cursor: 'pointer' }}>
          {monthLabel(cur)}<small>{rel}{rel !== 'Tháng này' ? ' · chạm để về hiện tại' : ''}</small>
        </div>
        <button onClick={() => setCur(addMonths(cur, 1))}>›</button>
      </div>
      <div className="card grid3">
        <div className="stat"><small>Thu</small><b className="inc">{money(inc)}</b></div>
        <div className="stat"><small>Chi</small><b className="exp">{money(exp)}</b></div>
        <div className="stat"><small>Chênh lệch</small><b>{money(inc - exp)}</b></div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input className="search" placeholder="Tìm ghi chú / nhóm…" value={q} onChange={e => setQ(e.target.value)} />
        <select className="search" style={{ width: 130 }} value={fundFilter} onChange={e => setFundFilter(Number(e.target.value))}>
          <option value={0}>Mọi quỹ</option>
          {funds.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </div>
      {days.length === 0 && <div className="empty">Chưa có giao dịch trong {format(cur, 'MM/yyyy')}</div>}
      {days.map(([d, list]) => {
        const net = list.reduce((s, t) => s + (t.type === 'income' ? t.amount : t.type === 'expense' ? -t.amount : 0), 0)
        return (
          <div key={d}>
            <div className="dayhead">
              <span>{dayLabel(d)}</span>
              <span className={net < 0 ? 'exp' : net > 0 ? 'inc' : ''}>{net > 0 ? '+' : ''}{money(net)}</span>
            </div>
            <div className="card" style={{ padding: '0 14px' }}>
              {list.map(t => {
                const c = cMap.get(t.categoryId ?? -1)
                const isT = t.type === 'transfer'
                return (
                  <div className="row" key={t.id} onClick={() => setEdit(t)} style={{ cursor: 'pointer' }}>
                    <div className="ico" style={{ background: (c?.color ?? '#64748b') + '22' }}>{isT ? '🔁' : c?.icon ?? '❓'}</div>
                    <div className="grow">
                      <b>{isT ? 'Chuyển quỹ' : c?.name ?? 'Không nhóm'}</b>
                      <small>
                        {isT ? `${fMap.get(t.fundId)?.name} → ${fMap.get(t.toFundId ?? -1)?.name}` : fMap.get(t.fundId)?.name}
                        {t.note ? ' · ' + t.note : ''}
                      </small>
                    </div>
                    <b className={t.type === 'income' ? 'inc' : t.type === 'expense' ? 'exp' : 'mut'}>
                      {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''}{money(t.amount)}
                    </b>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
      <button className="fab" aria-label="Thêm" onClick={() => setEdit('new')}>+</button>
      {edit && <TxForm tx={edit === 'new' ? undefined : edit} onClose={() => setEdit(null)} />}
    </>
  )
}
