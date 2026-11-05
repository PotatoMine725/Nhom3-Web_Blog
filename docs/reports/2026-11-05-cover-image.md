# Report: Ảnh bìa bài viết

- Ngày: 2026-11-05
- Plan: `plans/2026-11-05-cover-image.md`
- Branch / PR: `feature/cover-image` (tạo từ `origin/feature/like-bookmark-popular`) → PR vào `dev` (do điều phối viên tạo)

## Đã làm

- Thêm thư viện `multer@^2.5.0` (spec 04, 05 đã chốt; lý do ghi trong plan).
- `src/middlewares/uploadCover.js` (mới): `single('coverImage')`, JPG/PNG/WEBP, ≤ 2 MB, 1 file, lưu `uploads/` ở gốc repo, tên `thời gian-16 hex ngẫu nhiên.đuôi` theo mimetype. Sai loại / quá cỡ / lỗi multer khác gắn `req.uploadError`, không 500, không còn file trên đĩa. Hàm `removeCover()` xoá file an toàn (basename, bỏ qua file không có).
- `routes/posts.js`: `uploadCover` gắn vào `POST /posts` và `POST /posts/:slug/edit`, luôn sau `requireLogin` / `requireOwnerOrAdmin`.
- `app.js`: phục vụ `/uploads` bằng `express.static`, thêm header `nosniff`.
- `models/Post.js`: `coverImage` (String, mặc định `null`), không đọc từ form.
- `postController`: `create` lưu tên file, lỗi bất kỳ thì xoá file vừa upload; `update` thay / xoá ảnh, lưu thành công rồi mới xoá file cũ, lưu lỗi thì xoá file mới; `remove` xoá file ảnh (BR6).
- View: `posts/form` multipart + ô ảnh (cuối form) + ảnh hiện tại + ô "Xoá ảnh bìa" ở form sửa; `posts/show` ảnh bìa; `partials/post-card` ảnh nhỏ; CSS trong `style.css`.
- `uploads/.gitkeep`, `.gitignore` bỏ qua `uploads/*` trừ `.gitkeep`.
- Test: `tests/upload-cover.test.js` (7 test, không cần DB), `tests/cover-image.test.js` (11 test, cần DB). `tests/helpers.js` thêm `multipartForm()` và `client().postMultipart()` dùng `FormData` + `Blob` có sẵn của Node. Cả hai file test tự dọn file trong `uploads/`. `tests/README.md` ghi thêm 2 file này.
- Không sửa spec. Không đụng phần thống kê `/admin`.

## Lệch so với plan (nếu có) và lý do

- Không lệch.

## Kết quả kiểm thử

Chạy thật trên container cloud (không có MongoDB):

- `node --check` mọi file JS đã sửa / thêm: đạt.
- `npm test`: **77 test, 31 pass, 0 fail, 46 skip**. 31 pass gồm biên dịch EJS và 7 test `upload-cover.test.js` (chạy thật: PNG/JPEG/WEBP, GIF/text bị từ chối, 2 MB + 1 byte bị từ chối và không còn file, đúng 2 MB được nhận, ô chữ đọc đủ qua multer, `removeCover`). 46 skip là test cần MongoDB, trong đó 11 test của `cover-image.test.js` — **chưa chạy được**, cần chạy `npm test` trên máy có `mongod`.
- Sau `npm test`, `uploads/` chỉ còn `.gitkeep` (test dọn đúng).
- Render thử bằng `ejs.renderFile` với dữ liệu giả (script tạm, không commit): form sửa có `enctype="multipart/form-data"`, ảnh hiện tại, ô "Xoá ảnh bìa" giữ trạng thái tick; form tạo không có ảnh preview; thẻ bài có / không có `<img>` đúng theo `coverImage`.

| # | Thao tác | Kết quả | Đạt? |
| --- | --- | --- | --- |
| 1–5 | Middleware (test không DB) | Đúng như plan | Đạt |
| 6–16 | Theo bảng kiểm thử của plan (test cần DB) | Chưa chạy: cần MongoDB | Chưa kiểm |

## Việc còn lại

- Chạy `npm test` trên máy có MongoDB; thử bằng trình duyệt: tạo bài có ảnh, thay ảnh, tick xoá ảnh, chọn file > 2 MB hoặc GIF, xoá bài rồi kiểm tra thư mục `uploads/`.
- `npm install` lại sau khi pull (có thư viện mới `multer`).
- Chỉ kiểm mimetype do trình duyệt gửi (đúng spec); file mồ côi khi server tắt giữa chừng không được dọn.
