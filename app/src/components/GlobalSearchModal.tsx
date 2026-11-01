import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { type Category, type Fund, type RecurringTx, type SavingsGoal, type Tx } from '../db'
import { fmtDmy, money } from '../lib'

interface AppFeatureItem {
  id: string
  title: string
  subtitle: string
  icon: string
  keywords: string
  action: () => void
}

interface Props {
  funds: Fund[]
  cats: Category[]
  txs: Tx[]
  goals: SavingsGoal[]
  recurrings: RecurringTx[]
  onClose: () => void
  onSelectTx: (tx: Tx) => void
  onOpenSavingsGoals: () => void
}

export default function GlobalSearchModal({
  funds,
  cats,
  txs,
  goals,
  recurrings,
  onClose,
  onSelectTx,
  onOpenSavingsGoals,
}: Props) {
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'features' | 'txs' | 'notes'>('all')

  const fMap = useMemo(() => new Map(funds.map(f => [f.id!, f])), [funds])
  const cMap = useMemo(() => new Map(cats.map(c => [c.id!, c])), [cats])

  const features: AppFeatureItem[] = useMemo(() => [
    {
      id: 'tx_form',
      title: 'Thêm giao dịch mới',
      subtitle: 'Tạo khoản thu, chi hoặc chuyển quỹ giữa các ví',
      icon: '➕',
      keywords: 'them giao dich thu chi chuyen quy tien mat ngan hang',
      action: () => {
        onClose()
        const addBtn = document.querySelector('.ml-add-btn') as HTMLButtonElement | null
        addBtn?.click()
      },
    },
    {
      id: 'ledger',
      title: 'Sổ giao dịch',
      subtitle: 'Xem toàn bộ lịch sử thu/chi, chuyển ví, báo cáo giai đoạn',
      icon: '📖',
      keywords: 'so giao dich lich su xem giao dich bien dong so du thu chi',
      action: () => {
        onClose()
        nav('/ledger')
      },
    },
    {
      id: 'budgets',
      title: 'Ngân sách chi tiêu',
      subtitle: 'Đặt hạn mức cảnh báo chi tiêu theo danh mục tháng',
      icon: '🎯',
      keywords: 'ngan sach han muc chi tieu canh bao thang',
      action: () => {
        onClose()
        nav('/budgets')
      },
    },
    {
      id: 'recurring',
      title: 'Giao dịch định kỳ & Hóa đơn',
      subtitle: 'Tự động tạo chi phí lặp lại: Tiền nhà, điện, internet...',
      icon: '🔁',
      keywords: 'dinh ky hoa don tien nha dien nuoc internet netflix lap lai',
      action: () => {
        onClose()
        nav('/budgets')
      },
    },
    {
      id: 'savings',
      title: 'Quỹ Tiết Kiệm & Kế hoạch mục tiêu',
      subtitle: 'Lập mục tiêu tích lũy, phân bổ và theo dõi lộ trình tiết kiệm',
      icon: '🐷',
      keywords: 'tiet kiem quy muc tieu ke hoach phan bo tich luy',
      action: () => {
        onClose()
        onOpenSavingsGoals()
      },
    },
    {
      id: 'credit',
      title: 'Quỹ tín dụng & Trả góp',
      subtitle: 'Theo dõi hạn mức, ngày sao kê, hạn thanh toán và chuyển đổi trả góp',
      icon: '💳',
      keywords: 'tin dung the tin dung credit card tra gop sao ke han muc',
      action: () => {
        onClose()
        nav('/accounts')
      },
    },
    {
      id: 'accounts',
      title: 'Quản lý Ví & Tài khoản',
      subtitle: 'Thêm ví mới, chuyển tiền giữa các ví, điều chỉnh số dư thực tế',
      icon: '👛',
      keywords: 'vi tai khoan ngan hang chuyen tien dieu chinh so du',
      action: () => {
        onClose()
        nav('/accounts')
      },
    },
    {
      id: 'categories',
      title: 'Quản lý Danh mục Thu / Chi',
      subtitle: 'Tùy chỉnh nhóm cha, nhóm con và gán ví mặc định',
      icon: '📂',
      keywords: 'danh muc nhom thu chi cha con phan loai icon mau',
      action: () => {
        onClose()
        nav('/accounts')
      },
    },
    {
      id: 'settings',
      title: 'Cài đặt & Sao lưu dữ liệu',
      subtitle: 'Xuất file Excel / JSON, kiểm tra an toàn dữ liệu, giao diện Sáng / Tối',
      icon: '⚙️',
      keywords: 'cai dat sao luu excel json an toan khoi phuc dark mode giao dien',
      action: () => {
        onClose()
        nav('/settings')
      },
    },
  ], [nav, onClose, onOpenSavingsGoals])

  const cleanQuery = q.trim().toLowerCase()

  const matchedFeatures = useMemo(() => {
    if (!cleanQuery) return features.slice(0, 5)
    return features.filter(
      f =>
        f.title.toLowerCase().includes(cleanQuery) ||
        f.subtitle.toLowerCase().includes(cleanQuery) ||
        f.keywords.toLowerCase().includes(cleanQuery),
    )
  }, [features, cleanQuery])

  const matchedTxs = useMemo(() => {
    if (!cleanQuery) return []
    return txs
      .filter(t => {
        const catName = cMap.get(t.categoryId ?? -1)?.name ?? ''
        const fName = fMap.get(t.fundId)?.name ?? ''
        const toFName = t.toFundId ? fMap.get(t.toFundId)?.name ?? '' : ''
        const gName = t.savingsGoalName ?? ''
        const note = t.note ?? ''
        const dateStr = fmtDmy(t.date)
        const amtStr = String(t.amount)

        const fullStr = `${catName} ${fName} ${toFName} ${gName} ${note} ${dateStr} ${amtStr}`.toLowerCase()
        return fullStr.includes(cleanQuery)
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
      .slice(0, 30)
  }, [txs, cleanQuery, cMap, fMap])

  const matchedNotes = useMemo(() => {
    if (!cleanQuery) return []
    const items: Array<{ id: string; title: string; subtitle: string; icon: string; action: () => void }> = []

    goals.forEach(g => {
      const gStr = `${g.name} ${g.note ?? ''}`.toLowerCase()
      if (gStr.includes(cleanQuery)) {
        items.push({
          id: `goal-${g.id}`,
          title: `🎯 Mục tiêu: ${g.name}`,
          subtitle: `Tích lũy: ${money(g.allocatedAmount)} / ${money(g.targetAmount)}${g.note ? ' · ' + g.note : ''}`,
          icon: g.icon || '🎯',
          action: () => {
            onClose()
            onOpenSavingsGoals()
          },
        })
      }
    })

    recurrings.forEach(r => {
      const rStr = `${r.name} ${r.note ?? ''}`.toLowerCase()
      if (rStr.includes(cleanQuery)) {
        items.push({
          id: `rec-${r.id}`,
          title: `🔁 Định kỳ: ${r.name}`,
          subtitle: `Định mức ${money(r.amount)}${r.note ? ' · ' + r.note : ''}`,
          icon: '🗓️',
          action: () => {
            onClose()
            nav('/budgets')
          },
        })
      }
    })

    return items.slice(0, 15)
  }, [goals, recurrings, cleanQuery, onClose, onOpenSavingsGoals, nav])

  return createPortal(
    <div className="sheetbg" style={{ zIndex: 110 }} onClick={onClose}>
      <div
        className="sheet"
        style={{
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="ledger-topbar" style={{ marginBottom: 12 }}>
          <button type="button" className="close-pill-btn" onClick={onClose}>
            Đóng
          </button>
          <b style={{ fontSize: 17 }}>Tìm kiếm toàn diện</b>
          <span style={{ width: 48 }} />
        </div>

        {/* Ô nhập tìm kiếm (không autoFocus theo yêu cầu 1c để không tự bật bàn phím) */}
        <div style={{ padding: '0 4px', marginBottom: 12 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              borderRadius: 14,
              border: '1.5px solid var(--bd)',
              background: 'color-mix(in srgb, var(--card) 94%, #000)',
            }}
          >
            <span style={{ fontSize: 17, opacity: 0.7 }}>🔍</span>
            <input
              type="text"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Tìm chức năng, giao dịch, ghi chú, số tiền..."
              style={{
                flex: 1,
                border: 0,
                background: 'transparent',
                outline: 'none',
                fontSize: 15,
                fontWeight: 600,
                color: 'var(--fg)',
              }}
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ('')}
                style={{
                  background: 'none',
                  border: 0,
                  fontSize: 14,
                  color: 'var(--mut)',
                  cursor: 'pointer',
                  padding: '2px 6px',
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Tab phân loại kết quả */}
        <div className="seg" style={{ margin: '0 4px 12px' }}>
          <button
            type="button"
            className={activeTab === 'all' ? 'on' : ''}
            onClick={() => setActiveTab('all')}
          >
            Tất cả
          </button>
          <button
            type="button"
            className={activeTab === 'features' ? 'on' : ''}
            onClick={() => setActiveTab('features')}
          >
            Chức năng {matchedFeatures.length > 0 && `(${matchedFeatures.length})`}
          </button>
          <button
            type="button"
            className={activeTab === 'txs' ? 'on' : ''}
            onClick={() => setActiveTab('txs')}
          >
            Giao dịch {matchedTxs.length > 0 && `(${matchedTxs.length})`}
          </button>
          <button
            type="button"
            className={activeTab === 'notes' ? 'on' : ''}
            onClick={() => setActiveTab('notes')}
          >
            Kế hoạch {matchedNotes.length > 0 && `(${matchedNotes.length})`}
          </button>
        </div>

        {/* Nội dung kết quả cuộn mượt */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 4px' }}>
          {/* Section 1: Chức năng ứng dụng */}
          {(activeTab === 'all' || activeTab === 'features') && matchedFeatures.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div className="mut" style={{ fontSize: 12, fontWeight: 700, margin: '4px 6px 8px' }}>
                CHỨC NĂNG ỨNG DỤNG
              </div>
              <div className="card" style={{ padding: '2px 14px' }}>
                {matchedFeatures.map(f => (
                  <div
                    key={f.id}
                    className="row"
                    onClick={f.action}
                    style={{ cursor: 'pointer', padding: '10px 0' }}
                  >
                    <div
                      className="ico round"
                      style={{
                        background: 'color-mix(in srgb, var(--acc) 18%, transparent)',
                        width: 38,
                        height: 38,
                        fontSize: 18,
                        flexShrink: 0,
                      }}
                    >
                      {f.icon}
                    </div>
                    <div className="grow" style={{ minWidth: 0 }}>
                      <b style={{ fontSize: 14.5, display: 'block' }}>{f.title}</b>
                      <small className="mut" style={{ fontSize: 12 }}>{f.subtitle}</small>
                    </div>
                    <span className="mut" style={{ fontSize: 17 }}>›</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 2: Kế hoạch & Hóa đơn liên quan */}
          {(activeTab === 'all' || activeTab === 'notes') && matchedNotes.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div className="mut" style={{ fontSize: 12, fontWeight: 700, margin: '4px 6px 8px' }}>
                KẾ HOẠCH & GHI CHÚ
              </div>
              <div className="card" style={{ padding: '2px 14px' }}>
                {matchedNotes.map(n => (
                  <div
                    key={n.id}
                    className="row"
                    onClick={n.action}
                    style={{ cursor: 'pointer', padding: '10px 0' }}
                  >
                    <div
                      className="ico round"
                      style={{
                        background: 'rgba(59, 130, 246, 0.16)',
                        width: 38,
                        height: 38,
                        fontSize: 18,
                        flexShrink: 0,
                      }}
                    >
                      {n.icon}
                    </div>
                    <div className="grow" style={{ minWidth: 0 }}>
                      <b style={{ fontSize: 14.5, display: 'block' }}>{n.title}</b>
                      <small className="mut" style={{ fontSize: 12 }}>{n.subtitle}</small>
                    </div>
                    <span className="mut" style={{ fontSize: 17 }}>›</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 3: Giao dịch & Ghi chú liên quan */}
          {(activeTab === 'all' || activeTab === 'txs') && (
            <div>
              <div className="mut" style={{ fontSize: 12, fontWeight: 700, margin: '4px 6px 8px' }}>
                GIAO DỊCH LIÊN QUAN {cleanQuery && `(${matchedTxs.length})`}
              </div>
              {cleanQuery ? (
                matchedTxs.length === 0 ? (
                  <div className="empty" style={{ padding: '20px 0' }}>
                    Không tìm thấy giao dịch nào khớp với "{q}"
                  </div>
                ) : (
                  <div className="card" style={{ padding: '2px 14px' }}>
                    {matchedTxs.map(t => {
                      const c = cMap.get(t.categoryId ?? -1)
                      const f = fMap.get(t.fundId)
                      const isT = t.type === 'transfer'
                      const isSavings = t.savingsAction != null
                      return (
                        <div
                          key={t.id}
                          className="row"
                          onClick={() => {
                            onClose()
                            onSelectTx(t)
                          }}
                          style={{ cursor: 'pointer', padding: '10px 0' }}
                        >
                          <div
                            className="ico round"
                            style={{
                              background: isSavings
                                ? '#10b98124'
                                : (c?.color ?? '#64748b') + '28',
                              position: 'relative',
                              width: 38,
                              height: 38,
                              fontSize: 18,
                              flexShrink: 0,
                            }}
                          >
                            {isSavings ? (t.savingsGoalIcon || '🎯') : isT ? '🔁' : (c?.icon ?? '❓')}
                          </div>
                          <div className="grow" style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <b style={{ fontSize: 14.5 }}>
                                {isSavings
                                  ? (t.savingsAction === 'allocate' ? `Phân bổ: ${t.savingsGoalName}` : `Rút: ${t.savingsGoalName}`)
                                  : isT
                                    ? 'Chuyển quỹ'
                                    : (c?.name ?? 'Không nhóm')}
                              </b>
                              <span className="pill-tag" style={{ fontSize: 11 }}>{fmtDmy(t.date)}</span>
                            </div>
                            <small className="mut" style={{ display: 'block', fontSize: 12, marginTop: 2 }}>
                              {f?.name ?? ''}{t.note ? ' · ' + t.note : ''}
                            </small>
                          </div>
                          <b
                            className={t.type === 'income' || t.savingsAction === 'allocate' ? 'inc' : t.type === 'expense' ? 'exp' : 'mut'}
                            style={{ fontSize: 14.5, flexShrink: 0 }}
                          >
                            {money(t.amount)}
                          </b>
                        </div>
                      )
                    })}
                  </div>
                )
              ) : (
                <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
                  <span style={{ fontSize: 28, display: 'block', marginBottom: 6 }}>🔎</span>
                  <div style={{ fontWeight: 600, fontSize: 14.5, marginBottom: 4 }}>
                    Nhập từ khoá để tìm kiếm giao dịch
                  </div>
                  <small className="mut">
                    Có thể tìm theo tên danh mục, ví nguồn, số tiền, ngày giao dịch hoặc nội dung ghi chú.
                  </small>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
