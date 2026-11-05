# Review: Danh mục, tag, tìm kiếm kết hợp (UC03, UC14)

- Ngày: 2026-11-05
- Người review: Claude (reviewer độc lập; đọc diff `origin/chore/test-setup...feature/categories-search` = `0d7f12b`, chạy `npm test` không có MongoDB)
- PR / branch: `feature/categories-search` (base `chore/test-setup`)
- Đối chiếu: `specs/02` (UC03, UC14), `specs/03`, `specs/04`, `specs/05`, `plans/2026-11-05-categories-search.md`, `reports/2026-11-05-categories-search.md`, `reviews/2026-11-03-categories-search.md`

## Khớp spec?

- [x] Route, quyền đúng bảng route (specs/04): `/search`, `/categories/:slug`, `/tags/:tag` công khai; 4 route `/admin/categories*` chỉ `requireAdmin` (khách và member đều 403).
- [x] Schema, validate đúng specs/03: Category `name` required/unique/trim/≤ 50, `slug` required/unique/lowercase, `timestamps: true`; slug sinh trong `pre('validate')` khi tạo hoặc đổi tên, trùng thì `-2`, `-3`. Post không đổi schema.
- [x] UC03: `q` dùng `$text` (text index trên `title`, `default_language: 'none'`), danh mục theo slug, tag trim + lowercase so khớp đúng phần tử `tags`, kết hợp AND. Có `q` thì sắp theo `textScore` rồi mới nhất; không có thì mới nhất. 10 bài/trang, kẹp page, link phân trang giữ `q`/`category`/`tag`. 2a (không điều kiện, kể cả `q` chỉ có `"`) → redirect `/`; 3a hiện "Không tìm thấy bài viết phù hợp"; 3b danh mục không tồn tại → `_id: { $in: [] }` (0 kết quả, không lẫn bài chưa phân loại). Form lọc giữ giá trị, ô tìm kiếm header giữ `q`.
- [x] UC14: thêm, đổi tên (slug sinh lại), xoá → `deleteOne` rồi `Post.updateMany(..., { $set: { category: null } }, { timestamps: false })`, `updatedAt` của bài giữ nguyên. Bảng có số bài và số bài chưa phân loại.
- [x] BR5: mọi truy vấn danh sách mới đều có `status: 'published'`. BR7: 10 bài/trang.
- [x] Form bài: chọn danh mục; `""` → `null`; id sai định dạng hoặc không tồn tại → 400 "Danh mục không tồn tại" (không lấy bừa từ form). `author` vẫn lấy từ session.
- [x] Không thêm thư viện, không đổi spec.

### Đề xuất của review plan 2026-11-03 đã áp dụng

- #1: `validationMessages` phân biệt 11000 theo `keyPattern.name` / `keyPattern.slug`.
- #2: biến bảng admin là `rows`, không đè `res.locals.categories`.
- #3: `showNew` truyền `category: ''`.
- #5: route admin chỉ `requireAdmin`; test kiểm khách 403.
- Các mục "Đã kiểm": `locals.tab` trong `posts/index`, populate category ở cả `show` và `commentController.create`, `basePath` của tag có `encodeURIComponent`, `confirm()` chữ cố định.

### Bảo mật đã kiểm

- NoSQL injection: `q`, `category`, `tag`, `name`, `category` (form bài) đều qua `str()` nên mảng/object thành `''`. `req.params.*` luôn là chuỗi. Express 4 parser `extended` biến `category[$ne]=x` thành object → bị chặn.
- Regex injection: không có `RegExp`/`$regex` dựng từ input. `"` trong `q` bị bỏ để cú pháp cụm từ của `$text` không lệch.
- XSS: dữ liệu người dùng (tên danh mục, tiêu đề, tag, `q`, `filters.*`, `<title>`) đều dùng `<%= %>`. Các `<%-` mới chỉ in chuỗi cố định `aria-current="page"`. Link tag dùng `encodeURIComponent`; slug danh mục do `slugify` sinh nên an toàn trong `href`.
- ObjectId sai: `categoryController` dùng `mongoose.isValidObjectId` → 404; `readCategory` → 400. Không có CastError → 500.

### Test `tests/categories-search.test.js`

- Đã chạy `npm test` (không có MongoDB): 33 test, 21 pass, 0 fail, 12 skip, đúng như report.
- Đọc từng ca cần DB, đối chiếu code: username `member`/`admin` hợp lệ (≥ 3, chữ/số/_); tiêu đề ≥ 5, nội dung ≥ 20 ký tự; tên field form (`name`, `title`, `content`, `category`, `status`) đúng; status/redirect (302, 400, 403, 404) và các regex HTML (`<option value="web" selected>`, `id="filterQ"[^>]*value=`, `&amp;` trong link phân trang, `class="post-row"`) khớp output của view. `before` có `await Post.init()` nên text index có trước khi chạy `$text`. Dự kiến pass khi có MongoDB (chưa chạy thật).

## Vấn đề

| # | Mức | Chỗ | Mô tả | Đề xuất |
| --- | --- | --- | --- | --- |
| 1 | Thấp | `tests/categories-search.test.js:79` | Chỉ chờ `Post.init()`. Ca "chặn trùng tên" dựa vào unique index `name` của Category; trên DB test mới tinh, về lý thuyết index có thể chưa tạo xong (autoIndex chạy nền), lần chạy đầu có thể lưu được tên trùng. Thực tế gần như không xảy ra vì index trên collection rỗng tạo rất nhanh và `clearDb` không drop | `await Promise.all([Post.init(), Category.init()])` |
| 2 | Thấp | `postController.create/update` (`readCategory`) | Kiểm danh mục trước validate của Mongoose, nên khi danh mục sai chỉ báo một lỗi đó (các lỗi tiêu đề/nội dung báo ở lần gửi sau) và ô chọn quay về "Chưa phân loại". Chỉ xảy ra khi form bị sửa tay hoặc danh mục vừa bị xoá | Chấp nhận (giữ đơn giản) |
| 3 | Ghi nhớ | `categoryController.remove` | Bài được lưu đúng lúc admin xoá danh mục (sau `Category.exists`, trước `updateMany`) có thể giữ id danh mục đã xoá. View đã có `post.category && post.category.name` nên vẫn hiện "Chưa phân loại"; bảng admin không đếm vào "chưa phân loại" | Chấp nhận, đồ án localhost |
| 4 | Ghi nhớ | `partials/header.ejs` | Thêm link "Quản lý danh mục" cho admin; specs/04 chỉ liệt kê "Thống kê" (chưa có trang `/admin`). Không mâu thuẫn spec, chỉ cần để ý khi nhánh admin (UC15/16/20) merge | Khi có `/admin`, cân nhắc gom link vào trang đó |
| 5 | Ghi nhớ | `searchController.attachCommentCounts` | Trùng ~10 dòng với `postController.index` (report đã nêu) | Tách sau khi các nhánh song song merge |

Không có vấn đề mức Cao hoặc Trung bình.

## Kết luận

**Duyệt.** Code khớp spec UC03, UC14, BR5, BR7; các đề xuất #1, #2, #3, #5 của review plan đã áp dụng; không thấy lỗ hổng injection/XSS/500. Nên thêm `Category.init()` vào `before` của test (#1, một dòng). Trước khi merge `dev` → `main`: chạy `npm test` trên máy có `mongod` và thử tay giao diện như report đã ghi.
