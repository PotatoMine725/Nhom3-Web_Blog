# Report: Like, lưu bài, lượt xem và bài nổi bật

- Ngày: 2026-11-05
- Plan: `plans/2026-11-05-like-bookmark-popular.md`
- Branch / PR: `feature/like-bookmark-popular` → PR vào `dev` (do điều phối viên tạo)

## Đã làm

- Model `Like`, `Bookmark` (`src/models/`): đúng spec 03 (createdAt only, unique `{ user, post }`, index `post`, Bookmark thêm `{ user: 1, createdAt: -1 }`).
- `Post`: thêm `views` (mặc định 0, min 0) và index `{ status: 1, views: -1 }`. Trước đó Post chưa có field này và `show` chưa tăng lượt xem.
- `postController`: `show` tăng views bằng `$inc` + `timestamps: false` khi bài published và người mở không phải tác giả (BR10); `renderShow` thêm `likeCount`, `liked`, `bookmarked`; `remove` xoá thêm Like, Bookmark (BR6); hàm mới `popular` (UC19) và `addCommentCounts` (tách từ `index`, dùng lại cho 2 trang mới).
- `reactionController` (mới): `like`, `bookmark` (cùng một hàm `toggle(Model)`), `bookmarks` (trang "Đã lưu", 10 bài/trang, chỉ bài published, mới lưu nhất trước).
- `routes/posts.js`: `GET /popular`, `POST /posts/:slug/like`, `POST /posts/:slug/bookmark`, `GET /me/bookmarks`. Không sửa `app.js`.
- View: `posts/show` (lượt xem, nút Thích / Lưu đổi chữ theo trạng thái, khách thấy link đăng nhập, bài nháp chỉ hiện số thích; câu xác nhận xoá nhắc cả like/lưu), `partials/post-card` (lượt xem), `posts/index` (tab chỉ hiện ở trang chủ, `emptyMessage` cho trang khác), `partials/header` (menu người dùng thêm "Đã lưu"), `partials/left-nav` ("Nổi bật", "Đã lưu").
- Test `tests/like-bookmark-popular.test.js`: 10 test phủ bảng kiểm thử của plan.
- Không thêm thư viện, không sửa spec.

## Lệch so với plan (nếu có) và lý do

- Không lệch.

## Kết quả kiểm thử

Chạy thật trên container cloud (không có MongoDB):

- `node --check` mọi file JS đã sửa / thêm: đạt.
- `npm test`: **28 test, 15 pass, 0 fail, 13 skip**. 15 pass là test biên dịch EJS (`views.test.js`, không cần DB). 13 skip là test cần MongoDB (3 của `auth.test.js` + 10 của `like-bookmark-popular.test.js`) — **chưa chạy được**, cần chạy `npm test` trên máy có `mongod`.
- Render thử bằng `ejs.renderFile` với dữ liệu giả (script tạm, không commit): `posts/show` hiện "3 lượt xem", "Bỏ thích (2)", "Lưu"; `posts/index` không có tab khi không truyền `tab`, header/left-nav có "Nổi bật", "Đã lưu"; trang chủ vẫn có tab và câu rỗng cũ.

| # | Thao tác | Kết quả | Đạt? |
| --- | --- | --- | --- |
| 1–10 | Theo bảng kiểm thử của plan (test tự động) | Chưa chạy: cần MongoDB | Chưa kiểm |

## Việc còn lại

- Chạy `npm test` trên máy có MongoDB và thử bằng trình duyệt (bấm Thích / Lưu, trang Đã lưu, Nổi bật) trước khi merge.
- `posts/index.ejs` cũng được nhánh danh mục / tìm kiếm sửa: có thể cần gộp tay phần tab / trạng thái rỗng.
- Bước tiếp theo trong `specs/05`: bước 9 (ảnh bìa).
