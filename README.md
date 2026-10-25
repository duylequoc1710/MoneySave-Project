<div align="center">
  <img src="app/public/logo-moneysave-nav.png" alt="MoneySave Logo" width="220" />
  <h1>MoneySave</h1>
  <p><b>Ứng dụng Quản lý Tài chính Cá nhân & Gia đình Chuẩn MoneyLover</b></p>
  <p><i>Local-first · Offline-first · Bảo mật Mã hóa Đầu cuối (E2EE AES-256) · Đồng bộ Realtime Đa thiết bị</i></p>

  <p>
    <a href="https://github.com/duylequoc1710/MoneySave-Project/actions"><img src="https://img.shields.io/badge/tests-22%2F22%20passing-brightgreen" alt="Tests" /></a>
    <a href="https://vite.dev"><img src="https://img.shields.io/badge/vite-v8.3-646CFF" alt="Vite" /></a>
    <a href="https://react.dev"><img src="https://img.shields.io/badge/react-v19-61DAFB" alt="React" /></a>
    <a href="https://firebase.google.com"><img src="https://img.shields.io/badge/firebase-realtime-FFCA28" alt="Firebase" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License" /></a>
  </p>
</div>

---

## 🌟 Tính Năng Nổi Bật

* **📱 Trải Nghiệm Chuẩn MoneyLover (PWA):**
  * Giao diện Dark / Light theme hiện đại, tối ưu 100% hiển thị trên mọi kích thước màn hình điện thoại (iPhone, Android) và Máy tính (Mac, Windows).
  * Cài đặt ra Màn hình chính (Add to Home Screen) chạy độc lập toàn màn hình như ứng dụng gốc, mở offline tức thì không cần mạng.
* **🔒 Bảo Mật Tuyệt Đối (Local-first & Zero-Knowledge E2EE):**
  * 100% dữ liệu gốc lưu trên IndexedDB của trình duyệt thiết bị.
  * Khi đồng bộ lên Cloud, toàn bộ dữ liệu được tự động mã hóa bằng **AES-GCM 256-bit** với khóa dẫn xuất **PBKDF2-SHA256 (100.000 vòng lặp)**. Máy chủ Google hoàn toàn không thể giải mã hay đọc được số dư/chi tiêu của bạn.
* **☁️ Đồng Bộ Realtime Đa Thiết Bị:**
  * Tự động phát hiện thay đổi trên thiết bị để đồng bộ ngầm hai chiều (Auto-Push & Auto-Pull).
  * Hỗ trợ hệ thống tài khoản Cá nhân / Gia đình (Email & Mật khẩu), cô lập không gian ví riêng biệt theo `User UID`.
* **📂 Hệ Thống Nhóm Cha & Nhóm Con (Category Hierarchy):**
  * Phân cấp nhóm cha đại diện (ví dụ: `🏡 Thiết Yếu 50%`, `👤 Cá nhân 25%`) và tick chọn nhanh các nhóm con tương ứng.
  * Hiển thị thụt lề trực quan, gom nhóm phân cấp khi ghi chép giao dịch và hiển thị `Nhóm cha › Nhóm con` trên toàn bộ báo cáo.
* **💳 Tối Ưu Quỹ Tín Dụng (Xài Trước Trả Sau):**
  * Tự động tính số ngày miễn lãi tối đa khi quẹt thẻ hôm nay.
  * Cảnh báo thời điểm vàng chi tiêu, cảnh báo sắp chốt sao kê và sắp đến hạn thanh toán, nút tất toán 1 chạm.
* **📊 Báo Cáo Chuyên Sâu:**
  * Báo cáo giai đoạn này: Thu nhập ròng, 2 biểu đồ Donut Khoản thu & Khoản chi song song, biểu đồ cột xu hướng tuần kèm so sánh trung bình 3 tháng trước.
  * Bộ lọc thời gian linh hoạt: lọc theo khoảng ngày cụ thể, tháng, quý, năm.
  * Xuất file Excel (`.xls` 2 Sheet: *Sổ Giao Dịch* và *Danh Sách Ví*), CSV và sao lưu JSON.

---

## 🛠️ Công Nghệ Sử Dụng

* **Giao diện & Ứng dụng:** React 19, TypeScript, Vite 8, `react-router-dom` (HashRouter), `date-fns` (vi locale).
* **Cơ sở dữ liệu cục bộ:** Dexie.js (IndexedDB v3).
* **Biểu đồ:** Recharts.
* **Đám mây & Xác thực:** Firebase Realtime Database / Cloud Firestore REST API, Firebase Authentication.
* **Mã hóa:** Web Crypto API (`crypto.subtle` AES-GCM 256-bit).

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Cục Bộ

### Yêu cầu:
* Node.js 20+ trở lên.

### Các bước thực hiện:
```bash
# 1. Clone kho lưu trữ
git clone https://github.com/duylequoc1710/MoneySave-Project.git
cd MoneySave-Project/app

# 2. Cài đặt thư viện
npm install

# 3. Tạo file cấu hình môi trường cục bộ (tùy chọn)
cp .env.example .env.local

# 4. Khởi chạy máy chủ phát triển
npm run dev

# 5. Chạy bộ kiểm thử tự động
npm test

# 6. Đóng gói bản Production
npm run build
```

Mở trình duyệt truy cập: `http://localhost:5173`.

---

## 🌐 Hướng Dẫn Triển Khai (Deployment)

Dự án hỗ trợ triển khai miễn phí 100% trên nhiều nền tảng:

* **[Hướng Dẫn Triển Khai Chi Tiết (doc/06-DEPLOYMENT-GUIDE.md)](doc/06-DEPLOYMENT-GUIDE.md)**:
  * **Vercel (Khuyên dùng):** Kết nối 1 click với GitHub repo, hỗ trợ cả repo Private hoàn toàn miễn phí.
  * **Firebase Hosting:** Tích hợp trực tiếp với dịch vụ của Google.
  * **GitHub Pages:** Tự động build và deploy qua GitHub Actions (`.github/workflows/deploy.yml`).

---

## 📚 Tài Liệu Dự Án

Toàn bộ tài liệu chi tiết được lưu trữ trong thư mục [`doc/`](doc/):
* [`doc/01-SRS.md`](doc/01-SRS.md): Đặc tả yêu cầu phần mềm (23 Functional Requirements).
* [`doc/02-ARCHITECTURE.md`](doc/02-ARCHITECTURE.md): Kiến trúc hệ thống & bảo mật E2EE.
* [`doc/03-DATA-MODEL.md`](doc/03-DATA-MODEL.md): Mô hình thực thể dữ liệu Dexie IndexedDB.
* [`doc/04-USER-GUIDE.md`](doc/04-USER-GUIDE.md): Cẩm nang hướng dẫn sử dụng toàn diện cho người dùng cuối.
* [`doc/05-TEST-PLAN.md`](doc/05-TEST-PLAN.md): Kế hoạch và kết quả kiểm thử (22 Unit Tests).
* [`doc/06-DEPLOYMENT-GUIDE.md`](doc/06-DEPLOYMENT-GUIDE.md): Hướng dẫn triển khai web app lên cloud.

---

## 📄 Giấy Phép (License)

Dự án được phát hành theo giấy phép [MIT License](LICENSE). Tự do sử dụng, chỉnh sửa và chia sẻ cho cộng đồng.
