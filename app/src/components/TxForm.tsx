import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, processRecurringTransactions, type RecFrequency, type Tx, type TxType } from '../db'
import { evaluateKeypadExpression, formatKeypadDisplay, groupCategoriesHierarchy, money, ymd } from '../lib'
import DateInput from './DateInput'
import Keypad from './Keypad'

export interface TxFormDraft {
  type?: TxType
  amount?: number
  fundId?: number
  toFundId?: number | null
  categoryId?: number | null
  note?: string
}

export default function TxForm({
  tx,
  draft,
  onClose,
}: {
  tx?: Tx
  draft?: TxFormDraft
  onClose: () => void
}) {
  const funds = useLiveQuery(() => db.funds.filter(f => !f.archived || f.id === tx?.fundId).toArray(), [tx?.fundId]) ?? []
  const cats = useLiveQuery(() => db.categories.toArray(), []) ?? []
  const [type, setType] = useState<TxType>(tx?.type ?? draft?.type ?? 'expense')
  const [amount, setAmount] = useState(tx ? String(tx.amount) : draft?.amount ? String(draft.amount) : '')
  const [showKeypad, setShowKeypad] = useState<boolean>(!tx)
  const [date, setDate] = useState(() => tx?.date ?? ymd(new Date()))
  const [fundId, setFundId] = useState<number | ''>(tx?.fundId ?? draft?.fundId ?? '')
  const [toFundId, setToFundId] = useState<number | ''>(tx?.toFundId ?? draft?.toFundId ?? '')
  const [categoryId, setCategoryId] = useState<number | ''>(tx?.categoryId ?? draft?.categoryId ?? '')
  const [note, setNote] = useState(tx?.note ?? draft?.note ?? '')
  const [excludeFromReport, setExcludeFromReport] = useState<boolean>(
    tx?.excludeFromReport ?? (type === 'transfer' ? true : false),
  )
  const [hasFee, setHasFee] = useState(false)
  const [feeAmount, setFeeAmount] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [frequency, setFrequency] = useState<RecFrequency>('monthly')
  const [dayOfMonth, setDayOfMonth] = useState<number>(() => new Date().getDate())
  const [err, setErr] = useState('')

  const list = cats.filter(c => c.type === type)
  const selCat = type === 'transfer' ? undefined : (cats.find(c => c.id === categoryId) ?? list[0])
  const fid = fundId === '' ? (selCat?.fundId ?? funds[0]?.id) : fundId

  async function save() {
    const amt = evaluateKeypadExpression(amount)
    if (!amt || amt <= 0) return setErr('Nhập số tiền hợp lệ')
    if (fid == null) return setErr('Chưa có quỹ')
    if (type === 'transfer' && (toFundId === '' || toFundId === fid)) return setErr('Chọn quỹ nhận khác quỹ nguồn')
    const cat = type === 'transfer' ? null : (selCat?.id ?? null)

    if (!tx && isRecurring) {
      const recName = note.trim() || (type === 'transfer' ? 'Chuyển quỹ định kỳ' : (selCat?.name ?? 'Khoản định kỳ'))
      await db.recurrings.add({
        name: recName,
        type,
        amount: amt,
        fundId: fid,
        toFundId: type === 'transfer' ? Number(toFundId) : null,
        categoryId: cat,
        note: note.trim(),
        frequency,
        dayOfMonth: frequency === 'monthly' ? Math.min(31, Math.max(1, dayOfMonth)) : undefined,
        startDate: date,
        lastGeneratedDate: null,
        active: true,
      })
      await processRecurringTransactions()
      onClose()
      return
    }

    const data: Tx = {
      type,
      amount: amt,
      date,
      fundId: fid,
      toFundId: type === 'transfer' ? Number(toFundId) : null,
      categoryId: cat,
      note,
      createdAt: tx?.createdAt ?? Date.now(),
      recurringId: tx?.recurringId ?? null,
      excludeFromReport,
    }
    if (tx?.id) {
      await db.txs.put({ ...data, id: tx.id })
    } else {
      await db.txs.add(data)
      if (type === 'transfer' && hasFee) {
        const fee = evaluateKeypadExpression(feeAmount)
        if (fee > 0) {
          await db.txs.add({
            type: 'expense',
            amount: fee,
            date,
            fundId: fid,
            toFundId: null,
            categoryId: cats.find(c => c.type === 'expense' && c.name.includes('Hoá đơn'))?.id ?? cats.find(c => c.type === 'expense')?.id ?? null,
            note: `Phí chuyển khoản (${note || 'Chuyển tiền'})`,
            createdAt: Date.now() + 1,
            excludeFromReport,
          })
        }
      }
      const targetFund = funds.find(f => f.id === fid)
      if (targetFund?.notifyOnTx && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(`MoneyGo · ${targetFund.name}`, {
          body: `${type === 'income' ? '+' : '-'}${money(amt)} · ${note || selCat?.name || 'Giao dịch mới'}`,
        })
      }
    }
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
        <div className="ml-tx-header">
          <button type="button" className="ml-tx-cancel-btn" onClick={onClose}>
            Huỷ
          </button>
          <div className="ml-tx-title">
            {tx ? 'Sửa Giao Dịch' : 'Thêm Giao Dịch'}
          </div>
          <div style={{ width: 48 }} />
        </div>

        <div className="seg">
          {(['expense', 'income', 'transfer'] as TxType[]).map(t => (
            <button
              key={t}
              className={type === t ? 'on' : ''}
              onClick={() => {
                setType(t)
                setCategoryId('')
                if (t === 'transfer') setExcludeFromReport(true)
              }}
            >
              {t === 'expense' ? 'Chi tiêu' : t === 'income' ? 'Thu nhập' : 'Chuyển / Trả thẻ'}
            </button>
          ))}
        </div>

        {/* Khối hiển thị Số tiền kiểu MoneyLover – không kích hoạt bàn phím hệ thống của OS */}
        <div
          className={`ml-amount-display-box ${showKeypad ? 'active' : ''}`}
          onClick={() => setShowKeypad(true)}
        >
          <div className="ml-amount-head">
            <span className="ml-amount-caption">Số tiền</span>
            <span className="ml-amount-mode-badge">
              {showKeypad ? 'Bàn phím đang mở' : 'Chạm để sửa'}
            </span>
          </div>
          <div className="ml-amount-val-row">
            <span className="ml-currency-pill">VND</span>
            <span className="ml-amount-val">
              {formatKeypadDisplay(amount || '0')}
            </span>
            {showKeypad && amount && amount !== '0' && (
              <button
                type="button"
                className="ml-amount-clear-btn"
                onClick={e => {
                  e.stopPropagation()
                  setAmount('0')
                }}
                aria-label="Xoá số tiền"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Bàn phím số tích hợp liền mạch chuẩn MoneyLover */}
        {showKeypad && (
          <Keypad
            value={amount}
            onChange={setAmount}
            onDone={() => setShowKeypad(false)}
            suggestions={[50000, 100000, 200000, 500000]}
          />
        )}

        {type !== 'transfer' && (() => {
          const { parentGroups, independent } = groupCategoriesHierarchy(list)
          return (
            <label className="fld" style={{ marginTop: showKeypad ? 14 : 0 }}>
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
                {parentGroups.map(grp => (
                  <optgroup key={grp.parent.id} label={`${grp.parent.icon} ${grp.parent.name}`}>
                    <option value={grp.parent.id}>
                      {grp.parent.icon} {grp.parent.name} (Chung)
                    </option>
                    {grp.children.map(ch => (
                      <option key={ch.id} value={ch.id}>
                        &nbsp;&nbsp;&nbsp;&nbsp;↳ {ch.icon} {ch.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
                {independent.length > 0 && (
                  <optgroup label={parentGroups.length > 0 ? 'Nhóm khác' : 'Danh sách nhóm'}>
                    {independent.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </label>
          )
        })()}
        <label className="fld">
          <span>{type === 'transfer' ? 'Từ quỹ (nguồn)' : 'Quỹ / Thẻ thanh toán'}</span>
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
            <span>Đến quỹ / Thẻ nhận</span>
            <select value={toFundId} onChange={e => setToFundId(Number(e.target.value))}>
              <option value="">— chọn —</option>
              {funds
                .filter(f => f.id !== fid)
                .map(f => (
                  <option key={f.id} value={f.id}>
                    {f.icon} {f.name} {f.kind === 'credit' ? '(Trả thẻ tín dụng)' : ''}
                  </option>
                ))}
            </select>
          </label>
        )}
        <label className="fld">
          <span>{isRecurring ? 'Ngày bắt đầu áp dụng' : 'Ngày giao dịch'}</span>
          <DateInput
            value={date}
            onChange={val => {
              setDate(val)
              const d = Number(val.split('-')[2])
              if (d >= 1 && d <= 31) setDayOfMonth(d)
            }}
          />
        </label>
        <label className="fld">
          <span>Ghi chú / Tên hóa đơn</span>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="VD: Tiền điện, Xăng rửa xe..." />
        </label>

        {/* Tuỳ chọn Không tính vào báo cáo & Phí chuyển khoản */}
        <div className="card" style={{ background: 'var(--bg)', marginBottom: 12, padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Không tính vào báo cáo</div>
              <small className="mut">
                {type === 'transfer'
                  ? 'Giao dịch chuyển và nhận sẽ được loại khỏi báo cáo ở cả hai ví'
                  : 'Giao dịch này sẽ không đưa vào thống kê báo cáo Thu/Chi'}
              </small>
            </div>
            <button
              type="button"
              className={`ios-switch ${excludeFromReport ? 'on' : ''}`}
              onClick={() => setExcludeFromReport(v => !v)}
              aria-label="Không tính vào báo cáo"
            />
          </div>

          {type === 'transfer' && !tx && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--bd)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>Thêm phí chuyển khoản</span>
                <button
                  type="button"
                  className={`ios-switch ${hasFee ? 'on' : ''}`}
                  onClick={() => setHasFee(v => !v)}
                  aria-label="Thêm phí chuyển khoản"
                />
              </div>
              {hasFee && (
                <label className="fld" style={{ marginTop: 8, marginBottom: 0 }}>
                  <span>Phí chuyển khoản (₫)</span>
                  <input
                    inputMode="numeric"
                    value={feeAmount}
                    onChange={e => setFeeAmount(e.target.value)}
                    placeholder="VD: 3,300"
                  />
                </label>
              )}
            </div>
          )}
        </div>

        {!tx && (
          <div className="card" style={{ background: 'var(--bg)', marginBottom: 12, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>
                🔁 Cài làm Giao dịch định kỳ (tự động thực hiện khi đến ngày)
              </span>
              <button
                type="button"
                className={`ios-switch ${isRecurring ? 'on' : ''}`}
                onClick={() => setIsRecurring(v => !v)}
                aria-label="Giao dịch định kỳ"
              />
            </div>
            {isRecurring && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
                <label className="fld" style={{ marginBottom: 0 }}>
                  <span>Chu kỳ lặp</span>
                  <select value={frequency} onChange={e => setFrequency(e.target.value as RecFrequency)}>
                    <option value="monthly">Hàng tháng</option>
                    <option value="weekly">Hàng tuần</option>
                    <option value="daily">Hàng ngày</option>
                    <option value="yearly">Hàng năm</option>
                  </select>
                </label>
                {frequency === 'monthly' && (
                  <label className="fld" style={{ marginBottom: 0 }}>
                    <span>Ngày cố định (1-31)</span>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={dayOfMonth}
                      onChange={e => setDayOfMonth(Number(e.target.value))}
                    />
                  </label>
                )}
              </div>
            )}
          </div>
        )}

        {err && <p className="exp" style={{ marginBottom: 10 }}>{err}</p>}
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          {tx && (
            <button type="button" className="btn dng" onClick={del}>
              Xoá
            </button>
          )}
          <button
            type="button"
            className="btn pri"
            style={{ flex: 1, padding: '13px 20px', fontSize: 16, borderRadius: 14 }}
            onClick={save}
          >
            {isRecurring && !tx ? 'Lưu & Bật tự động' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  )
}
