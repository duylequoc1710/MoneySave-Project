import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Category, type Fund, type Tx } from '../db'
import { analyzeCreditFund, effectOn, money, ymd } from '../lib'

const COLORS = ['#f97316', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#eab308', '#ef4444', '#06b6d4']

const NO_FUNDS: Fund[] = []
const NO_CATS: Category[] = []
const NO_TXS: Tx[] = []

export default function Accounts() {
  const nav = useNavigate()
  const funds = useLiveQuery(() => db.funds.toArray(), [], NO_FUNDS)
  const cats = useLiveQuery(() => db.categories.toArray(), [], NO_CATS)
  const txs = useLiveQuery(() => db.txs.toArray(), [], NO_TXS)

  const [fundEdit, setFundEdit] = useState<Fund | null>(null)
  const [catEdit, setCatEdit] = useState<Category | null>(null)
  const [adjustFund, setAdjustFund] = useState<Fund | null>(null)
  const [transferModal, setTransferModal] = useState<{
    fromFundId: number
    toFundId?: number
    amount?: number
    note?: string
  } | null>(null)

  const balance = (f: Fund) => f.initialBalance + txs.reduce((a, t) => a + effectOn(t, f.id!), 0)

  const includedWallets = funds.filter(f => !f.excludeFromTotal && !f.archived)
  const excludedWallets = funds.filter(f => f.excludeFromTotal && !f.archived)
  const archivedWallets = funds.filter(f => f.archived)
  const creditFunds = funds.filter(f => f.kind === 'credit' && !f.archived)
  const cashFunds = funds.filter(f => f.kind !== 'credit' && !f.archived)

  async function delCat(c: Category) {
    const used = await db.txs.where('categoryId').equals(c.id!).count()
    if (used) return alert(`Nhóm đang có ${used} giao dịch, không thể xoá.`)
    if (confirm(`Xoá nhóm "${c.name}"?`)) {
      await db.budgets.where('categoryId').equals(c.id!).delete()
      await db.categories.delete(c.id!)
    }
  }

  async function delFund(f: Fund) {
    const used = txs.filter(t => t.fundId === f.id || t.toFundId === f.id).length
    if (used) return alert(`Quỹ đang có ${used} giao dịch. Hãy dùng tính năng "Lưu trữ" hoặc xoá giao dịch trước.`)
    if (confirm(`Xoá quỹ "${f.name}"?`)) {
      await db.categories.where('fundId').equals(f.id!).modify({ fundId: null })
      await db.funds.delete(f.id!)
    }
  }

  return (
    <>
      <div className="ledger-topbar" style={{ marginBottom: 14 }}>
        <h1 style={{ margin: 0 }}>Ví của tôi</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="close-pill-btn"
            onClick={() => nav('/settings')}
            title="Mở Cài đặt Giao diện & Dữ liệu cá nhân"
          >
            ⚙️ Cài đặt
          </button>
          <button
            className="close-pill-btn"
            onClick={() =>
              setFundEdit({
                name: '',
                icon: '👛',
                color: COLORS[0],
                initialBalance: 0,
                kind: 'cash',
                excludeFromTotal: false,
                notifyOnTx: false,
                archived: false,
              })
            }
          >
            + Thêm ví
          </button>
        </div>
      </div>

      {/* 1. TÍNH VÀO TỔNG */}
      <h2>TÍNH VÀO TỔNG</h2>
      <div className="card" style={{ padding: '0 16px' }}>
        {includedWallets.length === 0 && <div className="empty">Chưa có ví nào trong nhóm Tính vào tổng</div>}
        {includedWallets.map(f => {
          const bal = balance(f)
          return (
            <div className="row" key={f.id} onClick={() => setFundEdit(f)} style={{ cursor: 'pointer' }}>
              <div className="ico round" style={{ background: f.color + '28' }}>
                {f.icon}
              </div>
              <div className="grow">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <b style={{ fontSize: 16 }}>{f.name}</b>
                  {f.kind === 'credit' && <span className="pill-tag">Tín dụng</span>}
                </div>
                <div style={{ fontSize: 15, marginTop: 2 }} className={bal < 0 ? 'exp' : 'mut'}>
                  {money(bal)}
                </div>
              </div>
              <span className="mut" style={{ fontSize: 18 }}>
                ›
              </span>
            </div>
          )
        })}
      </div>

      {/* 2. KHÔNG TÍNH VÀO TỔNG */}
      <h2>KHÔNG TÍNH VÀO TỔNG</h2>
      <div className="card" style={{ padding: '0 16px' }}>
        {excludedWallets.length === 0 && (
          <div className="empty" style={{ padding: '16px 0', fontSize: 13 }}>
            Chưa có ví nào bật "Không tính vào tổng". Bấm vào một ví bất kỳ để bật nếu là quỹ tiết kiệm/đầu tư riêng.
          </div>
        )}
        {excludedWallets.map(f => {
          const bal = balance(f)
          return (
            <div className="row" key={f.id} onClick={() => setFundEdit(f)} style={{ cursor: 'pointer' }}>
              <div className="ico round" style={{ background: f.color + '28' }}>
                {f.icon}
              </div>
              <div className="grow">
                <b style={{ fontSize: 16 }}>{f.name}</b>
                <div style={{ fontSize: 15, marginTop: 2 }} className={bal < 0 ? 'exp' : 'mut'}>
                  {money(bal)}
                </div>
              </div>
              <span className="mut" style={{ fontSize: 18 }}>
                ›
              </span>
            </div>
          )
        })}
      </div>

      {/* 3. VÍ ĐÃ LƯU TRỮ (ĐÓNG BĂNG) */}
      {archivedWallets.length > 0 && (
        <>
          <h2>❄️ ĐÃ LƯU TRỮ (ĐÓNG BĂNG)</h2>
          <div className="card" style={{ padding: '0 16px', opacity: 0.7 }}>
            {archivedWallets.map(f => (
              <div className="row" key={f.id} onClick={() => setFundEdit(f)} style={{ cursor: 'pointer' }}>
                <div className="ico round" style={{ background: f.color + '28' }}>
                  {f.icon}
                </div>
                <div className="grow">
                  <b>{f.name}</b>
                  <small>Đã đóng băng · Chạm để mở lại</small>
                </div>
                <b>{money(balance(f))}</b>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 4. PHÂN TÍCH QUỸ TÍN DỤNG (XÀI TRƯỚC TRẢ SAU) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '22px 0 8px' }}>
        <h2 style={{ margin: 0 }}>💳 Quỹ tín dụng (Xài trước trả sau)</h2>
        <button
          className="btn pri"
          style={{ padding: '6px 12px', fontSize: 13 }}
          onClick={() =>
            setFundEdit({
              name: '',
              icon: '💳',
              color: '#8b5cf6',
              initialBalance: 0,
              kind: 'credit',
              creditLimit: 50_000_000,
              statementDay: 20,
              dueDay: 5,
            })
          }
        >
          + Thêm thẻ tín dụng
        </button>
      </div>

      {creditFunds.map(f => {
        const info = analyzeCreditFund(f, txs)
        const defaultSourceFund = cashFunds[0]?.id ?? funds[0]?.id ?? 1
        return (
          <div className="card credit-card" key={f.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div className="ico" style={{ background: f.color + '22', cursor: 'pointer' }} onClick={() => setFundEdit(f)}>
                {f.icon}
              </div>
              <div className="grow" style={{ cursor: 'pointer' }} onClick={() => setFundEdit(f)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <b style={{ fontSize: 16 }}>{f.name}</b>
                  <span className="pill-tag">Miễn lãi {info.interestFreeDaysToday} ngày</span>
                  {f.excludeFromTotal && <span className="pill-tag">Không tính vào tổng</span>}
                </div>
                <small className="mut">
                  Chốt sao kê: <b>ngày {info.statementDay}</b> (còn {info.daysUntilStatement} ngày) · Hạn TT:{' '}
                  <b>ngày {info.dueDay}</b> (còn {info.daysUntilDue} ngày)
                </small>
              </div>
              <div style={{ textAlign: 'right' }}>
                <small className="mut" style={{ display: 'block', fontSize: 11 }}>
                  Dư nợ hiện tại
                </small>
                <b className={info.debt > 0 ? 'exp' : 'inc'} style={{ fontSize: 17 }}>
                  {info.debt > 0 ? `-${money(info.debt)}` : '0 ₫'}
                </b>
              </div>
            </div>

            {info.creditLimit > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }} className="mut">
                  <span>Khả dụng: {money(info.availableCredit)}</span>
                  <span>
                    Hạn mức: {money(info.creditLimit)} ({info.utilizationPct}%)
                  </span>
                </div>
                <div className="bar">
                  <i
                    className={info.utilizationPct > 80 ? 'over' : ''}
                    style={{ width: `${info.utilizationPct}%`, background: info.utilizationPct > 80 ? undefined : f.color }}
                  />
                </div>
              </div>
            )}

            <div className={`credit-advice ${info.statusTag}`}>{info.advice}</div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, gap: 8 }}>
              <small className="mut">
                Chi trong kỳ sao kê mới (từ sau {info.lastStatementDate}): <b>{money(info.currentCycleSpend)}</b>
              </small>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => setFundEdit(f)}>
                  Cài đặt ví
                </button>
                {info.debt > 0 && (
                  <button
                    className="btn pri"
                    style={{ padding: '6px 12px', fontSize: 12 }}
                    onClick={() =>
                      setTransferModal({
                        fromFundId: defaultSourceFund,
                        toFundId: f.id,
                        amount: info.debt,
                        note: `Tất toán thẻ ${f.name}`,
                      })
                    }
                  >
                    Tất toán ({money(info.debt)})
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })}

      {/* 5. NHÓM GIAO DỊCH */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 0 8px' }}>
        <h2 style={{ margin: 0 }}>🏷️ Nhóm giao dịch</h2>
        <button
          className="btn"
          style={{ padding: '6px 12px', fontSize: 13 }}
          onClick={() => setCatEdit({ name: '', type: 'expense', icon: '🏷️', color: COLORS[0] })}
        >
          + Thêm nhóm
        </button>
      </div>
      {(['expense', 'income'] as const).map(type => (
        <div key={type}>
          <div className="mut" style={{ fontSize: 13, margin: '8px 4px' }}>
            {type === 'expense' ? 'Nhóm chi tiêu' : 'Nhóm thu nhập'}
          </div>
          <div className="card" style={{ padding: '0 14px' }}>
            {cats
              .filter(c => c.type === type)
              .map(c => (
                <div className="row" key={c.id} onClick={() => setCatEdit(c)} style={{ cursor: 'pointer' }}>
                  <div className="ico" style={{ background: c.color + '22' }}>
                    {c.icon}
                  </div>
                  <div className="grow">
                    <b>{c.name}</b>
                    <small>{c.fundId ? 'Quỹ mặc định: ' + funds.find(f => f.id === c.fundId)?.name : 'Không gán quỹ'}</small>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}

      <div className="card" style={{ padding: '4px 16px', marginTop: 18 }}>
        <div className="row" style={{ cursor: 'pointer' }} onClick={() => nav('/settings')}>
          <div className="ico round" style={{ background: 'color-mix(in srgb, var(--acc) 18%, transparent)' }}>
            ⚙️
          </div>
          <div className="grow">
            <b>Cài đặt & Dữ liệu cá nhân</b>
            <small>Đổi giao diện Sáng/Tối, Xuất file Excel, Sao lưu & Khôi phục</small>
          </div>
          <span className="mut" style={{ fontSize: 18 }}>
            ›
          </span>
        </div>
      </div>

      {fundEdit && (
        <FundForm
          f={fundEdit}
          onDel={delFund}
          onClose={() => setFundEdit(null)}
          onOpenTransfer={f => {
            setFundEdit(null)
            setTransferModal({ fromFundId: f.id! })
          }}
          onOpenAdjust={f => {
            setFundEdit(null)
            setAdjustFund(f)
          }}
        />
      )}
      {catEdit && <CatForm c={catEdit} funds={funds} onDel={delCat} onClose={() => setCatEdit(null)} />}
      {adjustFund && (
        <AdjustBalanceModal
          initialFund={adjustFund}
          funds={funds}
          txs={txs}
          onClose={() => setAdjustFund(null)}
        />
      )}
      {transferModal && (
        <TransferWalletModal
          initial={transferModal}
          funds={funds}
          cats={cats}
          onClose={() => setTransferModal(null)}
        />
      )}
    </>
  )
}

function Colors({ v, on }: { v: string; on: (c: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
      {COLORS.map(c => (
        <button
          key={c}
          type="button"
          onClick={() => on(c)}
          aria-label={c}
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: c,
            border: v === c ? '3px solid var(--fg)' : '0',
            cursor: 'pointer',
          }}
        />
      ))}
    </div>
  )
}

function FundForm({
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
    const initBal = Number(initialBalance.replace(/[^\d-]/g, '')) || 0
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
      creditLimit: kind === 'credit' ? Number(creditLimit.replace(/[^\d]/g, '')) || 0 : undefined,
      statementDay: kind === 'credit' ? Math.min(31, Math.max(1, Number(statementDay) || 20)) : undefined,
      dueDay: kind === 'credit' ? Math.min(31, Math.max(1, Number(dueDay) || 5)) : undefined,
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
            💳 Quỹ Tín Dụng (Trả sau)
          </button>
        </div>

        <label className="fld">
          <span>{kind === 'credit' ? 'Tên thẻ tín dụng' : 'Tên ví / quỹ'}</span>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus={!f.id}
            placeholder={kind === 'credit' ? 'VD: VIB Cash Back, VPBank StepUp...' : 'VD: Quỹ Chính, Investing, Saving LT...'}
          />
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 10 }}>
          <label className="fld">
            <span>Biểu tượng</span>
            <input value={icon} onChange={e => setIcon(e.target.value)} />
          </label>
          <label className="fld">
            <span>{kind === 'credit' ? 'Số dư đầu (nhập âm nếu đang nợ)' : 'Số dư ban đầu (₫)'}</span>
            <input inputMode="numeric" value={initialBalance} onChange={e => setInitialBalance(e.target.value)} />
          </label>
        </div>

        {kind === 'credit' && (
          <>
            <label className="fld">
              <span>Hạn mức tín dụng được cấp (₫)</span>
              <input inputMode="numeric" value={creditLimit} onChange={e => setCreditLimit(e.target.value)} />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <label className="fld">
                <span>Ngày chốt sao kê hàng tháng (1-31)</span>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={statementDay}
                  onChange={e => setStatementDay(e.target.value)}
                />
              </label>
              <label className="fld">
                <span>Ngày hạn thanh toán (1-31)</span>
                <input type="number" min={1} max={31} value={dueDay} onChange={e => setDueDay(e.target.value)} />
              </label>
            </div>
          </>
        )}

        <Colors v={color} on={setColor} />

        {/* 3 Nút gạt giống hệt MoneyLover (Ảnh 2) */}
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
function AdjustBalanceModal({
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
function TransferWalletModal({
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
          <div className="row">
            <span style={{ fontSize: 18 }}>📅</span>
            <div className="grow">
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                style={{ background: 'transparent', border: 0, fontSize: 16, width: '100%' }}
              />
            </div>
            <span className="mut">›</span>
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

function CatForm({
  c,
  funds,
  onClose,
  onDel,
}: {
  c: Category
  funds: Fund[]
  onClose: () => void
  onDel: (c: Category) => void
}) {
  const [v, setV] = useState(c)
  async function save() {
    if (!v.name.trim()) return
    if (c.id) await db.categories.put(v)
    else await db.categories.add(v)
    onClose()
  }
  return (
    <div className="sheetbg" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <h1>{c.id ? 'Sửa nhóm' : 'Thêm nhóm'}</h1>
        {!c.id && (
          <div className="seg">
            {(['expense', 'income'] as const).map(t => (
              <button key={t} className={v.type === t ? 'on' : ''} onClick={() => setV({ ...v, type: t })}>
                {t === 'expense' ? 'Chi' : 'Thu'}
              </button>
            ))}
          </div>
        )}
        <label className="fld">
          <span>Tên nhóm</span>
          <input value={v.name} onChange={e => setV({ ...v, name: e.target.value })} autoFocus />
        </label>
        <label className="fld">
          <span>Biểu tượng (emoji)</span>
          <input value={v.icon} onChange={e => setV({ ...v, icon: e.target.value })} />
        </label>
        <label className="fld">
          <span>Gán mặc định vào Quỹ / Thẻ</span>
          <select value={v.fundId ?? ''} onChange={e => setV({ ...v, fundId: e.target.value ? Number(e.target.value) : null })}>
            <option value="">Không gán</option>
            {funds.map(f => (
              <option key={f.id} value={f.id}>
                {f.icon} {f.name}
              </option>
            ))}
          </select>
        </label>
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
