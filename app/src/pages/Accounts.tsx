import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Category, type Fund, type Tx } from '../db'
import { analyzeCreditFund, effectOn, fmtDmy, groupCategoriesHierarchy, money } from '../lib'
import { FundForm } from '../components/accounts/FundForm'
import { AdjustBalanceModal } from '../components/accounts/AdjustBalanceModal'
import { TransferWalletModal } from '../components/accounts/TransferWalletModal'
import { CatForm } from '../components/accounts/CatForm'
import CatDetailModal from '../components/CatDetailModal'
import CreditCardDetailModal from '../components/CreditCardDetailModal'
import { COLORS } from '../components/accounts/palette'
import { showAlert, showConfirm } from '../components/AppDialog'


const NO_FUNDS: Fund[] = []
const NO_CATS: Category[] = []
const NO_TXS: Tx[] = []

export default function Accounts() {
  const nav = useNavigate()
  const funds = useLiveQuery(() => db.funds.toArray(), [], NO_FUNDS)
  const cats = useLiveQuery(() => db.categories.toArray(), [], NO_CATS)
  const txs = useLiveQuery(() => db.txs.toArray(), [], NO_TXS)

  const [fundEdit, setFundEdit] = useState<Fund | null>(null)
  const [viewingCreditFundId, setViewingCreditFundId] = useState<number | null>(null)
  const [catDetail, setCatDetail] = useState<Category | null>(null)
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
    if (used) {
      await showAlert({
        title: 'Không thể xoá nhóm',
        message: `Nhóm "${c.name}" đang có ${used} giao dịch, không thể xoá.`,
        icon: c.icon,
        tone: 'warning',
      })
      return
    }
    const ok = await showConfirm({
      title: `Xoá nhóm "${c.name}"?`,
      message:
        'Các nhóm con (nếu có) sẽ trở thành nhóm độc lập, không bị mất dữ liệu.',
      icon: c.icon,
      danger: true,
      confirmText: 'Xoá nhóm',
    })
    if (ok) {
      if (c.id) {
        await db.categories.where('parentId').equals(c.id).modify({ parentId: null })
      }
      await db.budgets.where('categoryId').equals(c.id!).delete()
      await db.categories.delete(c.id!)
    }
  }

  async function delFund(f: Fund) {
    const used = txs.filter(t => t.fundId === f.id || t.toFundId === f.id).length
    if (used) {
      await showAlert({
        title: 'Không thể xoá ví',
        message: `Quỹ "${f.name}" đang có ${used} giao dịch. Hãy dùng tính năng "Lưu trữ" hoặc xoá giao dịch trước.`,
        icon: f.icon,
        tone: 'warning',
      })
      return
    }
    const ok = await showConfirm({
      title: `Xoá quỹ "${f.name}"?`,
      message: 'Bạn có chắc chắn muốn xoá quỹ này khỏi hệ thống không?',
      icon: f.icon,
      danger: true,
      confirmText: 'Xoá quỹ',
    })
    if (ok) {
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

      {/* 4. QUỸ TÍN DỤNG (TINH GỌN CÀI ĐẶT & THÊM THẺ) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '22px 0 8px' }}>
        <h2 style={{ margin: 0 }}>💳 Quỹ tín dụng</h2>
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

      <div className="card" style={{ padding: '0 16px' }}>
        {creditFunds.length === 0 && (
          <div className="empty" style={{ padding: '16px 0', fontSize: 13 }}>
            Chưa có thẻ tín dụng nào. Bấm "+ Thêm thẻ tín dụng" để thiết lập hạn mức và ngày chốt sao kê.
          </div>
        )}
        {creditFunds.map(f => {
          const info = analyzeCreditFund(f, txs)
          return (
            <div
              className="row"
              key={f.id}
              onClick={() => setViewingCreditFundId(f.id!)}
              style={{ cursor: 'pointer', alignItems: 'center' }}
            >
              <div className="ico round" style={{ background: f.color + '28' }}>
                {f.icon}
              </div>
              <div className="grow" style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <b style={{ fontSize: 16 }}>{f.name}</b>
                  {info.activeInstallmentsCount > 0 && (
                    <span className="pill-tag" style={{ fontSize: 10.5, color: 'var(--acc)' }}>
                      📅 {info.activeInstallmentsCount} trả góp
                    </span>
                  )}
                </div>
                <small className="mut" style={{ display: 'block', marginTop: 2 }}>
                  Sao kê ngày {info.statementDay} · Hạn TT ngày {info.dueDay} · Hạn mức{' '}
                  {money(info.creditLimit)}
                </small>
                <div style={{ fontSize: 14, marginTop: 3 }} className={info.debt > 0 ? 'exp' : 'mut'}>
                  Dư nợ: <b>{info.debt > 0 ? `-${money(info.debt)}` : '0 ₫'}</b> (Kỳ mới:{' '}
                  {money(info.currentCycleSpend)} · TT {fmtDmy(info.nextCycleDueDate)})
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button
                  type="button"
                  className="btn"
                  style={{ padding: '5px 9px', fontSize: 12 }}
                  onClick={e => {
                    e.stopPropagation()
                    setViewingCreditFundId(f.id!)
                  }}
                >
                  Chi tiết
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{ padding: '5px 9px', fontSize: 12 }}
                  onClick={e => {
                    e.stopPropagation()
                    setFundEdit(f)
                  }}
                >
                  Cài đặt
                </button>
              </div>
            </div>
          )
        })}
      </div>

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
      {(['expense', 'income'] as const).map(type => {
        const { parentGroups, independent } = groupCategoriesHierarchy(cats.filter(c => c.type === type))
        return (
          <div key={type} style={{ marginBottom: 16 }}>
            <div className="mut" style={{ fontSize: 13, margin: '8px 4px', fontWeight: 600 }}>
              {type === 'expense' ? 'Nhóm chi tiêu' : 'Nhóm thu nhập'}
            </div>

            {/* Các Nhóm cha có chứa nhóm con */}
            {parentGroups.map(grp => (
              <div
                key={grp.parent.id}
                className="card"
                style={{ padding: '4px 14px 10px', marginBottom: 10, border: '1px solid var(--bd)' }}
              >
                {/* Hàng Nhóm Cha */}
                <div
                  className="row"
                  onClick={() => setCatDetail(grp.parent)}
                  style={{ cursor: 'pointer', paddingBottom: 6 }}
                >
                  <div className="ico" style={{ background: grp.parent.color + '25', fontWeight: 700 }}>
                    {grp.parent.icon}
                  </div>
                  <div className="grow">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <b style={{ fontSize: 16 }}>{grp.parent.name}</b>
                      <span className="pill-tag" style={{ fontSize: 11, background: 'var(--acc)', color: '#fff' }}>
                        {grp.children.length} nhóm con
                      </span>
                    </div>
                    <small className="mut">
                      {grp.parent.fundId
                        ? 'Quỹ mặc định: ' + funds.find(f => f.id === grp.parent.fundId)?.name
                        : 'Nhóm cha đại diện'}
                    </small>
                  </div>
                  <span className="mut" style={{ fontSize: 18 }}>›</span>
                </div>

                {/* Danh sách các Nhóm Con thuộc Nhóm Cha */}
                <div style={{ marginLeft: 20, paddingLeft: 12, borderLeft: '2px solid color-mix(in srgb, var(--acc) 40%, var(--bd))' }}>
                  {grp.children.map(ch => (
                    <div
                      className="row"
                      key={ch.id}
                      onClick={() => setCatDetail(ch)}
                      style={{ cursor: 'pointer', padding: '8px 0', borderBottom: '1px dashed var(--bd)' }}
                    >
                      <div className="ico" style={{ background: ch.color + '20', width: 34, height: 34, fontSize: 16 }}>
                        {ch.icon}
                      </div>
                      <div className="grow">
                        <div style={{ fontWeight: 600, fontSize: 14.5 }}>{ch.name}</div>
                        <small className="mut">
                          ↳ Nhóm con của <b>{grp.parent.name}</b>{' '}
                          {ch.fundId ? '· Quỹ: ' + funds.find(f => f.id === ch.fundId)?.name : ''}
                        </small>
                      </div>
                      <span className="mut" style={{ fontSize: 16 }}>›</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Các Nhóm Độc Lập (chưa gán vào nhóm cha nào) */}
            {independent.length > 0 && (
              <div className="card" style={{ padding: '0 14px' }}>
                {parentGroups.length > 0 && (
                  <div
                    className="mut"
                    style={{ fontSize: 12, fontWeight: 700, padding: '10px 0 4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}
                  >
                    Nhóm độc lập / Chưa phân loại
                  </div>
                )}
                {independent.map(c => (
                  <div className="row" key={c.id} onClick={() => setCatDetail(c)} style={{ cursor: 'pointer' }}>
                    <div className="ico" style={{ background: c.color + '22' }}>
                      {c.icon}
                    </div>
                    <div className="grow">
                      <b>{c.name}</b>
                      <small>
                        {c.fundId ? 'Quỹ mặc định: ' + funds.find(f => f.id === c.fundId)?.name : 'Không gán quỹ'}
                      </small>
                    </div>
                    <span className="mut" style={{ fontSize: 18 }}>›</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {viewingCreditFundId != null && funds.find(f => f.id === viewingCreditFundId) && (
        <CreditCardDetailModal
          fund={funds.find(f => f.id === viewingCreditFundId)!}
          txs={txs}
          cats={cats}
          onClose={() => setViewingCreditFundId(null)}
          onEditFund={f => {
            setViewingCreditFundId(null)
            setFundEdit(f)
          }}
          onPayCard={(f, amount, note) => {
            const defaultSourceFund = cashFunds[0]?.id ?? funds[0]?.id ?? 1
            setViewingCreditFundId(null)
            setTransferModal({
              fromFundId: defaultSourceFund,
              toFundId: f.id,
              amount,
              note,
            })
          }}
        />
      )}

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
      {catDetail && (
        <CatDetailModal
          c={catDetail}
          allCats={cats}
          funds={funds}
          txs={txs}
          onEdit={c => {
            setCatDetail(null)
            setCatEdit(c)
          }}
          onDel={c => {
            setCatDetail(null)
            delCat(c)
          }}
          onClose={() => setCatDetail(null)}
        />
      )}
      {catEdit && (
        <CatForm
          c={catEdit}
          funds={funds}
          allCats={cats}
          onDel={delCat}
          onClose={() => setCatEdit(null)}
        />
      )}
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
