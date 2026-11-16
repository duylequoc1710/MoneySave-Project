# MoneySave

Ứng dụng quản lý tài chính cá nhân, local-first (React 19 + Vite + Dexie). Mã nguồn nằm trong `app/`, tài liệu trong `doc/` (bắt đầu từ `doc/00-INDEX.md`). **Trước khi làm việc: đọc `doc/08-HANDOVER.md` (§2 trạng thái, §5 cảnh báo, §8 quy tắc) và nhật ký phiên mới nhất trong `doc/sessions/`.**

## Lệnh thường dùng (chạy trong `app/`)

- `npm run dev`: chạy môi trường phát triển
- `npm run build`: kiểm tra kiểu TypeScript rồi build
- `npm test`: chạy test (`node --test src/*.test.ts`)
- `npm run lint`: lint bằng oxlint

## Quy tắc cốt lõi của dự án

- **Dữ liệu của chủ dự án là dữ liệu thật – tuyệt đối không làm mất.** Không tự xoá IndexedDB; hạn chế đổi schema Dexie chính (nếu đổi: tăng version, cập nhật `doc/03-DATA-MODEL.md`, kiểm tra `exportAll` / `importAll` / `syncNowSmart`).
- **Nhánh & deploy:** làm trên nhánh `claude/*` (hoặc nhánh tính năng), push nhánh đó. `main` = production Vercel – chỉ đẩy lên `main` khi chủ dự án nói "merge".
- Mỗi thay đổi: `npm test && npm run build` phải xanh trước khi push; cập nhật CHANGELOG, badge README, `doc/01-SRS.md`, `doc/05-TEST-PLAN.md`, nhật ký phiên `doc/sessions/YYYY-MM-DD-NN.md`; sự cố → `doc/07-INCIDENT-LOGS-AND-CASE-STUDIES.md`.
- UI: dùng bàn phím số in-app, `InAppSelectModal`, `AppDialog`; không dùng `alert/confirm/prompt`, `<select>`, `autoFocus`; modal dùng `createPortal` + `.sheetbg` (xem 08-HANDOVER §5).
- Ngày lưu `YYYY-MM-DD`, hiển thị `dd/MM/yyyy` qua `fmtDmy`; không `new Date('YYYY-MM-DD')` để hiển thị.
- Chủ dự án không chuyên kỹ thuật: trả lời tiếng Việt (kể cả khi skill viết/yêu cầu tiếng Anh), ngắn gọn, đưa khuyến nghị rõ ràng. Xưng hô: AI xưng **"tôi"**, gọi chủ dự án là **"bạn"** (không dùng "em", "anh/chị").
- **Bàn giao phiên:** gần hết ngân sách (~300k token) hoặc PO yêu cầu bàn giao → AI tự tạo phiên mới bằng `create_session` kèm lời nhắn bàn giao đầy đủ, không chờ PO. Chủ động làm các bước đã thống nhất, không hỏi lại từng bước; chỉ hỏi khi yêu cầu mơ hồ hoặc cần PO xác nhận logic quan trọng (dữ liệu tiền, đồng bộ/sao lưu, schema, bảo mật, đổi diện mạo lớn). `main` chỉ khi PO nói "merge". Xem 08-HANDOVER §8.7.
- Ảnh chụp màn hình: chỉ chụp/xem khi cần làm rõ để sửa chính xác (tốn token); gửi PO tối đa 1–3 ảnh của thay đổi rõ nhất, không gửi bộ đầy đủ. Ưu tiên tiết kiệm thời gian và token.

## Skill Claude Code (chép sẵn trong `.claude/skills/`, xem `SOURCES.md`)

- Thay đổi code: áp dụng skill `ponytail` – chọn giải pháp nhỏ nhất và tái sử dụng code có sẵn trong `app/src/` (nhưng không bao giờ cắt bớt kiểm tra an toàn dữ liệu).
- Việc liên quan giao diện (trang, component, màu, font, biểu đồ): dùng skill `ui-ux-pro-max` trước khi viết code, và vẫn tuân theo các quy tắc UI ở trên (quy tắc dự án được ưu tiên).
- Trước khi đề xuất merge: chạy `/ponytail-review` trên nhánh hiện tại.
- Skill được chép vào repo (không dùng plugin) để chạy được cả trên cloud; không bật plugin cùng tên trong `.claude/settings.json` để tránh nạp trùng.

## Bảo mật

- Không commit API key/secret, `.env*`, file sao lưu JSON/CSV hay dữ liệu tài chính cá nhân. Dùng `app/.env.example` làm mẫu.
- Ngoại lệ có chủ đích: cấu hình Firebase web (`app/src/firebaseConfig.ts`) và Google OAuth **Client ID** (`app/src/googleDrive.ts`) là thông tin công khai, được phép nằm trong code. Không bao giờ commit **Client secret**.
- Nếu sau này thêm `.claude/settings.json`: chỉ chứa cấu hình dùng chung – không token, key hay đường dẫn máy cá nhân (cấu hình riêng để ở `.claude/settings.local.json`, đã gitignore).
