# 04 · Route, middleware và view

> Trạng thái: **ĐÃ CHỐT** (2026-10-29). Đây là contract. Muốn đổi phải được nhóm duyệt.

Form HTML chỉ gửi được GET/POST, nên sửa và xoá dùng POST tới `/edit`, `/delete` thay vì PUT/DELETE, không cần thư viện method-override. Cột "Quyền" là middleware gắn vào route.

## Bảng route

| Method | URL | Use case | Xử lý | Quyền (middleware) |
| --- | --- | --- | --- | --- |
| GET | `/?page=1` | UC01 | Danh sách bài đã đăng, 10 bài/trang | Công khai |
| GET | `/posts/:slug` | UC02 | Chi tiết bài + bình luận; bài nháp chỉ tác giả/admin xem | Công khai |
| GET | `/search?q=` | UC03 | Tìm theo tiêu đề | Công khai |
| GET | `/categories/:slug` | UC03 | Bài theo danh mục | Công khai |
| GET | `/tags/:tag` | UC03 | Bài theo tag | Công khai |
| GET, POST | `/register` | UC04 | Form / xử lý đăng ký | Chưa đăng nhập |
| GET, POST | `/login` | UC05 | Form / xử lý đăng nhập | Chưa đăng nhập |
| POST | `/logout` | UC06 | Huỷ session | `requireLogin` |
| GET, POST | `/profile` | UC07 | Xem / cập nhật email, mật khẩu | `requireLogin` |
| GET | `/posts/new` | UC08 | Form tạo bài | `requireLogin` |
| POST | `/posts` | UC08 | Lưu bài mới | `requireLogin` |
| GET, POST | `/posts/:slug/edit` | UC09 | Form / lưu sửa bài | `requireLogin` + `requireOwnerOrAdmin` |
| POST | `/posts/:slug/delete` | UC10, UC16 | Xoá bài + bình luận của bài | `requireLogin` + `requireOwnerOrAdmin` |
| GET | `/me/posts` | UC11 | Bài của tôi, cả nháp | `requireLogin` |
| POST | `/posts/:slug/comments` | UC12 | Thêm bình luận | `requireLogin` |
| POST | `/comments/:id/delete` | UC13, UC16 | Xoá bình luận | `requireLogin` + `requireOwnerOrAdmin` |
| GET, POST | `/admin/categories` | UC14 | Danh sách / thêm danh mục | `requireAdmin` |
| POST | `/admin/categories/:id/edit` | UC14 | Đổi tên danh mục | `requireAdmin` |
| POST | `/admin/categories/:id/delete` | UC14 | Xoá danh mục, bài về "Chưa phân loại" | `requireAdmin` |
| GET | `/admin/users` | UC15 | Danh sách người dùng | `requireAdmin` |
| POST | `/admin/users/:id/lock` | UC15 | Khoá / mở khoá (đảo `isLocked`) | `requireAdmin` |
| POST | `/admin/users/:id/role` | UC15 | Đổi vai trò member/admin | `requireAdmin` |
| GET | `/admin/posts` | UC16 | Tất cả bài, kể cả nháp, kèm nút xoá | `requireAdmin` |

Lưu ý:

- Khai báo `/posts/new` trước `/posts/:slug`, nếu không Express sẽ hiểu `new` là một slug.
- Admin không tự khoá hoặc hạ quyền chính mình.

## Middleware

| Tên | Kiểm tra | Không đạt thì |
| --- | --- | --- |
| `loadUser` (gắn toàn app) | Đọc `userId` trong session, gán `res.locals.currentUser` cho view | Bỏ qua, coi là khách |
| `requireLogin` | Có `currentUser` | Redirect `/login` |
| `requireOwnerOrAdmin` | `doc.author` = user hiện tại hoặc `role = admin` | Trả trang 403 |
| `requireAdmin` | `role = admin` | Trả trang 403 |

## Danh sách view (EJS)

| View | Dùng cho | Nội dung chính |
| --- | --- | --- |
| `partials/header`, `partials/footer` | Mọi trang | Header: logo, menu danh mục, ô tìm kiếm, nút đăng nhập/đăng ký hoặc menu người dùng; footer; vùng thông báo lỗi/thành công |
| `posts/index` | `/`, `/search`, `/categories/:slug`, `/tags/:tag` | Tiêu đề trang, thẻ bài (tiêu đề, tác giả, ngày, danh mục, đoạn trích), phân trang |
| `posts/show` | `/posts/:slug` | Nội dung bài, tag, nút sửa/xoá (nếu có quyền), danh sách bình luận, form bình luận |
| `posts/form` | Tạo và sửa bài | Tiêu đề, nội dung, chọn danh mục, tag (cách nhau dấu phẩy), trạng thái nháp/đăng |
| `posts/mine` | `/me/posts` | Bảng bài của tôi: tiêu đề, trạng thái, ngày, nút sửa/xoá |
| `auth/login`, `auth/register` | Đăng nhập, đăng ký | Form + lỗi validate |
| `users/profile` | `/profile` | Đổi email, đổi mật khẩu (nhập mật khẩu cũ) |
| `admin/categories` | Quản lý danh mục | Bảng danh mục + số bài, form thêm, sửa tên, xoá |
| `admin/users` | Quản lý người dùng | Bảng user: username, email, vai trò, trạng thái, nút khoá/đổi vai trò |
| `admin/posts` | Kiểm duyệt | Bảng mọi bài, lọc theo trạng thái, nút xoá |
| `errors/404`, `errors/403` | Lỗi | Thông báo + link về trang chủ |

Phần lặp lại (thẻ bài, phân trang, header, footer) tách thành partial trong `views/partials/`. Không dùng thư viện layout: mỗi view tự `include` header và footer.
