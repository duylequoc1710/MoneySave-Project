# 06 – Roadmap

## Giai đoạn 1 – Local-first (HOÀN THÀNH 2026-10-24)
Ba màn hình chính, quỹ/nhóm, chuyển quỹ, ngân sách, sao lưu, PWA.

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
- Unit test, CI
