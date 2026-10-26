# 03 – Mô hình dữ liệu (Dexie schema v2)

## Bảng
**funds** (Quỹ & Thẻ tín dụng): `id, name, icon, color, initialBalance, archived?, kind?(cash|credit), creditLimit?, statementDay?(1..31), dueDay?(1..31), excludeFromTotal?, notifyOnTx?`. Index: `kind`.

**categories** (Nhóm giao dịch): `id, name, type(expense|income), icon, color, fundId?` – `fundId` là quỹ mặc định của nhóm. Index: `type, fundId`.

**txs** (Giao dịch): `id, type(expense|income|transfer), amount(>0), date(YYYY-MM-DD), fundId, toFundId?, categoryId?, note, createdAt, recurringId?, excludeFromReport?`. Index: `date, type, fundId, categoryId, recurringId`.
- `transfer`: dùng `fundId` (nguồn) + `toFundId` (đích), không có `categoryId`.
- `excludeFromReport`: khi bật (`true`), giao dịch vẫn được cộng/trừ vào số dư thực tế của ví qua `effectOn`, nhưng bị loại khỏi các báo cáo thu/chi tổng hợp (`filterReportableTxs`).

**budgets**: `id, categoryId, limit` – hạn mức chi/tháng.

**recurrings** (Giao dịch định kỳ tự động): `id, name, type, amount, fundId, toFundId?, categoryId?, note, frequency(monthly|weekly|daily|yearly), dayOfMonth?(1..31), startDate(YYYY-MM-DD), lastGeneratedDate?, active`. Index: `active, frequency, fundId, categoryId`.

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
