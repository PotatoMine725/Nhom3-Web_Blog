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

## Gộp với nhánh danh mục + admin

Merge `origin/feature/admin-profile` (đã gồm `feature/categories-search`) vào nhánh này (commit `f5ac8b9`). Xung đột ở 4 file, gộp tay giữ đủ hành vi hai phía:

- `src/controllers/postController.js`: require cả `Like`, `Bookmark` và `Category`. `show` vừa `populate('category', 'name slug')` vừa giữ biến `user` cho phần tăng lượt xem (BR10, `$inc`). `remove` (đã tự gộp) giữ BR6 xoá Comment/Like/Bookmark và redirect `/me/posts` hoặc `/admin/posts`. `popular` thêm `populate('category')` để thẻ bài hiện danh mục.
- `src/views/partials/header.ejs`: menu người dùng có "Bài của tôi", "Đã lưu", "Hồ sơ", rồi nhóm "Quản trị" (Người dùng, Kiểm duyệt bài, Quản lý danh mục) nếu là admin. Dropdown danh mục và ô tìm kiếm giữ `q` không đổi.
- `src/views/posts/index.ejs`: lấy bản của nhánh danh mục (form lọc `/search`, "N kết quả", tab theo `isHome` / `locals.tab`). Trạng thái rỗng ở trang khác trang chủ dùng `locals.emptyText`, mặc định "Không tìm thấy bài viết phù hợp".
- `src/views/posts/show.ejs`: dòng meta có cả "N lượt xem" và "Danh mục: …"; nút Thích / Lưu giữ nguyên.
- Thống nhất tên biến rỗng: bỏ `emptyMessage`, dùng `emptyText` (`postController.popular`, `reactionController.bookmarks`). `searchController`, `categoryController` không truyền biến này (dùng câu mặc định).
- `reactionController.bookmarks`: populate thêm `category` của bài để thẻ bài trang "Đã lưu" hiện danh mục; populate `post` có `match: { status: 'published' }` (giữ `filter(Boolean)`) để bài vừa chuyển về nháp không lọt vào danh sách.
- Merge thêm lần nữa `origin/feature/admin-profile` để lấy bản mới: session store dùng `client: mongoose.connection.getClient()`, bỏ `--test-force-exit` (không xung đột).

Kiểm thử sau khi gộp (không có MongoDB): `node --check` mọi file JS trong `src` đạt; `npm test`: **59 test, 24 pass, 0 fail, 35 skip** (skip là test cần DB). Render thử `posts/index` (trang chủ có tab, tab chưa bình luận rỗng, search, popular rỗng, bookmarks rỗng) và `posts/show` (admin, khách, bài chưa phân loại) bằng `ejs.renderFile`: không lỗi biến. Vẫn cần chạy `npm test` trên máy có `mongod` và thử trên trình duyệt.
