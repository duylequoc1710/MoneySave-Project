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
| T-10 | Kiểm thử E2E v2: Giao diện MoneyLover, tự động phát sinh Giao dịch định kỳ, phân tích Quỹ tín dụng | ✅ Pass |
| T-11 | Kiểm thử Báo cáo giai đoạn (`PeriodReport`) & Sửa lỗi nền trắng Tooltip Recharts trên toàn ứng dụng | ✅ Pass |
| T-12 | Kiểm thử tính năng Ví nâng cao (`TÍNH VÀO TỔNG` / `KHÔNG TÍNH VÀO TỔNG`, `Lưu trữ`, `Điều chỉnh số dư`, `Chuyển tiền đến ví khác` + phí chuyển khoản) | ✅ Pass |
| T-13 | Kiểm thử Module Cài đặt (Dark/Light Theme, Xuất Excel `.xls`), `WalletSelectorPill`, `TimeRangeModal` & Responsive đa màn hình điện thoại (`360x800`, `375x667`, `393x852`, `430x932`) | ✅ Pass |
| T-14 | Kiểm thử Đồng bộ Cloud Realtime qua Firebase Firestore kèm Mã hóa đầu cuối (E2EE `AES-GCM 256-bit` + `PBKDF2-SHA256`) & tích hợp Logo/Favicon MoneySave trong suốt | ✅ Pass |
| T-15 | Kiểm thử Xác thực Tài khoản Cá nhân/Gia đình (Firebase Auth Email/Password), cô lập dữ liệu theo User UID, tích hợp sẵn `firebaseConfig`, và quy trình CI/CD GitHub Pages PWA | ✅ Pass (20/20 unit tests) |
| T-16 | Kiểm thử Hệ thống Nhóm Cha & Nhóm Con (Category Hierarchy), gom nhóm phân cấp, gán nhanh nhóm con, chọn nhóm optgroup trong form giao dịch, hiển thị `Nhóm cha › Nhóm con` trên báo cáo | ✅ Pass (22/22 unit tests) |

Dữ liệu mẫu chỉ nạp vào trình duyệt kiểm thử và đã xoá; không nằm trong mã nguồn.
