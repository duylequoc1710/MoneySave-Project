import { addDays, addMonths, getDaysInMonth, parseISO } from 'date-fns'
import type { Budget, Category, Fund, Tx } from './db.ts'
import { filterReportableTxs, fmtDmy, getCategoryFullName, money, monthKey, monthLabel, ymd } from './lib.ts'

export type InsightTone = 'good' | 'warn' | 'danger' | 'info'

export type InsightActionType =
  | 'set_budget'
  | 'transfer_saving'
  | 'open_expense_report'
  | 'open_detail'

export interface InsightCTA {
  label: string
  actionType: InsightActionType
  categoryId?: number
  suggestedLimit?: number
  suggestedTransferAmount?: number
}

export interface HeroInsightCard {
  id: string
  pillar: 1 | 2 | 3 | 4
  badge: string
  icon: string
  tone: InsightTone
  title: string
  body: string
  metricLabel: string
  metricValue: string
  cta: InsightCTA
}

export interface SpikeAnomalyItem {
  categoryId: number
  categoryName: string
  categoryIcon: string
  categoryColor: string
  currentAmount: number
  normalAverage: number
  multiplier: number
  currentLimit: number | null
  suggestedLimit: number
  headline: string
  detailCopy: string
}

export interface MicroLeakItem {
  categoryId: number
  categoryName: string
  categoryIcon: string
  categoryColor: string
  txCount: number
  totalAmount: number
  avgTicket: number
  workHoursEquivalent: number
  currentLimit: number | null
  suggestedLimit: number
  scopeLabel: string
  headline: string
  detailCopy: string
}

export interface WeekdayBarStat {
  dayIndex: number // 0 = T2 ... 6 = CN
  shortLabel: string
  fullLabel: string
  totalAmount: number
  avgAmount: number
  txCount: number
  isWeekend: boolean
}

export interface SmartInsightsResult {
  monthStr: string // MM/yyyy
  todayStr: string // dd/MM/yyyy
  topCat: {
    id: number
    name: string
    icon: string
    color: string
    amount: number
    pctOfMonth: number
    workHours: number
    currentLimit: number | null
    suggestedLimit: number
  }
  burnRate: {
    thisMonthExpense: number
    thisMonthIncome: number
    lastMonthExpense: number
    avg3MonthsExpense: number
    baselineExpense: number
    elapsedDays: number
    daysInMonth: number
    remainingDays: number
    rawDailyAvgThisMonth: number
    weightedDailyBurn: number
    projectedMonthExpense: number
    projectedVsBaselinePct: number
    monthSoFarDiffPct: number
    timeProgressPct: number
    spendProgressPct: number
    paceIndex: number
    paceStatus: 'safe' | 'watch' | 'overpace'
    headline: string
    copy: string
  }
  anomalies: {
    spikes: SpikeAnomalyItem[]
    microLeaks: MicroLeakItem[]
    summaryCopy: string
  }
  temporal: {
    avgWeekdaySpend: number
    avgWeekendSpend: number
    weekendMultiplier: number
    peakDayLabel: string
    weekdayStats: WeekdayBarStat[]
    paydayDetected: boolean
    lastPaydayDateDmy: string | null
    payday5DaySpend: number
    payday5DaySharePct: number
    weekendHeadline: string
    weekendCopy: string
    paydayCopy: string
  }
  opportunityCost: {
    hasActualIncome: boolean
    monthlyReferenceIncome: number
    hourlyWage: number
    topCatWorkHours: number
    potentialMonthlySaving: number
    compound1YearValue: number
    compound3YearValue: number
    savingFundId: number | undefined
    savingFundName: string
    headline: string
    copy: string
  }
  heroCards: HeroInsightCard[]
}

const WEEKDAY_META: Array<{ shortLabel: string; fullLabel: string; isWeekend: boolean }> = [
  { shortLabel: 'T2', fullLabel: 'Thứ Hai', isWeekend: false },
  { shortLabel: 'T3', fullLabel: 'Thứ Ba', isWeekend: false },
  { shortLabel: 'T4', fullLabel: 'Thứ Tư', isWeekend: false },
  { shortLabel: 'T5', fullLabel: 'Thứ Năm', isWeekend: false },
  { shortLabel: 'T6', fullLabel: 'Thứ Sáu', isWeekend: false },
  { shortLabel: 'T7', fullLabel: 'Thứ Bảy', isWeekend: true },
  { shortLabel: 'CN', fullLabel: 'Chủ Nhật', isWeekend: true },
]

function roundToNearest50k(val: number): number {
  if (val <= 0) return 500_000
  return Math.max(100_000, Math.ceil(val / 50_000) * 50_000)
}

export function computeSmartInsights(params: {
  txs: Tx[]
  funds: Fund[]
  cats: Category[]
  budgets?: Budget[]
  today?: Date
}): SmartInsightsResult {
  const { txs, funds, cats, budgets = [], today = new Date() } = params
  const reportableTxs = filterReportableTxs(txs, funds, 0)
  const cMap = new Map(cats.map(c => [c.id!, c]))
  const bMap = new Map(budgets.map(b => [b.categoryId, b.limit]))

  const thisMonthKey = monthKey(today)
  const lastMonthKey = monthKey(addMonths(today, -1))
  const prev3MonthKeys = [
    monthKey(addMonths(today, -1)),
    monthKey(addMonths(today, -2)),
    monthKey(addMonths(today, -3)),
  ]

  const monthStr = monthLabel(today) // MM/yyyy
  const todayIso = ymd(today)
  const todayStr = fmtDmy(todayIso) // dd/MM/yyyy

  const daysInMonth = getDaysInMonth(today)
  const elapsedDays = Math.max(1, Math.min(daysInMonth, today.getDate()))
  const remainingDays = Math.max(0, daysInMonth - elapsedDays)

  const thisMonthTxs = reportableTxs.filter(
    t => t.date.startsWith(thisMonthKey) && t.date <= todayIso,
  )
  const lastMonthTxs = reportableTxs.filter(t => t.date.startsWith(lastMonthKey))
  const prev3MonthsTxs = reportableTxs.filter(t =>
    prev3MonthKeys.some(k => t.date.startsWith(k)),
  )

  const thisMonthExpense = thisMonthTxs
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0)
  const thisMonthIncome = thisMonthTxs
    .filter(t => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0)
  const lastMonthExpense = lastMonthTxs
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0)

  // Đếm số tháng thực sự có dữ liệu trong 3 tháng trước để tính trung bình chuẩn xác
  const activePrevMonths = prev3MonthKeys.filter(k =>
    prev3MonthsTxs.some(t => t.type === 'expense' && t.date.startsWith(k)),
  ).length
  const prev3TotalExpense = prev3MonthsTxs
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0)
  const avg3MonthsExpense =
    activePrevMonths > 0 ? Math.round(prev3TotalExpense / activePrevMonths) : 0

  // Thu nhập tham chiếu để tính chi phí cơ hội (giờ làm việc)
  const activeIncomeMonths = prev3MonthKeys.filter(k =>
    prev3MonthsTxs.some(t => t.type === 'income' && t.date.startsWith(k)),
  ).length
  const prev3TotalIncome = prev3MonthsTxs
    .filter(t => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0)
  const avgHistoricalIncome =
    activeIncomeMonths > 0 ? Math.round(prev3TotalIncome / activeIncomeMonths) : 0
  const recordedIncome = Math.max(thisMonthIncome, avgHistoricalIncome)
  const hasActualIncome = recordedIncome > 0
  const monthlyReferenceIncome = hasActualIncome ? recordedIncome : 15_000_000
  // Chuẩn 22 ngày công x 8 giờ = 176 giờ/tháng
  const hourlyWage = Math.max(25_000, Math.round(monthlyReferenceIncome / 176))

  // Top nhóm chi tiêu tháng này
  const catSpendThisMonth = new Map<number, number>()
  thisMonthTxs
    .filter(t => t.type === 'expense')
    .forEach(t => {
      const cid = t.categoryId ?? 0
      catSpendThisMonth.set(cid, (catSpendThisMonth.get(cid) ?? 0) + t.amount)
    })

  let topCid = 0
  let topCamt = 0
  catSpendThisMonth.forEach((amt, cid) => {
    if (amt > topCamt) {
      topCamt = amt
      topCid = cid
    }
  })
  const topCatObj = cMap.get(topCid)
  const topCatName = topCatObj
    ? getCategoryFullName(topCatObj, cats)
    : topCamt > 0
      ? 'Chi tiêu khác'
      : 'Chưa phát sinh chi tiêu'
  const topCatLimit = topCid ? (bMap.get(topCid) ?? null) : null
  const topCatSuggestedLimit = roundToNearest50k(
    topCatLimit ? topCatLimit * 1.1 : Math.max(topCamt * 1.5, 1_000_000),
  )

  const topCat = {
    id: topCid,
    name: topCatName,
    icon: topCatObj?.icon ?? '📊',
    color: topCatObj?.color ?? '#28c76f',
    amount: topCamt,
    pctOfMonth:
      thisMonthExpense > 0 ? Math.round((topCamt / thisMonthExpense) * 100) : 0,
    workHours: +(topCamt / hourlyWage).toFixed(1),
    currentLimit: topCatLimit,
    suggestedLimit: topCatSuggestedLimit,
  }

  // ============================================================================
  // TRỤ CỘT 3 (Tính trước để cung cấp trọng số Ngày thường vs Cuối tuần cho Trụ cột 1)
  // ============================================================================
  // Tập dữ liệu phân tích hành vi: gộp tháng này + 3 tháng trước (nếu có)
  const behaviorExpenseTxs = [
    ...prev3MonthsTxs.filter(t => t.type === 'expense'),
    ...thisMonthTxs.filter(t => t.type === 'expense'),
  ]

  const weekdayTotals = [0, 0, 0, 0, 0, 0, 0]
  const weekdayCounts = [0, 0, 0, 0, 0, 0, 0]
  const distinctDatesByDow: Array<Set<string>> = Array.from(
    { length: 7 },
    () => new Set<string>(),
  )

  behaviorExpenseTxs.forEach(t => {
    const d = parseISO(t.date)
    const dowMon0 = (d.getDay() + 6) % 7 // 0 = Thứ 2 ... 6 = Chủ Nhật
    weekdayTotals[dowMon0] += t.amount
    weekdayCounts[dowMon0] += 1
    distinctDatesByDow[dowMon0].add(t.date)
  })

  const totalObservedSpanDays = Math.max(
    elapsedDays + activePrevMonths * 30,
    7,
  )
  const approxWeeks = Math.max(1, totalObservedSpanDays / 7)

  const weekdayStats: WeekdayBarStat[] = WEEKDAY_META.map((meta, idx) => {
    const totalAmount = weekdayTotals[idx]
    const avgAmount = Math.round(totalAmount / approxWeeks)
    return {
      dayIndex: idx,
      shortLabel: meta.shortLabel,
      fullLabel: meta.fullLabel,
      totalAmount,
      avgAmount,
      txCount: weekdayCounts[idx],
      isWeekend: meta.isWeekend,
    }
  })

  const weekdaySum = weekdayTotals.slice(0, 5).reduce((s, x) => s + x, 0)
  const weekendSum = weekdayTotals.slice(5, 7).reduce((s, x) => s + x, 0)
  const avgWeekdaySpend = Math.round(weekdaySum / (approxWeeks * 5))
  const avgWeekendSpend = Math.round(weekendSum / (approxWeeks * 2))
  const weekendMultiplier =
    avgWeekdaySpend > 0
      ? +(avgWeekendSpend / avgWeekdaySpend).toFixed(1)
      : avgWeekendSpend > 0
        ? 2.0
        : 1.0

  let peakDayIdx = 0
  weekdayStats.forEach((st, idx) => {
    if (st.avgAmount > weekdayStats[peakDayIdx].avgAmount) peakDayIdx = idx
  })
  const peakDayLabel =
    weekdayStats[peakDayIdx].totalAmount > 0
      ? weekdayStats[peakDayIdx].fullLabel
      : 'Chủ Nhật'

  // Phát hiện hiệu ứng sau ngày nhận lương (Payday Effect)
  const allIncomes = [
    ...prev3MonthsTxs.filter(t => t.type === 'income' && t.amount >= 1_000_000),
    ...thisMonthTxs.filter(t => t.type === 'income' && t.amount >= 1_000_000),
  ].sort((a, b) => b.date.localeCompare(a.date) || b.amount - a.amount)

  let paydayDetected = false
  let lastPaydayDateDmy: string | null = null
  let payday5DaySpend = 0
  let payday5DaySharePct = 0

  if (allIncomes.length > 0) {
    const latestPayTx = allIncomes[0]
    lastPaydayDateDmy = fmtDmy(latestPayTx.date)
    const payDateObj = parseISO(latestPayTx.date)
    const windowEndIso = ymd(addDays(payDateObj, 5))
    const payMonthKey = latestPayTx.date.slice(0, 7)

    const monthExpTotal = reportableTxs
      .filter(t => t.type === 'expense' && t.date.startsWith(payMonthKey))
      .reduce((s, t) => s + t.amount, 0)

    payday5DaySpend = reportableTxs
      .filter(
        t =>
          t.type === 'expense' &&
          t.date >= latestPayTx.date &&
          t.date <= windowEndIso,
      )
      .reduce((s, t) => s + t.amount, 0)

    if (monthExpTotal > 0 && payday5DaySpend > 0) {
      paydayDetected = true
      payday5DaySharePct = Math.min(
        100,
        Math.round((payday5DaySpend / monthExpTotal) * 100),
      )
    }
  }

  const weekendHeadline =
    weekendMultiplier >= 1.35
      ? `Nhịp chi cuối tuần cao gấp ${weekendMultiplier}x ngày thường`
      : `Nhịp chi tiêu ổn định giữa các ngày trong tuần`
  const weekendCopy =
    weekendMultiplier >= 1.35
      ? `Thống kê cho thấy bạn chi trung bình ${money(avgWeekendSpend)}/ngày vào Thứ 7 & CN (so với ${money(avgWeekdaySpend)}/ngày đi làm). Ngày chi mạnh tay nhất thường là ${peakDayLabel}.`
      : `Chi tiêu ngày cuối tuần (${money(avgWeekendSpend)}/ngày) và ngày thường (${money(avgWeekdaySpend)}/ngày) đang rất cân bằng. Ngày phát sinh cao nhất là ${peakDayLabel}.`

  const paydayCopy = paydayDetected
    ? `Trong 5 ngày ngay sau đợt nhận thu nhập (${lastPaydayDateDmy}), bạn đã chi ${money(payday5DaySpend)} — chiếm ${payday5DaySharePct}% tổng chi của tháng đó.`
    : `Chưa phát sinh hội chứng vung tay sau ngày nhận lương. Mẹo nhỏ: Hãy trích trước 20% thu nhập sang Ví Tiết Kiệm ngay ngày lương về.`

  // ============================================================================
  // TRỤ CỘT 1: DỰ BÁO DÒNG TIỀN & TỐC ĐỘ ĐỐT TIỀN (BURN RATE & PROJECTION)
  // ============================================================================
  let remainingWeekdays = 0
  let remainingWeekendDays = 0
  for (let d = elapsedDays + 1; d <= daysInMonth; d++) {
    const dt = new Date(today.getFullYear(), today.getMonth(), d)
    const dow = dt.getDay()
    if (dow === 0 || dow === 6) remainingWeekendDays++
    else remainingWeekdays++
  }

  const rawDailyAvgThisMonth = Math.round(thisMonthExpense / elapsedDays)
  const totalBudgetLimit = budgets.reduce((s, b) => s + b.limit, 0)
  const baselineExpense =
    avg3MonthsExpense > 0
      ? avg3MonthsExpense
      : lastMonthExpense > 0
        ? lastMonthExpense
        : totalBudgetLimit > 0
          ? totalBudgetLimit
          : thisMonthExpense * (daysInMonth / elapsedDays)

  // Để tránh sai số phóng đại vào những ngày đầu tháng (elapsedDays <= 4),
  // kết hợp nhịp lịch sử Ngày thường / Cuối tuần với tốc độ thực tế của tháng này
  const curMonthWeight = Math.min(1, elapsedDays / 10)
  const histDailyAvg = baselineExpense > 0 ? baselineExpense / daysInMonth : rawDailyAvgThisMonth
  const blendedDailyRate = Math.round(
    rawDailyAvgThisMonth * curMonthWeight + histDailyAvg * (1 - curMonthWeight),
  )

  const rhythmProjectedRemaining =
    avgWeekdaySpend + avgWeekendSpend > 0 && elapsedDays <= 7
      ? remainingWeekdays *
          Math.round(avgWeekdaySpend * (1 - curMonthWeight) + rawDailyAvgThisMonth * curMonthWeight) +
        remainingWeekendDays *
          Math.round(avgWeekendSpend * (1 - curMonthWeight) + rawDailyAvgThisMonth * curMonthWeight)
      : remainingDays * blendedDailyRate

  const projectedMonthExpense = Math.round(thisMonthExpense + rhythmProjectedRemaining)
  const weightedDailyBurn = Math.round(projectedMonthExpense / daysInMonth)

  const projectedVsBaselinePct =
    baselineExpense > 0
      ? Math.round(((projectedMonthExpense - baselineExpense) / baselineExpense) * 100)
      : 0

  const monthSoFarDiffPct =
    lastMonthExpense > 0
      ? Math.round(((thisMonthExpense - lastMonthExpense) / lastMonthExpense) * 100)
      : 0

  const timeProgressPct = Math.round((elapsedDays / daysInMonth) * 100)
  const referenceCap =
    totalBudgetLimit > 0
      ? totalBudgetLimit
      : baselineExpense > 0
        ? baselineExpense
        : Math.max(projectedMonthExpense, 1)
  const spendProgressPct = Math.min(
    150,
    Math.round((thisMonthExpense / Math.max(referenceCap, 1)) * 100),
  )
  const paceIndex = spendProgressPct - timeProgressPct

  const paceStatus: 'safe' | 'watch' | 'overpace' =
    paceIndex > 15 || projectedVsBaselinePct > 15
      ? 'overpace'
      : paceIndex > 5 || projectedVsBaselinePct > 5
        ? 'watch'
        : 'safe'

  const burnHeadline =
    paceStatus === 'overpace'
      ? `Nhịp chi nhanh hơn thời gian (+${Math.max(paceIndex, projectedVsBaselinePct)}%)`
      : paceStatus === 'watch'
        ? `Nhịp chi tiêu đang sát ngưỡng kế hoạch`
        : `Nhịp chi tiêu điều độ & trong tầm kiểm soát`

  const burnCopy =
    elapsedDays <= 3 && baselineExpense > 0
      ? `Tháng ${monthStr} mới qua ${elapsedDays} ngày (đã chi ${money(thisMonthExpense)}). Kết hợp nhịp sinh hoạt 3 tháng trước, dự kiến chốt tháng quanh mức ~${money(projectedMonthExpense)}.`
      : paceStatus === 'overpace'
        ? `Hôm nay là ${todayStr} (${timeProgressPct}% thời gian tháng) nhưng đã dùng ${spendProgressPct}% định mức. Với đà này, dự kiến cuối tháng chạm ~${money(projectedMonthExpense)}.`
        : `Hôm nay là ${todayStr} (${timeProgressPct}% chặng đường tháng ${monthStr}). Với nhịp độ hiện tại, dự báo chốt tháng ở mức ~${money(projectedMonthExpense)} (${projectedVsBaselinePct <= 0 ? `tiết kiệm ${Math.abs(projectedVsBaselinePct)}%` : `cao hơn ${projectedVsBaselinePct}%`} so với trung bình).`

  // ============================================================================
  // TRỤ CỘT 2: PHÁT HIỆN BẤT THƯỜNG (SPIKE) & RÒ RỈ VI MÔ (MICRO-LEAKS)
  // ============================================================================
  const prevCatMonthlyAvg = new Map<number, number>()
  if (activePrevMonths > 0) {
    prev3MonthsTxs
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const cid = t.categoryId ?? 0
        prevCatMonthlyAvg.set(
          cid,
          (prevCatMonthlyAvg.get(cid) ?? 0) + t.amount / activePrevMonths,
        )
      })
  }

  const spikes: SpikeAnomalyItem[] = []
  catSpendThisMonth.forEach((curAmt, cid) => {
    if (curAmt < 200_000) return
    const histMonthAvg = prevCatMonthlyAvg.get(cid) ?? 0
    // Quy đổi mức bình thường theo tỷ lệ số ngày đã qua (tối thiểu 30% tháng để tránh nhiễu ngày đầu)
    const expectedToDate =
      histMonthAvg > 0
        ? histMonthAvg * Math.max(0.3, elapsedDays / daysInMonth)
        : 0
    if (expectedToDate >= 100_000 && curAmt >= expectedToDate * 1.6) {
      const c = cMap.get(cid)
      const cName = c ? getCategoryFullName(c, cats) : 'Không nhóm'
      const mult = +(curAmt / expectedToDate).toFixed(1)
      const curLimit = bMap.get(cid) ?? null
      const suggested = roundToNearest50k(Math.max(curAmt * 1.15, histMonthAvg))
      spikes.push({
        categoryId: cid,
        categoryName: cName,
        categoryIcon: c?.icon ?? '⚡',
        categoryColor: c?.color ?? '#f25551',
        currentAmount: curAmt,
        normalAverage: Math.round(histMonthAvg),
        multiplier: mult,
        currentLimit: curLimit,
        suggestedLimit: suggested,
        headline: `${cName} tăng gấp ${mult}x cùng kỳ`,
        detailCopy: `Đã chi ${money(curAmt)} trong ${elapsedDays} ngày đầu tháng ${monthStr} (mức trung bình cả tháng trước đây là ${money(Math.round(histMonthAvg))}).`,
      })
    }
  })
  spikes.sort((a, b) => b.currentAmount - a.currentAmount)

  // Rò rỉ vi mô (Micro-leaks): Nếu đầu tháng (elapsedDays <= 7) thì quét 30 ngày gần nhất để đủ mẫu hành vi
  const thirtyDaysAgoIso = ymd(addDays(today, -30))
  const useRolling30ForLeaks = elapsedDays <= 7 && prev3MonthsTxs.length > 0
  const leakSourceTxs = useRolling30ForLeaks
    ? reportableTxs.filter(
        t => t.type === 'expense' && t.date >= thirtyDaysAgoIso && t.date <= todayIso,
      )
    : thisMonthTxs.filter(t => t.type === 'expense')
  const leakScopeLabel = useRolling30ForLeaks ? '30 ngày qua' : `tháng ${monthStr}`

  const smallByCat = new Map<number, Tx[]>()
  leakSourceTxs
    .filter(t => t.amount > 0 && t.amount <= 200_000)
    .forEach(t => {
      const cid = t.categoryId ?? 0
      smallByCat.set(cid, [...(smallByCat.get(cid) ?? []), t])
    })

  const microLeaks: MicroLeakItem[] = []
  smallByCat.forEach((list, cid) => {
    const sum = list.reduce((s, t) => s + t.amount, 0)
    if (list.length >= 2 && sum >= 100_000) {
      const c = cMap.get(cid)
      const cName = c ? getCategoryFullName(c, cats) : 'Chi tiêu lặt vặt'
      const avgTicket = Math.round(sum / list.length)
      const hrs = +(sum / hourlyWage).toFixed(1)
      const curLimit = bMap.get(cid) ?? null
      const suggested = roundToNearest50k(Math.max(sum * 1.2, 500_000))
      microLeaks.push({
        categoryId: cid,
        categoryName: cName,
        categoryIcon: c?.icon ?? '☕',
        categoryColor: c?.color ?? '#f59e0b',
        txCount: list.length,
        totalAmount: sum,
        avgTicket,
        workHoursEquivalent: hrs,
        currentLimit: curLimit,
        suggestedLimit: suggested,
        scopeLabel: leakScopeLabel,
        headline: `${list.length} khoản nhỏ tại ${cName} (${money(sum)})`,
        detailCopy: `Các khoản chi lẻ trung bình ${money(avgTicket)}/lần trong ${leakScopeLabel} đã âm thầm cộng dồn thành ${money(sum)} (~${hrs} giờ làm việc).`,
      })
    }
  })
  microLeaks.sort((a, b) => b.totalAmount - a.totalAmount)

  const anomalySummaryCopy =
    spikes.length > 0
      ? `Phát hiện ${spikes.length} nhóm có tốc độ chi tăng đột biến so với nhịp thông thường.`
      : microLeaks.length > 0
        ? `Không có khoản chi đột biến lớn, nhưng có ${microLeaks.length} nhóm chi nhỏ lẻ lặp lại nhiều lần cần lưu ý.`
        : `Chưa phát hiện khoản chi đột biến hay rò rỉ bất thường nào trong kỳ này.`

  // ============================================================================
  // TRỤ CỘT 4: QUY ĐỔI CHI PHÍ CƠ HỘI & HÀNH ĐỘNG CAN THIỆP 1-CHẠM
  // ============================================================================
  const savingFund =
    funds.find(f => !f.archived && (f.excludeFromTotal || /tiết kiệm|saving|đầu tư|invest|tích lũy/i.test(f.name))) ??
    funds.find(f => !f.archived && f.kind !== 'credit')

  const rawSavingRoom =
    baselineExpense > projectedMonthExpense
      ? baselineExpense - projectedMonthExpense
      : topCamt > 0
        ? Math.round(topCamt * 0.2)
        : 500_000
  const potentialMonthlySaving = roundToNearest50k(
    Math.min(Math.max(rawSavingRoom, 200_000), 10_000_000),
  )
  // Lãi kép 6.5%/năm khi tích lũy đều đặn hàng tháng: FV = PMT * [((1 + r)^n - 1) / r]
  const compound1YearValue = Math.round(potentialMonthlySaving * 12.43)
  const compound3YearValue = Math.round(potentialMonthlySaving * 39.72)

  const oppHeadline =
    baselineExpense > projectedMonthExpense && baselineExpense > 0
      ? `Dư địa tiết kiệm dự kiến: +${money(potentialMonthlySaving)}/tháng`
      : `Tối ưu 20% nhóm ${topCat.name} = +${money(potentialMonthlySaving)}/tháng`

  const oppCopy =
    topCamt > 0
      ? `Khoản chi cho "${topCat.name}" (${money(topCamt)}) tương đương ~${topCat.workHours} giờ làm việc. Nếu trích đều đặn ${money(potentialMonthlySaving)}/tháng vào quỹ tích lũy (6.5%/năm), bạn sẽ có ${money(compound1YearValue)} sau 1 năm và ${money(compound3YearValue)} sau 3 năm.`
      : `Nếu duy trì thói quen cất trước ${money(potentialMonthlySaving)}/tháng vào quỹ tích lũy (lãi kép 6.5%/năm), bạn sẽ tạo được quỹ dự phòng ${money(compound1YearValue)} sau 1 năm.`

  // ============================================================================
  // TỔNG HỢP DANH SÁCH HERO INSIGHT CARDS (3 - 4 KỊCH BẢN THỰC TẾ)
  // ============================================================================
  const heroCards: HeroInsightCard[] = []

  // Card 1: Dự báo dòng tiền & Tốc độ chi (Burn Rate)
  heroCards.push({
    id: 'burn-rate',
    pillar: 1,
    badge: 'Dự báo dòng tiền',
    icon: paceStatus === 'overpace' ? '🔥' : paceStatus === 'watch' ? '⏳' : '🧭',
    tone: paceStatus === 'overpace' ? 'danger' : paceStatus === 'watch' ? 'warn' : 'good',
    title: burnHeadline,
    body: burnCopy,
    metricLabel: `Dự báo chốt tháng ${monthStr}`,
    metricValue: `~${money(projectedMonthExpense)}`,
    cta:
      topCid > 0
        ? {
            label: topCatLimit
              ? `🎯 Điều chỉnh trần ${topCat.name}`
              : `🎯 Đặt hạn mức cho ${topCat.name}`,
            actionType: 'set_budget',
            categoryId: topCid,
            suggestedLimit: topCat.suggestedLimit,
          }
        : {
            label: '📊 Xem chi tiết khoản chi',
            actionType: 'open_expense_report',
          },
  })

  // Card 2: Rò rỉ vi mô hoặc Khoản chi đột biến
  if (spikes.length > 0) {
    const sp = spikes[0]
    heroCards.push({
      id: `spike-${sp.categoryId}`,
      pillar: 2,
      badge: 'Phát hiện đột biến',
      icon: sp.categoryIcon,
      tone: 'danger',
      title: `⚡ ${sp.headline}`,
      body: sp.detailCopy,
      metricLabel: 'Mức vượt trung bình',
      metricValue: `${sp.multiplier}x`,
      cta: {
        label: `🔒 Khóa trần ${sp.categoryName} (${money(sp.suggestedLimit)})`,
        actionType: 'set_budget',
        categoryId: sp.categoryId,
        suggestedLimit: sp.suggestedLimit,
      },
    })
  } else if (microLeaks.length > 0) {
    const ml = microLeaks[0]
    heroCards.push({
      id: `leak-${ml.categoryId}`,
      pillar: 2,
      badge: 'Rò rỉ vi mô',
      icon: ml.categoryIcon,
      tone: 'warn',
      title: `☕ ${ml.headline}`,
      body: ml.detailCopy,
      metricLabel: 'Quy đổi công sức',
      metricValue: `~${ml.workHoursEquivalent} giờ làm`,
      cta: {
        label: `🔒 Đặt trần ${ml.categoryName} (${money(ml.suggestedLimit)})`,
        actionType: 'set_budget',
        categoryId: ml.categoryId,
        suggestedLimit: ml.suggestedLimit,
      },
    })
  }

  // Card 3: Nhịp sinh học tài chính (Cuối tuần / Payday)
  heroCards.push({
    id: 'temporal-rhythm',
    pillar: 3,
    badge: 'Nhịp sinh học chi tiêu',
    icon: weekendMultiplier >= 1.35 ? '🌴' : '📅',
    tone: weekendMultiplier >= 1.35 ? 'info' : 'good',
    title: weekendHeadline,
    body: paydayDetected && payday5DaySharePct >= 35 ? paydayCopy : weekendCopy,
    metricLabel: 'Ngày chi cao điểm',
    metricValue: peakDayLabel,
    cta: {
      label: '📈 Xem biểu đồ Thứ 2 – CN',
      actionType: 'open_detail',
    },
  })

  // Card 4: Chi phí cơ hội & Tích lũy 1-chạm
  heroCards.push({
    id: 'opportunity-cost',
    pillar: 4,
    badge: 'Chi phí cơ hội & Lãi kép',
    icon: '🌱',
    tone: 'good',
    title: oppHeadline,
    body: oppCopy,
    metricLabel: 'Tích lũy sau 1 năm (6.5%)',
    metricValue: money(compound1YearValue),
    cta: {
      label: `💸 Cất ngay ${money(potentialMonthlySaving)} sang Tích lũy`,
      actionType: 'transfer_saving',
      suggestedTransferAmount: potentialMonthlySaving,
    },
  })

  return {
    monthStr,
    todayStr,
    topCat,
    burnRate: {
      thisMonthExpense,
      thisMonthIncome,
      lastMonthExpense,
      avg3MonthsExpense,
      baselineExpense: Math.round(baselineExpense),
      elapsedDays,
      daysInMonth,
      remainingDays,
      rawDailyAvgThisMonth,
      weightedDailyBurn,
      projectedMonthExpense,
      projectedVsBaselinePct,
      monthSoFarDiffPct,
      timeProgressPct,
      spendProgressPct,
      paceIndex,
      paceStatus,
      headline: burnHeadline,
      copy: burnCopy,
    },
    anomalies: {
      spikes,
      microLeaks,
      summaryCopy: anomalySummaryCopy,
    },
    temporal: {
      avgWeekdaySpend,
      avgWeekendSpend,
      weekendMultiplier,
      peakDayLabel,
      weekdayStats,
      paydayDetected,
      lastPaydayDateDmy,
      payday5DaySpend,
      payday5DaySharePct,
      weekendHeadline,
      weekendCopy,
      paydayCopy,
    },
    opportunityCost: {
      hasActualIncome,
      monthlyReferenceIncome,
      hourlyWage,
      topCatWorkHours: topCat.workHours,
      potentialMonthlySaving,
      compound1YearValue,
      compound3YearValue,
      savingFundId: savingFund?.id,
      savingFundName: savingFund?.name ?? 'Ví Tiết Kiệm',
      headline: oppHeadline,
      copy: oppCopy,
    },
    heroCards,
  }
}
