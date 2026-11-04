# 03 – Mô hình dữ liệu (Dexie schema v4)

## Bảng
**funds** (Quỹ & Thẻ tín dụng): `id, name, icon, color, initialBalance, archived?, kind?(cash|credit), creditLimit?, statementDay?(1..31), dueDay?(1..31), excludeFromTotal?, notifyOnTx?`. Index: `kind`.

**categories** (Nhóm giao dịch): `id, name, type(expense|income), icon, color, fundId?, parentId?` – `fundId` là quỹ mặc định của nhóm, `parentId` là nhóm cha đại diện. Index: `type, fundId, parentId`.

**txs** (Giao dịch): `id, type(expense|income|transfer), amount(>0), date(YYYY-MM-DD), fundId, toFundId?, categoryId?, note, createdAt, recurringId?, excludeFromReport?, installment?`. Index: `date, type, fundId, categoryId, recurringId`.
- `transfer`: dùng `fundId` (nguồn) + `toFundId` (đích), không có `categoryId`.
- `excludeFromReport`: khi bật (`true`), giao dịch vẫn được cộng/trừ vào số dư thực tế của ví qua `effectOn`, nhưng bị loại khỏi các báo cáo thu/chi tổng hợp (`filterReportableTxs`).
- `installment` (`InstallmentInfo`): dành cho giao dịch chi tiêu thẻ tín dụng chuyển sang trả góp: `{ termMonths: 3 | 6 | 12 | 24, startDate: YYYY-MM-DD, firstStatementDate: YYYY-MM-DD, conversionFeePct?, monthlyAmount, totalAmountWithFee, paidCyclesManual? }`.

**budgets**: `id, categoryId, limit, repeatNextMonth?, month?` – hạn mức chi/tháng (`repeatNextMonth` mặc định `true` để lặp lại sang tháng tiếp theo; nếu `false` chỉ áp dụng cho tháng `month` dạng `YYYY-MM`).

**recurrings** (Giao dịch định kỳ tự động): `id, name, type, amount, fundId, toFundId?, categoryId?, note, frequency(monthly|weekly|daily|yearly), dayOfMonth?(1..31), startDate(YYYY-MM-DD), lastGeneratedDate?, active`. Index: `active, frequency, fundId, categoryId`.

**savingsGoals** (Kế hoạch Mục tiêu trong Quỹ Tiết Kiệm): `id, name, icon, color, targetAmount, allocatedAmount, savingsFundId?, startDate(YYYY-MM-DD), targetDate(YYYY-MM-DD), note?, history?, createdAt`. Index: `savingsFundId, targetDate`.
- `allocatedAmount`: số tiền trích từ số dư của Quỹ Ví Tiết Kiệm phân bổ vào kế hoạch mục tiêu này.
- `history`: mảng nhật ký phân bổ / rút tiền (`{ id, date, amount, fromFundId?, note? }`).

## Quy tắc
- Số dư quỹ = `initialBalance` + Σ `effectOn(tx, fund)`:
  - income: +amount vào `fundId`; expense: −amount khỏi `fundId`;
  - transfer: −amount ở nguồn, +amount ở đích (tổng số dư không đổi).
- Ngày lưu dạng chuỗi `YYYY-MM-DD` theo giờ địa phương → truy vấn tháng bằng `between(from,to)`.
- Không xoá nhóm/quỹ đang có giao dịch (chặn bằng cảnh báo).
- Tiền lưu số nguyên VND.

## Sao lưu
JSON `{app:'MoneyGo', version:1, exportedAt, funds, categories, txs, budgets}`. Khôi phục ghi đè toàn bộ.

## Quy tắc thay đổi schema
Thêm `this.version(n+1).stores(...)` trong `db.ts`, không sửa version cũ; cập nhật tài liệu này.

## CSDL phụ: bản sao an toàn (không thuộc schema chính)
IndexedDB riêng `moneysave_safety` (bảng `snapshots`: `++id, createdAt`; trường `reason, txCount, fundCount, json`), tối đa 15 bản. Tách biệt hoàn toàn với `MoneyDB` nên **không tăng version Dexie chính** và không bị `importAll`/đồng bộ Cloud ghi đè. Dùng để hoàn tác khi lỡ Khôi phục/Đồng bộ/Xoá sạch.

## Bổ sung v2.8.0 – Trường Quỹ Tiết Kiệm trên `txs`
Không đổi schema Dexie (vẫn `version(4)`; các trường dưới đây không được đánh index): `savingsGoalId?`, `savingsGoalName?`, `savingsGoalIcon?`, `savingsAction?` (`'allocate'` Ví Tiết Kiệm→Mục tiêu | `'withdraw'` Mục tiêu→Ví Tiết Kiệm/ví khác), `savingsLogId?` (khớp `savingsGoals.history[].id` để đồng bộ hai chiều qua `syncSavingsGoalHistoryToTxs` trong `db.ts`).
