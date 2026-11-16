import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { pickSnapshotToReplace } from './safetyBackup.ts'
import { describeBackup } from './db.ts'

describe('Bản sao an toàn: gộp theo ngày (pickSnapshotToReplace)', () => {
  const now = new Date(2026, 10, 16, 15, 0).getTime()
  const morning = new Date(2026, 10, 16, 8, 0).getTime()
  const yesterday = new Date(2026, 10, 15, 23, 0).getTime()
  it('Bản "sync"/"daily" cùng ngày → ghi đè bản cũ cùng loại', () => {
    const ex = [
      { id: 1, createdAt: morning, kind: 'sync' as const },
      { id: 2, createdAt: morning, kind: 'daily' as const },
    ]
    assert.equal(pickSnapshotToReplace(ex, 'sync', now), 1)
    assert.equal(pickSnapshotToReplace(ex, 'daily', now), 2)
  })
  it('Khác ngày hoặc khác loại → tạo bản mới', () => {
    assert.equal(pickSnapshotToReplace([{ id: 1, createdAt: yesterday, kind: 'sync' }], 'sync', now), null)
    assert.equal(pickSnapshotToReplace([{ id: 1, createdAt: morning, kind: 'daily' }], 'sync', now), null)
  })
  it('Bản "event" (khôi phục/xoá sạch) luôn tạo mới; bản cũ không có kind không bao giờ bị ghi đè', () => {
    assert.equal(pickSnapshotToReplace([{ id: 1, createdAt: morning, kind: 'event' }], 'event', now), null)
    assert.equal(pickSnapshotToReplace([{ id: 1, createdAt: morning }], 'sync', now), null)
  })
})

describe('Xem trước file sao lưu (describeBackup)', () => {
  it('Đếm đúng số ví/giao dịch và khoảng ngày', () => {
    const s = describeBackup(
      JSON.stringify({
        app: 'MoneyGo',
        exportedAt: '2026-11-16T08:00:00.000Z',
        funds: [{}, {}],
        categories: [{}],
        txs: [{ date: '2026-11-02' }, { date: '2026-01-05' }, { date: '2026-06-30' }],
        budgets: [],
        savingsGoals: [{}],
      }),
    )
    assert.equal(s.funds, 2)
    assert.equal(s.txs, 3)
    assert.equal(s.recurrings, 0)
    assert.equal(s.savingsGoals, 1)
    assert.equal(s.firstDate, '2026-01-05')
    assert.equal(s.lastDate, '2026-11-02')
  })
  it('Từ chối file không hợp lệ (không ghi gì)', () => {
    assert.throws(() => describeBackup('not json'), /không phải bản sao lưu/)
    assert.throws(() => describeBackup(JSON.stringify({ app: 'X', funds: [], txs: [] })), /không phải bản sao lưu/)
  })
})
