import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { startOfMonth } from 'date-fns'
import DateInput from '../components/DateInput'
import CategoryPickerModal from '../components/CategoryPickerModal'
import { showConfirm } from '../components/AppDialog'
import {
  db,
  getNextOccurrence,
  processRecurringTransactions,
  type Budget,
  type Category,
  type Fund,
  type RecFrequency,
  type RecurringTx,
  type Tx,
  type TxType,
} from '../db'
import {
  filterReportableTxs,
  fmtDmy,
  getCategoryFullName,
  money,
  monthKey,
  monthLabel,
  ymd,
} from '../lib'

const NO_CATS: Category[] = []
const NO_FUNDS: Fund[] = []
const NO_TXS: Tx[] = []
const NO_BUDGETS: Budget[] = []
const NO_RECS: RecurringTx[] = []

const FREQ_LABEL: Record<RecFrequency, string> = {
  monthly: 'Hàng tháng',
  weekly: 'Hàng tuần',
  daily: 'Hàng ngày',
  yearly: 'Hàng năm',
}

const BUDGET_QUICK_AMOUNTS = [500_000, 1_000_000, 2_000_000, 3_000_000, 5_000_000, 10_000_000]

function formatDigitsWithCommas(raw: string): string {
  const digits = raw.replace(/[^\d]/g, '').replace(/^0+(?=\d)/, '')
  if (!digits) return ''
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export default function Budgets() {
  const [tab, setTab] = useState<'recurring' | 'budget'>('recurring')
  const [curMonth] = useState(() => startOfMonth(new Date()))
  const [recEdit, setRecEdit] = useState<RecurringTx | 'new' | null>(null)
  const [budgetModalCatId, setBudgetModalCatId] = useState<number | 'new' | null>(null)

  const cats = useLiveQuery(() => db.categories.toArray(), [], NO_CATS)
  const funds = useLiveQuery(() => db.funds.toArray(), [], NO_FUNDS)
  const txs = useLiveQuery(() => db.txs.toArray(), [], NO_TXS)
  const budgets = useLiveQuery(() => db.budgets.toArray(), [], NO_BUDGETS)
  const recurrings = useLiveQuery(() => db.recurrings.toArray(), [], NO_RECS)

  const cMap = useMemo(() => new Map(cats.map(c => [c.id!, c])), [cats])
  const fMap = useMemo(() => new Map(funds.map(f => [f.id!, f])), [funds])
  const [todayDate] = useState(() => new Date())
  const todayStr = ymd(todayDate)

  const k = monthKey(curMonth)
  const reportableTxs = useMemo(() => filterReportableTxs(txs, funds, 0), [txs, funds])

  // Tính tổng đã chi trong tháng cho từng nhóm (nếu là nhóm cha thì cộng cả chi tiêu của các nhóm con)
  const monthExpenseByCat = useMemo(() => {
    const directMap = new Map<number, number>()
    reportableTxs
      .filter(t => t.type === 'expense' && t.date.startsWith(k))
      .forEach(t => {
        const cid = t.categoryId ?? 0
        directMap.set(cid, (directMap.get(cid) ?? 0) + t.amount)
      })

    const totalMap = new Map<number, number>()
    for (const c of cats) {
      if (!c.id) continue
      let sum = directMap.get(c.id) ?? 0
      // Cộng thêm các nhóm con trực thuộc nếu người dùng đặt ngân sách cho Nhóm cha
      for (const ch of cats) {
        if (ch.parentId === c.id && ch.id) {
          sum += directMap.get(ch.id) ?? 0
        }
      }
      totalMap.set(c.id, sum)
    }
    return totalMap
  }, [reportableTxs, k, cats])

  // Chỉ lấy các ngân sách đang hiệu lực trong tháng hiện tại (lặp lại hàng tháng hoặc đặt cho đúng tháng k)
  const activeBudgets = useMemo(
    () =>
      budgets.filter(
        b =>
          b.limit > 0 &&
          cMap.has(b.categoryId) &&
          (b.repeatNextMonth !== false || !b.month || b.month === k),
      ),
    [budgets, cMap, k],
  )

  const bMap = useMemo(() => new Map(activeBudgets.map(b => [b.categoryId, b])), [activeBudgets])

  const totalBudgetLimit = useMemo(
    () => activeBudgets.reduce((s, b) => s + b.limit, 0),
    [activeBudgets],
  )
  const totalBudgetSpent = useMemo(
    () => activeBudgets.reduce((s, b) => s + (monthExpenseByCat.get(b.categoryId) ?? 0), 0),
    [activeBudgets, monthExpenseByCat],
  )

  const totalFixedExpenseMonthly = recurrings
    .filter(r => r.active && r.type === 'expense')
    .reduce((s, r) => s + r.amount, 0)

  async function toggleRecActive(rec: RecurringTx) {
    if (!rec.id) return
    const nextState = !rec.active
    await db.recurrings.update(rec.id, { active: nextState })
    if (nextState) await processRecurringTransactions()
  }

  async function triggerNow(rec: RecurringTx) {
    await db.txs.add({
      type: rec.type,
      amount: rec.amount,
      date: todayStr,
      fundId: rec.fundId,
      toFundId: rec.type === 'transfer' ? (rec.toFundId ?? null) : null,
      categoryId: rec.type === 'transfer' ? null : (rec.categoryId ?? null),
      note: rec.note ? `${rec.note} (Định kỳ: ${rec.name})` : `[Định kỳ] ${rec.name}`,
      createdAt: Date.now(),
      recurringId: rec.id ?? null,
    })
    if (rec.id) {
      await db.recurrings.update(rec.id, { lastGeneratedDate: todayStr })
    }
  }

  return (
    <>
      <div className="tophead">
        <div>
          <h1 style={{ marginBottom: 2 }}>Ngân sách & Định kỳ</h1>
          <small className="mut">Tự động hóa hóa đơn cố định & kiểm soát hạn mức chi</small>
        </div>
      </div>

      <div className="seg" style={{ marginTop: 12 }}>
        <button className={tab === 'recurring' ? 'on' : ''} onClick={() => setTab('recurring')}>
          🔁 Giao dịch định kỳ ({recurrings.length})
        </button>
        <button className={tab === 'budget' ? 'on' : ''} onClick={() => setTab('budget')}>
          🎯 Ngân sách tháng ({activeBudgets.length})
        </button>
      </div>

      {tab === 'recurring' && (
        <>
          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <div>
              <div className="mut" style={{ fontSize: 12 }}>
                Tổng chi cố định cài đặt (đang bật)
              </div>
              <div className="exp" style={{ fontSize: 22, fontWeight: 700 }}>
                {money(totalFixedExpenseMonthly)}
              </div>
              <small className="mut">Hệ thống tự động ghi sổ khi đến ngày định kỳ</small>
            </div>
            <button
              className="btn pri"
              style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
              onClick={() => setRecEdit('new')}
            >
              + Cài đặt mới
            </button>
          </div>

          <div className="card" style={{ padding: '0 14px' }}>
            {recurrings.length === 0 && (
              <div className="empty">
                Chưa có giao dịch định kỳ nào.
                <br />
                <small>Hãy thêm tiền nhà, điện, nước, internet, phí dịch vụ hoặc lương cố định để tự động ghi nhận.</small>
              </div>
            )}
            {recurrings.map(rec => {
              const cat = cMap.get(rec.categoryId ?? -1)
              const fund = fMap.get(rec.fundId)
              const nextDate = getNextOccurrence(rec, todayStr)
              return (
                <div className="row" key={rec.id} style={{ opacity: rec.active ? 1 : 0.55 }}>
                  <div
                    className="ico"
                    style={{ background: (cat?.color ?? '#10b981') + '22', cursor: 'pointer' }}
                    onClick={() => setRecEdit(rec)}
                  >
                    {rec.type === 'transfer' ? '🔁' : (cat?.icon ?? '🧾')}
                  </div>
                  <div className="grow" onClick={() => setRecEdit(rec)} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <b>{rec.name}</b>
                      <span className="pill-tag" style={{ whiteSpace: 'nowrap' }}>
                        {FREQ_LABEL[rec.frequency]}
                        {rec.frequency === 'monthly' && rec.dayOfMonth ? ` · ngày ${rec.dayOfMonth}` : ''}
                      </span>
                    </div>
                    <small style={{ whiteSpace: 'normal', lineHeight: 1.35 }}>
                      Quỹ: {fund?.name ?? '—'}
                      {fund?.archived ? ' (❄️ Ví đang lưu trữ/đóng băng)' : ''}
                      {rec.type === 'transfer' ? ` → ${fMap.get(rec.toFundId ?? -1)?.name ?? '—'}` : ''} · Kỳ tới:{' '}
                      <b>{fmtDmy(nextDate)}</b>
                      {rec.lastGeneratedDate ? ` (Đã chạy: ${fmtDmy(rec.lastGeneratedDate)})` : ''}
                    </small>
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <b className={rec.type === 'income' ? 'inc' : rec.type === 'expense' ? 'exp' : ''}>
                      {rec.type === 'income' ? '+' : rec.type === 'expense' ? '-' : ''}
                      {money(rec.amount)}
                    </b>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        className="btn"
                        style={{ padding: '3px 8px', fontSize: 11 }}
                        title="Phát sinh giao dịch ngay hôm nay"
                        onClick={() => triggerNow(rec)}
                      >
                        Chi ngay
                      </button>
                      <button
                        className="btn"
                        style={{ padding: '3px 8px', fontSize: 11 }}
                        onClick={() => toggleRecActive(rec)}
                      >
                        {rec.active ? 'Đang bật' : 'Tạm dừng'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {tab === 'budget' && (
        <>
          {/* Thẻ Tổng ngân sách tháng & Nút chính + Đặt ngân sách */}
          <div
            className="card"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <div>
              <div className="mut" style={{ fontSize: 12 }}>
                Tổng ngân sách đã đặt · {monthLabel(curMonth)}
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>
                {money(totalBudgetLimit)}
              </div>
              <small className="mut">
                Đã chi trong {activeBudgets.length} nhóm có ngân sách:{' '}
                <b className={totalBudgetSpent > totalBudgetLimit && totalBudgetLimit > 0 ? 'exp' : ''}>
                  {money(totalBudgetSpent)}
                </b>
              </small>
            </div>
            <button
              type="button"
              className="btn pri"
              style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
              onClick={() => setBudgetModalCatId('new')}
            >
              + Đặt ngân sách
            </button>
          </div>

          {/* Chỉ hiển thị các nhóm ĐANG ĐƯỢC ĐẶT NGÂN SÁCH */}
          <div className="card" style={{ padding: '0 14px' }}>
            {activeBudgets.length === 0 ? (
              <div className="empty" style={{ padding: '26px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🎯</div>
                <b style={{ color: 'var(--fg)', fontSize: 15 }}>
                  Chưa có nhóm nào được đặt ngân sách tháng
                </b>
                <p className="mut" style={{ fontSize: 13, marginTop: 6, lineHeight: 1.45 }}>
                  Bấm nút <b>"+ Đặt ngân sách"</b> phía trên để chọn nhóm chi tiêu muốn giới hạn và
                  bật tự động lặp lại cho tháng tiếp theo.
                </p>
              </div>
            ) : (
              activeBudgets.map(b => {
                const c = cMap.get(b.categoryId)
                if (!c) return null
                const spent = monthExpenseByCat.get(c.id!) ?? 0
                const lim = b.limit
                const pct = lim > 0 ? Math.min(100, Math.round((spent / lim) * 100)) : 0
                const over = lim > 0 && spent > lim
                const isRepeat = b.repeatNextMonth !== false

                return (
                  <div
                    className="row"
                    key={b.id ?? c.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setBudgetModalCatId(c.id!)}
                  >
                    <div className="ico" style={{ background: c.color + '22' }}>
                      {c.icon}
                    </div>
                    <div className="grow" style={{ minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                          <b
                            style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {getCategoryFullName(c, cats)}
                          </b>
                          <span
                            className="pill-tag"
                            style={{
                              fontSize: 10.5,
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                              color: isRepeat ? 'var(--acc)' : 'var(--mut)',
                            }}
                          >
                            {isRepeat ? '🔁 Lặp lại tháng sau' : `📅 Tháng ${monthLabel(curMonth)}`}
                          </span>
                        </div>
                        <span
                          className={over ? 'exp' : 'mut'}
                          style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}
                        >
                          {money(spent)} / {money(lim)}
                        </span>
                      </div>

                      <small className={over ? 'exp' : 'mut'} style={{ display: 'block', marginTop: 3 }}>
                        {over
                          ? `⚠️ Vượt ngân sách ${money(spent - lim)} (${Math.round((spent / lim) * 100)}%)`
                          : `Còn lại ${money(lim - spent)} (${pct}%)`}
                      </small>
                      <div className="bar">
                        <i
                          className={over ? 'over' : ''}
                          style={{ width: pct + '%', background: over ? undefined : c.color }}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn"
                      style={{ padding: '6px 10px', fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0 }}
                      onClick={e => {
                        e.stopPropagation()
                        setBudgetModalCatId(c.id!)
                      }}
                    >
                      Sửa mức
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </>
      )}

      {recEdit && (
        <RecurringForm
          rec={recEdit === 'new' ? undefined : recEdit}
          funds={funds}
          cats={cats}
          onClose={() => setRecEdit(null)}
        />
      )}

      {budgetModalCatId !== null && (
        <BudgetFormModal
          initialCategoryId={budgetModalCatId === 'new' ? undefined : budgetModalCatId}
          cats={cats}
          bMap={bMap}
          monthExpenseByCat={monthExpenseByCat}
          curMonthKey={k}
          curMonthLabel={monthLabel(curMonth)}
          onClose={() => setBudgetModalCatId(null)}
        />
      )}
    </>
  )
}

function BudgetFormModal({
  initialCategoryId,
  cats,
  bMap,
  monthExpenseByCat,
  curMonthKey,
  curMonthLabel,
  onClose,
}: {
  initialCategoryId?: number
  cats: Category[]
  bMap: Map<number, Budget>
  monthExpenseByCat: Map<number, number>
  curMonthKey: string
  curMonthLabel: string
  onClose: () => void
}) {
  const expenseCats = useMemo(() => cats.filter(c => c.type === 'expense'), [cats])
  const defaultCat = useMemo(() => {
    if (initialCategoryId) return expenseCats.find(c => c.id === initialCategoryId)
    // Ưu tiên gợi ý nhóm chưa đặt ngân sách khi bấm "+ Đặt ngân sách"
    return expenseCats.find(c => c.id && !bMap.has(c.id)) ?? expenseCats[0]
  }, [initialCategoryId, expenseCats, bMap])

  const [categoryId, setCategoryId] = useState<number | ''>(defaultCat?.id ?? '')
  const existingBudget = typeof categoryId === 'number' ? bMap.get(categoryId) : undefined

  const [limitStr, setLimitStr] = useState<string>(() =>
    existingBudget?.limit ? formatDigitsWithCommas(String(existingBudget.limit)) : '',
  )
  const [repeatNextMonth, setRepeatNextMonth] = useState<boolean>(
    existingBudget ? existingBudget.repeatNextMonth !== false : true,
  )
  const [showCatPicker, setShowCatPicker] = useState(false)
  const [err, setErr] = useState('')

  const selCat = expenseCats.find(c => c.id === categoryId) ?? defaultCat
  const currentSpent = selCat?.id ? (monthExpenseByCat.get(selCat.id) ?? 0) : 0

  function handleSelectCategory(cat: Category) {
    if (!cat.id) return
    setCategoryId(cat.id)
    const ex = bMap.get(cat.id)
    if (ex) {
      setLimitStr(formatDigitsWithCommas(String(ex.limit)))
      setRepeatNextMonth(ex.repeatNextMonth !== false)
    }
  }

  async function handleSave() {
    if (!selCat?.id) {
      setErr('Vui lòng chọn nhóm giao dịch')
      return
    }
    const n = Number(limitStr.replace(/[^\d]/g, ''))
    if (!n || n <= 0) {
      setErr('Vui lòng nhập hạn mức ngân sách lớn hơn 0 ₫')
      return
    }
    const existing = await db.budgets.where('categoryId').equals(selCat.id).first()
    const payload: Budget = {
      ...(existing?.id ? { id: existing.id } : {}),
      categoryId: selCat.id,
      limit: n,
      repeatNextMonth,
      month: curMonthKey,
    }
    if (existing?.id) await db.budgets.put(payload)
    else await db.budgets.add(payload)
    onClose()
  }

  async function handleDelete() {
    if (!selCat?.id) return
    const existing = await db.budgets.where('categoryId').equals(selCat.id).first()
    if (!existing?.id) return
    const ok = await showConfirm({
      title: `Xoá ngân sách "${selCat.name}"?`,
      message: 'Nhóm này sẽ được gỡ khỏi danh sách theo dõi ngân sách tháng.',
      icon: selCat.icon,
      danger: true,
      confirmText: 'Xoá ngân sách',
    })
    if (!ok) return
    await db.budgets.delete(existing.id)
    onClose()
  }

  return (
    <div className="sheetbg" onClick={onClose} style={{ zIndex: 90 }}>
      <div
        className="sheet"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 480,
          margin: '0 auto',
          padding: '16px 16px calc(24px + env(safe-area-inset-bottom))',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 8,
            marginBottom: 14,
          }}
        >
          <button
            type="button"
            className="close-pill-btn"
            style={{ whiteSpace: 'nowrap' }}
            onClick={onClose}
          >
            Huỷ
          </button>
          <b style={{ fontSize: 16, whiteSpace: 'nowrap' }}>
            {existingBudget ? 'Chỉnh sửa ngân sách' : 'Đặt ngân sách tháng'}
          </b>
          <button
            type="button"
            className="close-pill-btn"
            style={{ color: 'var(--acc)', fontWeight: 700, whiteSpace: 'nowrap' }}
            onClick={handleSave}
          >
            Lưu
          </button>
        </div>

        {/* 1. Chọn nhóm giao dịch muốn đặt ngân sách */}
        <div className="fld">
          <span>Chọn nhóm chi tiêu muốn đặt ngân sách</span>
          <div
            className="ml-select-tile"
            onClick={() => setShowCatPicker(true)}
            role="button"
            tabIndex={0}
          >
            <div
              className="ico round"
              style={{
                background: (selCat?.color || 'var(--acc)') + '25',
                color: selCat?.color || 'var(--acc)',
                width: 38,
                height: 38,
                fontSize: 18,
              }}
            >
              {selCat?.icon || '🏷️'}
            </div>
            <div className="grow" style={{ marginLeft: 8, minWidth: 0 }}>
              <b style={{ fontSize: 15, display: 'block' }}>
                {selCat ? getCategoryFullName(selCat, cats) : 'Chọn nhóm chi tiêu'}
              </b>
              <small className="mut">
                Đã chi trong tháng {curMonthLabel}: <b>{money(currentSpent)}</b>
              </small>
            </div>
            <span className="mut" style={{ fontSize: 18 }}>
              ›
            </span>
          </div>
        </div>

        {/* 2. Nhập số tiền hạn mức */}
        <div className="fld">
          <span>Hạn mức ngân sách tối đa (₫)</span>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type="text"
              inputMode="numeric"
              autoFocus
              value={limitStr}
              placeholder="Ví dụ: 3,000,000"
              onChange={e => {
                setErr('')
                setLimitStr(formatDigitsWithCommas(e.target.value))
              }}
              style={{
                width: '100%',
                fontSize: 20,
                fontWeight: 700,
                paddingRight: 36,
              }}
            />
            <span
              style={{
                position: 'absolute',
                right: 14,
                fontWeight: 700,
                color: 'var(--mut)',
                pointerEvents: 'none',
              }}
            >
              ₫
            </span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {BUDGET_QUICK_AMOUNTS.map(amt => {
              const formatted = formatDigitsWithCommas(String(amt))
              const isSelected = limitStr === formatted
              return (
                <button
                  key={amt}
                  type="button"
                  className="pill-tag"
                  onClick={() => {
                    setErr('')
                    setLimitStr(formatted)
                  }}
                  style={{
                    cursor: 'pointer',
                    padding: '6px 10px',
                    fontSize: 12,
                    border: isSelected ? '1px solid var(--acc)' : '1px solid var(--bd)',
                    color: isSelected ? 'var(--acc)' : 'var(--fg)',
                    background: isSelected
                      ? 'color-mix(in srgb, var(--acc) 14%, transparent)'
                      : 'var(--card)',
                  }}
                >
                  {formatted} ₫
                </button>
              )
            })}
          </div>
        </div>

        {/* 3. Tuỳ chọn lặp lại cho tháng tiếp theo */}
        <div
          className="card"
          style={{
            background: 'color-mix(in srgb, var(--fg) 4%, transparent)',
            padding: '12px 14px',
            marginTop: 6,
            marginBottom: 12,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>
                🔁 Lặp lại cho tháng tiếp theo
              </div>
              <small className="mut" style={{ display: 'block', marginTop: 2 }}>
                {repeatNextMonth
                  ? 'Tự động áp dụng hạn mức này cho các tháng kế tiếp'
                  : `Chỉ áp dụng trong tháng ${curMonthLabel}, không lặp lại tháng sau`}
              </small>
            </div>
            <button
              type="button"
              className={`ios-switch ${repeatNextMonth ? 'on' : ''}`}
              onClick={() => setRepeatNextMonth(v => !v)}
              aria-label="Lặp lại cho tháng tiếp theo"
            />
          </div>
        </div>

        {err && <p className="exp" style={{ marginBottom: 10, fontSize: 13 }}>{err}</p>}

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {existingBudget && (
            <button type="button" className="btn dng" onClick={handleDelete}>
              Xoá ngân sách
            </button>
          )}
          <button
            type="button"
            className="btn pri"
            style={{ flex: 1, padding: '12px 16px', fontSize: 15 }}
            onClick={handleSave}
          >
            Lưu ngân sách
          </button>
        </div>

        {showCatPicker && (
          <CategoryPickerModal
            type="expense"
            selectedId={selCat?.id ?? ''}
            categories={expenseCats}
            onSelect={handleSelectCategory}
            onClose={() => setShowCatPicker(false)}
          />
        )}
      </div>
    </div>
  )
}

function RecurringForm({
  rec,
  funds,
  cats,
  onClose,
}: {
  rec?: RecurringTx
  funds: Fund[]
  cats: Category[]
  onClose: () => void
}) {
  const [todayDate] = useState(() => new Date())
  const [name, setName] = useState(rec?.name ?? '')
  const [type, setType] = useState<TxType>(rec?.type ?? 'expense')
  const [amount, setAmount] = useState(rec ? String(rec.amount) : '')
  const [frequency, setFrequency] = useState<RecFrequency>(rec?.frequency ?? 'monthly')
  const [dayOfMonth, setDayOfMonth] = useState<string>(String(rec?.dayOfMonth ?? todayDate.getDate()))
  const [startDate, setStartDate] = useState(rec?.startDate ?? ymd(todayDate))
  const [fundId, setFundId] = useState<number | ''>(rec?.fundId ?? funds[0]?.id ?? '')
  const [toFundId, setToFundId] = useState<number | ''>(rec?.toFundId ?? '')
  const [categoryId, setCategoryId] = useState<number | ''>(rec?.categoryId ?? '')
  const [showCatPicker, setShowCatPicker] = useState(false)
  const [note, setNote] = useState(rec?.note ?? '')
  const [err, setErr] = useState('')

  const list = cats.filter(c => c.type === type)
  const selCat = type === 'transfer' ? undefined : (cats.find(c => c.id === categoryId) ?? list[0])
  const fid = fundId === '' ? (selCat?.fundId ?? funds[0]?.id) : fundId

  async function save() {
    const amt = Number(amount.replace(/[^\d.]/g, ''))
    if (!name.trim()) return setErr('Nhập tên hóa đơn / giao dịch định kỳ')
    if (!amt || amt <= 0) return setErr('Nhập số tiền cố định hợp lệ')
    if (fid == null) return setErr('Chưa chọn quỹ')
    if (type === 'transfer' && (!toFundId || toFundId === fid)) return setErr('Chọn quỹ nhận khác quỹ nguồn')

    const data: RecurringTx = {
      name: name.trim(),
      type,
      amount: amt,
      fundId: fid,
      toFundId: type === 'transfer' ? Number(toFundId) : null,
      categoryId: type === 'transfer' ? null : (selCat?.id ?? null),
      note: note.trim(),
      frequency,
      dayOfMonth: frequency === 'monthly' ? Math.min(31, Math.max(1, Number(dayOfMonth) || todayDate.getDate())) : undefined,
      startDate,
      lastGeneratedDate: rec?.lastGeneratedDate ?? null,
      active: rec?.active ?? true,
    }
    if (rec?.id) await db.recurrings.put({ ...data, id: rec.id })
    else await db.recurrings.add(data)
    await processRecurringTransactions()
    onClose()
  }

  async function del() {
    if (!rec?.id) return
    const ok = await showConfirm({
      title: 'Xoá cài đặt định kỳ',
      message: `Bạn có chắc muốn xoá cài đặt định kỳ "${rec.name}" không?`,
      danger: true,
      confirmText: 'Xoá định kỳ',
    })
    if (ok) {
      await db.recurrings.delete(rec.id)
      onClose()
    }
  }

  return (
    <div className="sheetbg" onClick={onClose} style={{ zIndex: 90 }}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <h1>{rec ? 'Sửa giao dịch định kỳ' : 'Cài đặt giao dịch định kỳ'}</h1>
        <div className="seg">
          {(['expense', 'income', 'transfer'] as TxType[]).map(t => (
            <button
              key={t}
              className={type === t ? 'on' : ''}
              onClick={() => {
                setType(t)
                setCategoryId('')
              }}
            >
              {t === 'expense' ? 'Chi cố định' : t === 'income' ? 'Thu cố định' : 'Chuyển quỹ'}
            </button>
          ))}
        </div>
        <label className="fld">
          <span>Tên hóa đơn / Khoản định kỳ</span>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="VD: Tiền nhà, Điện, Internet FPT, Netflix..."
          />
        </label>
        <label className="fld">
          <span>Số tiền cố định (₫)</span>
          <input inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" />
        </label>
        {type !== 'transfer' && (
          <div className="fld">
            <span>Nhóm giao dịch</span>
            <div
              className="ml-select-tile"
              onClick={() => setShowCatPicker(true)}
              role="button"
              tabIndex={0}
            >
              <div
                className="ico round"
                style={{
                  background: (selCat?.color || 'var(--acc)') + '25',
                  color: selCat?.color || 'var(--acc)',
                  width: 36,
                  height: 36,
                  fontSize: 18,
                }}
              >
                {selCat?.icon || '🏷️'}
              </div>
              <div className="grow" style={{ marginLeft: 8 }}>
                <b style={{ fontSize: 15, display: 'block' }}>{selCat?.name || 'Chọn nhóm'}</b>
              </div>
              <span className="mut" style={{ fontSize: 18 }}>
                ›
              </span>
            </div>
          </div>
        )}
        <label className="fld">
          <span>{type === 'transfer' ? 'Từ quỹ' : 'Trích từ Quỹ / Thẻ'}</span>
          <select value={fid ?? ''} onChange={e => setFundId(Number(e.target.value))}>
            {funds.map(f => (
              <option key={f.id} value={f.id}>
                {f.icon} {f.name} {f.kind === 'credit' ? '(Tín dụng)' : ''}
              </option>
            ))}
          </select>
        </label>
        {type === 'transfer' && (
          <label className="fld">
            <span>Đến quỹ</span>
            <select value={toFundId} onChange={e => setToFundId(Number(e.target.value))}>
              <option value="">— chọn —</option>
              {funds
                .filter(f => f.id !== fid)
                .map(f => (
                  <option key={f.id} value={f.id}>
                    {f.icon} {f.name}
                  </option>
                ))}
            </select>
          </label>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <label className="fld">
            <span>Tần suất lặp</span>
            <select value={frequency} onChange={e => setFrequency(e.target.value as RecFrequency)}>
              <option value="monthly">Hàng tháng</option>
              <option value="weekly">Hàng tuần</option>
              <option value="daily">Hàng ngày</option>
              <option value="yearly">Hàng năm</option>
            </select>
          </label>
          {frequency === 'monthly' ? (
            <label className="fld">
              <span>Ngày tự động chi (1-31)</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={dayOfMonth}
                onChange={e => setDayOfMonth(e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 2))}
                onBlur={() => {
                  const n = Number(dayOfMonth)
                  setDayOfMonth(String(!n ? todayDate.getDate() : Math.min(31, n)))
                }}
              />
            </label>
          ) : (
            <div />
          )}
        </div>
        <div className="fld">
          <span>Bắt đầu áp dụng từ ngày</span>
          <DateInput value={startDate} onChange={setStartDate} />
        </div>
        <label className="fld">
          <span>Ghi chú thêm</span>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Ghi chú tự động đính kèm..." />
        </label>
        {err && <p className="exp" style={{ marginBottom: 10 }}>{err}</p>}
        <div style={{ display: 'flex', gap: 8 }}>
          {rec && (
            <button className="btn dng" onClick={del}>
              Xoá
            </button>
          )}
          <button className="btn" style={{ flex: 1 }} onClick={onClose}>
            Huỷ
          </button>
          <button className="btn pri" style={{ flex: 2 }} onClick={save}>
            Lưu cài đặt
          </button>
        </div>

        {showCatPicker && (
          <CategoryPickerModal
            type={type}
            selectedId={selCat?.id ?? ''}
            categories={cats}
            onSelect={cat => {
              if (cat.type !== type) setType(cat.type)
              setCategoryId(cat.id!)
              if (!rec && cat.fundId) setFundId(cat.fundId)
            }}
            onClose={() => setShowCatPicker(false)}
          />
        )}
      </div>
    </div>
  )
}
