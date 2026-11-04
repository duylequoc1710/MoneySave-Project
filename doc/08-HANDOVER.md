# 08 – Tài liệu bàn giao (Handover) cho AI / kỹ sư tiếp nhận

> Cập nhật: 2026-11-04 · Phiên bản: **v2.8.0** · HEAD `e14bd3f` · Nhánh `main` đồng bộ `origin/main` (https://github.com/duylequoc1710/MoneySave-Project).

## 1. Dự án là gì
**MoneySave** – PWA quản lý tài chính cá nhân, offline-first, tiếng Việt. Live: https://moneysavedl.vercel.app (Vercel tự deploy khi push `main`).
Stack: React 19, TypeScript, Vite 8, Dexie (IndexedDB), Recharts, vite-plugin-pwa; đồng bộ Firebase + mã hoá E2EE (AES-GCM, PBKDF2) – xem `02-ARCHITECTURE.md`.

## 2. Trạng thái hiện tại
- Git: working tree sạch, không có thay đổi chưa đẩy (đã kiểm tra 2026-11-04).
- `npm test`: 47/47 pass. Dexie schema `version(4)` (bảng `funds, categories, txs, budgets, recurrings, savingsGoals`).
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
- **Nợ tài liệu:** `01-SRS.md` chưa có FR riêng cho các hạng mục v2.8.0 (bàn phím in-app, báo cáo savings, anti-drag, reload/search); `05-TEST-PLAN.md` chưa có kịch bản v2.8.0; `07-INCIDENT-LOGS` chưa có case study cho anti-drag freeze.
- **Test:** chưa có unit test cho `syncSavingsGoalHistoryToTxs` và `GlobalSearchModal`.
- Roadmap: Giai đoạn 2/3 đã thực tế hoàn thành (Firebase + Vercel) nhưng mục lục `06-ROADMAP.md` còn ghi "chờ PO" – nên dọn lại. Backlog: đính kèm ảnh hoá đơn, đa tiền tệ, khoá PIN/WebAuthn, CI tự động.
- Chưa xác minh thủ công bản live sau v2.8.0 trên iOS/Android thật.

## 7. Cách làm việc với PO
PO (duyle) giao tiếp tiếng Việt; trả lời tiếng Việt, ngắn gọn; hoàn tất mỗi yêu cầu theo quy trình mục 4.
