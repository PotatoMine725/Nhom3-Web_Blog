# 04 · Route, middleware và view

> Trạng thái: **ĐÃ CHỐT** (2026-10-29). Đây là contract. Muốn đổi phải được nhóm duyệt.

Form HTML chỉ gửi được GET/POST, nên sửa và xoá dùng POST tới `/edit`, `/delete` thay vì PUT/DELETE, không cần thư viện method-override. Cột "Quyền" là middleware gắn vào route.

## Bảng route

| Method | URL | Use case | Xử lý | Quyền (middleware) |
| --- | --- | --- | --- | --- |
| GET | `/?page=1` | UC01 | Danh sách bài đã đăng, 10 bài/trang | Công khai |
| GET | `/posts/:slug` | UC02 | Chi tiết bài + bình luận + số like, lượt xem; bài nháp chỉ tác giả/admin xem; tăng lượt xem (BR10) | Công khai |
| GET | `/search?q=&category=&tag=&page=` | UC03 | Tìm full-text theo tiêu đề, lọc kết hợp danh mục (slug) + tag, 10 bài/trang | Công khai |
| GET | `/popular` | UC19 | 10 bài đã đăng nhiều lượt xem nhất | Công khai |
| GET | `/categories/:slug` | UC03 | Bài theo danh mục | Công khai |
| GET | `/tags/:tag` | UC03 | Bài theo tag | Công khai |
| GET, POST | `/register` | UC04 | Form / xử lý đăng ký | `redirectIfLoggedIn` |
| GET, POST | `/login` | UC05 | Form / xử lý đăng nhập | `redirectIfLoggedIn` |
| POST | `/logout` | UC06 | Huỷ session | `requireLogin` |
| GET, POST | `/profile` | UC07 | Xem / cập nhật email, mật khẩu | `requireLogin` |
| GET | `/posts/new` | UC08 | Form tạo bài | `requireLogin` |
| POST | `/posts` | UC08 | Lưu bài mới | `requireLogin` + `uploadCover` |
| GET, POST | `/posts/:slug/edit` | UC09 | Form / lưu sửa bài | `requireLogin` + `requireOwnerOrAdmin` (+ `uploadCover` ở POST) |
| POST | `/posts/:slug/delete` | UC10, UC16 | Xoá bài + bình luận, like, bookmark và file ảnh bìa của bài (BR6) | `requireLogin` + `requireOwnerOrAdmin` |
| GET | `/me/posts` | UC11 | Bài của tôi, cả nháp | `requireLogin` |
| POST | `/posts/:slug/like` | UC17 | Like / bỏ like, quay lại trang bài | `requireLogin` |
| POST | `/posts/:slug/bookmark` | UC18 | Lưu / bỏ lưu, quay lại trang bài | `requireLogin` |
| GET | `/me/bookmarks?page=` | UC18 | Bài đã lưu (chỉ bài còn `published`), mới lưu nhất trước, 10 bài/trang | `requireLogin` |
| POST | `/posts/:slug/comments` | UC12 | Thêm bình luận | `requireLogin` |
| POST | `/comments/:id/delete` | UC13, UC16 | Xoá bình luận | `requireLogin` + `requireOwnerOrAdmin` |
| GET, POST | `/admin/categories` | UC14 | Danh sách / thêm danh mục | `requireAdmin` |
| POST | `/admin/categories/:id/edit` | UC14 | Đổi tên danh mục | `requireAdmin` |
| POST | `/admin/categories/:id/delete` | UC14 | Xoá danh mục, bài về "Chưa phân loại" | `requireAdmin` |
| GET | `/admin/users` | UC15 | Danh sách người dùng | `requireAdmin` |
| POST | `/admin/users/:id/lock` | UC15 | Khoá / mở khoá (đảo `isLocked`) | `requireAdmin` |
| POST | `/admin/users/:id/role` | UC15 | Đổi vai trò member/admin | `requireAdmin` |
| GET | `/admin/posts` | UC16 | Tất cả bài, kể cả nháp, kèm nút xoá | `requireAdmin` |
| GET | `/admin` | UC20 | Trang thống kê (specs/03, mục "Truy vấn thống kê") | `requireAdmin` |
| GET | `/uploads/<tên file>` | UC02 | File ảnh bìa, phục vụ tĩnh bằng `express.static` | Công khai |

Lưu ý:

- Khai báo `/posts/new` trước `/posts/:slug`, nếu không Express sẽ hiểu `new` là một slug.
- Admin không tự khoá hoặc hạ quyền chính mình.
- `POST /posts` và `POST /posts/:slug/edit` nhận form `multipart/form-data` (có ảnh bìa), nên đi qua middleware `uploadCover` (multer) trước controller. `uploadCover` luôn đặt **sau** middleware kiểm quyền (`requireLogin`, và `requireOwnerOrAdmin` ở route sửa) để khách và người không có quyền không ghi được file lên đĩa.
- Like, bookmark trên bài nháp hoặc bài không tồn tại trả 404 (giống UC02).

## Tạo admin đầu tiên

Đăng ký luôn tạo user với `role = member`, và chỉ admin mới đổi được vai trò (UC15). Vì vậy admin đầu tiên được tạo bằng script chạy trên máy, không qua web:

```bash
npm run create-admin -- <email>
```

- Script `scripts/create-admin.js` kết nối MongoDB theo `.env`, tìm user theo email (user phải đăng ký trước), đặt `role = admin`, in kết quả rồi thoát.
- Không tìm thấy email: báo lỗi, không tạo user mới.
- Chỉ người có quyền truy cập máy chạy server mới làm được, nên không cần thêm route hay giao diện.

## Middleware

| Tên | Kiểm tra | Không đạt thì |
| --- | --- | --- |
| `loadUser` (gắn toàn app) | Đọc `userId` trong session, gán `res.locals.currentUser` cho view | Bỏ qua, coi là khách. User không tồn tại hoặc bị khoá thì xoá `userId`, `role` khỏi session |
| `requireLogin` | Có `currentUser` | Redirect `/login` |
| `requireOwnerOrAdmin` | `doc.author` = user hiện tại hoặc `role = admin` | Trả trang 403 |
| `requireAdmin` | `role = admin` | Trả trang 403 |
| `redirectIfLoggedIn` | Đã đăng nhập | Redirect `/` |
| `uploadCover` | multer `single('coverImage')`: JPG/PNG/WEBP, ≤ 2 MB, lưu vào `uploads/` với tên do server đặt (thời gian + chuỗi ngẫu nhiên + đuôi theo loại file), không dùng tên file gốc (BR11) | Không ném lỗi 500: gắn thông báo lỗi để controller hiện lại form |

## Danh sách view (EJS)

| View | Dùng cho | Nội dung chính |
| --- | --- | --- |
| `partials/header`, `partials/footer` | Mọi trang | Header: logo, link "Nổi bật", menu danh mục, ô tìm kiếm, nút đăng nhập/đăng ký hoặc menu người dùng ("Bài của tôi", "Đã lưu"; admin thêm "Thống kê"); footer; vùng thông báo lỗi/thành công |
| `posts/index` | `/`, `/search`, `/categories/:slug`, `/tags/:tag`, `/popular`, `/me/bookmarks` | Tiêu đề trang, thẻ bài (ảnh bìa nhỏ nếu có, tiêu đề, tác giả, ngày, danh mục, lượt xem, đoạn trích), phân trang (không có ở `/popular`). Trang `/search` có form lọc: từ khoá, chọn danh mục, tag, giữ lại giá trị đã nhập |
| `posts/show` | `/posts/:slug` | Ảnh bìa (nếu có), nội dung bài, tag, lượt xem, số like; nút Like / Lưu (đã đăng nhập, đổi chữ theo trạng thái) hoặc link đăng nhập (khách); nút sửa/xoá (nếu có quyền), danh sách bình luận, form bình luận |
| `posts/form` | Tạo và sửa bài | Tiêu đề, nội dung, chọn danh mục, tag (cách nhau dấu phẩy), trạng thái nháp/đăng, chọn ảnh bìa; form sửa hiện ảnh hiện tại + ô "Xoá ảnh bìa". Form dùng `enctype="multipart/form-data"` |
| `posts/mine` | `/me/posts` | Bảng bài của tôi: tiêu đề, trạng thái, ngày, nút sửa/xoá |
| `auth/login`, `auth/register` | Đăng nhập, đăng ký | Form + lỗi validate |
| `users/profile` | `/profile` | Đổi email, đổi mật khẩu (nhập mật khẩu cũ) |
| `admin/categories` | Quản lý danh mục | Bảng danh mục + số bài, form thêm, sửa tên, xoá |
| `admin/users` | Quản lý người dùng | Bảng user: username, email, vai trò, trạng thái, nút khoá/đổi vai trò |
| `admin/posts` | Kiểm duyệt | Bảng mọi bài, lọc theo trạng thái, nút xoá |
| `admin/dashboard` | `/admin` | Thẻ số liệu tổng, các bảng thống kê; bảng theo tháng có thanh ngang vẽ bằng CSS (độ rộng theo %), không dùng thư viện biểu đồ |
| `errors/404`, `errors/403` | Lỗi | Thông báo + link về trang chủ |

Phần lặp lại (thẻ bài, phân trang, header, footer) tách thành partial trong `views/partials/`. Không dùng thư viện layout: mỗi view tự `include` header và footer.
