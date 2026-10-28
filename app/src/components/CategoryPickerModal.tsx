import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { Category, TxType } from '../db'
import { groupCategoriesHierarchy } from '../lib'

interface CategoryPickerModalProps {
  type: TxType
  selectedId: number | ''
  categories: Category[]
  onSelect: (cat: Category) => void
  onClose: () => void
}

export default function CategoryPickerModal({
  type,
  selectedId,
  categories,
  onSelect,
  onClose,
}: CategoryPickerModalProps) {
  const [filterType, setFilterType] = useState<TxType>(type === 'transfer' ? 'expense' : type)
  const list = categories.filter(c => c.type === filterType)
  const { parentGroups, independent } = groupCategoriesHierarchy(list)

  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="sheetbg" onClick={onClose} style={{ zIndex: 75 }}>
      <div
        className="sheet cat-picker-sheet"
        onClick={e => e.stopPropagation()}
        style={{
          maxHeight: '80dvh',
          display: 'flex',
          flexDirection: 'column',
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {/* Header */}
        <div className="ml-tx-header" style={{ marginBottom: 12 }}>
          <button type="button" className="ml-tx-cancel-btn" onClick={onClose}>
            Đóng
          </button>
          <div className="ml-tx-title">Chọn Nhóm Giao Dịch</div>
          <div style={{ width: 50 }} />
        </div>

        {/* Tab chuyển đổi Thu / Chi nếu cần */}
        <div className="seg" style={{ marginBottom: 12 }}>
          <button
            type="button"
            className={filterType === 'expense' ? 'on' : ''}
            onClick={() => setFilterType('expense')}
          >
            Khoản chi
          </button>
          <button
            type="button"
            className={filterType === 'income' ? 'on' : ''}
            onClick={() => setFilterType('income')}
          >
            Khoản thu
          </button>
        </div>

        {/* Danh sách nhóm cuộn mượt mà */}
        <div
          className="cat-picker-scroll"
          style={{
            flex: 1,
            overflowY: 'auto',
            paddingRight: 2,
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {list.length === 0 && (
            <div className="empty" style={{ padding: '24px 0', textAlign: 'center' }}>
              Chưa có nhóm nào trong mục này
            </div>
          )}

          {/* Các nhóm cha và nhóm con */}
          {parentGroups.map(grp => (
            <div key={grp.parent.id} className="cat-picker-group">
              {/* Nhóm cha */}
              <div
                className={`cat-picker-item parent-item ${selectedId === grp.parent.id ? 'selected' : ''}`}
                onClick={() => {
                  onSelect(grp.parent)
                  onClose()
                }}
              >
                <div
                  className="ico round"
                  style={{
                    background: (grp.parent.color || 'var(--acc)') + '25',
                    color: grp.parent.color || 'var(--acc)',
                  }}
                >
                  {grp.parent.icon || '🏷️'}
                </div>
                <div className="grow">
                  <b style={{ fontSize: 15 }}>{grp.parent.name}</b>
                  <span className="mut" style={{ fontSize: 11, marginLeft: 6 }}>
                    (Nhóm chung)
                  </span>
                </div>
                {selectedId === grp.parent.id && <span className="cat-check">✓</span>}
              </div>

              {/* Các nhóm con thụt lề */}
              <div className="cat-picker-children">
                {grp.children.map(ch => (
                  <div
                    key={ch.id}
                    className={`cat-picker-item child-item ${selectedId === ch.id ? 'selected' : ''}`}
                    onClick={() => {
                      onSelect(ch)
                      onClose()
                    }}
                  >
                    <div
                      className="ico round child-ico"
                      style={{
                        background: (ch.color || 'var(--acc)') + '20',
                        color: ch.color || 'var(--acc)',
                      }}
                    >
                      {ch.icon || '🏷️'}
                    </div>
                    <div className="grow">
                      <span style={{ fontSize: 14.5 }}>{ch.name}</span>
                    </div>
                    {selectedId === ch.id && <span className="cat-check">✓</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Các nhóm độc lập */}
          {independent.length > 0 && (
            <div className="cat-picker-group">
              {parentGroups.length > 0 && (
                <div className="cat-group-label">Nhóm khác / Chưa phân loại</div>
              )}
              {independent.map(c => (
                <div
                  key={c.id}
                  className={`cat-picker-item ${selectedId === c.id ? 'selected' : ''}`}
                  onClick={() => {
                    onSelect(c)
                    onClose()
                  }}
                >
                  <div
                    className="ico round"
                    style={{
                      background: (c.color || 'var(--acc)') + '25',
                      color: c.color || 'var(--acc)',
                    }}
                  >
                    {c.icon || '🏷️'}
                  </div>
                  <div className="grow">
                    <span style={{ fontSize: 15 }}>{c.name}</span>
                  </div>
                  {selectedId === c.id && <span className="cat-check">✓</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
