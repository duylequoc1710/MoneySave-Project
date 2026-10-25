import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { db, type Category, type Fund, type Tx } from '../db.ts'
import { getCategoryFullName, money } from '../lib.ts'
import type { TxFormDraft } from './TxForm.tsx'

interface TxDetailModalProps {
  tx: Tx
  onClose: () => void
  onEdit: (tx: Tx) => void
  onDuplicate: (draft: TxFormDraft) => void
}

const NO_FUNDS: Fund[] = []
const NO_CATS: Category[] = []

export default function TxDetailModal({
  tx,
  onClose,
  onEdit,
  onDuplicate,
}: TxDetailModalProps) {
  const [deleting, setDeleting] = useState(false)
  const funds = useLiveQuery(() => db.funds.toArray(), [], NO_FUNDS)
  const cats = useLiveQuery(() => db.categories.toArray(), [], NO_CATS)

  const isTransfer = tx.type === 'transfer'
  const isIncome = tx.type === 'income'
  const isExpense = tx.type === 'expense'

  const cat = isTransfer ? undefined : cats.find(c => c.id === tx.categoryId)
  const fromFund = funds.find(f => f.id === tx.fundId)
  const toFund = isTransfer ? funds.find(f => f.id === tx.toFundId) : undefined

  // Định dạng ngày theo chuẩn tiếng Việt có viết hoa đầu dòng: "Thứ Bảy, 17 tháng 10 2026"
  const rawDate = new Date(tx.date + 'T12:00:00')
  const dateStr = format(rawDate, "EEEE, dd 'tháng' M yyyy", { locale: vi })
  const formattedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1)

  const amountColor = isIncome
    ? 'var(--inc, #28c76f)'
    : isExpense
      ? 'var(--exp, #f25551)'
      : 'var(--fg, #f1f5f9)'

  const amountPrefix = isIncome ? '+' : isExpense ? '-' : ''

  async function handleDelete() {
    if (!tx.id) return
    const ok = window.confirm('Bạn có chắc chắn muốn xóa giao dịch này không?')
    if (!ok) return
    try {
      setDeleting(true)
      await db.txs.delete(tx.id)
      onClose()
    } catch (e) {
      alert('Lỗi khi xóa giao dịch: ' + (e as Error).message)
      setDeleting(false)
    }
  }

  function handleDuplicate() {
    onDuplicate({
      type: tx.type,
      amount: tx.amount,
      fundId: tx.fundId,
      toFundId: tx.toFundId ?? null,
      categoryId: tx.categoryId ?? null,
      note: tx.note,
    })
    onClose()
  }

  return (
    <div className="sheetbg" onClick={onClose}>
      <div
        className="sheet tx-detail-sheet"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 480,
          margin: '0 auto',
          background: 'var(--bg)',
          borderRadius: '24px 24px 0 0',
          padding: '16px 16px calc(24px + env(safe-area-inset-bottom))',
        }}
      >
        {/* Top Header Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <button
            type="button"
            className="detail-back-btn"
            onClick={onClose}
            aria-label="Quay lại"
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: 'color-mix(in srgb, var(--fg) 8%, transparent)',
              border: '1px solid var(--bd)',
              color: 'var(--fg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            ‹
          </button>
          <span style={{ fontSize: 16, fontWeight: 700 }}>Chi tiết giao dịch</span>
          <button
            type="button"
            className="detail-edit-btn"
            onClick={() => onEdit(tx)}
            style={{
              padding: '6px 16px',
              borderRadius: 20,
              background: 'color-mix(in srgb, var(--fg) 10%, transparent)',
              border: '1px solid var(--bd)',
              color: 'var(--fg)',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Sửa
          </button>
        </div>

        {/* Thẻ 1: Thông tin giao dịch chính */}
        <div
          className="card"
          style={{
            padding: '20px 18px',
            borderRadius: 18,
            marginBottom: 14,
            background: 'var(--card)',
            border: '1px solid var(--bd)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: isTransfer
                  ? 'rgba(59, 130, 246, 0.18)'
                  : cat?.color
                    ? cat.color + '26'
                    : 'rgba(255,255,255,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                flexShrink: 0,
              }}
            >
              {isTransfer ? '🔁' : (cat?.icon ?? '❓')}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg)' }}>
                {isTransfer ? 'Chuyển quỹ' : cat ? getCategoryFullName(cat, cats) : 'Không có nhóm'}
              </div>
              {tx.note && (
                <div className="mut" style={{ fontSize: 14, marginTop: 2 }}>
                  {tx.note}
                </div>
              )}
            </div>
          </div>

          {/* Số tiền lớn */}
          <div
            style={{
              fontSize: 32,
              fontWeight: 800,
              letterSpacing: -0.5,
              color: amountColor,
              marginBottom: 16,
              lineHeight: 1.2,
            }}
          >
            {amountPrefix}{money(tx.amount)}
          </div>

          {/* Đường phân cách */}
          <div style={{ height: 1, background: 'var(--bd)', marginBottom: 14 }} />

          {/* Dòng Ngày giao dịch */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '6px 0',
              fontSize: 14.5,
            }}
          >
            <span style={{ fontSize: 18, width: 22, textAlign: 'center' }}>📅</span>
            <span>{formattedDate}</span>
          </div>

          {/* Dòng Quỹ / Ví */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '6px 0',
              fontSize: 14.5,
            }}
          >
            <span style={{ fontSize: 18, width: 22, textAlign: 'center' }}>👛</span>
            <span>
              {isTransfer ? (
                <>
                  <b>{fromFund?.name ?? 'Ví nguồn'}</b> ➔ <b>{toFund?.name ?? 'Ví đích'}</b>
                </>
              ) : (
                <span>{fromFund?.name ?? 'Chưa chọn ví'}</span>
              )}
            </span>
          </div>

          {/* Huy hiệu ghi chú (nếu có) */}
          {(tx.excludeFromReport || tx.recurringId) && (
            <div
              style={{
                display: 'flex',
                gap: 8,
                marginTop: 10,
                paddingTop: 10,
                borderTop: '1px dashed var(--bd)',
                flexWrap: 'wrap',
              }}
            >
              {tx.excludeFromReport && (
                <span className="pill-tag" style={{ color: 'var(--mut)', borderColor: 'var(--bd)' }}>
                  🚫 Không tính vào báo cáo
                </span>
              )}
              {tx.recurringId && (
                <span className="pill-tag" style={{ color: 'var(--acc)', borderColor: 'var(--acc)' }}>
                  🔄 Hóa đơn định kỳ
                </span>
              )}
            </div>
          )}
        </div>

        {/* Thẻ 2: Các thao tác liên quan */}
        <div
          className="card"
          style={{
            padding: 0,
            borderRadius: 18,
            overflow: 'hidden',
            background: 'var(--card)',
            border: '1px solid var(--bd)',
          }}
        >
          {/* Sao chép giao dịch */}
          <button
            type="button"
            onClick={handleDuplicate}
            style={{
              width: '100%',
              padding: '15px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              background: 'transparent',
              border: 0,
              color: 'var(--acc)',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.15s ease',
            }}
            className="detail-action-btn"
          >
            <span>📄</span>
            <span>Sao chép giao dịch</span>
          </button>

          <div style={{ height: 1, background: 'var(--bd)' }} />

          {/* Xóa giao dịch */}
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            style={{
              width: '100%',
              padding: '15px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              background: 'transparent',
              border: 0,
              color: 'var(--exp)',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.15s ease',
            }}
            className="detail-action-btn"
          >
            <span>🗑️</span>
            <span>{deleting ? 'Đang xóa...' : 'Xóa giao dịch'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
