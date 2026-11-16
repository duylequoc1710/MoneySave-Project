// Logic tìm kiếm toàn diện (FR-43) – hàm thuần, không phụ thuộc React/DOM để unit test được.
// Component GlobalSearchModal chỉ gọi các hàm này rồi vẽ kết quả.
import type { Category, Fund, RecurringTx, SavingsGoal, Tx } from './db'
import { fmtDmy } from './lib.ts'

/** Chuẩn hoá chuỗi để so khớp: chữ thường, bỏ dấu tiếng Việt (đ→d), gộp khoảng trắng. */
export function normalizeSearchText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Câu truy vấn đã chuẩn hoá; chuỗi rỗng = chưa nhập gì. */
export function normalizeQuery(q: string): string {
  return normalizeSearchText(q)
}

/**
 * So khớp: mọi từ trong truy vấn đều phải xuất hiện (không cần đúng thứ tự).
 * Từ toàn chữ số kèm dấu phân cách (vd. "50.000", "1,5") cũng khớp với số tiền viết liền ("50000").
 */
export function matchesQuery(haystack: string, normQuery: string): boolean {
  if (!normQuery) return true
  const h = normalizeSearchText(haystack)
  return normQuery.split(' ').every(word => {
    if (h.includes(word)) return true
    if (/^[\d.,]+$/.test(word)) {
      const digits = word.replace(/[.,]/g, '')
      return digits.length > 0 && h.includes(digits)
    }
    return false
  })
}

export interface SearchableFeature {
  id: string
  title: string
  subtitle: string
  keywords: string
}

/** Không nhập gì → gợi ý 5 chức năng đầu; có nhập → lọc theo tên/mô tả/từ khoá. */
export function searchFeatures<T extends SearchableFeature>(features: T[], normQuery: string, emptyLimit = 5): T[] {
  if (!normQuery) return features.slice(0, emptyLimit)
  return features.filter(f => matchesQuery(`${f.title} ${f.subtitle} ${f.keywords}`, normQuery))
}

/** Chuỗi gộp các trường của giao dịch dùng để tìm (danh mục, ví, ví nhận, mục tiêu, ghi chú, ngày dd/MM/yyyy, số tiền). */
export function txSearchText(t: Tx, cMap: Map<number, Category>, fMap: Map<number, Fund>): string {
  const catName = cMap.get(t.categoryId ?? -1)?.name ?? ''
  const fName = fMap.get(t.fundId)?.name ?? ''
  const toFName = t.toFundId ? fMap.get(t.toFundId)?.name ?? '' : ''
  return `${catName} ${fName} ${toFName} ${t.savingsGoalName ?? ''} ${t.note ?? ''} ${fmtDmy(t.date)} ${t.amount}`
}

/** Giao dịch khớp truy vấn, mới nhất trước (ngày giảm dần, rồi createdAt giảm dần), tối đa `limit`. */
export function searchTxs(
  txs: Tx[],
  normQuery: string,
  cMap: Map<number, Category>,
  fMap: Map<number, Fund>,
  limit = 30,
): Tx[] {
  if (!normQuery) return []
  return txs
    .filter(t => matchesQuery(txSearchText(t, cMap, fMap), normQuery))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
    .slice(0, limit)
}

export type PlanHit =
  | { kind: 'goal'; goal: SavingsGoal }
  | { kind: 'recurring'; recurring: RecurringTx }

/** Mục tiêu tiết kiệm & giao dịch định kỳ khớp theo tên/ghi chú (mục tiêu trước), tối đa `limit`. */
export function searchPlans(
  goals: SavingsGoal[],
  recurrings: RecurringTx[],
  normQuery: string,
  limit = 15,
): PlanHit[] {
  if (!normQuery) return []
  const hits: PlanHit[] = []
  for (const g of goals) {
    if (matchesQuery(`${g.name} ${g.note ?? ''}`, normQuery)) hits.push({ kind: 'goal', goal: g })
  }
  for (const r of recurrings) {
    if (matchesQuery(`${r.name} ${r.note ?? ''}`, normQuery)) hits.push({ kind: 'recurring', recurring: r })
  }
  return hits.slice(0, limit)
}
