# Lịch Sử Phiên Bản (Changelog) – MoneySave

Tài liệu này ghi nhận toàn bộ lịch sử phát triển, nâng cấp tính năng và tối ưu hóa của dự án **MoneySave**.

---

## [v2.17.0] – 2026-11-16
### ⚡ Nhập giao dịch nhanh hơn
- Thêm giao dịch mới: nhóm mặc định = **nhóm bạn dùng nhiều nhất trong 90 ngày** (trước là nhóm đầu danh sách). Hàng nút **"nhóm hay dùng"** (tối đa 4, vuốt ngang) dưới ô Nhóm – 1 chạm để chọn.
- Ví mặc định = ví bạn dùng gần nhất cho nhóm đó (nếu nhóm không gắn sẵn ví).
- Không tính giao dịch tự động (định kỳ, phân bổ tiết kiệm). Sửa giao dịch cũ không đổi gì.
- +2 test → 78/78. Không đổi dữ liệu/schema.

---

## [v2.16.1] – 2026-11-16
### 🤖 CI tự động
- GitHub Actions (`.github/workflows/ci.yml`): mỗi lần đẩy nhánh hoặc mở PR tự chạy `npm ci`, `npm test`, `npm run build`, `npm run lint` (Node 22). Báo đỏ trước khi lỗi lên Vercel (bài học TODO-3: commit `9f53f54` từng lên `main` khi build lỗi).
- Không đổi code app, dữ liệu hay schema.

---

## [v2.16.0] – 2026-11-16
### 🔤 Chữ & màu (U3)
- Chữ gốc 16px (trước 14.5px); mọi cỡ chữ theo một thang thống nhất 12–34px (bỏ cỡ lẻ 12.5/13.5/14.5…); số tiền dùng chữ số đều rộng (`tabular-nums`) → các cột tiền thẳng hàng.
- Màu thành token ngữ nghĩa: thêm `--warn` (cảnh báo) và `--info` (thông tin); chữ màu cứng trong các màn hình chuyển sang token.
- Giao diện **Sáng** đạt tương phản ≥ 4.5:1: chữ phụ, xanh thu, đỏ chi, cam cảnh báo, xanh dương thông tin đậm hơn; chữ trắng trên nút xanh 5.0:1 (trước 3.3:1).
- Giao diện **Tối**: chữ trên nút xanh (Thêm giao dịch, Sao lưu, Xong, ngày đang chọn, dấu tích) đổi sang xanh rất đậm `--on-acc` → 7.7:1 (trước chữ trắng 2.2:1). Sáng vẫn chữ trắng.
- Màu biểu đồ đạt ≥ 3:1 cả hai giao diện: đường thu nhập #0891b2, cột thu #0284c7, cột cuối tuần dùng `--warn`.
- Nút chữ (tab Tối/Sáng/Theo máy, "+ Cài đặt mới", tab tháng, chọn ví, Đóng, Đăng ký/Đăng nhập) cao tối thiểu 44px.
- Ký tự "‹ Đóng", "›", "⌄" trong cửa sổ đổi sang icon SVG, có nhãn đọc màn hình.
- Sửa nhỏ: viền/nền nhãn "tốc độ chi" và nhãn trạng thái mục tiêu hiển thị đúng màu (trước là chuỗi màu không hợp lệ).
- +2 test chặn cỡ chữ lệch thang và màu Sáng dưới 4.5:1 → 76/76. Không đổi dữ liệu/schema.

---

## [v2.15.1] – 2026-11-16
### 🔒 Chuẩn bị khoá két Firebase cũ (giai đoạn 2)
- Sửa: khi két cũ `moneysave_vaults` đã bị khoá, tài khoản **mới** đăng nhập lần đầu không còn báo lỗi đồng bộ (bỏ qua bước sao chép két cũ thay vì dừng lại).
- +1 unit test (két cũ khoá + két bảo mật trống) → 73/73. Hướng dẫn PO khoá két: `doc/09-REVIEW-AND-PLAN-2026-11.md` §6.3, `doc/06-DEPLOYMENT-GUIDE.md` mục 5.

---

## [v2.15.0] – 2026-11-16
### ✨ Chuyển động mượt (U5)
- Mở cửa sổ (modal): nền mờ dần 0.18s, tấm trượt nhẹ lên 0.24s.
- Nhấn nút (`.btn`, nút Đóng, nút icon, thanh chọn): thu nhỏ nhẹ 0.12s để biết đã bấm.
- Máy bật **"Giảm chuyển động"** (iPhone: Trợ năng › Chuyển động) → tắt mọi hiệu ứng.
- Chỉ CSS, không đổi dữ liệu/schema. 72/72 test.

---

## [v2.14.0] – 2026-11-16
### 🧭 Tổng quan gọn hơn & màn hình trống có hướng dẫn (U4)
- **Tổng quan:** "Giao dịch gần đây" chuyển lên ngay sau "Ví của tôi" (mục dùng nhiều nhất, không phải cuộn qua các thẻ tín dụng).
- **Màn hình trống có hướng dẫn + nút làm ngay:** Sổ giao dịch và Giao dịch gần đây ("＋ Thêm giao dịch"), Thẻ tín dụng ("+ Thêm thẻ tín dụng"), Giao dịch định kỳ ("+ Cài đặt mới"), Ngân sách tháng ("+ Đặt ngân sách"); Chi tiêu nhiều nhất có lời giải thích.
- Thành phần dùng chung `components/EmptyState.tsx` (icon + tiêu đề + gợi ý + 1 nút ≥ 44px). Không đổi dữ liệu/schema Dexie. 72/72 test.

---

## [v2.13.0] – 2026-11-16
### 👆 Dễ bấm, dễ đọc & bộ icon thống nhất (U1 + U2 trong `doc/11-UI-PLAN.md`)
- **U1:** nút icon (🔍 🔄 📅 ‹ ›, ẩn/hiện số dư) có vùng bấm ≥ 44×44px; link chữ ("Xem tất cả", "Quản lý thẻ", "+ Thêm thẻ"…) và nút nhỏ ở đầu trang được nới vùng bấm vô hình (không đổi bố cục); "+ Thêm thẻ" không còn xuống dòng.
- Thêm nhãn đọc màn hình (`aria-label`) cho 9 nút chỉ có icon; mọi chữ phụ < 12px nâng lên 12px.
- Nút nổi "＋ Thêm giao dịch" không che nội dung cuối trang (chừa thêm khoảng dưới); nút nhỏ "Chi ngay/Đang bật", "Chi tiết/Cài đặt", "Khôi phục/Tải" to hơn, cách nhau 8px.
- **U2:** thay emoji của khung giao diện bằng icon SVG `lucide-react` (bản 1.66.0, chỉ nạp icon dùng tới): thanh điều hướng, nút đầu trang, mũi tên, tiêu đề mục, Cài đặt, thanh nhắc sao lưu. Icon đổi màu theo theme, mục đang chọn ở thanh điều hướng có icon màu xanh.
- **Giữ nguyên** emoji danh mục/ví do người dùng chọn. Không đổi dữ liệu/schema Dexie. 72/72 test.

---

## [v2.12.0] – 2026-11-16
### 🧹 Dọn gọn trang Cài đặt
- **Tài khoản & đồng bộ:** gộp thành 1 khối (email + "Đã đồng bộ lúc …" + 2 nút); bỏ UID, mã thiết bị, chữ "Admin" và câu "thời gian thực/E2EE" gây hiểu nhầm.
- **Giao diện:** chỉ giữ thanh chọn Tối / Sáng / Theo máy (bỏ 3 dòng lặp lại).
- **Sao lưu & khôi phục:** Google Drive lên đầu, rồi file, rồi Excel, Kiểm tra toàn vẹn; **bỏ Xuất CSV** (Excel đã đủ, Google Sheets mở được .xls).
- **Bản sao an toàn tự động:** chỉ hiện 3 bản mới nhất + "Xem thêm"; bỏ nút Xoá từng bản (tự xoay vòng tối đa 15 bản). Không xoá bản nào hiện có.
- **Bỏ mục "Dữ liệu kiểm thử"** (Nạp mẫu / Xoá sạch) – tránh bấm nhầm ghi đè dữ liệu thật.
- Thẻ "Dữ liệu trên máy này": giữ thống kê + link Chính sách quyền riêng tư; sửa câu mô tả mã hoá cho đúng thực tế.

---

## [v2.11.1] – 2026-11-16
- Trang tĩnh **Chính sách quyền riêng tư** `/privacy.html` (vi/en – Google yêu cầu khi Publish OAuth); Service Worker không chiếm link này.
- Cài đặt: thêm mục "📜 Chính sách quyền riêng tư" mở trang trên.

---

## [v2.11.0] – 2026-11-16
### ☁️ Sao lưu / Khôi phục qua Google Drive của chính bạn (S4a)
- Cài đặt › Dữ liệu cá nhân: **Sao lưu lên Google Drive** và **Khôi phục từ Google Drive** (chọn bản theo ngày → xem trước → xác nhận; vẫn tự lưu bản sao an toàn trước khi ghi đè).
- Quyền hẹp `drive.file`: app chỉ thấy thư mục "MoneySave Backup" do nó tạo. Không có máy chủ trung gian, không tốn chi phí cho chủ app; mã truy cập Google chỉ giữ trong bộ nhớ (~1 giờ).
- Mỗi ngày 1 file `MoneySave-YYYY-MM-DD.json` (sao lưu lại trong ngày → ghi đè), giữ 30 bản gần nhất; chỉ xoá file đúng quy ước tên trong thư mục của app.
- Thanh nhắc trên Tổng quan: đã kết nối Drive mà quá 24 giờ chưa sao lưu → nút "Sao lưu Drive" 1 chạm (Google không cho sao lưu ngầm khi chưa chạm).
- `googleDrive.ts` + `components/DriveBackupCard.tsx`; +4 unit test (`googleDrive.test.ts`) → 72/72. Không đổi schema Dexie.

---

## [v2.10.1] – 2026-11-16
### 🔍 Tìm kiếm toàn diện (S5)
- Tách logic tìm kiếm khỏi `GlobalSearchModal.tsx` sang module thuần `search.ts` (đóng TODO-1), component chỉ còn vẽ kết quả.
- **Tìm không dấu:** gõ "an uong", "tiet kiem" hay có dấu đều ra kết quả (bỏ dấu tiếng Việt, đ→d, không phân biệt hoa thường).
- **Nhiều từ không cần đúng thứ tự:** "phở sáng" khớp ghi chú "Phở bò sáng"; số tiền gõ "50.000" khớp giao dịch 50000.
- +8 unit test (`search.test.ts`) → 68/68. Không đổi dữ liệu/schema.

---

## [v2.10.0] – 2026-11-16
### 🔐 Bảo mật đồng bộ Cloud (S3)
- **Két bảo mật theo tài khoản** `moneysave_users/{uid}`: mọi request kèm `idToken` (`?auth=`); rule Firebase chỉ cho chủ tài khoản đọc/ghi (trước đây két `moneysave_vaults` mở công khai và khoá suy ra từ uid+email).
- **Chuyển đổi không mất dữ liệu:** rule chưa bật → tự dùng két cũ; két mới trống → sao chép nguyên văn két cũ (đã mã hoá); két cũ không bị xoá; bản ghi từ thiết bị còn chạy bản cũ được nhận ở lượt đồng bộ đầy đủ.
- **Nhẹ hơn:** kiểm tra định kỳ 30 s chỉ tải `meta` (~80 byte) thay vì cả két; chỉ tải két khi thật sự cần kéo về.
- **Sửa nguy cơ đẩy dữ liệu cũ đè Cloud:** khi quay lại app, kéo bản mới nhất trước rồi mới sinh giao dịch định kỳ; các lượt đồng bộ chồng nhau (focus/visibility/polling) dùng chung 1 lượt.
- +5 unit test (`secureVault.test.ts`) → 60/60.

---

## [v2.9.0] – 2026-11-16
### 💾 Sao lưu / Khôi phục tối ưu cho điện thoại
- **1 file sao lưu duy nhất `MoneySave-SaoLuu.json`** (`backupFile.ts`): iPhone/Android mở bảng chia sẻ hệ điều hành → "Lưu vào Tệp" (iCloud/Trên iPhone), Google Drive…; lưu cùng thư mục và chọn "Thay thế" để bản mới ghi đè bản cũ. Máy tính Chrome/Edge: lần đầu chọn nơi lưu, các lần sau **tự ghi đè** vào đúng file đó (nút "Đổi nơi lưu").
- **Xem trước trước khi khôi phục** (`describeBackup`, `components/backupActions.ts`): ngày sao lưu, số giao dịch & khoảng ngày, số ví/nhóm/ngân sách/định kỳ/kế hoạch, so với dữ liệu hiện tại; vẫn tự lưu bản sao an toàn trước khi ghi đè.
- **Gộp bản sao an toàn tự động**: bản "trước đồng bộ Cloud ghi đè" và bản "hằng ngày" chỉ giữ 1 bản/ngày (ghi đè trong ngày) → hết cảnh sinh hàng loạt bản rời rạc; bản trước Khôi phục/Xoá sạch vẫn luôn tạo mới; bản cũ không bị xoá khi nâng cấp.
### ⚡ Hiệu năng & an toàn dữ liệu
- JSON sao lưu/đồng bộ/bản sao dạng gọn (nhỏ hơn ~30–40%).
- Gọi `navigator.storage.persist()` giảm nguy cơ iOS/Safari tự dọn dữ liệu.
- Sửa thu hồi URL tải file quá sớm (Safari có thể huỷ tải).
- +5 unit test (`backup.test.ts`) → 55/55.

---

## [v2.8.0] – 2026-11-01
### ✨ Tính năng mới & Đồng bộ giao diện ứng dụng
- **⌨️ Đồng bộ Bàn phím máy tính nội bộ & Thay thế 100% bàn phím / dropdown hệ thống:**
  - Chuyển đổi toàn bộ ô nhập số trên khắp ứng dụng (`Budgets.tsx`, `SavingsGoalsModal.tsx`, `TransferWalletModal.tsx`, `AdjustBalanceModal.tsx`, `FundForm.tsx`, `TxForm.tsx`, `CreditCardDetailModal.tsx`, `AppDialog.tsx`) sang dạng hiển thị bấm mở bàn phím máy tính nội bộ (`NumericInputBox` / `Keypad`), loại bỏ hoàn toàn việc bật bàn phím hệ điều hành.
  - Thay thế 100% các phần tử `<select>` gốc bằng bộ chọn in-app modal (`InAppSelectModal.tsx`) chuẩn thiết kế MoneySave (icon, danh mục, số dư, dấu tích xanh `✓`).
  - **Bỏ tự động trỏ vào ô nhập (`autoFocus` / `.focus()`) khi mở bảng mới**: Loại bỏ hoàn toàn hiện tượng tự bật bàn phím khi người dùng mở form, chỉ khi click/touch vào ô mới hiển thị.
- **🐷 Ghi nhận & Báo cáo chi tiết Phân bổ / Rút Quỹ Tiết Kiệm:**
  - Mở rộng mô hình giao dịch `Tx` (`savingsAction: 'allocate' | 'withdraw'`, `savingsGoalId`, `savingsGoalName`, `savingsGoalIcon`, `savingsLogId`).
  - Ghi nhận chi tiết mọi biến động phân bổ (`Ví Tiết Kiệm → Mục tiêu`) và rút tiền (`Mục tiêu → Ví Tiết Kiệm` hoặc rút trực tiếp về ví chi tiêu khác).
  - Tự động hiển thị thẻ chuyên biệt **🐷 Báo cáo Phân bổ & Rút Quỹ Tiết Kiệm** trong **`PeriodReport.tsx`** và hiển thị chi tiết từng giao dịch phân bổ/rút trong **`Ledger.tsx`** và **`TxDetailModal.tsx`**.
  - Tự động đồng bộ ngược hai chiều (`syncSavingsGoalHistoryToTxs`) đối với dữ liệu lịch sử kế hoạch tiết kiệm cũ.
- **🛡️ Chống quét khối và kéo thả vô tình (Anti-Drag Selection Freeze):**
  - Khóa vùng quét khối vô tình bằng CSS toàn cục (`user-select: none`, `-webkit-touch-callout: none`) và chặn `dragstart` / `selectstart` ngoài các ô nhập văn bản, triệt tiêu lỗi ứng dụng bị đơ không click được khi vô tình chạm đè kéo trên màn hình cảm ứng.
- **🔄 Nút Reload nhanh & 🔍 Tìm kiếm toàn diện tại Tổng quan:**
  - Thay thế nút chuông 🔔 gần tiêu đề Tổng số dư bằng nút **Reload nhanh (`🔄`)**: Tự động đồng bộ Cloud Realtime (`syncNowSmart`), kiểm tra Service Worker cập nhật và làm mới dữ liệu tức thì không cần vuốt kéo thả hay tắt app.
  - Nâng cấp nút **Kính lúp (`🔍`)** mở bảng **Tìm kiếm toàn diện (`GlobalSearchModal.tsx`)**: Tìm kiếm nhanh chức năng ứng dụng với điều hướng 1-chạm, tìm kiếm giao dịch đa tiêu chí và tìm kiếm kế hoạch / hóa đơn định kỳ / ghi chú liên quan.

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
