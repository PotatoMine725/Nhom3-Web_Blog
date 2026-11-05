# Report: Trang admin (người dùng, kiểm duyệt bài) và hồ sơ

- Ngày: 2026-11-05
- Plan: `plans/2026-11-05-admin-profile.md`
- Branch / PR: `feature/admin-profile` (tạo từ `origin/chore/test-setup`, đã gồm commit bỏ file `.whl`), PR vào `dev` do điều phối viên tạo

## Đã làm

- `src/controllers/adminController.js`, `src/routes/admin.js` (mới): `GET /admin/users`, `POST /admin/users/:id/lock`, `POST /admin/users/:id/role`, `GET /admin/posts?status=&page=`. Mỗi route gắn `requireAdmin` (khách và member đều 403). id sai định dạng hoặc không tồn tại → 404. Admin tự khoá / tự đổi vai trò mình → không đổi DB, flash lỗi, về bảng (nút cũng bị ẩn ở dòng của mình).
- `src/controllers/userController.js`, `src/routes/users.js` (mới): `GET, POST /profile` (`requireLogin`). Hai form gửi cùng URL, phân biệt bằng field ẩn `form=email|password`. Đổi email validate như đăng ký (schema `validateSync(['email'])`, trùng → "Email đã được sử dụng", bắt cả lỗi 11000). Đổi mật khẩu bắt nhập đúng mật khẩu hiện tại, cùng luật độ dài với đăng ký, dùng `user.setPassword()`.
- View mới: `users/profile.ejs`, `admin/users.ejs`, `admin/posts.ejs` (bảng + lọc Tất cả / Đã đăng / Nháp + phân trang bằng `partials/pagination`, nút Xoá gửi `POST /posts/:slug/delete`).
- `partials/header.ejs`: menu người dùng thêm "Hồ sơ"; admin thêm nhóm "Quản trị" gồm "Người dùng", "Kiểm duyệt bài". Không link tới `/admin` (UC20 chưa làm).
- `app.js`: thêm 2 router (`users`, `admin`), mount ở `/`.
- `postController.remove`: chỉ đổi dòng redirect — tác giả xoá về `/me/posts` như cũ, admin xoá bài người khác về `/admin/posts`.
- UC16 xoá bình luận bất kỳ: đã có sẵn qua `requireOwnerOrAdmin` ở `routes/comments.js`; không sửa, thêm test xác nhận.
- `tests/admin-profile.test.js`: 13 test (quyền khách/member/admin, khoá/mở khoá + BR8 đá ra ở request kế tiếp, đổi vai trò, tự khoá/tự hạ quyền, 404 id sai, lọc bài theo trạng thái, admin xoá bài + bình luận (BR6), tác giả xoá về `/me/posts`, admin xoá bình luận người khác, `/profile` cho khách, đổi email hợp lệ/trùng/sai định dạng, đổi mật khẩu sai cũ/ngắn/không khớp/thành công).

## Lệch so với plan (nếu có) và lý do

- Không lệch. Quyết định tự chốt ghi ở plan: đổi vai trò là đảo member ↔ admin; tự khoá → flash thay vì 403; đổi email không cần mật khẩu (sát spec); `/admin/posts` có phân trang 10 bài.

## Kết quả kiểm thử

Chạy trên cloud container, **không có MongoDB**, nên mọi test cần DB bị skip. Cần chạy lại `npm test` trên máy có `mongod` đang bật.

| # | Thao tác | Kết quả | Đạt? |
| --- | --- | --- | --- |
| 1 | `node --check` các file JS sửa/mới | Không lỗi | Đạt |
| 2 | `npm test` | 34 test: 18 pass (biên dịch EJS), 16 skip (cần MongoDB: 3 của auth + 13 của admin-profile), 0 fail | Đạt (phần chạy được) |
| 3 | Render thử `admin/users`, `admin/posts`, `users/profile`, `posts/mine` bằng EJS với dữ liệu giả (script tạm ngoài repo) | Admin thấy menu Quản trị, member không; dòng của mình không có nút; phân trang giữ `status`; bài mất tác giả hiện "(không rõ)" | Đạt |
| 4 | Test DB trong `tests/admin-profile.test.js` | Chưa chạy được (skip) | Chưa kiểm |

## Việc còn lại

- Chạy `npm test` có MongoDB và kiểm thủ công trên trình duyệt các mục 1–13 trong plan.
- Khi làm UC20 (bước 10) thêm link "Thống kê" vào header. Agent danh mục thêm link "Danh mục" vào cùng nhóm "Quản trị" (có thể đụng `header.ejs`, xung đột nhỏ).
- Câu hỏi mở cho nhóm: có bắt nhập mật khẩu khi đổi email không; có đăng xuất session khác khi đổi mật khẩu không.
