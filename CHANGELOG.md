# Lịch Sử Phiên Bản (Changelog) – MoneySave

Tài liệu này ghi nhận toàn bộ lịch sử phát triển, nâng cấp tính năng và tối ưu hóa của dự án **MoneySave**.

---

## [v2.7.2] – 2026-11-01
### ✨ Tính năng mới & Nâng cấp lớn
- **🐷 Quỹ Tiết Kiệm & Kế Hoạch Mục Tiêu (`SavingsGoalsModal.tsx`, `FR-39`):**
  - Bổ sung mục **`🐷 Quỹ Tiết Kiệm`** ngay trong trang **Ví của tôi** (kèm thẻ tóm tắt tại **Tổng quan**), giữ thanh Dock tinh gọn 4 mục.
  - Hỗ trợ **dòng tiền 2 tầng**: (1) Nạp/chuyển tiền từ các quỹ ví khác vào **Ví Tiết Kiệm**, (2) Phân bổ từ số dư Quỹ Tiết Kiệm vào các mục tiêu cụ thể (*Du lịch, Mua sắm, Khóa học, Quỹ dự phòng...* có thể thêm, sửa, xoá tùy chỉnh).
  - Thiết kế **Lộ trình 3 giai đoạn trực quan (`0% Khởi động` → `50% Nửa chặng đường` → `100% Hoàn thành mục tiêu`)**, ghi nhận rõ **Tháng mục tiêu (`MM/yyyy`)**, hạn đích đến (`dd/MM/yyyy`) và định mức cần tích lũy mỗi tháng (`₫/tháng`).
  - Luồng tạo kế hoạch 1 bước: bấm **`+ Kế hoạch`** từ trang **Ví của tôi** mở thẳng form tạo mới, bấm **Lưu** quay về ngay trang **Ví của tôi**.

---

## [v2.6.2] – 2026-11-01
### ✨ Cải tiến UI/UX & Đa thiết bị (iOS / Android)
- **Vuốt ngang chuyển tháng mượt mà (`Ledger.tsx` & `PeriodReport.tsx`, `FR-38`):**
  - Hỗ trợ cử chỉ vuốt ngang (touch swipe kèm phản hồi đàn hồi theo ngón tay và animation trượt ngang) trên toàn bộ trang **Sổ giao dịch** và cả 4 màn hình **Báo cáo chi tiết** (*Báo cáo giai đoạn*, *Chi tiết thu nhập ròng*, *Chi tiết khoản chi*, *Chi tiết khoản thu*).
- **Giao diện Ngân sách tháng chọn lọc & Lặp lại (`Budgets.tsx`):**
  - Bổ sung nút **`+ Đặt ngân sách`** (chọn nhóm chi tiêu, nhập hạn mức, bật/tắt **Lặp lại cho tháng tiếp theo**) và chỉ hiển thị gọn gàng các nhóm đang được đặt ngân sách.
- **Sửa lỗi hiển thị thực tế trên Mobile & Android (`v2.6.1`):**
  - Khóa `color-scheme: only dark/light` và `forced-color-adjust: none` chống bộ lọc Auto-Dark của trình duyệt Android làm mất thanh tiến độ (`.bar`, `.sparkbar-track`, `.net-bar-track`).
  - Tách tầng hiển thị tên nhóm, nhãn lặp lại và số tiền trên màn hình hẹp để không bao giờ bị đè chữ.

---

## [v2.5.1] – 2026-11-01
### 💳 Nâng cấp Toàn diện Quỹ Tín Dụng & Chuyển đổi Trả Góp (`FR-37`)
- **Trang Chi tiết Chi tiêu Tín dụng & Trả góp (`CreditCardDetailModal.tsx`):**
  - Đưa mục **`💳 Quỹ tín dụng`** ra trang **Tổng quan** và tinh gọn phần cài đặt thẻ trong **Ví của tôi**; loại bỏ hoàn toàn cụm chữ `(Xài trước trả sau)`.
  - Cho phép chuyển đổi bất kỳ giao dịch chi tiêu thẻ tín dụng nào sang **Trả góp kỳ hạn `3`, `6`, `12`, `24` tháng**, tự động tính ngày bắt đầu chuyển đổi, kỳ sao kê thanh toán đầu tiên, số tiền đóng mỗi kỳ, số kỳ còn lại và lịch biểu từng kỳ.
  - **Tách bạch Kỳ sao kê đã chốt (`previousStatementDebt`) và Kỳ đang mở (`currentCycleSpend`):** Triệt tiêu cảnh báo đỏ gây hiểu lầm khi kỳ sao kê cũ đã tất toán và chỉ còn phát sinh của kỳ mới (thanh toán ở tháng kế tiếp).
  - Tinh gọn bộ lọc kỳ sao kê trên 1 hàng (`Kỳ hiện tại` + `📅 Xem lại các tháng...`) và tinh gọn thanh Dock điều hướng còn 4 mục (`Tổng quan`, `Sổ giao dịch`, `Ngân sách`, `Ví của tôi`).

---

## [v2.4.0] – 2026-11-01
### 🧠 Hệ thống Phân tích Hành vi Tài chính 4 Trụ cột – `Smart Insights` (`FR-36`)
- Nâng cấp mục `Money Insider` thành **`Smart Insights`** (`smartInsights.ts` & `SmartInsightsModal.tsx`) với 4 trụ cột:
  1. **Dự báo dòng tiền & Tốc độ chi tiêu (`Burn Rate & Projection Engine`):** Trọng số ngày thường vs cuối tuần, làm mượt dữ liệu đầu tháng và thanh **Dual-Pace Sparkbar**.
  2. **Phát hiện bất thường & Rò rỉ vi mô (`Anomaly & Micro-leak Detector`):** Phát hiện nhóm chi tăng đột biến (Spike) và các khoản chi nhỏ lẻ lặp lại nhiều lần (Micro-leaks).
  3. **Nhịp sinh học tài chính theo chu kỳ (`Temporal & Payday Patterns`):** Biểu đồ nhịp chi Thứ 2 – Chủ Nhật và phát hiện Hội chứng chi tiêu 5 ngày sau khi nhận lương (*Payday Effect*).
  4. **Quy đổi chi phí cơ hội & Can thiệp 1-chạm (`Opportunity Cost & 1-Click Actions`):** Quy đổi số tiền chi tiêu ra **giờ làm việc tương đương** và **lãi kép 6.5%/năm** (1 năm & 3 năm), kèm nút 1-chạm đặt trần ngân sách hoặc trích tiền sang Ví Tiết Kiệm.
- **Đồng bộ Hệ thống Popup In-App (`AppDialog.tsx`, `FR-35`):**
  - Thay thế 100% hộp thoại trình duyệt (`alert`, `confirm`, `prompt`) bằng `showAlert`, `showConfirm`, `showPrompt` đồng bộ giao diện Sáng/Tối.

---

## [v2.2.0 – v2.3.0] – 2026-10-26 → 2026-10-28
### 🛡️ An toàn Dữ liệu, Bàn phím In-App & Chuẩn hóa Định dạng Việt Nam (`FR-30` – `FR-34`)
- **Định dạng hiển thị thống nhất:** Ngày chuẩn `dd/MM/yyyy`, tháng chuẩn `MM/yyyy`, tuần lịch chuẩn Việt Nam (`Thứ Hai → Chủ Nhật`).
- **In-App Pickers & Keypad:** Bàn phím máy tính tích hợp (`Keypad.tsx`), bộ chọn nhóm phân cấp (`CategoryPickerModal.tsx`) và lịch chọn ngày (`DatePickerModal.tsx`).
- **Bản sao an toàn tự động (`SafetySnapshotsCard.tsx`):** CSDL phụ `moneysave_safety` tự động lưu tối đa 15 bản chụp trước khi Khôi phục / Đồng bộ ghi đè / Xoá sạch và định kỳ mỗi ngày.

---

## [v1.0.0 – v2.1.0] – 2026-10-24 → 2026-10-25
### 🚀 Khởi tạo Nền tảng Local-First & Đồng bộ Đám mây Mã hóa Đầu cuối (E2EE)
- Kiến trúc PWA Offline-first với React 19, TypeScript, Vite 8 và Dexie.js (IndexedDB).
- Đồng bộ đám mây Realtime qua Firebase kèm mã hóa đầu cuối Zero-Knowledge **`AES-GCM 256-bit` + `PBKDF2-SHA256`** (`cloudSync.ts`).
- Hệ thống Nhóm Cha & Nhóm Con (`Category Hierarchy`), Giao dịch định kỳ tự động (`RecurringTx`) và xuất báo cáo Excel `.xls` 2 Sheet / CSV / JSON.
