import { useState } from 'react'
import { effectOn, evaluateKeypadExpression, ymd } from '../../lib'
import { db, type Fund, type Tx } from '../../db'
import { InAppSelect, fundsToSelectOptions } from '../InAppSelectModal'
import { NumericInputBox } from '../Keypad'

export function AdjustBalanceModal({
  initialFund,
  funds,
  txs,
  onClose,
}: {
  initialFund: Fund
  funds: Fund[]
  txs: Tx[]
  onClose: () => void
}) {
  const [fundId, setFundId] = useState<number>(initialFund.id!)
  const selectedFund = funds.find(f => f.id === fundId) ?? initialFund
  const currentBal =
    selectedFund.initialBalance + txs.reduce((a, t) => a + effectOn(t, selectedFund.id!), 0)

  const [targetBalanceStr, setTargetBalanceStr] = useState<string>(String(currentBal))
  const [excludeFromReport, setExcludeFromReport] = useState<boolean>(true)

  async function save() {
    const targetBal = Math.round(evaluateKeypadExpression(targetBalanceStr))
    const diff = targetBal - currentBal

    if (diff !== 0) {
      await db.txs.add({
        type: diff > 0 ? 'income' : 'expense',
        amount: Math.abs(diff),
        date: ymd(new Date()),
        fundId: selectedFund.id!,
        toFundId: null,
        categoryId: null,
        note: 'Điều chỉnh số dư',
        createdAt: Date.now(),
        excludeFromReport,
      })
    }
    onClose()
  }

  return (
    <div className="sheetbg" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="ledger-topbar" style={{ marginBottom: 18 }}>
          <button className="close-pill-btn" onClick={onClose}>
            Huỷ
          </button>
          <b style={{ fontSize: 17 }}>Điều Chỉnh Số Dư</b>
          <button className="close-pill-btn" style={{ color: 'var(--acc)' }} onClick={save}>
            Lưu
          </button>
        </div>

        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ marginBottom: 14 }}>
            <div className="mut" style={{ fontSize: 13, marginBottom: 6 }}>
              Chọn ví cần điều chỉnh
            </div>
            <InAppSelect
              title="Chọn ví điều chỉnh số dư"
              value={fundId}
              options={fundsToSelectOptions(funds, txs)}
              onChange={nextId => {
                const nid = Number(nextId)
                setFundId(nid)
                const nf = funds.find(x => x.id === nid)
                if (nf) {
                  const nb = nf.initialBalance + txs.reduce((a, t) => a + effectOn(t, nf.id!), 0)
                  setTargetBalanceStr(String(nb))
                }
              }}
            />
          </div>

          <div>
            <div className="mut" style={{ fontSize: 13, marginBottom: 6 }}>
              Nhập số dư thực tế hiện tại của ví
            </div>
            <NumericInputBox
              value={targetBalanceStr}
              onChange={setTargetBalanceStr}
              placeholder="0"
              suffix="₫"
              allowNegative
              allowZeroDisplay
              variant="box"
            />
          </div>
        </div>

        <div className="wallet-toggle-card" style={{ marginTop: 14 }}>
          <span>Không tính vào báo cáo</span>
          <button
            type="button"
            className={`ios-switch ${excludeFromReport ? 'on' : ''}`}
            onClick={() => setExcludeFromReport(v => !v)}
            aria-label="Không tính vào báo cáo"
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Màn hình "Chuyển Tiền Đến Ví Khác" giống hệt Ảnh 4
 */
