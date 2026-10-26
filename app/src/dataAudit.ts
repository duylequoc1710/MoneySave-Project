import type { Budget, Category, Fund, RecurringTx, Tx } from './db.ts'

/**
 * Kiểm tra toàn vẹn dữ liệu (CHỈ ĐỌC – không sửa gì). Dùng để rà soát dữ liệu thật
 * trước/sau khi nhập từ MoneyLover, và trước khi sao lưu.
 */
export interface DataIssue {
  level: 'error' | 'warn'
  message: string
}

export interface AuditInput {
  funds: Fund[]
  categories: Category[]
  txs: Tx[]
  budgets?: Budget[]
  recurrings?: RecurringTx[]
}

const YMD = /^\d{4}-\d{2}-\d{2}$/

function validYmd(s: string): boolean {
  if (!YMD.test(s)) return false
  const [y, m, d] = s.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

export function auditData(d: AuditInput): DataIssue[] {
  const issues: DataIssue[] = []
  const fundIds = new Set(d.funds.map(f => f.id))
  const catIds = new Set(d.categories.map(c => c.id))

  let badAmount = 0
  let badDate = 0
  let missingFund = 0
  let missingCat = 0
  let badTransfer = 0
  const seen = new Map<string, number>()
  for (const t of d.txs) {
    if (!Number.isFinite(t.amount) || t.amount <= 0) badAmount++
    if (!validYmd(t.date)) badDate++
    if (!fundIds.has(t.fundId)) missingFund++
    if (t.type === 'transfer') {
      if (t.toFundId == null || !fundIds.has(t.toFundId) || t.toFundId === t.fundId) badTransfer++
    } else if (t.categoryId != null && !catIds.has(t.categoryId)) {
      missingCat++
    }
    const key = [t.type, t.date, t.amount, t.fundId, t.categoryId ?? '', t.note ?? ''].join('|')
    seen.set(key, (seen.get(key) ?? 0) + 1)
  }
  if (badAmount) issues.push({ level: 'error', message: `${badAmount} giao dịch có số tiền không hợp lệ (≤ 0 hoặc không phải số).` })
  if (badDate) issues.push({ level: 'error', message: `${badDate} giao dịch có ngày sai định dạng YYYY-MM-DD.` })
  if (missingFund) issues.push({ level: 'error', message: `${missingFund} giao dịch trỏ tới ví không tồn tại.` })
  if (badTransfer) issues.push({ level: 'error', message: `${badTransfer} giao dịch chuyển quỹ thiếu/sai ví nhận.` })
  if (missingCat) issues.push({ level: 'warn', message: `${missingCat} giao dịch trỏ tới nhóm không tồn tại.` })

  const dupes = [...seen.values()].filter(n => n > 1).reduce((s, n) => s + (n - 1), 0)
  if (dupes) issues.push({ level: 'warn', message: `${dupes} giao dịch có thể bị trùng (cùng loại, ngày, số tiền, ví, nhóm, ghi chú) – hãy kiểm tra thủ công, có thể là hợp lệ.` })

  for (const f of d.funds) {
    if (f.kind === 'credit' && f.initialBalance > 0) {
      issues.push({ level: 'warn', message: `Thẻ tín dụng "${f.name}" có Số dư đầu dương (${f.initialBalance.toLocaleString('en-US')}): dư nợ sẽ luôn hiện 0. Nên để 0 hoặc số âm nếu đang nợ.` })
    }
    if (f.kind === 'credit' && !(f.creditLimit && f.creditLimit > 0)) {
      issues.push({ level: 'warn', message: `Thẻ tín dụng "${f.name}" chưa có hạn mức.` })
    }
  }
  for (const r of d.recurrings ?? []) {
    if (!fundIds.has(r.fundId)) issues.push({ level: 'error', message: `Giao dịch định kỳ "${r.name}" trỏ tới ví không tồn tại.` })
  }
  for (const b of d.budgets ?? []) {
    if (!catIds.has(b.categoryId)) issues.push({ level: 'warn', message: `Có ngân sách trỏ tới nhóm không tồn tại (id ${b.categoryId}).` })
  }
  return issues
}
