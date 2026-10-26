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
| **INC-07** | Data Safety / Startup | Giao dịch người dùng vừa nhập bị mất khi tải lại app sau bản cập nhật | Bật cờ `PURGE_KEY` tự động xóa IndexedDB trong `initApp()` trên `main.tsx` | Xóa bỏ hoàn toàn mã purge tự động trên startup; chỉ cho phép dọn dẹp khi người dùng chủ động bấm trong Cài đặt |
| **INC-08** | Performance / UI Glitch | Giao diện bị chớp nháy (flicker) sáng/tối khi mở trang và giật định kỳ | FOUC do theme set trễ trong `useEffect` và Polling 12s kích hoạt re-render toàn bộ `App.tsx` | Đưa script set theme đồng bộ vào `<head>` của `index.html`, áp dụng chế độ Silent Sync cho polling |
| **INC-09** | Mobile UX / In-App Keypad | Bàn phím hệ thống OS bung lên tách rời làm vỡ bố cục; thiếu dấu phân cách số tiền; dock menu choán màn hình khi xem | Dùng `<input>` trần gọi native virtual keyboard; thiếu in-app calculator keypad; fixed dock thiếu logic tự ẩn khi cuộn | Xây dựng Bàn phím số In-App liền khối chuẩn MoneyLover, thêm logic ẩn/hiện thông minh khi cuộn, nâng touch target 48px |
| **INC-10** | PWA / Cache | Deploy xong nhưng điện thoại (iOS & Android) vẫn hiện bản cũ (ví dụ ngày `yyyy-mm-dd`) | Service worker mới tải xong nhưng trang đang mở vẫn chạy bản cũ đến khi đóng hẳn app; không chủ động kiểm tra bản mới | `skipWaiting` + `clientsClaim` + `cleanupOutdatedCaches`, `index.html` NetworkFirst, `registerSW` kiểm tra bản mới khi mở/quay lại/30 phút và tự reload (hoãn nếu đang mở form) |
| **INC-11** | Mobile UX / Modal | Cuộn trong form thêm/sửa giao dịch làm nền phía sau cuộn theo; bàn phím số đẩy dài form | Không khoá cuộn body khi mở `.sheetbg`; bàn phím số nằm trong luồng nội dung | `scrollLock.ts` khoá body khi có sheet, `overscroll-behavior: contain`; bàn phím số dạng panel nổi, ẩn khi chạm ngoài/cuộn |
| **INC-12** | Form / Input | Ô "Ngày cố định" không xoá hết số 0, phải gõ `020` mới ra 20 | `input type=number` gắn state kiểu number: xoá rỗng → `0` hiện lại, gõ tiếp thành `020` | Ô text numeric, state chuỗi, bỏ số 0 đầu, tối đa 2 chữ số, chuẩn hoá 1–31 khi blur (TxForm & Budgets) |
| **INC-13** | UI / Định dạng | Nhãn tháng `Tháng 7, 2026` và ngày định kỳ `yyyy-mm-dd` không đồng nhất | `monthLabel` dùng mẫu cũ; Budgets in thẳng chuỗi lưu trữ | `monthLabel` → `MM/yyyy`; `fmtDmy()` cho mọi ngày hiển thị (dữ liệu lưu vẫn `YYYY-MM-DD`) |

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

### CASE STUDY 7: Mất Dữ Liệu Thực Tế Của Người Dùng Do Cờ Purge Tự Động Chạy Trên Startup
* **Mã sự cố:** `INC-07`
* **Mức độ:** Cực kỳ nghiêm trọng (Data Loss – Mất mát dữ liệu người dùng).
* **Mô tả hiện tượng:**
  Người dùng sau khi bắt đầu dùng app đã nhập các giao dịch thực tế đầu tiên. Tuy nhiên khi lập trình viên cập nhật bản vá lỗi mới, cờ dọn dẹp trong `main.tsx` (`PURGE_KEY`) tự động chạy và xóa sạch toàn bộ các giao dịch vừa nhập đưa cơ sở dữ liệu về 0 ₫.
* **Nguyên nhân gốc rễ (RCA):**
  1. Trong file [`main.tsx`](../app/src/main.tsx), logic dọn dẹp được gắn vào hàm `initApp()` với điều kiện kiểm tra `localStorage.getItem(PURGE_KEY) !== 'done'`.
  2. Mỗi khi kỹ sư tăng phiên bản cờ (`v3` lên `v5`), trình duyệt của người dùng phát hiện khóa mới chưa tồn tại nên đã gọi hàm `clearAllToCleanState()` một cách mù quáng (indiscriminately) trước khi khởi động giao diện.
  3. Hàm này chạy lệnh `db.txs.clear()`, cuốn phăng mọi giao dịch hợp lệ mà người dùng vừa ghi chép.
* **Giải pháp khắc phục:**
  * **Xóa bỏ vĩnh viễn** bất kỳ lệnh purge/clear dữ liệu tự động nào trong quy trình khởi động ứng dụng (`main.tsx`).
  * `initApp()` chỉ được phép chạy hàm an toàn `seedIfEmpty()`: hàm này chỉ khởi tạo 2 quỹ rỗng và danh mục mặc định KHI VÀ CHỈ KHI số lượng quỹ trong máy là `0` (`db.funds.count() === 0`), và tuyệt đối KHÔNG BAO GIỜ gọi `clear()` trên bảng giao dịch.
  * Tác vụ dọn dẹp xóa dữ liệu test chỉ được phép thực hiện khi người dùng **chủ động bấm nút** "Xoá sạch dữ liệu test (Về 0 ₫)" trong trang Cài đặt và phải có hộp thoại xác nhận `confirm()`.
* **Quy tắc cho kỹ sư:**
  > **Dữ liệu người dùng là bất khả xâm phạm.** Trong môi trường sản xuất (Production), tuyệt đối không bao giờ được phép đặt các hàm xóa bảng dữ liệu (`clear()`, `truncate()`, `drop()`) bên trong luồng khởi chạy tự động của ứng dụng (startup lifecycle). Mọi nâng cấp schema phải là Migration (bảo toàn dữ liệu cũ), không bao giờ được dùng Reset.

---

### CASE STUDY 8: Nháy / Flicker Giao Diện Sáng Tối & Giật Lag Định Kỳ (FOUC & Sync Jitter)
* **Mã sự cố:** `INC-08`
* **Mức độ:** Trung bình (Ảnh hưởng thị giác & trải nghiệm cao cấp).
* **Mô tả hiện tượng:**
  1. Mỗi khi mở web app hoặc tải lại trang, giao diện bị chớp nháy màu trắng sáng rất nhanh (~0.1s) rồi mới chuyển sang nền tối (Dark mode), logo MoneySave ở góc trên bị giật đổi giữa phiên bản sáng và tối.
  2. Định kỳ mỗi 12–15 giây, nút tài khoản ở chân Sidebar và thanh header mobile bị giật đổi chữ ("🔄 Đang đồng bộ..." rồi về lại tên email), các biểu đồ Recharts trong Tổng quan tự động chạy lại hiệu ứng bung cột/vùng.
* **Nguyên nhân gốc rễ (RCA):**
  1. *Theme Flash (FOUC):* File `index.html` ban đầu không có thuộc tính `data-theme` trên thẻ `<html>`. Việc đọc theme từ `localStorage` và gán thuộc tính `data-theme="dark"` lại được đặt trong `useEffect` của `App.tsx` (chạy bất đồng bộ sau khi React đã render khung HTML đầu tiên). Do đó trình duyệt đã vẽ giao diện mặc định (màu sáng) trước rồi mới đổi sang tối sau 100ms.
  2. *Polling Jitter:* Hàm `setInterval(..., 12_000)` trong `cloudSync.ts` gọi `syncNowSmart()`. Mỗi lần gọi, hàm này đặt `syncState.status = 'syncing'` và phát tín hiệu cho toàn bộ `App.tsx` re-render lại, làm nháy badge đồng bộ và khiến các biểu đồ Recharts chạy lại hiệu ứng `isAnimationActive`.
* **Giải pháp khắc phục:**
  1. **Triệt tiêu Flash 0.1s:** Nhúng script đồng bộ thuần cực ngắn ngay trong thẻ `<head>` của [`index.html`](../app/index.html) để đọc `localStorage` và gán `data-theme` ngay trước khi trình duyệt vẽ frame đầu tiên:
     ```html
     <script>
       (function() {
         try {
           var t = localStorage.getItem('moneygo_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
           document.documentElement.setAttribute('data-theme', t);
         } catch(e) {}
       })();
     </script>
     ```
  2. **Silent Sync cho Polling định kỳ:** Bổ sung cờ `silent = true` cho `syncNowSmart(silent)` và tăng khoảng cách kiểm tra lên 30s: Khi polling định kỳ hoặc chuyển tab, hệ thống kiểm tra âm thầm trong nền. Nếu Cloud không có dữ liệu mới từ thiết bị khác, nó giữ nguyên trạng thái và KHÔNG kích hoạt re-render toàn app.
  3. **Tắt Animation thừa:** Thêm `isAnimationActive={false}` cho các thẻ `Area` và `Bar` của Recharts trong [`Overview.tsx`](../app/src/pages/Overview.tsx).
  4. **Cố định tĩnh nhãn tài khoản (Static Account Pill):** Giữ nguyên văn bản hiển thị `👤 email` trong [`App.tsx`](../app/src/App.tsx), loại bỏ việc hoán đổi text thành `"🔄 Đang đồng bộ..."` và xóa bỏ animation đổi màu chớp nháy xanh dương của `.sync-dot.syncing` trong [`index.css`](../app/src/index.css). Nút tài khoản ở góc dưới bên trái luôn hiển thị tĩnh vững chãi, chấm xanh ổn định 100%.
* **Quy tắc cho kỹ sư:**
  > Trong các ứng dụng hỗ trợ Dark/Light theme, script thiết lập class theme phải luôn nằm đồng bộ trong `<head>` của HTML, không được phụ thuộc vào React lifecycle. Mọi tác vụ polling chạy ngầm định kỳ phải là Silent Checks để tránh gây giật khung hình cho người dùng.

---

### CASE STUDY 9: Trải Nghiệm Nhập Liệu Tách Rời Của Bàn Phím OS & Lãng Phí Không Gian Hiển Thị Dọc Trên Mobile Web
* **Mã sự cố:** `INC-09`
* **Mức độ:** Trung bình – Cao (Trực tiếp ảnh hưởng đến cảm giác "ra chất app" và UX thao tác hàng ngày).
* **Mô tả hiện tượng:**
  1. Khi người dùng bấm vào sửa một giao dịch đã có, ứng dụng tự động nhảy con trỏ nhấp nháy vào ô số tiền và kích hoạt bàn phím ảo của hệ điều hành (iOS Safari / Android Gboard). Bàn phím hệ thống là một khối tách rời màu xám/trắng che khuất hơn 50% màn hình, gây co giật viewport và phá vỡ tính liền lạc của app.
  2. Ô nhập tiền trước đây chỉ là chuỗi số trần (raw digits như `90000`), không có dấu phân cách hàng nghìn (`,`) và thiếu dấu chấm thập phân (`.`) để hỗ trợ nhập các khoản tiền ngoại tệ/thập phân.
  3. Thanh dock menu ở đáy màn hình và nút nổi `+ Thêm giao dịch` luôn chiếm cố định khoảng 130px diện tích dọc, ngay cả khi người dùng đang cuộn trang xuống để đọc danh sách giao dịch hay xem biểu đồ.
  4. Thao tác chạm vào các tab trên thanh dock đôi khi có độ trễ hoặc không nảy phản hồi ngay lập tức.
* **Nguyên nhân gốc rễ (RCA):**
  1. Form giao dịch sử dụng thẻ HTML `<input inputMode="numeric">` trần kèm cờ `autoFocus`, kích hoạt trình duyệt mobile mở bàn phím gốc của máy.
  2. Chưa có Bàn phím số / Máy tính chuyên dụng in-app (In-App Numeric Keypad) tích hợp liền khối với theme của ứng dụng.
  3. Thiếu logic lắng nghe hướng cuộn trang (Scroll Direction Delta) để ẩn/hiện thanh điều hướng.
  4. Touch target của các icon trên thanh dock có chiều cao thực tế dưới 40px và thiếu hiệu ứng scale `:active` tức thì khi ngón cái vừa chạm vào.
* **Giải pháp khắc phục:**
  1. **Khối Hiển Thị Số Tiền & Bàn Phím Số In-App Chuẩn MoneyLover ([`Keypad.tsx`](../app/src/components/Keypad.tsx), [`TxForm.tsx`](../app/src/components/TxForm.tsx)):**
     * Thay thế `<input>` trần bằng thẻ hiển thị số tiền có định dạng tự động (`formatKeypadDisplay`).
     * Khi mở sửa giao dịch, bàn phím mặc định được ẩn đi và không kích hoạt con trỏ nhấp nháy. Người dùng xem toàn bộ thông tin chi tiết một cách trọn vẹn, chỉ khi chạm vào ô số tiền thì bàn phím in-app mới trượt lên.
     * Tích hợp bàn phím máy tính 4x5 liền khối: hỗ trợ số `0-9`, `000`, dấu thập phân `.`, phép tính `+ − × ÷`, phím `C`, phím xoá `⌫`, phím `XONG` 2 hàng màu xanh và các chip gợi ý số tiền tròn (`50,000`, `100,000`, `200,000`, `500,000`).
     * Không kích hoạt bàn phím hệ thống của OS; trên máy tính Desktop hỗ trợ bấm trực tiếp các phím số vật lý trên bàn phím máy tính.
  2. **Thanh Dock & Nút FAB Tự Ẩn Thông Minh Khi Cuộn ([`App.tsx`](../app/src/App.tsx), [`index.css`](../app/src/index.css)):**
     * Sử dụng listener cuộn trang thụ động (`passive: true`) kèm `requestAnimationFrame`:
       * Khi cuộn xuống (`delta > 8`): Thanh dock `.nav` và nút `.ml-fab-pill` trượt xuống ẩn đi mượt mà với GPU transform `translate3d(..., 100%, 0)` và `opacity: 0; pointer-events: none;`.
       * Khi cuộn lên (`delta < 0`) hoặc ở đỉnh trang (`scrollY <= 25`): Hiện lại ngay tức thì.
       * Khi chuyển đổi tab / trang: Luôn hiển thị lại thanh dock.
       * Trên Desktop (`min-width: 900px`): Thanh sidebar bên trái luôn hiển thị cố định, không bị ảnh hưởng.
  3. **Tối Ưu 5 Tiêu Chuẩn "Ra Chất App" Native Mobile Web:**
     * Nâng chiều cao Touch Target của các tab điều hướng lên chuẩn tối thiểu 48px.
     * Bổ sung hiệu ứng phản hồi chạm haptic scale `:active { transform: scale(0.92); }` tức thì với độ trễ 0ms nhờ `touch-action: manipulation;`.
     * Cập nhật thẻ viewport meta `maximum-scale=1, user-scalable=no, viewport-fit=cover` và đặt màu nền `html { background: var(--bg); }` để loại bỏ hiện tượng phóng to méo mó và lộ nền trắng khi cuộn nảy overscroll trên iOS.
* **Quy tắc cho kỹ sư:**
  > Trong các ứng dụng quản lý tài chính di động mô phỏng native app, việc nhập số tiền không nên sử dụng bàn phím ảo của hệ điều hành mà phải dùng Bàn phím số tích hợp in-app. Thanh bottom navigation bar phải biết tự ẩn khi người dùng cuộn xuống để dành trọn vẹn không gian hiển thị cho dữ liệu, đồng thời mọi nút bấm phải có touch target tối thiểu 48px và phản hồi `:active` thị giác tức thì.

---

### CASE STUDY 10: Bản Deploy Mới Không Tới Được Điện Thoại (PWA Cache Cũ)
* **Mã sự cố:** `INC-10`
* **Mô tả:** Sau khi push/deploy, app trên màn hình chính iOS/Android vẫn hiển thị bản cũ.
* **RCA:** Service worker `autoUpdate` chỉ thay bản khi toàn bộ tab/app đóng; không có chủ động kiểm tra cập nhật.
* **Giải pháp:** Xem `vite.config.ts` và `main.tsx` (registerSW + kiểm tra định kỳ + reload an toàn khi không mở form).
* **Quy tắc cho kỹ sư:**
  > Mọi thay đổi phải push lên `main` (Vercel tự deploy tại https://moneysavedl.vercel.app) và kiểm tra bản live. Không bao giờ reload tự động khi người dùng đang mở form nhập liệu. Cache của SW chỉ chứa file giao diện, không chứa dữ liệu IndexedDB.

---

## 🛡️ Hướng Dẫn Kỹ Sư Kế Tiếp Khi Triển Khai Tính Năng Mới
1. **Dữ liệu người dùng là số 1:** Không bao giờ đặt lệnh xóa cơ sở dữ liệu tự động trong `main.tsx` hoặc các hook khởi động.
2. **Trước khi thêm CSS toàn cục:** Luôn kiểm tra hành vi cuộn trên cả 3 môi trường: iPhone Safari, Android Chrome và macOS Trackpad.
3. **Trước khi sửa đổi logic cơ sở dữ liệu:** Kiểm tra xem thay đổi có ảnh hưởng đến hàm `exportAll`, `importAll` và engine `syncNowSmart` không.
4. **Khi thêm trường dữ liệu mới:** Luôn tăng Dexie Schema version và cập nhật file [`doc/03-DATA-MODEL.md`](03-DATA-MODEL.md).
5. **Kiểm thử trước khi push:** Chạy đủ bộ test `cd app && npm test && npm run build` để đảm bảo không có cảnh báo TypeScript hay lỗi biên dịch.
