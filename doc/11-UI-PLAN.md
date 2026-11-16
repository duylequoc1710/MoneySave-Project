# 11 – Kế hoạch cải tiến giao diện (2026-11-16)

> Nguồn: skill `ui-ux-pro-max` (`.claude/skills/`) + đo tự động bằng Playwright trên v2.12.0 (màn hình 390×844, dark mode, chế độ ngoại tuyến).
> Chia mục §n – phiên sau chỉ đọc mục cần. Quy tắc dự án (CLAUDE.md, 08-HANDOVER §5) luôn được ưu tiên hơn gợi ý của skill.

## §1. Hiện trạng đo được
| Trang | Chữ < 12px | Nút/link | Nút nhỏ hơn 40px | Nút chỉ có icon, thiếu nhãn đọc màn hình | Emoji hiển thị |
|---|---|---|---|---|---|
| Tổng quan | 15 | 16 | 12 | 1 | 15 |
| Sổ giao dịch | 6 | 15 | 10 | 3 | 8 |
| Ngân sách | 6 | 9 | 5 | 1 | 7 |
| Ví của tôi | 6 | 12 | 8 | 1 | 27 |
| Cài đặt | 7 | 19 | 13 | 1 | 25 |

Quan sát thêm (ảnh chụp):
- Nút nổi **"＋ Thêm giao dịch" che nội dung** cuối thẻ ở Tổng quan (thẻ Smart Insights bị đè).
- Cỡ chữ gốc 14.5px (skill khuyến nghị 16px cho thân bài trên di động); nhiều chữ phụ 11–11.5px.
- **Emoji làm icon** cho thanh điều hướng, nút 🔍 🔄 📅 ‹ ›, tiêu đề mục → hiển thị khác nhau giữa iPhone/Android/máy tính, không đổi màu theo theme.
- Nút icon (🔍 🔄 📅 ‹ ›) và link chữ ("Xem tất cả", "+ Thêm thẻ") có vùng bấm < 44×44px; "+ Thêm thẻ" bị xuống dòng.
- Điểm tốt nên giữ: nền đen OLED, font hệ thống (SF Pro – số đọc rõ, không tải font), màu xanh lá/đỏ thu–chi rõ, thanh dock 4 mục.

## §2. Gợi ý của skill – chọn lọc
- Áp dụng: vùng chạm ≥ 44×44px & cách nhau ≥ 8px; nhãn `aria-label` cho nút chỉ có icon; icon SVG thống nhất (Lucide/Heroicons) thay emoji ở phần **giao diện**; thân chữ ≥ 16px (≥ 12px cho chữ phụ); số tiền `tabular-nums`; tương phản ≥ 4.5:1 cả sáng/tối; chuyển động 150–300ms và tôn trọng `prefers-reduced-motion`; nút nổi không che nội dung; trạng thái trống có hướng dẫn.
- **Không áp dụng:** phong cách Glassmorphism (mờ kính – tốn pin, giảm tương phản trên nền đen), bộ font Caveat/Quicksand (chữ viết tay – không hợp app tài chính), bố cục "Product Demo" (dành cho trang giới thiệu). Giữ font hệ thống.
- Emoji **danh mục/ví do người dùng chọn** là dữ liệu của người dùng → giữ nguyên, chỉ thay emoji của khung giao diện.

## §3. Lát đề xuất (mỗi lát: test + build + ảnh chụp trước/sau, không đổi dữ liệu)
| Lát | Nội dung | Rủi ro | Công sức |
|---|---|---|---|
| **U1** ✅ v2.13.0 | Dễ bấm & dễ đọc: vùng chạm ≥ 44px cho nút icon/link, `aria-label`, chữ phụ ≥ 12px, nút nổi không che nội dung (chừa khoảng dưới / thu gọn khi cuộn), "+ Thêm thẻ" không xuống dòng | Thấp (CSS) | Nhỏ |
| **U2** ✅ v2.13.0 | Bộ icon SVG thống nhất (`lucide-react`, chỉ nạp icon dùng tới, ~vài KB): thanh điều hướng, header (tìm kiếm, đồng bộ, lịch), mũi tên ‹ ›, tiêu đề mục, Cài đặt. Icon đổi màu theo theme, trạng thái "đang chọn" rõ hơn | Thấp–vừa | Vừa |
| **U3** | Chữ & màu: cỡ chữ gốc 15–16px theo thang thống nhất, số tiền `tabular-nums`, gom màu thành token ngữ nghĩa, kiểm tra tương phản giao diện Sáng | Vừa (ảnh hưởng mọi trang) | Vừa |
| **U4** ✅ v2.14.0 | Tổng quan gọn & trạng thái trống: thứ tự thẻ theo mức dùng, hướng dẫn khi chưa có dữ liệu (Sổ giao dịch, Thẻ tín dụng, Ngân sách) | Thấp | Nhỏ–vừa |
| **U5** | Chuyển động mượt: hiệu ứng mở/đóng modal, nhấn nút (150–250ms), tắt khi máy bật "Giảm chuyển động" | Thấp | Nhỏ |

Khuyến nghị thứ tự: **U1 → U2 → U4 → U3 → U5**. (U1 + U2 xong ở v2.13.0, phiên 2026-11-16-03 – còn lại: nút chữ 30–35px như "+ Cài đặt mới", tab Tối/Sáng chưa đạt 44px → gộp vào U3; modal (‹ Đóng, ›) vẫn dùng ký tự/emoji → làm cùng U3/U4.) U1 + U2 mang lại khác biệt nhìn thấy rõ nhất với rủi ro thấp.

## §4. Quy trình mỗi lát
1. Chạy `search.py` của skill cho đúng vấn đề (`--domain ux` / `icons` / `typography`), đối chiếu quy tắc dự án.
2. Sửa trên nhánh `claude/*`; `npm test && npm run build`; ảnh chụp Playwright **chỉ khi cần làm rõ để sửa chính xác**; gửi PO tối đa 1–3 ảnh của thay đổi rõ nhất (PO chốt 2026-11-16).
3. Đối chiếu checklist `references/pro-rules.md` của skill; `/ponytail-review` trước khi đề xuất merge.
4. PO xem trên điện thoại → "merge".
