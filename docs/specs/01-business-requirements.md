# 01 · Phân tích nghiệp vụ

> Trạng thái: **ĐÃ CHỐT** (2026-10-29). Đây là contract. Muốn đổi phải được nhóm duyệt và ghi vào mục Lịch sử thay đổi.

## Tổng quan

Hệ thống là một blog nhiều tác giả. Thành viên đăng bài, người đọc xem bài và bình luận, admin quản lý nội dung. Hệ thống chạy trên localhost bằng Node.js + MongoDB.

## Mục tiêu

- Người đọc tìm và đọc bài viết dễ dàng: danh sách mới nhất, lọc theo danh mục, tìm theo từ khoá.
- Thành viên tự quản lý bài viết của mình (CRUD).
- Có bình luận dưới mỗi bài viết.
- Admin giữ trật tự: quản lý danh mục và người dùng, xoá nội dung vi phạm.

## Phạm vi

| Trong phạm vi | Ngoài phạm vi (không làm, tránh over-engineering) |
| --- | --- |
| Đăng ký, đăng nhập, đăng xuất (session) | Đăng nhập Google/Facebook, xác thực email |
| CRUD bài viết, bài nháp / đã đăng | Trình soạn thảo phức tạp, lên lịch đăng bài |
| Danh mục, tag, tìm kiếm theo tiêu đề | Full-text search engine (Elasticsearch) |
| Bình luận 1 cấp | Bình luận lồng nhau, like, follow, thông báo |
| Trang quản trị đơn giản cho admin | Upload ảnh, deploy lên internet |

## Quy tắc nghiệp vụ

| Mã | Quy tắc |
| --- | --- |
| BR1 | Chỉ người đã đăng nhập mới được viết bài và bình luận. |
| BR2 | Chỉ tác giả hoặc admin được sửa, xoá bài viết. Bình luận cũng vậy. |
| BR3 | Username và email là duy nhất. Mật khẩu lưu dạng hash (bcrypt), không lưu bản rõ. |
| BR4 | Mỗi bài có slug duy nhất, sinh tự động từ tiêu đề (ví dụ `/posts/hoc-nodejs`). |
| BR5 | Bài ở trạng thái nháp (draft) chỉ tác giả và admin thấy. |
| BR6 | Xoá bài viết thì xoá luôn các bình luận của bài đó. |
| BR7 | Trang chủ hiển thị bài đã đăng, mới nhất trước, 10 bài mỗi trang. |
| BR8 | Tài khoản bị admin khoá thì không đăng nhập được. |

## Lịch sử thay đổi

| Ngày | Thay đổi | Người duyệt |
| --- | --- | --- |
| 2026-10-29 | Bản đầu tiên | Hoang |
| 2026-10-29 | Thêm cách tạo admin đầu tiên bằng script `npm run create-admin` (specs/04) | Hoang |
| 2026-10-29 | Thêm middleware `redirectIfLoggedIn` cho `/register`, `/login` (specs/04) | Hoang |
| 2026-10-29 | `username` lưu chữ thường, để `An_01` và `an_01` không thành hai tài khoản (specs/03) | Hoang |
| 2026-10-29 | Ghi rõ `loadUser` xoá `userId`, `role` khỏi session khi user bị xoá hoặc bị khoá (specs/04) | Hoang |
