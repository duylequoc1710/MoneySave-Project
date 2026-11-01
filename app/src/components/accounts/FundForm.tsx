import { useState } from 'react'
import { db, type Fund } from '../../db'
import { evaluateKeypadExpression } from '../../lib'
import { NumericInputBox } from '../Keypad'
import { Colors } from './Colors'

export function FundForm({
  f,
  onClose,
  onDel,
  onOpenTransfer,
  onOpenAdjust,
}: {
  f: Fund
  onClose: () => void
  onDel: (f: Fund) => void
  onOpenTransfer: (f: Fund) => void
  onOpenAdjust: (f: Fund) => void
}) {
  const [kind, setKind] = useState<'cash' | 'credit'>(f.kind ?? 'cash')
  const [name, setName] = useState(f.name)
  const [icon, setIcon] = useState(f.icon)
  const [color, setColor] = useState(f.color)
  const [initialBalance, setInitialBalance] = useState(String(f.initialBalance))
  const [creditLimit, setCreditLimit] = useState(String(f.creditLimit ?? 50_000_000))
  const [statementDay, setStatementDay] = useState(String(f.statementDay ?? 20))
  const [dueDay, setDueDay] = useState(String(f.dueDay ?? 5))
  const [notifyOnTx, setNotifyOnTx] = useState(Boolean(f.notifyOnTx))
  const [excludeFromTotal, setExcludeFromTotal] = useState(Boolean(f.excludeFromTotal))
  const [archived, setArchived] = useState(Boolean(f.archived))

  async function save() {
    if (!name.trim()) return
    const initBal = Math.round(evaluateKeypadExpression(initialBalance)) || 0
    const data: Fund = {
      ...(f.id ? { id: f.id } : {}),
      name: name.trim(),
      icon: icon || (kind === 'credit' ? '💳' : '👛'),
      color,
      initialBalance: initBal,
      kind,
      notifyOnTx,
      excludeFromTotal,
      archived,
      creditLimit: kind === 'credit' ? Math.round(evaluateKeypadExpression(creditLimit)) || 0 : undefined,
      statementDay: kind === 'credit' ? Math.min(31, Math.max(1, Math.round(evaluateKeypadExpression(statementDay)) || 20)) : undefined,
      dueDay: kind === 'credit' ? Math.min(31, Math.max(1, Math.round(evaluateKeypadExpression(dueDay)) || 5)) : undefined,
    }
    if (f.id) await db.funds.put(data)
    else await db.funds.add(data)
    onClose()
  }

  return (
    <div className="sheetbg" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="ledger-topbar" style={{ marginBottom: 14 }}>
          <button className="close-pill-btn" onClick={onClose}>
            Huỷ
          </button>
          <b style={{ fontSize: 17 }}>{f.id ? 'Cài đặt Ví' : 'Thêm Ví mới'}</b>
          <button className="close-pill-btn" style={{ color: 'var(--acc)' }} onClick={save}>
            Lưu
          </button>
        </div>

        <div className="seg">
          <button
            className={kind === 'cash' ? 'on' : ''}
            onClick={() => {
              setKind('cash')
              if (icon === '💳') setIcon('👛')
            }}
          >
            👛 Ví / Tiết kiệm / Đầu tư
          </button>
          <button
            className={kind === 'credit' ? 'on' : ''}
            onClick={() => {
              setKind('credit')
              if (icon === '👛' || icon === '💵') setIcon('💳')
            }}
          >
            💳 Quỹ Tín Dụng
          </button>
        </div>

        <label className="fld">
          <span>{kind === 'credit' ? 'Tên thẻ tín dụng' : 'Tên ví / quỹ'}</span>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={kind === 'credit' ? 'VD: VIB Cash Back, VPBank StepUp...' : 'VD: Quỹ Chính, Investing, Saving LT...'}
          />
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 10 }}>
          <label className="fld">
            <span>Biểu tượng</span>
            <input value={icon} onChange={e => setIcon(e.target.value)} />
          </label>
          <div className="fld">
            <span>{kind === 'credit' ? 'Số dư đầu (nhập âm nếu đang nợ)' : 'Số dư ban đầu (₫)'}</span>
            <NumericInputBox
              variant="field"
              value={initialBalance}
              onChange={setInitialBalance}
              placeholder="0"
              suffix="₫"
              allowNegative
              allowZeroDisplay
            />
          </div>
        </div>
        {kind === 'credit' && evaluateKeypadExpression(initialBalance) > 0 && (
          <p className="exp" style={{ margin: '-4px 0 10px', fontSize: 12.5, lineHeight: 1.4 }}>
            ⚠️ Số dư đầu đang là số dương. Thẻ tín dụng nên để <b>0</b> (chưa nợ) hoặc <b>số âm</b> (đang nợ sẵn); số dương sẽ làm Dư nợ luôn hiển thị 0 ₫.
          </p>
        )}

        {kind === 'credit' && (
          <>
            <div className="fld">
              <span>Hạn mức tín dụng được cấp (₫)</span>
              <NumericInputBox
                variant="field"
                value={creditLimit}
                onChange={setCreditLimit}
                placeholder="50,000,000"
                suffix="₫"
                suggestions={[20000000, 30000000, 50000000, 100000000]}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, alignItems: 'end' }}>
              <div className="fld" style={{ marginBottom: 0 }}>
                <span style={{ whiteSpace: 'nowrap' }}>Ngày chốt sao kê (1-31)</span>
                <NumericInputBox
                  variant="field"
                  value={statementDay}
                  onChange={setStatementDay}
                  placeholder="20"
                  suffix="ngày"
                  suggestions={[5, 10, 15, 20, 25]}
                  minVal={1}
                  maxVal={31}
                />
              </div>
              <div className="fld" style={{ marginBottom: 0 }}>
                <span style={{ whiteSpace: 'nowrap' }}>Hạn thanh toán (1-31)</span>
                <NumericInputBox
                  variant="field"
                  value={dueDay}
                  onChange={setDueDay}
                  placeholder="5"
                  suffix="ngày"
                  suggestions={[5, 10, 15, 20, 25]}
                  minVal={1}
                  maxVal={31}
                />
              </div>
            </div>
          </>
        )}

        <Colors v={color} on={setColor} />

        {/* 3 Nút gạt cài đặt ví chuẩn MoneySave */}
        <div className="wallet-toggle-group">
          <div className="wallet-toggle-card">
            <span>Bật thông báo</span>
            <button
              type="button"
              className={`ios-switch ${notifyOnTx ? 'on' : ''}`}
              onClick={async () => {
                const next = !notifyOnTx
                setNotifyOnTx(next)
                if (next && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
                  await Notification.requestPermission()
                }
              }}
              aria-label="Bật thông báo"
            />
          </div>
          <p className="wallet-toggle-desc">Nhận thông báo khi ví có giao dịch mới.</p>

          <div className="wallet-toggle-card">
            <span>Không tính vào tổng</span>
            <button
              type="button"
              className={`ios-switch ${excludeFromTotal ? 'on' : ''}`}
              onClick={() => setExcludeFromTotal(v => !v)}
              aria-label="Không tính vào tổng"
            />
          </div>
          <p className="wallet-toggle-desc">Bỏ qua ví này và số dư khỏi "Tổng".</p>

          <div className="wallet-toggle-card">
            <span>Lưu trữ</span>
            <button
              type="button"
              className={`ios-switch ${archived ? 'on' : ''}`}
              onClick={() => setArchived(v => !v)}
              aria-label="Lưu trữ"
            />
          </div>
          <p className="wallet-toggle-desc">Đóng băng ví này và ngừng tạo ra giao dịch định kỳ & hóa đơn.</p>
        </div>

        {/* 2 nút hành động: Chuyển tiền đến ví khác & Điều chỉnh số dư (Ảnh 2) */}
        {f.id && (
          <div className="card" style={{ padding: 0, overflow: 'hidden', marginTop: 14 }}>
            <button
              type="button"
              className="wallet-action-row"
              onClick={() => onOpenTransfer(f)}
            >
              Chuyển tiền đến ví khác
            </button>
            <button
              type="button"
              className="wallet-action-row"
              style={{ borderBottom: 0 }}
              onClick={() => onOpenAdjust(f)}
            >
              Điều chỉnh số dư
            </button>
          </div>
        )}

        {f.id && (
          <div style={{ marginTop: 10, textAlign: 'center' }}>
            <button
              type="button"
              className="btn dng"
              style={{ width: '100%' }}
              onClick={() => {
                onDel(f)
                onClose()
              }}
            >
              Xoá ví này
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Màn hình "Điều Chỉnh Số Dư" giống hệt Ảnh 3
 */
