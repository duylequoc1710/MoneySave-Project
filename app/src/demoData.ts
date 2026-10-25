import { db, type Budget, type Category, type Fund, type RecurringTx, type Tx } from './db'

const DEMO_FLAG_KEY = 'moneygo_demo_3m_v2'

export async function seedDemoData3Months(force = false) {
  if (!force && typeof localStorage !== 'undefined' && localStorage.getItem(DEMO_FLAG_KEY) === 'done') {
    return false
  }

  const funds: Fund[] = [
    { id: 1, name: 'Quỹ Chính', icon: '👛', color: '#f97316', initialBalance: 45_000_000, kind: 'cash' },
    { id: 2, name: 'Techcombank', icon: '🏦', color: '#3b82f6', initialBalance: 15_000_000, kind: 'cash' },
    {
      id: 3,
      name: 'VIB Cash Back',
      icon: '💳',
      color: '#8b5cf6',
      initialBalance: 0,
      kind: 'credit',
      creditLimit: 50_000_000,
      statementDay: 20, // Hôm nay 24/10 -> Vừa qua ngày chốt 4 ngày -> Thời điểm vàng (Miễn lãi 42 ngày)
      dueDay: 5,
    },
    {
      id: 4,
      name: 'VPBank StepUp',
      icon: '💳',
      color: '#06b6d4',
      initialBalance: 0,
      kind: 'credit',
      creditLimit: 30_000_000,
      statementDay: 26, // Hôm nay 24/10 -> Còn 2 ngày chốt sao kê -> Cảnh báo vàng sắp chốt
      dueDay: 10,
    },
    {
      id: 5,
      name: 'HSBC Visa Platinum',
      icon: '💳',
      color: '#ef4444',
      initialBalance: 0,
      kind: 'credit',
      creditLimit: 60_000_000,
      statementDay: 12,
      dueDay: 27, // Hôm nay 24/10 -> Còn 3 ngày đến hạn thanh toán -> Cảnh báo đỏ sắp đến hạn
    },
    {
      id: 6,
      name: 'Investing',
      icon: '💰',
      color: '#10b981',
      initialBalance: 155_006_700,
      kind: 'cash',
      excludeFromTotal: true, // KHÔNG TÍNH VÀO TỔNG
    },
    {
      id: 7,
      name: 'Saving LT',
      icon: '🪙',
      color: '#14b8a6',
      initialBalance: 23_000_000,
      kind: 'cash',
      excludeFromTotal: true, // KHÔNG TÍNH VÀO TỔNG
    },
  ]

  const categories: Category[] = [
    { id: 1, name: 'Thiết Yếu 50%', type: 'expense', icon: '🏡', color: '#eab308', fundId: 1 },
    { id: 2, name: 'Cá nhân 25%', type: 'expense', icon: '👤', color: '#ef4444', fundId: 3 },
    { id: 3, name: 'Ăn uống', type: 'expense', icon: '🍜', color: '#f97316', fundId: 1, parentId: 1 },
    { id: 4, name: 'Di chuyển', type: 'expense', icon: '🚗', color: '#eab308', fundId: 1, parentId: 1 },
    { id: 5, name: 'Pet', type: 'expense', icon: '🐱', color: '#f59e0b', fundId: 1, parentId: 2 },
    { id: 6, name: 'Du lịch', type: 'expense', icon: '✈️', color: '#3b82f6', fundId: 3, parentId: 2 },
    { id: 7, name: 'Hoá đơn', type: 'expense', icon: '🧾', color: '#64748b', fundId: 2, parentId: 1 },
    { id: 8, name: 'Mua sắm', type: 'expense', icon: '🛍️', color: '#ec4899', fundId: 4, parentId: 2 },
    { id: 9, name: 'Nhà cửa', type: 'expense', icon: '🏠', color: '#8b5cf6', fundId: 2, parentId: 1 },
    { id: 10, name: 'Giải trí', type: 'expense', icon: '🎬', color: '#06b6d4', fundId: 3, parentId: 2 },
    { id: 11, name: 'Sức khoẻ', type: 'expense', icon: '💊', color: '#ef4444', fundId: 5, parentId: 2 },
    { id: 12, name: 'Lương', type: 'income', icon: '💼', color: '#10b981', fundId: 2 },
    { id: 13, name: 'Thưởng', type: 'income', icon: '🎁', color: '#22c55e', fundId: 2 },
    { id: 14, name: 'Thu nhập khác', type: 'income', icon: '💰', color: '#14b8a6', fundId: 1 },
  ]

  const budgets: Budget[] = [
    { id: 1, categoryId: 1, limit: 5_000_000 }, // Thiết Yếu 50%: an toàn (~49%)
    { id: 2, categoryId: 2, limit: 2_500_000 }, // Cá nhân 25%: vượt hạn mức (>100%, báo thanh đỏ)
    { id: 3, categoryId: 3, limit: 3_000_000 }, // Ăn uống
    { id: 4, categoryId: 4, limit: 1_200_000 }, // Di chuyển
    { id: 5, categoryId: 8, limit: 2_500_000 }, // Mua sắm
  ]

  const recurrings: RecurringTx[] = [
    {
      id: 1,
      name: 'Phí quản lý & Gửi xe chung cư',
      type: 'expense',
      amount: 1_200_000,
      fundId: 2,
      categoryId: 9,
      note: 'Tự động trích hàng tháng',
      frequency: 'monthly',
      dayOfMonth: 5,
      startDate: '2026-07-01',
      lastGeneratedDate: '2026-10-05',
      active: true,
    },
    {
      id: 2,
      name: 'Lương cố định hàng tháng',
      type: 'income',
      amount: 18_500_000,
      fundId: 2,
      categoryId: 12,
      note: 'Lương chuyển khoản',
      frequency: 'monthly',
      dayOfMonth: 10,
      startDate: '2026-07-01',
      lastGeneratedDate: '2026-10-10',
      active: true,
    },
    {
      id: 3,
      name: 'Internet FPT & Cloud',
      type: 'expense',
      amount: 350_000,
      fundId: 3,
      categoryId: 7,
      note: 'Gói cáp quang + iCloud',
      frequency: 'monthly',
      dayOfMonth: 15,
      startDate: '2026-07-01',
      lastGeneratedDate: '2026-10-15',
      active: true,
    },
    {
      id: 4,
      name: 'Hoá đơn Điện & Nước',
      type: 'expense',
      amount: 881_000,
      fundId: 2,
      categoryId: 1,
      note: 'Thanh toán tự động EVN',
      frequency: 'monthly',
      dayOfMonth: 20,
      startDate: '2026-07-01',
      lastGeneratedDate: '2026-10-20',
      active: true,
    },
    {
      id: 5,
      name: 'Gói Netflix & YouTube Premium',
      type: 'expense',
      amount: 320_000,
      fundId: 4,
      categoryId: 10,
      note: 'Gia hạn ngày 28 hàng tháng',
      frequency: 'monthly',
      dayOfMonth: 28,
      startDate: '2026-08-01',
      lastGeneratedDate: '2026-09-28', // Kỳ tháng 10 sẽ tự động chạy khi đến ngày 28/10
      active: true,
    },
    {
      id: 6,
      name: 'Thẻ tập Gym (Đang tạm dừng)',
      type: 'expense',
      amount: 600_000,
      fundId: 1,
      categoryId: 11,
      note: 'Đang bảo lưu 1 tháng',
      frequency: 'monthly',
      dayOfMonth: 12,
      startDate: '2026-07-01',
      lastGeneratedDate: '2026-09-12',
      active: false,
    },
  ]

  let seq = 1
  const mkTx = (
    date: string,
    type: Tx['type'],
    amount: number,
    fundId: number,
    categoryId: number | null,
    note: string,
    opts?: { toFundId?: number; recurringId?: number },
  ): Tx => ({
    id: seq++,
    date,
    type,
    amount,
    fundId,
    toFundId: opts?.toFundId ?? null,
    categoryId,
    note,
    createdAt: Date.parse(date + 'T09:00:00Z') + seq * 1000,
    recurringId: opts?.recurringId ?? null,
  })

  const txs: Tx[] = [
    // ================= THÁNG 07/2026 (3 tháng trước) =================
    mkTx('2026-07-03', 'expense', 450_000, 1, 1, 'Đi siêu thị Co.opmart đầu tháng'),
    mkTx('2026-07-05', 'expense', 1_200_000, 2, 9, '[Định kỳ] Phí quản lý & Gửi xe chung cư', { recurringId: 1 }),
    mkTx('2026-07-08', 'expense', 280_000, 1, 3, 'Ăn trưa văn phòng & cà phê'),
    mkTx('2026-07-10', 'income', 18_500_000, 2, 12, '[Định kỳ] Lương cố định hàng tháng', { recurringId: 2 }),
    mkTx('2026-07-12', 'expense', 650_000, 3, 2, 'Mua sách & phụ kiện bàn làm việc'),
    mkTx('2026-07-15', 'expense', 350_000, 3, 7, '[Định kỳ] Internet FPT & Cloud', { recurringId: 3 }),
    mkTx('2026-07-18', 'expense', 520_000, 1, 3, 'Lẩu cuối tuần'),
    mkTx('2026-07-20', 'expense', 881_000, 2, 1, '[Định kỳ] Hoá đơn Điện & Nước', { recurringId: 4 }),
    mkTx('2026-07-24', 'expense', 420_000, 4, 8, 'Áo sơ mi Uniqlo'),
    mkTx('2026-07-28', 'expense', 150_000, 1, 4, 'Đổ xăng & gửi xe'),

    // ================= THÁNG 08/2026 (2 tháng trước) =================
    mkTx('2026-08-02', 'expense', 580_000, 1, 1, 'Thực phẩm tuần đầu tháng 8'),
    mkTx('2026-08-04', 'transfer', 1_000_000, 2, null, 'Tất toán sao kê VIB Cash Back kỳ T7', { toFundId: 3 }),
    mkTx('2026-08-05', 'expense', 1_200_000, 2, 9, '[Định kỳ] Phí quản lý & Gửi xe chung cư', { recurringId: 1 }),
    mkTx('2026-08-07', 'expense', 390_000, 1, 3, 'Cơm trưa & trà sữa'),
    mkTx('2026-08-09', 'transfer', 420_000, 2, null, 'Tất toán thẻ VPBank StepUp', { toFundId: 4 }),
    mkTx('2026-08-10', 'income', 18_500_000, 2, 12, '[Định kỳ] Lương cố định hàng tháng', { recurringId: 2 }),
    mkTx('2026-08-12', 'expense', 600_000, 1, 11, '[Định kỳ] Thẻ tập Gym', { recurringId: 6 }),
    mkTx('2026-08-14', 'expense', 780_000, 3, 2, 'Giày chạy bộ'),
    mkTx('2026-08-15', 'expense', 350_000, 3, 7, '[Định kỳ] Internet FPT & Cloud', { recurringId: 3 }),
    mkTx('2026-08-18', 'income', 2_500_000, 1, 14, 'Thanh lý đồ công nghệ cũ'),
    mkTx('2026-08-20', 'expense', 881_000, 2, 1, '[Định kỳ] Hoá đơn Điện & Nước', { recurringId: 4 }),
    mkTx('2026-08-23', 'expense', 460_000, 1, 5, 'Thức ăn hạt & cát cho mèo'),
    mkTx('2026-08-26', 'expense', 310_000, 1, 4, 'Bảo dưỡng thay nhớt xe'),
    mkTx('2026-08-28', 'expense', 320_000, 4, 10, '[Định kỳ] Gói Netflix & YouTube Premium', { recurringId: 5 }),

    // ================= THÁNG 09/2026 (Tháng trước) =================
    mkTx('2026-09-02', 'expense', 690_000, 1, 1, 'Siêu thị lễ 2/9'),
    mkTx('2026-09-04', 'transfer', 1_130_000, 2, null, 'Tất toán sao kê VIB Cash Back kỳ T8', { toFundId: 3 }),
    mkTx('2026-09-05', 'expense', 1_200_000, 2, 9, '[Định kỳ] Phí quản lý & Gửi xe chung cư', { recurringId: 1 }),
    mkTx('2026-09-08', 'expense', 480_000, 1, 3, 'Họp mặt bạn bè'),
    mkTx('2026-09-09', 'transfer', 320_000, 2, null, 'Tất toán thẻ VPBank StepUp kỳ T8', { toFundId: 4 }),
    mkTx('2026-09-10', 'income', 18_500_000, 2, 12, '[Định kỳ] Lương cố định hàng tháng', { recurringId: 2 }),
    mkTx('2026-09-12', 'expense', 600_000, 1, 11, '[Định kỳ] Thẻ tập Gym', { recurringId: 6 }),
    mkTx('2026-09-15', 'expense', 350_000, 3, 7, '[Định kỳ] Internet FPT & Cloud', { recurringId: 3 }),
    mkTx('2026-09-17', 'expense', 950_000, 3, 2, 'Tai nghe Bluetooth & chuột không dây'),
    mkTx('2026-09-20', 'expense', 881_000, 2, 1, '[Định kỳ] Hoá đơn Điện & Nước', { recurringId: 4 }),
    mkTx('2026-09-22', 'income', 3_000_000, 2, 13, 'Thưởng hoàn thành dự án Quý 3'),
    mkTx('2026-09-25', 'expense', 620_000, 4, 8, 'Quần jean & áo khoác mỏng'),
    mkTx('2026-09-28', 'expense', 320_000, 4, 10, '[Định kỳ] Gói Netflix & YouTube Premium', { recurringId: 5 }),
    mkTx('2026-09-29', 'expense', 240_000, 1, 4, 'Xăng xe & Grab tháng 9'),

    // ================= THÁNG 10/2026 (Tháng hiện tại) =================
    mkTx('2026-10-02', 'expense', 850_000, 1, 1, 'Đi siêu thị thực phẩm đầu tháng 10'),
    mkTx('2026-10-04', 'transfer', 1_300_000, 2, null, 'Tất toán sao kê VIB Cash Back kỳ T9', { toFundId: 3 }),
    mkTx('2026-10-05', 'expense', 1_200_000, 2, 9, '[Định kỳ] Phí quản lý & Gửi xe chung cư', { recurringId: 1 }),
    mkTx('2026-10-07', 'expense', 1_250_000, 5, 11, 'Khám sức khoẻ định kỳ & vitamin (Thẻ HSBC)'),
    mkTx('2026-10-09', 'transfer', 940_000, 2, null, 'Tất toán thẻ VPBank StepUp kỳ T9', { toFundId: 4 }),
    mkTx('2026-10-10', 'income', 18_500_000, 2, 12, '[Định kỳ] Lương cố định hàng tháng', { recurringId: 2 }),
    mkTx('2026-10-12', 'expense', 1_450_000, 3, 2, 'Đồng hồ thể thao & phụ kiện cá nhân'),
    mkTx('2026-10-14', 'expense', 700_000, 1, 1, 'Mua gạo, trái cây & đồ gia dụng thiết yếu'),
    mkTx('2026-10-15', 'expense', 350_000, 3, 7, '[Định kỳ] Internet FPT & Cloud', { recurringId: 3 }),
    mkTx('2026-10-17', 'expense', 1_742_000, 4, 2, 'Nước hoa & quà sinh nhật (Cá nhân 25%)'),
    mkTx('2026-10-19', 'expense', 930_000, 1, 6, 'Giải cơ'),
    mkTx('2026-10-19', 'expense', 53_000, 1, 5, 'Pate thưởng cho mèo'),
    mkTx('2026-10-20', 'expense', 881_000, 2, 1, '[Định kỳ] Hoá đơn Điện & Nước', { recurringId: 4 }),
    mkTx('2026-10-21', 'income', 2_000_000, 1, 14, 'Hoàn tiền dự án freelance'),
    mkTx('2026-10-22', 'expense', 90_000, 1, 4, 'Xăng rửa xe'),
    mkTx('2026-10-23', 'expense', 890_000, 3, 3, 'Buffet nướng cùng gia đình (Quẹt sau ngày chốt sao kê 20/10)'),
    // Giao dịch thuộc ví "Không tính vào tổng" (Investing) -> sẽ KHÔNG xuất hiện ở Báo cáo Tổng hợp
    mkTx('2026-10-18', 'income', 4_500_000, 6, 14, 'Cổ tức chứng khoán (Ví Investing - Không tính vào tổng)'),

    // ================= THÁNG 11/2026 (Tương lai - để test tab TƯƠNG LAI) =================
    mkTx('2026-11-02', 'expense', 450_000, 1, 4, 'Bảo dưỡng xe định kỳ 10.000km (Dự kiến)'),
    mkTx('2026-11-14', 'expense', 2_200_000, 3, 6, 'Vé máy bay Đà Lạt cuối năm (Đã lên lịch)'),
  ]

  await db.transaction('rw', [db.funds, db.categories, db.txs, db.budgets, db.recurrings], async () => {
    await Promise.all([
      db.funds.clear(),
      db.categories.clear(),
      db.txs.clear(),
      db.budgets.clear(),
      db.recurrings.clear(),
    ])
    await db.funds.bulkAdd(funds)
    await db.categories.bulkAdd(categories)
    await db.budgets.bulkAdd(budgets)
    await db.recurrings.bulkAdd(recurrings)
    await db.txs.bulkAdd(txs)
  })

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(DEMO_FLAG_KEY, 'done')
  }
  return true
}

export async function clearAllToCleanState() {
  const defaultFunds: Fund[] = [
    { name: 'Quỹ Chính', icon: '👛', color: '#f97316', initialBalance: 0, kind: 'cash' },
    { name: 'Ngân hàng', icon: '🏦', color: '#3b82f6', initialBalance: 0, kind: 'cash' },
  ]
  await db.transaction('rw', [db.funds, db.categories, db.txs, db.budgets, db.recurrings], async () => {
    await Promise.all([
      db.funds.clear(),
      db.categories.clear(),
      db.txs.clear(),
      db.budgets.clear(),
      db.recurrings.clear(),
    ])
    await db.funds.bulkAdd(defaultFunds)
    const p1 = await db.categories.add({ name: 'Thiết Yếu 50%', type: 'expense', icon: '🏡', color: '#eab308' })
    const p2 = await db.categories.add({ name: 'Cá nhân 25%', type: 'expense', icon: '👤', color: '#ef4444' })

    await db.categories.bulkAdd([
      { name: 'Ăn uống', type: 'expense', icon: '🍜', color: '#f97316', parentId: p1 },
      { name: 'Di chuyển', type: 'expense', icon: '🚗', color: '#eab308', parentId: p1 },
      { name: 'Hoá đơn', type: 'expense', icon: '🧾', color: '#64748b', parentId: p1 },
      { name: 'Nhà cửa', type: 'expense', icon: '🏠', color: '#8b5cf6', parentId: p1 },
      { name: 'Mua sắm', type: 'expense', icon: '🛍️', color: '#ec4899', parentId: p2 },
      { name: 'Giải trí', type: 'expense', icon: '🎬', color: '#06b6d4', parentId: p2 },
      { name: 'Du lịch', type: 'expense', icon: '✈️', color: '#3b82f6', parentId: p2 },
      { name: 'Pet', type: 'expense', icon: '🐱', color: '#f59e0b', parentId: p2 },
      { name: 'Sức khoẻ', type: 'expense', icon: '💊', color: '#ef4444' },
      { name: 'Lương', type: 'income', icon: '💼', color: '#10b981' },
      { name: 'Thưởng', type: 'income', icon: '🎁', color: '#22c55e' },
      { name: 'Thu nhập khác', type: 'income', icon: '💰', color: '#14b8a6' },
    ])
  })
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(DEMO_FLAG_KEY, 'cleared')
  }
}
