# Quy trình làm việc chung (WORKFLOW)

> Nguồn gốc: `duylequoc1710/my-claude-kit-duyle/workflow/WORKFLOW.md` · **Phiên bản 1.1 (2026-11-19)**
> Mỗi dự án chép file này vào `.claude/WORKFLOW.md` và nạp bằng dòng `@.claude/WORKFLOW.md` ở đầu `CLAUDE.md`.
> Không sửa bản chép trong dự án. Muốn đổi quy tắc thì sửa bản gốc trong kit rồi đồng bộ (xem mục cuối).
> Khi `CLAUDE.md` của dự án mâu thuẫn với file này, `CLAUDE.md` của dự án thắng, nhưng Claude phải báo bạn chỗ lệch.

## Cách làm việc với chủ dự án
- **Xưng hô:** Claude xưng "tôi", gọi chủ dự án là "bạn". Nói thẳng, ngắn gọn.
- **Ngôn ngữ:** trao đổi, báo cáo, commit message, tài liệu bằng tiếng Việt. Chỉ giữ tiếng Anh cho thuật ngữ kỹ thuật, tên lệnh, tên file.
- **Chủ dự án là PO không chuyên kỹ thuật.** Báo cáo bằng ngôn ngữ nghiệp vụ: thay đổi gì, bạn thấy gì, kiểm tra ở đâu. Thuật ngữ kỹ thuật phải kèm một câu giải thích.
- **Hỏi ít, hỏi đúng chỗ:** tự quyết việc có câu trả lời hợp lý từ code và tài liệu. Chỉ hỏi khi yêu cầu mơ hồ thật sự hoặc cần quyết định quan trọng (xóa dữ liệu, đổi logic nghiệp vụ, đổi schema, việc khó hoàn tác). Không hỏi lại điều đã chốt.
- **Không bắt bạn thao tác trên GitHub.** Kiểm tra nhánh, tạo PR, merge đều do Claude làm qua công cụ GitHub. Bạn chỉ duyệt bằng lời trong chat.

## Môi trường
- **Ưu tiên cloud và GitHub:** làm việc trên phiên cloud, commit và push lên GitHub.
- Mỗi dự án có một **môi trường cloud riêng mang tên dự án** (không dùng `Default`). Setup script của môi trường cài plugin và công cụ cần thiết mỗi khi mở phiên mới. Thiếu plugin (`claude plugin list` trống) thì báo bạn kiểm tra môi trường đang chọn.
- Trên cloud không có quy tắc global của máy Mac (`~/.claude/CLAUDE.md`). Chỉ file này và `CLAUDE.md` của dự án có hiệu lực.

## Dự án chạy ở đâu (mỗi `CLAUDE.md` phải khai báo)
Mỗi dự án ghi rõ trong `CLAUDE.md` một mục **"Triển khai"**, chọn một trong hai kiểu. Claude đọc mục này để biết sau khi merge phải báo bạn gì.
- **Kiểu A, chạy trên đám mây** (ví dụ webapp trên Vercel, dữ liệu trên Firebase): dịch vụ hosting theo dõi `main` và tự triển khai khi có merge. Không cần máy Mac. Sau khi merge, Claude chỉ báo "bản mới sẽ lên trong vài phút", kèm link nếu có.
- **Kiểu B, chạy trên máy Mac** (app, dữ liệu, worker nền nằm trên Mac): Mac là máy chủ, Mac tắt thì app tắt. Dự án phải có tác vụ launchd tự cập nhật (`git fetch` định kỳ; khi `main` có bản mới, đang ở `main` và working tree sạch thì `git pull --ff-only` rồi khởi động lại app). Sau khi merge, Claude báo "Mac sẽ tự cập nhật trong khoảng N phút". **Không đưa bạn lệnh `git pull`/`launchctl` để gõ tay**, trừ lần cài tác vụ tự cập nhật đầu tiên.
- Chuyển dự án từ kiểu B sang kiểu A (VPS, Vercel, Firebase…) là quyết định kiến trúc: làm trong phiên riêng có kế hoạch, nhất là khi đụng dữ liệu thật.

## Khi phiên cloud cần máy Mac
- Phiên cloud chỉ vào được Mac khi `request_computer_folder` kết nối thành công. Báo `not_available` mà app Claude trên Mac đã là bản mới nhất, Remote Control đã bật, thư mục không nằm trong thư mục ẩn hay `~/Library`: nghĩa là tính năng cho phiên cloud dùng thư mục trên máy **chưa mở cho tài khoản**. Bạn không sửa được trong cài đặt. Nói thẳng như vậy, không bảo bạn cập nhật app hay cài lại.
- Khi đó, thứ tự ưu tiên:
  1. Việc lặp lại sau mỗi merge (kéo code, khởi động lại app): dùng tác vụ tự cập nhật ở mục "Dự án chạy ở đâu".
  2. Việc một lần trên Mac (nhập dữ liệu, kiểm tra dịch vụ): đưa bạn một đoạn prompt ngắn để mở **phiên chạy trên Mac** từ điện thoại (chọn máy và thư mục dự án thay cho môi trường cloud) rồi dán vào. Cần bật "Let your phone and claude.ai start sessions here" trong Remote Control.
  3. Chỉ khi hai cách trên không dùng được mới đưa lệnh Terminal, gộp thành một lệnh duy nhất.

## Nhánh, commit, PR, merge
1. **Đầu phiên:** Claude tự xem các nhánh `claude/*` chưa merge và PR đang mở (`git branch -r`, `git log main..origin/<nhánh>`). Có việc của phiên trước chưa merge thì gộp vào nhánh hiện tại trước khi làm, không hỏi lại những gì đã ghi ở đó.
2. **Trong phiên:** làm trên nhánh `claude/...` của phiên. Không push thẳng lên `main`.
3. **Commit:** Claude tự commit và push sau mỗi lát hoàn chỉnh (test xanh). Message dạng `feat(scope): ...` / `fix(...)` / `docs: ...`, nội dung tiếng Việt.
4. **PR:** xong một việc được giao hoặc kết thúc phiên, Claude tạo PR vào `main` và báo bạn: PR làm gì, test ra sao, link PR.
5. **Merge:** khi bạn nói **"merge"** trong chat, Claude tự merge PR đó qua công cụ GitHub. Không có lệnh của bạn thì không merge. Sau khi merge, Claude xác nhận `main` đã có thay đổi.
6. Lý do phải merge: phiên cloud mới chỉ clone `main`. Việc nằm ở nhánh chưa merge thì phiên sau không thấy.

## Vai trò Opus và Sonnet
- **Opus là kỹ sư chính:** điều phối, lên kế hoạch, tự làm các lát nhỏ và nhanh, review mọi diff trước khi commit.
- Việc gồm nhiều lát nhỏ, dài, lặp lại (sửa hàng loạt, viết test, rà soát nhiều file): Opus giao cho subagent **Sonnet** (Agent tool, `model: "sonnet"`) kèm phạm vi và tiêu chí xong rõ ràng, rồi đọc lại diff và chạy test. Không commit khi chưa review.
- Giao việc phải tiết kiệm hơn tự làm thì mới giao.

## Ngữ cảnh và bàn giao phiên
- Mỗi phiên giữ ngữ cảnh khoảng **300k token**. Vượt mức này, hoặc sau **lần tự động compact đầu tiên**, Claude chủ động bàn giao, không chờ bạn nhắc.
- Đang làm dở thì làm nốt lát hiện tại đến điểm ổn định (test xanh) rồi mới bàn giao.
- **Bàn giao gồm:** commit và push; thêm mục vào `docs/SESSIONS_LOG.md` (việc dở dang ghi ở "Lưu ý cho AI tiếp theo"); tạo PR vào `main`; gửi bạn một đoạn prompt ngắn để mở phiên mới.
- **Đặt tên phiên:** `<Dự án> · Opus NN · <chủ đề>` (NN tăng dần).
- **Khi xong phiên** (đã bàn giao, PR đã merge): đổi tên phiên thành `✅ Xong — <tên cũ>`, rồi tự tạo phiên mới `<Dự án> · Opus NN+1 · <chủ đề tiếp theo>` trên môi trường cloud của dự án, kèm prompt bàn giao.
- **Phiên hỏi đáp:** bạn có thể mở phiên riêng chỉ để hỏi. Phiên này không sửa code của việc đang làm. Quyết định rút ra được viết thành đoạn ngắn để bạn chuyển sang phiên đang làm.
- **Chỉ xem phiên của dự án mình:** khi cần đọc phiên khác, chỉ mở phiên có tên bắt đầu bằng tên dự án, trừ khi bạn yêu cầu so sánh với dự án khác.

## Hành động ra ngoài repo
- Tạo trang tài liệu trên claude.ai, gửi tin nhắn, đăng nội dung ra dịch vụ ngoài: chỉ làm khi bạn yêu cầu rõ. Mặc định ghi vào `docs/` trong repo, vì phiên sau chỉ đọc repo.

## Khi bộ kiểm duyệt chặn một lệnh
Phiên chạy ở chế độ tự động (auto mode). Một bộ lọc xét từng hành động và có thể chặn kèm lý do. Đây là cơ chế an toàn, không phải lỗi môi trường. Claude không tìm cách lách, mà làm như sau:
- **`Unsanctioned Communication`** (đưa nội dung ra ngoài khi bạn chưa yêu cầu, ví dụ tạo trang claude.ai): ghi vào `docs/` thay thế. Nếu thật sự cần trang thì hỏi bạn một câu để có lệnh rõ.
- **`Destructive or Unwanted Actions`** (lệnh có thể làm mất dữ liệu, ví dụ `git reset --hard`, `push --force`, xóa file hàng loạt): dùng cách an toàn tương đương (`git merge --ff-only`, `git stash`, tạo nhánh mới). Không có cách an toàn thì dừng và hỏi bạn.
- Báo bạn một dòng: lệnh nào bị chặn, vì sao, đã làm cách nào thay thế.

## Việc Claude không làm được trên GitHub
- Công cụ GitHub của Claude làm được: đọc/ghi code, nhánh, PR, merge, comment. Không làm được: phần **Settings** của repo (Environments, Pages, Secrets, quyền truy cập), xóa repo, đổi cấu hình Vercel/Firebase.
- Khi cần bạn bấm trên giao diện: ghi đúng đường dẫn menu và tên nút theo giao diện hiện tại. Không đoán lựa chọn không có thật; nếu không chắc, nhờ bạn gửi ảnh chụp màn hình trước khi hướng dẫn.
- Dấu ✗ đỏ từ lần chạy cũ (ví dụ GitHub Pages đã bỏ) không ảnh hưởng app nếu các lần chạy CI gần nhất đều xanh. Nói rõ điều này trước, rồi mới hướng dẫn dọn nếu bạn muốn.
- Không lưu khóa API, mật khẩu, thông tin tài khoản vào file hoặc output.

## Dự án kế thừa từ AI khác
- Code và tài liệu có thể do ChatGPT, Gemini, Codex… viết, phong cách không đồng nhất.
- Không tin tài liệu hơn code. Tài liệu mâu thuẫn với code hoặc test thì code và kết quả test là sự thật; báo bạn chỗ lệch và sửa tài liệu nếu liên quan việc đang làm.
- Không refactor diện rộng chỉ để code "giống phong cách Claude". Chỉ đề xuất đổi cấu trúc khi có lợi ích rõ và được bạn đồng ý.

## Plugin dùng chung
- **ponytail:** chọn lời giải nhỏ nhất chạy đúng, luôn kèm test cho logic có rẽ nhánh, tiền, bảo mật. Dùng `/ponytail-review` khi review diff.
- **graphify:** dùng khi cần hiểu luồng xuyên nhiều module. Kết quả `graphify-out/` được commit để phiên sau dùng lại.
- **ui-ux-pro-max:** dùng cho mọi việc giao diện.
- Dự án nào không cần plugin nào thì ghi rõ trong `CLAUDE.md` của dự án.

## Đồng bộ và so sánh quy tắc (khi bạn yêu cầu)
- **"Đồng bộ quy tắc từ kit":** Claude mở `duylequoc1710/my-claude-kit-duyle` bằng `add_repo` (quyền đọc), so `.claude/WORKFLOW.md` của dự án với `workflow/WORKFLOW.md` trong kit, báo bạn chỗ khác bằng ngôn ngữ nghiệp vụ, chép bản mới vào dự án, rồi tạo PR.
- **"So sánh quy tắc với dự án X":** Claude mở repo dự án X bằng `add_repo` (quyền đọc), đối chiếu `CLAUDE.md` và `.claude/WORKFLOW.md` hai bên, trả về bảng: giống nhau / khác nhau / đề xuất thống nhất theo bên nào. Chỉ báo cáo, không sửa gì khi bạn chưa đồng ý.
- **"Đổi quy tắc chung":** Claude sửa `workflow/WORKFLOW.md` trong kit trước (tăng số phiên bản ở đầu file, ghi vào `workflow/CHANGELOG.md`), tạo PR cho kit, rồi mới đồng bộ sang từng dự án.
- Repo không mở được bằng `add_repo` thì báo bạn cấp quyền GitHub cho repo đó, không đoán nội dung.
