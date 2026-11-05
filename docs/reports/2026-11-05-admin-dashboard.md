# Report: Trang thống kê admin

- Ngày: 2026-11-05
- Plan: `plans/2026-11-05-admin-dashboard.md`
- Branch / PR: `feature/admin-dashboard` (tạo từ `origin/feature/like-bookmark-popular`) → PR vào `dev` (do điều phối viên tạo)

## Đã làm

- `src/controllers/statsController.js` (mới): `loadStats(now)` chạy 10 truy vấn ở spec 03 mục "Truy vấn thống kê" bằng `Promise.all` (đếm user / bị khoá / bình luận / like, `$group` bài theo trạng thái, bài published theo tháng, top 5 tác giả `$lookup` users, top 5 bài nhiều like / bình luận `$lookup` posts → chỉ published, top 5 bài nhiều views); `fillMonths` điền đủ 6 tháng (tháng trống = 0) và tính `percent` cho thanh ngang; `dashboard` render view.
- `src/routes/admin.js`: `GET /admin` với `requireAdmin`.
- `src/views/admin/dashboard.ejs` (mới): 4 thẻ số liệu, bảng theo tháng có thanh ngang Bootstrap `.progress` (độ rộng %), 4 bảng top có link `/posts/:slug`, bảng rỗng hiện "Chưa có dữ liệu". Dữ liệu in bằng `<%=`.
- `src/views/partials/header.ejs`: thêm "Thống kê" (`/admin`) đầu nhóm "Quản trị" (chỉ 1 dòng).
- `tests/admin-dashboard.test.js`: 2 test không cần DB (`fillMonths`) + 4 test cần DB (quyền, trạng thái rỗng, số liệu khớp dữ liệu tạo trong test, giới hạn 5 dòng).
- Không thêm thư viện, không sửa spec, không đụng phần ảnh bìa (`postController`, `posts/*`, `post-card`, `app.js`, `package.json`, `style.css`).

## Lệch so với plan (nếu có) và lý do

- Không lệch.

## Kết quả kiểm thử

Chạy thật trên container cloud (không có MongoDB):

- `node --check` các file JS mới / sửa: đạt.
- `npm test`: **66 test, 27 pass, 0 fail, 39 skip**. Pass gồm test biên dịch EJS (có `admin/dashboard.ejs`) và 2 test `fillMonths`. Skip là test cần MongoDB, trong đó 4 test mới của trang `/admin` — **chưa chạy được**, cần chạy `npm test` trên máy có `mongod`.
- Render thử `admin/dashboard` bằng `ejs.renderFile` với dữ liệu giả (script tạm, không commit): có đủ thẻ số liệu, 6 dòng tháng với thanh 0% / 50% / 100%, username có ký tự `<` được escape; bản rỗng hiện đúng 5 lần "Chưa có dữ liệu"; header có link "Thống kê".

| # | Thao tác | Kết quả | Đạt? |
| --- | --- | --- | --- |
| 1–2 | `fillMonths` (qua năm, rỗng) | Đúng 6 tháng, 0 / percent đúng | Đạt |
| 3–6 | Quyền, rỗng, số liệu, giới hạn 5 (test tự động) | Chưa chạy: cần MongoDB | Chưa kiểm |

## Việc còn lại

- Chạy `npm test` trên máy có MongoDB và mở `/admin` bằng tài khoản admin trên trình duyệt trước khi merge.
- `header.ejs` cũng có thể bị nhánh ảnh bìa sửa: nếu xung đột thì chỉ cần giữ dòng "Thống kê" trong nhóm "Quản trị".
- Bước tiếp theo trong `specs/05`: bước 11 (kiểm thử thủ công UC01–UC20).
