# 04 – Hướng Dẫn Sử Dụng Ứng Dụng MoneySave

Ứng dụng quản lý tài chính cá nhân chuẩn MoneyLover, hoạt động theo mô hình **Local-first / Offline-first** kết hợp **Đồng bộ Realtime tự động đa thiết bị qua Firebase** và **Mã hóa đầu cuối (E2EE AES-GCM 256-bit)**.

---

## 1. Cài đặt & Truy cập Ứng dụng

### 1.1. Chạy trên Máy tính (Mac / Windows / Linux)
```bash
cd app
npm run dev
```
Mở trình duyệt truy cập: `http://localhost:5173`. Có thể bấm vào biểu tượng cài đặt trên thanh địa chỉ của Chrome/Safari để cài ứng dụng trực tiếp vào máy.

### 1.2. Mở trên Điện thoại (iPhone / Android)
Truy cập đường link ứng dụng trên trình duyệt điện thoại (ví dụ: `https://money-save-project.vercel.app`):
* **Trên iPhone (Safari):** Bấm nút **Chia sẻ 📤** → chọn **Thêm vào MH chính (Add to Home Screen)**.
* **Trên Android (Chrome):** Bấm menu **⋮** → chọn **Cài đặt ứng dụng** (Install App).
* Sau khi cài đặt, biểu tượng **MoneySave** sẽ xuất hiện trên màn hình chính, mở lên toàn màn hình không có thanh địa chỉ trình duyệt, hoạt động mượt mà và lưu cache offline.

---

## 2. Hệ Thống Tài Khoản Cá Nhân & Gia Đình

* **Đăng nhập một lần dùng mãi mãi:** Trong tab **⚙️ Cài đặt**, bấm **Đăng Nhập / Tạo Tài Khoản Mới**.
* **Độc lập và Riêng tư:** Mỗi tài khoản đăng nhập bằng Email cá nhân. Dữ liệu ví của mỗi người được lưu hoàn toàn riêng biệt theo mã định danh `User UID`.
* **Thành viên gia đình:** Người thân (vợ/chồng, con cái) có thể tự đăng ký tài khoản bằng email của họ trên điện thoại riêng để quản lý các ví cá nhân độc lập.
* **Mã hóa đầu cuối (E2EE):** Mật khẩu tài khoản được dùng để tự động tạo khóa mã hóa AES-256 ngầm dưới nền. Dữ liệu khi gửi lên máy chủ luôn là bản mã không thể giải mã nếu không có mật khẩu.

---

## 3. Quản Lý Ví & Nguồn Tiền

Trong tab **Ví của tôi** (`Accounts`):
* **TÍNH VÀO TỔNG:** Các ví tiền mặt, tài khoản ngân hàng thông thường được tính vào tổng số dư tài sản trên trang Tổng quan.
* **KHÔNG TÍNH VÀO TỔNG:** Dành cho các quỹ tiết kiệm dài hạn, quỹ đầu tư chứng khoán, bất động sản... Khi bật công tắc này, số dư và các giao dịch của ví sẽ **hoàn toàn không được tính vào Tổng tài sản** hay các báo cáo chi tiêu thông thường.
* **LƯU TRỮ (ĐÓNG BĂNG):** Khi không còn sử dụng một ví, bạn có thể chuyển sang trạng thái Lưu trữ. Ứng dụng sẽ đóng băng ví này và tự động ngừng phát sinh các hóa đơn định kỳ gắn với ví đó.
* **Quỹ tín dụng (Thẻ tín dụng - Xài trước trả sau):**
  * Theo dõi hạn mức tín dụng, dư nợ hiện tại và hạn mức còn lại.
  * Tự động tính số ngày miễn lãi nếu quẹt thẻ hôm nay (`interestFreeDaysToday`).
  * Cảnh báo thời điểm vàng quẹt thẻ, cảnh báo sắp chốt sao kê và cảnh báo sắp đến hạn thanh toán.
  * Nút **Tất toán 1 chạm** hỗ trợ chuyển tiền từ tài khoản ngân hàng sang thanh toán dư nợ thẻ.
* **Chuyển tiền giữa các ví:** Hỗ trợ tùy chọn kèm phí chuyển khoản và công tắc *Không tính vào báo cáo*.
* **Điều chỉnh số dư:** Tự động tạo giao dịch cân bằng số dư thực tế với số dư trong sổ sách.

---

## 4. Hệ Thống Nhóm Cha & Nhóm Con (Category Hierarchy)

Tính năng phân cấp danh mục chi tiêu chuẩn phương pháp quản lý ngân sách 50/30/20:
* **Tạo nhóm cha đại diện:** Ví dụ tạo nhóm `🏡 Thiết Yếu 50%` hoặc `👤 Cá nhân 25%`.
* **Gán nhanh các nhóm con:** Khi tạo/sửa nhóm cha, màn hình hiển thị danh sách checklist các nhóm con để bạn tick chọn nhanh (ví dụ: gán `Ăn uống`, `Di chuyển`, `Hoá đơn`, `Nhà cửa` vào nhóm `Thiết Yếu 50%`).
* **Hiển thị trực quan:** Danh sách nhóm trong trang quản lý được thụt đầu dòng với đường nối nhánh rõ ràng.
* **Chọn nhóm khi ghi chép:** Khi thêm giao dịch mới, bộ chọn nhóm phân thành từng nhóm cha (`optgroup`) và các nhóm con tương ứng, cho phép chọn nhanh và chính xác.
* **Xem báo cáo:** Báo cáo giai đoạn và top chi tiêu tự động hiển thị theo định dạng `Nhóm cha › Nhóm con` (VD: `Thiết Yếu 50% › Ăn uống`).

---

## 5. Sổ Giao Dịch & Báo Cáo Giai Đoạn Này

* **Lọc thời gian linh hoạt (`📅`):** Lọc theo khoảng ngày cụ thể (Từ ngày - Đến ngày), Tháng/Năm, hoặc các mốc nhanh: *Hôm nay, Tuần này, Quý này, Năm nay, Tất cả thời gian*.
* **Bộ chọn Ví (`🌐 Tổng cộng ▾`):** Bấm để mở bảng chọn nhanh ví theo từng nhóm hoặc xem tổng hợp toàn bộ tài sản.
* **Xem báo cáo cho giai đoạn này:**
  * **Thu nhập ròng:** Thể hiện tổng thu, tổng chi và mức thặng dư/thâm hụt.
  * **Báo cáo theo nhóm:** 2 biểu đồ Donut trực quan đặt cạnh nhau cho Khoản thu và Khoản chi.
  * **Chi tiết & Xu hướng:** Xem phân bổ tỷ lệ phần trăm theo từng nhóm hoặc biểu đồ cột xu hướng chi tiêu theo từng tuần trong tháng kèm đường so sánh trung bình 3 tháng trước.

---

## 6. Giao Dịch Định Kỳ & Quản Lý Dữ Liệu

* **Hóa đơn định kỳ (Recurring):** Tự động tạo hóa đơn tiền nhà, tiền mạng, tiền lương... hàng tháng mà không cần nhập lại.
* **Xuất file Excel (`.xls`):** Xuất báo cáo tài chính 2 Sheet chuẩn tiếng Việt (`Sổ Giao Dịch` và `Danh Sách Ví`).
* **Sao lưu & Khôi phục JSON:** Tải file sao lưu an toàn về máy và khôi phục lại bất kỳ lúc nào.
* **Giao diện Tối / Sáng (Dark / Light Theme):** Chuyển đổi trực tiếp trong mục Cài đặt.
