import { useState } from 'react'
import { effectOn, ymd } from '../../lib'
import { db, type Fund, type Tx } from '../../db'

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
    const cleaned = targetBalanceStr.replace(/[^\d-]/g, '')
    const targetBal = cleaned === '' || cleaned === '-' ? 0 : Number(cleaned)
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

        <div className="card" style={{ padding: '8px 16px' }}>
          <div className="row">
            <div className="ico round" style={{ background: selectedFund.color + '28' }}>
              {selectedFund.icon}
            </div>
            <div className="grow">
              <select
                value={fundId}
                onChange={e => {
                  const nextId = Number(e.target.value)
                  setFundId(nextId)
                  const nf = funds.find(x => x.id === nextId)
                  if (nf) {
                    const nb = nf.initialBalance + txs.reduce((a, t) => a + effectOn(t, nf.id!), 0)
                    setTargetBalanceStr(String(nb))
                  }
                }}
                style={{
                  background: 'transparent',
                  border: 0,
                  fontSize: 16,
                  fontWeight: 600,
                  width: '100%',
                  cursor: 'pointer',
                }}
              >
                {funds.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            <span className="mut">›</span>
          </div>

          <div style={{ padding: '12px 0 6px' }}>
            <div className="mut" style={{ fontSize: 13, marginBottom: 4 }}>
              Nhập số dư hiện tại của ví
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <input
                inputMode="numeric"
                autoFocus
                value={targetBalanceStr}
                onChange={e => setTargetBalanceStr(e.target.value)}
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  background: 'transparent',
                  border: 0,
                  width: '100%',
                  outline: 'none',
                }}
              />
              <span className="mut" style={{ fontSize: 18 }}>
                ₫ ›
              </span>
            </div>
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
