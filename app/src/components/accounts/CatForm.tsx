import { useState } from 'react'
import { db, type Category, type Fund } from '../../db'
import { InAppSelect, fundsToSelectOptions } from '../InAppSelectModal'
import { Colors } from './Colors'

export function CatForm({
  c,
  funds,
  allCats,
  onClose,
  onDel,
}: {
  c: Category
  funds: Fund[]
  allCats: Category[]
  onClose: () => void
  onDel: (c: Category) => void
}) {
  const [v, setV] = useState(c)

  // Danh sách các nhóm có thể làm nhóm cha của nhóm này
  const potentialParents = allCats.filter(
    other => other.id !== c.id && other.type === v.type && !other.parentId
  )

  // Nếu nhóm này là nhóm cha (!v.parentId), nó có thể gom các nhóm con
  const candidatesForChildren = allCats.filter(
    other => other.id !== c.id && other.type === v.type && (!other.parentId || other.parentId === c.id)
  )

  const [selectedChildIds, setSelectedChildIds] = useState<number[]>(() =>
    c.id ? allCats.filter(other => other.parentId === c.id).map(other => other.id!) : []
  )

  async function save() {
    if (!v.name.trim()) return
    let savedId = c.id
    if (savedId) {
      await db.categories.put(v)
    } else {
      savedId = await db.categories.add(v)
    }

    if (!v.parentId && savedId) {
      // Cập nhật các nhóm con được tick chọn
      for (const other of candidatesForChildren) {
        if (!other.id) continue
        const isSelected = selectedChildIds.includes(other.id)
        if (isSelected && other.parentId !== savedId) {
          await db.categories.update(other.id, { parentId: savedId })
        } else if (!isSelected && other.parentId === savedId) {
          await db.categories.update(other.id, { parentId: null })
        }
      }
    } else if (v.parentId && savedId) {
      // Nếu chuyển nhóm này thành nhóm con, giải phóng tất cả các con cũ của nó (nếu có)
      await db.categories.where('parentId').equals(savedId).modify({ parentId: null })
    }

    onClose()
  }

  return (
    <div className="sheetbg" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <h1>{c.id ? 'Sửa nhóm' : 'Thêm nhóm'}</h1>
        {!c.id && (
          <div className="seg">
            {(['expense', 'income'] as const).map(t => (
              <button
                key={t}
                className={v.type === t ? 'on' : ''}
                onClick={() => {
                  setV({ ...v, type: t, parentId: null })
                  setSelectedChildIds([])
                }}
              >
                {t === 'expense' ? 'Chi' : 'Thu'}
              </button>
            ))}
          </div>
        )}
        <label className="fld">
          <span>Tên nhóm</span>
          <input value={v.name} onChange={e => setV({ ...v, name: e.target.value })} />
        </label>
        <label className="fld">
          <span>Biểu tượng (emoji)</span>
          <input value={v.icon} onChange={e => setV({ ...v, icon: e.target.value })} />
        </label>

        {/* Cấu hình Nhóm cha & Nhóm con */}
        <div className="fld">
          <span>Thuộc nhóm cha (Tùy chọn)</span>
          <InAppSelect<number>
            title="Chọn nhóm cha đại diện"
            value={v.parentId ?? 0}
            options={[
              {
                value: 0,
                label: '(Không có - Đây là nhóm cha độc lập)',
                icon: '📂',
                subLabel: 'Nhóm cấp 1 hiển thị độc lập',
              },
              ...potentialParents
                .filter(p => p.id != null)
                .map(p => ({
                  value: p.id!,
                  label: p.name,
                  icon: p.icon,
                  color: p.color,
                  subLabel: 'Nhóm cha đại diện',
                })),
            ]}
            onChange={nextVal => setV({ ...v, parentId: nextVal === 0 ? null : Number(nextVal) })}
          />
        </div>

        {/* Nếu đây là nhóm cha: hiển thị checklist để chọn nhanh các nhóm con */}
        {!v.parentId && candidatesForChildren.length > 0 && (
          <div
            style={{
              margin: '8px 0 14px',
              padding: 12,
              background: 'var(--bg)',
              borderRadius: 12,
              border: '1px solid var(--bd)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <b style={{ fontSize: 13 }}>📂 Gán các nhóm con vào nhóm này:</b>
              <small className="mut">{selectedChildIds.length} nhóm đã chọn</small>
            </div>
            <p className="mut" style={{ fontSize: 12, margin: '0 0 8px' }}>
              Tick chọn các nhóm chi tiêu sẽ nằm dưới nhóm đại diện này:
            </p>
            <div
              style={{
                maxHeight: 160,
                overflowY: 'auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                gap: 6,
              }}
            >
              {candidatesForChildren.map(other => {
                const isChecked = selectedChildIds.includes(other.id!)
                return (
                  <label
                    key={other.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 8px',
                      borderRadius: 8,
                      background: isChecked ? 'rgba(43, 194, 85, 0.15)' : 'transparent',
                      border: isChecked ? '1px solid var(--acc)' : '1px solid var(--bd)',
                      fontSize: 12.5,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        setSelectedChildIds(prev =>
                          isChecked ? prev.filter(x => x !== other.id) : [...prev, other.id!]
                        )
                      }}
                    />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {other.icon} {other.name}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        )}

        <div className="fld">
          <span>Gán mặc định vào Quỹ / Thẻ</span>
          <InAppSelect<number>
            title="Gán mặc định vào Quỹ / Thẻ"
            value={v.fundId ?? 0}
            options={fundsToSelectOptions(funds, undefined, {
              emptyOption: {
                value: 0,
                label: 'Không gán mặc định',
                icon: '➖',
                subLabel: 'Giữ nguyên quỹ đang chọn khi thêm giao dịch',
              },
            })}
            onChange={nextVal => setV({ ...v, fundId: nextVal === 0 ? null : Number(nextVal) })}
          />
        </div>
        <Colors v={v.color} on={col => setV({ ...v, color: col })} />
        <div style={{ display: 'flex', gap: 8 }}>
          {c.id && (
            <button
              className="btn dng"
              onClick={() => {
                onDel(c)
                onClose()
              }}
            >
              Xoá
            </button>
          )}
          <button className="btn" style={{ flex: 1 }} onClick={onClose}>
            Huỷ
          </button>
          <button className="btn pri" style={{ flex: 2 }} onClick={save}>
            Lưu
          </button>
        </div>
      </div>
    </div>
  )
}
