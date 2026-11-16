# 08 – Tài liệu bàn giao (Handover) cho AI / kỹ sư tiếp nhận

> Cập nhật: 2026-11-16 · production `main` = **v2.9.0** · nhánh `claude/happy-sagan-q2h7at` = **v2.10.0** (S3, chờ PO duyệt + đổi rule Firebase).

## 1. Dự án là gì
**MoneySave** – PWA quản lý tài chính cá nhân, offline-first, tiếng Việt. Live: https://moneysavedl.vercel.app (Vercel tự deploy khi push `main`).
Stack: React 19, TypeScript, Vite 8, Dexie (IndexedDB), Recharts, vite-plugin-pwa; đồng bộ Firebase + mã hoá E2EE (AES-GCM, PBKDF2) – xem `02-ARCHITECTURE.md`.

## 2. Trạng thái hiện tại
- Git: working tree sạch, không có thay đổi chưa đẩy (đã kiểm tra 2026-11-04).
- `npm test`: 60/60 pass. `main` = v2.9.0 (bc50340); v2.10.0 (S3) trên nhánh `claude/happy-sagan-q2h7at` chờ PO duyệt. Dexie schema chính `version(4)` (không đổi); CSDL phụ `moneysave_safety` `version(2)` (thêm bảng `kv`).
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
- **[TODO-1] Unit test cho `GlobalSearchModal`** (`app/src/components/GlobalSearchModal.tsx`): logic tìm kiếm nằm inline trong `.tsx` nên `node --test` không import được. Việc cần làm: tách các hàm thuần (tìm chức năng, tìm giao dịch đa tiêu chí, tìm kế hoạch/định kỳ/ghi chú) sang `lib.ts` (hoặc `search.ts`), để component chỉ gọi hàm; viết test trong `app/src/*.test.ts`; chạy `npm test && npm run build`; đổi T-26 và số test trong README/INDEX/TEST-PLAN.
- **[TODO-2] Xác minh thủ công v2.8.0 trên iOS Safari & Android Chrome thật** (T-26 trong `05-TEST-PLAN.md`): bàn phím in-app/`InAppSelectModal` không bật bàn phím OS, báo cáo Phân bổ/Rút, anti-drag không đơ, nút Reload cập nhật SW, tìm kiếm. AI không có thiết bị thật → cần PO xác nhận; kết quả ghi vào T-26 (đổi ⏳ thành ✅/❌) và INC mới nếu có lỗi.
- **[TODO-3] Kiểm tra Vercel deploy** của commit mới nhất thành công (commit `9f53f54` từng push khi build lỗi TS, đã sửa ở `28a25d2`); bài học: luôn chờ `npm run build` thành công TRƯỚC khi push (file `*.test.ts` cũng bị `tsc -b` kiểm tra).
- Backlog: đính kèm ảnh hoá đơn, đa tiền tệ, khoá PIN/WebAuthn, CI tự động.

## 7. Cách làm việc với PO
PO (duyle) giao tiếp tiếng Việt; trả lời tiếng Việt, ngắn gọn; hoàn tất mỗi yêu cầu theo quy trình mục 4.

## 8. Quy tắc làm việc mới (từ 2026-11-16, tiếp quản bởi Claude Opus trên Claude Code cloud)
1. **Vai trò:** Opus = kỹ sư trưởng: lập kế hoạch, review độc lập, tư vấn để PO (non-tech) quyết định. Opus tự làm các lát nhỏ nhanh gọn; lát lặp/khối lượng lớn giao Sonnet (subagent) và Opus review.
2. **Ngân sách phiên:** mỗi phiên chat tối đa ~300k token hoặc 1 lần compact. Nếu vượt nhẹ thì làm xong lát đang dở rồi bàn giao.
3. **Bàn giao cuối phiên:** cập nhật nhật ký `doc/sessions/YYYY-MM-DD-NN.md` (các mục đánh số), mục 2 & 6 của file này; tài liệu dài chia mục `§n` để phiên sau chỉ đọc đúng mục cần.
4. **Nhánh & deploy (PO đã chốt D4):** làm trên nhánh `claude/*`, PO thử bản preview Vercel của nhánh, PO nói "merge" thì mới đẩy lên `main` (= production).
5. **Kế hoạch hiện hành:** `09-REVIEW-AND-PLAN-2026-11.md` (§5 lát S1…S5).
