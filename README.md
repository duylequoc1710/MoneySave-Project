# MoneyGo

Ứng dụng quản lý thu chi cá nhân (tương tự MoneyLover), dạng **PWA** – cài như app thật trên Android, iPhone, macOS.

## Cấu trúc thư mục (toàn bộ dự án nằm trong thư mục này)

```
MoneySave-Project/
├── README.md          ← file này
├── app/               ← mã nguồn ứng dụng (React + TypeScript + Vite)
└── doc/               ← TOÀN BỘ tài liệu & session log (*.md)
    ├── 00-INDEX.md
    ├── 01-SRS.md              yêu cầu phần mềm
    ├── 02-ARCHITECTURE.md     kiến trúc
    ├── 03-DATA-MODEL.md       mô hình dữ liệu
    ├── 04-USER-GUIDE.md       cài đặt & sử dụng
    ├── 05-TEST-PLAN.md        kiểm thử
    ├── 06-ROADMAP.md          lộ trình (gồm đồng bộ realtime)
    ├── PLAN-initial.md        kế hoạch ban đầu
    ├── adr/                   quyết định kiến trúc
    └── sessions/              nhật ký từng phiên làm việc
```

## Chạy thử

```bash
cd app
npm install        # lần đầu
npm run dev        # chạy tại http://localhost:5173
npm test           # chạy unit test (effectOn, định dạng, sao lưu/khôi phục)
npm run build      # build bản production vào app/dist
npm run preview    # xem thử bản build
```

## Quy tắc dự án
- Mọi file của dự án chỉ nằm trong thư mục này. Không tạo dữ liệu ngoài.
- Mỗi phiên làm việc ghi 1 file trong `doc/sessions/`.
- Việc ra ngoài sandbox (deploy, tạo tài khoản dịch vụ, cài phần mềm) phải hỏi chủ dự án trước.
