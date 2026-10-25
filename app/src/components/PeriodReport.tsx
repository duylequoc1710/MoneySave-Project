import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { addMonths, endOfMonth, format, getDaysInMonth, startOfMonth } from 'date-fns'
import { type Category, type Fund, type Tx } from '../db'
import {
  effectOn,
  filterReportableTxs,
  getCategoryFullName,
  getIncludedFunds,
  money,
  monthKey,
  resolveTimeRange,
  type TimeFilter,
  ymd,
} from '../lib'
import { WalletSelectorPill } from './WalletPickerModal'
import TimeRangeModal from './TimeRangeModal'
import TxDetailModal from './TxDetailModal'
import TxForm, { type TxFormDraft } from './TxForm'

interface Props {
  cur: Date
  setCur: (d: Date) => void
  timeFilter?: TimeFilter
  setTimeFilter?: (f: TimeFilter) => void
  fundFilter: number
  setFundFilter: (id: number) => void
  allTxs: Tx[]
  funds: Fund[]
  cats: Category[]
  onClose: () => void
  initialScreen?: 'main' | 'expense' | 'income'
}

interface CatSummary {
  id: number
  name: string
  icon: string
  color: string
  amount: number
  pct: number
  txs: Tx[]
}

interface WeekBucket {
  label: string
  fromDay: number
  toDay: number
  amount: number
  txs: Tx[]
}

/**
 * Chia tháng thành các cụm ngày theo tuần lịch (Thứ Hai -> Chủ Nhật), ví dụ: 1-4, 5-11, 12-18, 19-24
 */
function buildCalendarWeekBuckets(curMonth: Date, today: Date, monthTxs: Tx[], type: 'expense' | 'income'): WeekBucket[] {
  const year = curMonth.getFullYear()
  const month = curMonth.getMonth()
  const totalDays = getDaysInMonth(curMonth)
  const isCurrentMonth = monthKey(curMonth) === monthKey(today)
  const maxDay = isCurrentMonth ? Math.min(totalDays, today.getDate()) : totalDays

  const buckets: WeekBucket[] = []
  let startDay = 1

  while (startDay <= maxDay) {
    let endDay = startDay
    while (endDay < maxDay) {
      const d = new Date(year, month, endDay)
      // getDay() === 0 là Chủ Nhật -> kết thúc cụm tuần
      if (d.getDay() === 0) break
      endDay++
    }
    const mStr = format(curMonth, 'yyyy-MM')
    const fromYmd = `${mStr}-${String(startDay).padStart(2, '0')}`
    const toYmd = `${mStr}-${String(endDay).padStart(2, '0')}`
    const rangeTxs = monthTxs.filter(t => t.type === type && t.date >= fromYmd && t.date <= toYmd)
    const amount = rangeTxs.reduce((s, t) => s + t.amount, 0)
    buckets.push({
      label: startDay === endDay ? `${startDay}` : `${startDay}-${endDay}`,
      fromDay: startDay,
      toDay: endDay,
      amount,
      txs: rangeTxs,
    })
    startDay = endDay + 1
  }
  return buckets
}

function DonutWithBadges({
  items,
  emptyColor = '#2b3648',
  size = 210,
}: {
  items: CatSummary[]
  emptyColor?: string
  size?: number
}) {
  const data =
    items.length > 0
      ? items.map(i => ({ name: i.name, value: i.amount, color: i.color, icon: i.icon, pct: i.pct }))
      : [{ name: 'Trống', value: 1, color: emptyColor, icon: '💵', pct: 0 }]

  // Tính toạ độ badge cho tối đa 4 nhóm lớn nhất quanh vòng donut
  const badges = useMemo(() => {
    if (items.length === 0) return []
    const total = items.reduce((s, i) => s + i.amount, 0)
    if (total <= 0) return []
    let accAngle = -90 // bắt đầu từ đỉnh 12h
    return items.slice(0, 4).map(item => {
      const sweep = (item.amount / total) * 360
      const midAngle = accAngle + sweep / 2
      accAngle += sweep
      const rad = (midAngle * Math.PI) / 180
      const rInnerLine = size * 0.33
      const rOuterLine = size * 0.39
      const rBadge = size * 0.44
      return {
        ...item,
        x1: Math.cos(rad) * rInnerLine,
        y1: Math.sin(rad) * rInnerLine,
        x2: Math.cos(rad) * rOuterLine,
        y2: Math.sin(rad) * rOuterLine,
        x: Math.cos(rad) * rBadge,
        y: Math.sin(rad) * rBadge,
      }
    })
  }, [items, size])

  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            cx="50%"
            cy="50%"
            startAngle={90}
            endAngle={-270}
            innerRadius={size * 0.22}
            outerRadius={size * 0.33}
            stroke="none"
            paddingAngle={items.length > 1 ? 1 : 0}
            isAnimationActive={false}
          >
            {data.map((entry, idx) => (
              <Cell key={idx} fill={entry.color} />
            ))}
          </Pie>
          {/* Vòng trong tạo hiệu ứng chiều sâu giống MoneyLover */}
          <Pie
            data={data}
            dataKey="value"
            cx="50%"
            cy="50%"
            startAngle={90}
            endAngle={-270}
            innerRadius={size * 0.17}
            outerRadius={size * 0.225}
            stroke="none"
            isAnimationActive={false}
          >
            {data.map((entry, idx) => (
              <Cell key={idx} fill={entry.color} fillOpacity={0.55} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      <svg
        width={size}
        height={size}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      >
        {badges.map(b => (
          <line
            key={b.id}
            x1={size / 2 + b.x1}
            y1={size / 2 + b.y1}
            x2={size / 2 + b.x2}
            y2={size / 2 + b.y2}
            stroke={b.color}
            strokeWidth={1.5}
          />
        ))}
      </svg>

      {badges.map(b => (
        <div
          key={b.id}
          style={{
            position: 'absolute',
            left: `calc(50% + ${Math.round(b.x)}px)`,
            top: `calc(50% + ${Math.round(b.y)}px)`,
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            flexDirection: b.x < -10 ? 'row-reverse' : 'row',
            alignItems: 'center',
            gap: 4,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <span
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: b.color,
              display: 'grid',
              placeItems: 'center',
              fontSize: 14,
              boxShadow: '0 2px 8px #0006',
            }}
          >
            {b.icon}
          </span>
          <b style={{ fontSize: 12, color: b.color }}>{b.pct}%</b>
        </div>
      ))}
    </div>
  )
}

export default function PeriodReport({
  cur,
  setCur,
  timeFilter,
  setTimeFilter,
  fundFilter,
  setFundFilter,
  allTxs,
  funds,
  cats,
  onClose,
  initialScreen = 'main',
}: Props) {
  const [screen, setScreen] = useState<'main' | 'expense' | 'income'>(initialScreen)
  const [subMode, setSubMode] = useState<'detail' | 'trend'>('detail')
  const [showAvgCompare, setShowAvgCompare] = useState(true)
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [showTimeModal, setShowTimeModal] = useState(false)
  const [viewingTx, setViewingTx] = useState<Tx | null>(null)
  const [editTx, setEditTx] = useState<Tx | null>(null)
  const [draftTx, setDraftTx] = useState<TxFormDraft | null>(null)
  const [today] = useState(() => new Date())
  const nowMonth = useMemo(() => startOfMonth(today), [today])

  const effectiveFilter: TimeFilter = useMemo(
    () =>
      timeFilter ?? {
        mode: 'month',
        month: cur,
        startDate: ymd(startOfMonth(cur)),
        endDate: ymd(endOfMonth(cur)),
      },
    [timeFilter, cur],
  )

  const resolvedRange = useMemo(() => resolveTimeRange(effectiveFilter, today), [effectiveFilter, today])

  const fMap = useMemo(() => new Map(funds.map(f => [f.id!, f])), [funds])
  const cMap = useMemo(() => new Map(cats.map(c => [c.id!, c])), [cats])

  const from = resolvedRange.from
  const to = resolvedRange.to

  function updateMonth(nextM: Date) {
    setCur(nextM)
    if (setTimeFilter) {
      setTimeFilter({
        mode: 'month',
        month: nextM,
        startDate: ymd(startOfMonth(nextM)),
        endDate: ymd(endOfMonth(nextM)),
      })
    }
  }

  const activeFunds = useMemo(() => getIncludedFunds(funds, fundFilter), [funds, fundFilter])
  const effectOnSelection = (t: Tx) => activeFunds.reduce((s, f) => s + effectOn(t, f.id!), 0)

  const currentTotalBalance = useMemo(() => {
    const init = activeFunds.reduce((s, f) => s + f.initialBalance, 0)
    return init + allTxs.reduce((s, t) => s + effectOnSelection(t), 0)
  }, [activeFunds, allTxs])

  const { openingBalance, closingBalance } = useMemo(() => {
    const init = activeFunds.reduce((s, f) => s + f.initialBalance, 0)
    const before = allTxs.filter(t => t.date < from).reduce((s, t) => s + effectOnSelection(t), 0)
    const inMonth = allTxs
      .filter(t => t.date >= from && t.date <= to)
      .reduce((s, t) => s + effectOnSelection(t), 0)
    return { openingBalance: init + before, closingBalance: init + before + inMonth }
  }, [activeFunds, allTxs, from, to])

  // Chỉ lấy các giao dịch được phép đưa vào báo cáo (loại bỏ ví "Không tính vào tổng" khi xem Tổng cộng và giao dịch "Không tính vào báo cáo")
  const reportableTxs = useMemo(() => filterReportableTxs(allTxs, funds, fundFilter), [allTxs, funds, fundFilter])

  const monthTxs = useMemo(
    () => reportableTxs.filter(t => t.date >= from && t.date <= to),
    [reportableTxs, from, to],
  )

  const totalIncome = monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const netIncome = totalIncome - totalExpense
  const maxBar = Math.max(totalIncome, totalExpense, 1)

  const groupByCategory = (type: 'expense' | 'income'): CatSummary[] => {
    const filtered = monthTxs.filter(t => t.type === type)
    const total = filtered.reduce((s, t) => s + t.amount, 0)
    const map = new Map<number, Tx[]>()
    filtered.forEach(t => {
      const cid = t.categoryId ?? 0
      map.set(cid, [...(map.get(cid) ?? []), t])
    })
    return [...map.entries()]
      .map(([cid, list]) => {
        const c = cMap.get(cid)
        const amount = list.reduce((s, t) => s + t.amount, 0)
        return {
          id: cid,
          name: c ? getCategoryFullName(c, cats) : 'Không nhóm',
          icon: c?.icon ?? (type === 'income' ? '💵' : '📦'),
          color: c?.color ?? (type === 'income' ? '#1d9bf0' : '#f0534f'),
          amount,
          pct: total > 0 ? Math.round((amount / total) * 100) : 0,
          txs: list.sort((a, b) => b.date.localeCompare(a.date)),
        }
      })
      .sort((a, b) => b.amount - a.amount)
  }

  const incomeCats = useMemo(() => groupByCategory('income'), [monthTxs, cMap])
  const expenseCats = useMemo(() => groupByCategory('expense'), [monthTxs, cMap])

  // Trung bình 3 tháng trước cho Khoản chi & Khoản thu
  const { avg3Expense, avg3Income } = useMemo(() => {
    const mKeys = [monthKey(addMonths(cur, -1)), monthKey(addMonths(cur, -2)), monthKey(addMonths(cur, -3))]
    const prev3 = reportableTxs.filter(t => mKeys.some(k => t.date.startsWith(k)))
    const expSum = prev3.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    const incSum = prev3.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    return { avg3Expense: expSum / 3, avg3Income: incSum / 3 }
  }, [reportableTxs, cur])

  const isCurrentMonth = monthKey(cur) === monthKey(today)
  const elapsedDays = isCurrentMonth ? Math.max(1, today.getDate()) : getDaysInMonth(cur)

  const prev2M = addMonths(nowMonth, -2)
  const prev1M = addMonths(nowMonth, -1)
  const curK = monthKey(cur)

  const renderMonthBar = () =>
    resolvedRange.isMonthMode ? (
      <div className="ml-month-tabs">
        <button className="m-arrow" onClick={() => updateMonth(addMonths(cur, -1))}>
          ‹
        </button>
        <button
          className={`m-tab ${curK === monthKey(prev2M) || cur < prev2M ? 'active' : ''}`}
          onClick={() => updateMonth(prev2M)}
        >
          {cur < prev2M ? format(cur, 'MM/yyyy') : format(prev2M, 'MM/yyyy')}
        </button>
        <button
          className={`m-tab ${curK === monthKey(prev1M) ? 'active' : ''}`}
          onClick={() => updateMonth(prev1M)}
        >
          THÁNG TRƯỚC
        </button>
        <button
          className={`m-tab ${curK === monthKey(nowMonth) || cur > nowMonth ? 'active' : ''}`}
          onClick={() => updateMonth(nowMonth)}
        >
          {cur > nowMonth ? format(cur, 'MM/yyyy') : 'THÁNG NÀY'}
        </button>
        <button className="m-arrow" onClick={() => updateMonth(addMonths(cur, 1))}>
          ›
        </button>
      </div>
    ) : (
      <div className="active-range-banner">
        <span onClick={() => setShowTimeModal(true)} style={{ cursor: 'pointer' }}>
          📅 <b>{resolvedRange.label}</b>
        </span>
        <button
          type="button"
          className="range-reset-btn"
          onClick={() => updateMonth(nowMonth)}
        >
          ✕ Về theo tháng
        </button>
      </div>
    )

  if (screen === 'expense' || screen === 'income') {
    const isExp = screen === 'expense'
    const total = isExp ? totalExpense : totalIncome
    const avgDaily = total / elapsedDays
    const avg3M = isExp ? avg3Expense : avg3Income
    const catList = isExp ? expenseCats : incomeCats
    const weekBuckets = buildCalendarWeekBuckets(cur, today, monthTxs, screen)
    const accentColor = isExp ? '#f0534f' : '#1d9bf0'

    return (
      <div className="period-report-overlay">
        <div className="period-report-shell">
          <div className="ledger-topbar">
            <button
              className="circle-pill-btn"
              onClick={() => {
                setExpandedKey(null)
                setScreen('main')
              }}
            >
              ‹
            </button>
            <b style={{ fontSize: 17 }}>{isExp ? 'Chi tiết khoản chi' : 'Chi tiết khoản thu'}</b>
            <button
              className="circle-pill-btn"
              onClick={() => setShowTimeModal(true)}
              title="Chọn khoảng thời gian"
            >
              📅
            </button>
          </div>

          {renderMonthBar()}

          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '10px 4px 14px' }}>
            <div>
              <div className="mut" style={{ fontSize: 13 }}>
                Tổng cộng
              </div>
              <b style={{ fontSize: 20, color: accentColor }}>{money(total)}</b>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="mut" style={{ fontSize: 13 }}>
                Trung bình hàng ngày
              </div>
              <b style={{ fontSize: 20, color: accentColor }}>
                {new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(avgDaily)} ₫
              </b>
            </div>
          </div>

          {/* Card So sánh với trung bình 3 tháng trước */}
          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>
                So sánh với trung bình 3<br />
                tháng trước <span className="mut">?</span>
              </div>
              {showAvgCompare && (
                <div className="mut" style={{ fontSize: 18, fontWeight: 600 }}>
                  {new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(avg3M)} ₫
                </div>
              )}
            </div>
            <button
              onClick={() => setShowAvgCompare(v => !v)}
              style={{
                background: 'none',
                border: 0,
                color: 'var(--acc)',
                fontWeight: 600,
                fontSize: 15,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>👁</span> {showAvgCompare ? 'Hiện' : 'Ẩn'}
            </button>
          </div>

          {/* Chuyển đổi Chi tiết / Xu hướng */}
          <div className="seg" style={{ margin: '14px 0 18px' }}>
            <button className={subMode === 'detail' ? 'on' : ''} onClick={() => setSubMode('detail')}>
              Chi tiết
            </button>
            <button className={subMode === 'trend' ? 'on' : ''} onClick={() => setSubMode('trend')}>
              Xu hướng
            </button>
          </div>

          {subMode === 'detail' ? (
            <>
              <div style={{ margin: '10px 0 20px' }}>
                <DonutWithBadges items={catList} size={240} />
              </div>

              <div className="card" style={{ padding: '4px 16px' }}>
                {catList.length === 0 && <div className="empty">Chưa có phát sinh trong giai đoạn này</div>}
                {catList.map(c => {
                  const key = `cat-${c.id}`
                  const isOpen = expandedKey === key
                  return (
                    <div key={c.id} style={{ borderBottom: '1px solid var(--bd)' }}>
                      <div
                        className="row"
                        style={{ borderBottom: 0, cursor: 'pointer' }}
                        onClick={() => setExpandedKey(isOpen ? null : key)}
                      >
                        <div className="ico round" style={{ background: c.color }}>
                          {c.icon}
                        </div>
                        <div className="grow">
                          <b style={{ fontSize: 16 }}>{c.name}</b>
                        </div>
                        <b style={{ fontSize: 16, color: accentColor }}>{money(c.amount)}</b>
                        <span className="mut" style={{ fontSize: 18, marginLeft: 4 }}>
                          {isOpen ? '⌄' : '›'}
                        </span>
                      </div>
                      {isOpen && (
                        <div style={{ padding: '0 0 10px 54px' }}>
                          {c.txs.map(t => (
                            <div
                              key={t.id}
                              onClick={() => setViewingTx(t)}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: 13,
                                padding: '6px 0',
                                cursor: 'pointer',
                              }}
                              className="mut"
                            >
                              <span>
                                {format(new Date(t.date), 'dd/MM')} · {t.note || fMap.get(t.fundId)?.name}
                              </span>
                              <b>{money(t.amount)}</b>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <>
              <div className="card" style={{ paddingTop: 18 }}>
                <div style={{ width: '100%', height: 220 }}>
                  <ResponsiveContainer>
                    <BarChart data={weekBuckets} margin={{ left: 6, right: 8, top: 8, bottom: 8 }}>
                      <CartesianGrid vertical={false} stroke="#8884" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} angle={-35} textAnchor="end" height={36} />
                      <YAxis tickFormatter={v => new Intl.NumberFormat('en-US').format(Number(v))} tick={{ fontSize: 11 }} width={72} />
                      <Tooltip
                        cursor={{ fill: 'rgba(148, 163, 184, 0.1)', radius: 6 }}
                        contentStyle={{
                          background: 'var(--card)',
                          border: '1px solid var(--bd)',
                          borderRadius: 12,
                          boxShadow: '0 8px 24px #0006',
                          color: 'var(--fg)',
                          fontSize: 13,
                        }}
                        labelStyle={{ color: 'var(--mut)', fontWeight: 600, marginBottom: 4 }}
                        itemStyle={{ color: accentColor, fontWeight: 700 }}
                        labelFormatter={lbl => `Ngày ${lbl}/${format(cur, 'MM')}`}
                        formatter={v => [money(Number(v)), isExp ? 'Khoản chi' : 'Khoản thu']}
                      />
                      {showAvgCompare && avg3M > 0 && (
                        <ReferenceLine
                          y={Math.round(avg3M / 4)}
                          stroke="#8e98a4"
                          strokeDasharray="4 4"
                        />
                      )}
                      <Bar
                        dataKey="amount"
                        name={isExp ? 'Khoản chi' : 'Khoản thu'}
                        fill={accentColor}
                        radius={[4, 4, 0, 0]}
                        barSize={52}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card" style={{ padding: '4px 16px' }}>
                {weekBuckets.map(b => {
                  const key = `wk-${b.label}`
                  const isOpen = expandedKey === key
                  return (
                    <div key={b.label} style={{ borderBottom: '1px solid var(--bd)' }}>
                      <div
                        className="row"
                        style={{ borderBottom: 0, cursor: 'pointer' }}
                        onClick={() => setExpandedKey(isOpen ? null : key)}
                      >
                        <div className="grow">
                          <span style={{ fontSize: 16, color: 'var(--mut)' }}>{b.label}</span>
                        </div>
                        <b style={{ fontSize: 16, color: accentColor }}>{money(b.amount)}</b>
                        <span className="mut" style={{ fontSize: 18, marginLeft: 6 }}>
                          {isOpen ? '⌄' : '›'}
                        </span>
                      </div>
                      {isOpen && b.txs.length > 0 && (
                        <div style={{ padding: '0 0 10px 12px' }}>
                          {b.txs.map(t => (
                            <div
                              key={t.id}
                              onClick={() => setViewingTx(t)}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: 13,
                                padding: '6px 0',
                                cursor: 'pointer',
                              }}
                              className="mut"
                            >
                              <span>
                                {format(new Date(t.date), 'dd/MM')} · {cMap.get(t.categoryId ?? -1)?.name ?? 'Giao dịch'}{' '}
                                {t.note ? `(${t.note})` : ''}
                              </span>
                              <b>{money(t.amount)}</b>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
          {showTimeModal && (
            <TimeRangeModal
              filter={effectiveFilter}
              onChange={next => {
                setCur(next.month)
                if (setTimeFilter) setTimeFilter(next)
              }}
              onClose={() => setShowTimeModal(false)}
            />
          )}
        </div>
      </div>
    )
  }

  // ================= MÀN HÌNH CHÍNH: BÁO CÁO GIAI ĐOẠN NÀY =================
  return (
    <div className="period-report-overlay">
      <div className="period-report-shell">
        <div className="ledger-topbar">
          <button className="close-pill-btn" onClick={onClose}>
            Đóng
          </button>
          <WalletSelectorPill
            fundFilter={fundFilter}
            onChange={setFundFilter}
            funds={funds}
            txs={allTxs}
          />
          <button
            className="circle-pill-btn"
            onClick={() => setShowTimeModal(true)}
            title="Chọn khoảng thời gian"
          >
            📅
          </button>
        </div>

        <div style={{ textAlign: 'center', margin: '4px 0 10px' }}>
          <div className="mut" style={{ fontSize: 13 }}>
            Số dư
          </div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{money(currentTotalBalance)}</div>
        </div>

        {renderMonthBar()}

        <div style={{ padding: '4px 4px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span className="mut">Số dư đầu</span>
            <b>{money(openingBalance)}</b>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="mut">Số dư cuối</span>
            <b>{money(closingBalance)}</b>
          </div>
        </div>

        {/* Card 1: Thu nhập ròng */}
        <div className="card">
          <div className="card-head">
            <b style={{ fontSize: 17 }}>
              Thu nhập ròng <span className="mut">?</span>
            </b>
            <span className="link-green" onClick={() => setScreen('expense')}>
              Xem chi tiết
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: netIncome >= 0 ? '#28c76f28' : '#f0534f28',
                color: netIncome >= 0 ? 'var(--inc)' : 'var(--exp)',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              {netIncome >= 0 ? '+' : '−'}
            </span>
            <b className={netIncome >= 0 ? 'inc' : 'exp'} style={{ fontSize: 22 }}>
              {money(Math.abs(netIncome))}
            </b>
          </div>

          {/* Thanh Khoản thu */}
          <div style={{ marginBottom: 14, cursor: 'pointer' }} onClick={() => setScreen('income')}>
            <div style={{ color: '#1d9bf0', fontWeight: 600, fontSize: 17, marginBottom: 4 }}>
              {money(totalIncome)}
            </div>
            <div className="net-bar-track">
              <div
                className="net-bar-fill"
                style={{
                  width: `${Math.max(18, Math.round((totalIncome / maxBar) * 100))}%`,
                  background: '#1d9bf0',
                }}
              >
                Khoản thu
              </div>
            </div>
          </div>

          {/* Thanh Khoản chi */}
          <div style={{ cursor: 'pointer' }} onClick={() => setScreen('expense')}>
            <div style={{ color: '#f0534f', fontWeight: 600, fontSize: 17, marginBottom: 4 }}>
              {money(totalExpense)}
            </div>
            <div className="net-bar-track">
              <div
                className="net-bar-fill"
                style={{
                  width: `${Math.max(18, Math.round((totalExpense / maxBar) * 100))}%`,
                  background: '#f0534f',
                }}
              >
                Khoản chi
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Báo cáo theo nhóm */}
        <div className="card">
          <b style={{ fontSize: 17, display: 'block', marginBottom: 12 }}>Báo cáo theo nhóm</b>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div className="group-stat-box" onClick={() => setScreen('income')}>
              <div>
                <div className="mut" style={{ fontSize: 14 }}>
                  Khoản thu
                </div>
                <b style={{ color: '#1d9bf0', fontSize: 16 }}>{money(totalIncome)}</b>
              </div>
              <span className="mut" style={{ fontSize: 18 }}>
                ›
              </span>
            </div>

            <div className="group-stat-box" onClick={() => setScreen('expense')}>
              <div>
                <div className="mut" style={{ fontSize: 14 }}>
                  Khoản chi
                </div>
                <b style={{ color: '#f0534f', fontSize: 16 }}>{money(totalExpense)}</b>
              </div>
              <span className="mut" style={{ fontSize: 18 }}>
                ›
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, alignItems: 'center' }}>
            <div onClick={() => setScreen('income')} style={{ cursor: 'pointer' }}>
              <DonutWithBadges items={incomeCats} size={156} />
            </div>
            <div onClick={() => setScreen('expense')} style={{ cursor: 'pointer' }}>
              <DonutWithBadges items={expenseCats} size={156} />
            </div>
          </div>
        </div>
        {showTimeModal && (
          <TimeRangeModal
            filter={effectiveFilter}
            onChange={next => {
              setCur(next.month)
              if (setTimeFilter) setTimeFilter(next)
            }}
            onClose={() => setShowTimeModal(false)}
          />
        )}
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
              setDraftTx(draft)
            }}
          />
        )}
        {editTx && <TxForm tx={editTx} onClose={() => setEditTx(null)} />}
        {draftTx && <TxForm draft={draftTx} onClose={() => setDraftTx(null)} />}
      </div>
    </div>
  )
}
