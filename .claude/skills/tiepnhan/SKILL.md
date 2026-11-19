---
name: tiepnhan
description: >
  Tiếp nhận dự án MoneySave khi chủ dự án (PO) TỰ mở một phiên mới và gõ /tiepnhan.
  Đọc tài liệu bàn giao + nhật ký phiên mới nhất, kiểm tra git/phiên bản, báo PO ngắn gọn rồi chờ yêu cầu.
  Không dùng cho phiên do AI tự tạo khi bàn giao (phiên đó đã có lời nhắn bàn giao riêng).
---

# Tiếp nhận phiên MoneySave (/tiepnhan)

Chỉ đọc, không sửa code, không commit trong bước này.

1. Đọc (chỉ các phần này để tiết kiệm token):
   - `CLAUDE.md` (đã tự nạp – không cần đọc lại nếu đã có trong ngữ cảnh).
   - `doc/08-HANDOVER.md` §2 (trạng thái), §5 (cảnh báo), §6 (việc tồn đọng), §8 (quy tắc làm việc).
   - Nhật ký phiên mới nhất: file có tên lớn nhất trong `doc/sessions/` (`ls doc/sessions | sort | tail -1`), đọc các mục cuối.
2. Kiểm tra nhanh:
   - `git fetch -q origin && git status -sb && git log --oneline -3 origin/main`
   - Phiên bản: `grep '"version"' app/package.json`
   - Nhánh `claude/*` còn commit chưa lên `main`: `for b in $(git branch -r | grep 'origin/claude/' | sed 's#origin/##'); do n=$(git rev-list --count origin/main..origin/$b); [ "$n" -gt 0 ] && echo "$b: $n"; done`
3. Nếu cần chạy test/build: `cd app && npm ci` (container mới chưa có `node_modules`) rồi `npm test && npm run build`. Chỉ chạy khi PO giao việc code.
4. Báo PO bằng tiếng Việt, xưng "tôi", gọi "bạn", tối đa 4–5 dòng:
   - "Tôi đã tiếp nhận phiên mới." + phiên bản đang chạy trên `main`.
   - Việc còn treo (nhánh chưa merge, việc chờ PO thử, quyết định đang chờ) – mỗi việc 1 dòng.
   - 1 khuyến nghị việc nên làm tiếp (nếu có), rồi chờ yêu cầu.
5. Nếu có nhánh `claude/*` của phiên trước chưa merge (trừ `claude/s4b-drive-sync` – dự phòng, cố ý chưa merge): gộp vào nhánh làm việc của phiên này trước khi làm (`.claude/WORKFLOW.md` mục Nhánh).
6. Sau đó làm việc theo `CLAUDE.md`, `.claude/WORKFLOW.md` và `08-HANDOVER §8`. Bàn giao theo §8.7 (gửi PO lời nhắn mở phiên mới).
