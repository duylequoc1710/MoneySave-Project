# 06 – Roadmap

## Giai đoạn 1 – Local-first & Cá nhân hoá chuẩn MoneySave (HOÀN THÀNH 2026-10-24)
Bốn màn hình chính (`Tổng quan`, `Sổ giao dịch`, `Ngân sách & Định kỳ`, `Tài khoản & Quỹ`), giao diện chuẩn MoneySave (Báo cáo xu hướng lũy kế, Báo cáo chi tiêu Tuần/Tháng, Money Insider, Số dư đầu/cuối), **Giao dịch định kỳ tự động**, **Quỹ tín dụng tối ưu dòng tiền xài trước trả sau** (chốt sao kê, hạn thanh toán, tính ngày miễn lãi), sao lưu JSON/CSV, PWA.

## Giai đoạn 2 – Đồng bộ realtime (HOÀN THÀNH: Firebase Auth + đồng bộ E2EE, xem `cloudSync.ts`)
Lịch sử lựa chọn ban đầu – cần PO chọn dịch vụ và tạo tài khoản (hành động ngoài sandbox):
- **Firebase** (Auth Google + Firestore): realtime mạnh, miễn phí gói Spark. Đề xuất mặc định.
- **Supabase**: Postgres + Realtime, dữ liệu dạng bảng.
Thiết kế: thêm `updatedAt`, `deleted` (soft delete) và `syncId` (uuid) vào các bảng → migration Dexie v2; lớp `sync/` đẩy/kéo thay đổi, xung đột theo “last write wins” theo `updatedAt`.

## Giai đoạn 3 – Deploy (HOÀN THÀNH: Vercel, https://moneysavedl.vercel.app)
Host tĩnh miễn phí (Firebase Hosting / Netlify / GitHub Pages) để cài lên điện thoại qua https. Cần PO đồng ý.

## Việc tồn đọng giao cho AI tiếp quản (chi tiết ở `08-HANDOVER.md` mục 6)
- [ ] TODO-1: Tách logic `GlobalSearchModal` sang module thuần + unit test.
- [ ] TODO-2: Xác minh thủ công v2.8.0 trên iOS/Android thật (T-26).
- [ ] TODO-3: Xác nhận Vercel deploy xanh cho `main`.

## Backlog đề xuất
- Giao dịch định kỳ; nhắc nhở
- Đính kèm ảnh hoá đơn; báo cáo theo nhóm/quỹ; biểu đồ tròn
- Mục tiêu tiết kiệm; đa tiền tệ; khoá ứng dụng bằng PIN/FaceID (WebAuthn)
- CI tự động (Unit test đã hoàn thành trong `app/src/app.test.ts`)

## Cập nhật 2026-10-26
Định dạng `MM/yyyy`/`dd/MM/yyyy` thống nhất; màn Chi tiết thu nhập ròng theo tuần; khoá cuộn nền khi mở sheet; bàn phím số dạng panel nổi (xem sessions/2026-10-26-01.md).

## Cập nhật 2026-11-01 (`v2.8.0` – HOÀN THÀNH)
- Bàn phím số in-app (`NumericInputBox`/`Keypad`) và bộ chọn `InAppSelectModal` thay 100% input/select hệ thống; bỏ `autoFocus`.
- Giao dịch Phân bổ/Rút Quỹ Tiết Kiệm (`Tx.savingsAction`, `savingsGoalId`, `savingsLogId`...) + thẻ báo cáo trong `PeriodReport`/`Ledger`/`TxDetailModal`; đồng bộ ngược `syncSavingsGoalHistoryToTxs`.
- Chống quét khối/kéo thả (CSS `user-select:none` + chặn `dragstart`/`selectstart`).
- Nút Reload nhanh (`syncNowSmart`) và `GlobalSearchModal` tại Tổng quan.
- Đã bổ sung FR-40…43, T-25/T-26, INC-18 và unit test `savingsSync.test.ts`. Xem `08-HANDOVER.md`.

## Cập nhật 2026-11-01 (`v2.7.2` – HOÀN THÀNH)
- **Smart Insights 4 Trụ cột:** Dự báo dòng tiền (`Burn Rate`), Phát hiện rò rỉ vi mô (`Micro-leaks`), Nhịp sinh học tài chính (`Payday Effect`) & Quy đổi chi phí cơ hội 1-chạm.
- **Quỹ Tín Dụng & Trả Góp (`3/6/12/24` tháng):** Tách bạch kỳ sao kê đã chốt vs kỳ đang mở, chuyển đổi giao dịch thẻ sang trả góp và theo dõi tiến độ từng kỳ.
- **Quỹ Tiết Kiệm & Kế Hoạch Mục Tiêu:** Phân bổ dòng tiền 2 tầng (từ các ví khác → Ví Tiết Kiệm → Kế hoạch mục tiêu) với lộ trình 3 giai đoạn `0% → 50% → 100%` kèm Tháng mục tiêu.
- **Cử chỉ Vuốt Ngang & Đồng bộ UI Đa Nền Tảng:** Vuốt ngang chuyển tháng trên Sổ giao dịch & Báo cáo chi tiết, Ngân sách tháng có lặp lại, hộp thoại `AppDialog` toàn hệ thống và tương thích tuyệt đối với trình duyệt Android / iOS.
