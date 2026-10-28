import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { startOfMonth } from 'date-fns'
import DateInput from '../components/DateInput'
import {
  db,
  getNextOccurrence,
  processRecurringTransactions,
  type Budget,
  type Category,
  type Fund,
  type RecFrequency,
  type RecurringTx,
  type Tx,
  type TxType,
} from '../db'
import { filterReportableTxs, fmtDmy, money, monthKey, monthLabel, ymd } from '../lib'

const NO_CATS: Category[] = []
const NO_FUNDS: Fund[] = []
const NO_TXS: Tx[] = []
const NO_BUDGETS: Budget[] = []
const NO_RECS: RecurringTx[] = []

const FREQ_LABEL: Record<RecFrequency, string> = {
  monthly: 'Hàng tháng',
  weekly: 'Hàng tuần',
  daily: 'Hàng ngày',
  yearly: 'Hàng năm',
}

export default function Budgets() {
  const [tab, setTab] = useState<'recurring' | 'budget'>('recurring')
  const [curMonth] = useState(() => startOfMonth(new Date()))
  const [recEdit, setRecEdit] = useState<RecurringTx | 'new' | null>(null)

  const cats = useLiveQuery(() => db.categories.toArray(), [], NO_CATS)
  const funds = useLiveQuery(() => db.funds.toArray(), [], NO_FUNDS)
  const txs = useLiveQuery(() => db.txs.toArray(), [], NO_TXS)
  const budgets = useLiveQuery(() => db.budgets.toArray(), [], NO_BUDGETS)
  const recurrings = useLiveQuery(() => db.recurrings.toArray(), [], NO_RECS)

  const cMap = new Map(cats.map(c => [c.id!, c]))
  const fMap = new Map(funds.map(f => [f.id!, f]))
  const bMap = new Map(budgets.map(b => [b.categoryId, b]))
  const todayStr = ymd(new Date())

  const k = monthKey(curMonth)
  const reportableTxs = filterReportableTxs(txs, funds, 0)
  const monthExpenseByCat = new Map<number, number>()
  reportableTxs
    .filter(t => t.type === 'expense' && t.date.startsWith(k))
    .forEach(t => monthExpenseByCat.set(t.categoryId ?? 0, (monthExpenseByCat.get(t.categoryId ?? 0) ?? 0) + t.amount))

  const totalFixedExpenseMonthly = recurrings
    .filter(r => r.active && r.type === 'expense')
    .reduce((s, r) => s + r.amount, 0)

  async function toggleRecActive(rec: RecurringTx) {
    if (!rec.id) return
    const nextState = !rec.active
    await db.recurrings.update(rec.id, { active: nextState })
    if (nextState) await processRecurringTransactions()
  }

  async function triggerNow(rec: RecurringTx) {
    await db.txs.add({
      type: rec.type,
      amount: rec.amount,
      date: todayStr,
      fundId: rec.fundId,
      toFundId: rec.type === 'transfer' ? (rec.toFundId ?? null) : null,
      categoryId: rec.type === 'transfer' ? null : (rec.categoryId ?? null),
      note: rec.note ? `${rec.note} (Định kỳ: ${rec.name})` : `[Định kỳ] ${rec.name}`,
      createdAt: Date.now(),
      recurringId: rec.id ?? null,
    })
    if (rec.id) {
      await db.recurrings.update(rec.id, { lastGeneratedDate: todayStr })
    }
  }

  async function setBudget(c: Category) {
    const v = prompt(
      `Ngân sách tháng cho "${c.name}" (₫). Để trống hoặc 0 để xoá:`,
      String(bMap.get(c.id!)?.limit ?? ''),
    )
    if (v === null) return
    const n = Number(v.replace(/[^\d]/g, ''))
    const old = bMap.get(c.id!)
    if (!n) {
      if (old?.id) await db.budgets.delete(old.id)
      return
    }
    if (old?.id) await db.budgets.put({ ...old, limit: n })
    else await db.budgets.add({ categoryId: c.id!, limit: n })
  }

  return (
    <>
      <div className="tophead">
        <div>
          <h1 style={{ marginBottom: 2 }}>Ngân sách & Định kỳ</h1>
          <small className="mut">Tự động hóa hóa đơn cố định & kiểm soát hạn mức chi</small>
        </div>
      </div>

      <div className="seg" style={{ marginTop: 12 }}>
        <button className={tab === 'recurring' ? 'on' : ''} onClick={() => setTab('recurring')}>
          🔁 Giao dịch định kỳ ({recurrings.length})
        </button>
        <button className={tab === 'budget' ? 'on' : ''} onClick={() => setTab('budget')}>
          🎯 Ngân sách tháng ({budgets.length})
        </button>
      </div>

      {tab === 'recurring' && (
        <>
          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="mut" style={{ fontSize: 12 }}>
                Tổng chi cố định cài đặt (đang bật)
              </div>
              <div className="exp" style={{ fontSize: 22, fontWeight: 700 }}>
                {money(totalFixedExpenseMonthly)}
              </div>
              <small className="mut">Hệ thống tự động ghi sổ khi đến ngày định kỳ</small>
            </div>
            <button className="btn pri" onClick={() => setRecEdit('new')}>
              + Cài đặt mới
            </button>
          </div>

          <div className="card" style={{ padding: '0 14px' }}>
            {recurrings.length === 0 && (
              <div className="empty">
                Chưa có giao dịch định kỳ nào.
                <br />
                <small>Hãy thêm tiền nhà, điện, nước, internet, phí dịch vụ hoặc lương cố định để tự động ghi nhận.</small>
              </div>
            )}
            {recurrings.map(rec => {
              const cat = cMap.get(rec.categoryId ?? -1)
              const fund = fMap.get(rec.fundId)
              const nextDate = getNextOccurrence(rec, todayStr)
              return (
                <div className="row" key={rec.id} style={{ opacity: rec.active ? 1 : 0.55 }}>
                  <div
                    className="ico"
                    style={{ background: (cat?.color ?? '#10b981') + '22', cursor: 'pointer' }}
                    onClick={() => setRecEdit(rec)}
                  >
                    {rec.type === 'transfer' ? '🔁' : (cat?.icon ?? '🧾')}
                  </div>
                  <div className="grow" onClick={() => setRecEdit(rec)} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <b>{rec.name}</b>
                      <span className="pill-tag" style={{ whiteSpace: 'nowrap' }}>
                        {FREQ_LABEL[rec.frequency]}
                        {rec.frequency === 'monthly' && rec.dayOfMonth ? ` · ngày ${rec.dayOfMonth}` : ''}
                      </span>
                    </div>
                    <small style={{ whiteSpace: 'normal', lineHeight: 1.35 }}>
                      Quỹ: {fund?.name ?? '—'}
                      {fund?.archived ? ' (❄️ Ví đang lưu trữ/đóng băng)' : ''}
                      {rec.type === 'transfer' ? ` → ${fMap.get(rec.toFundId ?? -1)?.name ?? '—'}` : ''} · Kỳ tới:{' '}
                      <b>{fmtDmy(nextDate)}</b>
                      {rec.lastGeneratedDate ? ` (Đã chạy: ${fmtDmy(rec.lastGeneratedDate)})` : ''}
                    </small>
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <b className={rec.type === 'income' ? 'inc' : rec.type === 'expense' ? 'exp' : ''}>
                      {rec.type === 'income' ? '+' : rec.type === 'expense' ? '-' : ''}
                      {money(rec.amount)}
                    </b>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        className="btn"
                        style={{ padding: '3px 8px', fontSize: 11 }}
                        title="Phát sinh giao dịch ngay hôm nay"
                        onClick={() => triggerNow(rec)}
                      >
                        Chi ngay
                      </button>
                      <button
                        className="btn"
                        style={{ padding: '3px 8px', fontSize: 11 }}
                        onClick={() => toggleRecActive(rec)}
                      >
                        {rec.active ? 'Đang bật' : 'Tạm dừng'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {tab === 'budget' && (
        <>
          <div className="card">
            <div className="mut" style={{ fontSize: 12 }}>
              Theo dõi hạn mức chi tiêu · {monthLabel(curMonth)}
            </div>
            <div style={{ fontSize: 14, marginTop: 4 }}>
              Chạm vào nút <b>Đặt hạn mức</b> ở từng nhóm chi để giới hạn chi tiêu tháng.
            </div>
          </div>
          <div className="card" style={{ padding: '0 14px' }}>
            {cats
              .filter(c => c.type === 'expense')
              .map(c => {
                const spent = monthExpenseByCat.get(c.id!) ?? 0
                const lim = bMap.get(c.id!)?.limit ?? 0
                const pct = lim > 0 ? Math.min(100, Math.round((spent / lim) * 100)) : 0
                const over = lim > 0 && spent > lim
                return (
                  <div className="row" key={c.id}>
                    <div className="ico" style={{ background: c.color + '22' }}>
                      {c.icon}
                    </div>
                    <div className="grow">
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <b>{c.name}</b>
                        <span className={over ? 'exp' : 'mut'} style={{ fontSize: 13, fontWeight: 600 }}>
                          {lim > 0 ? `${money(spent)} / ${money(lim)}` : `Đã chi: ${money(spent)}`}
                        </span>
                      </div>
                      {lim > 0 && (
                        <>
                          <small className={over ? 'exp' : 'mut'}>
                            {over
                              ? `⚠️ Vượt ngân sách ${money(spent - lim)} (${Math.round((spent / lim) * 100)}%)`
                              : `Còn lại ${money(lim - spent)} (${pct}%)`}
                          </small>
                          <div className="bar">
                            <i
                              className={over ? 'over' : ''}
                              style={{ width: pct + '%', background: over ? undefined : c.color }}
                            />
                          </div>
                        </>
                      )}
                    </div>
                    <button className="btn" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => setBudget(c)}>
                      {lim > 0 ? 'Sửa mức' : 'Đặt hạn mức'}
                    </button>
                  </div>
                )
              })}
          </div>
        </>
      )}

      {recEdit && (
        <RecurringForm
          rec={recEdit === 'new' ? undefined : recEdit}
          funds={funds}
          cats={cats}
          onClose={() => setRecEdit(null)}
        />
      )}
    </>
  )
}

function RecurringForm({
  rec,
  funds,
  cats,
  onClose,
}: {
  rec?: RecurringTx
  funds: Fund[]
  cats: Category[]
  onClose: () => void
}) {
  const [name, setName] = useState(rec?.name ?? '')
  const [type, setType] = useState<TxType>(rec?.type ?? 'expense')
  const [amount, setAmount] = useState(rec ? String(rec.amount) : '')
  const [frequency, setFrequency] = useState<RecFrequency>(rec?.frequency ?? 'monthly')
  const [dayOfMonth, setDayOfMonth] = useState<string>(String(rec?.dayOfMonth ?? new Date().getDate()))
  const [startDate, setStartDate] = useState(rec?.startDate ?? ymd(new Date()))
  const [fundId, setFundId] = useState<number | ''>(rec?.fundId ?? funds[0]?.id ?? '')
  const [toFundId, setToFundId] = useState<number | ''>(rec?.toFundId ?? '')
  const [categoryId, setCategoryId] = useState<number | ''>(rec?.categoryId ?? '')
  const [note, setNote] = useState(rec?.note ?? '')
  const [err, setErr] = useState('')

  const list = cats.filter(c => c.type === type)
  const selCat = type === 'transfer' ? undefined : (cats.find(c => c.id === categoryId) ?? list[0])
  const fid = fundId === '' ? (selCat?.fundId ?? funds[0]?.id) : fundId

  async function save() {
    const amt = Number(amount.replace(/[^\d.]/g, ''))
    if (!name.trim()) return setErr('Nhập tên hóa đơn / giao dịch định kỳ')
    if (!amt || amt <= 0) return setErr('Nhập số tiền cố định hợp lệ')
    if (fid == null) return setErr('Chưa chọn quỹ')
    if (type === 'transfer' && (!toFundId || toFundId === fid)) return setErr('Chọn quỹ nhận khác quỹ nguồn')

    const data: RecurringTx = {
      name: name.trim(),
      type,
      amount: amt,
      fundId: fid,
      toFundId: type === 'transfer' ? Number(toFundId) : null,
      categoryId: type === 'transfer' ? null : (selCat?.id ?? null),
      note: note.trim(),
      frequency,
      dayOfMonth: frequency === 'monthly' ? Math.min(31, Math.max(1, Number(dayOfMonth) || new Date().getDate())) : undefined,
      startDate,
      lastGeneratedDate: rec?.lastGeneratedDate ?? null,
      active: rec?.active ?? true,
    }
    if (rec?.id) await db.recurrings.put({ ...data, id: rec.id })
    else await db.recurrings.add(data)
    await processRecurringTransactions()
    onClose()
  }

  async function del() {
    if (rec?.id && confirm(`Xoá cài đặt định kỳ "${rec.name}"?`)) {
      await db.recurrings.delete(rec.id)
      onClose()
    }
  }

  return (
    <div className="sheetbg" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <h1>{rec ? 'Sửa giao dịch định kỳ' : 'Cài đặt giao dịch định kỳ'}</h1>
        <div className="seg">
          {(['expense', 'income', 'transfer'] as TxType[]).map(t => (
            <button
              key={t}
              className={type === t ? 'on' : ''}
              onClick={() => {
                setType(t)
                setCategoryId('')
              }}
            >
              {t === 'expense' ? 'Chi cố định' : t === 'income' ? 'Thu cố định' : 'Chuyển quỹ'}
            </button>
          ))}
        </div>
        <label className="fld">
          <span>Tên hóa đơn / Khoản định kỳ</span>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="VD: Tiền nhà, Điện, Internet FPT, Netflix..."
          />
        </label>
        <label className="fld">
          <span>Số tiền cố định (₫)</span>
          <input inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" />
        </label>
        {type !== 'transfer' && (
          <label className="fld">
            <span>Nhóm</span>
            <select
              value={selCat?.id ?? ''}
              onChange={e => {
                const id = Number(e.target.value)
                setCategoryId(id)
                const cf = cats.find(c => c.id === id)?.fundId
                if (cf) setFundId(cf)
              }}
            >
              {list.map(c => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="fld">
          <span>{type === 'transfer' ? 'Từ quỹ' : 'Trích từ Quỹ / Thẻ'}</span>
          <select value={fid ?? ''} onChange={e => setFundId(Number(e.target.value))}>
            {funds.map(f => (
              <option key={f.id} value={f.id}>
                {f.icon} {f.name} {f.kind === 'credit' ? '(Tín dụng)' : ''}
              </option>
            ))}
          </select>
        </label>
        {type === 'transfer' && (
          <label className="fld">
            <span>Đến quỹ</span>
            <select value={toFundId} onChange={e => setToFundId(Number(e.target.value))}>
              <option value="">— chọn —</option>
              {funds
                .filter(f => f.id !== fid)
                .map(f => (
                  <option key={f.id} value={f.id}>
                    {f.icon} {f.name}
                  </option>
                ))}
            </select>
          </label>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <label className="fld">
            <span>Tần suất lặp</span>
            <select value={frequency} onChange={e => setFrequency(e.target.value as RecFrequency)}>
              <option value="monthly">Hàng tháng</option>
              <option value="weekly">Hàng tuần</option>
              <option value="daily">Hàng ngày</option>
              <option value="yearly">Hàng năm</option>
            </select>
          </label>
          {frequency === 'monthly' ? (
            <label className="fld">
              <span>Ngày tự động chi (1-31)</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={dayOfMonth}
                onChange={e => setDayOfMonth(e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 2))}
                onBlur={() => {
                  const n = Number(dayOfMonth)
                  setDayOfMonth(String(!n ? new Date().getDate() : Math.min(31, n)))
                }}
              />
            </label>
          ) : (
            <div />
          )}
        </div>
        <div className="fld">
          <span>Bắt đầu áp dụng từ ngày</span>
          <DateInput value={startDate} onChange={setStartDate} />
        </div>
        <label className="fld">
          <span>Ghi chú thêm</span>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Ghi chú tự động đính kèm..." />
        </label>
        {err && <p className="exp" style={{ marginBottom: 10 }}>{err}</p>}
        <div style={{ display: 'flex', gap: 8 }}>
          {rec && (
            <button className="btn dng" onClick={del}>
              Xoá
            </button>
          )}
          <button className="btn" style={{ flex: 1 }} onClick={onClose}>
            Huỷ
          </button>
          <button className="btn pri" style={{ flex: 2 }} onClick={save}>
            Lưu cài đặt
          </button>
        </div>
      </div>
    </div>
  )
}
