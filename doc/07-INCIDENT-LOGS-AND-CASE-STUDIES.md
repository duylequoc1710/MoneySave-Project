# 07. Sổ Tay Sự Cố Kỹ Thuật & Case Studies (Incident Logs & Postmortems)

> **Dành cho các kỹ sư bảo trì và phát triển kế tiếp:**  
> Tài liệu này ghi nhận toàn bộ các sự cố kỹ thuật thực tế (Bugs & Incidents), phân tích nguyên nhân gốc rễ (Root Cause Analysis - RCA), các giải pháp triệt để và bộ quy tắc phòng ngừa (Design Principles) nhằm tránh lặp lại các lỗi tương tự trong tương lai.

---

## 📌 Bảng Tra Cứu Sự Cố Nhanh (Incident Matrix)

| Mã | Hạng mục | Triệu chứng | Nguyên nhân cốt lõi | Cách xử lý triệt để |
|---|---|---|---|---|
| **INC-01** | Cloud Sync / Offline DB | Dữ liệu test cũ (111 triệu) tự phục hồi sau khi dọn sạch 0 ₫ | Xóa local IndexedDB nhưng chưa đẩy ghi đè két sắt trắng lên Firebase Cloud | Áp dụng "Atomic Local-Cloud Wipe" (Xóa local + đẩy đè ngay lên Cloud) |
| **INC-02** | CSS / macOS Desktop | Web app trên máy Mac bị đơ, không cuộn trackpad / chuột được | `overflow-x: hidden` và `overscroll-behavior-y: none` trên `html`/`body` khóa WebKit scroll | Tách CSS: chỉ đặt `overflow-x: hidden` trên mobile (`<900px`), desktop dùng `overflow: visible` |
| **INC-03** | Mobile Web / UI | Định dạng ngày không đồng nhất giữa iOS (`1 Aug 2026`) & Android (`08/01/2026`) | Thẻ `<input type="date">` chuẩn HTML5 tự định dạng theo System Locale của thiết bị | Tạo component `DateInput.tsx` (Custom Display `dd/MM/yyyy` + Transparent Native Input) |
| **INC-04** | UI / Ledger Tabs | Chọn tháng cũ (T8, T6) rồi click tab thì bị nhảy ngược về tháng 9 | 3 nút tab tháng bị hardcode cứng vào `now - 1`, `now`, `now + 1` | Áp dụng cơ chế trượt cửa sổ động (Windowed Sliding Tabs: `cur - 1`, `cur`, `cur + 1`) |
| **INC-05** | Mobile UX / Keyboard | Bấm vào khoản chi tiêu thì bàn phím ảo tự động bung lên chiếm màn hình | Bấm vào item nhảy thẳng vào form sửa kèm thuộc tính `autoFocus={true}` | Tách màn hình Chi tiết giao dịch (`TxDetailModal.tsx`), tắt `autoFocus` khi sửa |
| **INC-06** | iOS Safari / Layout | Thanh điều hướng (Dock Nav) bị lún xuống thanh Safari và xô lệch 2 bên khi cuộn | Dùng `margin: 0 auto` trên fixed element, thiếu GPU compositing và thiếu `translate3d` | Dùng `left: 50%`, `transform: translate3d(-50%, 0, 0)`, `will-change: transform`, đệm `safe-area` |

---

## 🔍 Chi Tiết Phân Tích & Bài Học Kinh Nghiệm (Case Studies)

### CASE STUDY 1: Bất Đối Xứng Giữa Dọn Cục Bộ & Đồng Bộ Đám Mây (Ghost Data Restore)
* **Mã sự cố:** `INC-01`
* **Mức độ:** Nghiêm trọng (Dữ liệu không nhất quán giữa các thiết bị).
* **Mô tả hiện tượng:**
  Người dùng xóa sạch các dữ liệu test mẫu đưa ví về 0 ₫ trên máy tính. Tuy nhiên khi tải lại trang, mở tab mới hoặc mở app trên điện thoại, số dư 111,361,000 ₫ và các ví mẫu cũ (`Quỹ Chính`, `Techcombank`, `VIB`, `VPBank`, `HSBC`) bất ngờ xuất hiện trở lại.
* **Nguyên nhân gốc rễ (RCA):**
  1. Khi người dùng đăng ký tài khoản Firebase Auth (`quocduyle2000@gmail.com`), tại thời điểm đó cơ sở dữ liệu IndexedDB trên máy đang có dữ liệu test.
  2. Engine `cloudSync.ts` ngay lập tức mã hóa E2EE và đẩy gói dữ liệu này lên két sắt Firebase Cloud dưới khóa `usr_${user.uid}`.
  3. Khi thực hiện xóa dữ liệu test, hàm `clearAllToCleanState()` chỉ thực hiện `db.txs.clear()` trên IndexedDB của trình duyệt máy đó.
  4. Khi ứng dụng khởi động lại hoặc nhận sự kiện `focus`/`visibilitychange`, hàm `syncNowSmart()` đối chiếu với Firebase Cloud. Do bản trên Cloud có mốc thời gian hợp lệ (`updatedAt > 0`) trong khi máy cục bộ vừa bị xóa sạch không có mốc mới đẩy lên, hệ thống tự động suy đoán đây là bản sao lưu từ thiết bị khác và kéo về, giải mã rồi nạp đè lại vào IndexedDB.
* **Giải pháp khắc phục:**
  * Nguyên tắc **"Atomic Local-Cloud Wipe"**: Bất kỳ thao tác dọn dẹp hoặc khởi tạo lại dữ liệu nào (`clearAllToCleanState`) đều phải kích hoạt đồng thời `markLocalMutated()` và gọi trực tiếp `pushLocalToCloud(cfg)` để ghi đè ngay trạng thái két sắt 0 ₫ lên Firebase Cloud.
  * Tăng phiên bản khóa dọn dẹp khởi động (`moneysave_purge_demo_v5` tại [`main.tsx`](../app/src/main.tsx)) để tự động thực thi quá trình này một lần duy nhất trên mọi thiết bị người dùng mở app.
* **Quy tắc cho kỹ sư:**
  > Trong các hệ thống Offline-First có cơ chế Smart Sync 2 chiều, **Client không được phép âm thầm xóa dữ liệu một mình**. Mọi thao tác xóa quy mô lớn phải được xem là một sự kiện Mutation có mốc thời gian mới nhất và phải đẩy ngay lên Cloud để tránh bị cơ chế Auto-Pull kéo bản sao lưu cũ về đè lại.

---

### CASE STUDY 2: Khóa Cuộn Trackpad macOS Do Xung Đột Thuộc Tính CSS Mobile
* **Mã sự cố:** `INC-02`
* **Mức độ:** Trung bình – Cao (Trải nghiệm người dùng trên máy Mac bị tê liệt).
* **Mô tả hiện tượng:**
  Sau khi cập nhật bản vá chống xô lệch taskbar cho iPhone, người dùng mở web app trên máy Mac (cả Safari, Chrome và bản PWA cài đặt) thì không thể dùng 2 ngón tay trên Trackpad hoặc con lăn chuột để cuộn trang xuống xem các nội dung bên dưới.
* **Nguyên nhân gốc rễ (RCA):**
  1. Để chống hiệu ứng nảy (rubber-band) và tràn ngang trên màn hình cảm ứng iPhone, các thuộc tính sau đã được đặt ở phạm vi toàn cục:
     ```css
     html, body {
       overflow-x: hidden;
       overscroll-behavior-y: none;
     }
     .shell {
       overflow-x: hidden;
     }
     ```
  2. Trên WebKit macOS (Safari & Chromium), việc áp dụng đồng thời `overflow-x: hidden` trên cả `html` và `body` kèm `overscroll-behavior-y: none` dẫn đến xung đột ngữ cảnh cuộn (Conflicting Scroll Contexts).
  3. Trình duyệt Mac chặn sự kiện `wheel` truyền từ Trackpad lên document element, làm cho cử chỉ cuộn bị khóa cứng (Scroll Lock).
  4. Thuộc tính `overflow-x: hidden` trên flex container `.shell` cũng đồng thời vô hiệu hóa `position: sticky` của Sidebar menu bên trái do vi phạm quy tắc cha con của CSS Sticky.
* **Giải pháp khắc phục:**
  * **Cô lập theo Media Query:**
    * Các thuộc tính hạn chế tràn màn hình chỉ được đặt bên trong `@media (max-width: 899px)` (dành riêng cho Mobile).
    * Trên Desktop (`@media (min-width: 900px)`): Trả về `overflow: visible;` tự nhiên, xóa bỏ hoàn toàn `overscroll-behavior-y: none;`, bổ sung `flex-shrink: 0;` cho Sidebar `.nav`.
* **Quy tắc cho kỹ sư:**
  > Tuyệt đối không bao giờ đặt `overscroll-behavior-y: none` hoặc `overflow-x: hidden` trên thẻ `body`/`html` ở phạm vi toàn cục khi xây dựng ứng dụng Responsive chạy cả trên Desktop máy tính và Mobile. Mọi tinh chỉnh cảm ứng (touch gestures) phải được bọc trong `@media (pointer: coarse)` hoặc giới hạn theo kích thước màn hình.

---

### CASE STUDY 3: Không Đồng Nhất Định Dạng Ngày HTML5 Giữa iOS & Android
* **Mã sự cố:** `INC-03`
* **Mức độ:** Thấp – Trung bình (Lỗi hiển thị & thẩm mỹ).
* **Mô tả hiện tượng:**
  Ô chọn ngày chi tiêu hiển thị không đồng bộ: Trên iPhone Safari hiển thị dạng `"1 Aug 2026"`, trên Android Chrome hiển thị `"08/01/2026"` (tháng trước ngày sau), trong khi người dùng mong muốn chuẩn thống nhất Việt Nam là `dd/MM/yyyy` (ví dụ `01/08/2026`).
* **Nguyên nhân gốc rễ (RCA):**
  * Thẻ `<input type="date">` chuẩn W3C HTML5 lưu trữ giá trị ISO `YYYY-MM-DD`, nhưng chuỗi ký tự hiển thị bên trong ô input là do Hệ điều hành & Ngôn ngữ máy (System Locale) của thiết bị tự động render qua Shadow DOM.
  * Các thuộc tính CSS hay thuộc tính HTML không thể can thiệp trực tiếp vào định dạng chữ này của trình duyệt.
* **Giải pháp khắc phục:**
  * Xây dựng mô hình **Custom Display Overlay + Transparent Native Input** ([`DateInput.tsx`](../app/src/components/DateInput.tsx)):
    1. Lớp hiển thị (Display Layer): Component React vẽ giao diện thuần tiếng Việt hiển thị chính xác `📅 dd/MM/yyyy (Thứ trong tuần)`.
    2. Lớp điều khiển gốc (Native Layer): Đặt thẻ `<input type="date">` trong suốt (`opacity: 0; position: absolute; inset: 0; width: 100%; height: 100%; cursor: pointer;`) phủ trọn vẹn lên trên.
    3. Khi người dùng chạm vào, trình duyệt vẫn bật wheel picker gốc mượt mà của iOS/Android, nhưng văn bản hiển thị trên trang luôn đồng nhất 100% theo chuẩn `dd/MM/yyyy`.
* **Quy tắc cho kỹ sư:**
  > Trong các dự án Web App / PWA yêu cầu chuẩn hóa định dạng ngày theo quốc gia (Localize Date Format), không sử dụng thẻ `<input type="date">` trần mà luôn áp dụng mô hình Overlay Native Input để vừa giữ được UX wheel chọn ngày mượt mà của OS, vừa làm chủ hoàn toàn chuỗi text hiển thị.

---

### CASE STUDY 4: Nhảy Ngược Về Tháng Mặc Định Khi Dùng Tab Cố Định (Fixed vs Windowed Tabs)
* **Mã sự cố:** `INC-04`
* **Mức độ:** Trung bình (Ảnh hưởng trải nghiệm điều hướng sổ giao dịch).
* **Mô tả hiện tượng:**
  Người dùng bấm nút mũi tên lùi về các tháng xa hơn (ví dụ Tháng 8, Tháng 6). Danh sách hiển thị đúng dữ liệu tháng 8, nhưng thanh tab phía trên lại ghi nhãn cố định và khi bấm vào tab thì ứng dụng tự động nhảy ngược về Tháng 9.
* **Nguyên nhân gốc rễ (RCA):**
  * Thanh tab cũ bị hardcode cứng 3 nút dựa trên thời điểm hiện tại (`new Date()`):
    * Tab 1: `Tháng trước` (`now - 1`)
    * Tab 2: `Tháng này` (`now`)
    * Tab 3: `Tương lai` (`now + 1`)
  * Khi người dùng lùi tháng về quá khứ xa hơn (tháng `now - 2`, `now - 4`), con trỏ thời gian trong cơ sở dữ liệu đã thay đổi nhưng 3 tab phía trên vẫn gọi hàm chọn `now - 1` dẫn đến việc bị kéo ngược về tháng liền trước hiện tại.
* **Giải pháp khắc phục:**
  * Chuyển đổi sang cơ chế **Windowed Sliding Tabs** (Cửa sổ trượt động theo ngữ cảnh):
    * Tab trung tâm luôn là tháng đang xem: `tabCenter = cur`.
    * Tab bên trái là tháng liền trước của tháng đang xem: `tabLeft = cur - 1`.
    * Tab bên phải là tháng liền sau của tháng đang xem: `tabRight = cur + 1`.
    * Dùng hàm helper [`getMonthTabLabel`](../app/src/lib.ts) để sinh nhãn thông minh (VD: `Tháng 7/2026`, `Tháng 8/2026`, `Tháng 9/2026`).
* **Quy tắc cho kỹ sư:**
  > Mọi thanh điều hướng thời gian theo dạng tab trượt phải luôn lấy trạng thái con trỏ (`currentSelectedPeriod`) làm tâm điểm, không bao giờ được hardcode cố định theo `new Date()`.

---

### CASE STUDY 5: Bàn Phím Ảo Tự Động Bung Lên Chiếm Màn Hình Khi Xem Khoản Chi Tiêu
* **Mã sự cố:** `INC-05`
* **Mức độ:** Trung bình (Trải nghiệm người dùng trên điện thoại di động).
* **Mô tả hiện tượng:**
  Trên điện thoại, khi người dùng bấm vào một khoản chi tiêu trong danh sách để xem lại thông tin, bàn phím số/chữ của điện thoại tự động bung lên che khuất màn hình và nhảy ngay vào chế độ sửa dữ liệu, dễ dẫn đến việc gõ nhầm số tiền.
* **Nguyên nhân gốc rễ (RCA):**
  * Ứng dụng thiếu bước trung gian xem chi tiết (Detail View). Khi bấm vào hàng giao dịch, hàm `onClick` gọi ngay form nhập liệu [`TxForm.tsx`](../app/src/components/TxForm.tsx) với cờ `autoFocus={true}` ở ô nhập số tiền.
* **Giải pháp khắc phục:**
  * Bổ sung màn hình Chi tiết giao dịch độc lập ([`TxDetailModal.tsx`](../app/src/components/TxDetailModal.tsx)) theo chuẩn MoneyLover:
    * Hiển thị số tiền lớn, nhóm phân cấp, ngày tiếng Việt đầy đủ, ví thanh toán.
    * Cung cấp các tác vụ rõ ràng: `📄 Sao chép giao dịch`, `🗑️ Xóa giao dịch`, và chỉ khi bấm nút `Sửa` ở góc trên mới mở form chỉnh sửa.
    * Form sửa tắt thuộc tính `autoFocus` khi ở chế độ chỉnh sửa (`autoFocus={!tx}`).

---

### CASE STUDY 6: Rung Lắc, Xô Lệch & Lún Thanh Điều Hướng Trên iOS Safari
* **Mã sự cố:** `INC-06`
* **Mức độ:** Trung bình (Thẩm mỹ & độ ổn định trên iPhone).
* **Mô tả hiện tượng:**
  Trên trình duyệt Safari của iPhone, khi người dùng cuộn nhanh danh sách giao dịch, thanh menu dưới đáy (Floating Dock Nav) bị giật khung hình, chìm xuống dưới thanh địa chỉ URL của Safari và bị trượt sang hai bên khi ngón tay vuốt chéo.
* **Nguyên nhân gốc rễ (RCA):**
  1. Thanh điều hướng dùng `left: 12px; right: 12px; margin: 0 auto;`. Khi Safari co giãn thanh địa chỉ URL theo từng khung hình cuộn, trình duyệt liên tục tính toán lại margin trên CPU dẫn đến giật và lệch tâm.
  2. Phần tử `position: fixed` chưa được tách thành một layer phần cứng GPU riêng biệt.
* **Giải pháp khắc phục:**
  * Khóa tọa độ trung tâm tuyệt đối kết hợp GPU hardware compositing:
    ```css
    .nav {
      position: fixed;
      bottom: calc(12px + env(safe-area-inset-bottom, 0px));
      left: 50%;
      transform: translate3d(-50%, 0, 0);
      -webkit-transform: translate3d(-50%, 0, 0);
      width: calc(100% - 24px);
      max-width: 500px;
      will-change: transform;
      -webkit-backface-visibility: hidden;
      backface-visibility: hidden;
    }
    ```
  * Thêm `env(safe-area-inset-bottom)` với fallback `0px` để đảm bảo luôn cách thanh gạt Home Bar của iPhone một khoảng đệm an toàn.

---

## 🛡️ Hướng Dẫn Kỹ Sư Kế Tiếp Khi Triển Khai Tính Năng Mới
1. **Trước khi thêm CSS toàn cục:** Luôn kiểm tra hành vi cuộn trên cả 3 môi trường: iPhone Safari, Android Chrome và macOS Trackpad.
2. **Trước khi sửa đổi logic cơ sở dữ liệu:** Kiểm tra xem thay đổi có ảnh hưởng đến hàm `exportAll`, `importAll` và engine `syncNowSmart` không.
3. **Khi thêm trường dữ liệu mới:** Luôn tăng Dexie Schema version và cập nhật file [`doc/03-DATA-MODEL.md`](03-DATA-MODEL.md).
4. **Kiểm thử trước khi push:** Chạy đủ bộ test `cd app && npm test && npm run build` để đảm bảo không có cảnh báo TypeScript hay lỗi biên dịch.
