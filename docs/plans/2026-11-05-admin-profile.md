# Plan: Trang admin (người dùng, kiểm duyệt bài) và hồ sơ

- Ngày: 2026-11-05
- Branch: `feature/admin-profile` (tạo từ `origin/chore/test-setup` = `dev` + hạ tầng test, PR vào `dev`)
- Spec liên quan: `specs/01-business-requirements.md` (BR2, BR3, BR8), `specs/02-use-cases.md` (UC07, UC15, UC16), `specs/03-data-model.md` (User, "Logic gắn với schema"), `specs/04-routes-and-views.md` (bảng route, middleware, view `users/profile`, `admin/users`, `admin/posts`), `specs/05-architecture.md` (bước 6)
- Đáp ứng: UC07, UC15, UC16, BR2, BR3, BR8

## Mục tiêu

Admin xem danh sách người dùng, khoá/mở khoá và đổi vai trò member/admin; xem mọi bài (kể cả nháp), lọc theo trạng thái và xoá bài. Thành viên tự đổi email và đổi mật khẩu ở `/profile`.

## Ngoài phạm vi

- Trang thống kê `/admin` (UC20, bước 10). Header **không** link tới `/admin` để không ra link 404.
- Quản lý danh mục `/admin/categories` (UC14) và like/bookmark (UC17, UC18): agent khác làm song song, không đụng `routes/categories.js`.
- Đổi username (spec chỉ ghi đổi email, mật khẩu).
- Đăng xuất các session khác sau khi đổi mật khẩu (xem rủi ro).
- Script `create-admin` (bước 2, không thuộc plan này).

## Các bước

1. **Controller admin** — file: `src/controllers/adminController.js` (mới)
   - `users` (UC15): `User.find().sort({ createdAt: 1 })`, render `admin/users`.
   - `toggleLock` (UC15, BR8): id sai định dạng (`mongoose.isValidObjectId`) hoặc không có user → 404. Target là chính mình → flash lỗi "Không thể tự khoá tài khoản của mình", redirect `/admin/users`. Ngược lại đảo `isLocked`, `save()`, flash, redirect. User bị khoá bị đá ra ở request kế tiếp nhờ `loadUser` (đã có).
   - `toggleRole` (UC15): giống trên; target là chính mình → flash lỗi "Không thể tự đổi vai trò của mình"; ngược lại `member` ↔ `admin`.
   - `posts` (UC16, BR5): `?status=draft|published` lọc, giá trị khác = tất cả. Phân trang 10 bài/trang dùng `partials/pagination` (giữ `status` khi chuyển trang). `populate('author', 'username')`, sort mới nhất trước.
2. **Route admin** — file: `src/routes/admin.js` (mới). Mỗi route gắn `requireAdmin` riêng (không `router.use(requireAdmin)` vì router mount ở `/` sẽ chặn mọi URL). `requireAdmin` đã trả 403 cho cả khách (spec: khách cũng 403).
3. **Hồ sơ** — file: `src/controllers/userController.js`, `src/routes/users.js` (mới)
   - `GET /profile` (`requireLogin`): render `users/profile` với email hiện tại.
   - `POST /profile` (`requireLogin`): trang có 2 form gửi cùng URL, phân biệt bằng field ẩn `form=email|password`.
     - Đổi email (BR3): trim + lowercase, `validateSync(['email'])` như đăng ký; trùng email user khác → "Email đã được sử dụng"; bắt cả lỗi 11000. Email không đổi → flash "Không có thay đổi".
     - Đổi mật khẩu: nạp user `select('+passwordHash')`, `comparePassword(currentPassword)` sai → "Mật khẩu hiện tại không đúng"; mật khẩu mới cùng luật đăng ký (≥ 6 ký tự, ≤ 72 byte, nhập lại khớp); `user.setPassword()` rồi `save()`.
     - Lỗi → render lại 400 kèm lỗi (giữ email đã nhập, không giữ mật khẩu). Thành công → flash, redirect `/profile`.
     - `form` khác 2 giá trị trên → redirect `/profile`.
4. **View** — `src/views/users/profile.ejs`, `src/views/admin/users.ejs`, `src/views/admin/posts.ejs` (mới), cùng kiểu `posts/mine.ejs` (bảng Bootstrap, nút POST trong form, `confirm()` trước xoá/khoá).
5. **Header + menu trái** — `src/views/partials/header.ejs`: menu người dùng thêm "Hồ sơ"; admin thêm "Người dùng", "Kiểm duyệt bài". Không thêm "Thống kê" (chưa có route). Không sửa `left-nav` để giảm xung đột với agent khác.
6. **app.js** — thêm 2 dòng `require` + 2 dòng `app.use('/', ...)`.
7. **Xoá bài từ trang kiểm duyệt** — `src/controllers/postController.js`, hàm `remove`: chỉ đổi dòng redirect. Người xoá là tác giả → `/me/posts` như cũ; admin xoá bài người khác → `/admin/posts`. Dùng lại route `POST /posts/:slug/delete` (spec ghi route này cho cả UC10, UC16).
8. **Admin xoá bình luận bất kỳ (UC16)** — kiểm lại: `routes/comments.js` dùng `requireOwnerOrAdmin`, `isOwnerOrAdmin` ở `renderShow` hiện nút xoá cho admin. Không cần sửa; thêm test.
9. **Test** — `tests/admin-profile.test.js` (cần MongoDB, tự skip nếu không có).

## Kiểm thử

| # | Thao tác | Kết quả mong đợi |
| --- | --- | --- |
| 1 | Khách / member mở `/admin/users`, `/admin/posts`, POST lock/role | 403 |
| 2 | Admin mở `/admin/users` | 200, thấy username, email của mọi user |
| 3 | Admin POST `/admin/users/<id member>/lock` | 302, `isLocked` = true; lần nữa → false |
| 4 | Member bị khoá gửi request kế tiếp | Coi như khách (`/me/posts` → `/login`) (BR8) |
| 5 | Admin khoá / đổi vai trò chính mình | Không đổi DB, flash lỗi |
| 6 | Admin POST role cho member | role = admin; lần nữa → member |
| 7 | id sai định dạng / không tồn tại | 404 |
| 8 | Admin `/admin/posts`, `?status=draft`, `?status=published` | Thấy cả nháp; lọc đúng |
| 9 | Admin xoá bài người khác qua `/posts/:slug/delete` | Bài + bình luận bị xoá, về `/admin/posts` |
| 10 | Admin xoá bình luận người khác | 302, bình luận mất |
| 11 | Khách mở `/profile` | 302 `/login` |
| 12 | Đổi email hợp lệ / trùng / sai định dạng | Lưu / 400 "Email đã được sử dụng" / 400 lỗi định dạng |
| 13 | Đổi mật khẩu: sai mật khẩu cũ / quá ngắn / không khớp / đúng | 400 / 400 / 400 / đăng nhập được bằng mật khẩu mới |
| 14 | `npm test` không có MongoDB | Test DB skip, views.test.js pass |

## Quyết định tự chốt (người dùng đi vắng)

1. Đổi vai trò là **đảo** member ↔ admin (giống "đảo `isLocked`"), không nhận giá trị role từ form → không phải validate enum.
2. Admin tự khoá/hạ quyền mình: không trả 403 mà flash lỗi và quay lại bảng (thân thiện hơn, nút cũng bị ẩn trong bảng ở dòng của chính mình).
3. Đổi email **không** bắt nhập mật khẩu (spec chỉ yêu cầu mật khẩu cũ khi đổi mật khẩu). Ghi ở câu hỏi mở.
4. `/admin/posts` có phân trang 10 bài/trang (dùng lại partial sẵn có) để bảng không dài vô hạn.
5. Admin được khoá/hạ quyền admin khác (spec chỉ cấm tự mình).

## Rủi ro / câu hỏi mở / đề xuất sửa spec

- Đổi email không cần mật khẩu: ai cầm được session có thể đổi email. Đề xuất (nếu nhóm muốn): yêu cầu mật khẩu hiện tại cho cả đổi email.
- Đổi mật khẩu không đăng xuất các session khác của user. Chấp nhận vì chạy localhost; muốn làm thì cần xoá session trong collection `sessions` theo userId.
- `specs/04` header ghi admin có "Thống kê"; tạm chưa có vì `/admin` làm ở bước 10. Link "Danh mục" do agent danh mục thêm.
- Có thể hạ quyền admin cuối cùng khác? Không: admin không tự hạ quyền mình, nên luôn còn ít nhất 1 admin (người đang thao tác).
