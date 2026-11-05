# Review: Like, lưu bài, lượt xem và bài nổi bật

- Ngày: 2026-11-05
- Người review: Claude Code (reviewer độc lập; đọc diff `origin/chore/test-setup...HEAD`, chạy `npm test` trên container không có MongoDB; không chạy server, không thử trên trình duyệt)
- PR / branch: `feature/like-bookmark-popular` (1 commit `e092532 feat: like, lưu bài, lượt xem và bài nổi bật (UC17, UC18, UC19)`), base `chore/test-setup`, PR sẽ vào `dev`
- Đối chiếu: `specs/01` (BR6, BR9, BR10), `specs/02` (UC02, UC17–UC19), `specs/03` (Post.views, Like, Bookmark, index, quy tắc controller), `specs/04` (route, quyền, view), `specs/05` (bước 7, 8), `plans/2026-11-05-like-bookmark-popular.md`, `reports/2026-11-05-like-bookmark-popular.md`, `CLAUDE.md`

## Khớp spec?

- [x] Route, quyền đúng bảng route (specs/04): `GET /popular` công khai (có `loadSidebar`); `POST /posts/:slug/like`, `POST /posts/:slug/bookmark`, `GET /me/bookmarks` đều qua `requireLogin`. Route đặt trong `routes/posts.js` đúng `specs/05` ("posts gồm cả like, bookmark"), không sửa `app.js`. Không có route nào đè lên `GET /posts/:slug`.
- [x] Like / bookmark bài nháp hoặc slug không tồn tại trả 404 (`findOne({ slug, status: 'published' })`), kể cả tác giả, đúng specs/04 dòng 46.
- [x] Schema, validate đúng specs/03:
  - `Post.views`: kiểm `git show origin/chore/test-setup:src/models/Post.js`, base **đúng là chưa có** field `views` (và `show` chưa tăng lượt xem). Field thêm vào là `Number`, mặc định `0`, `min: 0`, khớp bảng Post của specs/03. `readForm` chỉ đọc `title`, `content`, `tags`, `status` nên `views` không lấy từ form (có test).
  - Index `{ status: 1, views: -1 }` trên posts đúng bảng Index.
  - `Like`, `Bookmark`: `user`, `post` là ObjectId bắt buộc, `timestamps: { createdAt: true, updatedAt: false }`, unique `{ user: 1, post: 1 }`, index `post`; Bookmark thêm `{ user: 1, createdAt: -1 }`. Đủ và đúng.
- [x] Quy tắc nghiệp vụ:
  - BR9: toggle `findOneAndDelete` cặp, không có thì `create`; lỗi `11000` bỏ qua, đúng quy tắc controller của specs/03. `user` lấy từ `res.locals.currentUser`, `post` từ URL; field `user` trong form bị bỏ qua (có test).
  - BR10: `Post.updateOne({ _id }, { $inc: { views: 1 } }, { timestamps: false })` chỉ khi bài `published` **và** người mở không phải tác giả; bài nháp (tác giả/admin mở) không tăng. `post.views += 1` chỉ để hiển thị, không `save()` nên không đổi `updatedAt`.
  - BR6 (mở rộng): `remove` xoá thêm `Like.deleteMany`, `Bookmark.deleteMany` theo `post`. Phần file ảnh bìa thuộc bước 9, chưa tới.
  - UC18 / BR5 / BR9: `/me/bookmarks` chỉ lấy bookmark có `post` còn `published`, sắp `createdAt` giảm dần (+ `_id`), 10 bài/trang, kẹp `page` về trang cuối. Bài về nháp giữ bookmark nhưng ẩn (có test).
  - UC19: `/popular` lấy 10 bài `published`, `views` giảm dần, không phân trang (`totalPages: 1` nên partial pagination không hiện).
- [x] Bookmark mà bài đã bị xoá (populate ra `null`): không lỗi. Bộ lọc `post: { $in: publishedIds }` đã loại bookmark mồ côi trước khi đếm / phân trang, và còn `rows.map((b) => b.post).filter(Boolean)` phòng trường hợp bài bị xoá giữa hai truy vấn.
- [x] View: nút Thích / Lưu là `<form method="post">` + `<button>`, có `aria-pressed`, chữ đổi theo trạng thái; khách thấy link `/login`; bài nháp chỉ hiện "n lượt thích". Trang bài có lượt xem, số like; thẻ bài có "n lượt xem" (`post.views || 0` cho dữ liệu `lean()` cũ thiếu field). Menu có "Nổi bật", "Đã lưu".
- [x] XSS: mọi dữ liệu người dùng (`slug`, `title`, `emptyMessage`, `likeCount`...) đi qua `<%= %>`. `<%-` chỉ dùng cho `include` và chuỗi tĩnh `aria-current="page"`.
- [x] Không thêm tính năng ngoài phạm vi, không thêm thư viện, không sửa spec. Style đúng `CLAUDE.md`: CommonJS, `async/await` + `next(err)`, tên tiếng Anh, comment / giao diện tiếng Việt.

## Test

- `npm install` + `npm test` trên container không có MongoDB: **28 test, 15 pass, 0 fail, 13 skip** (13 skip = 3 của `auth.test.js` + 10 của `like-bookmark-popular.test.js`), khớp report.
- Đọc `tests/like-bookmark-popular.test.js` đối chiếu code, dự đoán **sẽ pass khi có MongoDB**:
  - Username `an_test`, `binh_test`, `cuong_test`, `admin_test`: ≥ 3 ký tự, chỉ chữ / số / `_`. Email đều hợp lệ; `loginAs` dùng mật khẩu mặc định của `createUser`.
  - Field form đúng: `POST /posts` gửi `title`, `content` (≥ 20 ký tự), `status`, thêm `views: '999'` để kiểm bị bỏ qua.
  - Status / redirect khớp code: khách POST → 302 `/login`; toggle → 302 `/posts/:slug`; bài nháp / slug sai → 404; xoá bài → 302.
  - Regex khớp HTML thật: `href="/login" ...>Thích (0)`, `>Thích (0)` (nút `<button ...>Thích (0)</button>`), `Bỏ thích (1)`, `>Bỏ lưu<`, `1 lượt xem` / `2 lượt xem`.
  - `/popular`: sidebar chỉ có thẻ phổ biến và bình luận mới (không liệt kê bài), nên kiểm `!includes('Bài nổi bật số 01')` và thứ tự 11 trước 10 không bị nhiễu.
  - `Like.init()`, `Bookmark.init()` trong `before` đảm bảo unique index có sẵn cho test bấm 2 lần cùng lúc; `clearDb` chỉ `deleteMany` nên index không mất.
- Chưa chạy được test cần DB và chưa thử trên trình duyệt: phải làm trước khi merge (report cũng ghi rõ).

## Vấn đề

| # | Mức | Chỗ | Mô tả | Đề xuất |
| --- | --- | --- | --- | --- |
| 1 | Thấp | `src/controllers/reactionController.js` `toggle` | Hai request like cùng lúc của cùng người: request 2 có thể `findOneAndDelete` đúng bản ghi request 1 vừa tạo, kết quả là 0 like (người dùng bấm "Thích" mà không thấy thích). Spec chỉ đòi "tối đa 1" nên vẫn đúng, test cũng chỉ kiểm `<= 1`. | Chấp nhận được cho đồ án. Nếu muốn chắc hơn, ghi chú hành vi này trong report; không cần sửa code. |
| 2 | Thấp | `src/controllers/postController.js` `remove` | Xoá bài trước rồi mới xoá Like / Bookmark. Một request like đã qua bước `findOne` trước khi bài bị xoá vẫn có thể `create` Like sau `deleteMany`, để lại Like mồ côi. Trang "Đã lưu" đã lọc nên không lỗi, nhưng "Tổng like" (`countDocuments`) ở UC20 sau này sẽ đếm cả bản mồ côi. | Không cần sửa bây giờ. Khi làm UC20, có thể đếm tổng like bằng aggregation có `$lookup` bài (giống "Top 5 bài nhiều like") hoặc chấp nhận sai lệch rất nhỏ. |
| 3 | Thấp | `src/controllers/postController.js` `popular` | Dùng `PAGE_SIZE` làm số bài của `/popular`. Hai khái niệm khác nhau (cỡ trang và "top 10") đang dính vào một hằng số; đổi cỡ trang sẽ vô tình đổi `/popular`. | Thêm `const POPULAR_LIMIT = 10;` và dùng ở `popular`. |
| 4 | Thấp | `src/controllers/postController.js` `popular` + index `{ status: 1, views: -1 }` | Sort `{ views: -1, createdAt: -1, _id: -1 }` có thêm khoá phụ nên index chỉ dùng được một phần, MongoDB phải sắp trong bộ nhớ các bài published. Với dữ liệu đồ án thì không đáng kể. | Giữ nguyên (khoá phụ giúp thứ tự ổn định khi hoà). Có thể ghi một dòng trong report nếu bị hỏi khi bảo vệ. |
| 5 | Thấp | `src/controllers/reactionController.js` dòng 4 | Controller `require` controller khác (`PAGE_SIZE`, `addCommentCounts` từ `postController`). Không vòng lặp (postController không require ngược), `commentController` cũng làm vậy với `renderShow`, nên chấp nhận được. | Không bắt buộc. Nếu muốn gọn, chuyển `addCommentCounts` sang `src/utils/`. |
| 6 | Thấp | Quy trình (`docs/plans`, `docs/reports`) | Plan, code, report nằm chung một commit; theo `CLAUDE.md` plan cần được duyệt trước khi code. Test cần DB chưa chạy. | Người dùng xác nhận plan khi duyệt PR; chạy `npm test` với `mongod` và thử trên trình duyệt (Thích / Lưu, Đã lưu, Nổi bật), cập nhật bảng kết quả trong report. |
| 7 | Thấp | `src/views/posts/index.ejs` | Đổi tab thành `locals.tab` và thêm `emptyMessage`; nhánh danh mục / tìm kiếm cũng sửa view này nên dễ xung đột khi merge (report đã nêu). | Khi gộp, giữ cả hai: tab chỉ khi có `locals.tab`, `emptyMessage` ưu tiên trước câu rỗng mặc định. |

Không có vấn đề mức Cao hay Trung bình.

## Kết luận

**Duyệt.** Code khớp specs 02/03/04 cho UC17, UC18, UC19, BR6 (phần Like/Bookmark), BR9, BR10: model và index đúng, route và quyền đúng, 404 cho bài nháp, xử lý 11000, `$inc` + `timestamps: false` chỉ khi không phải tác giả, `/me/bookmarks` chỉ bài published + mới lưu nhất + 10/trang, `/popular` 10 bài. `Post.views` thật sự chưa có ở base và bản thêm vào khớp specs/03. Không có XSS, nút là form POST, bookmark mồ côi không gây lỗi. Các vấn đề còn lại đều mức Thấp, không chặn merge. Điều kiện trước khi merge vào `dev`: chạy `npm test` trên máy có MongoDB (kỳ vọng 0 fail) và thử nhanh trên trình duyệt.
