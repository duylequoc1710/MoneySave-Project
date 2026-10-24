# 01 – Đặc tả yêu cầu phần mềm (SRS)

- Sản phẩm: MoneyGo · Phiên bản tài liệu: 0.1 · Ngày: 2026-10-24
- Chủ sản phẩm (PO): Duy Lê · Người dùng: cá nhân (1 người, nhiều thiết bị)

## 1. Mục tiêu
Ghi chép thu chi nhanh, xem tổng quan tài chính, quản lý theo quỹ; dùng được trên Android/iOS/macOS, không cần hạ tầng hosting phức tạp.

## 2. Yêu cầu chức năng (FR)

| ID | Yêu cầu | Trạng thái |
|---|---|---|
| FR-01 | **Tổng quan**: line chart Thu/Chi theo tháng (6 hoặc 12 tháng) | ✅ |
| FR-02 | Tổng quan: danh sách nhóm chi nhiều nhất của tháng chọn, % tổng chi, thanh tiến độ | ✅ |
| FR-03 | Tổng quan: tổng số dư toàn bộ quỹ | ✅ |
| FR-04 | **Sổ giao dịch**: chọn tháng bất kỳ (quá khứ, hiện tại, tương lai) bằng ‹ › | ✅ |
| FR-05 | Sổ giao dịch: gom theo ngày, mỗi ngày hiển thị các giao dịch và tổng thu/chi ròng của ngày | ✅ |
| FR-06 | Tổng Thu / Chi / Chênh lệch của tháng đang xem | ✅ |
| FR-07 | Thêm / sửa / xoá giao dịch (Chi, Thu, Chuyển quỹ); ngày tương lai được phép | ✅ |
| FR-08 | **Tài khoản chung**: tạo/sửa/xoá quỹ (tên, icon, màu, số dư đầu), xem số dư từng quỹ | ✅ |
| FR-09 | Tạo/sửa/xoá nhóm giao dịch (thu/chi), gán nhóm vào quỹ mong muốn (tự chọn quỹ khi chọn nhóm) | ✅ |
| FR-10 | (Đề xuất) Chuyển tiền giữa các quỹ | ✅ |
| FR-11 | (Đề xuất) Ngân sách tháng theo nhóm chi, cảnh báo vượt (thanh đỏ) | ✅ |
| FR-12 | (Đề xuất) Tìm kiếm theo ghi chú/nhóm; lọc theo quỹ | ✅ |
| FR-13 | (Đề xuất) Sao lưu / khôi phục JSON; xuất CSV | ✅ |
| FR-14 | Đồng bộ realtime giữa các thiết bị | ⏳ Giai đoạn 2 (xem Roadmap) |
| FR-15 | (Đề xuất) Giao dịch định kỳ (tiền nhà, lương…) | ⏳ Backlog |

## 3. Yêu cầu phi chức năng (NFR)
- NFR-01 Đa nền tảng: PWA cài được trên iOS (Safari → Thêm vào MH chính), Android (Chrome), macOS (Safari/Chrome).
- NFR-02 Offline-first: mọi chức năng chạy không cần mạng.
- NFR-03 UI tối giản, hiện đại, tự động sáng/tối theo hệ thống, đáp ứng mobile & desktop.
- NFR-04 Dữ liệu cá nhân: lưu cục bộ; khi đồng bộ phải có xác thực & rule chỉ chủ sở hữu truy cập.
- NFR-05 Tiền tệ VND, định dạng vi-VN; ngôn ngữ giao diện tiếng Việt.
- NFR-06 Không phụ thuộc server tự vận hành.

## 4. Tiêu chí nghiệm thu
1. Chọn tháng tương lai, thêm giao dịch → hiện đúng ngày, tổng tháng cập nhật.
2. Tạo quỹ mới + nhóm gán quỹ → thêm giao dịch tự chọn đúng quỹ.
3. Chuyển quỹ không làm đổi tổng số dư.
4. Cài được lên điện thoại/Mac và mở offline.
5. Sao lưu rồi khôi phục cho kết quả y hệt.

## 5. Ngoài phạm vi
App native store, kết nối ngân hàng, thông báo đẩy iOS, đa người dùng/chia sẻ ví.
