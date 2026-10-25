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
import { addDays, addMonths, format, getDaysInMonth, startOfWeek } from 'date-fns'
import { db, type Category, type Fund, type Tx } from '../db'
import {
  analyzeCreditFund,
  computeTotalBalance,
  effectOn,
  filterReportableTxs,
  fullViDate,
  getIncludedFunds,
  money,
  moneyShort,
  monthKey,
  ymd,
} from '../lib'
import TxForm, { type TxFormDraft } from '../components/TxForm'

const NO_TXS: Tx[] = []
const NO_FUNDS: Fund[] = []
const NO_CATS: Category[] = []

export default function Overview() {
  const nav = useNavigate()
  const [hideBalance, setHideBalance] = useState(false)
  const [reportSlide, setReportSlide] = useState<0 | 1>(0) // 0: Báo cáo xu hướng, 1: Báo cáo chi tiêu
  const [trendTab, setTrendTab] = useState<'expense' | 'income'>('expense')
  const [barScope, setBarScope] = useState<'week' | 'month'>('month')
  const [topScope, setTopScope] = useState<'week' | 'month'>('month')
  const [editTx, setEditTx] = useState<Tx | null>(null)
  const [payDraft, setPayDraft] = useState<TxFormDraft | null>(null)
  const [today] = useState(() => new Date())

  const txs = useLiveQuery(() => db.txs.toArray(), [], NO_TXS)
  const funds = useLiveQuery(() => db.funds.toArray(), [], NO_FUNDS)
  const cats = useLiveQuery(() => db.categories.toArray(), [], NO_CATS)

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

  // Money Insider: nhóm chi lớn nhất tháng (hoặc Thiết Yếu 50%)
  const topCatThisMonth = useMemo(() => {
    const m = new Map<number, number>()
    thisMonthTxs
      .filter(t => t.type === 'expense')
      .forEach(t => m.set(t.categoryId ?? 0, (m.get(t.categoryId ?? 0) ?? 0) + t.amount))
    const sorted = [...m.entries()].sort((a, b) => b[1] - a[1])
    if (sorted.length === 0) return { name: 'Thiết Yếu 50%', amount: 0 }
    const [cid, amt] = sorted[0]
    return { name: cMap.get(cid)?.name ?? 'Chi tiêu chính', amount: amt }
  }, [thisMonthTxs, cMap])

  const avgDailyThisMonth = currentDayNum > 0 ? thisMonthExpense / currentDayNum : 0
  const monthDiffPct =
    prevMonthExpense > 0 ? Math.round(((thisMonthExpense - prevMonthExpense) / prevMonthExpense) * 100) : 0

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

  // Giao dịch gần đây (chỉ lấy từ các ví Tính vào tổng)
  const recentTxs = useMemo(() => {
    const incIds = new Set(includedFunds.map(f => f.id!))
    return [...txs]
      .filter(t => incIds.has(t.fundId) || (t.toFundId != null && incIds.has(t.toFundId)))
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
      .slice(0, 5)
  }, [txs, includedFunds])

  const cashFunds = includedFunds.filter(f => f.kind !== 'credit')
  const creditFunds = includedFunds.filter(f => f.kind === 'credit')

  return (
    <>
      {/* 1. Header Tổng số dư kiểu MoneyLover */}
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

      {/* 2. Ví của tôi (chỉ liệt kê các ví Tính vào tổng trên trang Tổng quan) */}
      <div className="card">
        <div className="card-head">
          <b>Ví của tôi</b>
          <span className="link-green" onClick={() => nav('/accounts')}>
            Xem tất cả
          </span>
        </div>
        {includedFunds.map(f => {
          const bal = balanceOf(f)
          const isCredit = f.kind === 'credit'
          const creditInfo = isCredit ? analyzeCreditFund(f, txs, today) : null
          return (
            <div className="row" key={f.id} onClick={() => nav('/accounts')} style={{ cursor: 'pointer' }}>
              <div className="ico" style={{ background: f.color + '28' }}>
                {f.icon}
              </div>
              <div className="grow">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <b>{f.name}</b>
                  {isCredit && creditInfo && (
                    <span className="pill-tag">Miễn lãi {creditInfo.interestFreeDaysToday} ngày</span>
                  )}
                </div>
                {isCredit && creditInfo && (
                  <small className="mut">
                    Chốt ngày {creditInfo.statementDay} (còn {creditInfo.daysUntilStatement}d) · Hạn TT ngày{' '}
                    {creditInfo.dueDay} (còn {creditInfo.daysUntilDue}d)
                  </small>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <b className={bal < 0 ? 'exp' : ''}>{hideBalance ? '•••••• ₫' : money(bal)}</b>
                {isCredit && creditInfo && creditInfo.debt > 0 && (
                  <div>
                    <button
                      className="btn pri"
                      style={{ padding: '2px 8px', fontSize: 11, marginTop: 4 }}
                      onClick={e => {
                        e.stopPropagation()
                        setPayDraft({
                          type: 'transfer',
                          amount: creditInfo.debt,
                          fundId: cashFunds[0]?.id,
                          toFundId: f.id,
                          note: `Tất toán thẻ ${f.name}`,
                        })
                      }}
                    >
                      Trả thẻ
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
        {creditFunds.length === 0 && (
          <div
            style={{
              marginTop: 8,
              paddingTop: 8,
              borderTop: '1px dashed var(--bd)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 12,
            }}
          >
            <span className="mut">💳 Tối ưu tiền mặt xài trước trả sau với Quỹ tín dụng</span>
            <span className="link-green" onClick={() => nav('/accounts')}>
              + Tạo thẻ tín dụng
            </span>
          </div>
        )}
      </div>

      {/* 3. Money Insider */}
      <div className="sec-head">
        <span>Money Insider</span>
        <span className="link-green" onClick={() => nav('/budgets')}>
          ☰
        </span>
      </div>
      <div className="card">
        <div style={{ paddingBottom: 12, borderBottom: '1px solid var(--bd)' }}>
          <div style={{ fontWeight: 600, fontSize: 16 }}>
            {topCatThisMonth.name} <span className="mut">ⓘ</span>
          </div>
          <div style={{ marginTop: 4 }}>
            <span className="mut">Tổng đã chi </span>
            <b className="exp" style={{ fontSize: 20 }}>
              {money(topCatThisMonth.amount)}
            </b>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Tháng này</div>
            <div className="mut" style={{ fontSize: 13, margin: '2px 0' }}>
              Trung bình
            </div>
            <div>
              <b style={{ fontSize: 18 }}>
                {new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(avgDailyThisMonth)} ₫
              </b>
              <span className="mut">/ngày</span>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div
              className="ring-badge"
              style={{
                borderColor: monthDiffPct > 0 ? 'var(--exp)' : 'var(--inc)',
              }}
            >
              {Math.abs(monthDiffPct)}%
            </div>
            <small className="mut" style={{ display: 'block', marginTop: 4 }}>
              {monthDiffPct >= 0 ? 'Cao hơn tháng trước' : 'Thấp hơn tháng trước'}
            </small>
          </div>
        </div>
      </div>

      {/* 4. Báo cáo tháng này (Xu hướng & Chi tiêu) */}
      <div className="sec-head">
        <span>Báo cáo tháng này</span>
        <span className="link-green" onClick={() => setReportSlide(s => (s === 0 ? 1 : 0))}>
          Đổi biểu đồ
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
                  <Bar dataKey="value" name="Đã chi" radius={[10, 10, 0, 0]}>
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
        <span className="link-green" onClick={() => nav('/budgets')}>
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
              <b>{item.cat?.name ?? 'Không nhóm'}</b>
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
            <div className="row" key={t.id} onClick={() => setEditTx(t)} style={{ cursor: 'pointer' }}>
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

      {editTx && <TxForm tx={editTx} onClose={() => setEditTx(null)} />}
      {payDraft && <TxForm draft={payDraft} onClose={() => setPayDraft(null)} />}
    </>
  )
}
