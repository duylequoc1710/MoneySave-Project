# 05 – Kế hoạch & kết quả kiểm thử

| ID | Kịch bản | Kết quả (2026-10-24) |
|---|---|---|
| T-01 | `tsc -b` + `npm run build` không lỗi, sinh sw.js + manifest | ✅ Pass |
| T-02 | Lần đầu mở: seed 2 quỹ + 12 nhóm mặc định, Tổng quan hiện 0 ₫ | ✅ Pass (screenshot) |
| T-03 | Nạp 49 giao dịch mẫu (7 tháng, gồm tương lai): Sổ hiển thị gom theo ngày, tổng Thu/Chi/Chênh lệch đúng | ✅ Pass |
| T-04 | Tổng quan: line chart 6 tháng, tổng số dư, top nhóm chi | ✅ Pass |
| T-05 | Giao diện sáng & tối (theo hệ thống) | ✅ Pass |
| T-06 | Thêm/sửa/xoá giao dịch qua form, chuyển quỹ, ngân sách, sao lưu/khôi phục | ⏳ Chưa kiểm tay đầy đủ – cần PO dùng thử |
| T-07 | Cài PWA thực trên iPhone/Android | ⏳ Cần deploy https |
| T-08 | Màn hình desktop ≥900px (sidebar) | ⏳ Chưa chụp |

Dữ liệu mẫu chỉ nạp vào trình duyệt kiểm thử và đã xoá; không nằm trong mã nguồn.
Backlog: thêm unit test (vitest) cho `effectOn` và export/import.
