<div align="center">
  <img src="app/public/logo-moneysave-nav.png" alt="MoneySave Logo" width="220" />
  <h1>MoneySave</h1>
  <p><b>Ứng dụng Quản lý Tài chính Cá nhân, Phân tích Hành vi & Hoạch định Mục tiêu Hiện đại</b></p>
  <p><i>Local-first · Offline-first PWA · Bảo mật Mã hóa Đầu cuối (E2EE AES-256) · Đồng bộ Realtime Đa thiết bị</i></p>

  <p>
    <a href="https://moneysavedl.vercel.app"><img src="https://img.shields.io/badge/live_demo_(test_only)-moneysavedl.vercel.app-10b981?style=flat&logo=vercel" alt="Live Demo (Test Only)" /></a>
    <a href="CHANGELOG.md"><img src="https://img.shields.io/badge/version-v2.8.0-3b82f6" alt="Version v2.8.0" /></a>
    <a href="doc/05-TEST-PLAN.md"><img src="https://img.shields.io/badge/tests-50%2F50%20passing-brightgreen" alt="Tests" /></a>
    <a href="https://vite.dev"><img src="https://img.shields.io/badge/vite-v8.3-646CFF" alt="Vite" /></a>
    <a href="https://react.dev"><img src="https://img.shields.io/badge/react-v19-61DAFB" alt="React" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License" /></a>
  </p>
</div>

---

> [!IMPORTANT]
> ### 🛠️ Triết Lý Chia Sẻ Repo & Khuyến Cáo Dành Cho Người Sử Dụng
>
> * **Cung cấp "Khung sườn cơ bản" – Tự do xào nấu theo ý bạn:** Kho mã nguồn (Public Repository) này được chia sẻ với mục tiêu cung cấp cho cộng đồng **ý tưởng thiết kế và bộ khung sườn cốt lõi (Core Framework / Starter Template)** của một ứng dụng quản lý tài chính cá nhân. Bạn hoàn toàn làm chủ mã nguồn sau khi tải về — hãy thoải mái **tự xử lý, tùy biến, thêm bớt tính năng, đổi giao diện hoặc "xào nấu"** lại mọi công thức, cấu trúc dữ liệu theo đúng gu và nhu cầu thực tế của riêng bạn.
> * **Link Vercel của tác giả chỉ dùng để Test / Trải nghiệm thử:** Đường dẫn [https://moneysavedl.vercel.app](https://moneysavedl.vercel.app) là môi trường cá nhân của tác giả, mở công khai để bạn **trải nghiệm nhanh giao diện và test thử các luồng tính năng** trước khi quyết định tải code.
> * **Khuyến cáo tự cài đặt lên Website / Host riêng khi sử dụng thật:** Đây **không phải** là dịch vụ SaaS thương mại dùng chung. Để đảm bảo sự riêng tư, độc lập dữ liệu và chủ động lâu dài, **khuyến cáo bạn hãy Fork / Clone repo này về máy và tự triển khai (Self-host) lên tài khoản Vercel, Netlify, Cloudflare Pages, Firebase Hosting hoặc Server riêng của bạn** (kết nối với Firebase cá nhân của bạn qua file `app/.env.local`). Xem hướng dẫn chi tiết từng bước tại **[Hướng dẫn Tự triển khai (Self-Hosting Guide)](doc/06-DEPLOYMENT-GUIDE.md)**.

---

## 📖 Giới Thiệu Dự Án

**MoneySave** là bộ khung ứng dụng Web Progressive (PWA) quản lý tài chính cá nhân hiện đại được thiết kế theo triết lý **Local-first (Ưu tiên cục bộ)** kết hợp **Behavioral FinTech (Phân tích hành vi tài chính)**.

Không chỉ dừng lại ở việc ghi chép thu chi thông thường, **MoneySave** đóng vai trò như một cố vấn tài chính cá nhân: tự động dự báo dòng tiền cuối tháng, phát hiện các khoản chi rò rỉ vi mô, tối ưu hóa chu kỳ sao kê & trả góp thẻ tín dụng, đồng thời giúp bạn phân bổ dòng tiền vào các kế hoạch tiết kiệm theo lộ trình giai đoạn rõ ràng.

👉 **Bản Demo trải nghiệm thử tính năng:** [https://moneysavedl.vercel.app](https://moneysavedl.vercel.app) *(Khuyến nghị tự Clone & Deploy lên host riêng nếu sử dụng lâu dài)*

---

## 🌟 Các Trụ Cột Tính Năng Nổi Bật

### 1. 🧠 Smart Insights – Phân Tích Hành Vi Tài Chính 4 Trụ Cột
* **Dự báo dòng tiền & Tốc độ chi tiêu (`Burn Rate & Projection Engine`):** Dự phóng tổng chi tiêu cuối tháng có tính trọng số *Ngày thường vs Cuối tuần* và làm mượt dữ liệu đầu tháng; trực quan hóa qua thanh **Dual-Pace Sparkbar** (so sánh `% tốc độ chi` với `% thời gian tháng`).
* **Phát hiện bất thường & Rò rỉ vi mô (`Anomaly & Micro-leak Detector`):** Tự động cảnh báo các nhóm chi tăng đột biến (*Spike*) và các thói quen chi nhỏ lẻ lặp lại nhiều lần (*Micro-leaks* như cà phê, ăn vặt, dịch vụ ngầm).
* **Nhịp sinh học tài chính (`Temporal & Payday Patterns`):** Phân tích biểu đồ chi tiêu Thứ 2 – Chủ Nhật và nhận diện *Hội chứng chi tiêu 5 ngày sau khi nhận lương (Payday Effect)*.
* **Quy đổi chi phí cơ hội & Can thiệp 1-chạm (`Opportunity Cost & 1-Click Actions`):** Quy đổi số tiền chi tiêu ra **số giờ làm việc tương đương** hoặc **giá trị lãi kép 6.5%/năm sau 1–3 năm**; hỗ trợ đặt trần ngân sách hoặc trích tiền sang Ví Tiết Kiệm chỉ với 1 chạm.

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

### 5. 🔒 Bảo Mật E2EE Zero-Knowledge & An Toàn Dữ Liệu Đa Lớp
* **100% Local-first (IndexedDB Dexie v4):** Ứng dụng chạy hoàn toàn không cần mạng, tốc độ phản hồi tức thì (`< 1 ms`).
* **Đồng bộ Đám mây Mã hóa Đầu cuối (`AES-GCM 256-bit`):** Dữ liệu được mã hóa ngay trên thiết bị bằng khóa dẫn xuất `PBKDF2-SHA256` (100.000 vòng lặp) trước khi đồng bộ lên Firebase Cloud.
* **Bản sao an toàn tự động (`Safety Snapshots`):** Cơ sở dữ liệu phụ độc lập `moneysave_safety` tự động lưu tối đa 15 bản chụp trước mọi thao tác Khôi phục / Đồng bộ ghi đè / Xoá sạch và định kỳ hàng ngày.

---

## 🛠️ Kiến Trúc & Công Nghệ Sử Dụng

| Thành phần | Công nghệ |
| :--- | :--- |
| **Frontend Framework** | React 19, TypeScript (`~6.0`), Vite 8, `react-router-dom` v7 |
| **CSDL Cục bộ** | Dexie.js v4 (IndexedDB: `funds`, `categories`, `txs`, `budgets`, `recurrings`, `savingsGoals` + `moneysave_safety`) |
| **Biểu đồ & Trực quan hóa** | Recharts v3 (Lazy-loaded chunk), Custom Sparkbars & Milestone Steppers |
| **Đám mây & Xác thực** | Firebase Authentication (Email/Password), Cloud Firestore / Realtime Database REST API |
| **Bảo mật & Mã hóa** | Web Crypto API (`crypto.subtle` – `AES-GCM 256-bit`, `PBKDF2-SHA256`, `SHA-256`) |
| **Chất lượng Mã nguồn** | Node.js Test Runner (`50/50 unit tests`), Oxlint, TypeScript Strict Mode |

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
# -> Điền thông số Firebase riêng của bạn vào .env.local (nếu muốn dùng Cloud Sync riêng)

# 4. Khởi chạy máy chủ phát triển để tự do chỉnh sửa / "xào nấu" tính năng
npm run dev

# 5. Chạy bộ kiểm thử tự động (50 kịch bản Unit Test) & Đóng gói bản Production
npm test
npm run lint
npm run build
```

### 2. Tự Triển Khai Lên Website / Host Riêng (Vercel, Netlify, Cloudflare, Firebase...)
Sau khi đã tùy biến mã nguồn theo ý thích, bạn có thể đẩy lên repo GitHub cá nhân của bạn và kết nối miễn phí với:
* **Vercel / Netlify / Cloudflare Pages:** Chọn thư mục gốc là `app`, lệnh build `npm run build`, thư mục đầu ra `dist` và khai báo các biến môi trường `VITE_FIREBASE_*` của bạn.
* **Firebase Hosting / GitHub Pages:** Xem hướng dẫn từng bước tại [`doc/06-DEPLOYMENT-GUIDE.md`](doc/06-DEPLOYMENT-GUIDE.md).

---

## 🕒 Tóm Tắt Lịch Sử Cập Nhật Phiên Bản

Chi tiết đầy đủ từng bản phát hành được ghi nhận tại **[CHANGELOG.md](CHANGELOG.md)**:

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
* 🎯 [`doc/01-SRS.md`](doc/01-SRS.md): Đặc tả yêu cầu phần mềm (`FR-01` đến `FR-39`).
* 🏗️ [`doc/02-ARCHITECTURE.md`](doc/02-ARCHITECTURE.md): Kiến trúc hệ thống, luồng đồng bộ & bảo mật E2EE.
* 🗄️ [`doc/03-DATA-MODEL.md`](doc/03-DATA-MODEL.md): Mô hình dữ liệu IndexedDB (Dexie schema v4).
* 📖 [`doc/04-USER-GUIDE.md`](doc/04-USER-GUIDE.md): Cẩm nang hướng dẫn sử dụng trên iPhone, Android và máy tính.
* 🧪 [`doc/05-TEST-PLAN.md`](doc/05-TEST-PLAN.md): Kế hoạch và kết quả kiểm thử tự động (`50/50 tests pass`).
* 🗺️ [`doc/06-ROADMAP.md`](doc/06-ROADMAP.md) & [`doc/06-DEPLOYMENT-GUIDE.md`](doc/06-DEPLOYMENT-GUIDE.md): Lộ trình phát triển & hướng dẫn triển khai.
* 🛠️ [`doc/07-INCIDENT-LOGS-AND-CASE-STUDIES.md`](doc/07-INCIDENT-LOGS-AND-CASE-STUDIES.md): Sổ tay phân tích sự cố kỹ thuật (RCA) & các giải pháp thực chiến.

---

## 📄 Giấy Phép (License)

Dự án được phát hành theo giấy phép [MIT License](LICENSE).
