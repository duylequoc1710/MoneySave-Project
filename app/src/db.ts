import Dexie, { type Table } from 'dexie'
import { addDays, addMonths, addWeeks, addYears, format, getDaysInMonth, parseISO, setDate } from 'date-fns'

export type TxType = 'expense' | 'income' | 'transfer'
export type FundKind = 'cash' | 'credit'
export type RecFrequency = 'monthly' | 'weekly' | 'daily' | 'yearly'

export interface Fund {
  id?: number
  name: string
  icon: string
  color: string
  initialBalance: number
  archived?: boolean
  excludeFromTotal?: boolean // Không tính vào tổng
  notifyOnTx?: boolean // Bật thông báo khi có giao dịch mới
  kind?: FundKind // 'cash' | 'credit'
  creditLimit?: number
  statementDay?: number // 1..31
  dueDay?: number // 1..31
}

export interface Category {
  id?: number
  name: string
  type: 'expense' | 'income'
  icon: string
  color: string
  fundId?: number | null
}

export interface Tx {
  id?: number
  type: TxType
  amount: number
  date: string // YYYY-MM-DD
  fundId: number
  toFundId?: number | null
  categoryId?: number | null
  note: string
  createdAt: number
  recurringId?: number | null
  excludeFromReport?: boolean // Không tính vào báo cáo
}

export interface Budget {
  id?: number
  categoryId: number
  limit: number
}

export interface RecurringTx {
  id?: number
  name: string
  type: TxType
  amount: number
  fundId: number
  toFundId?: number | null
  categoryId?: number | null
  note: string
  frequency: RecFrequency
  dayOfMonth?: number // 1..31 (dùng cho monthly)
  startDate: string // YYYY-MM-DD
  lastGeneratedDate?: string | null // YYYY-MM-DD
  active: boolean
}

class MoneyDB extends Dexie {
  funds!: Table<Fund, number>
  categories!: Table<Category, number>
  txs!: Table<Tx, number>
  budgets!: Table<Budget, number>
  recurrings!: Table<RecurringTx, number>

  constructor() {
    super('moneygo')
    this.version(1).stores({
      funds: '++id',
      categories: '++id, type, fundId',
      txs: '++id, date, type, fundId, categoryId',
      budgets: '++id, categoryId',
    })
    this.version(2).stores({
      funds: '++id, kind',
      categories: '++id, type, fundId',
      txs: '++id, date, type, fundId, categoryId, recurringId',
      budgets: '++id, categoryId',
      recurrings: '++id, active, frequency, fundId, categoryId',
    })
  }
}
export const db = new MoneyDB()

const EXP: [string, string, string][] = [
  ['Ăn uống', '🍜', '#f97316'],
  ['Di chuyển', '🚗', '#eab308'],
  ['Nhà cửa', '🏠', '#8b5cf6'],
  ['Mua sắm', '🛍️', '#ec4899'],
  ['Giải trí', '🎬', '#06b6d4'],
  ['Sức khoẻ', '💊', '#ef4444'],
  ['Pet', '🐱', '#f59e0b'],
  ['Du lịch', '✈️', '#3b82f6'],
  ['Hoá đơn', '🧾', '#64748b'],
  ['Cá nhân 25%', '👤', '#ef4444'],
  ['Thiết Yếu 50%', '🏡', '#eab308'],
  ['Khác', '📦', '#94a3b8'],
]
const INC: [string, string, string][] = [
  ['Lương', '💼', '#10b981'],
  ['Thưởng', '🎁', '#22c55e'],
  ['Thu nhập khác', '💰', '#14b8a6'],
]

export async function seedIfEmpty() {
  if ((await db.funds.count()) > 0) return
  await db.funds.bulkAdd([
    { name: 'Quỹ Chính', icon: '👛', color: '#f97316', initialBalance: 0, kind: 'cash' },
    { name: 'Ngân hàng', icon: '🏦', color: '#3b82f6', initialBalance: 0, kind: 'cash' },
  ])
  await db.categories.bulkAdd([
    ...EXP.map(([name, icon, color]) => ({ name, icon, color, type: 'expense' as const })),
    ...INC.map(([name, icon, color]) => ({ name, icon, color, type: 'income' as const })),
  ])
}

/**
 * Tính các ngày phát sinh của một giao dịch định kỳ trong khoảng [ startDate / sau lastGeneratedDate .. todayYmd ]
 */
export function computeDueDates(rec: RecurringTx, todayYmd: string, isFundArchived = false): string[] {
  if (!rec.active || isFundArchived || rec.startDate > todayYmd) return []
  const dates: string[] = []
  const start = parseISO(rec.startDate)

  if (rec.frequency === 'monthly') {
    const targetDay = rec.dayOfMonth ?? start.getDate()
    let cursor = new Date(start.getFullYear(), start.getMonth(), 1)
    const end = parseISO(todayYmd)
    let safety = 0
    while (cursor <= end && safety++ < 240) {
      const maxD = getDaysInMonth(cursor)
      const occurrence = setDate(cursor, Math.min(Math.max(1, targetDay), maxD))
      const dStr = format(occurrence, 'yyyy-MM-dd')
      if (dStr >= rec.startDate && dStr <= todayYmd && (!rec.lastGeneratedDate || dStr > rec.lastGeneratedDate)) {
        dates.push(dStr)
      }
      cursor = addMonths(cursor, 1)
    }
  } else {
    let cursor = start
    const end = parseISO(todayYmd)
    let safety = 0
    while (cursor <= end && safety++ < 1000) {
      const dStr = format(cursor, 'yyyy-MM-dd')
      if (dStr >= rec.startDate && dStr <= todayYmd && (!rec.lastGeneratedDate || dStr > rec.lastGeneratedDate)) {
        dates.push(dStr)
      }
      cursor =
        rec.frequency === 'daily'
          ? addDays(cursor, 1)
          : rec.frequency === 'weekly'
            ? addWeeks(cursor, 1)
            : addYears(cursor, 1)
    }
  }
  return dates
}

/**
 * Tính ngày phát sinh tiếp theo (> lastGeneratedDate hoặc >= startDate) để hiển thị cho người dùng
 */
export function getNextOccurrence(rec: RecurringTx, todayYmd: string): string {
  const ref = rec.lastGeneratedDate && rec.lastGeneratedDate >= rec.startDate ? rec.lastGeneratedDate : null
  const start = parseISO(rec.startDate)
  if (!ref) {
    if (rec.frequency === 'monthly') {
      const targetDay = rec.dayOfMonth ?? start.getDate()
      const maxD = getDaysInMonth(start)
      const first = setDate(start, Math.min(Math.max(1, targetDay), maxD))
      const firstStr = format(first, 'yyyy-MM-dd')
      if (firstStr >= rec.startDate) return firstStr
      const nextM = addMonths(new Date(start.getFullYear(), start.getMonth(), 1), 1)
      return format(setDate(nextM, Math.min(Math.max(1, targetDay), getDaysInMonth(nextM))), 'yyyy-MM-dd')
    }
    return rec.startDate
  }
  const last = parseISO(ref)
  if (rec.frequency === 'monthly') {
    const targetDay = rec.dayOfMonth ?? start.getDate()
    const nextM = addMonths(new Date(last.getFullYear(), last.getMonth(), 1), 1)
    const candidate = format(setDate(nextM, Math.min(Math.max(1, targetDay), getDaysInMonth(nextM))), 'yyyy-MM-dd')
    return candidate >= todayYmd ? candidate : candidate
  }
  const next =
    rec.frequency === 'daily'
      ? addDays(last, 1)
      : rec.frequency === 'weekly'
        ? addWeeks(last, 1)
        : addYears(last, 1)
  return format(next, 'yyyy-MM-dd')
}

/**
 * Tự động kiểm tra và tạo các giao dịch định kỳ đã đến hạn (<= todayYmd)
 */
export async function processRecurringTransactions(todayYmd = format(new Date(), 'yyyy-MM-dd')) {
  const activeList = await db.recurrings.filter(r => r.active).toArray()
  if (activeList.length === 0) return 0

  const allFunds = await db.funds.toArray()
  const archivedFundIds = new Set(allFunds.filter(f => f.archived).map(f => f.id!))

  let createdCount = 0
  await db.transaction('rw', [db.recurrings, db.txs], async () => {
    for (const rec of activeList) {
      if (!rec.id) continue
      const isFrozen =
        archivedFundIds.has(rec.fundId) || (rec.toFundId != null && archivedFundIds.has(rec.toFundId))
      const dueDates = computeDueDates(rec, todayYmd, isFrozen)
      if (dueDates.length === 0) continue

      const existing = await db.txs.where('recurringId').equals(rec.id).toArray()
      const existingDates = new Set(existing.map(t => t.date))

      for (const dStr of dueDates) {
        if (!existingDates.has(dStr)) {
          await db.txs.add({
            type: rec.type,
            amount: rec.amount,
            date: dStr,
            fundId: rec.fundId,
            toFundId: rec.type === 'transfer' ? (rec.toFundId ?? null) : null,
            categoryId: rec.type === 'transfer' ? null : (rec.categoryId ?? null),
            note: rec.note ? `${rec.note} (Định kỳ: ${rec.name})` : `[Định kỳ] ${rec.name}`,
            createdAt: Date.now(),
            recurringId: rec.id,
          })
          createdCount++
        }
      }
      const newest = dueDates[dueDates.length - 1]
      await db.recurrings.update(rec.id, { lastGeneratedDate: newest })
    }
  })
  return createdCount
}

type StoreSubset = Pick<MoneyDB, 'funds' | 'categories' | 'txs' | 'budgets'> & {
  recurrings?: Table<RecurringTx, number>
}

export async function exportAll(store: StoreSubset = db) {
  return JSON.stringify(
    {
      app: 'MoneyGo',
      version: 2,
      exportedAt: new Date().toISOString(),
      funds: await store.funds.toArray(),
      categories: await store.categories.toArray(),
      txs: await store.txs.toArray(),
      budgets: await store.budgets.toArray(),
      recurrings: store.recurrings ? await store.recurrings.toArray() : [],
    },
    null,
    2,
  )
}

export async function importAll(
  json: string,
  store: StoreSubset & Pick<MoneyDB, 'transaction'> = db,
) {
  const d = JSON.parse(json)
  if (d?.app !== 'MoneyGo' || !Array.isArray(d.funds) || !Array.isArray(d.categories) || !Array.isArray(d.txs)) {
    throw new Error('File không phải bản sao lưu MoneyGo')
  }
  const tables = [store.funds, store.categories, store.txs, store.budgets, ...(store.recurrings ? [store.recurrings] : [])]
  await store.transaction('rw', tables, async () => {
    await Promise.all([
      store.funds.clear(),
      store.categories.clear(),
      store.txs.clear(),
      store.budgets.clear(),
      store.recurrings ? store.recurrings.clear() : Promise.resolve(),
    ])
    await store.funds.bulkAdd(d.funds)
    await store.categories.bulkAdd(d.categories)
    await store.txs.bulkAdd(d.txs)
    await store.budgets.bulkAdd(d.budgets ?? [])
    if (store.recurrings && Array.isArray(d.recurrings)) {
      await store.recurrings.bulkAdd(d.recurrings)
    }
  })
}
