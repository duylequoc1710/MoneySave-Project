# ADR-0001: PWA offline-first thay vì app native

- Trạng thái: Chấp nhận · Ngày: 2026-10-24

## Bối cảnh
Cần chạy Android/iOS/macOS, PO không rành kỹ thuật, không muốn hosting phức tạp. Máy phát triển chỉ có Node/git; không có Xcode, Android SDK, Flutter.

## Quyết định
React + TypeScript + Vite, đóng gói PWA; dữ liệu IndexedDB qua Dexie; đồng bộ cloud là lớp thêm sau (Giai đoạn 2).

## Phương án đã loại
- Flutter/native: cần cài Xcode/SDK, ký chứng chỉ, store; khó tự vận hành.
- iCloud/CloudKit: không hỗ trợ Android.

## Hệ quả
+ Một codebase, cập nhật tức thì, không qua store.
− iOS PWA không có thông báo đẩy ổn định, và có thể dọn dữ liệu cục bộ → bắt buộc có sao lưu và sync.

## Quyết định liên quan
PO chọn “làm local trước” (2026-10-24); backend sync hoãn.
