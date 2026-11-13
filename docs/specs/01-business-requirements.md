# 01 · Phân tích nghiệp vụ

> Trạng thái: **ĐÃ CHỐT** (2026-10-29). Đây là contract. Muốn đổi phải được nhóm duyệt và ghi vào mục Lịch sử thay đổi.

## Tổng quan

Hệ thống là một blog nhiều tác giả. Thành viên đăng bài, người đọc xem bài và bình luận, admin quản lý nội dung. Hệ thống chạy trên localhost bằng Node.js + MongoDB.

## Mục tiêu

- Người đọc tìm và đọc bài viết dễ dàng: danh sách mới nhất, lọc theo danh mục, tìm theo từ khoá.
- Thành viên tự quản lý bài viết của mình (CRUD).
- Có bình luận dưới mỗi bài viết.
- Admin giữ trật tự: quản lý danh mục và người dùng, xoá nội dung vi phạm.
- Có tương tác và thống kê để thể hiện phần CSDL: like, lưu bài, lượt xem, bài nổi bật, ảnh bìa, trang thống kê cho admin (aggregation).
- Thành viên lập thread (nhóm theo chủ đề / tag), tham gia thread và đăng bài vào thread.

## Phạm vi

| Trong phạm vi | Ngoài phạm vi (không làm, tránh over-engineering) |
| --- | --- |
| Đăng ký, đăng nhập, đăng xuất (session) | Đăng nhập Google/Facebook, xác thực email |
| CRUD bài viết, bài nháp / đã đăng | Trình soạn thảo phức tạp, lên lịch đăng bài |
| Danh mục, tag, tìm kiếm full-text theo tiêu đề (text index của MongoDB) kết hợp lọc danh mục + tag | Full-text search engine (Elasticsearch) |
| Bình luận 1 cấp | Bình luận lồng nhau, like bình luận, follow, thông báo |
| Like và lưu (bookmark) bài viết | Soạn bài bằng Markdown / trình soạn thảo rich text |
| Đếm lượt xem, trang bài nổi bật | Đếm lượt xem không trùng theo người / IP |
| Một ảnh bìa cho mỗi bài, lưu thư mục local | Nhiều ảnh trong nội dung, resize ảnh, lưu ảnh trên cloud |
| Trang quản trị đơn giản cho admin, có trang thống kê | Biểu đồ bằng thư viện JS, deploy lên internet |
| Thread theo chủ đề: tạo, tham gia / rời, đăng bài vào thread, người tạo hoặc admin xoá thread | Thread riêng tư, duyệt thành viên, mod / phân quyền trong thread, sửa thông tin thread, chuyển quyền người tạo, thông báo |
| Giao diện cho máy tính (màn hình ≥ 992px) | Tối ưu và kiểm thử giao diện điện thoại / màn hình nhỏ: phần đã có (menu ☰, ô tìm kiếm thu gọn) giữ nguyên, không sửa hay kiểm thêm |

## Quy tắc nghiệp vụ

| Mã | Quy tắc |
| --- | --- |
| BR1 | Chỉ người đã đăng nhập mới được viết bài và bình luận. |
| BR2 | Chỉ tác giả hoặc admin được sửa, xoá bài viết. Bình luận cũng vậy. |
| BR3 | Username và email là duy nhất. Mật khẩu lưu dạng hash (bcrypt), không lưu bản rõ. |
| BR4 | Mỗi bài có slug duy nhất, sinh tự động từ tiêu đề (ví dụ `/posts/hoc-nodejs`). |
| BR5 | Bài ở trạng thái nháp (draft) chỉ tác giả và admin thấy. |
| BR6 | Xoá bài viết thì xoá luôn các bình luận, like, bookmark và file ảnh bìa của bài đó. |
| BR7 | Trang chủ hiển thị bài đã đăng, mới nhất trước, 10 bài mỗi trang. |
| BR8 | Tài khoản bị admin khoá thì không đăng nhập được. |
| BR9 | Mỗi thành viên like / lưu một bài tối đa 1 lần; bấm lần nữa là bỏ like / bỏ lưu. Chỉ like, lưu được bài đang ở trạng thái đã đăng. Bài chuyển về nháp thì giữ nguyên like / bookmark nhưng ẩn khỏi "Đã lưu" và thống kê; đăng lại thì hiện lại. |
| BR10 | Mỗi lần mở trang chi tiết bài đã đăng thì lượt xem tăng 1, trừ khi người mở là tác giả bài. |
| BR11 | Ảnh bìa chỉ nhận JPG, PNG, WEBP, tối đa 2 MB; lưu trong thư mục `uploads/` trên máy chạy server. |
| BR12 | Mỗi thành viên tham gia một thread tối đa 1 lần. Người tạo thread tự động là thành viên và không rời được thread của mình. Chỉ thành viên của thread mới gắn bài vào thread đó (khi tạo bài hoặc đổi thread khi sửa bài). Rời thread thì bài đã đăng vẫn ở lại trong thread. |
| BR13 | Chỉ người tạo thread hoặc admin được xoá thread. Xoá thread thì xoá danh sách thành viên; bài trong thread không bị xoá mà chuyển về "không thuộc thread". |
| BR14 | Bài trong thread vẫn là bài bình thường: theo BR5 (nháp chỉ tác giả / admin thấy) và hiện ở trang chủ, tìm kiếm, danh mục, tag, nổi bật, thống kê như mọi bài, kèm nhãn tên thread. Xem thread và bài trong thread không cần tham gia. |

## Lịch sử thay đổi

| Ngày | Thay đổi | Người duyệt |
| --- | --- | --- |
| 2026-10-29 | Bản đầu tiên | Hoang |
| 2026-10-29 | Thêm cách tạo admin đầu tiên bằng script `npm run create-admin` (specs/04) | Hoang |
| 2026-10-29 | Thêm middleware `redirectIfLoggedIn` cho `/register`, `/login` (specs/04) | Hoang |
| 2026-10-29 | `username` lưu chữ thường, để `An_01` và `an_01` không thành hai tài khoản (specs/03) | Hoang |
| 2026-10-29 | Ghi rõ `loadUser` xoá `userId`, `role` khỏi session khi user bị xoá hoặc bị khoá (specs/04) | Hoang |
| 2026-10-30 | Thêm tính năng mở rộng: like, bookmark, lượt xem + bài nổi bật, ảnh bìa, thống kê admin, tìm kiếm full-text kết hợp lọc (BR6 mở rộng, BR9–BR11, UC17–UC20) | Hoang |
| 2026-10-30 | Cookie session `sameSite: 'lax'`; chấp nhận ảnh bìa bài nháp xem được nếu có link (specs/04) | Hoang |
| 2026-11-06 | Cập nhật mô tả header và thêm menu trái trong specs/04 cho khớp giao diện sau UI/UX PR 1–4b (chỉ mô tả, không đổi route/quyền/dữ liệu) | Hoang |
| 2026-11-06 | Cập nhật mô tả trang lỗi (thêm errors/400, errors/500, khung `partials/error-page`) và thêm `partials/right-sidebar` trong specs/04 cho khớp giao diện (chỉ mô tả, không đổi route/quyền/dữ liệu) | Hoang |
| 2026-11-10 | Tên danh mục duy nhất không phân biệt hoa thường (specs/03) | Hoang |
| 2026-11-10 | Giao diện điện thoại / màn hình nhỏ đưa ra ngoài phạm vi: không phát triển, không kiểm thử thêm | Hoang |
| 2026-11-13 | Thêm tính năng thread: BR12–BR14, UC21–UC25 (specs/02), collection `threads`, `threadmembers` và field `Post.thread` (specs/03), route + view thread (specs/04), bước 12 (specs/05). Bài trong thread hiện ở mọi nơi kèm nhãn thread | Hoang |
