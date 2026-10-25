# 06 – Hướng Dẫn Triển Khai Web App & Cloud (Deployment Guide)

Tài liệu này dành cho cộng đồng mã nguồn mở và người dùng muốn tự lưu trữ (Self-host) ứng dụng **MoneySave** trên máy chủ đám mây của riêng mình hoàn toàn miễn phí.

---

## 1. Kiến Trúc & Công Nghệ

* **Frontend:** React 19 + TypeScript + Vite + PWA (Service Worker) + Recharts + Dexie.js (IndexedDB).
* **Database & Auth:** Firebase Realtime Database (hoặc Cloud Firestore) + Firebase Authentication.
* **Mã hóa:** Web Crypto API (`AES-GCM 256-bit` + `PBKDF2-SHA256` 100.000 vòng lặp).
* **Hosting:** Tương thích với mọi nền tảng tĩnh: Vercel, Firebase Hosting, Netlify, Cloudflare Pages, GitHub Pages.

---

## 2. Phương Án 1: Triển Khai Lên Vercel (Khuyên Dùng – Đơn Giản Nhất)

Vercel hỗ trợ cả kho lưu trữ riêng tư (Private) và công khai (Public) trên GitHub với băng thông miễn phí tốc độ cao.

1. Đăng ký tài khoản miễn phí tại [vercel.com](https://vercel.com) bằng tài khoản GitHub.
2. Tại bảng điều khiển Vercel, chọn **Add New... → Project**.
3. Chọn kho lưu trữ **`MoneySave-Project`** và bấm **Import**.
4. Cấu hình cơ bản:
   * **Framework Preset:** Vite
   * **Root Directory:** Bấm *Edit* và chọn thư mục **`app`**.
   * **Build Command:** `npm run build`
   * **Output Directory:** `dist`
5. (Tùy chọn) Thêm biến môi trường Firebase trong mục **Environment Variables**:
   * `VITE_FIREBASE_API_KEY`: API Key của Firebase
   * `VITE_FIREBASE_DATABASE_URL`: Đường dẫn Realtime Database
   * `VITE_FIREBASE_PROJECT_ID`: Mã dự án Firebase
   *(Nếu không thêm biến môi trường, người dùng vẫn có thể đăng nhập hoặc cấu hình trực tiếp từ giao diện Cài đặt của ứng dụng)*.
6. Bấm nút **Deploy**. Sau khoảng 30 giây, ứng dụng sẽ có đường dẫn HTTPS cố định (ví dụ: `https://your-project.vercel.app`).

---

## 3. Phương Án 2: Triển Khai Lên Firebase Hosting

Nếu bạn muốn gom toàn bộ Frontend và Backend về chung một mái nhà Google Firebase:

1. Cài đặt Firebase CLI trên máy:
   ```bash
   npm install -g firebase-tools
   ```
2. Đăng nhập và khởi tạo hosting trong thư mục dự án:
   ```bash
   firebase login
   firebase init hosting
   ```
   * Chọn dự án Firebase của bạn.
   * Thư mục public directory: gõ `app/dist`.
   * Configure as a single-page app (rewrite all urls to /index.html)?: gõ `Yes`.
3. Biên dịch và tải lên Firebase Hosting:
   ```bash
   cd app && npm run build && cd ..
   firebase deploy --only hosting
   ```
   Ứng dụng sẽ khả dụng ngay tại: `https://<project-id>.web.app`.

---

## 4. Phương Án 3: Triển Khai Lên GitHub Pages (Dành Cho Repo Public)

Trong dự án đã tích hợp sẵn workflow GitHub Actions tại [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml).

1. Đảm bảo kho lưu trữ của bạn ở chế độ **Public** (nếu dùng tài khoản GitHub miễn phí).
2. Trên trang GitHub của dự án, vào **Settings → Pages**.
3. Tại ô **Build and deployment → Source**, chọn **GitHub Actions**.
4. Mỗi khi bạn đẩy code (`git push`) lên nhánh `main`, GitHub sẽ tự động kiểm thử, biên dịch và xuất bản website lên:
   `https://<username>.github.io/<repo-name>/`.

---

## 5. Hướng Dẫn Cấu Hình Firebase Backend Cho Dự Án Mới

1. **Tạo Dự án Firebase:**
   * Truy cập [console.firebase.google.com](https://console.firebase.google.com/) → **Create a project**.
2. **Kích hoạt Xác thực (Authentication):**
   * Vào **Build → Authentication** → **Get started**.
   * Tab **Sign-in method** → bật **Email/Password** → **Save**.
3. **Kích hoạt Realtime Database:**
   * Vào **Build → Realtime Database** → **Create database** (chọn Singapore `asia-southeast1`).
   * Vào tab **Rules**, dán cấu hình bảo mật sau rồi bấm **Publish**:
     ```json
     {
       "rules": {
         "moneysave_vaults": {
           "$vaultId": {
             ".read": true,
             ".write": true
           }
         }
       }
     }
     ```
     *(Dữ liệu đã được mã hóa AES-GCM 256-bit E2EE trước khi gửi lên máy chủ nên bản ghi được bảo vệ an toàn tuyệt đối)*.
4. **Lấy Cấu hình Web App:**
   * Vào **Project settings (⚙️)** → cuộn xuống mục **Your apps** → bấm biểu tượng Web **`</>`** → đăng ký app và copy các thông số vào file `app/.env.local`.

---

## 6. An Toàn Bảo Mật Khi Đưa Lên Mã Nguồn Mở (Open Source)

* Tuyệt đối không commit file chứa khóa bí mật cá nhân (`.env.local`, `.env`) lên Git.
* Kho mã nguồn của dự án đã cấu hình sẵn `.gitignore` để loại trừ tất cả các file cấu hình cục bộ.
* Mọi dữ liệu tài chính thực tế của người dùng được lưu trữ trong **IndexedDB** trên trình duyệt của chính họ và chỉ được mã hóa đẩy lên phân vùng tài khoản riêng biệt.
