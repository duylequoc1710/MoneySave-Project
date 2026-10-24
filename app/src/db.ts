import Dexie, { type Table } from 'dexie'

export type TxType = 'expense' | 'income' | 'transfer'

export interface Fund { id?: number; name: string; icon: string; color: string; initialBalance: number; archived?: boolean }
export interface Category { id?: number; name: string; type: 'expense' | 'income'; icon: string; color: string; fundId?: number | null }
export interface Tx {
  id?: number; type: TxType; amount: number; date: string // YYYY-MM-DD
  fundId: number; toFundId?: number | null; categoryId?: number | null; note: string; createdAt: number
}
export interface Budget { id?: number; categoryId: number; limit: number }

class MoneyDB extends Dexie {
  funds!: Table<Fund, number>
  categories!: Table<Category, number>
  txs!: Table<Tx, number>
  budgets!: Table<Budget, number>
  constructor() {
    super('moneygo')
    this.version(1).stores({
      funds: '++id',
      categories: '++id, type, fundId',
      txs: '++id, date, type, fundId, categoryId',
      budgets: '++id, categoryId',
    })
  }
}
export const db = new MoneyDB()

const EXP: [string, string, string][] = [
  ['Ăn uống', '🍜', '#f97316'], ['Di chuyển', '🛵', '#3b82f6'], ['Nhà cửa', '🏠', '#8b5cf6'],
  ['Mua sắm', '🛍️', '#ec4899'], ['Giải trí', '🎬', '#eab308'], ['Sức khoẻ', '💊', '#ef4444'],
  ['Học tập', '📚', '#06b6d4'], ['Hoá đơn', '🧾', '#64748b'], ['Khác', '📦', '#94a3b8'],
]
const INC: [string, string, string][] = [['Lương', '💼', '#10b981'], ['Thưởng', '🎁', '#22c55e'], ['Thu nhập khác', '💰', '#14b8a6']]

export async function seedIfEmpty() {
  if ((await db.funds.count()) > 0) return
  await db.funds.bulkAdd([
    { name: 'Tiền mặt', icon: '💵', color: '#10b981', initialBalance: 0 },
    { name: 'Ngân hàng', icon: '🏦', color: '#3b82f6', initialBalance: 0 },
  ])
  await db.categories.bulkAdd([
    ...EXP.map(([name, icon, color]) => ({ name, icon, color, type: 'expense' as const })),
    ...INC.map(([name, icon, color]) => ({ name, icon, color, type: 'income' as const })),
  ])
}

export async function exportAll() {
  return JSON.stringify({
    app: 'MoneyGo', version: 1, exportedAt: new Date().toISOString(),
    funds: await db.funds.toArray(), categories: await db.categories.toArray(),
    txs: await db.txs.toArray(), budgets: await db.budgets.toArray(),
  }, null, 2)
}

export async function importAll(json: string) {
  const d = JSON.parse(json)
  if (d.app !== 'MoneyGo') throw new Error('File không phải bản sao lưu MoneyGo')
  await db.transaction('rw', db.funds, db.categories, db.txs, db.budgets, async () => {
    await Promise.all([db.funds.clear(), db.categories.clear(), db.txs.clear(), db.budgets.clear()])
    await db.funds.bulkAdd(d.funds); await db.categories.bulkAdd(d.categories)
    await db.txs.bulkAdd(d.txs); await db.budgets.bulkAdd(d.budgets ?? [])
  })
}
