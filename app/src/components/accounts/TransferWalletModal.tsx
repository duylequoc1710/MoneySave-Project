import { useState } from 'react'
import DateInput from '../DateInput'
import { ymd } from '../../lib'
import { db, type Category, type Fund } from '../../db'

export function TransferWalletModal({
  initial,
  funds,
  cats,
  onClose,
}: {
  initial: { fromFundId: number; toFundId?: number; amount?: number; note?: string }
  funds: Fund[]
  cats: Category[]
  onClose: () => void
}) {
  const activeFunds = funds.filter(f => !f.archived || f.id === initial.fromFundId || f.id === initial.toFundId)
  const [fromFundId, setFromFundId] = useState<number>(initial.fromFundId)
  const [toFundId, setToFundId] = useState<number | ''>(
    initial.toFundId ?? activeFunds.find(f => f.id !== initial.fromFundId)?.id ?? '',
  )
  const [amount, setAmount] = useState<string>(initial.amount ? String(initial.amount) : '')
  const [note, setNote] = useState<string>(initial.note ?? '')
  const [date, setDate] = useState<string>(() => ymd(new Date()))
  const [excludeFromReport, setExcludeFromReport] = useState<boolean>(true)
  const [addFee, setAddFee] = useState<boolean>(false)
  const [feeAmount, setFeeAmount] = useState<string>('')
  const [err, setErr] = useState<string>('')

  const fromFund = activeFunds.find(f => f.id === fromFundId) ?? activeFunds[0]

  async function save() {
    const amt = Number(amount.replace(/[^\d.]/g, ''))
    if (!amt || amt <= 0) return setErr('Nhập số tiền chuyển hợp lệ')
    if (toFundId === '' || toFundId === fromFundId) return setErr('Chọn ví nhận khác ví nguồn')

    await db.txs.add({
      type: 'transfer',
      amount: amt,
      date,
      fundId: fromFundId,
      toFundId: Number(toFundId),
      categoryId: null,
      note: note.trim() || 'Tiền chuyển đi',
      createdAt: Date.now(),
      excludeFromReport,
    })

    if (addFee) {
      const fee = Number(feeAmount.replace(/[^\d.]/g, ''))
      if (fee > 0) {
        await db.txs.add({
          type: 'expense',
          amount: fee,
          date,
          fundId: fromFundId,
          toFundId: null,
          categoryId:
            cats.find(c => c.type === 'expense' && c.name.includes('Hoá đơn'))?.id ??
            cats.find(c => c.type === 'expense')?.id ??
            null,
          note: `Phí chuyển khoản (${note.trim() || 'Chuyển tiền'})`,
          createdAt: Date.now() + 1,
          excludeFromReport,
        })
      }
    }
    onClose()
  }

  return (
    <div className="sheetbg" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="ledger-topbar" style={{ marginBottom: 14 }}>
          <button className="close-pill-btn" onClick={onClose}>
            Huỷ
          </button>
          <b style={{ fontSize: 17 }}>Chuyển Tiền Đến Ví Khác</b>
          <button className="close-pill-btn" style={{ color: 'var(--acc)' }} onClick={save}>
            Xong
          </button>
        </div>

        <div className="mut" style={{ fontWeight: 600, margin: '8px 4px' }}>
          Từ
        </div>
        <div className="card" style={{ padding: '4px 16px' }}>
          <div className="row">
            <div className="grow">
              <div className="mut" style={{ fontSize: 12 }}>
                Số tiền
              </div>
              <input
                inputMode="numeric"
                autoFocus
                placeholder="0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  background: 'transparent',
                  border: 0,
                  width: '100%',
                  outline: 'none',
                }}
              />
            </div>
            <span className="mut">₫ ›</span>
          </div>

          <div className="row">
            <div className="ico round" style={{ background: (fromFund?.color ?? '#f97316') + '28', width: 32, height: 32, fontSize: 16 }}>
              {fromFund?.icon ?? '👛'}
            </div>
            <div className="grow">
              <select
                value={fromFundId}
                onChange={e => setFromFundId(Number(e.target.value))}
                style={{
                  background: 'transparent',
                  border: 0,
                  fontSize: 16,
                  fontWeight: 500,
                  width: '100%',
                }}
              >
                {activeFunds.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            <span className="mut">›</span>
          </div>

          <div className="row">
            <div className="ico round" style={{ background: '#f9731628', width: 32, height: 32, fontSize: 16 }}>
              📤
            </div>
            <div className="grow">
              <span>Tiền chuyển đi</span>
            </div>
            <span className="mut">›</span>
          </div>

          <div className="row">
            <div className="ico round" style={{ background: '#64748b22', width: 32, height: 32, fontSize: 15 }}>
              ☰
            </div>
            <div className="grow">
              <input
                placeholder="Ghi chú"
                value={note}
                onChange={e => setNote(e.target.value)}
                style={{ background: 'transparent', border: 0, width: '100%', outline: 'none' }}
              />
            </div>
            <span className="mut">›</span>
          </div>
        </div>

        <div className="mut" style={{ fontWeight: 600, margin: '12px 4px 8px' }}>
          Đến
        </div>
        <div className="card" style={{ padding: '4px 16px' }}>
          <div className="row">
            <div className="ico round" style={{ background: '#64748b22', width: 32, height: 32, fontSize: 16 }}>
              👛
            </div>
            <div className="grow">
              <select
                value={toFundId}
                onChange={e => setToFundId(Number(e.target.value))}
                style={{
                  background: 'transparent',
                  border: 0,
                  fontSize: 16,
                  fontWeight: 500,
                  width: '100%',
                }}
              >
                <option value="">Chọn Ví</option>
                {activeFunds
                  .filter(f => f.id !== fromFundId)
                  .map(f => (
                    <option key={f.id} value={f.id}>
                      {f.icon} {f.name}
                    </option>
                  ))}
              </select>
            </div>
            <span className="mut">›</span>
          </div>
        </div>

        <div className="mut" style={{ fontWeight: 600, margin: '12px 4px 8px' }}>
          Tuỳ chọn
        </div>
        <div className="card" style={{ padding: '4px 16px' }}>
          <div className="row" style={{ alignItems: 'center', padding: '6px 0' }}>
            <div className="grow">
              <DateInput
                value={date}
                onChange={setDate}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div className="row" style={{ alignItems: 'center' }}>
            <div className="grow">
              <div style={{ fontWeight: 500, fontSize: 16 }}>Không tính vào báo cáo</div>
              <small className="mut" style={{ whiteSpace: 'normal' }}>
                Giao dịch chuyển và nhận sẽ được loại khỏi báo cáo ở cả hai ví
              </small>
            </div>
            <button
              type="button"
              className={`ios-switch ${excludeFromReport ? 'on' : ''}`}
              onClick={() => setExcludeFromReport(v => !v)}
              aria-label="Không tính vào báo cáo"
            />
          </div>

          <div className="row" style={{ alignItems: 'center' }}>
            <div className="grow">
              <div style={{ fontWeight: 500, fontSize: 16 }}>Thêm phí chuyển khoản</div>
            </div>
            <button
              type="button"
              className={`ios-switch ${addFee ? 'on' : ''}`}
              onClick={() => setAddFee(v => !v)}
              aria-label="Thêm phí chuyển khoản"
            />
          </div>

          {addFee && (
            <div className="row">
              <div className="grow">
                <div className="mut" style={{ fontSize: 12 }}>
                  Phí chuyển khoản (₫)
                </div>
                <input
                  inputMode="numeric"
                  placeholder="VD: 3,300"
                  value={feeAmount}
                  onChange={e => setFeeAmount(e.target.value)}
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    background: 'transparent',
                    border: 0,
                    width: '100%',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {err && <p className="exp" style={{ marginTop: 8 }}>{err}</p>}
      </div>
    </div>
  )
}
