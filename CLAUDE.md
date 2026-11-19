@.claude/WORKFLOW.md

# MoneySave

Ứng dụng quản lý tài chính cá nhân, local-first (React 19 + Vite + Dexie). Mã nguồn nằm trong `app/`, tài liệu trong `doc/` (bắt đầu từ `doc/00-INDEX.md`). **Trước khi làm việc: đọc `doc/08-HANDOVER.md` (§2 trạng thái, §5 cảnh báo, §8 quy tắc) và nhật ký phiên mới nhất trong `doc/sessions/`.**

Quy tắc làm việc chung (xưng hô, ngôn ngữ, cách hỏi, nhánh/PR/merge, bàn giao, đặt tên phiên, Opus/Sonnet) nằm trong `.claude/WORKFLOW.md` – không sửa file đó trong dự án. File này chỉ ghi phần riêng của MoneySave và các chỗ khác quy tắc chung.

## Triển khai

**Kiểu A** (xem `.claude/WORKFLOW.md`): webapp trên Vercel (https://moneysavedl.vercel.app), dữ liệu trên Firebase (và IndexedDB trên máy người dùng). Vercel theo dõi `main` và tự triển khai khi merge – sau khi merge chỉ báo "bản mới sẽ lên trong vài phút". Không có GitHub Pages (đã bỏ).

## Lệnh thường dùng (chạy trong `app/`)

- Container mới: `npm ci` trước
- `npm run dev`: chạy môi trường phát triển
- `npm run build`: kiểm tra kiểu TypeScript rồi build
- `npm test`: chạy test (`node --test src/*.test.ts`)
- `npm run lint`: lint bằng oxlint

## Quy tắc riêng của dự án

- **Dữ liệu của chủ dự án là dữ liệu thật – tuyệt đối không làm mất.** Không tự xoá IndexedDB; hạn chế đổi schema Dexie chính (nếu đổi: tăng version, cập nhật `doc/03-DATA-MODEL.md`, kiểm tra `exportAll` / `importAll` / `syncNowSmart`).
- **Luôn hỏi PO trước khi làm** việc đụng: dữ liệu tiền, đồng bộ/sao lưu, schema, bảo mật, đổi diện mạo lớn.
- Mỗi thay đổi: `npm test && npm run build && npm run lint` phải xanh trước khi push; cập nhật CHANGELOG, badge README, `doc/01-SRS.md`, `doc/05-TEST-PLAN.md`, nhật ký phiên; sự cố → `doc/07-INCIDENT-LOGS-AND-CASE-STUDIES.md`.
- UI: dùng bàn phím số in-app, `InAppSelectModal`, `AppDialog`; không dùng `alert/confirm/prompt`, `<select>`, `autoFocus`; modal dùng `createPortal` + `.sheetbg` (xem 08-HANDOVER §5).
- Ngày lưu `YYYY-MM-DD`, hiển thị `dd/MM/yyyy` qua `fmtDmy`; không `new Date('YYYY-MM-DD')` để hiển thị.
- Trả lời tiếng Việt kể cả khi skill viết/yêu cầu tiếng Anh (vd. báo cáo `/ponytail-review`).
- Ảnh chụp màn hình: chỉ chụp/xem khi cần làm rõ để sửa chính xác (tốn token); gửi PO tối đa 1–3 ảnh của thay đổi rõ nhất.

## Khác với quy tắc chung (PO chốt 2026-11-19)

- **Nhật ký phiên:** mỗi phiên một file `doc/sessions/YYYY-MM-DD-NN.md` (mục đánh số), không dùng `docs/SESSIONS_LOG.md`. Việc dở dang ghi vào mục cuối của file đó và `doc/08-HANDOVER.md` §2/§6.
- **Plugin:** không cài plugin. Skill `ponytail`, `ui-ux-pro-max`, `tiepnhan` chép sẵn trong `.claude/skills/` (xem `SOURCES.md`) để chạy được cả trên cloud; không bật plugin cùng tên trong `.claude/settings.json`. **Không dùng graphify** (code nhỏ, không cần).
- **PO tự mở phiên mới:** gõ `/tiepnhan` để AI đọc bàn giao và báo trạng thái. Không dùng `/init` (tạo lại `CLAUDE.md`). Xem 08-HANDOVER §8.

## Skill trong dự án

- Thay đổi code: áp dụng `ponytail` – chọn giải pháp nhỏ nhất và tái sử dụng code có sẵn trong `app/src/` (nhưng không bao giờ cắt bớt kiểm tra an toàn dữ liệu).
- Việc giao diện (trang, component, màu, font, biểu đồ): dùng `ui-ux-pro-max` trước khi viết code; quy tắc UI ở trên được ưu tiên.
- Trước khi đề xuất merge: chạy `/ponytail-review` trên nhánh hiện tại.

## Bảo mật

- Không commit API key/secret, `.env*`, file sao lưu JSON/CSV hay dữ liệu tài chính cá nhân. Dùng `app/.env.example` làm mẫu.
- Ngoại lệ có chủ đích: cấu hình Firebase web (`app/src/firebaseConfig.ts`) và Google OAuth **Client ID** (`app/src/googleDrive.ts`) là thông tin công khai, được phép nằm trong code. Không bao giờ commit **Client secret**.
- `.claude/settings.json` (nếu có): chỉ cấu hình dùng chung – không token, key hay đường dẫn máy cá nhân (cấu hình riêng ở `.claude/settings.local.json`, đã gitignore).
