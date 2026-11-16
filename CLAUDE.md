# MoneySave

Ứng dụng quản lý tài chính cá nhân, local-first (React 19 + Vite + Dexie). Mã nguồn nằm trong `app/`, tài liệu trong `doc/` (bắt đầu từ `doc/00-INDEX.md`).

## Lệnh thường dùng (chạy trong `app/`)

- `npm run dev`: chạy môi trường phát triển
- `npm run build`: kiểm tra kiểu TypeScript rồi build
- `npm test`: chạy test (`node --test src/*.test.ts`)
- `npm run lint`: lint bằng oxlint

## Quy tắc làm việc

- Thay đổi code: áp dụng nguyên tắc ponytail, chọn giải pháp nhỏ nhất và tái sử dụng code có sẵn trong `app/src/`.
- Việc liên quan giao diện (trang, component, màu, font, biểu đồ): dùng skill `ui-ux-pro-max` trước khi viết code.
- Trước khi mở PR: chạy `/ponytail-review` trên nhánh hiện tại.
- Không đưa API key, Google Client ID thật hay dữ liệu tài chính cá nhân vào repo. Dùng `app/.env.example` làm mẫu.
