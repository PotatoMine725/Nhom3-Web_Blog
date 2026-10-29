# 05 · Kiến trúc và công nghệ

> Trạng thái: **ĐÃ CHỐT** (2026-10-29). Đây là contract. Muốn đổi phải được nhóm duyệt.

Mô hình MVC render phía server, một project duy nhất, không tách frontend/backend. Mọi request đi cùng một đường: Trình duyệt → Route + middleware → Controller → Model (Mongoose) → MongoDB, rồi Controller render view EJS hoặc redirect.

| Thành phần | Công nghệ | Lý do |
| --- | --- | --- |
| Server | Node.js (>= 18) + Express 4 | Phổ biến, ít cấu hình |
| View | EJS + `include` partial | Viết HTML thuần, không cần build |
| Database | MongoDB local + Mongoose 8 | Schema, validate, populate tham chiếu |
| Đăng nhập | express-session + connect-mongo + bcryptjs | Session lưu trong MongoDB, đơn giản hơn JWT |
| Giao diện | Bootstrap 5 (CDN) | Có sẵn layout, ít CSS tự viết |
| Cấu hình | dotenv (`.env`) | Giữ chuỗi kết nối DB và secret ngoài code |

`bcryptjs` là bản viết bằng JavaScript thuần của bcrypt: cùng thuật toán, không cần build native nên cài được trên Windows mà không lỗi.

## Cấu trúc thư mục

```text
src/
  server.js         # đọc .env, kết nối DB, chạy server
  app.js            # tạo Express app: view engine, session, route, lỗi
  config/db.js      # kết nối MongoDB
  models/           # User, Post, Category, Comment
  routes/           # auth, posts, comments, admin
  controllers/      # xử lý từng use case
  middlewares/      # loadUser, requireLogin, requireOwnerOrAdmin, requireAdmin
  utils/            # hàm dùng chung (slugify, ...)
  views/            # EJS: partials, posts, auth, users, admin, errors
  public/           # css, js tĩnh
scripts/
  create-admin.js   # nâng một user đã đăng ký lên admin (specs/04)
```

## Thứ tự triển khai

1. Khung project và kết nối DB (xong).
2. Đăng ký / đăng nhập / đăng xuất (UC04–UC06) + middleware + script `create-admin`.
3. CRUD bài viết (UC01, UC02, UC08–UC11).
4. Bình luận (UC12, UC13).
5. Danh mục, tag, tìm kiếm (UC03, UC14).
6. Trang admin (UC15, UC16), hồ sơ (UC07).
7. Kiểm thử thủ công theo từng use case UC01–UC16.
