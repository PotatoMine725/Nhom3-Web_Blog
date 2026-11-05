# Review: Trang admin (người dùng, kiểm duyệt bài) và hồ sơ (UC07, UC15, UC16)

- Ngày: 2026-11-05
- Người review: Claude (reviewer độc lập)
- PR / branch: `feature/admin-profile` so với `origin/chore/test-setup`
- Đối chiếu: `specs/01-business-requirements.md` (BR2, BR3, BR6, BR8), `specs/02-use-cases.md` (UC07, UC15, UC16), `specs/03-data-model.md` (User), `specs/04-routes-and-views.md`, `plans/2026-11-05-admin-profile.md`, `reports/2026-11-05-admin-profile.md`

## Khớp spec?

- [x] Route, quyền đúng bảng route (specs/04): `GET /admin/users`, `POST /admin/users/:id/lock`, `POST /admin/users/:id/role`, `GET /admin/posts` đều gắn `requireAdmin` (khách và member 403); `GET, POST /profile` gắn `requireLogin`. Xoá bài/bình luận dùng lại route có `requireOwnerOrAdmin`.
- [x] Schema, validate đúng specs/03: đổi email dùng `validateSync(['email'])` của schema, chặn trùng bằng `exists` + bắt lỗi 11000 (BR3). Mật khẩu cùng luật với đăng ký, hash bằng `setPassword` (bcrypt).
- [x] Quy tắc nghiệp vụ: BR8 (khoá thì `loadUser` đá ra ở request kế tiếp, đăng nhập bị chặn), "admin không tự khoá / hạ quyền chính mình" kiểm ở controller (không chỉ ẩn nút), BR6 xoá bình luận khi xoá bài (like/bookmark/ảnh bìa chưa có ở nhánh này).
- [x] Không thêm tính năng ngoài phạm vi: phân trang `/admin/posts` dùng lại partial sẵn có, chấp nhận được.

Bảo mật:

- Role/isLocked không lấy từ form: đổi vai trò là đảo `member` ↔ `admin`, không nhận giá trị từ body. Đổi hồ sơ luôn nạp user theo `res.locals.currentUser._id` (không lấy id từ form).
- `:id` kiểm bằng `mongoose.isValidObjectId` → 404, không ra CastError 500.
- `passwordHash` chỉ được `select('+passwordHash')` trong `changePassword`; view chỉ nhận `email`, `errors`. Bảng `/admin/users` dùng `User.find()` mặc định (không có hash).
- EJS: dữ liệu người dùng đều in bằng `<%= %>`; `<%-` chỉ dùng cho `include`. Username trong `confirm('...')` an toàn vì schema chỉ cho `[a-zA-Z0-9_]`.
- Không cần `session.regenerate` vì không đổi danh tính phiên; đổi mật khẩu không đăng xuất các phiên khác (đã ghi ở câu hỏi mở của plan).

Test: `npm test` (không có MongoDB) → 34 test, 18 pass, 16 skip, 0 fail. `views.test.js` biên dịch được 3 view mới.

## Vấn đề

| # | Mức | Chỗ | Mô tả | Đề xuất |
| --- | --- | --- | --- | --- |
| 1 | Cao | `tests/admin-profile.test.js:21` (`setup()`) | `h.createUser({ username: 'an', ... })`: username 2 ký tự, schema `minlength: 3` → `ValidationError` ("Username từ 3 đến 30 ký tự", đã thử bằng `validateSync`). Mọi test gọi `setup()` (12/13 test) sẽ **fail** khi chạy có MongoDB. Report ghi "Chưa kiểm" nên chưa phát hiện. | Đổi thành username ≥ 3 ký tự, ví dụ `'anne'` hoặc `'an_member'` (email `an@test.local` giữ nguyên được). Sau đó chạy `npm test` có `mongod` để xác nhận. |
| 2 | Thấp | `tests/auth.test.js:16` (có sẵn từ base, ngoài diff) | Cùng lỗi username `'an'` nên test đăng nhập của auth cũng sẽ fail khi có DB. | Sửa cùng lúc ở nhánh test-setup hoặc PR riêng `fix:`. |
| 3 | Thấp | `src/controllers/postController.js` `remove` | Redirect theo "người xoá có phải tác giả": admin xoá bài **của chính mình** từ `/admin/posts` lại về `/me/posts`; admin xoá bài người khác từ trang chi tiết bài lại về `/admin/posts`. Không sai chức năng. | Chấp nhận được. Nếu muốn chính xác hơn có thể thêm field ẩn `from=admin` ở form trong `admin/posts.ejs` (chỉ nhận đúng giá trị đó). |
| 4 | Thấp | `src/controllers/userController.js` `changePassword` | Đổi mật khẩu không huỷ các phiên khác của user. | Đã ghi ở plan, chấp nhận cho localhost. |
| 5 | Thấp | `tests/admin-profile.test.js` | Thiếu vài ca nhỏ: email không đổi (flash "Email không thay đổi"), `form` lạ → redirect `/profile`, test "tác giả xoá bài" không kiểm `status`. | Tuỳ chọn bổ sung. |
| 6 | Thấp | `src/views/partials/header.ejs` | Spec ghi admin có "Thống kê"; chưa thêm vì `/admin` (UC20) chưa làm. | Đúng như plan; thêm khi làm bước 10. |

## Kết luận

**Duyệt có điều kiện.** Code đúng spec, quyền và bảo mật ổn, style theo CLAUDE.md. Phải sửa vấn đề #1 (username `'an'` < 3 ký tự trong `setup()`) và chạy lại `npm test` có MongoDB trước khi merge vào `dev`.
