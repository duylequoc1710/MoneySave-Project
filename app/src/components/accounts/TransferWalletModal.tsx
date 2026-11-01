import { useState } from 'react'
import DateInput from '../DateInput'
import { InAppSelect, fundsToSelectOptions } from '../InAppSelectModal'
import { NumericInputBox } from '../Keypad'
import { evaluateKeypadExpression, ymd } from '../../lib'
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
    const amt = Math.round(evaluateKeypadExpression(amount))
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
      const fee = Math.round(evaluateKeypadExpression(feeAmount))
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
        <div className="card" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <div className="mut" style={{ fontSize: 12, marginBottom: 6 }}>
              Số tiền chuyển (₫)
            </div>
            <NumericInputBox
              value={amount}
              onChange={setAmount}
              placeholder="0"
              suffix="₫"
              variant="box"
            />
          </div>

          <div>
            <div className="mut" style={{ fontSize: 12, marginBottom: 6 }}>
              Ví nguồn
            </div>
            <InAppSelect
              title="Chọn ví nguồn"
              value={fromFund?.id ?? fromFundId}
              options={fundsToSelectOptions(activeFunds)}
              onChange={v => setFromFundId(Number(v))}
            />
          </div>

          <div className="row" style={{ padding: '8px 0' }}>
            <div className="ico round" style={{ background: '#f9731628', width: 32, height: 32, fontSize: 16 }}>
              📤
            </div>
            <div className="grow">
              <span>Tiền chuyển đi</span>
            </div>
          </div>

          <div className="row" style={{ padding: '6px 0' }}>
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
          </div>
        </div>

        <div className="mut" style={{ fontWeight: 600, margin: '12px 4px 8px' }}>
          Đến
        </div>
        <div className="card" style={{ padding: '12px 16px' }}>
          <InAppSelect
            title="Chọn Ví nhận"
            value={toFundId === '' ? 0 : Number(toFundId)}
            options={fundsToSelectOptions(
              activeFunds.filter(f => f.id !== fromFundId),
              undefined,
              { emptyOption: { value: 0, label: '— Chọn Ví nhận —', icon: '👛' } }
            )}
            onChange={v => setToFundId(v === 0 ? '' : Number(v))}
          />
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
            <div style={{ padding: '8px 0 12px' }}>
              <div className="mut" style={{ fontSize: 12, marginBottom: 6 }}>
                Phí chuyển khoản (₫)
              </div>
              <NumericInputBox
                variant="field"
                placeholder="VD: 3,300"
                value={feeAmount}
                onChange={setFeeAmount}
                suffix="₫"
                suggestions={[1100, 2200, 3300, 5500, 11000]}
              />
            </div>
          )}
        </div>

        {err && <p className="exp" style={{ marginTop: 8 }}>{err}</p>}
      </div>
    </div>
  )
}
