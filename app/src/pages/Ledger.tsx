import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { addMonths, endOfMonth, format, parseISO, startOfMonth } from 'date-fns'
import { vi } from 'date-fns/locale'
import { db, type Category, type Fund, type Tx } from '../db'
import {
  effectOn,
  getIncludedFunds,
  money,
  moneySigned,
  monthKey,
  monthLabel,
  resolveTimeRange,
  type TimeFilter,
  ymd,
} from '../lib'
import TxForm, { type TxFormDraft } from '../components/TxForm'
import TxDetailModal from '../components/TxDetailModal'
import PeriodReport from '../components/PeriodReport'
import { WalletSelectorPill } from '../components/WalletPickerModal'
import TimeRangeModal from '../components/TimeRangeModal'

const NO_TXS: Tx[] = []
const NO_FUNDS: Fund[] = []
const NO_CATS: Category[] = []

export default function Ledger() {
  const [nowMonth] = useState(() => startOfMonth(new Date()))
  const [cur, setCur] = useState(nowMonth)
  const [timeFilter, setTimeFilter] = useState<TimeFilter>(() => ({
    mode: 'month',
    month: nowMonth,
    startDate: ymd(nowMonth),
    endDate: ymd(endOfMonth(nowMonth)),
  }))
  const [showTimeModal, setShowTimeModal] = useState(false)
  const [q, setQ] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [fundFilter, setFundFilter] = useState(0) // 0 = Tổng cộng
  const [viewingTx, setViewingTx] = useState<Tx | null>(null)
  const [edit, setEdit] = useState<Tx | null>(null)
  const [draftTx, setDraftTx] = useState<TxFormDraft | null>(null)
  const [showReport, setShowReport] = useState(false)

  const allTxs = useLiveQuery(() => db.txs.toArray(), [], NO_TXS)
  const funds = useLiveQuery(() => db.funds.toArray(), [], NO_FUNDS)
  const cats = useLiveQuery(() => db.categories.toArray(), [], NO_CATS)

  const fMap = useMemo(() => new Map(funds.map(f => [f.id!, f])), [funds])
  const cMap = useMemo(() => new Map(cats.map(c => [c.id!, c])), [cats])

  const resolvedRange = useMemo(() => resolveTimeRange(timeFilter), [timeFilter])
  const from = resolvedRange.from
  const to = resolvedRange.to

  function selectMonth(nextM: Date) {
    setCur(nextM)
    setTimeFilter({
      mode: 'month',
      month: nextM,
      startDate: ymd(startOfMonth(nextM)),
      endDate: ymd(endOfMonth(nextM)),
    })
  }

  const activeFunds = useMemo(() => getIncludedFunds(funds, fundFilter), [funds, fundFilter])
  const activeFundIds = useMemo(() => new Set(activeFunds.map(f => f.id!)), [activeFunds])

  const effectOnSelection = (t: Tx) => activeFunds.reduce((s, f) => s + effectOn(t, f.id!), 0)

  // Số dư hiện tại (tất cả thời gian) của phạm vi ví đang chọn
  const currentTotalBalance = useMemo(() => {
    const init = activeFunds.reduce((s, f) => s + f.initialBalance, 0)
    return init + allTxs.reduce((s, t) => s + effectOnSelection(t), 0)
  }, [activeFunds, allTxs])

  // Số dư đầu kỳ & Số dư cuối kỳ giống hệt MoneyLover
  const { openingBalance, closingBalance, netChange } = useMemo(() => {
    const init = activeFunds.reduce((s, f) => s + f.initialBalance, 0)
    const beforePeriod = allTxs.filter(t => t.date < from).reduce((s, t) => s + effectOnSelection(t), 0)
    const inPeriod = allTxs
      .filter(t => t.date >= from && t.date <= to)
      .reduce((s, t) => s + effectOnSelection(t), 0)
    const open = init + beforePeriod
    const close = open + inPeriod
    return { openingBalance: open, closingBalance: close, netChange: inPeriod }
  }, [activeFunds, allTxs, from, to])

  const shown = useMemo(() => {
    return allTxs.filter(
      t =>
        t.date >= from &&
        t.date <= to &&
        (activeFundIds.has(t.fundId) || (t.toFundId != null && activeFundIds.has(t.toFundId))) &&
        (!q || (t.note + ' ' + (cMap.get(t.categoryId ?? -1)?.name ?? '')).toLowerCase().includes(q.toLowerCase())),
    )
  }, [allTxs, from, to, activeFundIds, q, cMap])

  const days = useMemo(() => {
    const m = new Map<string, Tx[]>()
    const sorted = [...shown].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
    sorted.forEach(t => m.set(t.date, [...(m.get(t.date) ?? []), t]))
    return [...m.entries()]
  }, [shown])

  const prevM = addMonths(nowMonth, -1)
  const nextM = addMonths(nowMonth, 1)
  const curK = monthKey(cur)
  const nowK = monthKey(nowMonth)
  const prevK = monthKey(prevM)
  const nextK = monthKey(nextM)

  return (
    <>
      {/* Thanh chọn Lịch thời gian & Ví trên đỉnh kiểu MoneyLover */}
      <div className="ledger-topbar">
        <button
          type="button"
          className={`icon-btn ${!resolvedRange.isMonthMode ? 'active-cal' : ''}`}
          onClick={() => setShowTimeModal(true)}
          title="Chọn khoảng thời gian lọc chi tiết"
        >
          📅
        </button>

        <WalletSelectorPill
          fundFilter={fundFilter}
          onChange={setFundFilter}
          funds={funds}
          txs={allTxs}
        />

        <button
          type="button"
          className="icon-btn"
          onClick={() => setShowSearch(s => !s)}
          title="Tìm kiếm"
        >
          🔍
        </button>
      </div>

      {showSearch && (
        <input
          className="search"
          autoFocus
          placeholder="Tìm theo ghi chú hoặc tên nhóm…"
          value={q}
          onChange={e => setQ(e.target.value)}
        />
      )}

      {/* Số dư trung tâm */}
      <div style={{ textAlign: 'center', margin: '6px 0 12px' }}>
        <div className="mut" style={{ fontSize: 13 }}>
          Số dư
        </div>
        <div style={{ fontSize: 24, fontWeight: 700 }}>{money(currentTotalBalance)}</div>
      </div>

      {/* Thanh chuyển tháng hoặc hiển thị khoảng thời gian tuỳ chỉnh */}
      {resolvedRange.isMonthMode ? (
        <div className="ml-month-tabs">
          <button className="m-arrow" onClick={() => selectMonth(addMonths(cur, -1))} title="Tháng trước">
            ‹
          </button>
          <button
            className={`m-tab ${curK === prevK ? 'active' : ''}`}
            onClick={() => selectMonth(prevM)}
          >
            {curK < prevK ? monthLabel(cur).toUpperCase() : 'THÁNG TRƯỚC'}
          </button>
          <button
            className={`m-tab ${curK === nowK ? 'active' : ''}`}
            onClick={() => selectMonth(nowMonth)}
          >
            THÁNG NÀY
          </button>
          <button
            className={`m-tab ${curK === nextK || curK > nextK ? 'active' : ''}`}
            onClick={() => selectMonth(nextM)}
          >
            {curK > nextK ? monthLabel(cur).toUpperCase() : 'TƯƠNG LAI'}
          </button>
          <button className="m-arrow" onClick={() => selectMonth(addMonths(cur, 1))} title="Tháng kế tiếp">
            ›
          </button>
        </div>
      ) : (
        <div className="active-range-banner">
          <span onClick={() => setShowTimeModal(true)} style={{ cursor: 'pointer' }}>
            📅 Khoảng lọc: <b>{resolvedRange.label}</b>
          </span>
          <button
            type="button"
            className="range-reset-btn"
            onClick={() => selectMonth(nowMonth)}
          >
            ✕ Về theo tháng
          </button>
        </div>
      )}

      {/* Bảng Số dư đầu / Số dư cuối */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span className="mut">Số dư đầu</span>
          <b>{moneySigned(openingBalance)}</b>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8 }}>
          <span className="mut">Số dư cuối</span>
          <b>{moneySigned(closingBalance)}</b>
        </div>
        <div
          style={{
            borderTop: '1px solid var(--bd)',
            paddingTop: 8,
            textAlign: 'right',
            fontWeight: 700,
            fontSize: 16,
          }}
        >
          <span className={netChange > 0 ? 'inc' : netChange < 0 ? 'exp' : ''}>{moneySigned(netChange)}</span>
        </div>
        <div style={{ textAlign: 'center', marginTop: 10 }}>
          <button
            className="link-green"
            style={{ background: 'none', border: 0, fontSize: 15, fontWeight: 500 }}
            onClick={() => setShowReport(true)}
          >
            Xem báo cáo cho giai đoạn này
          </button>
        </div>
      </div>

      {days.length === 0 && (
        <div className="empty">Chưa có giao dịch trong giai đoạn ({resolvedRange.label})</div>
      )}

      {/* Danh sách từng ngày (mỗi ngày 1 thẻ giống MoneyLover) */}
      {days.map(([d, list]) => {
        const parsed = parseISO(d)
        const dayNum = format(parsed, 'dd')
        const weekday = format(parsed, 'EEEE', { locale: vi })
        const monthYear = format(parsed, "'tháng' M yyyy", { locale: vi })
        const net = list.reduce(
          (s, t) => s + (t.type === 'income' ? t.amount : t.type === 'expense' ? -t.amount : 0),
          0,
        )

        return (
          <div className="card day-card" key={d}>
            <div className="day-card-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="day-big-num">{dayNum}</span>
                <div>
                  <div style={{ fontWeight: 600, textTransform: 'capitalize', fontSize: 14 }}>{weekday}</div>
                  <div className="mut" style={{ fontSize: 12 }}>
                    {monthYear}
                  </div>
                </div>
              </div>
              <b style={{ fontSize: 16 }}>{moneySigned(net)}</b>
            </div>

            {list.map(t => {
              const c = cMap.get(t.categoryId ?? -1)
              const f = fMap.get(t.fundId)
              const isT = t.type === 'transfer'
              return (
                <div className="row" key={t.id} onClick={() => setViewingTx(t)} style={{ cursor: 'pointer' }}>
                  <div
                    className="ico round"
                    style={{ background: (c?.color ?? '#64748b') + '28', position: 'relative' }}
                  >
                    {isT ? '🔁' : (c?.icon ?? '❓')}
                    {f && <span className="wallet-mini-badge">{f.icon}</span>}
                  </div>
                  <div className="grow">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <b>{isT ? 'Chuyển quỹ' : (c?.name ?? 'Không nhóm')}</b>
                      {t.recurringId && <span className="pill-tag">Định kỳ</span>}
                    </div>
                    <small>
                      {isT
                        ? `${f?.name ?? ''} → ${fMap.get(t.toFundId ?? -1)?.name ?? ''}${t.note ? ' · ' + t.note : ''}`
                        : t.note || f?.name || ''}
                    </small>
                  </div>
                  <b className={t.type === 'income' ? 'inc' : t.type === 'expense' ? 'exp' : 'mut'}>
                    {money(t.amount)}
                  </b>
                </div>
              )
            })}
          </div>
        )
      })}

      {viewingTx && (
        <TxDetailModal
          tx={viewingTx}
          onClose={() => setViewingTx(null)}
          onEdit={t => {
            setViewingTx(null)
            setEdit(t)
          }}
          onDuplicate={draft => {
            setViewingTx(null)
            setDraftTx(draft)
          }}
        />
      )}
      {edit && <TxForm tx={edit} onClose={() => setEdit(null)} />}
      {draftTx && <TxForm draft={draftTx} onClose={() => setDraftTx(null)} />}
      {showTimeModal && (
        <TimeRangeModal
          filter={timeFilter}
          onChange={next => {
            setTimeFilter(next)
            setCur(next.month)
          }}
          onClose={() => setShowTimeModal(false)}
        />
      )}
      {showReport && (
        <PeriodReport
          cur={cur}
          setCur={setCur}
          timeFilter={timeFilter}
          setTimeFilter={setTimeFilter}
          fundFilter={fundFilter}
          setFundFilter={setFundFilter}
          allTxs={allTxs}
          funds={funds}
          cats={cats}
          onClose={() => setShowReport(false)}
        />
      )}
    </>
  )
}
