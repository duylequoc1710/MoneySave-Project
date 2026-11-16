import { addMonths, getDaysInMonth, parseISO } from 'date-fns'
import type { Budget, Category, Fund, Tx } from './db.ts'
import { filterReportableTxs, fmtDmy, getCategoryFullName, money, monthKey, monthLabel, ymd } from './lib.ts'

/**
 * Smart Insights (v2.18.0) – chỉ dùng số liệu thật của người dùng, không giả định lương/lãi suất.
 * Nguyên tắc: tách "khoản lớn" (tiền nhà, học phí, mua sắm lớn – thường 1 lần/tháng) khỏi "chi hằng ngày",
 * và so với CÙNG KỲ (đến cùng ngày này của các tháng trước) thay vì nhân theo số ngày.
 */

export type InsightTone = 'good' | 'warn' | 'danger' | 'info'

export type InsightActionType = 'set_budget' | 'transfer_saving' | 'open_expense_report' | 'open_detail'

export interface InsightCTA {
  label: string
  actionType: InsightActionType
  categoryId?: number
  suggestedLimit?: number
  suggestedTransferAmount?: number
}

export interface HeroInsightCard {
  id: string
  badge: string
  icon: string
  tone: InsightTone
  title: string
  body: string
  metricLabel: string
  metricValue: string
  cta: InsightCTA
}

export interface CategoryRise {
  categoryId: number
  categoryName: string
  categoryIcon: string
  currentAmount: number // chi hằng ngày của nhóm từ đầu tháng đến hôm nay
  usualAmount: number // trung bình cùng kỳ các tháng trước
  extraAmount: number
  risePct: number
  suggestedLimit: number
}

export interface WeekdayBarStat {
  dayIndex: number // 0 = T2 ... 6 = CN
  shortLabel: string
  fullLabel: string
  avgAmount: number
  isWeekend: boolean
}

export interface SmartInsightsResult {
  monthStr: string // MM/yyyy
  todayStr: string // dd/MM/yyyy
  hasHistory: boolean // có ít nhất 1 tháng trước có chi tiêu
  topCat: {
    id: number
    name: string
    icon: string
    color: string
    amount: number
    pctOfMonth: number
    currentLimit: number | null
    suggestedLimit: number
  }
  forecast: {
    thisMonthExpense: number
    largeThreshold: number
    largeThisMonth: number
    baselineExpense: number // TB cả tháng của tối đa 3 tháng trước
    usualToDate: number // TB đã chi đến cùng ngày này của các tháng trước
    elapsedDays: number
    daysInMonth: number
    dailyRate: number // nhịp chi hằng ngày dùng để dự báo
    expectedLargeRemaining: number // khoản lớn thường có nhưng tháng này chưa phát sinh
    projectedMonthExpense: number
    projectedVsBaselinePct: number
    spendProgressPct: number // đã chi / TB tháng
    usualProgressPct: number // thường lệ đến hôm nay / TB tháng
    paceStatus: 'safe' | 'watch' | 'overpace'
    headline: string
    copy: string
  }
  rises: CategoryRise[]
  net: {
    hasIncome: boolean
    income: number
    expense: number
    netSoFar: number
    projectedNet: number
    suggestedSaving: number
    savingFundId: number | undefined
    savingFundName: string
    copy: string
  }
  weekly: {
    weekdayStats: WeekdayBarStat[]
    avgWeekdaySpend: number
    avgWeekendSpend: number
    weekendMultiplier: number
    peakDayLabel: string
    copy: string
  }
  heroCards: HeroInsightCard[]
}

const WEEKDAY_META: Array<{ shortLabel: string; fullLabel: string; isWeekend: boolean }> = [
  { shortLabel: 'T2', fullLabel: 'Thứ 2', isWeekend: false },
  { shortLabel: 'T3', fullLabel: 'Thứ 3', isWeekend: false },
  { shortLabel: 'T4', fullLabel: 'Thứ 4', isWeekend: false },
  { shortLabel: 'T5', fullLabel: 'Thứ 5', isWeekend: false },
  { shortLabel: 'T6', fullLabel: 'Thứ 6', isWeekend: false },
  { shortLabel: 'T7', fullLabel: 'Thứ 7', isWeekend: true },
  { shortLabel: 'CN', fullLabel: 'Chủ Nhật', isWeekend: true },
]

/** Làm tròn lên bội số 50.000 (tối thiểu 100.000) – chỉ để gợi ý sẵn trong ô hạn mức, người dùng sửa được. */
function roundUp50k(val: number): number {
  return Math.max(100_000, Math.ceil(val / 50_000) * 50_000)
}

const sum = (txs: Tx[]) => txs.reduce((s, t) => s + t.amount, 0)
const dayOf = (iso: string) => Number(iso.slice(8, 10))

export function computeSmartInsights(params: {
  txs: Tx[]
  funds: Fund[]
  cats: Category[]
  budgets?: Budget[]
  today?: Date
}): SmartInsightsResult {
  const { txs, funds, cats, budgets = [], today = new Date() } = params
  const reportable = filterReportableTxs(txs, funds, 0)
  const cMap = new Map(cats.map(c => [c.id!, c]))
  const bMap = new Map(budgets.map(b => [b.categoryId, b.limit]))
  const catName = (cid: number) => {
    const c = cMap.get(cid)
    return c ? getCategoryFullName(c, cats) : 'Không nhóm'
  }

  const monthStr = monthLabel(today)
  const todayIso = ymd(today)
  const todayStr = fmtDmy(todayIso)
  const thisKey = monthKey(today)
  const daysInMonth = getDaysInMonth(today)
  const elapsedDays = Math.min(daysInMonth, today.getDate())
  const remainingDays = daysInMonth - elapsedDays

  const thisMonth = reportable.filter(t => t.date.startsWith(thisKey) && t.date <= todayIso)
  const thisExp = thisMonth.filter(t => t.type === 'expense')
  const thisMonthExpense = sum(thisExp)
  const thisMonthIncome = sum(thisMonth.filter(t => t.type === 'income'))

  // Tối đa 3 tháng trước, chỉ tính tháng có chi tiêu
  const prevMonths = [1, 2, 3]
    .map(i => {
      const d = addMonths(today, -i)
      const key = monthKey(d)
      const dim = getDaysInMonth(d)
      return { key, dim, exp: reportable.filter(t => t.type === 'expense' && t.date.startsWith(key)) }
    })
    .filter(m => m.exp.length > 0)
  const hasHistory = prevMonths.length > 0
  const n = Math.max(1, prevMonths.length)
  const baselineExpense = hasHistory ? Math.round(prevMonths.reduce((s, m) => s + sum(m.exp), 0) / n) : 0

  // Khoản lớn: từ 1 triệu hoặc từ 10% mức chi tháng thường lệ (lấy mức cao hơn)
  const largeThreshold = Math.max(1_000_000, Math.round(baselineExpense * 0.1))
  const isLarge = (t: Tx) => t.amount >= largeThreshold
  const toDay = (m: { dim: number }) => Math.min(elapsedDays, m.dim) // "cùng kỳ" của tháng ngắn hơn

  const usualToDate = hasHistory
    ? Math.round(prevMonths.reduce((s, m) => s + sum(m.exp.filter(t => dayOf(t.date) <= toDay(m))), 0) / n)
    : 0
  const histLargeAvg = prevMonths.reduce((s, m) => s + sum(m.exp.filter(isLarge)), 0) / n
  const histDays = prevMonths.reduce((s, m) => s + m.dim, 0)
  const histDailyRate = histDays ? prevMonths.reduce((s, m) => s + sum(m.exp.filter(t => !isLarge(t))), 0) / histDays : 0

  const largeThisMonth = sum(thisExp.filter(isLarge))
  const curDailyRate = (thisMonthExpense - largeThisMonth) / elapsedDays
  // Đầu tháng ít dữ liệu → pha nhịp thường lệ; từ ngày 10 dùng hoàn toàn nhịp tháng này
  const w = hasHistory ? Math.min(1, elapsedDays / 10) : 1
  const dailyRate = Math.round(curDailyRate * w + histDailyRate * (1 - w))
  const expectedLargeRemaining = hasHistory ? Math.max(0, Math.round(histLargeAvg - largeThisMonth)) : 0
  const projectedMonthExpense = Math.round(thisMonthExpense + dailyRate * remainingDays + expectedLargeRemaining)
  const projectedVsBaselinePct =
    baselineExpense > 0 ? Math.round(((projectedMonthExpense - baselineExpense) / baselineExpense) * 100) : 0
  const paceStatus: 'safe' | 'watch' | 'overpace' =
    projectedVsBaselinePct > 15 ? 'overpace' : projectedVsBaselinePct > 5 ? 'watch' : 'safe'
  const spendProgressPct = baselineExpense > 0 ? Math.min(150, Math.round((thisMonthExpense / baselineExpense) * 100)) : 0
  const usualProgressPct =
    baselineExpense > 0 ? Math.round((usualToDate / baselineExpense) * 100) : Math.round((elapsedDays / daysInMonth) * 100)

  const forecastHeadline = !hasHistory
    ? 'Chưa có tháng trước để so sánh'
    : paceStatus === 'overpace'
      ? `Dự kiến chi cao hơn thường lệ ${projectedVsBaselinePct}%`
      : paceStatus === 'watch'
        ? 'Chi tiêu hơi cao hơn thường lệ'
        : 'Chi tiêu trong mức thường lệ'
  const largeNote = largeThisMonth > 0 ? ` Trong đó khoản lớn (từ ${money(largeThreshold)}): ${money(largeThisMonth)}.` : ''
  const forecastCopy = hasHistory
    ? `Đến ${todayStr} đã chi ${money(thisMonthExpense)} (cùng kỳ các tháng trước: ${money(usualToDate)}).${largeNote} Dự kiến cả tháng ~${money(projectedMonthExpense)}, trung bình 3 tháng trước ${money(baselineExpense)}.`
    : `Đến ${todayStr} đã chi ${money(thisMonthExpense)}.${largeNote} Nếu giữ nhịp chi hằng ngày hiện tại, cả tháng khoảng ~${money(projectedMonthExpense)} (ước tính thô vì chưa có tháng trước).`

  // Nhóm chi nhiều nhất tháng này
  const catSpend = new Map<number, number>()
  for (const t of thisExp) catSpend.set(t.categoryId ?? 0, (catSpend.get(t.categoryId ?? 0) ?? 0) + t.amount)
  let topCid = 0
  let topAmt = 0
  catSpend.forEach((amt, cid) => {
    if (amt > topAmt) [topAmt, topCid] = [amt, cid]
  })
  const histCatMonthAvg = (cid: number) =>
    prevMonths.reduce((s, m) => s + sum(m.exp.filter(t => (t.categoryId ?? 0) === cid)), 0) / n
  const suggestLimit = (cid: number, fallback: number) => bMap.get(cid) ?? roundUp50k(histCatMonthAvg(cid) || fallback)
  const topCatObj = cMap.get(topCid)
  const topCat = {
    id: topCid,
    name: topCatObj ? catName(topCid) : topAmt > 0 ? 'Không nhóm' : 'Chưa phát sinh chi tiêu',
    icon: topCatObj?.icon ?? '📊',
    color: topCatObj?.color ?? '#28c76f',
    amount: topAmt,
    pctOfMonth: thisMonthExpense > 0 ? Math.round((topAmt / thisMonthExpense) * 100) : 0,
    currentLimit: topCid ? (bMap.get(topCid) ?? null) : null,
    suggestedLimit: suggestLimit(topCid, topAmt),
  }

  // Nhóm chi hằng ngày tăng so với cùng kỳ (không tính khoản lớn; cần ≥ 5 ngày để bớt nhiễu)
  const rises: CategoryRise[] = []
  if (hasHistory && elapsedDays >= 5) {
    const curByCat = new Map<number, number>()
    for (const t of thisExp) if (!isLarge(t)) curByCat.set(t.categoryId ?? 0, (curByCat.get(t.categoryId ?? 0) ?? 0) + t.amount)
    curByCat.forEach((cur, cid) => {
      const usual =
        prevMonths.reduce(
          (s, m) => s + sum(m.exp.filter(t => (t.categoryId ?? 0) === cid && !isLarge(t) && dayOf(t.date) <= toDay(m))),
          0,
        ) / n
      if (usual <= 0 || cur < 300_000 || cur < usual * 1.4 || cur - usual < 200_000) return
      rises.push({
        categoryId: cid,
        categoryName: catName(cid),
        categoryIcon: cMap.get(cid)?.icon ?? '📈',
        currentAmount: cur,
        usualAmount: Math.round(usual),
        extraAmount: Math.round(cur - usual),
        risePct: Math.round(((cur - usual) / usual) * 100),
        suggestedLimit: suggestLimit(cid, cur),
      })
    })
    rises.sort((a, b) => b.extraAmount - a.extraAmount)
  }

  // Thu – chi tháng này (chỉ khi có ghi thu nhập)
  const savingFund =
    funds.find(f => !f.archived && (f.excludeFromTotal || /tiết kiệm|saving|đầu tư|invest|tích lũy/i.test(f.name))) ??
    funds.find(f => !f.archived && f.kind !== 'credit')
  const netSoFar = thisMonthIncome - thisMonthExpense
  const projectedNet = thisMonthIncome - projectedMonthExpense
  const suggestedSaving = thisMonthIncome > 0 && projectedNet >= 500_000 ? Math.floor(projectedNet / 100_000) * 100_000 : 0
  const netCopy =
    thisMonthIncome > 0
      ? `Tháng ${monthStr}: thu ${money(thisMonthIncome)}, đã chi ${money(thisMonthExpense)}, hiện còn ${money(netSoFar)}. Nếu chi tiếp như dự báo, cuối tháng ${projectedNet >= 0 ? `còn khoảng ${money(projectedNet)}` : `thiếu khoảng ${money(-projectedNet)}`}.`
      : `Chưa ghi thu nhập tháng ${monthStr}. Ghi khoản lương/thu nhập để xem tháng này còn dư bao nhiêu.`

  // Nhịp chi trong tuần: chỉ chi hằng ngày, chia đúng số lần mỗi thứ xuất hiện trong khoảng quan sát
  const startIso = hasHistory ? `${prevMonths[prevMonths.length - 1].key}-01` : `${thisKey}-01`
  const dowCount = [0, 0, 0, 0, 0, 0, 0]
  for (let d = parseISO(startIso); ymd(d) <= todayIso; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1))
    dowCount[(d.getDay() + 6) % 7]++
  const dowTotal = [0, 0, 0, 0, 0, 0, 0]
  for (const t of reportable)
    if (t.type === 'expense' && !isLarge(t) && t.date >= startIso && t.date <= todayIso) dowTotal[(parseISO(t.date).getDay() + 6) % 7] += t.amount
  const weekdayStats: WeekdayBarStat[] = WEEKDAY_META.map((m, i) => ({
    dayIndex: i,
    ...m,
    avgAmount: dowCount[i] ? Math.round(dowTotal[i] / dowCount[i]) : 0,
  }))
  const avgOf = (idx: number[]) => {
    const c = idx.reduce((s, i) => s + dowCount[i], 0)
    return c ? Math.round(idx.reduce((s, i) => s + dowTotal[i], 0) / c) : 0
  }
  const avgWeekdaySpend = avgOf([0, 1, 2, 3, 4])
  const avgWeekendSpend = avgOf([5, 6])
  const weekendMultiplier = avgWeekdaySpend > 0 ? +(avgWeekendSpend / avgWeekdaySpend).toFixed(1) : 1
  const peak = weekdayStats.reduce((a, b) => (b.avgAmount > a.avgAmount ? b : a))
  const peakDayLabel = peak.avgAmount > 0 ? peak.fullLabel : '—'
  const weeklyCopy =
    weekendMultiplier >= 1.3
      ? `Chi hằng ngày (không tính khoản lớn) vào T7–CN trung bình ${money(avgWeekendSpend)}/ngày, gấp ${weekendMultiplier} lần ngày thường (${money(avgWeekdaySpend)}/ngày). Ngày chi nhiều nhất: ${peakDayLabel}.`
      : `Chi hằng ngày (không tính khoản lớn) khá đều: ngày thường ${money(avgWeekdaySpend)}/ngày, cuối tuần ${money(avgWeekendSpend)}/ngày. Ngày chi nhiều nhất: ${peakDayLabel}.`

  // Thẻ nhận định ở Tổng quan
  const heroCards: HeroInsightCard[] = [
    {
      id: 'forecast',
      badge: 'Dự báo cuối tháng',
      icon: paceStatus === 'overpace' ? '🔥' : paceStatus === 'watch' ? '⏳' : '🧭',
      tone: !hasHistory ? 'info' : paceStatus === 'overpace' ? 'danger' : paceStatus === 'watch' ? 'warn' : 'good',
      title: forecastHeadline,
      body: forecastCopy,
      metricLabel: 'Dự kiến cả tháng',
      metricValue: `~${money(projectedMonthExpense)}`,
      cta:
        topCid > 0
          ? {
              label: topCat.currentLimit ? `🎯 Sửa hạn mức ${topCat.name}` : `🎯 Đặt hạn mức cho ${topCat.name}`,
              actionType: 'set_budget',
              categoryId: topCid,
              suggestedLimit: topCat.suggestedLimit,
            }
          : { label: '📊 Xem báo cáo chi', actionType: 'open_expense_report' },
    },
  ]
  if (rises.length > 0) {
    const r = rises[0]
    heroCards.push({
      id: `rise-${r.categoryId}`,
      badge: 'Tăng so với cùng kỳ',
      icon: r.categoryIcon,
      tone: 'warn',
      title: `${r.categoryName} cao hơn thường lệ ${money(r.extraAmount)}`,
      body: `Đến ${todayStr} đã chi ${money(r.currentAmount)} cho ${r.categoryName} (không tính khoản lớn); cùng kỳ các tháng trước trung bình ${money(r.usualAmount)}.`,
      metricLabel: 'So với cùng kỳ',
      metricValue: `+${r.risePct}%`,
      cta: { label: `🎯 Hạn mức ${r.categoryName}`, actionType: 'set_budget', categoryId: r.categoryId, suggestedLimit: r.suggestedLimit },
    })
  }
  if (thisMonthIncome > 0) {
    heroCards.push({
      id: 'net',
      badge: 'Thu – chi tháng này',
      icon: projectedNet >= 0 ? '🌱' : '⚠️',
      tone: projectedNet >= 0 ? 'good' : 'danger',
      title: projectedNet >= 0 ? `Dự kiến cuối tháng còn dư ~${money(projectedNet)}` : `Dự kiến chi vượt thu ~${money(-projectedNet)}`,
      body: netCopy,
      metricLabel: 'Hiện còn',
      metricValue: money(netSoFar),
      cta:
        suggestedSaving > 0
          ? {
              label: `💸 Chuyển ${money(suggestedSaving)} vào ${savingFund?.name ?? 'tiết kiệm'}`,
              actionType: 'transfer_saving',
              suggestedTransferAmount: suggestedSaving,
            }
          : { label: '📊 Xem báo cáo chi', actionType: 'open_expense_report' },
    })
  }

  return {
    monthStr,
    todayStr,
    hasHistory,
    topCat,
    forecast: {
      thisMonthExpense,
      largeThreshold,
      largeThisMonth,
      baselineExpense,
      usualToDate,
      elapsedDays,
      daysInMonth,
      dailyRate,
      expectedLargeRemaining,
      projectedMonthExpense,
      projectedVsBaselinePct,
      spendProgressPct,
      usualProgressPct,
      paceStatus,
      headline: forecastHeadline,
      copy: forecastCopy,
    },
    rises,
    net: {
      hasIncome: thisMonthIncome > 0,
      income: thisMonthIncome,
      expense: thisMonthExpense,
      netSoFar,
      projectedNet,
      suggestedSaving,
      savingFundId: savingFund?.id,
      savingFundName: savingFund?.name ?? 'Ví Tiết Kiệm',
      copy: netCopy,
    },
    weekly: { weekdayStats, avgWeekdaySpend, avgWeekendSpend, weekendMultiplier, peakDayLabel, copy: weeklyCopy },
    heroCards,
  }
}
