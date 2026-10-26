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
| FR-14 | **Đồng bộ Cloud Realtime đa thiết bị kèm Mã hóa đầu cuối (E2EE `AES-GCM 256-bit` + `PBKDF2-SHA256`)** qua Firebase Firestore REST API (Zero-Knowledge, tự động đẩy khi sửa IndexedDB và kéo khi mở app/chuyển tab) | ✅ |
| FR-15 | Giao dịch định kỳ (hóa đơn cố định, cài đặt trước, tự động Chi/Thu khi đến ngày) | ✅ |
| FR-16 | Quỹ tín dụng (ghi nhớ ngày chốt sao kê, hạn thanh toán, tính số ngày miễn lãi & gợi ý tối ưu tiền mặt xài trước trả sau, tất toán 1 chạm) | ✅ |
| FR-17 | Giao diện chuẩn MoneyLover (Ẩn/hiện số dư, Ví của tôi, Money Insider, Báo cáo xu hướng lũy kế & Báo cáo chi tiêu Tuần/Tháng, Sổ giao dịch có Số dư đầu/cuối) | ✅ |
| FR-18 | **Xem báo cáo cho giai đoạn này** (trong Sổ giao dịch): Thu nhập ròng, Báo cáo theo nhóm (2 biểu đồ Donut Khoản thu/Khoản chi song song), Chi tiết khoản chi & Chi tiết khoản thu (chế độ Chi tiết Donut và Xu hướng BarChart theo tuần + so sánh trung bình 3 tháng trước) | ✅ |
| FR-19 | **Cài đặt Ví nâng cao**: phân nhóm `TÍNH VÀO TỔNG` / `KHÔNG TÍNH VÀO TỔNG` / `ĐÃ LƯU TRỮ`; công tắc `Bật thông báo`, `Không tính vào tổng` (loại bỏ hoàn toàn số dư & giao dịch của ví khỏi Tổng quan và mọi báo cáo tổng hợp), `Lưu trữ` (đóng băng ví & ngừng tạo giao dịch định kỳ); tác vụ `Chuyển tiền đến ví khác` (có phí chuyển khoản & `Không tính vào báo cáo`) và `Điều chỉnh số dư` | ✅ |
| FR-20 | **Chọn Ví nâng cao (`WalletSelectorPill`) & Bộ lọc khoảng thời gian chi tiết (`TimeRangeModal`)**: nút Tổng cộng cân đối, bấm mở bảng chọn ví theo từng nhóm có số dư; nút lịch `📅` bên trái mở bộ lọc khoảng ngày cụ thể (`Từ ngày – Đến ngày`), chọn nhanh Tháng/Năm, hoặc `Hôm nay` / `Tuần này` / `Quý này` / `Năm nay` / `Tất cả thời gian` | ✅ |
| FR-21 | **Module Cài đặt (`Settings`) & Xuất Excel (`.xls`)**: chuyển đổi trực tiếp `Dark Theme` / `Light Theme` / `System`; gom toàn bộ quản lý Dữ liệu cá nhân vào Cài đặt; hỗ trợ xuất báo cáo ra file Excel thực sự (`.xls` 2 Sheet: `Sổ Giao Dịch` & `Danh Sách Ví`) cùng `.csv` và `.json` | ✅ |
| FR-22 | **Xác thực Tài khoản Cá nhân / Gia đình (Firebase Auth Email/Password) & Tự động triển khai Cloud Hosting PWA**: Đăng nhập/Đăng ký chuẩn MoneyLover, tự động cô lập ví cá nhân theo User UID, tích hợp sẵn cấu hình Firebase không cần gõ URL/Sync ID thủ công; tự động triển khai GitHub Pages (`.github/workflows/deploy.yml`) HTTPS mở 1 chạm trên iPhone/Android | ✅ |
| FR-23 | **Hệ thống Nhóm Cha & Nhóm Con (Category Hierarchy)**: Hỗ trợ phân cấp nhóm cha đại diện (ví dụ `Thiết Yếu 50%`, `Cá nhân 25%`), cho phép tick chọn nhanh các nhóm con để gán vào nhóm cha, hiển thị thụt lề chuẩn MoneyLover, phân nhóm trong bộ chọn nhóm giao dịch, hiển thị rõ ràng trên Báo cáo giai đoạn (`Nhóm cha › Nhóm con`) | ✅ |
| FR-24 | **Tối ưu trải nghiệm Cài đặt Tài khoản & Typography Native macOS Desktop**: Ẩn/thu gọn các trường kỹ thuật đồng bộ thủ công vào accordion Developer để giao diện tinh gọn cho người dùng phổ thông/gia đình; đồng bộ hệ font chữ chuẩn San Francisco macOS (`-apple-system`, `SF Pro Text`, `SF Pro Display`) với font-smoothing sắc nét, mở rộng Desktop Sidebar lên 240px và tích hợp trạng thái tài khoản/đồng bộ ở chân Sidebar | ✅ |
| FR-25 | **Màn hình Chi tiết Giao dịch (Transaction Detail View) chuẩn MoneyLover**: Khi bấm vào khoản thu chi trong Sổ giao dịch, Tổng quan hoặc Báo cáo, mở màn hình Chi tiết giao dịch độc lập (hiển thị nhóm, ghi chú, số tiền lớn, ngày tiếng Việt đầy đủ, ví thanh toán) kèm 2 tùy chọn nhanh `Sao chép giao dịch` và `Xóa giao dịch`, cùng nút `Sửa` ở góc trên; loại bỏ tình trạng bàn phím ảo tự động che màn hình khi bấm xem giao dịch | ✅ |
| FR-26 | **Cổng Đăng Nhập Ban Đầu (Auth Gate), Dọn Sạch Dữ Liệu Test & Bản Quyền Tác Giả**: Hiển thị màn hình Đăng Nhập/Đăng Ký làm cổng chào mừng cho người dùng mới chưa đăng nhập; sau khi đăng nhập thành công chuyển thẳng vào Tổng quan; xóa sạch toàn bộ dữ liệu test cũ đưa ví về 0 ₫; hiển thị Email/UID tài khoản ở chân Sidebar thay thế nhãn Offline-first; ghi nhận Tác giả `Duylequoc1710` tại chân trang Cài đặt | ✅ |
| FR-27 | **Cửa sổ trượt Tháng Động (Sliding Month Tabs)**: Sửa triệt để lỗi khi người dùng chuyển sang tháng cũ (ví dụ tháng 8, tháng 6), tab không bị nhảy ngược về tháng hiện tại; 3 tab tháng luôn hiển thị động theo ngữ cảnh tháng đang xem (`[Tháng trước] [Tháng đang xem] [Tháng sau]`) kèm nút chuyển nhanh `Về tháng này` | ✅ |
| FR-28 | **Đồng bộ Định Dạng Ngày dd/MM/yyyy & Ổn Định Giao Diện Web App Mobile (iOS Safari & Android)**: Thay thế giao diện date picker mặc định của hệ điều hành bằng component `DateInput` chuẩn tiếng Việt hiển thị cố định `dd/MM/yyyy` (ví dụ: `17/10/2026 (Thứ Bảy)`) trên mọi thiết bị; tăng cường phần cứng GPU compositing (`translate3d`), chống tràn ngang (`overflow-x: hidden`) và cố định thanh điều hướng (Dock Nav & FAB) trên iOS Safari chống lún, chống xô lệch khi cuộn trang | ✅ |
| FR-30 | **Bàn Phím Số / Máy Tính In-App Chuẩn MoneyLover, Dấu Phân Cách Thập Phân & Tối Ưu UX Dock Navigation Mobile**: Thay thế bàn phím tách rời của hệ điều hành bằng Bàn phím số tích hợp (In-App Numeric Keypad) liền mạch "1 khối chung" (hỗ trợ nhập số nguyên, số thập phân `.`, `000`, toán tử `+ - × ÷`, phím `C`, `⌫`, phím `XONG` 2 hàng và chip gợi ý số tiền nhanh); khi sửa giao dịch mặc định tắt bàn phím và không nháy con trỏ; thanh dock menu và nút FAB "+ Thêm giao dịch" tự động ẩn mượt mà khi cuộn xuống để tối đa diện tích xem dọc và hiện lại ngay khi cuộn lên; tăng kích thước Touch Target đạt chuẩn native 48px, thêm phản hồi chạm haptic scale `:active` tức thì và khóa zoom trình duyệt để trải nghiệm mượt mà như app native | ✅ |
| FR-31 | **Thống nhất định dạng & báo cáo tuần & UX nhập liệu (2026-10-26)**: tháng hiển thị `MM/yyyy`, ngày hiển thị `dd/MM/yyyy` (kể cả Định kỳ); màn **Chi tiết thu nhập ròng** theo tuần Thứ 2–Chủ nhật (thu/chi/ròng, xem giao dịch theo ngày); khoá cuộn nền khi mở form; ô Ngày cố định định kỳ nhập đúng 1–31; bàn phím số dạng panel nổi chỉ hiện khi chạm ô số tiền, ẩn khi chạm ngoài/cuộn/XONG; PWA tự cập nhật sau deploy | ✅ |
| FR-32 | **Tối ưu an toàn & hiệu năng (2026-10-26)**: bản sao an toàn tự động trước khi Khôi phục/Đồng bộ ghi đè/Nạp mẫu/Xoá sạch (IndexedDB riêng `moneysave_safety`, giữ 10 bản, khôi phục/tải/xoá trong Cài đặt); nhắc sao lưu JSON sau 7 ngày; hiển thị phiên bản app (số · ngày giờ build · mã commit) và thông báo "Đã cập nhật phiên bản mới"; tải trang theo nhu cầu (lazy) + tách chunk Recharts (JS chính 970 KB → 435 KB); tách `Accounts.tsx` thành `components/accounts/*` | ✅ |

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
