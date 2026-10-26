# 02 – Kiến trúc

## Công nghệ
| Lớp | Lựa chọn | Lý do |
|---|---|---|
| UI | React 19 + TypeScript | Phổ biến, dễ bảo trì |
| Build | Vite | Nhanh, hỗ trợ PWA |
| PWA | vite-plugin-pwa (Workbox) | Service worker + manifest tự sinh |
| Lưu cục bộ | Dexie (IndexedDB) + dexie-react-hooks | Offline-first, UI tự cập nhật (live query) |
| Biểu đồ | Recharts | Line chart, responsive |
| Ngày | date-fns (locale vi) | |
| Điều hướng | react-router-dom (HashRouter) | Chạy được trên host tĩnh không cần rewrite |

## Sơ đồ
```
 UI (pages) ──useLiveQuery──▶ Dexie/IndexedDB (nguồn sự thật cục bộ)
     │                              ▲
     └── TxForm / Accounts ─────────┘ ghi
                                    │ (Giai đoạn 2)
                              Sync adapter ⇄ Cloud (Firebase/Supabase)
```

## Cấu trúc mã (`app/src`)
- `db.ts` – schema Dexie, seed dữ liệu mặc định, export/import JSON.
- `lib.ts` – định dạng tiền/ngày, `effectOn()` tính tác động giao dịch lên số dư quỹ.
- `pages/Overview.tsx`, `Ledger.tsx`, `Accounts.tsx` – 3 màn hình chính.
- `components/TxForm.tsx` – form thêm/sửa giao dịch (bottom sheet).
- `index.css` – design tokens (biến CSS), sáng/tối, responsive (thanh tab dưới ở mobile, sidebar ở desktop ≥900px).

## Quyết định chính
Xem `adr/0001-pwa-offline-first.md`.

## Bảo mật & riêng tư
- Giai đoạn 1: dữ liệu chỉ nằm trên thiết bị, không gửi đi đâu.
- Giai đoạn 2: bắt buộc đăng nhập; rule backend chỉ cho `uid` chủ sở hữu đọc/ghi; khoá API client không phải bí mật nhưng rule phải chặt.

## Hiệu năng
Giao dịch được truy vấn theo index `date` (theo tháng); Tổng quan hiện đọc toàn bộ bảng txs – đủ tốt tới vài chục nghìn dòng; nếu cần sẽ chuyển sang bảng tổng hợp theo tháng.

## Cập nhật 2026-10-26
- `safetyBackup.ts` – bản sao an toàn tự động + nhắc sao lưu; `scrollLock.ts` – khoá cuộn nền khi mở sheet.
- `pages/*` được nạp lười (`React.lazy`); Recharts tách chunk riêng (`vite.config.ts`).
- `components/accounts/*` – các form/modal của trang Ví (tách từ `Accounts.tsx`).
- Hàm chia tuần `buildCalendarWeekBuckets` nằm trong `lib.ts` (có unit test).
- Phiên bản app `__APP_VERSION__` được inject lúc build (`package.json` version · ngày giờ · mã commit).
- Hiệu năng: đo 50.000 giao dịch chỉ ≈ 1 ms/lần tính trong bộ nhớ nên **chưa cần** truy vấn theo tháng; sẽ xem lại nếu dữ liệu vượt vài trăm nghìn dòng.
