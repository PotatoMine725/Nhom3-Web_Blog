# Plan: Ảnh bìa bài viết

- Ngày: 2026-11-05
- Branch: `feature/cover-image` (tạo từ `origin/feature/like-bookmark-popular`, nhánh đã gồm test-setup, danh mục / tìm kiếm, admin / hồ sơ, like / bookmark / popular)
- Spec liên quan: `specs/01` (BR6, BR11), `specs/02` (UC08, UC09), `specs/03` (Post.coverImage, "Logic gắn với schema"), `specs/04` (bảng route, middleware `uploadCover`, view, ghi chú), `specs/05` (công nghệ multer, thư mục `uploads/`, bước 9)
- Đáp ứng: UC08 (phần ảnh), UC09 (đổi / xoá ảnh), UC10 + UC16 (BR6 cho file ảnh), BR11

## Mục tiêu

Khi tạo hoặc sửa bài, thành viên chọn được một ảnh bìa (JPG/PNG/WEBP ≤ 2 MB); form sửa đổi được hoặc xoá ảnh. Ảnh hiện ở trang bài và thẻ bài trong danh sách. Xoá bài thì file ảnh cũng bị xoá.

## Ngoài phạm vi

- Nhiều ảnh trong nội dung, resize / nén ảnh, lưu ảnh trên cloud (spec 01 đã loại).
- Kiểm tra nội dung file (magic bytes): chỉ kiểm theo mimetype trình duyệt gửi, đúng như spec 04 ("đuôi theo loại file").
- Dọn file mồ côi trong `uploads/` (ví dụ do server tắt giữa chừng).
- Trang thống kê `/admin` (agent khác làm song song): không đụng `adminController`, `routes/admin.js`, `admin/dashboard`, `partials/header`.

## Thư viện mới

- `multer` 2.x (`npm install multer`, bản 2.5.0). Lý do: form có file phải gửi `multipart/form-data`, `express.urlencoded` không đọc được kiểu này; spec 04 và spec 05 đã chốt dùng multer. Chỉ dùng ở 2 route tạo / sửa bài.

## Các bước

1. `src/middlewares/uploadCover.js` (mới):
   - multer `diskStorage` lưu vào `uploads/` ở gốc repo; tên file `Date.now()-<16 ký tự hex ngẫu nhiên><đuôi>`, đuôi lấy theo mimetype (`image/jpeg` → `.jpg`, `image/png` → `.png`, `image/webp` → `.webp`). Không dùng tên gốc.
   - `fileFilter`: loại khác thì bỏ file (không ghi đĩa) và gắn `req.uploadError`.
   - `limits: { fileSize: 2 MB, files: 1 }`. Lỗi `MulterError` (quá cỡ, nhiều file, field file lạ) → gắn `req.uploadError`, `next()` (không 500). multer tự xoá file ghi dở. Lỗi khác → `next(err)`.
   - Hàm `removeCover(filename)`: xoá file trong `uploads/` (dùng `path.basename`), bỏ qua `ENOENT`, lỗi khác chỉ log.
2. `src/routes/posts.js`: `POST /posts` = `requireLogin, uploadCover`; `POST /posts/:slug/edit` = `requireLogin, ownPost, uploadCover` (luôn sau kiểm quyền).
3. `src/app.js`: `app.use('/uploads', express.static(UPLOAD_DIR))`, thêm header `X-Content-Type-Options: nosniff`.
4. `src/models/Post.js`: `coverImage: { type: String, default: null }`. `readForm` không đọc field này nên không bao giờ lấy từ form.
5. `src/controllers/postController.js`:
   - `create`: `req.uploadError` → form 400. Mọi nhánh lỗi (danh mục sai, validate, lỗi 500) xoá file vừa upload. `coverImage = req.file.filename`.
   - `update`: có ảnh mới → thay; không có ảnh mới mà tick `removeCover=1` → `null`. Lưu thành công rồi mới xoá file cũ; lưu lỗi thì xoá file mới, giữ ảnh cũ.
   - `remove`: sau khi xoá bài + Comment / Like / Bookmark thì xoá file ảnh (BR6).
   - `renderForm` truyền thêm `isEdit`, `coverImage` (ảnh đang lưu), `removeChecked` (giữ trạng thái ô tick khi lỗi).
6. View:
   - `posts/form`: `enctype="multipart/form-data"`; ô file (`accept` 3 loại) đặt **cuối** form; form sửa có ảnh thì hiện ảnh hiện tại + ô "Xoá ảnh bìa".
   - `posts/show`: ảnh bìa trên tiêu đề. Câu xác nhận xoá nhắc cả ảnh bìa.
   - `partials/post-card`: ảnh nhỏ 120×80 bên phải (ẩn trên màn hình rất hẹp).
   - CSS trong `style.css`.
7. `uploads/.gitkeep`; `.gitignore` thêm `uploads/*` + `!uploads/.gitkeep`.
8. Test:
   - `tests/upload-cover.test.js` (không cần DB): app express nhỏ chỉ có `uploadCover`.
   - `tests/cover-image.test.js` (cần DB, không có thì skip).
   - `tests/helpers.js`: `client().postMultipart(path, fields, file)` và `multipartForm()` dùng `FormData` + `Blob` có sẵn của Node.

## Kiểm thử

| # | Thao tác | Kết quả mong đợi |
| --- | --- | --- |
| 1 | (không DB) Gửi PNG tên `../../ten-goc.png` kèm các ô chữ | Lưu `^\d+-[0-9a-f]{16}\.png$`, đọc đủ title/content/status/tags/category |
| 2 | (không DB) JPEG, WEBP | Đuôi `.jpg`, `.webp` |
| 3 | (không DB) GIF, text/plain | `uploadError`, không có file trong `uploads/`, ô chữ vẫn đọc được |
| 4 | (không DB) 2 MB + 1 byte; đúng 2 MB | Lỗi "tối đa 2 MB", không file, không 500; đúng 2 MB thì nhận |
| 5 | (không DB) Không chọn ảnh; `removeCover` | Không lỗi; xoá file, bỏ qua file không tồn tại |
| 6 | Khách gửi form tạo bài có ảnh | 302 `/login`, không ghi file, không tạo bài |
| 7 | Thành viên tạo bài kèm PNG + `coverImage=hack.png` dạng chữ | Bài có ảnh tên do server đặt, file tồn tại, đủ field, ảnh hiện ở `/posts/:slug` và `/`, `GET /uploads/<file>` 200 |
| 8 | Tạo bài không ảnh (multipart và urlencoded, có `coverImage` dạng chữ) | `coverImage = null` |
| 9 | Tạo bài với GIF / text / > 2 MB | 400, có lỗi, giữ tiêu đề đã nhập, không file, không bài |
| 10 | Tạo bài lỗi validate kèm ảnh hợp lệ | 400, file vừa upload bị xoá |
| 11 | Khách và member khác POST sửa kèm ảnh | 302 `/login` / 403, không ghi file, bài giữ nguyên |
| 12 | Form sửa; tick "Xoá ảnh bìa" | Form có multipart, ảnh hiện tại, ô tick; lưu xong `coverImage = null`, file bị xoá |
| 13 | Sửa không ảnh, không tick (có `coverImage` dạng chữ) | Giữ ảnh, các ô chữ được cập nhật |
| 14 | Chủ bài thay ảnh, rồi admin thay ảnh | Ảnh mới lưu, file cũ bị xoá, chỉ còn 1 file |
| 15 | Sửa lỗi validate kèm ảnh mới; sửa với GIF | 400, form hiện ảnh cũ, không còn file mới, ảnh cũ giữ |
| 16 | Xoá bài có ảnh | Bài mất, file bị xoá, file của bài khác còn |

## Quyết định tự chốt

1. Middleware export thêm `removeCover`, `UPLOAD_DIR`, `MAX_SIZE` (dùng ở controller, `app.js`, test) để đường dẫn / giới hạn chỉ khai báo một chỗ.
2. Chọn ảnh mới và tick "Xoá ảnh bìa" cùng lúc: ảnh mới thắng (thay ảnh). Lý do: người dùng đã chủ động chọn file.
3. Lỗi ảnh được báo trước lỗi danh mục / validate (chỉ hiện một lỗi ảnh) cho code đơn giản; người dùng sửa rồi lưu lại sẽ thấy lỗi khác nếu có.
4. Ô file đặt cuối form: trình duyệt gửi các ô theo thứ tự trong form, nên khi ảnh quá cỡ (multer dừng đọc giữa chừng) các ô chữ vẫn đã được đọc và hiện lại được.
5. Xoá file thất bại (ngoài `ENOENT`) chỉ ghi log, không báo 500, vì bài đã lưu / xoá xong trong DB.
6. Thêm `X-Content-Type-Options: nosniff` cho `/uploads`: một dòng, chặn trình duyệt đoán file là HTML khi người dùng gửi file giả mimetype ảnh.
7. Ảnh của bài cũ chưa có field `coverImage`: Mongoose gán `null` khi đọc; dữ liệu `lean()` là `undefined`, view kiểm bằng `if (post.coverImage)`.

## Rủi ro / câu hỏi mở

- Chỉ kiểm mimetype do trình duyệt gửi, có thể giả. Spec chấp nhận; nosniff giảm rủi ro.
- Server tắt giữa lúc lưu bài có thể để lại file mồ côi trong `uploads/`. Không xử lý (ngoài phạm vi).
- Không đề xuất sửa spec.
