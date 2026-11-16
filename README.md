<div align="center">
  <img src="app/public/logo-moneysave-nav.png" alt="MoneySave Logo" width="220" />
  <h1>MoneySave</h1>
  <p><b>Ứng dụng Quản lý Tài chính Cá nhân, Phân tích Hành vi & Hoạch định Mục tiêu Hiện đại</b></p>
  <p><i>Local-first · Offline-first PWA · Dữ liệu nằm trên máy bạn · Sao lưu vào Google Drive của chính bạn · Đồng bộ đa thiết bị có mã hoá</i></p>

  <p>
    <a href="https://moneysavedl.vercel.app"><img src="https://img.shields.io/badge/d%C3%B9ng_mi%E1%BB%85n_ph%C3%AD-moneysavedl.vercel.app-10b981?style=flat&logo=vercel" alt="Dùng miễn phí" /></a>
    <a href="CHANGELOG.md"><img src="https://img.shields.io/badge/version-v2.17.0-3b82f6" alt="Version v2.17.0" /></a>
    <a href="https://github.com/duylequoc1710/MoneySave-Project/actions/workflows/ci.yml"><img src="https://github.com/duylequoc1710/MoneySave-Project/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
    <a href="doc/05-TEST-PLAN.md"><img src="https://img.shields.io/badge/tests-80%2F80%20passing-brightgreen" alt="Tests" /></a>
    <a href="https://vite.dev"><img src="https://img.shields.io/badge/vite-v8.3-646CFF" alt="Vite" /></a>
    <a href="https://react.dev"><img src="https://img.shields.io/badge/react-v19-61DAFB" alt="React" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License" /></a>
  </p>
</div>

---

> [!IMPORTANT]
> ### 💡 Vì sao MoneySave ra đời
>
> Tác giả từng dùng nhiều app quản lý tài chính cá nhân, nhưng **đồng bộ nhiều thiết bị rối rắm** và luôn có nỗi lo **chủ ứng dụng nắm được toàn bộ database tài chính của mình**. MoneySave được làm ra trước hết để **tự dùng**, theo 3 nguyên tắc:
>
> 1. **Dữ liệu của bạn nằm trên máy của bạn.** Mọi thứ lưu trong bộ nhớ trình duyệt của điện thoại/máy tính (IndexedDB), dùng được cả khi không có mạng.
> 2. **Sao lưu riêng tư, do bạn nắm giữ.** File sao lưu nằm trong Tệp/iCloud hoặc **Google Drive của chính bạn** — tác giả không xem được, không có máy chủ trung gian.
> 3. **Không phát sinh chi phí vận hành** khi nhiều người dùng miễn phí: không có backend riêng; mỗi người tự chịu dung lượng của mình (bộ nhớ máy, Drive cá nhân).
>
> ### 🤝 Chia sẻ cho cộng đồng
> * **Dùng ngay, miễn phí:** người thân, bạn bè, cộng đồng có thể dùng trực tiếp tại **[moneysavedl.vercel.app](https://moneysavedl.vercel.app)** — "Thêm vào màn hình chính" để dùng như app.
> * **Mã nguồn mở (MIT):** ai có kiến thức kỹ thuật có thể Fork/Clone, tự sửa theo ý mình và tự triển khai lên host riêng (xem [Tự cài đặt](#-hướng-dẫn-tự-cài-đặt-tùy-biến-xào-nấu--đưa-lên-host-riêng)).
> * **Tương lai:** bản web tiếp tục miễn phí; khi phát triển **bản app thuần (iOS/Android) hoàn thiện** mới tính tới việc thu phí. Hiện chưa triển khai.

---

## 📖 Giới Thiệu Dự Án

**MoneySave** là bộ khung ứng dụng Web Progressive (PWA) quản lý tài chính cá nhân hiện đại được thiết kế theo triết lý **Local-first (Ưu tiên cục bộ)** kết hợp **Behavioral FinTech (Phân tích hành vi tài chính)**.

Không chỉ dừng lại ở việc ghi chép thu chi thông thường, **MoneySave** đóng vai trò như một cố vấn tài chính cá nhân: tự động dự báo dòng tiền cuối tháng, phát hiện các khoản chi rò rỉ vi mô, tối ưu hóa chu kỳ sao kê & trả góp thẻ tín dụng, đồng thời giúp bạn phân bổ dòng tiền vào các kế hoạch tiết kiệm theo lộ trình giai đoạn rõ ràng.

👉 **Dùng ngay:** [https://moneysavedl.vercel.app](https://moneysavedl.vercel.app) *(hoặc tự Clone & Deploy lên host riêng nếu muốn tuỳ biến)*

---

## 📱 Hướng Dẫn Sử Dụng Nhanh

1. **Cài như app:** mở [moneysavedl.vercel.app](https://moneysavedl.vercel.app)
   * **iPhone (Safari):** nút Chia sẻ → **Thêm vào MH chính**.
   * **Android (Chrome):** menu ⋮ → **Cài đặt ứng dụng / Thêm vào màn hình chính**.
   * **Máy tính (Chrome/Edge):** biểu tượng cài đặt trên thanh địa chỉ.
2. **Bắt đầu ngay, không cần tài khoản:** chọn "Tiếp tục dùng thử ngoại tuyến" → dữ liệu chỉ nằm trên máy này.
3. **Ghi chép:** nút **＋ Thêm giao dịch** (thu / chi / chuyển ví); quản lý Ví, Nhóm, Ngân sách, Định kỳ, Quỹ tiết kiệm, Thẻ tín dụng.
4. **Tìm kiếm:** 🔍 ở Tổng quan — gõ có dấu hay không dấu, nhiều từ, số tiền ("50.000") đều được.
5. **Sao lưu (Cài đặt › Sao lưu & khôi phục)** — nên làm thường xuyên:
   * **☁️ Sao lưu lên Google Drive** *(khuyên dùng)*: lần đầu cho phép Google 1 lần; file vào thư mục **"MoneySave Backup"** trên Drive của bạn, **mỗi ngày 1 file** (`MoneySave-YYYY-MM-DD.json`, sao lưu lại trong ngày sẽ ghi đè), **giữ 30 bản gần nhất**. Quá 24 giờ chưa sao lưu, Tổng quan hiện nút nhắc 1 chạm.
   * **💾 Sao lưu ra file:** 1 file duy nhất `MoneySave-SaoLuu.json`. Điện thoại: bảng chia sẻ → "Lưu vào Tệp"/Drive (chọn "Thay thế" để ghi đè bản cũ). Máy tính Chrome/Edge: các lần sau tự ghi đè đúng file đã chọn.
6. **Khôi phục:** chọn bản trên Drive hoặc file → app **hiện xem trước** (ngày sao lưu, số giao dịch, số ví…) → xác nhận mới ghi đè. Dữ liệu hiện tại luôn được **tự lưu thành bản sao an toàn** trước khi ghi đè.
7. **Bản sao an toàn tự động:** lưới an toàn trên máy (mỗi ngày + trước khi khôi phục/đồng bộ ghi đè), tự xoay vòng tối đa 15 bản — không cần dọn tay.
8. **Đồng bộ nhiều thiết bị (tuỳ chọn):** Cài đặt › Tài khoản & đồng bộ → đăng nhập Email/Mật khẩu trên các máy → tự đồng bộ (kiểm tra mỗi 30 giây và khi mở app); bấm 🔄 để đồng bộ ngay.

---

## 🔐 Quyền Riêng Tư & Dữ Liệu Của Bạn

| Dữ liệu | Nằm ở đâu | Ai đọc được |
| :--- | :--- | :--- |
| Ví, giao dịch, ngân sách… | Bộ nhớ trình duyệt trên máy bạn (IndexedDB) | Chỉ bạn, trên máy đó |
| Sao lưu Google Drive | Thư mục "MoneySave Backup" trong **Drive của bạn**; app chỉ có quyền `drive.file` (chỉ thấy file do chính nó tạo) | Chỉ bạn. Thu hồi quyền: nút "Ngắt kết nối" hoặc [myaccount.google.com/permissions](https://myaccount.google.com/permissions) |
| Sao lưu file | Nơi bạn chọn (Tệp, iCloud, Drive, máy tính) | Chỉ bạn (file JSON **không đặt mật khẩu** — hãy cất ở nơi riêng tư) |
| Đồng bộ đa thiết bị | Firebase Realtime Database, két `moneysave_users/{uid}`; **mã hoá AES-GCM trên máy** trước khi gửi; rule chỉ cho chính tài khoản đọc/ghi | Chỉ tài khoản của bạn qua app. ⚠️ Khoá mã hoá hiện suy ra từ tài khoản nên **chưa phải zero-knowledge tuyệt đối** với chủ Firebase — đang có kế hoạch chuyển đồng bộ sang Drive của từng người ([09 §7](doc/09-REVIEW-AND-PLAN-2026-11.md)) |

* Không quảng cáo, không bán/chia sẻ dữ liệu, không có máy chủ thu thập dữ liệu tài chính.
* Chính sách đầy đủ: **[moneysavedl.vercel.app/privacy.html](https://moneysavedl.vercel.app/privacy.html)** (cũng có ở cuối trang Cài đặt).

---

## 🌟 Các Trụ Cột Tính Năng Nổi Bật

### 1. 🧠 Smart Insights – Nhận định từ số liệu thật (v2.17.0)
* **Dự báo cuối tháng:** tách *khoản lớn* (tiền nhà, học phí… từ 1 triệu hoặc 10% mức chi tháng) khỏi *chi hằng ngày*; dự báo = đã chi + nhịp chi hằng ngày × số ngày còn lại + khoản lớn thường có nhưng tháng này chưa trả. Thanh tiến độ so *đã chi* với *cùng kỳ thường lệ* (đến cùng ngày này của 3 tháng trước).
* **Nhóm chi tăng so với cùng kỳ:** so chi hằng ngày từng nhóm từ đầu tháng đến hôm nay với cùng kỳ các tháng trước (từ ngày 05, tăng ≥ 40% và ≥ 200.000 ₫) – tiền nhà trả sớm không bị báo sai.
* **Thu – chi tháng này:** hiện còn bao nhiêu, dự kiến cuối tháng dư/thiếu bao nhiêu (chỉ khi có ghi thu nhập); 1 chạm chuyển phần dư vào Ví Tiết Kiệm.
* **Nhịp chi trong tuần:** biểu đồ Thứ 2 – Chủ Nhật của chi hằng ngày (không tính khoản lớn).
* Không giả định lương, giờ làm hay lãi suất – mọi con số đều tính từ giao dịch của bạn.

### 2. 💳 Quản Trị Quỹ Tín Dụng & Chuyển Đổi Trả Góp (`3 / 6 / 12 / 24` Tháng)
* **Tách bạch Kỳ sao kê đã chốt & Kỳ đang mở:** Phân biệt rõ dư nợ của kỳ sao kê cũ cần tất toán ở hạn gần nhất và khoản chi phát sinh trong kỳ sao kê mới (thanh toán ở tháng kế tiếp), không gây báo động giả.
* **Chuyển đổi Trả góp linh hoạt (`3`, `6`, `12`, `24` tháng):** Chọn giao dịch chi tiêu thẻ tín dụng để chuyển sang trả góp; ghi nhận đầy đủ ngày bắt đầu chuyển đổi, kỳ sao kê bắt đầu thanh toán, phí chuyển đổi, số tiền đóng mỗi kỳ, tiến độ kỳ đã trả / còn lại và lịch biểu chi tiết.
* **Tối ưu ngày miễn lãi:** Tự động tính số ngày miễn lãi thực tế khi quẹt thẻ hôm nay và lọc xem lại lịch sử giao dịch theo từng kỳ sao kê.

### 3. 🐷 Quỹ Tiết Kiệm & Lộ Trình Kế Hoạch `0% → 50% → 100%`
* **Cơ chế dòng tiền 2 tầng chuẩn kế toán:**
  1. Trích chuyển tiền từ các ví chi tiêu khác vào **Quỹ Ví Tiết Kiệm** (bảo toàn 100% tổng số dư thực tế).
  2. Phân bổ từ số dư Quỹ Tiết Kiệm vào các mục tiêu cụ thể (*Du lịch, Mua sắm, Khóa học, Quỹ dự phòng...* có thể thêm, sửa, xoá tùy chỉnh).
* **Lộ trình 3 giai đoạn trực quan (`0%` – `50%` – `100%`):** Ghi nhận rõ **Tháng mục tiêu (`MM/yyyy`)**, hạn đích đến (`dd/MM/yyyy`), định mức cần để dành mỗi tháng (`₫/tháng`) và theo dõi tiến độ qua 3 cột mốc: *Khởi động (0%)* $\rightarrow$ *Nửa chặng đường (50%)* $\rightarrow$ *Hoàn thành mục tiêu (100%)*.

### 4. 📊 Báo Cáo Chuyên Sâu, Ngân Sách Chọn Lọc & Vuốt Ngang Mượt Mà
* **Cử chỉ vuốt ngang chuyển tháng (`Touch Swipe`):** Vuốt ngang mượt mà kèm hiệu ứng đàn hồi theo ngón tay trên cả trang **Sổ giao dịch** lẫn toàn bộ các màn hình **Báo cáo chi tiết** (*Báo cáo giai đoạn, Thu nhập ròng theo tuần, Chi tiết khoản chi, Chi tiết khoản thu*).
* **Ngân sách tháng thông minh:** Đặt hạn mức cho từng nhóm chi tiêu với tùy chọn **🔁 Lặp lại cho tháng tiếp theo**; giao diện chỉ hiển thị gọn gàng các nhóm đang được đặt ngân sách.
* **Hệ thống Nhóm Cha & Nhóm Con (`Category Hierarchy`):** Phân cấp nhóm cha đại diện (ví dụ `🏡 Thiết Yếu 50% › 🍜 Ăn uống`) đồng bộ trên toàn bộ sổ giao dịch và báo cáo.

### 5. 🔒 Riêng Tư & An Toàn Dữ Liệu Nhiều Lớp
* **100% Local-first (IndexedDB Dexie v4):** Ứng dụng chạy hoàn toàn không cần mạng, tốc độ phản hồi tức thì (`< 1 ms`).
* **Đồng bộ đám mây có mã hoá (`AES-GCM 256-bit`):** dữ liệu được mã hoá ngay trên thiết bị (khoá `PBKDF2-SHA256`, 100.000 vòng) trước khi lên Firebase; két theo tài khoản, chỉ chủ tài khoản đọc/ghi.
* **Sao lưu Google Drive của chính bạn** (`drive.file`) + **sao lưu 1 file** qua bảng chia sẻ iOS/Android, khôi phục luôn có xem trước.
* **Bản sao an toàn tự động (`Safety Snapshots`):** Cơ sở dữ liệu phụ độc lập `moneysave_safety` tự động lưu tối đa 15 bản chụp trước mọi thao tác Khôi phục / Đồng bộ ghi đè và định kỳ hằng ngày (gộp 1 bản/ngày).

---

## 🛠️ Kiến Trúc & Công Nghệ Sử Dụng

| Thành phần | Công nghệ |
| :--- | :--- |
| **Frontend Framework** | React 19, TypeScript (`~6.0`), Vite 8, `react-router-dom` v7 |
| **CSDL Cục bộ** | Dexie.js v4 (IndexedDB: `funds`, `categories`, `txs`, `budgets`, `recurrings`, `savingsGoals` + `moneysave_safety`) |
| **Biểu đồ & Trực quan hóa** | Recharts v3 (Lazy-loaded chunk), Custom Sparkbars & Milestone Steppers |
| **Đám mây & Xác thực** | Firebase Authentication (Email/Password), Realtime Database REST API (`?auth=idToken`) |
| **Sao lưu Drive** | Google Identity Services (token model, không client secret) + Google Drive API v3, quyền `drive.file` |
| **Bảo mật & Mã hóa** | Web Crypto API (`crypto.subtle` – `AES-GCM 256-bit`, `PBKDF2-SHA256`, `SHA-256`) |
| **Chất lượng Mã nguồn** | Node.js Test Runner (`73/73 unit tests`), Oxlint, TypeScript Strict Mode |

---

## 🚀 Hướng Dẫn Tự Cài Đặt, Tùy Biến ("Xào Nấu") & Đưa Lên Host Riêng

Dự án được đóng gói gọn nhẹ để bất kỳ ai cũng có thể tự dựng một bản **MoneySave** độc lập trên tên miền / host của riêng mình chỉ trong vài phút:

### 1. Chạy & Tùy biến trên máy cá nhân (Local Development)
* Yêu cầu: **Node.js** `20+` trở lên.
```bash
# 1. Fork hoặc Clone kho lưu trữ về máy của bạn
git clone https://github.com/duylequoc1710/MoneySave-Project.git
cd MoneySave-Project/app

# 2. Cài đặt các gói phụ thuộc
npm install

# 3. Tạo file cấu hình môi trường riêng (từ file mẫu .env.example)
cp .env.example .env.local
# -> Điền thông số Firebase riêng (nếu muốn đồng bộ) và VITE_GOOGLE_CLIENT_ID riêng (nếu muốn sao lưu Drive)
#    Hướng dẫn tạo Client ID: doc/10-S4-GOOGLE-DRIVE-SETUP.md

# 4. Khởi chạy máy chủ phát triển để tự do chỉnh sửa / "xào nấu" tính năng
npm run dev

# 5. Chạy bộ kiểm thử tự động (72 kịch bản Unit Test) & Đóng gói bản Production
npm test
npm run lint
npm run build
```

### 2. Tự Triển Khai Lên Website / Host Riêng (Vercel, Netlify, Cloudflare, Firebase...)
Sau khi đã tùy biến mã nguồn theo ý thích, bạn có thể đẩy lên repo GitHub cá nhân của bạn và kết nối miễn phí với:
* **Vercel / Netlify / Cloudflare Pages:** Chọn thư mục gốc là `app`, lệnh build `npm run build`, thư mục đầu ra `dist` và khai báo các biến môi trường `VITE_FIREBASE_*`, `VITE_GOOGLE_CLIENT_ID` của bạn.
* **Google Drive:** Client ID chỉ hoạt động với đúng tên miền đã đăng ký (Authorized JavaScript origins) → bản tự host phải tạo Client ID riêng.
* **Firebase Hosting / GitHub Pages:** Xem hướng dẫn từng bước tại [`doc/06-DEPLOYMENT-GUIDE.md`](doc/06-DEPLOYMENT-GUIDE.md).

---

## 🕒 Tóm Tắt Lịch Sử Cập Nhật Phiên Bản

Chi tiết đầy đủ từng bản phát hành được ghi nhận tại **[CHANGELOG.md](CHANGELOG.md)**:

* **`v2.17.0` (2026-11-16):** Nhập nhanh (tự chọn sẵn nhóm & ví hay dùng, hàng nút 1 chạm); Smart Insights làm lại theo số liệu thật (tách khoản lớn, so cùng kỳ, thu – chi tháng).
* **`v2.16.1` (2026-11-16):** CI tự động: GitHub tự chạy test, build, lint mỗi lần đẩy code.
* **`v2.16.0` (2026-11-16):** Chữ to & dễ đọc hơn (16px, số tiền thẳng cột), màu giao diện Sáng đủ tương phản, nút chữ dễ bấm (44px), icon thống nhất trong cửa sổ.
* **`v2.15.1` (2026-11-16):** Sẵn sàng khoá két Firebase cũ: tài khoản mới không báo lỗi đồng bộ khi két cũ đã khoá.
* **`v2.15.0` (2026-11-16):** Hiệu ứng mở cửa sổ & nhấn nút mượt hơn, tự tắt khi máy bật "Giảm chuyển động".
* **`v2.14.0` (2026-11-16):** Tổng quan đưa Giao dịch gần đây lên trên; màn hình trống có hướng dẫn và nút làm ngay.
* **`v2.13.0` (2026-11-16):** Giao diện dễ bấm hơn (vùng chạm ≥ 44px, chữ ≥ 12px, nút nổi không che nội dung) và bộ icon SVG thống nhất thay emoji ở khung giao diện.
* **`v2.12.0` (2026-11-16):** Dọn gọn Cài đặt: gộp khối đồng bộ, Drive lên đầu, bỏ CSV và mục dữ liệu kiểm thử, bản sao an toàn thu gọn.
* **`v2.11.0` (2026-11-16):** Sao lưu/khôi phục thẳng lên Google Drive của chính người dùng (quyền `drive.file`, mỗi ngày 1 bản, giữ 30 bản).
* **`v2.10.1` (2026-11-16):** Tìm kiếm không dấu, nhiều từ, số tiền có dấu chấm; logic tìm kiếm tách module có unit test.
* **`v2.10.0` (2026-11-16):** Két đồng bộ bảo mật theo tài khoản (chỉ chủ tài khoản đọc/ghi), tự chuyển két cũ không mất dữ liệu, kiểm tra Cloud nhẹ hơn, sửa nguy cơ đẩy dữ liệu cũ đè Cloud.
* **`v2.9.0` (2026-11-16):** Sao lưu 1 file duy nhất (ghi đè bản cũ) qua bảng chia sẻ iOS/Android hoặc ghi đè trực tiếp trên máy tính, xem trước khi khôi phục, gộp bản sao an toàn theo ngày.
* **`v2.8.0` (2026-11-01):** Đồng bộ bàn phím số & bộ chọn in-app (bỏ 100% bàn phím/`<select>` hệ thống), báo cáo Phân bổ/Rút Quỹ Tiết Kiệm, chống kéo thả vô tình, nút Reload nhanh & Tìm kiếm toàn diện.
* **`v2.7.2` (2026-11-01):** Ra mắt **🐷 Quỹ Tiết Kiệm & Kế hoạch mục tiêu**, phân bổ dòng tiền 2 tầng, lộ trình 3 giai đoạn `0% → 50% → 100%` kèm Tháng mục tiêu và tối ưu luồng tạo kế hoạch.
* **`v2.6.2` (2026-11-01):** Bổ sung cử chỉ **vuốt ngang chuyển tháng** cho Sổ giao dịch & Báo cáo chi tiết; thiết kế mới **Ngân sách tháng** có tùy chọn lặp lại tháng sau; sửa triệt để lỗi thanh tiến độ trên Android & đè chữ trên Mobile.
* **`v2.5.1` (2026-11-01):** Nâng cấp toàn diện **💳 Quỹ Tín Dụng**, hỗ trợ **chuyển đổi Trả góp `3/6/12/24` tháng**, tách bạch kỳ sao kê đã chốt vs kỳ đang mở và tinh gọn thanh Dock 4 mục.
* **`v2.4.0` (2026-11-01):** Ra mắt **🧠 Smart Insights** (Phân tích hành vi tài chính 4 trụ cột) và hệ thống hộp thoại In-App **`AppDialog`** đồng bộ toàn ứng dụng.
* **`v1.0.0 – v2.3.0` (2026-10):** Xây dựng nền tảng PWA Offline-first, đồng bộ Cloud E2EE `AES-256`, Nhóm Cha & Nhóm Con, Bàn phím máy tính In-App và Bản sao an toàn tự động.

---

## 📚 Hệ Thống Tài Liệu Kỹ Thuật (`doc/`)

Toàn bộ tài liệu thiết kế, kiến trúc và nhật ký kỹ thuật của dự án được chuẩn hóa trong thư mục [`doc/`](doc/):

* 📋 [`doc/00-INDEX.md`](doc/00-INDEX.md): Mục lục tài liệu & quy ước kỹ thuật.
* 🎯 [`doc/01-SRS.md`](doc/01-SRS.md): Đặc tả yêu cầu phần mềm (`FR-01` đến `FR-48`).
* 🏗️ [`doc/02-ARCHITECTURE.md`](doc/02-ARCHITECTURE.md): Kiến trúc hệ thống, luồng đồng bộ & bảo mật E2EE.
* 🗄️ [`doc/03-DATA-MODEL.md`](doc/03-DATA-MODEL.md): Mô hình dữ liệu IndexedDB (Dexie schema v4).
* 📖 [`doc/04-USER-GUIDE.md`](doc/04-USER-GUIDE.md): Cẩm nang hướng dẫn sử dụng trên iPhone, Android và máy tính.
* 🧪 [`doc/05-TEST-PLAN.md`](doc/05-TEST-PLAN.md): Kế hoạch và kết quả kiểm thử tự động (`73/73 tests pass`).
* 🗺️ [`doc/06-ROADMAP.md`](doc/06-ROADMAP.md) & [`doc/06-DEPLOYMENT-GUIDE.md`](doc/06-DEPLOYMENT-GUIDE.md): Lộ trình phát triển & hướng dẫn triển khai.
* 🤝 [`doc/08-HANDOVER.md`](doc/08-HANDOVER.md): Bàn giao cho kỹ sư/AI tiếp nhận (đọc đầu tiên khi phát triển tiếp).
* 🔎 [`doc/09-REVIEW-AND-PLAN-2026-11.md`](doc/09-REVIEW-AND-PLAN-2026-11.md): Review bảo mật/hiệu năng, kế hoạch lát S1…S5, định hướng sản phẩm (§7).
* ☁️ [`doc/10-S4-GOOGLE-DRIVE-SETUP.md`](doc/10-S4-GOOGLE-DRIVE-SETUP.md): Tạo OAuth Client ID cho sao lưu Google Drive.
* 🛠️ [`doc/07-INCIDENT-LOGS-AND-CASE-STUDIES.md`](doc/07-INCIDENT-LOGS-AND-CASE-STUDIES.md): Sổ tay phân tích sự cố kỹ thuật (RCA) & các giải pháp thực chiến.

---

## 🧭 Định Hướng Tiếp Theo
* **S4b:** chuyển đồng bộ nhiều thiết bị sang Google Drive của từng người (bỏ phụ thuộc Firebase của tác giả → riêng tư tuyệt đối, chi phí 0).
* Theo dõi tần suất/dung lượng sao lưu Drive mỗi ngày để tinh chỉnh.
* Cải tiến giao diện & trải nghiệm; về lâu dài: bản app thuần iOS/Android.

---

## 📄 Giấy Phép (License)

Dự án được phát hành theo giấy phép [MIT License](LICENSE).
