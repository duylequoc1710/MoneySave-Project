import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { addMonths, format, startOfMonth } from 'date-fns'
import { db } from '../db'
import { effectOn, money, moneyShort, monthKey, monthLabel } from '../lib'

export default function Overview() {
  const [range, setRange] = useState(6)
  const [cur, setCur] = useState(() => startOfMonth(new Date()))
  const txs = useLiveQuery(() => db.txs.toArray(), []) ?? []
  const funds = useLiveQuery(() => db.funds.toArray(), []) ?? []
  const cats = useLiveQuery(() => db.categories.toArray(), []) ?? []
  const budgets = useLiveQuery(() => db.budgets.toArray(), []) ?? []

  const total = funds.reduce((s, f) => s + f.initialBalance + txs.reduce((a, t) => a + effectOn(t, f.id!), 0), 0)

  const series = useMemo(() => {
    const base = startOfMonth(new Date())
    return Array.from({ length: range }, (_, i) => {
      const d = addMonths(base, i - (range - 1))
      const k = monthKey(d)
      const m = txs.filter(t => t.date.startsWith(k))
      return {
        name: format(d, 'MM/yy'),
        Thu: m.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
        Chi: m.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
      }
    })
  }, [txs, range])

  const k = monthKey(cur)
  const spend = useMemo(() => {
    const m = new Map<number, number>()
    txs.filter(t => t.type === 'expense' && t.date.startsWith(k)).forEach(t => m.set(t.categoryId ?? 0, (m.get(t.categoryId ?? 0) ?? 0) + t.amount))
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [txs, k])
  const totalSpend = spend.reduce((s, [, v]) => s + v, 0)
  const cMap = new Map(cats.map(c => [c.id!, c]))
  const bMap = new Map(budgets.map(b => [b.categoryId, b.limit]))

  return (
    <>
      <h1>Tổng quan</h1>
      <div className="card">
        <div className="mut" style={{ fontSize: 12 }}>Tổng số dư</div>
        <div style={{ fontSize: 28, fontWeight: 700 }}>{money(total)}</div>
      </div>

      <h2>Thu chi theo tháng</h2>
      <div className="card">
        <div className="seg">
          {[6, 12].map(n => <button key={n} className={range === n ? 'on' : ''} onClick={() => setRange(n)}>{n} tháng</button>)}
        </div>
        <div style={{ width: '100%', height: 240 }}>
          <ResponsiveContainer>
            <LineChart data={series} margin={{ left: -10, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#8884" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={moneyShort} tick={{ fontSize: 11 }} />
              <Tooltip formatter={v => money(Number(v))} />
              <Legend />
              <Line type="monotone" dataKey="Thu" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Chi" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <h2>Nhóm chi tiêu nhiều nhất</h2>
      <div className="monthbar">
        <button onClick={() => setCur(addMonths(cur, -1))}>‹</button>
        <div className="lbl">{monthLabel(cur)}<small>Tổng chi {money(totalSpend)}</small></div>
        <button onClick={() => setCur(addMonths(cur, 1))}>›</button>
      </div>
      <div className="card" style={{ padding: '0 14px' }}>
        {spend.length === 0 && <div className="empty">Chưa có khoản chi</div>}
        {spend.map(([id, v]) => {
          const c = cMap.get(id)
          const lim = bMap.get(id)
          const pct = lim ? Math.min(100, (v / lim) * 100) : (v / totalSpend) * 100
          return (
            <div className="row" key={id}>
              <div className="ico" style={{ background: (c?.color ?? '#64748b') + '22' }}>{c?.icon ?? '❓'}</div>
              <div className="grow">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <b>{c?.name ?? 'Không nhóm'}</b><b>{money(v)}</b>
                </div>
                <small>{lim ? `Ngân sách ${money(lim)} · ${Math.round((v / lim) * 100)}%` : `${Math.round((v / totalSpend) * 100)}% tổng chi`}</small>
                <div className="bar"><i className={lim && v > lim ? 'over' : ''} style={{ width: pct + '%', background: lim && v > lim ? undefined : c?.color }} /></div>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
