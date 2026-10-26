# 06 – Roadmap

## Giai đoạn 1 – Local-first & Cá nhân hoá chuẩn MoneyLover (HOÀN THÀNH 2026-10-24)
Bốn màn hình chính (`Tổng quan`, `Sổ giao dịch`, `Ngân sách & Định kỳ`, `Tài khoản & Quỹ`), giao diện clone MoneyLover (Báo cáo xu hướng lũy kế, Báo cáo chi tiêu Tuần/Tháng, Money Insider, Số dư đầu/cuối), **Giao dịch định kỳ tự động**, **Quỹ tín dụng tối ưu dòng tiền xài trước trả sau** (chốt sao kê, hạn thanh toán, tính ngày miễn lãi), sao lưu JSON/CSV, PWA.

## Giai đoạn 2 – Đồng bộ realtime (CHỜ QUYẾT ĐỊNH CỦA PO)
Cần PO chọn dịch vụ và tạo tài khoản (hành động ngoài sandbox):
- **Firebase** (Auth Google + Firestore): realtime mạnh, miễn phí gói Spark. Đề xuất mặc định.
- **Supabase**: Postgres + Realtime, dữ liệu dạng bảng.
Thiết kế: thêm `updatedAt`, `deleted` (soft delete) và `syncId` (uuid) vào các bảng → migration Dexie v2; lớp `sync/` đẩy/kéo thay đổi, xung đột theo “last write wins” theo `updatedAt`.

## Giai đoạn 3 – Deploy
Host tĩnh miễn phí (Firebase Hosting / Netlify / GitHub Pages) để cài lên điện thoại qua https. Cần PO đồng ý.

## Backlog đề xuất
- Giao dịch định kỳ; nhắc nhở
- Đính kèm ảnh hoá đơn; báo cáo theo nhóm/quỹ; biểu đồ tròn
- Mục tiêu tiết kiệm; đa tiền tệ; khoá ứng dụng bằng PIN/FaceID (WebAuthn)
- CI tự động (Unit test đã hoàn thành trong `app/src/app.test.ts`)

## Cập nhật 2026-10-26
Định dạng `MM/yyyy`/`dd/MM/yyyy` thống nhất; màn Chi tiết thu nhập ròng theo tuần; khoá cuộn nền khi mở sheet; bàn phím số dạng panel nổi (xem sessions/2026-10-26-01.md).
