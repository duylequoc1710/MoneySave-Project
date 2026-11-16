# 10 – S4: Hướng dẫn PO tạo OAuth Client ID cho Google Drive

> Mục đích: cho phép MoneySave lưu/khôi phục bản sao lưu thẳng lên Google Drive của anh (09 §4.2 phương án B).
> Quyền xin: `drive.file` — app **chỉ thấy file do chính nó tạo**, không đọc được file khác trong Drive.
> Thời gian: ~10 phút, làm trên máy tính dễ hơn điện thoại. Không tốn phí.

## §1. Mở đúng project
1. Vào https://console.cloud.google.com bằng **tài khoản Google đang sở hữu Firebase** của MoneySave.
2. Thanh trên cùng, bấm ô chọn project → chọn **moneysave-project** (cùng project với Firebase, không tạo project mới).

## §2. Bật Google Drive API
1. Menu ☰ → **APIs & Services** → **Library**.
2. Tìm **Google Drive API** → bấm **Enable**.

## §3. Màn hình xin quyền (OAuth consent / Google Auth Platform)
1. Menu ☰ → **Google Auth Platform** (bản cũ tên **OAuth consent screen**) → **Get started** (nếu đã làm rồi thì bỏ qua bước này).
   - App name: `MoneySave` · User support email: Gmail của anh.
   - Audience: **External**.
   - Contact email: Gmail của anh → đồng ý điều khoản → **Create**.
2. Mục **Data Access** → **Add or remove scopes** → tìm và tick `.../auth/drive.file` (mô tả "See, edit, create, and delete only the specific Google Drive files you use with this app") → **Update** → **Save**.
3. Mục **Audience** → **Publish app** → xác nhận (chuyển sang *In production*).
   - Quyền `drive.file` thuộc loại không nhạy cảm nên **không cần Google duyệt**.
   - Nếu anh muốn để chế độ *Testing* thì phải thêm Gmail của mình vào **Test users**; nhược điểm: Google có thể bắt cho phép lại mỗi 7 ngày.

## §4. Tạo Client ID
1. Mục **Clients** (bản cũ: APIs & Services → Credentials → **Create credentials → OAuth client ID**) → **Create client**.
2. Application type: **Web application** · Name: `MoneySave Web`.
3. **Authorized JavaScript origins** → **Add URI**, thêm từng dòng (đúng chính tả, không có `/` ở cuối):
   - `https://moneysavedl.vercel.app`
   - `http://localhost:5173`
4. **Authorized redirect URIs**: để trống.
5. Bấm **Create** → hiện hộp thoại có **Client ID** dạng `123456789-abc...xyz.apps.googleusercontent.com`.

## §5. Gửi cho kỹ sư
- Gửi **Client ID** vào chat (Client ID không phải bí mật, sẽ nằm trong code giống cấu hình Firebase).
- **KHÔNG gửi Client secret** (app không cần, nếu có hiện thì bỏ qua).
- Khi code xong S4, kỹ sư sẽ báo **địa chỉ bản Preview của nhánh** để anh thêm vào mục Authorized JavaScript origins (Google không cho dùng ký tự `*`, mỗi địa chỉ phải thêm riêng). Đổi origin có thể mất 5 phút–vài giờ mới có hiệu lực.

## §6. Ghi chú kỹ thuật (cho kỹ sư làm S4)
- Google Identity Services (token model, `initTokenClient`), không dùng client secret, không redirect. Token sống ~1 giờ, lưu trong bộ nhớ (không lưu localStorage).
- Thư mục `MoneySave Backup` do app tạo; mỗi lần sao lưu tạo/ghi đè theo quy ước 1 file/ngày + giữ N bản gần nhất (chốt khi code). Dùng lại `exportAll`/`describeBackup`/`importAll(..., {source})` — không đổi schema Dexie.
- D3 = **không mã hoá file sao lưu bằng mật khẩu** (PO chốt 2026-11-16).
- Rủi ro cần PO thử máy thật: popup đăng nhập Google trong PWA iPhone (chế độ "Thêm vào MH chính").
