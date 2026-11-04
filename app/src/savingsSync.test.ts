import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { syncSavingsGoalHistoryToTxs } from './db.ts'

type MoneyDB = NonNullable<Parameters<typeof syncSavingsGoalHistoryToTxs>[0]>

type Row = Record<string, unknown> & { id?: number }
function table(rows: Row[]) {
  let next = rows.reduce((m, r) => Math.max(m, r.id ?? 0), 0) + 1
  return {
    rows,
    toArray: async () => rows.map(r => ({ ...r })),
    add: async (r: Row) => { r.id = next++; rows.push({ ...r }); return r.id },
    update: async (id: number, patch: Row) => {
      const r = rows.find(x => x.id === id)
      if (r) Object.assign(r, patch)
      return r ? 1 : 0
    },
  }
}
function makeStore(goals: Row[], txs: Row[] = []) {
  const store = {
    savingsGoals: table(goals),
    funds: table([
      { id: 1, name: 'Ví Tiết Kiệm', kind: 'cash' },
      { id: 2, name: 'Tiền mặt', kind: 'cash' },
    ]),
    txs: table(txs),
  }
  return { store, db: store as unknown as MoneyDB }
}

describe('syncSavingsGoalHistoryToTxs', () => {
  it('tạo tx allocate/withdraw từ history và không tạo trùng khi chạy lại', async () => {
    const { store, db } = makeStore([{
      id: 10, name: 'Du lịch', icon: '✈️', allocatedAmount: 700000, savingsFundId: 1,
      startDate: '2026-10-01', createdAt: 1000,
      history: [
        { id: 'a1', date: '2026-10-05', amount: 1000000 },
        { id: 'w1', date: '2026-10-10', amount: -300000 },
      ],
    }])
    assert.equal(await syncSavingsGoalHistoryToTxs(db), 2)
    const txs = store.txs.rows
    assert.equal(txs.find(t => t.savingsLogId === 'a1')?.savingsAction, 'allocate')
    const w = txs.find(t => t.savingsLogId === 'w1')
    assert.equal(w?.savingsAction, 'withdraw')
    assert.equal(w?.amount, 300000)
    assert.equal(w?.excludeFromReport, true)
    assert.equal(await syncSavingsGoalHistoryToTxs(db), 0)
    assert.equal(store.txs.rows.length, 2)
  })

  it('tạo log khởi tạo khi allocatedAmount > 0 nhưng chưa có history', async () => {
    const { store, db } = makeStore([{
      id: 5, name: 'Mua sắm', icon: '🛍️', allocatedAmount: 500000, savingsFundId: 1,
      startDate: '2026-09-01', createdAt: 1,
    }])
    assert.equal(await syncSavingsGoalHistoryToTxs(db), 1)
    assert.equal(store.txs.rows[0].savingsLogId, 'init-goal-5')
    assert.equal(store.txs.rows[0].amount, 500000)
    assert.equal((store.savingsGoals.rows[0].history as unknown[]).length, 1)
  })

  it('không làm gì khi không có kế hoạch', async () => {
    const { db } = makeStore([])
    assert.equal(await syncSavingsGoalHistoryToTxs(db), 0)
  })
})
