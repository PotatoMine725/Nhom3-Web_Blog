# CLAUDE.md

Hướng dẫn cho Claude Code khi làm việc trong repo này.

## Dự án

Web blog đơn giản: Node.js + Express + EJS + MongoDB (Mongoose), chạy **localhost**, chưa deploy. Yêu cầu quan trọng nhất: **không over-engineering**. Đây là đồ án sinh viên, ưu tiên code dễ đọc, dễ giải thích.

## Spec Driven Development

- `docs/specs/` là **contract đã chốt**. Code phải khớp spec. Không tự ý đổi spec; nếu spec sai/thiếu thì dừng lại, đề xuất sửa và chờ duyệt.
- Trước khi code một phần: viết plan vào `docs/plans/` (dùng `_template.md`) và chờ người dùng duyệt.
- Code xong: viết report vào `docs/reports/`. Review ghi vào `docs/reviews/`.
- Prompt giao việc được lưu ở `docs/prompts/`.
- Quy ước chi tiết: `docs/README.md`.

Spec nên đọc trước: `docs/specs/03-data-model.md` (schema) và `docs/specs/04-routes-and-views.md` (route, quyền, view).

## MongoDB

- MongoDB chạy local tại `mongodb://127.0.0.1:27017/nhom3_blog` (cấu hình trong `.env`).
- **Người dùng tự bật MongoDB bằng tay.** Trước khi chạy bất cứ thứ gì cần DB (`npm run dev`, `npm start`, script seed, test có DB), phải **hỏi người dùng trước** và chờ họ xác nhận đã bật `mongod`.
- Không xoá hay drop database/collection khi chưa được đồng ý.

## Lệnh

```bash
npm install          # cài thư viện
cp .env.example .env # tạo file cấu hình (lần đầu)
npm run dev          # chạy với nodemon (cần MongoDB đã bật)
npm start            # chạy thường
```

## Cấu trúc

```text
src/server.js        # đọc .env, kết nối DB, listen
src/app.js           # tạo Express app (không kết nối DB ở đây)
src/config/db.js     # kết nối MongoDB
src/models/          # Mongoose models: User, Post, Category, Comment
src/routes/          # router theo nhóm: auth, posts, comments, admin
src/controllers/     # xử lý từng use case
src/middlewares/     # loadUser, requireLogin, requireOwnerOrAdmin, requireAdmin
src/utils/           # hàm dùng chung (slugify, ...)
src/views/           # EJS; mỗi view tự include partials/header và partials/footer
src/public/          # file tĩnh
docs/                # specs, plans, reports, reviews, prompts
```

## Quy ước code

- CommonJS (`require`), không TypeScript, không bundler, không framework frontend.
- Tên biến/hàm/file tiếng Anh; comment, nội dung giao diện và tài liệu tiếng Việt.
- Controller dùng `async/await`, lỗi chuyển cho error handler bằng `next(err)`.
- Sửa/xoá dùng `POST .../edit`, `POST .../delete` (không dùng method-override).
- `author` luôn lấy từ session, không lấy từ form.
- Mật khẩu: `bcryptjs`, field `passwordHash` có `select: false`.
- Không thêm thư viện mới khi chưa cần; nếu cần, nêu lý do trong plan.
- Không commit `.env` hay `node_modules`.

## Git

- Mỗi phần việc một branch, mở PR vào `main`.
- Commit message ngắn, tiếng Việt hoặc tiếng Anh, nói rõ làm gì.
