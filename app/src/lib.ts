import {
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  format,
  getDaysInMonth,
  parseISO,
  setDate,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
} from 'date-fns'
import { vi } from 'date-fns/locale'
import type { Category, Fund, Tx } from './db'

export type ThemeMode = 'dark' | 'light' | 'system'
const THEME_STORAGE_KEY = 'moneygo_theme'

export function getStoredTheme(): ThemeMode {
  if (typeof localStorage === 'undefined') return 'dark'
  const raw = localStorage.getItem(THEME_STORAGE_KEY)
  if (raw === 'light' || raw === 'dark' || raw === 'system') return raw
  return 'dark'
}

export function applyTheme(mode: ThemeMode) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(THEME_STORAGE_KEY, mode)
  }
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', mode)
  }
}

export type TimeRangeMode = 'month' | 'today' | 'week' | 'quarter' | 'year' | 'all' | 'custom'

export interface TimeFilter {
  mode: TimeRangeMode
  month: Date
  startDate: string
  endDate: string
}

export interface ResolvedTimeRange {
  from: string
  to: string
  label: string
  isMonthMode: boolean
}

export function resolveTimeRange(filter: TimeFilter, refDate: Date = new Date()): ResolvedTimeRange {
  const today = startOfDay(refDate)
  switch (filter.mode) {
    case 'today': {
      const d = ymd(today)
      return {
        from: d,
        to: d,
        label: `Hôm nay (${format(today, 'dd/MM/yyyy')})`,
        isMonthMode: false,
      }
    }
    case 'week': {
      const s = startOfWeek(today, { weekStartsOn: 1 })
      const e = endOfWeek(today, { weekStartsOn: 1 })
      return {
        from: ymd(s),
        to: ymd(e),
        label: `Tuần này (${format(s, 'dd/MM')} – ${format(e, 'dd/MM/yyyy')})`,
        isMonthMode: false,
      }
    }
    case 'quarter': {
      const s = startOfQuarter(today)
      const e = endOfQuarter(today)
      return {
        from: ymd(s),
        to: ymd(e),
        label: `Quý này (${format(s, 'dd/MM')} – ${format(e, 'dd/MM/yyyy')})`,
        isMonthMode: false,
      }
    }
    case 'year': {
      const y = today.getFullYear()
      return {
        from: `${y}-01-01`,
        to: `${y}-12-31`,
        label: `Năm ${y} (01/01/${y} – 31/12/${y})`,
        isMonthMode: false,
      }
    }
    case 'all': {
      return {
        from: '1970-01-01',
        to: '2099-12-31',
        label: 'Tất cả thời gian',
        isMonthMode: false,
      }
    }
    case 'custom': {
      const rawStart = filter.startDate || ymd(startOfMonth(today))
      const rawEnd = filter.endDate || ymd(today)
      const [from, to] = rawStart <= rawEnd ? [rawStart, rawEnd] : [rawEnd, rawStart]
      return {
        from,
        to,
        label: `${format(parseISO(from), 'dd/MM/yyyy')} – ${format(parseISO(to), 'dd/MM/yyyy')}`,
        isMonthMode: false,
      }
    }
    case 'month':
    default: {
      const s = startOfMonth(filter.month)
      const e = endOfMonth(filter.month)
      return {
        from: ymd(s),
        to: ymd(e),
        label: monthLabel(filter.month),
        isMonthMode: true,
      }
    }
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Tạo nội dung file Excel chuẩn SpreadsheetML (.xls) gồm 2 Sheet:
 * 1. Sổ Giao Dịch (đầy đủ cột, kiểu số Number thực sự để cộng trừ trong Excel, tổng kết Thu/Chi)
 * 2. Danh Sách Ví & Số Dư
 */
export function buildExcelXml(funds: Fund[], categories: Category[], txs: Tx[]): string {
  const fMap = new Map(funds.map(f => [f.id!, f.name]))
  const cMap = new Map(categories.map(c => [c.id!, c.name]))
  const sortedTxs = [...txs].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)

  const totalIncome = sortedTxs
    .filter(t => t.type === 'income' && !t.excludeFromReport)
    .reduce((s, t) => s + t.amount, 0)
  const totalExpense = sortedTxs
    .filter(t => t.type === 'expense' && !t.excludeFromReport)
    .reduce((s, t) => s + t.amount, 0)
  const net = totalIncome - totalExpense

  const txRowsXml = sortedTxs
    .map(t => {
      const typeLabel = t.type === 'income' ? 'Khoản thu' : t.type === 'expense' ? 'Khoản chi' : 'Chuyển khoản'
      const catName = t.type === 'transfer' ? 'Chuyển quỹ' : (cMap.get(t.categoryId ?? -1) ?? 'Không nhóm')
      const fundName = fMap.get(t.fundId) ?? ''
      const toFundName = t.toFundId ? (fMap.get(t.toFundId) ?? '') : ''
      const signedAmount = t.type === 'expense' ? -t.amount : t.amount
      const reportStatus = t.excludeFromReport ? 'Không tính vào báo cáo' : 'Có tính'
      return `<Row>
        <Cell><Data ss:Type="String">${escapeXml(t.date)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(typeLabel)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(catName)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(fundName)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(toFundName)}</Data></Cell>
        <Cell ss:StyleID="sMoney"><Data ss:Type="Number">${t.amount}</Data></Cell>
        <Cell ss:StyleID="sMoney"><Data ss:Type="Number">${signedAmount}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(t.note || '')}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(reportStatus)}</Data></Cell>
      </Row>`
    })
    .join('\n')

  const walletRowsXml = funds
    .map(f => {
      const curBal = f.initialBalance + txs.reduce((s, t) => s + effectOn(t, f.id!), 0)
      const kindLabel = f.kind === 'credit' ? 'Quỹ tín dụng (Trả sau)' : 'Ví / Tiết kiệm / Đầu tư'
      const groupLabel = f.archived
        ? 'Đã lưu trữ (Đóng băng)'
        : f.excludeFromTotal
          ? 'Không tính vào tổng'
          : 'Tính vào tổng'
      return `<Row>
        <Cell><Data ss:Type="String">${escapeXml(f.name)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(kindLabel)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(groupLabel)}</Data></Cell>
        <Cell ss:StyleID="sMoney"><Data ss:Type="Number">${f.initialBalance}</Data></Cell>
        <Cell ss:StyleID="sMoney"><Data ss:Type="Number">${curBal}</Data></Cell>
        <Cell ss:StyleID="sMoney"><Data ss:Type="Number">${f.creditLimit ?? 0}</Data></Cell>
      </Row>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Font ss:FontName="Segoe UI" ss:Size="11"/>
  </Style>
  <Style ss:ID="sHeader">
   <Font ss:FontName="Segoe UI" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#16A34A" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="sSummary">
   <Font ss:FontName="Segoe UI" ss:Size="11" ss:Bold="1"/>
   <Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="sMoney">
   <NumberFormat ss:Format="#,##0"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="So Giao Dich">
  <Table>
   <Column ss:Width="90"/>
   <Column ss:Width="100"/>
   <Column ss:Width="140"/>
   <Column ss:Width="130"/>
   <Column ss:Width="130"/>
   <Column ss:Width="115"/>
   <Column ss:Width="115"/>
   <Column ss:Width="220"/>
   <Column ss:Width="140"/>
   <Row ss:StyleID="sSummary">
    <Cell><Data ss:Type="String">Tổng Thu</Data></Cell>
    <Cell ss:StyleID="sMoney"><Data ss:Type="Number">${totalIncome}</Data></Cell>
    <Cell><Data ss:Type="String">Tổng Chi</Data></Cell>
    <Cell ss:StyleID="sMoney"><Data ss:Type="Number">${totalExpense}</Data></Cell>
    <Cell><Data ss:Type="String">Thu nhập ròng</Data></Cell>
    <Cell ss:StyleID="sMoney"><Data ss:Type="Number">${net}</Data></Cell>
   </Row>
   <Row/>
   <Row ss:StyleID="sHeader">
    <Cell><Data ss:Type="String">Ngày</Data></Cell>
    <Cell><Data ss:Type="String">Loại giao dịch</Data></Cell>
    <Cell><Data ss:Type="String">Nhóm</Data></Cell>
    <Cell><Data ss:Type="String">Ví / Quỹ</Data></Cell>
    <Cell><Data ss:Type="String">Ví nhận</Data></Cell>
    <Cell><Data ss:Type="String">Số tiền (VND)</Data></Cell>
    <Cell><Data ss:Type="String">Biến động (+/-)</Data></Cell>
    <Cell><Data ss:Type="String">Ghi chú</Data></Cell>
    <Cell><Data ss:Type="String">Báo cáo</Data></Cell>
   </Row>
   ${txRowsXml}
  </Table>
 </Worksheet>
 <Worksheet ss:Name="Danh Sach Vi">
  <Table>
   <Column ss:Width="150"/>
   <Column ss:Width="150"/>
   <Column ss:Width="150"/>
   <Column ss:Width="130"/>
   <Column ss:Width="130"/>
   <Column ss:Width="130"/>
   <Row ss:StyleID="sHeader">
    <Cell><Data ss:Type="String">Tên Ví / Quỹ</Data></Cell>
    <Cell><Data ss:Type="String">Phân loại</Data></Cell>
    <Cell><Data ss:Type="String">Nhóm tính tổng</Data></Cell>
    <Cell><Data ss:Type="String">Số dư ban đầu (VND)</Data></Cell>
    <Cell><Data ss:Type="String">Số dư hiện tại (VND)</Data></Cell>
    <Cell><Data ss:Type="String">Hạn mức tín dụng (VND)</Data></Cell>
   </Row>
   ${walletRowsXml}
  </Table>
 </Worksheet>
</Workbook>`
}

export function buildCsvContent(funds: Fund[], categories: Category[], txs: Tx[]): string {
  const fMap = new Map(funds.map(f => [f.id!, f.name]))
  const cMap = new Map(categories.map(c => [c.id!, c.name]))
  const rows = [
    ['Ngày', 'Loại', 'Nhóm', 'Ví / Quỹ', 'Ví nhận', 'Số tiền (VND)', 'Ghi chú', 'Tính vào báo cáo'],
    ...[...txs]
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(t => [
        t.date,
        t.type === 'income' ? 'Thu' : t.type === 'expense' ? 'Chi' : 'Chuyển quỹ',
        t.type === 'transfer' ? 'Chuyển quỹ' : (cMap.get(t.categoryId ?? -1) ?? ''),
        fMap.get(t.fundId) ?? '',
        t.toFundId ? (fMap.get(t.toFundId) ?? '') : '',
        String(t.amount),
        `"${(t.note || '').replace(/"/g, '""')}"`,
        t.excludeFromReport ? 'Không' : 'Có',
      ]),
  ]
  return '\uFEFF' + rows.map(r => r.join(',')).join('\n')
}


export const money = (n: number) =>
  new Intl.NumberFormat('en-US').format(Math.round(n)) + ' ₫'

export const moneySigned = (n: number) =>
  (n > 0 ? '+' : n < 0 ? '-' : '') + new Intl.NumberFormat('en-US').format(Math.abs(Math.round(n))) + ' ₫'

export const moneyShort = (n: number) => {
  const a = Math.abs(n)
  if (a >= 1e9) return (n / 1e9).toFixed(1).replace('.0', '') + ' tỷ'
  if (a >= 1e6) return (n / 1e6).toFixed(1).replace('.0', '') + ' M'
  if (a >= 1e3) return Math.round(n / 1e3) + 'k'
  return String(Math.round(n))
}

/**
 * Đánh giá biểu thức toán học từ bàn phím số (Calculator Keypad)
 * Hỗ trợ +, -, ×, ÷ và số thập phân (dấu chấm)
 */
export function evaluateKeypadExpression(expr: string): number {
  if (!expr || typeof expr !== 'string') return 0
  const clean = expr
    .replace(/,/g, '')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .trim()

  if (!clean) return 0

  const tokens = clean.match(/([0-9.]+|[+\-*/])/g)
  if (!tokens || tokens.length === 0) return 0

  if (['+', '-', '*', '/'].includes(tokens[tokens.length - 1])) {
    tokens.pop()
  }
  if (tokens.length === 0) return 0

  // Bước 1: Nhân và chia trước
  const step1: (number | string)[] = []
  let i = 0
  while (i < tokens.length) {
    const tok = tokens[i]
    if (tok === '*' || tok === '/') {
      const prev = Number(step1.pop())
      const next = Number(tokens[i + 1] ?? 1)
      const res = tok === '*' ? prev * next : next !== 0 ? prev / next : 0
      step1.push(res)
      i += 2
    } else if (tok === '+' || tok === '-') {
      step1.push(tok)
      i++
    } else {
      step1.push(Number(tok))
      i++
    }
  }

  // Bước 2: Cộng và trừ tuần tự
  let result = typeof step1[0] === 'number' ? step1[0] : 0
  let j = typeof step1[0] === 'number' ? 1 : 0
  while (j < step1.length) {
    const op = step1[j]
    const nextVal = Number(step1[j + 1] ?? 0)
    if (op === '+') {
      result += nextVal
    } else if (op === '-') {
      result -= nextVal
    }
    j += 2
  }

  return isNaN(result) ? 0 : Math.round(result * 1000) / 1000
}

/**
 * Định dạng chuỗi nhập trên bàn phím số với dấu chia cách hàng nghìn (,) và dấu thập phân (.)
 */
export function formatKeypadDisplay(raw: string): string {
  if (!raw || raw === '') return '0'

  return raw
    .replace(/([0-9.]+)/g, match => {
      const parts = match.split('.')
      const intStr = parts[0]
      let formattedInt = ''
      if (intStr) {
        formattedInt = Number(intStr).toLocaleString('en-US')
      } else {
        formattedInt = '0'
      }
      if (parts.length > 1) {
        return `${formattedInt}.${parts.slice(1).join('')}`
      }
      if (match.endsWith('.')) {
        return `${formattedInt}.`
      }
      return formattedInt
    })
    .replace(/\+/g, ' + ')
    .replace(/-/g, ' - ')
    .replace(/×/g, ' × ')
    .replace(/\*/g, ' × ')
    .replace(/÷/g, ' ÷ ')
    .replace(/\//g, ' ÷ ')
    .replace(/\s+/g, ' ')
}

export const ymd = (d: Date) => format(d, 'yyyy-MM-dd')
export const monthKey = (d: Date) => format(d, 'yyyy-MM')
export const monthLabel = (d: Date) => format(d, 'MM/yyyy')
/** Chuyển 'YYYY-MM-DD' (lưu trữ) sang 'dd/MM/yyyy' (hiển thị) */
export const fmtDmy = (s: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s
}

/**
 * Nhãn hiển thị cho thanh chuyển tháng dạng trượt cửa sổ (Windowed Month Tabs) chuẩn MoneyLover
 */
export function getMonthTabLabel(targetMonth: Date, referenceNow: Date): string {
  const diff =
    (targetMonth.getFullYear() - referenceNow.getFullYear()) * 12 +
    (targetMonth.getMonth() - referenceNow.getMonth())
  if (diff === 0) return 'THÁNG NÀY'
  if (diff === -1) return 'THÁNG TRƯỚC'
  if (diff === 1) return 'TƯƠNG LAI'
  return monthLabel(targetMonth).toUpperCase()
}
export const dayLabel = (s: string) => format(parseISO(s), 'EEEE, dd/MM', { locale: vi })
export const fullViDate = (s: string) => format(parseISO(s), "EEEE, dd 'tháng' M yyyy", { locale: vi })
export const shiftMonth = (d: Date, n: number) => addMonths(d, n)

/** Tác động của giao dịch lên số dư một quỹ */
export function effectOn(tx: Tx, fundId: number): number {
  if (tx.type === 'income') return tx.fundId === fundId ? tx.amount : 0
  if (tx.type === 'expense') return tx.fundId === fundId ? -tx.amount : 0
  return (tx.fundId === fundId ? -tx.amount : 0) + (tx.toFundId === fundId ? tx.amount : 0)
}

/** Danh sách các quỹ được tính vào "Tổng cộng" (không bật Không tính vào tổng) */
export function getIncludedFunds(funds: Fund[], fundFilter = 0): Fund[] {
  if (fundFilter !== 0) return funds.filter(f => f.id === fundFilter)
  return funds.filter(f => !f.excludeFromTotal)
}

/** Tính tổng số dư của các quỹ được tính vào "Tổng" */
export function computeTotalBalance(funds: Fund[], txs: Tx[], fundFilter = 0): number {
  const active = getIncludedFunds(funds, fundFilter)
  return active.reduce((sum, f) => sum + f.initialBalance + txs.reduce((a, t) => a + effectOn(t, f.id!), 0), 0)
}

/**
 * Lọc các giao dịch được phép đưa vào Báo cáo Thu/Chi
 * - Loại bỏ các giao dịch có excludeFromReport === true
 * - Khi xem "Tổng cộng" (fundFilter === 0), loại bỏ toàn bộ giao dịch thuộc ví có excludeFromTotal === true
 */
export function filterReportableTxs(txs: Tx[], funds: Fund[], fundFilter = 0): Tx[] {
  const includedIds = new Set(getIncludedFunds(funds, fundFilter).map(f => f.id!))
  return txs.filter(t => {
    if (t.excludeFromReport) return false
    if (t.type === 'income' || t.type === 'expense') {
      return includedIds.has(t.fundId)
    }
    return includedIds.has(t.fundId) || (t.toFundId != null && includedIds.has(t.toFundId))
  })
}

function clampDay(monthBase: Date, day: number): Date {
  const maxD = getDaysInMonth(monthBase)
  return startOfDay(setDate(monthBase, Math.min(Math.max(1, day), maxD)))
}

/** Tính ngày hạn thanh toán tương ứng với một kỳ chốt sao kê */
function dueDateForStatement(stmtDate: Date, statementDay: number, dueDay: number): Date {
  const baseMonth = new Date(stmtDate.getFullYear(), stmtDate.getMonth(), 1)
  if (dueDay > statementDay) {
    return clampDay(baseMonth, dueDay)
  }
  return clampDay(addMonths(baseMonth, 1), dueDay)
}

export interface CreditCardAnalysis {
  balance: number
  debt: number
  creditLimit: number
  availableCredit: number
  utilizationPct: number
  statementDay: number
  dueDay: number
  lastStatementDate: string
  nextStatementDate: string
  daysUntilStatement: number
  nextDueDate: string
  daysUntilDue: number
  interestFreeDaysToday: number
  currentCycleSpend: number
  statusTag: 'optimal' | 'due-soon' | 'closing-soon' | 'normal'
  advice: string
}

/**
 * Phân tích chuyên sâu Quỹ tín dụng để tối ưu dòng tiền "xài trước trả sau"
 */
export function analyzeCreditFund(fund: Fund, txs: Tx[], refDate: Date = new Date()): CreditCardAnalysis {
  const today = startOfDay(refDate)
  const balance = fund.initialBalance + txs.reduce((s, t) => s + effectOn(t, fund.id!), 0)
  const debt = Math.max(0, -balance)
  const creditLimit = fund.creditLimit ?? 0
  const availableCredit = Math.max(0, creditLimit - debt)
  const utilizationPct = creditLimit > 0 ? Math.min(100, Math.round((debt / creditLimit) * 100)) : 0

  const statementDay = Math.min(31, Math.max(1, fund.statementDay ?? 20))
  const dueDay = Math.min(31, Math.max(1, fund.dueDay ?? 5))

  const thisMonthBase = new Date(today.getFullYear(), today.getMonth(), 1)
  const stmtThisMonth = clampDay(thisMonthBase, statementDay)

  let lastStmt: Date
  let nextStmt: Date
  if (stmtThisMonth <= today) {
    lastStmt = stmtThisMonth
    nextStmt = clampDay(addMonths(thisMonthBase, 1), statementDay)
  } else {
    lastStmt = clampDay(addMonths(thisMonthBase, -1), statementDay)
    nextStmt = stmtThisMonth
  }

  const dueOfLastStmt = dueDateForStatement(lastStmt, statementDay, dueDay)
  const dueOfNextStmt = dueDateForStatement(nextStmt, statementDay, dueDay)

  const nextDue = dueOfLastStmt >= today ? dueOfLastStmt : dueOfNextStmt
  const daysUntilStatement = differenceInCalendarDays(nextStmt, today)
  const daysUntilDue = differenceInCalendarDays(nextDue, today)

  // Giao dịch phát sinh hôm nay (sau ngày chốt kỳ trước) sẽ vào kỳ sao kê nextStmt và thanh toán vào dueOfNextStmt
  const interestFreeDaysToday = differenceInCalendarDays(dueOfNextStmt, today)

  const lastStmtYmd = ymd(lastStmt)
  const todayYmd = ymd(today)
  const currentCycleSpend = txs
    .filter(t => t.fundId === fund.id && t.type === 'expense' && t.date > lastStmtYmd && t.date <= todayYmd)
    .reduce((s, t) => s + t.amount, 0)

  let statusTag: CreditCardAnalysis['statusTag'] = 'normal'
  let advice = `Chi tiêu hôm nay được miễn lãi ${interestFreeDaysToday} ngày (hạn trả ${format(dueOfNextStmt, 'dd/MM')}).`

  if (debt > 0 && daysUntilDue <= 5) {
    statusTag = 'due-soon'
    advice = `⚠️ Còn ${daysUntilDue} ngày đến hạn thanh toán (${format(nextDue, 'dd/MM')}). Hãy tất toán đúng hạn để tránh phí phạt & lãi!`
  } else if (daysUntilStatement <= 3) {
    statusTag = 'closing-soon'
    advice = `⏳ Còn ${daysUntilStatement} ngày chốt sao kê (${format(nextStmt, 'dd/MM')}). Khoản chi lớn nên dời qua sau ngày ${format(nextStmt, 'dd/MM')} để hưởng trọn chu kỳ miễn lãi mới.`
  } else if (differenceInCalendarDays(today, lastStmt) <= 7) {
    statusTag = 'optimal'
    advice = `✨ Thời điểm vàng quẹt thẻ! Vừa qua kỳ chốt sao kê — chi hôm nay được giữ tiền mặt tới ${interestFreeDaysToday} ngày.`
  }

  return {
    balance,
    debt,
    creditLimit,
    availableCredit,
    utilizationPct,
    statementDay,
    dueDay,
    lastStatementDate: lastStmtYmd,
    nextStatementDate: ymd(nextStmt),
    daysUntilStatement,
    nextDueDate: ymd(nextDue),
    daysUntilDue,
    interestFreeDaysToday,
    currentCycleSpend,
    statusTag,
    advice,
  }
}

export interface CategoryTreeGroup {
  parent: Category
  children: Category[]
}

/**
 * Phân cấp danh mục thành các Nhóm cha có chứa nhóm con và Nhóm độc lập
 */
export function groupCategoriesHierarchy(categories: Category[]): {
  parentGroups: CategoryTreeGroup[]
  independent: Category[]
} {
  const parentMap = new Map<number, Category>()
  const childrenMap = new Map<number, Category[]>()
  const potentialChildren: Category[] = []

  for (const c of categories) {
    if (c.id && !c.parentId) {
      parentMap.set(c.id, c)
    } else {
      potentialChildren.push(c)
    }
  }

  const independent: Category[] = []
  for (const c of potentialChildren) {
    if (c.parentId && parentMap.has(c.parentId)) {
      const arr = childrenMap.get(c.parentId) ?? []
      arr.push(c)
      childrenMap.set(c.parentId, arr)
    } else {
      independent.push(c)
    }
  }

  const parentGroups: CategoryTreeGroup[] = []
  for (const [pId, parent] of parentMap.entries()) {
    const children = childrenMap.get(pId) ?? []
    if (children.length > 0) {
      parentGroups.push({ parent, children })
    } else {
      independent.push(parent)
    }
  }

  return { parentGroups, independent }
}

/**
 * Lấy tên đầy đủ có kèm nhóm cha đại diện (VD: "Thiết Yếu 50% › Ăn uống")
 */
export function getCategoryFullName(category: Category, allCategories: Category[]): string {
  if (category.parentId) {
    const p = allCategories.find(c => c.id === category.parentId)
    if (p) return `${p.name} › ${category.name}`
  }
  return category.name
}

export interface WeekBucket {
  label: string
  fromDay: number
  toDay: number
  amount: number
  txs: Tx[]
}

/**
 * Chia tháng thành các cụm ngày theo tuần lịch (Thứ Hai -> Chủ Nhật), ví dụ: 1-4, 5-11, 12-18, 19-24
 */
export function buildCalendarWeekBuckets(curMonth: Date, today: Date, monthTxs: Tx[], type: 'expense' | 'income'): WeekBucket[] {
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
