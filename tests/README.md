# Test

Chạy: `npm test` (dùng `node:test` và `fetch` có sẵn của Node, không thêm thư viện).

- `views.test.js`: biên dịch mọi file EJS, **không cần MongoDB**.
- `upload-cover.test.js`: middleware `uploadCover` trên một app express nhỏ, **không cần MongoDB**.
- Test có upload ảnh (`upload-cover`, `cover-image`) tự xoá các file chúng tạo trong `uploads/`. Gửi form multipart bằng `client().postMultipart(path, fields, file)` (dùng `FormData`, `Blob` có sẵn của Node).
- Các file khác cần MongoDB đang bật. Chúng dùng DB riêng `nhom3_blog_test` (đổi bằng biến `MONGODB_URI_TEST`), tên DB bắt buộc kết thúc bằng `_test`. Trước mỗi test, dữ liệu trong DB test bị xoá bằng `deleteMany` (không drop, không đụng DB `nhom3_blog`).
- Không kết nối được MongoDB thì các test cần DB được **skip** (không báo fail). Xem dòng `# skipped` ở cuối kết quả.
- Viết test mới: copy cấu trúc `auth.test.js`, dùng các hàm trong `helpers.js` (`startApp`, `clearDb`, `client`, `createUser`, `loginAs`).
- Session store dùng chung kết nối của mongoose, nên `stopApp()` (gọi `mongoose.disconnect()`) đóng hết kết nối, test không bị treo.
- DB `nhom3_blog_test` là DB dùng một lần, chỉ cho test. Đừng chạy 2 lần `npm test` cùng lúc.
