import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  analyzeCreditFund,
  buildCalendarWeekBuckets,
  fmtDmy,
  monthLabel,
  buildCsvContent,
  buildExcelXml,
  computeTotalBalance,
  effectOn,
  filterReportableTxs,
  getIncludedFunds,
  groupCategoriesHierarchy,
  getCategoryFullName,
  getMonthTabLabel,
  evaluateKeypadExpression,
  formatKeypadDisplay,
  money,
  moneyShort,
  resolveTimeRange,
  ymd,
  monthKey,
  shiftMonth,
} from './lib.ts'
import {
  computeDueDates,
  exportAll,
  getNextOccurrence,
  importAll,
  type Budget,
  type Category,
  type Fund,
  type RecurringTx,
  type Tx,
} from './db.ts'
import {
  decryptVault,
  deriveVaultDocId,
  encryptVault,
  getActiveCloudSyncConfig,
  parseFirebaseConfigInput,
} from './cloudSync.ts'
import { signInWithEmail, signUpWithEmail } from './auth.ts'

describe('effectOn – tính số dư quỹ theo giao dịch', () => {
  const baseTx = { date: '2026-10-24', note: '', createdAt: 1 }

  it('income cộng tiền đúng vào quỹ nhận và không ảnh hưởng quỹ khác', () => {
    const tx: Tx = { ...baseTx, type: 'income', amount: 5_000_000, fundId: 1 }
    assert.equal(effectOn(tx, 1), 5_000_000)
    assert.equal(effectOn(tx, 2), 0)
  })

  it('expense trừ tiền đúng khỏi quỹ chi và không ảnh hưởng quỹ khác', () => {
    const tx: Tx = { ...baseTx, type: 'expense', amount: 120_000, fundId: 1 }
    assert.equal(effectOn(tx, 1), -120_000)
    assert.equal(effectOn(tx, 2), 0)
  })

  it('transfer trừ tiền quỹ nguồn, cộng tiền quỹ đích và bảo toàn tổng số dư (= 0)', () => {
    const tx: Tx = { ...baseTx, type: 'transfer', amount: 2_000_000, fundId: 1, toFundId: 2 }
    assert.equal(effectOn(tx, 1), -2_000_000)
    assert.equal(effectOn(tx, 2), 2_000_000)
    assert.equal(effectOn(tx, 3), 0)
    assert.equal(effectOn(tx, 1) + effectOn(tx, 2) + effectOn(tx, 3), 0)
  })
})

describe('Định dạng tiền tệ & ngày tháng', () => {
  it('money & moneyShort định dạng đúng chuẩn VND', () => {
    assert.match(money(1500000), /1,500,000\s*₫/)
    assert.equal(moneyShort(500), '500')
    assert.equal(moneyShort(45_000), '45k')
    assert.equal(moneyShort(2_500_000), '2.5 M')
    assert.equal(moneyShort(3_000_000_000), '3 tỷ')
  })

  it('ymd, monthKey, shiftMonth xử lý đúng ngày và chuyển tháng tương lai/quá khứ', () => {
    const d = new Date(2026, 9, 24) // 2026-10-24 local
    assert.equal(ymd(d), '2026-10-24')
    assert.equal(monthKey(d), '2026-10')
    assert.equal(monthKey(shiftMonth(d, 2)), '2026-12')
    assert.equal(monthKey(shiftMonth(d, -1)), '2026-09')
  })

  it('getMonthTabLabel định dạng nhãn trượt cửa sổ chuẩn MoneyLover', () => {
    const now = new Date(2026, 9, 1) // 10/2026
    assert.equal(getMonthTabLabel(new Date(2026, 9, 1), now), 'THÁNG NÀY')
    assert.equal(getMonthTabLabel(new Date(2026, 8, 1), now), 'THÁNG TRƯỚC')
    assert.equal(getMonthTabLabel(new Date(2026, 10, 1), now), 'TƯƠNG LAI')
    assert.equal(getMonthTabLabel(new Date(2026, 7, 1), now), '08/2026')
    assert.equal(getMonthTabLabel(new Date(2026, 5, 1), now), '06/2026')
    assert.equal(getMonthTabLabel(new Date(2027, 0, 1), now), '01/2027')
  })

  it('evaluateKeypadExpression & formatKeypadDisplay tính toán và định dạng chuẩn dấu phân cách', () => {
    // Định dạng số nguyên và số thập phân
    assert.equal(formatKeypadDisplay('90000'), '90,000')
    assert.equal(formatKeypadDisplay('90000.'), '90,000.')
    assert.equal(formatKeypadDisplay('90000.5'), '90,000.5')
    assert.equal(formatKeypadDisplay('1500000.75'), '1,500,000.75')
    assert.equal(formatKeypadDisplay('0'), '0')
    assert.equal(formatKeypadDisplay(''), '0')

    // Định dạng biểu thức toán học
    assert.equal(formatKeypadDisplay('50000+40000'), '50,000 + 40,000')
    assert.equal(formatKeypadDisplay('100000-15000'), '100,000 - 15,000')
    assert.equal(formatKeypadDisplay('20000×3'), '20,000 × 3')

    // Đánh giá biểu thức tính toán
    assert.equal(evaluateKeypadExpression('90000'), 90000)
    assert.equal(evaluateKeypadExpression('90000.5'), 90000.5)
    assert.equal(evaluateKeypadExpression('50000+40000'), 90000)
    assert.equal(evaluateKeypadExpression('100000-15000'), 85000)
    assert.equal(evaluateKeypadExpression('20000×3'), 60000)
    assert.equal(evaluateKeypadExpression('100000÷2'), 50000)
    assert.equal(evaluateKeypadExpression('50000+40000*2'), 130000) // nhân chia trước
    assert.equal(evaluateKeypadExpression('90000+'), 90000) // bỏ qua toán tử cuối chưa xong
    assert.equal(evaluateKeypadExpression(''), 0)
  })
})

describe('Giao dịch định kỳ (computeDueDates & getNextOccurrence)', () => {
  it('Tự động tính các kỳ hóa đơn hàng tháng từ ngày bắt đầu đến hôm nay và không lặp lại kỳ đã chạy', () => {
    const rec: RecurringTx = {
      id: 1,
      name: 'Tiền Internet',
      type: 'expense',
      amount: 300_000,
      fundId: 1,
      categoryId: 1,
      note: 'FPT',
      frequency: 'monthly',
      dayOfMonth: 15,
      startDate: '2026-08-10',
      lastGeneratedDate: null,
      active: true,
    }
    const due = computeDueDates(rec, '2026-10-24')
    assert.deepEqual(due, ['2026-08-15', '2026-09-15', '2026-10-15'])

    // Sau khi đã chạy tới 2026-10-15, gọi lại trong cùng ngày 2026-10-24 không sinh thêm
    const recAfter = { ...rec, lastGeneratedDate: '2026-10-15' }
    assert.deepEqual(computeDueDates(recAfter, '2026-10-24'), [])
    assert.equal(getNextOccurrence(recAfter, '2026-10-24'), '2026-11-15')
  })

  it('Xử lý đúng ngày 31 cho các tháng thiếu (ví dụ tháng 2 và tháng 9)', () => {
    const rec: RecurringTx = {
      id: 2,
      name: 'Tiền nhà',
      type: 'expense',
      amount: 6_000_000,
      fundId: 1,
      categoryId: 1,
      note: '',
      frequency: 'monthly',
      dayOfMonth: 31,
      startDate: '2026-02-01',
      lastGeneratedDate: null,
      active: true,
    }
    const due = computeDueDates(rec, '2026-04-30')
    assert.deepEqual(due, ['2026-02-28', '2026-03-31', '2026-04-30'])
  })

  it('Ngừng tự động phát sinh giao dịch định kỳ khi Ví ở trạng thái Lưu trữ (archived = true)', () => {
    const rec: RecurringTx = {
      id: 3,
      name: 'Hoá đơn định kỳ',
      type: 'expense',
      amount: 500_000,
      fundId: 1,
      categoryId: 1,
      note: '',
      frequency: 'monthly',
      dayOfMonth: 10,
      startDate: '2026-09-01',
      lastGeneratedDate: null,
      active: true,
    }
    assert.deepEqual(computeDueDates(rec, '2026-10-24', true), [])
  })
})

describe('Tính năng Ví: Không tính vào tổng (excludeFromTotal) & Không tính vào báo cáo (excludeFromReport)', () => {
  const funds: Fund[] = [
    { id: 1, name: 'Quỹ Chính', icon: '👛', color: '#f97316', initialBalance: 60_000_000, excludeFromTotal: false },
    { id: 2, name: 'Investing', icon: '💰', color: '#10b981', initialBalance: 159_506_700, excludeFromTotal: true },
    { id: 3, name: 'Saving LT', icon: '🪙', color: '#14b8a6', initialBalance: 23_000_000, excludeFromTotal: true },
  ]

  const txs: Tx[] = [
    // Giao dịch chi ở Quỹ Chính (Tính vào tổng)
    { id: 1, type: 'expense', amount: 1_000_000, date: '2026-10-10', fundId: 1, categoryId: 1, note: 'Ăn uống', createdAt: 1 },
    // Giao dịch thu ở ví Investing (Không tính vào tổng)
    { id: 2, type: 'income', amount: 4_500_000, date: '2026-10-18', fundId: 2, categoryId: 12, note: 'Cổ tức', createdAt: 2 },
    // Giao dịch Điều chỉnh số dư ở Quỹ Chính (excludeFromReport = true)
    {
      id: 3,
      type: 'income',
      amount: 1_871_584,
      date: '2026-10-24',
      fundId: 1,
      categoryId: null,
      note: 'Điều chỉnh số dư',
      createdAt: 3,
      excludeFromReport: true,
    },
  ]

  it('Khi xem Tổng cộng (fundFilter = 0), số dư và danh sách ví loại bỏ hoàn toàn các ví bật Không tính vào tổng', () => {
    const included = getIncludedFunds(funds, 0)
    assert.equal(included.length, 1)
    assert.equal(included[0].name, 'Quỹ Chính')

    // Số dư Quỹ Chính = 60,000,000 - 1,000,000 + 1,871,584 (điều chỉnh số dư vẫn cập nhật số dư ví!) = 60,871,584
    assert.equal(computeTotalBalance(funds, txs, 0), 60_871_584)

    // Khi xem riêng ví Investing (fundFilter = 2), số dư của riêng ví đó vẫn tính đầy đủ: 159,506,700 + 4,500,000
    assert.equal(computeTotalBalance(funds, txs, 2), 164_006_700)
  })

  it('Báo cáo tổng hợp loại bỏ cả giao dịch của ví Không tính vào tổng LẪN giao dịch bật Không tính vào báo cáo', () => {
    const reportAll = filterReportableTxs(txs, funds, 0)
    // Chỉ còn lại duy nhất giao dịch id=1 (Ăn uống 1,000,000 ở Quỹ Chính); id=2 (Investing) và id=3 (Điều chỉnh số dư) đều bị loại
    assert.deepEqual(reportAll.map(t => t.id), [1])

    // Nhưng khi xem báo cáo của riêng ví Investing (fundFilter = 2) thì giao dịch id=2 được hiển thị
    const reportInvesting = filterReportableTxs(txs, funds, 2)
    assert.deepEqual(reportInvesting.map(t => t.id), [2])
  })
})

describe('Phân tích Quỹ tín dụng – Xài trước trả sau (analyzeCreditFund)', () => {
  const creditFund: Fund = {
    id: 10,
    name: 'VIB Cash Back',
    icon: '💳',
    color: '#8b5cf6',
    initialBalance: 0,
    kind: 'credit',
    creditLimit: 50_000_000,
    statementDay: 20,
    dueDay: 5,
  }

  it('Tính đúng dư nợ, hạn mức còn lại, ngày chốt sao kê, hạn thanh toán và thời gian miễn lãi tối ưu', () => {
    const txs: Tx[] = [
      {
        id: 1,
        type: 'expense',
        amount: 4_000_000,
        date: '2026-10-22',
        fundId: 10,
        categoryId: 1,
        note: 'Mua đồ',
        createdAt: 1,
      },
    ]
    // Ngày tham chiếu: 24/10/2026 (vừa qua ngày chốt sao kê 20/10 được 4 ngày)
    const info = analyzeCreditFund(creditFund, txs, new Date(2026, 9, 24))
    assert.equal(info.debt, 4_000_000)
    assert.equal(info.availableCredit, 46_000_000)
    assert.equal(info.lastStatementDate, '2026-10-20')
    assert.equal(info.nextStatementDate, '2026-11-20')
    assert.equal(info.daysUntilStatement, 27)
    // Hạn thanh toán của kỳ 20/10 là 05/11/2026 (còn 12 ngày)
    assert.equal(info.nextDueDate, '2026-11-05')
    assert.equal(info.daysUntilDue, 12)
    // Giao dịch ngày 24/10 rơi vào kỳ sao kê 20/11 và hạn trả là 05/12 -> miễn lãi 42 ngày!
    assert.equal(info.interestFreeDaysToday, 42)
    assert.equal(info.statusTag, 'optimal')
  })
})

function createMockStore(initial?: {
  funds?: Fund[]
  categories?: Category[]
  txs?: Tx[]
  budgets?: Budget[]
  recurrings?: RecurringTx[]
}) {
  const makeTable = <T,>(arr: T[]) => {
    let data = [...arr]
    return {
      toArray: async () => [...data],
      clear: async () => {
        data = []
      },
      bulkAdd: async (items: T[]) => {
        data.push(...items)
      },
    }
  }
  const store = {
    funds: makeTable<Fund>(initial?.funds ?? []),
    categories: makeTable<Category>(initial?.categories ?? []),
    txs: makeTable<Tx>(initial?.txs ?? []),
    budgets: makeTable<Budget>(initial?.budgets ?? []),
    recurrings: makeTable<RecurringTx>(initial?.recurrings ?? []),
    transaction: async (_mode: string, ...args: unknown[]) => {
      const cb = args[args.length - 1] as () => Promise<void>
      await cb()
    },
  }
  return store as unknown as NonNullable<Parameters<typeof importAll>[1]>
}

describe('Sao lưu & khôi phục dữ liệu (exportAll / importAll)', () => {
  it('Sao lưu rồi khôi phục sang kho dữ liệu khác giữ nguyên 100% quỹ, nhóm, giao dịch, ngân sách và định kỳ', async () => {
    const src = createMockStore({
      funds: [
        {
          id: 1,
          name: 'Thẻ Tín Dụng',
          icon: '💳',
          color: '#8b5cf6',
          initialBalance: 0,
          kind: 'credit',
          creditLimit: 30_000_000,
          statementDay: 20,
          dueDay: 5,
        },
      ],
      categories: [{ id: 1, name: 'Ăn uống', type: 'expense', icon: '🍜', color: '#f97316', fundId: 1 }],
      txs: [
        {
          id: 1,
          type: 'expense',
          amount: 55_000,
          date: '2026-10-24',
          fundId: 1,
          categoryId: 1,
          note: 'Phở bò',
          createdAt: 1700000000000,
        },
      ],
      budgets: [{ id: 1, categoryId: 1, limit: 3_000_000 }],
      recurrings: [
        {
          id: 1,
          name: 'Netflix',
          type: 'expense',
          amount: 260_000,
          fundId: 1,
          categoryId: 1,
          note: '',
          frequency: 'monthly',
          dayOfMonth: 10,
          startDate: '2026-10-01',
          lastGeneratedDate: '2026-10-10',
          active: true,
        },
      ],
    })

    const json = await exportAll(src)
    const parsed = JSON.parse(json)
    assert.equal(parsed.app, 'MoneyGo')
    assert.equal(parsed.version, 2)

    const dest = createMockStore()
    await importAll(json, dest)

    assert.deepEqual(await dest.funds.toArray(), await src.funds.toArray())
    assert.deepEqual(await dest.categories.toArray(), await src.categories.toArray())
    assert.deepEqual(await dest.txs.toArray(), await src.txs.toArray())
    assert.deepEqual(await dest.budgets.toArray(), await src.budgets.toArray())
    assert.deepEqual(await dest.recurrings!.toArray(), await src.recurrings!.toArray())
  })

  it('Từ chối file JSON không phải của MoneyGo hoặc thiếu dữ liệu bắt buộc', async () => {
    const dest = createMockStore({
      funds: [{ id: 1, name: 'Tiền mặt', icon: '💵', color: '#10b981', initialBalance: 500_000 }],
    })
    await assert.rejects(() => importAll(JSON.stringify({ app: 'OtherApp' }), dest), /MoneyGo/)
    await assert.rejects(() => importAll(JSON.stringify({ app: 'MoneyGo', funds: 'invalid' }), dest), /MoneyGo/)
    assert.equal((await dest.funds.toArray()).length, 1)
  })
})

describe('Bộ lọc khoảng thời gian (resolveTimeRange) & Xuất file Excel (buildExcelXml)', () => {
  it('resolveTimeRange tính đúng khoảng ngày cho month, today, week, quarter, year, all và custom', () => {
    const refDate = new Date(2026, 9, 25) // Chủ Nhật 25/10/2026
    const baseMonth = new Date(2026, 9, 1)

    const mRange = resolveTimeRange({ mode: 'month', month: baseMonth, startDate: '', endDate: '' }, refDate)
    assert.equal(mRange.from, '2026-10-01')
    assert.equal(mRange.to, '2026-10-31')
    assert.equal(mRange.isMonthMode, true)

    const todayRange = resolveTimeRange({ mode: 'today', month: baseMonth, startDate: '', endDate: '' }, refDate)
    assert.equal(todayRange.from, '2026-10-25')
    assert.equal(todayRange.to, '2026-10-25')
    assert.equal(todayRange.isMonthMode, false)

    const weekRange = resolveTimeRange({ mode: 'week', month: baseMonth, startDate: '', endDate: '' }, refDate)
    assert.equal(weekRange.from, '2026-10-19') // Thứ Hai
    assert.equal(weekRange.to, '2026-10-25') // Chủ Nhật

    const quarterRange = resolveTimeRange({ mode: 'quarter', month: baseMonth, startDate: '', endDate: '' }, refDate)
    assert.equal(quarterRange.from, '2026-10-01')
    assert.equal(quarterRange.to, '2026-12-31')

    // Custom range tự động sắp xếp lại nếu người dùng chọn startDate > endDate
    const customRange = resolveTimeRange(
      { mode: 'custom', month: baseMonth, startDate: '2026-10-20', endDate: '2026-10-05' },
      refDate,
    )
    assert.equal(customRange.from, '2026-10-05')
    assert.equal(customRange.to, '2026-10-20')
  })

  it('buildExcelXml & buildCsvContent xuất đầy đủ 2 Sheet Excel và định dạng chuẩn tiếng Việt', () => {
    const funds: Fund[] = [
      { id: 1, name: 'Quỹ Chính', icon: '👛', color: '#10b981', initialBalance: 10_000_000 },
      { id: 2, name: 'Investing', icon: '💰', color: '#eab308', initialBalance: 50_000_000, excludeFromTotal: true },
    ]
    const cats: Category[] = [
      { id: 1, name: 'Ăn uống & Cafe', type: 'expense', icon: '🍜', color: '#f97316', fundId: 1 },
      { id: 2, name: 'Lương', type: 'income', icon: '💼', color: '#22c55e', fundId: 1 },
    ]
    const txs: Tx[] = [
      { id: 1, type: 'income', amount: 25_000_000, date: '2026-10-05', fundId: 1, categoryId: 2, note: 'Lương tháng 10', createdAt: 1 },
      { id: 2, type: 'expense', amount: 150_000, date: '2026-10-06', fundId: 1, categoryId: 1, note: 'Ăn trưa <test>', createdAt: 2 },
    ]

    const xml = buildExcelXml(funds, cats, txs)
    assert.ok(xml.includes('<Worksheet ss:Name="So Giao Dich">'))
    assert.ok(xml.includes('<Worksheet ss:Name="Danh Sach Vi">'))
    assert.ok(xml.includes('<Data ss:Type="Number">25000000</Data>'))
    assert.ok(xml.includes('Ăn uống &amp; Cafe'))
    assert.ok(xml.includes('Ăn trưa &lt;test&gt;'))

    const csv = buildCsvContent(funds, cats, txs)
    assert.ok(csv.startsWith('\uFEFF'))
    assert.ok(csv.includes('Lương tháng 10'))
  })
})

describe('Hệ thống Nhóm Cha & Nhóm Con (Category Hierarchy)', () => {
  const sampleCats: Category[] = [
    { id: 1, name: 'Thiết Yếu 50%', type: 'expense', icon: '🏡', color: '#eab308' },
    { id: 2, name: 'Cá nhân 25%', type: 'expense', icon: '👤', color: '#ef4444' },
    { id: 3, name: 'Ăn uống', type: 'expense', icon: '🍜', color: '#f97316', parentId: 1 },
    { id: 4, name: 'Di chuyển', type: 'expense', icon: '🚗', color: '#eab308', parentId: 1 },
    { id: 5, name: 'Mua sắm', type: 'expense', icon: '🛍️', color: '#ec4899', parentId: 2 },
    { id: 6, name: 'Khác', type: 'expense', icon: '📦', color: '#94a3b8' }, // Nhóm độc lập không có con
    { id: 7, name: 'Mồ côi', type: 'expense', icon: '❓', color: '#94a3b8', parentId: 9999 }, // Cha không tồn tại
  ]

  it('groupCategoriesHierarchy gom đúng các nhóm cha có nhóm con và các nhóm độc lập', () => {
    const { parentGroups, independent } = groupCategoriesHierarchy(sampleCats)

    assert.equal(parentGroups.length, 2)
    const thietYeuGrp = parentGroups.find(g => g.parent.id === 1)
    assert.ok(thietYeuGrp)
    assert.equal(thietYeuGrp.children.length, 2)
    assert.deepEqual(thietYeuGrp.children.map(c => c.name), ['Ăn uống', 'Di chuyển'])

    const caNhanGrp = parentGroups.find(g => g.parent.id === 2)
    assert.ok(caNhanGrp)
    assert.equal(caNhanGrp.children.length, 1)
    assert.equal(caNhanGrp.children[0].name, 'Mua sắm')

    // Nhóm 'Khác' và nhóm 'Mồ côi' (cha không tồn tại) phải tự động đưa vào independent
    assert.equal(independent.length, 2)
    assert.ok(independent.some(c => c.name === 'Khác'))
    assert.ok(independent.some(c => c.name === 'Mồ côi'))
  })

  it('getCategoryFullName hiển thị đúng "Nhóm cha › Nhóm con" hoặc tên gốc', () => {
    const anUong = sampleCats.find(c => c.id === 3)!
    assert.equal(getCategoryFullName(anUong, sampleCats), 'Thiết Yếu 50% › Ăn uống')

    const thietYeu = sampleCats.find(c => c.id === 1)!
    assert.equal(getCategoryFullName(thietYeu, sampleCats), 'Thiết Yếu 50%')

    const khac = sampleCats.find(c => c.id === 6)!
    assert.equal(getCategoryFullName(khac, sampleCats), 'Khác')
  })
})


describe('Đồng bộ Cloud Realtime & Mã hóa đầu cuối E2EE (cloudSync.ts)', () => {
  it('parseFirebaseConfigInput tách đúng projectId, databaseUrl và apiKey từ chuỗi đơn, link RTDB hoặc đoạn code firebaseConfig', () => {
    const simple = parseFirebaseConfigInput('  moneysave-personal-2026  ')
    assert.equal(simple.projectId, 'moneysave-personal-2026')
    assert.equal(simple.apiKey, '')
    assert.equal(simple.databaseUrl, '')

    const rtdbUrl = parseFirebaseConfigInput('https://moneysave-project-default-rtdb.asia-southeast1.firebasedatabase.app/')
    assert.equal(rtdbUrl.databaseUrl, 'https://moneysave-project-default-rtdb.asia-southeast1.firebasedatabase.app')
    assert.equal(rtdbUrl.projectId, 'moneysave-project')

    const snippet = parseFirebaseConfigInput(`
      const firebaseConfig = {
        apiKey: "AIzaSyDemoKey123456789",
        authDomain: "moneysave-demo.firebaseapp.com",
        databaseURL: "https://moneysave-demo-rtdb.asia-southeast1.firebasedatabase.app",
        projectId: "moneysave-demo-id",
        storageBucket: "moneysave-demo.appspot.com"
      };
    `)
    assert.equal(snippet.projectId, 'moneysave-demo-id')
    assert.equal(snippet.apiKey, 'AIzaSyDemoKey123456789')
    assert.equal(snippet.databaseUrl, 'https://moneysave-demo-rtdb.asia-southeast1.firebasedatabase.app')
  })

  it('deriveVaultDocId tạo mã định danh ẩn danh SHA-256 nhất quán từ Sync ID + Passphrase', async () => {
    const id1 = await deriveVaultDocId('My-Family-Vault', 'MatKhauBiMat#2026')
    const id2 = await deriveVaultDocId('my-family-vault', 'MatKhauBiMat#2026')
    const idDiffPass = await deriveVaultDocId('my-family-vault', 'MatKhauKhac#9999')

    assert.ok(id1.startsWith('vault_'))
    assert.equal(id1.length, 46) // 'vault_' + 40 hex chars
    assert.equal(id1, id2) // không phân biệt hoa thường ở Sync ID
    assert.notEqual(id1, idDiffPass) // đổi passphrase tạo vault docId hoàn toàn khác
  })

  it('encryptVault & decryptVault mã hóa AES-GCM 256-bit (Zero-Knowledge) và từ chối sai khóa', async () => {
    const sampleJson = JSON.stringify({
      app: 'MoneyGo',
      version: 2,
      funds: [{ id: 1, name: 'Quỹ Tiết Kiệm Bí Mật', initialBalance: 500_000_000 }],
      txs: [{ id: 1, type: 'income', amount: 85_000_000, note: 'Thưởng dự án Quý 4' }],
    })

    const encrypted = await encryptVault(sampleJson, 'MySuperSecretKey!2026', 'dev_macbook', 1761380000000)

    assert.equal(encrypted.v, 1)
    assert.equal(encrypted.alg, 'AES-GCM-256/PBKDF2-SHA256')
    assert.equal(encrypted.deviceId, 'dev_macbook')
    assert.equal(encrypted.updatedAt, 1761380000000)
    assert.equal(encrypted.checksum.length, 16)

    // Đảm bảo bản mã trên Cloud hoàn toàn không chứa bất kỳ thông tin nhạy cảm nào
    assert.ok(!encrypted.ciphertext.includes('Quỹ Tiết Kiệm Bí Mật'))
    assert.ok(!encrypted.ciphertext.includes('500000000'))
    assert.ok(!encrypted.ciphertext.includes('Thưởng dự án Quý 4'))

    // Giải mã với đúng khóa bí mật trả về đúng 100% dữ liệu gốc
    const decrypted = await decryptVault(encrypted, 'MySuperSecretKey!2026')
    assert.equal(decrypted, sampleJson)

    // Giải mã với sai khóa bí mật phải báo lỗi xác thực AES-GCM
    await assert.rejects(
      () => decryptVault(encrypted, 'WrongKey!123'),
      /Không thể giải mã dữ liệu/,
    )
  })

  it('getActiveCloudSyncConfig tự động gán cấu hình Firebase tích hợp sẵn', () => {
    const active = getActiveCloudSyncConfig()
    assert.ok(typeof active.enabled === 'boolean')
    assert.ok(typeof active.projectId === 'string')
  })

  it('auth kiểm tra tính hợp lệ của email và mật khẩu tối thiểu 6 ký tự', async () => {
    await assert.rejects(() => signUpWithEmail('invalid-email', '123456'), /email hợp lệ/)
    await assert.rejects(() => signUpWithEmail('user@test.com', '123'), /tối thiểu 6 ký tự/)
    await assert.rejects(() => signInWithEmail('', '123456'), /email hợp lệ/)
    await assert.rejects(() => signInWithEmail('user@test.com', ''), /mật khẩu/)
  })
})

describe('Định kỳ – các trường hợp biên', () => {
  const base: RecurringTx = {
    id: 9, name: 'X', type: 'expense', amount: 1, fundId: 1, categoryId: 1, note: '',
    frequency: 'monthly', dayOfMonth: 31, startDate: '2027-12-01', lastGeneratedDate: null, active: true,
  }
  it('Ngày 31 rơi vào cuối tháng ngắn và Tháng 2 năm nhuận (2028)', () => {
    const due = computeDueDates(base, '2028-03-01')
    assert.deepEqual(due, ['2027-12-31', '2028-01-31', '2028-02-29'])
  })
  it('Không phát sinh trùng sau khi đã chạy (lastGeneratedDate)', () => {
    const due = computeDueDates({ ...base, lastGeneratedDate: '2028-01-31' }, '2028-03-01')
    assert.deepEqual(due, ['2028-02-29'])
  })
  it('Hàng tuần & hàng ngày tăng đúng bước', () => {
    const w = computeDueDates({ ...base, frequency: 'weekly', startDate: '2026-10-01' }, '2026-10-22')
    assert.deepEqual(w, ['2026-10-01', '2026-10-08', '2026-10-15', '2026-10-22'])
    const d = computeDueDates({ ...base, frequency: 'daily', startDate: '2026-10-01' }, '2026-10-03')
    assert.equal(d.length, 3)
  })
  it('Không phát sinh khi chưa đến ngày bắt đầu hoặc đang tắt', () => {
    assert.deepEqual(computeDueDates({ ...base, startDate: '2030-01-01' }, '2026-10-01'), [])
    assert.deepEqual(computeDueDates({ ...base, active: false }, '2028-03-01'), [])
  })
  it('getNextOccurrence hàng tháng ngày 31 sau lần chạy 30/01', () => {
    const next = getNextOccurrence({ ...base, lastGeneratedDate: '2028-01-31' }, '2028-02-01')
    assert.equal(next, '2028-02-29')
  })
})

describe('Báo cáo tuần Thứ 2 → Chủ nhật & định dạng hiển thị', () => {
  const mk = (date: string, type: 'income' | 'expense', amount: number): Tx => ({
    id: 1, type, amount, date, fundId: 1, categoryId: 1, note: '', createdAt: 0,
  })
  it('Tháng 10/2026 (ngày 1 là Thứ Năm): tuần đầu chỉ 1-4, rồi 5-11, 12-18, 19-25, 26-31', () => {
    const b = buildCalendarWeekBuckets(new Date(2026, 9, 1), new Date(2026, 10, 15), [], 'expense')
    assert.deepEqual(b.map(x => x.label), ['1-4', '5-11', '12-18', '19-25', '26-31'])
  })
  it('Tháng hiện tại chỉ tính đến hôm nay (26/10 → bucket 26)', () => {
    const b = buildCalendarWeekBuckets(new Date(2026, 9, 1), new Date(2026, 9, 26), [], 'expense')
    assert.equal(b[b.length - 1].label, '26')
  })
  it('Cộng tiền đúng vào tuần chứa ngày giao dịch', () => {
    const txs = [mk('2026-10-03', 'income', 10_500_000), mk('2026-10-01', 'expense', 100), mk('2026-10-06', 'expense', 50)]
    const inc = buildCalendarWeekBuckets(new Date(2026, 9, 1), new Date(2026, 10, 15), txs, 'income')
    const exp = buildCalendarWeekBuckets(new Date(2026, 9, 1), new Date(2026, 10, 15), txs, 'expense')
    assert.equal(inc[0].amount, 10_500_000)
    assert.equal(exp[0].amount, 100)
    assert.equal(exp[1].amount, 50)
  })
  it('monthLabel = MM/yyyy và fmtDmy = dd/MM/yyyy', () => {
    assert.equal(monthLabel(new Date(2026, 6, 1)), '07/2026')
    assert.equal(fmtDmy('2026-11-10'), '10/11/2026')
    assert.equal(fmtDmy('không phải ngày'), 'không phải ngày')
  })
})

describe('Nhắc sao lưu định kỳ', () => {
  it('Nhắc khi chưa từng sao lưu, im lặng khi vừa sao lưu, nhắc lại sau 7 ngày, hoãn được', async () => {
    const mem = new Map<string, string>()
    ;(globalThis as unknown as { localStorage: Storage }).localStorage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    } as unknown as Storage
    const m = await import('./safetyBackup.ts')
    const now = Date.now()
    assert.deepEqual(m.backupReminderState(now), { daysSince: null })
    m.markBackupDownloaded()
    assert.equal(m.backupReminderState(Date.now()), undefined)
    assert.equal(m.backupReminderState(now + 8 * 86400000)?.daysSince, 8)
    mem.delete('moneysave_last_backup_at')
    m.snoozeBackupReminder(3)
    assert.equal(m.backupReminderState(now + 86400000), undefined) // đang hoãn
    assert.deepEqual(m.backupReminderState(now + 4 * 86400000), { daysSince: null }) // hết hoãn
  })
})
