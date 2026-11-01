# 05 – Kế hoạch & kết quả kiểm thử

| ID | Kịch bản | Kết quả (2026-10-24) |
|---|---|---|
| T-01 | `tsc -b` + `npm run build` không lỗi, sinh sw.js + manifest | ✅ Pass |
| T-02 | Lần đầu mở: seed 2 quỹ + 12 nhóm mặc định, Tổng quan hiện 0 ₫ | ✅ Pass (screenshot) |
| T-03 | Nạp 49 giao dịch mẫu (7 tháng, gồm tương lai): Sổ hiển thị gom theo ngày, tổng Thu/Chi/Chênh lệch đúng | ✅ Pass |
| T-04 | Tổng quan: line chart 6 tháng, tổng số dư, top nhóm chi | ✅ Pass |
| T-05 | Giao diện sáng & tối (theo hệ thống) | ✅ Pass |
| T-06 | Thêm/sửa/xoá giao dịch qua form, chuyển quỹ, ngân sách, sao lưu/khôi phục | ✅ Pass (kiểm thử E2E trên Chrome) |
| T-07 | Cài PWA thực trên iPhone/Android | ⏳ Cần deploy https |
| T-08 | Màn hình desktop ≥900px (sidebar) | ✅ Pass (đã kiểm tra & chụp 1280×840) |
| T-09 | Unit test (`npm test` – `app/src/app.test.ts`): `effectOn`, định dạng, `computeDueDates`, `analyzeCreditFund`, `excludeFromTotal`/`excludeFromReport`, `archived`, `resolveTimeRange`, `buildExcelXml`, `exportAll`/`importAll`, `cloudSync` (E2EE `AES-GCM 256-bit` + `PBKDF2-SHA256`) | ✅ Pass (18/18 tests) |
| T-10 | Kiểm thử E2E v2: Giao diện MoneySave, tự động phát sinh Giao dịch định kỳ, phân tích Quỹ tín dụng | ✅ Pass |
| T-11 | Kiểm thử Báo cáo giai đoạn (`PeriodReport`) & Sửa lỗi nền trắng Tooltip Recharts trên toàn ứng dụng | ✅ Pass |
| T-12 | Kiểm thử tính năng Ví nâng cao (`TÍNH VÀO TỔNG` / `KHÔNG TÍNH VÀO TỔNG`, `Lưu trữ`, `Điều chỉnh số dư`, `Chuyển tiền đến ví khác` + phí chuyển khoản) | ✅ Pass |
| T-13 | Kiểm thử Module Cài đặt (Dark/Light Theme, Xuất Excel `.xls`), `WalletSelectorPill`, `TimeRangeModal` & Responsive đa màn hình điện thoại (`360x800`, `375x667`, `393x852`, `430x932`) | ✅ Pass |
| T-14 | Kiểm thử Đồng bộ Cloud Realtime qua Firebase Firestore kèm Mã hóa đầu cuối (E2EE `AES-GCM 256-bit` + `PBKDF2-SHA256`) & tích hợp Logo/Favicon MoneySave trong suốt | ✅ Pass |
| T-15 | Kiểm thử Xác thực Tài khoản Cá nhân/Gia đình (Firebase Auth Email/Password), cô lập dữ liệu theo User UID, tích hợp sẵn `firebaseConfig`, và quy trình CI/CD GitHub Pages PWA | ✅ Pass (20/20 unit tests) |
| T-16 | Kiểm thử Hệ thống Nhóm Cha & Nhóm Con (Category Hierarchy), gom nhóm phân cấp, gán nhanh nhóm con, chọn nhóm optgroup trong form giao dịch, hiển thị `Nhóm cha › Nhóm con` trên báo cáo | ✅ Pass (22/22 unit tests) |
| T-17 | Kiểm thử định dạng `MM/yyyy` & `dd/MM/yyyy`, màn Chi tiết thu nhập ròng theo tuần, khoá cuộn nền, ô ngày định kỳ, bàn phím số nổi, PWA tự cập nhật (tsc + build + unit test; xác nhận bản live trên Vercel và điện thoại) | ✅ Pass (24/24 unit tests) |
| T-18 | Test biên Định kỳ (ngày 31, năm nhuận 2028, tuần/ngày, không trùng kỳ), chia tuần Thứ 2–CN (tháng 10/2026: 1-4, 5-11…), `monthLabel`/`fmtDmy`, nhắc sao lưu; benchmark 50.000 giao dịch ≈ 1 ms/lần tính | ✅ Pass (34/34 unit tests) |
| T-19 | Thẻ tín dụng: báo cáo tổng gồm chi tiêu thẻ, kỳ sao kê gồm giao dịch ghi trước (01/11), tổng số dư không lẫn dư nợ; `auditData` (số tiền/ngày/ví/nhóm/chuyển quỹ/trùng/thẻ dương); sửa test nhắc sao lưu bị chập chờn | ✅ Pass (40/40 unit tests) |
| T-20 | Kiểm thử In-App `CategoryPickerModal`, `DatePickerModal`, `CatDetailModal` và sự kiện mở lịch trên `DateInput` | ✅ Pass (42/42 unit tests) |
| T-21 | Kiểm thử Hệ thống Popup In-App (`AppDialog`: `showAlert`, `showConfirm`, `showPrompt` thay thế 100% hộp thoại trình duyệt), liên kết `"Xem chi tiết"` tại trang Tổng quan (mở Báo cáo Thu nhập ròng & Chi tiết khoản chi), kiểm tra bảo mật `importAll` và xoá sạch toàn bộ tham chiếu `MoneyLover` | ✅ Pass (43/43 unit tests) |
| T-22 | Kiểm thử Hệ thống Phân tích Hành vi Tài chính 4 Trụ cột `Smart Insights` (`computeSmartInsights` & `SmartInsightsModal`): Dự báo dòng tiền làm mượt đầu tháng, Phát hiện rò rỉ vi mô & đột biến, Nhịp sinh học Thứ 2–CN & Payday Effect, Quy đổi giờ làm việc/lãi kép và hành động 1-chạm | ✅ Pass (44/44 unit tests) |
| T-23 | Kiểm thử Quỹ Tín Dụng nâng cao & Chuyển đổi Trả góp (`3/6/12/24` tháng): Tách bạch dư nợ kỳ sao kê đã chốt (`05/11`) và chi tiêu kỳ sao kê mới (`20/10 -> 20/11`, hạn TT `05/12`) chống cảnh báo giả; tính toán lịch biểu trả góp, số kỳ đã trả, số kỳ còn lại và ngày hoàn tất (`computeInstallmentStatus`) | ✅ Pass (46/46 unit tests) |
| T-24 | Kiểm thử `Quỹ Tiết Kiệm` (`analyzeSavingsGoal` & `findSavingsFund`), lộ trình 3 giai đoạn (`0%` – `50%` – `100%`), ghi nhận Tháng mục tiêu (`MM/yyyy`), vuốt ngang trên Sổ giao dịch & Báo cáo chi tiết, giao diện Ngân sách tháng lặp lại và hiển thị thanh tiến độ trên Android / iOS | ✅ Pass (47/47 unit tests) |

Dữ liệu mẫu chỉ nạp vào trình duyệt kiểm thử và đã xoá; không nằm trong mã nguồn.
