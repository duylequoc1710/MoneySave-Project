# 03 – Mô hình dữ liệu (Dexie schema v1)

## Bảng
**funds** (Quỹ): `id, name, icon, color, initialBalance, archived?`

**categories** (Nhóm giao dịch): `id, name, type(expense|income), icon, color, fundId?` – `fundId` là quỹ mặc định của nhóm. Index: `type, fundId`.

**txs** (Giao dịch): `id, type(expense|income|transfer), amount(>0), date(YYYY-MM-DD), fundId, toFundId?, categoryId?, note, createdAt`. Index: `date, type, fundId, categoryId`.
- `transfer`: dùng `fundId` (nguồn) + `toFundId` (đích), không có `categoryId`.

**budgets**: `id, categoryId, limit` – hạn mức chi/tháng.

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
