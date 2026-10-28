import type { Category, Fund, Tx } from '../db'
import { money } from '../lib'

interface CatDetailModalProps {
  c: Category
  allCats: Category[]
  funds: Fund[]
  txs: Tx[]
  onEdit: (cat: Category) => void
  onDel: (cat: Category) => void
  onClose: () => void
}

export default function CatDetailModal({
  c,
  allCats,
  funds,
  txs,
  onEdit,
  onDel,
  onClose,
}: CatDetailModalProps) {
  const isExp = c.type === 'expense'
  const parent = c.parentId ? allCats.find(p => p.id === c.parentId) : null
  const children = allCats.filter(ch => ch.parentId === c.id)
  const fund = c.fundId ? funds.find(f => f.id === c.fundId) : null

  // Thống kê giao dịch liên quan đến nhóm này
  const catTxs = txs.filter(t => t.categoryId === c.id)
  const totalAmount = catTxs.reduce((sum, t) => sum + t.amount, 0)

  return (
    <div className="sheetbg" onClick={onClose} style={{ zIndex: 65 }}>
      <div
        className="sheet cat-detail-sheet"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 440,
          margin: '0 auto',
          paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {/* Header */}
        <div className="ml-tx-header" style={{ marginBottom: 16 }}>
          <button type="button" className="ml-tx-cancel-btn" onClick={onClose}>
            ‹ Đóng
          </button>
          <div className="ml-tx-title">Chi Tiết Nhóm</div>
          <button
            type="button"
            className="ml-tx-cancel-btn"
            style={{ color: 'var(--acc)', fontWeight: 700 }}
            onClick={() => {
              onClose()
              onEdit(c)
            }}
          >
            Sửa
          </button>
        </div>

        {/* Hero Card */}
        <div
          style={{
            textAlign: 'center',
            padding: '16px 12px 20px',
            background: 'color-mix(in srgb, var(--fg) 3%, transparent)',
            borderRadius: 18,
            marginBottom: 16,
            border: '1px solid var(--bd)',
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: (c.color || 'var(--acc)') + '25',
              color: c.color || 'var(--acc)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
              marginBottom: 10,
              boxShadow: `0 4px 16px ${c.color || '#28c76f'}33`,
            }}
          >
            {c.icon || '🏷️'}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>{c.name}</div>
          <span
            style={{
              display: 'inline-block',
              fontSize: 12,
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: 99,
              background: isExp ? 'color-mix(in srgb, var(--exp) 15%, transparent)' : 'color-mix(in srgb, var(--inc) 15%, transparent)',
              color: isExp ? 'var(--exp)' : 'var(--inc)',
            }}
          >
            {isExp ? 'Khoản chi tiêu' : 'Khoản thu nhập'}
          </span>
        </div>

        {/* Thông tin cấu hình nhóm */}
        <div className="card" style={{ padding: '4px 14px', marginBottom: 16 }}>
          <div className="row" style={{ padding: '10px 0' }}>
            <span className="mut" style={{ fontSize: 13.5 }}>Cấp bậc nhóm</span>
            <b>{parent ? `↳ Con của: ${parent.icon} ${parent.name}` : children.length > 0 ? `Nhóm cha (${children.length} nhóm con)` : 'Nhóm độc lập'}</b>
          </div>

          {children.length > 0 && (
            <div style={{ padding: '6px 0 10px', borderTop: '1px dashed var(--bd)' }}>
              <span className="mut" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                Các nhóm con trực thuộc:
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {children.map(ch => (
                  <span
                    key={ch.id}
                    style={{
                      fontSize: 12,
                      padding: '4px 8px',
                      borderRadius: 8,
                      background: 'color-mix(in srgb, var(--fg) 6%, transparent)',
                      border: '1px solid var(--bd)',
                    }}
                  >
                    {ch.icon} {ch.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="row" style={{ padding: '10px 0', borderTop: '1px solid var(--bd)' }}>
            <span className="mut" style={{ fontSize: 13.5 }}>Quỹ chi mặc định</span>
            <b>{fund ? `${fund.icon} ${fund.name}` : 'Mặc định theo ví'}</b>
          </div>

          <div className="row" style={{ padding: '10px 0', borderTop: '1px solid var(--bd)' }}>
            <span className="mut" style={{ fontSize: 13.5 }}>Số giao dịch đã ghi</span>
            <b>{catTxs.length} giao dịch</b>
          </div>

          <div className="row" style={{ padding: '10px 0', borderTop: '1px solid var(--bd)', borderBottom: 0 }}>
            <span className="mut" style={{ fontSize: 13.5 }}>Tổng tiền phát sinh</span>
            <b style={{ color: isExp ? 'var(--exp)' : 'var(--inc)', fontSize: 15 }}>
              {money(totalAmount)}
            </b>
          </div>
        </div>

        {/* 2 Nút tác vụ an toàn: Phải qua bước xác nhận này mới mở form sửa hoặc xoá */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            className="btn dng"
            style={{ padding: '12px 16px', borderRadius: 14 }}
            onClick={() => {
              onClose()
              onDel(c)
            }}
          >
            🗑️ Xoá
          </button>
          <button
            type="button"
            className="btn pri"
            style={{ flex: 1, padding: '12px 20px', borderRadius: 14, fontSize: 15 }}
            onClick={() => {
              onClose()
              onEdit(c)
            }}
          >
            ✏️ Chỉnh sửa nhóm này
          </button>
        </div>
      </div>
    </div>
  )
}
