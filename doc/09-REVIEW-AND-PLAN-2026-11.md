# 09 – Review độc lập & Kế hoạch tối ưu (2026-11-16)

> Người review: Kỹ sư trưởng (Claude Opus) · Phạm vi: toàn bộ `app/src` tại commit `9b31dc7` (v2.8.0).
> Nền tảng kiểm tra: `npm test` 50/50 pass · `npm run build` xanh · initial JS ≈ 150 KB gzip (Recharts 117 KB gzip tải lười).
> Tài liệu chia mục đánh số — khi cần tra cứu chỉ đọc đúng mục (vd. "§3.2").

## §1. Tóm tắt cho PO
1. App chạy ổn, code có test, build sạch. Không có lỗi nghiêm trọng về tính toán tiền.
2. **Một rủi ro bảo mật cần quyết định (§2.1):** chế độ đồng bộ bằng tài khoản đang dùng khoá mã hoá suy ra từ `uid + email` (không phải bí mật) và CSDL Firebase mở quyền đọc/ghi công khai. Nghĩa là "mã hoá đầu cuối zero-knowledge" trong README **chưa đúng thực tế**: ai biết uid + email có thể đọc/ghi đè két dữ liệu.
3. Hiệu năng: có vài điểm lãng phí pin/dữ liệu di động (tải toàn bộ két dữ liệu mỗi 30 giây) và khởi động chậm khi dữ liệu lớn (§3).
4. Sao lưu/khôi phục: đề xuất làm theo 2 giai đoạn — **GĐ1 lưu file về máy qua bảng chia sẻ của iOS/Android (lưu vào Tệp/iCloud/Google Drive app)**, **GĐ2 kết nối thẳng Google Drive** (§4).

## §2. Phát hiện bảo mật & an toàn dữ liệu
### §2.1 [CAO] Khoá E2EE suy ra từ dữ liệu không bí mật + rule Firebase công khai
- `cloudSync.ts:230` `getActiveCloudSyncConfig()`: khi đăng nhập, `passphrase = "ms-e2ee-vault:{uid}:{email}"`, `syncId = "usr_{uid}"`.
- `cloudSync.ts:298/342`: request REST tới Firebase **không gửi idToken**; `06-DEPLOYMENT-GUIDE.md` hướng dẫn rule `.read: true, .write: true` cho từng `$vaultId`.
- Hệ quả: ai biết uid + email → tính được docId và khoá → đọc & giải mã, hoặc ghi đè/xoá két. Không liệt kê được toàn bộ két (rule ở cấp con) nên rủi ro thực tế là *có mục tiêu*, không phải hàng loạt.
- Hướng sửa (cần PO chọn, xem §5 Quyết định D1):
  - **(a) Khuyến nghị:** gửi `?auth={idToken}` + đổi path thành `moneysave_vaults/{uid}` và rule `auth.uid === $uid` → chỉ chủ tài khoản đọc/ghi được. Giữ khoá cũ để không phải nhập thêm gì (vẫn được bảo vệ bởi Firebase Auth). Công sức nhỏ–vừa; cần migration 1 lần (đọc két cũ → ghi két mới) và PO cập nhật rule trên Firebase Console.
  - (b) Thêm "mật khẩu két" riêng do người dùng đặt để đúng nghĩa zero-knowledge (mất mật khẩu = mất dữ liệu cloud). Làm sau (a) nếu muốn.

### §2.2 [TRUNG BÌNH] Nguy cơ iOS/Safari tự xoá IndexedDB
- Chưa gọi `navigator.storage.persist()`. Safari có thể dọn dữ liệu website lâu không mở (đặc biệt khi chưa "Thêm vào MH chính"). Sửa 5 dòng, rủi ro 0.

### §2.3 [THẤP] `URL.revokeObjectURL` ngay sau `a.click()` (`Settings.tsx:91`)
- Một số bản Safari huỷ tải file trước khi kịp lưu. Nên trì hoãn revoke (vd. 30–60 giây) — sẽ gộp vào GĐ1 sao lưu.

### §2.4 [CAO – xử lý trong S3] Giao dịch định kỳ sinh ra khi quay lại app có thể đẩy dữ liệu cũ đè Cloud
- `main.tsx` `visibilitychange` → `processRecurringTransactions()` chạy SAU khi hook đồng bộ đã gắn → `markLocalMutated()` → `syncNowSmart` thấy `localMut` mới hơn bản Cloud → **push** thay vì **pull**, dù máy này đang có dữ liệu cũ hơn thiết bị khác.
- Hướng sửa trong S3: trước khi sinh giao dịch định kỳ, đồng bộ kéo về trước; hoặc không đánh dấu `localMutated` cho ghi tự động.

## §3. Hiệu năng & độ mượt
| # | Vấn đề | Vị trí | Tác động | Công sức |
|---|---|---|---|---|
| §3.1 | Polling 30 s + mỗi lần focus đều **tải toàn bộ két mã hoá** chỉ để so `updatedAt` | `cloudSync.ts:614-631`, `fetchRemoteVault` | Tốn data/pin di động, chậm khi dữ liệu lớn | Vừa – tách node meta nhỏ `{updatedAt, deviceId}` (làm chung với §2.1a) |
| §3.2 | Khởi động chờ `ensureDailySnapshot` **trước khi vẽ UI** | `main.tsx` | Chỉ chậm 1 lần/ngày | **KHÔNG SỬA** (2026-11-16): vẽ UI trước sẽ gắn hook đồng bộ sớm → seed/định kỳ bị coi là "chỉnh sửa mới" → có thể đẩy dữ liệu cũ đè Cloud. Xem §2.4 |
| §3.3 | `exportAll` in JSON thụt lề (`null, 2`) cho cả sync & 15 snapshot | `db.ts:314` | Payload/ bộ nhớ to hơn ~30–40%, mã hoá chậm hơn | Nhỏ – bản nén cho sync/snapshot, giữ dạng đẹp cho file người dùng |
| §3.4 | Mỗi trang + modal tự `db.txs.toArray()` riêng; mỗi lần ghi, mọi truy vấn chạy lại | `pages/*`, `TxDetailModal`, `SavingsGoalsModal` | Ổn đến vài chục nghìn giao dịch; giật nhẹ khi mở modal trên máy yếu | Vừa – hook dùng chung (1 nguồn dữ liệu) – ưu tiên thấp |
| §3.5 | File quá lớn: `SavingsGoalsModal` 2117 dòng, `CreditCardDetailModal` 1613, `Overview` 1255 | components | Khó bảo trì, dễ sinh lỗi khi sửa | Lớn – tách dần khi đụng tới, không làm riêng |
| §3.6 | Logic tìm kiếm inline trong `GlobalSearchModal` (TODO-1 cũ) | components | Không test được | Nhỏ |

## §4. Nghiên cứu: Sao lưu / Khôi phục về điện thoại & Google Drive
### §4.1 Hiện trạng
- Xuất JSON bằng thẻ `<a download>` (`Settings.tsx:84`, `BackupReminder.tsx:14`). Trên **iPhone khi mở dạng app (PWA standalone)**, cách này thường mở trang xem JSON thay vì lưu file → người dùng khó lưu được.
- Khôi phục bằng `<input type=file>` → hoạt động tốt trên iOS/Android (chọn được cả từ iCloud Drive / Google Drive qua trình chọn tệp).
- Snapshot an toàn 15 bản nằm **trong cùng trình duyệt** → mất cùng lúc nếu xoá app/dữ liệu web.

### §4.2 Phương án
| Phương án | Cách hoạt động | Ưu | Nhược | Công sức |
|---|---|---|---|---|
| **A. Bảng chia sẻ hệ điều hành (Web Share API)** – *khuyến nghị GĐ1* | Nút "Sao lưu" tạo file `.json` → mở bảng chia sẻ iOS/Android → chọn "Lưu vào Tệp" (iCloud/Trên iPhone), "Drive", Zalo, Email… Máy tính: tải file hoặc hộp thoại "Lưu thành" (Chrome/Edge). | Không cần tài khoản/khoá API; chạy offline; iOS 15+/Android Chrome đều hỗ trợ; người dùng tự chọn nơi lưu | Người dùng phải bấm tay; không tự động | 1 lát nhỏ |
| A+. Mã hoá file sao lưu bằng mật khẩu (tuỳ chọn) | Dùng lại AES-GCM có sẵn | File để trên Drive/Zalo vẫn an toàn | Quên mật khẩu = không khôi phục được | +0,5 lát |
| **B. Kết nối Google Drive trực tiếp** – *GĐ2* | Google Identity Services (OAuth trên trình duyệt) + Drive API, quyền hẹp `drive.file` (app chỉ thấy file do chính nó tạo, trong thư mục "MoneySave Backup"). Nút "Sao lưu lên Drive", danh sách bản sao trên Drive để khôi phục, tự sao lưu khi mở app nếu >24h. | Gần như tự động; lịch sử nhiều bản; khôi phục ngay trong app | PO phải tạo OAuth Client ID trên Google Cloud; mã truy cập hết hạn 1 giờ → thỉnh thoảng phải bấm "cho phép" lại; **đăng nhập Google bằng popup trong PWA iPhone có thể trục trặc** → cần thử trên máy thật; không chạy ngầm khi app đóng | 2–3 lát + PO test máy thật |
| C. Đóng gói app gốc (Capacitor) | App iOS/Android thật, ghi file/iCloud ngầm | Tự động hoàn toàn | Tài khoản Apple Developer 99 USD/năm, phát hành store, thay đổi kiến trúc lớn | Rất lớn – **không khuyến nghị lúc này** |

### §4.3 Đề xuất luồng người dùng (GĐ1)
1. Cài đặt › Sao lưu: **[Lưu bản sao lưu về máy]** → bảng chia sẻ → "Lưu vào Tệp" / "Drive".
2. **[Khôi phục từ file]** → chọn file → màn xem trước (ngày sao lưu, số ví, số giao dịch) → xác nhận → snapshot an toàn tự lưu trước khi ghi đè (đã có).
3. Nhắc sao lưu 7 ngày (đã có) dùng chung nút mới.
4. Gọi `navigator.storage.persist()` khi mở app (§2.2).

## §5. Kế hoạch theo lát (slice) & quyết định cần PO
### Quyết định cần PO
- **D1** – Sửa bảo mật đồng bộ theo §2.1(a)? (khuyến nghị: Có, làm sớm nhất)
- **D2** – Sao lưu: duyệt GĐ1 (Phương án A) ngay; GĐ2 Google Drive làm sau khi GĐ1 được xác nhận trên máy thật?
- **D3** – Mã hoá file sao lưu bằng mật khẩu (A+): bắt buộc / tuỳ chọn / không?
- **D4** – Quy trình nhánh: làm trên nhánh `claude/*` → tạo PR → PO xem bản Preview của Vercel trên điện thoại → merge `main` để lên production (thay cho việc đẩy thẳng `main` như trước).

### Lát đề xuất (thứ tự ưu tiên)
| Lát | Nội dung | Người làm | Phụ thuộc |
|---|---|---|---|
| S1 ✅ | §2.2 persist storage, §3.3 JSON gọn (§3.2 huỷ – xem §2.4) | Opus | v2.9.0 |
| S2 ✅ | Sao lưu GĐ1: 1 file duy nhất (ghi đè), Web Share, xem trước khi khôi phục, gộp snapshot theo ngày, sửa §2.3. A+ (mật khẩu file) chưa làm – chờ D3 | Opus | v2.9.0 |
| S3 | Bảo mật đồng bộ §2.1(a) + §2.4 + node meta §3.1 + migration két cũ + cập nhật rule/tài liệu | Opus | D1, PO đổi rule Firebase |
| S4 | Google Drive GĐ2 | Sonnet, Opus review | S2 xác nhận, PO tạo OAuth Client ID |
| S5 | TODO-1 tách logic tìm kiếm + test; hook dữ liệu dùng chung §3.4 | Sonnet | – |
