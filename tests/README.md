# Test

Chạy: `npm test` (dùng `node:test` và `fetch` có sẵn của Node, không thêm thư viện).

- `views.test.js`: biên dịch mọi file EJS, **không cần MongoDB**.
- Các file khác cần MongoDB đang bật. Chúng dùng DB riêng `nhom3_blog_test` (đổi bằng biến `MONGODB_URI_TEST`), tên DB bắt buộc kết thúc bằng `_test`. Trước mỗi test, dữ liệu trong DB test bị xoá bằng `deleteMany` (không drop, không đụng DB `nhom3_blog`).
- Không kết nối được MongoDB thì các test cần DB được **skip** (không báo fail). Xem dòng `# skipped` ở cuối kết quả.
- Viết test mới: copy cấu trúc `auth.test.js`, dùng các hàm trong `helpers.js` (`startApp`, `clearDb`, `client`, `createUser`, `loginAs`).
- `--test-force-exit`: session store (connect-mongo) tự mở kết nối riêng mà app không đóng, nên ép thoát khi chạy xong để test không treo.
- DB `nhom3_blog_test` là DB dùng một lần, chỉ cho test. Đừng chạy 2 lần `npm test` cùng lúc.
