import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { addDays, addMonths, endOfMonth, format, getDaysInMonth, startOfMonth, startOfWeek } from 'date-fns'
import { db, type Budget, type Category, type Fund, type Tx } from '../db'
import {
  analyzeCreditFund,
  computeTotalBalance,
  effectOn,
  filterReportableTxs,
  fmtDmy,
  fullViDate,
  getCategoryFullName,
  getFlowFundIds,
  getIncludedFunds,
  money,
  moneyShort,
  monthKey,
  type TimeFilter,
  ymd,
} from '../lib'
import TxForm, { type TxFormDraft } from '../components/TxForm'
import TxDetailModal from '../components/TxDetailModal'
import PeriodReport from '../components/PeriodReport'
import SmartInsightsModal from '../components/SmartInsightsModal'
import CreditCardDetailModal from '../components/CreditCardDetailModal'
import { showAlert, showPrompt } from '../components/AppDialog'
import { computeSmartInsights, type HeroInsightCard } from '../smartInsights'

const NO_TXS: Tx[] = []
const NO_FUNDS: Fund[] = []
const NO_CATS: Category[] = []
const NO_BUDGETS: Budget[] = []

export default function Overview() {
  const nav = useNavigate()
  const [hideBalance, setHideBalance] = useState(false)
  const [reportSlide, setReportSlide] = useState<0 | 1>(0) // 0: Báo cáo xu hướng, 1: Báo cáo chi tiêu
  const [insightIdx, setInsightIdx] = useState(0)
  const [showInsightsModal, setShowInsightsModal] = useState(false)
  const [trendTab, setTrendTab] = useState<'expense' | 'income'>('expense')
  const [barScope, setBarScope] = useState<'week' | 'month'>('month')
  const [topScope, setTopScope] = useState<'week' | 'month'>('month')
  const [viewingTx, setViewingTx] = useState<Tx | null>(null)
  const [viewingCreditFundId, setViewingCreditFundId] = useState<number | null>(null)
  const [editTx, setEditTx] = useState<Tx | null>(null)
  const [payDraft, setPayDraft] = useState<TxFormDraft | null>(null)
  const [today] = useState(() => new Date())
  const [reportScreen, setReportScreen] = useState<'main' | 'expense' | 'income' | 'net' | null>(null)
  const [reportCur, setReportCur] = useState(() => startOfMonth(new Date()))
  const [reportFundFilter, setReportFundFilter] = useState(0)
  const [reportTimeFilter, setReportTimeFilter] = useState<TimeFilter>(() => {
    const m = startOfMonth(new Date())
    return {
      mode: 'month',
      month: m,
      startDate: ymd(m),
      endDate: ymd(endOfMonth(m)),
    }
  })

  function openReport(screen: 'main' | 'expense' | 'income' | 'net') {
    const m = startOfMonth(today)
    setReportCur(m)
    setReportTimeFilter({
      mode: 'month',
      month: m,
      startDate: ymd(m),
      endDate: ymd(endOfMonth(m)),
    })
    setReportScreen(screen)
  }

  const txs = useLiveQuery(() => db.txs.toArray(), [], NO_TXS)
  const funds = useLiveQuery(() => db.funds.toArray(), [], NO_FUNDS)
  const cats = useLiveQuery(() => db.categories.toArray(), [], NO_CATS)
  const budgets = useLiveQuery(() => db.budgets.toArray(), [], NO_BUDGETS)

  const cMap = useMemo(() => new Map(cats.map(c => [c.id!, c])), [cats])
  const fMap = useMemo(() => new Map(funds.map(f => [f.id!, f])), [funds])

  const balanceOf = (f: Fund) => f.initialBalance + txs.reduce((a, t) => a + effectOn(t, f.id!), 0)
  // Chỉ các ví "Tính vào tổng" (!excludeFromTotal) mới được đưa vào Tổng số dư & Báo cáo tổng hợp
  const includedFunds = useMemo(() => getIncludedFunds(funds, 0).filter(f => !f.archived), [funds])
  const totalBalance = useMemo(() => computeTotalBalance(funds, txs, 0), [funds, txs])
  const reportableTxs = useMemo(() => filterReportableTxs(txs, funds, 0), [txs, funds])

  const thisMonthKey = monthKey(today)
  const prevMonthKey = monthKey(addMonths(today, -1))
  const daysInThisMonth = getDaysInMonth(today)
  const currentDayNum = today.getDate()

  // Thống kê tháng này vs tháng trước (chỉ tính các ví trong Tổng & giao dịch được tính vào báo cáo)
  const thisMonthTxs = useMemo(() => reportableTxs.filter(t => t.date.startsWith(thisMonthKey)), [reportableTxs, thisMonthKey])
  const prevMonthTxs = useMemo(() => reportableTxs.filter(t => t.date.startsWith(prevMonthKey)), [reportableTxs, prevMonthKey])

  const thisMonthExpense = thisMonthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const thisMonthIncome = thisMonthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const prevMonthExpense = prevMonthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  // Tuần này vs Tuần trước
  const weekStart = ymd(startOfWeek(today, { weekStartsOn: 1 }))
  const prevWeekStart = ymd(addDays(startOfWeek(today, { weekStartsOn: 1 }), -7))
  const thisWeekExpense = reportableTxs
    .filter(t => t.type === 'expense' && t.date >= weekStart)
    .reduce((s, t) => s + t.amount, 0)
  const prevWeekExpense = reportableTxs
    .filter(t => t.type === 'expense' && t.date >= prevWeekStart && t.date < weekStart)
    .reduce((s, t) => s + t.amount, 0)

  const smartInsights = useMemo(
    () => computeSmartInsights({ txs, funds, cats, budgets, today }),
    [txs, funds, cats, budgets, today],
  )

  const activeHeroCard: HeroInsightCard | undefined =
    smartInsights.heroCards[insightIdx % Math.max(1, smartInsights.heroCards.length)] ??
    smartInsights.heroCards[0]

  async function handleQuickBudget(categoryId: number, suggestedLimit: number) {
    const c = cMap.get(categoryId)
    if (!c) return
    const existing = budgets.find(b => b.categoryId === categoryId)
    const v = await showPrompt({
      title: `Hạn mức tháng · ${c.name}`,
      message: 'Đặt trần ngân sách tháng cho nhóm này để kiểm soát tốc độ chi tiêu (để trống hoặc 0 để xoá):',
      icon: c.icon,
      defaultValue: String(existing?.limit ?? suggestedLimit),
      placeholder: 'Ví dụ: 1,500,000',
      unit: '₫',
      numeric: true,
      quickAmounts: [500_000, 1_000_000, 1_500_000, 2_000_000, 3_000_000, 5_000_000],
      allowClearZero: Boolean(existing?.limit),
      confirmText: 'Lưu hạn mức',
    })
    if (v === null) return
    const n = Number(v.replace(/[^\d]/g, ''))
    if (!n) {
      if (existing?.id) await db.budgets.delete(existing.id)
      return
    }
    if (existing?.id) await db.budgets.put({ ...existing, limit: n })
    else await db.budgets.add({ categoryId, limit: n })
    await showAlert({
      title: 'Đã kích hoạt hạn mức',
      message: `Đã đặt trần ngân sách tháng cho "${c.name}" ở mức ${money(n)}.`,
      icon: '🎯',
      tone: 'success',
    })
  }

  function handleQuickTransferSaving(amount: number) {
    const fromId = cashFunds[0]?.id ?? funds[0]?.id
    const toId =
      smartInsights.opportunityCost.savingFundId &&
      smartInsights.opportunityCost.savingFundId !== fromId
        ? smartInsights.opportunityCost.savingFundId
        : funds.find(f => !f.archived && f.id !== fromId)?.id
    setPayDraft({
      type: 'transfer',
      amount,
      fundId: fromId,
      toFundId: toId ?? null,
      note: `Tích lũy thông minh tháng ${smartInsights.monthStr}`,
    })
  }

  function handleHeroCta(card: HeroInsightCard) {
    const { cta } = card
    if (cta.actionType === 'set_budget' && cta.categoryId) {
      handleQuickBudget(cta.categoryId, cta.suggestedLimit ?? 1_000_000)
    } else if (cta.actionType === 'transfer_saving') {
      handleQuickTransferSaving(cta.suggestedTransferAmount ?? 500_000)
    } else if (cta.actionType === 'open_expense_report') {
      openReport('expense')
    } else {
      setShowInsightsModal(true)
    }
  }

  // Dữ liệu biểu đồ xu hướng lũy kế theo ngày trong tháng (Tháng này vs TB 3 tháng trước)
  const trendData = useMemo(() => {
    const m1 = monthKey(addMonths(today, -1))
    const m2 = monthKey(addMonths(today, -2))
    const m3 = monthKey(addMonths(today, -3))
    const prev3Months = [m1, m2, m3]

    let cumCurrent = 0
    let cumPrev3 = 0
    const monthNum = format(today, 'MM')

    return Array.from({ length: daysInThisMonth }, (_, idx) => {
      const day = idx + 1
      const dPad = String(day).padStart(2, '0')
      const curDateStr = `${thisMonthKey}-${dPad}`

      const dayCurSum = thisMonthTxs
        .filter(t => t.type === trendTab && t.date === curDateStr)
        .reduce((s, t) => s + t.amount, 0)
      cumCurrent += dayCurSum

      const dayPrev3Sum = prev3Months.reduce((acc, mk) => {
        const dStr = `${mk}-${dPad}`
        return (
          acc +
          reportableTxs
            .filter(t => t.type === trendTab && t.date === dStr)
            .reduce((s, t) => s + t.amount, 0)
        )
      }, 0)
      cumPrev3 += dayPrev3Sum / 3

      return {
        label: `${dPad}/${monthNum}`,
        thisMonth: day <= currentDayNum ? Math.round(cumCurrent) : null,
        avg3Months: Math.round(cumPrev3),
      }
    })
  }, [today, daysInThisMonth, thisMonthKey, thisMonthTxs, reportableTxs, trendTab, currentDayNum])

  const avg3MonthsTotal = trendData[currentDayNum - 1]?.avg3Months ?? 0

  // Dữ liệu biểu đồ cột (Báo cáo chi tiêu)
  const barData = useMemo(() => {
    if (barScope === 'month') {
      return [
        { name: 'Tháng trước', value: prevMonthExpense, color: '#883937' },
        { name: 'Tháng này', value: thisMonthExpense, color: '#f0534f' },
      ]
    }
    return [
      { name: 'Tuần trước', value: prevWeekExpense, color: '#883937' },
      { name: 'Tuần này', value: thisWeekExpense, color: '#f0534f' },
    ]
  }, [barScope, prevMonthExpense, thisMonthExpense, prevWeekExpense, thisWeekExpense])

  const barCurrentTotal = barScope === 'month' ? thisMonthExpense : thisWeekExpense
  const barPrevTotal = barScope === 'month' ? prevMonthExpense : prevWeekExpense
  const barDiffPct = barPrevTotal > 0 ? Math.round(((barCurrentTotal - barPrevTotal) / barPrevTotal) * 100) : 0

  // Chi tiêu nhiều nhất (Tuần / Tháng)
  const topSpendList = useMemo(() => {
    const filtered = reportableTxs.filter(
      t => t.type === 'expense' && (topScope === 'month' ? t.date.startsWith(thisMonthKey) : t.date >= weekStart),
    )
    const total = filtered.reduce((s, t) => s + t.amount, 0)
    const m = new Map<number, number>()
    filtered.forEach(t => m.set(t.categoryId ?? 0, (m.get(t.categoryId ?? 0) ?? 0) + t.amount))
    return [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cid, amount]) => ({
        cid,
        cat: cMap.get(cid),
        amount,
        pct: total > 0 ? Math.round((amount / total) * 100) : 0,
      }))
  }, [reportableTxs, topScope, thisMonthKey, weekStart, cMap])

  // Giao dịch gần đây (gồm các ví Tính vào tổng và chi tiêu thẻ tín dụng)
  const recentTxs = useMemo(() => {
    const flowIds = getFlowFundIds(funds, 0)
    return [...txs]
      .filter(t => flowIds.has(t.fundId) || (t.toFundId != null && flowIds.has(t.toFundId)))
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
      .slice(0, 5)
  }, [txs, funds])

  const cashFunds = includedFunds.filter(f => f.kind !== 'credit')
  const allCreditFunds = useMemo(
    () => funds.filter(f => f.kind === 'credit' && !f.archived),
    [funds],
  )
  const viewingCreditFund = useMemo(
    () => (viewingCreditFundId != null ? funds.find(f => f.id === viewingCreditFundId) ?? null : null),
    [funds, viewingCreditFundId],
  )

  return (
    <>
      {/* 1. Header Tổng số dư kiểu MoneySave */}
      <div className="ml-balance-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="ml-total-num">{hideBalance ? '•••••••• ₫' : money(totalBalance)}</span>
            <button
              className="icon-btn"
              onClick={() => setHideBalance(v => !v)}
              aria-label="Ẩn/hiện số dư"
              title="Ẩn/hiện số dư"
            >
              {hideBalance ? '🙈' : '👁'}
            </button>
          </div>
          <div className="mut" style={{ fontSize: 13 }}>
            Tổng số dư <span style={{ opacity: 0.6 }}>ⓘ</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="icon-btn" onClick={() => nav('/ledger')} title="Tìm kiếm giao dịch">
            🔍
          </button>
          <button className="icon-btn" onClick={() => nav('/budgets')} title="Định kỳ & Ngân sách">
            🔔
          </button>
        </div>
      </div>

      {/* 2. Ví của tôi (chỉ liệt kê các ví tiền mặt/tiết kiệm Tính vào tổng trên trang Tổng quan) */}
      <div className="card">
        <div className="card-head">
          <b>Ví của tôi</b>
          <span className="link-green" onClick={() => nav('/accounts')}>
            Xem tất cả
          </span>
        </div>
        {cashFunds.length === 0 && (
          <div className="empty" style={{ padding: '12px 0' }}>
            Chưa có ví nào trong nhóm Tính vào tổng
          </div>
        )}
        {cashFunds.map(f => {
          const bal = balanceOf(f)
          return (
            <div className="row" key={f.id} onClick={() => nav('/accounts')} style={{ cursor: 'pointer' }}>
              <div className="ico" style={{ background: f.color + '28' }}>
                {f.icon}
              </div>
              <div className="grow">
                <b>{f.name}</b>
              </div>
              <div style={{ textAlign: 'right' }}>
                <b className={bal < 0 ? 'exp' : ''}>{hideBalance ? '•••••• ₫' : money(bal)}</b>
              </div>
            </div>
          )
        })}
      </div>

      {/* 2b. Quỹ tín dụng (hiển thị trực tiếp ở Tổng quan, bấm vào mở trang chi tiết giao dịch & trả góp) */}
      <div className="sec-head">
        <span>💳 Quỹ tín dụng</span>
        <span className="link-green" onClick={() => nav('/accounts')}>
          Quản lý thẻ
        </span>
      </div>
      {allCreditFunds.length === 0 ? (
        <div
          className="card"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 13,
          }}
        >
          <span className="mut">💳 Theo dõi hạn mức, kỳ sao kê & trả góp với Quỹ tín dụng</span>
          <span className="link-green" onClick={() => nav('/accounts')}>
            + Thêm thẻ
          </span>
        </div>
      ) : (
        allCreditFunds.map(f => {
          const info = analyzeCreditFund(f, txs, today)
          return (
            <div
              className="card"
              key={f.id}
              style={{ cursor: 'pointer' }}
              onClick={() => setViewingCreditFundId(f.id!)}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
                  <div className="ico" style={{ background: f.color + '28' }}>
                    {f.icon}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <b style={{ fontSize: 16 }}>{f.name}</b>
                      <span className="pill-tag">Miễn lãi {info.interestFreeDaysToday} ngày</span>
                      {info.activeInstallmentsCount > 0 && (
                        <span
                          className="pill-tag"
                          style={{ color: 'var(--acc)', borderColor: 'var(--acc)' }}
                        >
                          📅 {info.activeInstallmentsCount} trả góp ({money(info.monthlyInstallmentTotal)}/kỳ)
                        </span>
                      )}
                    </div>
                    <small className="mut" style={{ display: 'block', marginTop: 3 }}>
                      Chốt sao kê: <b>ngày {info.statementDay}</b> (còn {info.daysUntilStatement}{' '}
                      ngày) · Hạn TT kỳ mới: <b>{fmtDmy(info.nextCycleDueDate)}</b>
                    </small>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <small className="mut">Dư nợ hiện tại</small>
                  <div
                    className={info.debt > 0 ? 'exp' : 'inc'}
                    style={{ fontSize: 18, fontWeight: 700 }}
                  >
                    {hideBalance ? '•••••• ₫' : info.debt > 0 ? `-${money(info.debt)}` : '0 ₫'}
                  </div>
                </div>
              </div>

              {info.creditLimit > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 12,
                      marginBottom: 4,
                    }}
                  >
                    <span className="mut">
                      Khả dụng: {hideBalance ? '•••••• ₫' : money(info.availableCredit)}
                    </span>
                    <span className="mut">
                      Hạn mức: {hideBalance ? '•••••• ₫' : money(info.creditLimit)} (
                      {info.utilizationPct}%)
                    </span>
                  </div>
                  <div className="bar">
                    <div
                      style={{
                        width: `${info.utilizationPct}%`,
                        background: info.utilizationPct > 80 ? 'var(--exp)' : f.color,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Hộp diễn giải kỳ sao kê & cảnh báo hạn thanh toán rõ ràng */}
              <div
                style={{
                  marginTop: 10,
                  padding: '8px 10px',
                  borderRadius: 10,
                  fontSize: 12.5,
                  lineHeight: 1.45,
                  background:
                    info.statusTag === 'due-soon'
                      ? 'rgba(239,68,68,0.12)'
                      : info.statusTag === 'optimal'
                        ? 'rgba(16,185,129,0.12)'
                        : 'color-mix(in srgb, var(--fg) 5%, transparent)',
                  color:
                    info.statusTag === 'due-soon'
                      ? 'var(--exp)'
                      : info.statusTag === 'optimal'
                        ? 'var(--inc)'
                        : 'var(--fg)',
                }}
              >
                {info.advice}
              </div>

              <div
                style={{
                  marginTop: 10,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 8,
                  fontSize: 12.5,
                }}
              >
                <span className="mut">
                  Chi trong kỳ ({fmtDmy(info.lastStatementDate)} → {fmtDmy(info.nextStatementDate)}
                  ): <b>{hideBalance ? '•••••• ₫' : money(info.currentCycleSpend)}</b>
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    className="btn"
                    style={{ padding: '6px 10px', fontSize: 12 }}
                    onClick={e => {
                      e.stopPropagation()
                      setViewingCreditFundId(f.id!)
                    }}
                  >
                    Chi tiết & Trả góp
                  </button>
                  {info.debt > 0 && (
                    <button
                      type="button"
                      className="btn pri"
                      style={{ padding: '6px 12px', fontSize: 12 }}
                      onClick={e => {
                        e.stopPropagation()
                        setPayDraft({
                          type: 'transfer',
                          amount:
                            info.previousStatementDebt > 0
                              ? info.previousStatementDebt
                              : info.debt,
                          fundId: cashFunds[0]?.id,
                          toFundId: f.id,
                          note: `Tất toán dư nợ thẻ ${f.name}`,
                        })
                      }}
                    >
                      Tất toán (
                      {money(
                        info.previousStatementDebt > 0 ? info.previousStatementDebt : info.debt,
                      )}
                      )
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })
      )}

      {/* 3. Smart Insights (Phân tích hành vi, Dự báo dòng tiền & Đề xuất 1-chạm) */}
      <div className="sec-head">
        <span>Smart Insights</span>
        <span className="link-green" onClick={() => setShowInsightsModal(true)}>
          Xem chi tiết
        </span>
      </div>
      <div className="card">
        {/* Phần trên: Nhóm chi dẫn đầu + Dự báo dòng tiền & Dual-Pace Sparkbar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 12,
            paddingBottom: 12,
            borderBottom: '1px solid var(--bd)',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 18 }}>{smartInsights.topCat.icon}</span>
              <b
                style={{
                  fontSize: 16,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {smartInsights.topCat.name}
              </b>
              {smartInsights.topCat.amount > 0 && (
                <span className="pill-tag" style={{ fontSize: 11 }}>
                  ~{smartInsights.topCat.workHours}h làm
                </span>
              )}
            </div>
            <div style={{ marginTop: 4 }}>
              <span className="mut" style={{ fontSize: 13 }}>
                Tổng đã chi{' '}
              </span>
              <b className="exp" style={{ fontSize: 19 }}>
                {money(smartInsights.topCat.amount)}
              </b>
            </div>
            <div className="mut" style={{ fontSize: 12.5, marginTop: 4 }}>
              Dự báo chốt tháng {smartInsights.monthStr}:{' '}
              <b style={{ color: 'var(--fg)' }}>
                ~{money(smartInsights.burnRate.projectedMonthExpense)}
              </b>{' '}
              ({money(smartInsights.burnRate.weightedDailyBurn)}/ngày)
            </div>
          </div>

          <div
            style={{ textAlign: 'center', flexShrink: 0, cursor: 'pointer' }}
            onClick={() => setShowInsightsModal(true)}
            title="Nhấn để xem phân tích chi tiết"
          >
            <div
              className="ring-badge"
              style={{
                borderColor:
                  smartInsights.burnRate.projectedVsBaselinePct > 0
                    ? 'var(--exp)'
                    : 'var(--inc)',
              }}
            >
              {Math.abs(smartInsights.burnRate.projectedVsBaselinePct)}%
            </div>
            <small className="mut" style={{ display: 'block', marginTop: 4, fontSize: 11.5 }}>
              {smartInsights.burnRate.projectedVsBaselinePct > 0
                ? 'Cao hơn TB tháng'
                : 'Thấp hơn TB tháng'}
            </small>
          </div>
        </div>

        {/* Thanh nhịp độ chi tiêu siêu gọn (Micro-visualization / Dual-Pace Sparkbar) */}
        <div style={{ paddingTop: 10, paddingBottom: 10 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 11.5,
              marginBottom: 5,
            }}
            className="mut"
          >
            <span>
              Tốc độ chi:{' '}
              <b
                style={{
                  color:
                    smartInsights.burnRate.paceStatus === 'overpace'
                      ? 'var(--exp)'
                      : smartInsights.burnRate.paceStatus === 'watch'
                        ? '#f59e0b'
                        : 'var(--inc)',
                }}
              >
                {smartInsights.burnRate.spendProgressPct}%
              </b>
            </span>
            <span>
              Thời gian tháng ({smartInsights.todayStr}):{' '}
              <b>{smartInsights.burnRate.timeProgressPct}%</b>
            </span>
          </div>
          <div
            style={{
              position: 'relative',
              height: 7,
              background: 'var(--bd)',
              borderRadius: 99,
            }}
          >
            <div
              style={{
                width: `${Math.min(100, smartInsights.burnRate.spendProgressPct)}%`,
                height: '100%',
                borderRadius: 99,
                background:
                  smartInsights.burnRate.paceStatus === 'overpace'
                    ? 'var(--exp)'
                    : smartInsights.burnRate.paceStatus === 'watch'
                      ? '#f59e0b'
                      : 'var(--inc)',
              }}
            />
            <div
              title={`Tiến độ thời gian tháng: ${smartInsights.burnRate.timeProgressPct}%`}
              style={{
                position: 'absolute',
                left: `${Math.min(98, Math.max(2, smartInsights.burnRate.timeProgressPct))}%`,
                top: -2,
                bottom: -2,
                width: 2.5,
                borderRadius: 2,
                background: 'var(--fg)',
              }}
            />
          </div>
        </div>

        {/* Hộp nhận định hành vi thông minh & Nút can thiệp 1-chạm */}
        {activeHeroCard && (
          <div
            style={{
              background: 'color-mix(in srgb, var(--fg) 5%, transparent)',
              borderRadius: 14,
              padding: '11px 12px',
              marginTop: 2,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 4,
                gap: 6,
              }}
            >
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  color:
                    activeHeroCard.tone === 'danger'
                      ? 'var(--exp)'
                      : activeHeroCard.tone === 'warn'
                        ? '#f59e0b'
                        : activeHeroCard.tone === 'good'
                          ? 'var(--inc)'
                          : '#06b6d4',
                }}
              >
                {activeHeroCard.icon} {activeHeroCard.badge.toUpperCase()}
              </span>
              <span className="mut" style={{ fontSize: 11.5 }}>
                {activeHeroCard.metricLabel}: <b>{activeHeroCard.metricValue}</b>
              </span>
            </div>

            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
              {activeHeroCard.title}
            </div>
            <div
              className="mut"
              style={{ fontSize: 12.8, lineHeight: 1.45, marginBottom: 10 }}
            >
              {activeHeroCard.body}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <button
                type="button"
                className="btn primary"
                style={{
                  padding: '7px 12px',
                  fontSize: 12.5,
                  borderRadius: 10,
                  fontWeight: 600,
                }}
                onClick={() => handleHeroCta(activeHeroCard)}
              >
                {activeHeroCard.cta.label}
              </button>

              {smartInsights.heroCards.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button
                    type="button"
                    className="icon-btn"
                    style={{ fontSize: 15, padding: '2px 6px' }}
                    onClick={() =>
                      setInsightIdx(
                        i =>
                          (i - 1 + smartInsights.heroCards.length) %
                          smartInsights.heroCards.length,
                      )
                    }
                    title="Nhận định trước"
                  >
                    ‹
                  </button>
                  <span className="mut" style={{ fontSize: 11.5 }}>
                    {(insightIdx % smartInsights.heroCards.length) + 1}/
                    {smartInsights.heroCards.length}
                  </span>
                  <button
                    type="button"
                    className="icon-btn"
                    style={{ fontSize: 15, padding: '2px 6px' }}
                    onClick={() =>
                      setInsightIdx(
                        i => (i + 1) % smartInsights.heroCards.length,
                      )
                    }
                    title="Nhận định tiếp theo"
                  >
                    ›
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 4. Báo cáo tháng này (Xu hướng & Chi tiêu) */}
      <div className="sec-head">
        <span>Báo cáo tháng này</span>
        <span className="link-green" onClick={() => openReport('main')}>
          Xem chi tiết
        </span>
      </div>
      <div className="card">
        {reportSlide === 0 ? (
          <>
            <div className="report-tabs">
              <div
                className={`report-tab ${trendTab === 'expense' ? 'active-exp' : ''}`}
                onClick={() => setTrendTab('expense')}
              >
                <small className="mut">Tổng đã chi</small>
                <b className="exp">{money(thisMonthExpense)}</b>
              </div>
              <div
                className={`report-tab ${trendTab === 'income' ? 'active-inc' : ''}`}
                onClick={() => setTrendTab('income')}
              >
                <small className="mut">Tổng thu</small>
                <b style={{ color: '#06b6d4' }}>{money(thisMonthIncome)}</b>
              </div>
            </div>

            <div className="trend-callout">
              <div>
                {format(today, 'dd/MM/yyyy')}:{' '}
                <b className={trendTab === 'expense' ? 'exp' : 'inc'}>
                  {money(trendTab === 'expense' ? thisMonthExpense : thisMonthIncome)}
                </b>
              </div>
              <div className="mut" style={{ fontSize: 12 }}>
                Trung bình 3 tháng trước: <b>{money(avg3MonthsTotal)}</b>
              </div>
            </div>

            <div style={{ width: '100%', height: 210 }}>
              <ResponsiveContainer>
                <AreaChart data={trendData} margin={{ left: -12, right: 8, top: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCur" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={trendTab === 'expense' ? '#ef4444' : '#06b6d4'} stopOpacity={0.45} />
                      <stop offset="95%" stopColor={trendTab === 'expense' ? '#ef4444' : '#06b6d4'} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#8883" />
                  <XAxis
                    dataKey="label"
                    ticks={[`01/${format(today, 'MM')}`, `${daysInThisMonth}/${format(today, 'MM')}`]}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis orientation="right" tickFormatter={moneyShort} tick={{ fontSize: 11 }} />
                  <Tooltip
                    cursor={{ stroke: 'var(--mut)', strokeWidth: 1, strokeDasharray: '3 3' }}
                    contentStyle={{
                      background: 'var(--card)',
                      border: '1px solid var(--bd)',
                      borderRadius: 12,
                      boxShadow: '0 8px 24px #0006',
                      color: 'var(--fg)',
                      fontSize: 13,
                    }}
                    labelStyle={{ color: 'var(--mut)', fontWeight: 600, marginBottom: 4 }}
                    formatter={(v, name) => [money(Number(v)), String(name)]}
                  />
                  <Area
                    type="monotone"
                    dataKey="avg3Months"
                    name="Trung bình 3 tháng trước"
                    stroke="#7b8794"
                    strokeWidth={2}
                    fillOpacity={0}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="thisMonth"
                    name="Tháng này"
                    stroke={trendTab === 'expense' ? '#ef4444' : '#06b6d4'}
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorCur)"
                    dot={false}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', gap: 18, justifyContent: 'center', fontSize: 12, marginTop: 6 }} className="mut">
              <span>
                <i
                  style={{
                    display: 'inline-block',
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: trendTab === 'expense' ? '#ef4444' : '#06b6d4',
                    marginRight: 6,
                  }}
                />
                Tháng này
              </span>
              <span>
                <i
                  style={{
                    display: 'inline-block',
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: '#7b8794',
                    marginRight: 6,
                  }}
                />
                Trung bình 3 tháng trước
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="seg">
              <button className={barScope === 'week' ? 'on' : ''} onClick={() => setBarScope('week')}>
                Tuần
              </button>
              <button className={barScope === 'month' ? 'on' : ''} onClick={() => setBarScope('month')}>
                Tháng
              </button>
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 26, fontWeight: 700 }}>{money(barCurrentTotal)}</div>
              <div className="mut" style={{ fontSize: 13 }}>
                Tổng đã chi {barScope === 'month' ? 'tháng này' : 'tuần này'}{' '}
                <span className={barDiffPct > 0 ? 'exp' : 'inc'} style={{ fontWeight: 600 }}>
                  {barDiffPct >= 0 ? '↑' : '↓'} {Math.abs(barDiffPct)}%
                </span>
              </div>
            </div>
            <div style={{ width: '100%', height: 200 }}>
              <ResponsiveContainer>
                <BarChart data={barData} barSize={64} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis orientation="right" tickFormatter={moneyShort} tick={{ fontSize: 11 }} />
                  <Tooltip
                    cursor={{ fill: 'rgba(148, 163, 184, 0.08)', radius: 8 }}
                    contentStyle={{
                      background: 'var(--card)',
                      border: '1px solid var(--bd)',
                      borderRadius: 12,
                      boxShadow: '0 8px 24px #0006',
                      color: 'var(--fg)',
                      fontSize: 13,
                    }}
                    labelStyle={{ color: 'var(--mut)', fontWeight: 600, marginBottom: 4 }}
                    itemStyle={{ color: 'var(--fg)', fontWeight: 600 }}
                    formatter={v => [money(Number(v)), 'Đã chi']}
                  />
                  <Bar dataKey="value" name="Đã chi" radius={[10, 10, 0, 0]} isAnimationActive={false}>
                    {barData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        <div className="report-BottomNav">
          <button className="icon-btn" onClick={() => setReportSlide(0)}>
            ‹
          </button>
          <span className="link-green" onClick={() => setReportSlide(s => (s === 0 ? 1 : 0))}>
            {reportSlide === 0 ? 'Báo cáo xu hướng' : 'Báo cáo chi tiêu'}
          </span>
          <button className="icon-btn" onClick={() => setReportSlide(1)}>
            ›
          </button>
        </div>
        <div style={{ textAlign: 'center', marginTop: 4 }}>
          <span className={`dot ${reportSlide === 0 ? 'on' : ''}`} onClick={() => setReportSlide(0)} />
          <span className={`dot ${reportSlide === 1 ? 'on' : ''}`} onClick={() => setReportSlide(1)} />
        </div>
      </div>

      {/* 5. Chi tiêu nhiều nhất */}
      <div className="sec-head">
        <span>Chi tiêu nhiều nhất</span>
        <span className="link-green" onClick={() => openReport('expense')}>
          Xem chi tiết
        </span>
      </div>
      <div className="card">
        <div className="seg">
          <button className={topScope === 'week' ? 'on' : ''} onClick={() => setTopScope('week')}>
            Tuần
          </button>
          <button className={topScope === 'month' ? 'on' : ''} onClick={() => setTopScope('month')}>
            Tháng
          </button>
        </div>
        {topSpendList.length === 0 && <div className="empty">Chưa có khoản chi tiêu nào</div>}
        {topSpendList.map(item => (
          <div className="row" key={item.cid}>
            <div className="ico round" style={{ background: (item.cat?.color ?? '#ef4444') + '28' }}>
              {item.cat?.icon ?? '📦'}
            </div>
            <div className="grow">
              <b>{item.cat ? getCategoryFullName(item.cat, cats) : 'Không nhóm'}</b>
              <small>{money(item.amount)}</small>
            </div>
            <b className="exp">{item.pct}%</b>
          </div>
        ))}
      </div>

      {/* 6. Giao dịch gần đây */}
      <div className="sec-head">
        <span>Giao dịch gần đây</span>
        <span className="link-green" onClick={() => nav('/ledger')}>
          Xem tất cả
        </span>
      </div>
      <div className="card" style={{ padding: '4px 14px' }}>
        {recentTxs.length === 0 && <div className="empty">Chưa có giao dịch nào</div>}
        {recentTxs.map(t => {
          const c = cMap.get(t.categoryId ?? -1)
          const f = fMap.get(t.fundId)
          const isT = t.type === 'transfer'
          return (
            <div className="row" key={t.id} onClick={() => setViewingTx(t)} style={{ cursor: 'pointer' }}>
              <div className="ico round" style={{ background: (c?.color ?? '#64748b') + '28', position: 'relative' }}>
                {isT ? '🔁' : (c?.icon ?? '❓')}
                {f && <span className="wallet-mini-badge">{f.icon}</span>}
              </div>
              <div className="grow">
                <b>{isT ? 'Chuyển quỹ' : (c?.name ?? 'Không nhóm')}</b>
                <small>{fullViDate(t.date)}</small>
              </div>
              <b className={t.type === 'income' ? 'inc' : t.type === 'expense' ? 'exp' : 'mut'}>
                {money(t.amount)}
              </b>
            </div>
          )
        })}
      </div>

      {viewingTx && (
        <TxDetailModal
          tx={viewingTx}
          onClose={() => setViewingTx(null)}
          onEdit={t => {
            setViewingTx(null)
            setEditTx(t)
          }}
          onDuplicate={draft => {
            setViewingTx(null)
            setPayDraft(draft)
          }}
        />
      )}
      {editTx && <TxForm tx={editTx} onClose={() => setEditTx(null)} />}
      {payDraft && <TxForm draft={payDraft} onClose={() => setPayDraft(null)} />}
      {reportScreen && (
        <PeriodReport
          cur={reportCur}
          setCur={setReportCur}
          timeFilter={reportTimeFilter}
          setTimeFilter={setReportTimeFilter}
          fundFilter={reportFundFilter}
          setFundFilter={setReportFundFilter}
          allTxs={txs}
          funds={funds}
          cats={cats}
          initialScreen={reportScreen}
          onClose={() => setReportScreen(null)}
        />
      )}
      {showInsightsModal && (
        <SmartInsightsModal
          insights={smartInsights}
          onClose={() => setShowInsightsModal(false)}
          onQuickBudget={handleQuickBudget}
          onQuickTransferSaving={handleQuickTransferSaving}
          onOpenExpenseReport={() => openReport('expense')}
        />
      )}
      {viewingCreditFund && (
        <CreditCardDetailModal
          fund={viewingCreditFund}
          txs={txs}
          cats={cats}
          today={today}
          onClose={() => setViewingCreditFundId(null)}
          onEditFund={() => {
            setViewingCreditFundId(null)
            nav('/accounts')
          }}
          onPayCard={(f, amount, note) => {
            setViewingCreditFundId(null)
            setPayDraft({
              type: 'transfer',
              amount,
              fundId: cashFunds[0]?.id,
              toFundId: f.id,
              note,
            })
          }}
          onSelectTx={t => {
            setViewingTx(t)
          }}
        />
      )}
    </>
  )
}
