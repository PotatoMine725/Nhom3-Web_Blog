# Plan: Like, lưu bài, lượt xem và bài nổi bật

- Ngày: 2026-11-05
- Branch: `feature/like-bookmark-popular` (tạo từ `origin/chore/test-setup`)
- Spec liên quan: `specs/01` (BR6, BR9, BR10), `specs/02` (UC02, UC17, UC18, UC19), `specs/03` (Like, Bookmark, Post.views, index), `specs/04` (route, view), `specs/05` bước 7 + 8
- Đáp ứng: UC17, UC18, UC19, UC02 (phần lượt xem), BR6 (mở rộng), BR9, BR10

## Mục tiêu

Thành viên like / bỏ like, lưu / bỏ lưu bài đã đăng và xem trang "Đã lưu". Mọi người thấy số like, lượt xem ở trang bài và lượt xem ở danh sách; có trang "Nổi bật" gồm 10 bài nhiều lượt xem nhất.

## Ngoài phạm vi

- Ảnh bìa (bước 9), thống kê admin (bước 10), danh mục / tìm kiếm (agent khác).
- Like bình luận, đếm lượt xem không trùng theo người / IP (spec 01 đã loại).
- Hiện số like trên thẻ bài ở danh sách (spec 04 chỉ yêu cầu lượt xem ở thẻ bài).

## Các bước

1. Model `Like`, `Bookmark` theo spec 03: `user`, `post` bắt buộc, `timestamps: { createdAt: true, updatedAt: false }`, index unique `{ user: 1, post: 1 }`, index `post`; Bookmark thêm `{ user: 1, createdAt: -1 }` — file: `src/models/Like.js`, `src/models/Bookmark.js`.
2. Post thêm `views` (Number, mặc định 0, min 0) và index `{ status: 1, views: -1 }`. `readForm` vốn chỉ đọc 4 field nên `views` không lấy từ form — file: `src/models/Post.js`.
3. `postController`:
   - Tách hàm `addCommentCounts(posts)` từ `index` để `/popular` và `/me/bookmarks` dùng lại (thẻ bài cần `commentCount`).
   - `show`: bài `published` và người mở không phải tác giả thì `Post.updateOne({ _id }, { $inc: { views: 1 } }, { timestamps: false })` (BR10). Code hiện tại **chưa có** phần này và Post **chưa có** field `views`, nên bổ sung.
   - `renderShow`: thêm `likeCount`, `liked`, `bookmarked`.
   - `remove`: thêm `Like.deleteMany`, `Bookmark.deleteMany` (BR6).
   - `popular`: 10 bài published, sắp `views` giảm dần, render `posts/index` không phân trang.
4. `reactionController` (mới): `toggle(Model)` dùng chung cho like và bookmark (tìm bài published theo slug, không có thì 404; `findOneAndDelete` cặp, không có thì `create`, lỗi 11000 bỏ qua; redirect về trang bài); `bookmarks` (trang "Đã lưu") — file: `src/controllers/reactionController.js`.
5. Route trong `src/routes/posts.js` (spec 05: router posts gồm cả like, bookmark), không sửa `app.js`: `GET /popular`, `POST /posts/:slug/like`, `POST /posts/:slug/bookmark`, `GET /me/bookmarks`. Các URL này không trùng mẫu `/posts/:slug` (GET) nên thứ tự không ảnh hưởng.
6. View:
   - `posts/show`: lượt xem ở dòng meta; thanh hành động có nút "Thích (n)" / "Bỏ thích (n)", "Lưu" / "Bỏ lưu" (form POST, `aria-pressed`), khách thấy link `/login`; bài nháp chỉ hiện số lượt thích.
   - `partials/post-card`: thêm "n lượt xem".
   - `posts/index`: chỉ hiện tab khi có biến `tab` (trang chủ); trang khác truyền `emptyMessage` cho trạng thái rỗng.
   - `partials/header`: menu người dùng thêm "Đã lưu". `partials/left-nav` (nằm trong header, cả bản mobile): thêm "Nổi bật" (mọi người) và "Đã lưu" (đã đăng nhập).
7. Test `tests/like-bookmark-popular.test.js` (cần MongoDB, không có thì skip).

## Kiểm thử

| # | Thao tác | Kết quả mong đợi |
| --- | --- | --- |
| 1 | Khách POST like / bookmark, GET `/me/bookmarks` | 302 về `/login`, không tạo bản ghi; trang bài hiện link đăng nhập |
| 2 | Thành viên like, mở lại trang, like lần nữa | Tạo 1 Like (user từ session, có createdAt, không updatedAt), nút "Bỏ thích (1)"; lần 2 xoá, nút "Thích (0)" |
| 3 | Bấm like 2 request cùng lúc | Cả hai 302, tối đa 1 Like |
| 4 | Like / bookmark bài nháp (kể cả tác giả), slug không tồn tại | 404, không tạo bản ghi |
| 5 | Lưu 2 bài, mở `/me/bookmarks`; chuyển 1 bài về nháp; bỏ lưu | Mới lưu trước; bài nháp ẩn nhưng bookmark còn; bỏ lưu xoá bản ghi; user khác không thấy |
| 6 | 11 bookmark | Trang 1 có 10, có link `?page=2`; page quá lớn vẫn 200 |
| 7 | Khách, member khác, tác giả mở bài | views tăng 2 (tác giả không tính), `updatedAt` không đổi |
| 8 | Admin mở bài nháp; POST bài có `views=999` | views giữ 0 |
| 9 | `/popular` với 12 bài published + 1 nháp nhiều views | 10 bài nhiều views nhất, đúng thứ tự, không nháp, không phân trang |
| 10 | Xoá bài có bình luận, like, bookmark | Hết bản ghi của bài đó, bài khác giữ nguyên |

## Quyết định tự chốt

1. Route đặt trong `routes/posts.js` (theo spec 05), controller mới `reactionController.js` cho gọn file `postController`. Không đụng `app.js` để tránh xung đột với các agent song song.
2. Link "Nổi bật" đặt ở `left-nav` (đang là menu chính trong header theo UI PR 1, có cả bản mobile trong offcanvas) thay vì thêm hàng link mới trên thanh header.
3. Lượt xem hiển thị ở trang bài đã cộng lượt của chính lần mở này (`post.views += 1` trong bộ nhớ, không save).
4. Admin không phải tác giả mở bài đã đăng vẫn tính lượt xem (BR10 chỉ trừ tác giả).
5. `/popular` sắp `views` giảm dần, hoà thì bài mới hơn trước. Có sidebar phải như trang chủ.
6. `/me/bookmarks` lấy id bài đã lưu → lọc id còn published → đếm / phân trang trên `bookmarks` theo `createdAt` giảm dần (dùng index `{ user, createdAt }`). Không dùng sidebar (giống `/me/posts`).
7. Toggle không đặt flash: nút đổi chữ là đủ phản hồi.

## Rủi ro / câu hỏi mở

- Bài cũ trong DB chưa có field `views`: Mongoose gán mặc định 0 khi đọc; `$inc` trên field thiếu tạo field = 1. Thẻ bài dùng `post.views || 0` vì dữ liệu `lean()` không có default.
- `posts/index.ejs` có thể xung đột nhẹ với nhánh danh mục / tìm kiếm (cũng dùng view này). Sửa tối thiểu: bọc tab bằng `locals.tab`, thêm `emptyMessage`.
