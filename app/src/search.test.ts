import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { Category, Fund, RecurringTx, SavingsGoal, Tx } from './db'
import { matchesQuery, normalizeQuery, normalizeSearchText, searchFeatures, searchPlans, searchTxs } from './search.ts'

const funds = [
  { id: 1, name: 'Tiền mặt' },
  { id: 2, name: 'VCB' },
] as Fund[]
const cats = [
  { id: 10, name: 'Ăn uống' },
  { id: 11, name: 'Lương' },
] as Category[]
const fMap = new Map(funds.map(f => [f.id!, f]))
const cMap = new Map(cats.map(c => [c.id!, c]))
const tx = (p: Partial<Tx>): Tx => ({ type: 'expense', fundId: 1, amount: 0, date: '2026-11-01', createdAt: 0, ...p }) as Tx

const txs: Tx[] = [
  tx({ id: 1, categoryId: 10, amount: 50000, date: '2026-11-10', createdAt: 1, note: 'Phở bò sáng' }),
  tx({ id: 2, categoryId: 11, type: 'income', fundId: 2, amount: 15000000, date: '2026-11-05', createdAt: 2 }),
  tx({ id: 3, type: 'transfer', fundId: 1, toFundId: 2, amount: 2000000, date: '2026-11-10', createdAt: 5 }),
  tx({ id: 4, categoryId: 10, amount: 35000, date: '2026-10-28', createdAt: 3, note: 'Cà phê' }),
]

describe('Tìm kiếm: chuẩn hoá chuỗi (search.ts)', () => {
  it('Bỏ dấu tiếng Việt, đ→d, chữ thường, gộp khoảng trắng', () => {
    assert.equal(normalizeSearchText('  Đường   Ăn Uống  '), 'duong an uong')
    assert.equal(normalizeQuery('   '), '')
  })
  it('Mọi từ phải khớp, không cần đúng thứ tự; số có dấu chấm khớp số viết liền', () => {
    assert.equal(matchesQuery('Ăn uống Phở bò 50000', normalizeQuery('pho an')), true)
    assert.equal(matchesQuery('Ăn uống Phở bò 50000', normalizeQuery('pho lau')), false)
    assert.equal(matchesQuery('Ăn uống 50000', normalizeQuery('50.000')), true)
    assert.equal(matchesQuery('bất kỳ', ''), true)
  })
})

describe('Tìm kiếm: giao dịch (searchTxs)', () => {
  it('Truy vấn rỗng → không trả giao dịch', () => {
    assert.deepEqual(searchTxs(txs, '', cMap, fMap), [])
  })
  it('Tìm theo danh mục không dấu, sắp xếp mới nhất trước', () => {
    assert.deepEqual(searchTxs(txs, normalizeQuery('an uong'), cMap, fMap).map(t => t.id), [1, 4])
  })
  it('Tìm theo ghi chú, ví, ví nhận, ngày dd/MM/yyyy và số tiền', () => {
    assert.deepEqual(searchTxs(txs, normalizeQuery('phở'), cMap, fMap).map(t => t.id), [1])
    assert.deepEqual(searchTxs(txs, normalizeQuery('vcb'), cMap, fMap).map(t => t.id), [3, 2])
    assert.deepEqual(searchTxs(txs, normalizeQuery('10/11/2026'), cMap, fMap).map(t => t.id), [3, 1])
    assert.deepEqual(searchTxs(txs, normalizeQuery('15.000.000'), cMap, fMap).map(t => t.id), [2])
  })
  it('Cùng ngày → createdAt lớn hơn đứng trước; giới hạn số kết quả', () => {
    assert.deepEqual(searchTxs(txs, normalizeQuery('2026'), cMap, fMap, 2).map(t => t.id), [3, 1])
  })
})

describe('Tìm kiếm: chức năng & kế hoạch', () => {
  const features = [
    { id: 'a', title: 'Sổ giao dịch', subtitle: 'Lịch sử', keywords: 'so giao dich' },
    { id: 'b', title: 'Ngân sách', subtitle: 'Hạn mức', keywords: 'ngan sach' },
    { id: 'c', title: 'Tiết kiệm', subtitle: 'Mục tiêu', keywords: 'tiet kiem' },
  ]
  it('Rỗng → gợi ý N chức năng đầu; có dấu hay không dấu đều tìm được', () => {
    assert.deepEqual(searchFeatures(features, '', 2).map(f => f.id), ['a', 'b'])
    assert.deepEqual(searchFeatures(features, normalizeQuery('Hạn mức')).map(f => f.id), ['b'])
    assert.deepEqual(searchFeatures(features, normalizeQuery('muc tieu')).map(f => f.id), ['c'])
  })
  it('Mục tiêu đứng trước định kỳ, khớp theo tên/ghi chú', () => {
    const goals = [{ id: 1, name: 'Mua xe', note: 'Honda' }, { id: 2, name: 'Du lịch' }] as SavingsGoal[]
    const recs = [{ id: 7, name: 'Tiền điện', note: 'EVN xe đạp điện' }] as RecurringTx[]
    const hits = searchPlans(goals, recs, normalizeQuery('xe'))
    assert.deepEqual(hits.map(h => h.kind === 'goal' ? `g${h.goal.id}` : `r${h.recurring.id}`), ['g1', 'r7'])
    assert.equal(searchPlans(goals, recs, '').length, 0)
    assert.equal(searchPlans(goals, recs, normalizeQuery('dien')).length, 1)
  })
})
