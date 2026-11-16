# 08 – Tài liệu bàn giao (Handover) cho AI / kỹ sư tiếp nhận

> Cập nhật: 2026-11-16 (phiên 02) · production `main` = **v2.12.0** + skill Claude Code (`.claude/skills`, CLAUDE.md) · OAuth đã Publish; chờ PO thử sao lưu Drive thật (T-30).

## 1. Dự án là gì
**MoneySave** – PWA quản lý tài chính cá nhân, offline-first, tiếng Việt. Live: https://moneysavedl.vercel.app (Vercel tự deploy khi push `main`).
Stack: React 19, TypeScript, Vite 8, Dexie (IndexedDB), Recharts, vite-plugin-pwa; đồng bộ Firebase + mã hoá E2EE (AES-GCM, PBKDF2) – xem `02-ARCHITECTURE.md`.

## 2. Trạng thái hiện tại
- Git: working tree sạch, không có thay đổi chưa đẩy (đã kiểm tra 2026-11-04).
- PO đã đổi rule Firebase (két `moneysave_users`), xác nhận 2 thiết bị đồng bộ khớp (2026-11-16). Giai đoạn 2 khoá két cũ: **PO báo đã hoàn tất (2026-11-16)** theo 09 §6.3 – rule chỉ còn `moneysave_users`. Nếu có lỗi đồng bộ: kiểm tra rule, hoàn tác theo 06 mục 5. Bước tuỳ chọn còn lại: xoá nhánh `moneysave_vaults` trên tab Data sau vài tuần ổn định.
- `npm test`: 76/76 pass. `main` = v2.16.0 (U1–U5 giao diện xong + sửa để khoá két cũ an toàn). Dexie schema chính `version(4)` (không đổi); CSDL phụ `moneysave_safety` `version(2)` (thêm bảng `kv`).
- Tính năng hoàn thành đến v2.8.0: xem `../CHANGELOG.md`, `06-ROADMAP.md`, `01-SRS.md` (FR-01…FR-39).

## 3. Cấu trúc thư mục
- `app/` – mã nguồn (`src/db.ts` DB + import/export + sync savings; `lib.ts` logic tiền/kỳ sao kê/lộ trình; `cloudSync.ts`, `auth.ts`, `safetyBackup.ts`, `dataAudit.ts`, `smartInsights.ts`, `scrollLock.ts`; `pages/` 5 trang; `components/` modal/picker/keypad; `app.test.ts` unit test).
- `doc/` – tài liệu (00-INDEX là mục lục); `doc/sessions/` nhật ký phiên; `doc/adr/` quyết định kiến trúc.

## 4. Quy trình bắt buộc
1. `cd app && npm install` (lần đầu); `npm run dev` để chạy.
2. Sau mỗi thay đổi: `npm test && npm run build` (0 lỗi TS).
3. Cập nhật tài liệu: SRS + Roadmap + CHANGELOG + README badge + nhật ký phiên; đổi dữ liệu → tăng Dexie version + `03-DATA-MODEL.md`; sự cố → `07-INCIDENT-LOGS...`.
4. `git add -A && git commit && git push origin main`, kiểm tra bản live.
5. Nâng `version` trong `app/package.json` theo từng release.

## 5. Cảnh báo quan trọng (rút từ sổ sự cố `07-`)
- **Không bao giờ** tự động xoá IndexedDB khi khởi động (INC-07 mất dữ liệu thật).
- Dùng bàn phím số in-app và `InAppSelectModal`/`AppDialog`; không dùng `alert/confirm/prompt`, `<select>`, `autoFocus`, `<label>` bọc nút mở modal (INC-09, 15, 16).
- Modal dùng `createPortal` + `.sheetbg`; kiểm tra z-index, khoá cuộn (`scrollLock.ts`).
- Ngày: lưu `YYYY-MM-DD`, hiển thị `dd/MM/yyyy` qua `fmtDmy`; không `new Date('YYYY-MM-DD')` để hiển thị (lệch múi giờ).
- Sửa DB phải kiểm tra `exportAll`, `importAll`, `syncNowSmart`.
- Thẻ tín dụng: tách `previousStatementDebt` và `currentCycleSpend` (INC-17).
- PWA cache: sau deploy cần cơ chế cập nhật SW (INC-10).
- Bảo mật: không commit `.env*`, file backup JSON/CSV cá nhân (đã có trong `.gitignore`); `app/.env.local` chỉ có ở máy cục bộ. Cấu hình Firebase xem `firebaseConfig.ts` và `06-DEPLOYMENT-GUIDE.md`.

## 6. Việc còn tồn đọng / gợi ý
- Đã hoàn tất (2026-11-04): FR-40…43 trong SRS, T-25/T-26 trong test plan, INC-18 trong sổ sự cố, unit test `syncSavingsGoalHistoryToTxs`, dọn Roadmap.
- ✅ [TODO-1] Đã xong v2.10.1: logic tìm kiếm ở `app/src/search.ts`, test `search.test.ts` (T-29).
- **[S4a] Google Drive:** code xong v2.11.0 (Client ID PO đã tạo, xem `10-…` §6). Còn: PO thử đăng nhập Google thật trên iPhone PWA/Android/máy tính (T-30). Origin chỉ có `moneysavedl.vercel.app` + localhost → bản Preview nhánh KHÔNG đăng nhập Google được trừ khi PO thêm origin của Preview. D3 = không mã hoá file sao lưu.
- **[UI] Cải tiến giao diện:** kế hoạch `11-UI-PLAN.md`. U1 + U2 xong v2.13.0 (đã lên `main`); U4 (v2.14.0) + U5 (v2.15.0) xong, đã lên `main` (nhật ký `sessions/2026-11-16-03.md`). U3 xong v2.16.0, đã lên `main` (nhật ký `sessions/2026-11-16-04.md`). Kế hoạch giao diện U1–U5 hoàn tất. Gợi ý tiếp: S4a (PO thử Google Drive thật, T-30), TODO-2 (PO xác minh trên máy thật), S4b. Lưu ý: skill viết tiếng Anh nhưng luôn trả lời PO bằng tiếng Việt. Skill `ui-ux-pro-max`, `ponytail` có sẵn trong `.claude/skills/`.
- **[S4b] Định hướng PO (09 §7):** riêng tư + chi phí 0 → đề xuất chuyển đồng bộ sang Drive từng người; chờ PO chốt sau khi S4a ổn.
- **[TODO-2] Xác minh thủ công v2.8.0 trên iOS Safari & Android Chrome thật** (T-26 trong `05-TEST-PLAN.md`): bàn phím in-app/`InAppSelectModal` không bật bàn phím OS, báo cáo Phân bổ/Rút, anti-drag không đơ, nút Reload cập nhật SW, tìm kiếm. AI không có thiết bị thật → cần PO xác nhận; kết quả ghi vào T-26 (đổi ⏳ thành ✅/❌) và INC mới nếu có lỗi.
- **[TODO-3] Kiểm tra Vercel deploy** của commit mới nhất thành công (commit `9f53f54` từng push khi build lỗi TS, đã sửa ở `28a25d2`); bài học: luôn chờ `npm run build` thành công TRƯỚC khi push (file `*.test.ts` cũng bị `tsc -b` kiểm tra).
- ✅ CI tự động (v2.16.1): `.github/workflows/ci.yml` chạy test/build/lint mỗi lần push/PR – xem tab Actions trên GitHub; badge CI trong README.
- Backlog: đính kèm ảnh hoá đơn, đa tiền tệ, khoá PIN/WebAuthn.

## 7. Cách làm việc với PO
PO (duyle) giao tiếp tiếng Việt; trả lời tiếng Việt, ngắn gọn; hoàn tất mỗi yêu cầu theo quy trình mục 4.

## 8. Quy tắc làm việc mới (từ 2026-11-16, tiếp quản bởi Claude Opus trên Claude Code cloud)
1. **Vai trò:** Opus = kỹ sư trưởng: lập kế hoạch, review độc lập, tư vấn để PO (non-tech) quyết định. Opus tự làm các lát nhỏ nhanh gọn; lát lặp/khối lượng lớn giao Sonnet (subagent) và Opus review.
2. **Ngân sách phiên:** mỗi phiên chat tối đa ~300k token hoặc 1 lần compact. Nếu vượt nhẹ thì làm xong lát đang dở rồi bàn giao.
3. **Bàn giao cuối phiên:** cập nhật nhật ký `doc/sessions/YYYY-MM-DD-NN.md` (các mục đánh số), mục 2 & 6 của file này; tài liệu dài chia mục `§n` để phiên sau chỉ đọc đúng mục cần.
4. **Nhánh & deploy (PO đã chốt D4):** làm trên nhánh `claude/*`, PO thử bản preview Vercel của nhánh, PO nói "merge" thì mới đẩy lên `main` (= production).
6. **Ảnh chụp & ngôn ngữ (PO chốt 2026-11-16):** chỉ chụp/xem ảnh khi cần để sửa chính xác; gửi PO 1–3 ảnh, không gửi bộ đầy đủ. Luôn trả lời PO bằng tiếng Việt, kể cả khi skill viết tiếng Anh. Xưng "tôi", gọi PO là "bạn".
5. **Kế hoạch hiện hành:** `09-REVIEW-AND-PLAN-2026-11.md` (§5 lát S1…S5). S1/S2/S3/S5 xong; còn S4 (chờ Client ID) và GĐ2 khoá két cũ (09 §6.3).
7. **Tự tạo phiên mới khi bàn giao (PO xác nhận trực tiếp 2026-11-16):** khi gần hết ngân sách phiên (~300k token) hoặc PO yêu cầu bàn giao, AI tự tạo phiên mới bằng `create_session` (claude-code-remote) kèm lời nhắn bàn giao đầy đủ (trạng thái `main`/nhánh, việc tiếp theo, file cần đọc theo §n, quy tắc xưng hô/ngôn ngữ) – không chờ PO tự mở. AI chủ động làm các bước đã thống nhất (nhánh `claude/*`, test/build/lint, review, tài liệu, push nhánh) mà không hỏi lại từng bước. **Chỉ hỏi PO khi:** yêu cầu không rõ ràng/mơ hồ, hoặc cần PO xác nhận logic quan trọng (dữ liệu tiền, đồng bộ/sao lưu, schema, bảo mật, thay đổi diện mạo lớn). Đẩy lên `main` vẫn chỉ khi PO nói "merge".
