# Mục lục tài liệu MoneySave

| File | Nội dung |
|---|---|
| 01-SRS.md | Đặc tả yêu cầu (chức năng, phi chức năng, user stories, tiêu chí nghiệm thu) |
| 02-ARCHITECTURE.md | Kiến trúc, công nghệ, luồng dữ liệu, bảo mật |
| 03-DATA-MODEL.md | Các bảng dữ liệu, quy tắc tính số dư |
| 04-USER-GUIDE.md | Cài lên iPhone/Android/Mac, cách dùng, sao lưu |
| 05-TEST-PLAN.md | Kịch bản & kết quả kiểm thử |
| 06-ROADMAP.md | Trạng thái tính năng, kế hoạch đồng bộ realtime, deploy |
| 07-INCIDENT-LOGS-AND-CASE-STUDIES.md | **Sổ tay sự cố kỹ thuật & Case studies (RCA, giải pháp, quy tắc phòng ngừa)** |
| PLAN-initial.md | Kế hoạch ban đầu (WHY, rủi ro, tiêu chí) |
| adr/ | Architecture Decision Records |
| sessions/ | Nhật ký phiên làm việc (1 file / phiên, tên YYYY-MM-DD-NN.md) |

**Quy ước:** mọi thay đổi tính năng phải cập nhật SRS + Roadmap; thay đổi cấu trúc dữ liệu phải cập nhật DATA-MODEL và tăng `version` của Dexie schema; mọi sự cố/lỗi kỹ thuật phát sinh và bài học kinh nghiệm phải ghi nhận đầy đủ vào file `07-INCIDENT-LOGS-AND-CASE-STUDIES.md` để kỹ sư sau tiếp nhận có thể tra cứu và phòng tránh lặp lại.

**Quy trình deploy (bắt buộc):** App live tại https://moneysavedl.vercel.app, Vercel tự build & deploy mỗi khi push lên nhánh `main` của GitHub. Sau khi hoàn tất mỗi yêu cầu: chạy `cd app && npm test && npm run build`, rồi `git add -A && git commit && git push origin main`, sau đó kiểm tra bản live đã có thay đổi.
