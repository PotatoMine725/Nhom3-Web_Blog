# Plan: Danh mục, tag, tìm kiếm kết hợp (bước 5)

- Ngày: 2026-11-05
- Branch: `feature/categories-search` (tạo từ `origin/chore/test-setup` = `dev` + hạ tầng test)
- Spec liên quan: `specs/02-use-cases.md` (UC03, UC08/UC09 phần chọn danh mục, UC14), `specs/03-data-model.md` (Category, index), `specs/04-routes-and-views.md`, `specs/05-architecture.md` (bước 5)
- Đáp ứng: UC03 (đầy đủ), UC14, BR5, BR7
- Thay cho: `plans/2026-10-31-search.md` (bản cũ chỉ có từ khoá). Áp dụng review `reviews/2026-11-03-categories-search.md` (đề xuất #1, #2, #3, #5 và các mục "Đã kiểm").

## Mục tiêu

Khách tìm bài theo từ khoá, lọc theo danh mục và tag (riêng hoặc kết hợp), xem bài theo `/categories/:slug`, `/tags/:tag`. Thành viên chọn danh mục khi viết/sửa bài. Admin thêm, đổi tên, xoá danh mục; xoá thì bài về "Chưa phân loại".

## Ngoài phạm vi

- Tìm trong nội dung bài, tìm không dấu, tìm theo tiền tố, gợi ý khi gõ (text index chỉ trên `title`, theo spec 03).
- Trang `/admin` tổng, quản lý user/bài (UC15, UC16, UC20: nhánh khác).
- Cache danh sách danh mục, thêm thư viện, đổi schema Post, đổi spec.

## Quyết định thiết kế

- **File riêng** để giảm xung đột với các nhánh song song (admin UC15/16, like/bookmark/popular): `src/routes/categories.js` (gồm `/search`, `/categories/:slug`, `/tags/:tag`, `/admin/categories*`), `src/controllers/searchController.js`, `src/controllers/categoryController.js`. `postController.index` không tách helper `commentCount`; `searchController` có bản `attachCommentCounts` riêng (trùng khoảng 10 dòng, dọn sau khi các nhánh merge).
- **Model `Category`** theo spec 03: `name` (required, unique, trim, ≤ 50), `slug` (unique, lowercase), `timestamps: true`; hook `pre('validate')` sinh slug khi tạo/đổi tên, trùng thì `-2`, `-3` (giống Post). Tên rỗng sau `slugify` thì dùng `danh-muc`. `unique` phân biệt hoa thường (review, trả lời câu hỏi 1).
- **`loadCategories`** gắn toàn app sau `loadUser` (sau `express.static`): `res.locals.categories` (name, slug) cho menu header, form bài, form lọc. Cần toàn app vì trang 403/404 cũng có header.
- **Quyền admin**: chỉ `requireAdmin` (review #5, spec 04): khách và member đều 403.
- **`/search`**: `q` chuẩn hoá như plan cũ (`str`, bỏ `"`, trim, ≤ 100 ký tự); `category` = slug (trim, lowercase); `tag` = trim + lowercase. Cả ba rỗng → redirect `/` (2a). Lọc `status: 'published'` + điều kiện đã nhập. Danh mục không tồn tại → `_id: { $in: [] }` (3b, không gán `category: null`). Có `q` thì sắp theo `textScore`, rồi `createdAt`, `_id`; không thì mới nhất trước. Pagination truyền `query` chỉ gồm tham số có giá trị.
- **`/categories/:slug`** không tồn tại → 404 (review câu 3). **`/tags/:tag`**: tag chuẩn hoá trim + lowercase; `basePath` dùng `encodeURIComponent`.
- **View `posts/index`** dùng chung: chỉ trang chủ truyền `tab`, mọi chỗ đọc dùng `locals.tab`. Trang khác: ẩn tab và nút "Viết bài", hiện "N kết quả", rỗng thì "Không tìm thấy bài viết phù hợp" (có `locals.emptyText` để nhánh bookmark dùng chữ khác). `/search` có form lọc (từ khoá, chọn danh mục, tag) giữ giá trị.
- **Thẻ bài / trang bài**: thẻ bài hiện chip danh mục (khi có), tag thành link `/tags/:tag`; trang bài hiện "Danh mục: …" hoặc "Chưa phân loại". `populate('category', 'name slug')` ở `index`, `show`, `commentController.create` (2 nơi gọi `renderShow`) và danh sách tìm kiếm.
- **Form bài**: ô chọn danh mục ("Chưa phân loại" = `""` → `null`). Id sai định dạng hoặc danh mục không tồn tại → render lại form 400 "Danh mục không tồn tại". `showNew` truyền `category: ''` (review #3).
- **Admin `admin/categories`**: bảng tên (ô sửa tên inline + Lưu), đường dẫn, số bài (đếm cả nháp), nút Xoá (`confirm()` chữ cố định); form thêm; dòng "Bài chưa phân loại: N". Biến bảng là `rows` (review #2). Lỗi thêm → render lại 400 giữ tên; lỗi sửa → flash + redirect. Lỗi 11000 phân biệt `keyPattern.name` ("Tên danh mục đã tồn tại") và `keyPattern.slug` ("bấm Lưu lại lần nữa") (review #1).
- **Xoá danh mục**: `deleteOne` trước, rồi `Post.updateMany({ category }, { $set: { category: null } }, { timestamps: false })` để giữ `updatedAt` của bài. Xoá trước để form bài không chọn được danh mục đó trong lúc gỡ.
- **Header**: thêm dropdown "Danh mục", giữ `q` trong ô tìm kiếm (`locals.q`), admin có link "Quản lý danh mục" trong menu tài khoản. Sidebar: chip tag phổ biến thành link.

## Các bước

1. Model `src/models/Category.js`.
2. Middleware `src/middlewares/loadCategories.js`, gắn ở `src/app.js`; mount `src/routes/categories.js`.
3. `src/controllers/searchController.js` (search, byCategory, byTag).
4. `src/controllers/categoryController.js` + view `src/views/admin/categories.ejs`.
5. Danh mục trong form bài: `src/controllers/postController.js`, `src/views/posts/form.ejs`; populate ở `show`, `index`, `commentController.create`.
6. View: `posts/index.ejs`, `partials/post-card.ejs`, `posts/show.ejs`, `partials/header.ejs`, `partials/right-sidebar.ejs`, CSS.
7. Test `tests/categories-search.test.js`, report.

## Kiểm thử

| # | Thao tác | Kết quả mong đợi |
| --- | --- | --- |
| 1 | Khách / member vào `GET`, `POST /admin/categories`, `/edit`, `/delete` | 403, DB không đổi |
| 2 | Admin thêm "  Lập trình Web  " | Lưu tên đã trim, slug `lap-trinh-web` |
| 3 | Thêm trùng tên; tên rỗng; tên 51 ký tự | 400 kèm lỗi |
| 4 | Thêm "Lập trình web!" (khác tên, cùng slug) | slug `lap-trinh-web-2` |
| 5 | Đổi tên | slug đổi theo; id sai → 404; tên rỗng → flash lỗi, không đổi |
| 6 | Xoá danh mục có bài | Bài `category = null`, `updatedAt` không đổi; xoá lại → 404 |
| 7 | `/categories/web` | Chỉ bài đã đăng của danh mục; slug không có → 404 |
| 8 | `/tags/NodeJS` | Khớp tag `nodejs`, không có bài nháp |
| 9 | `/search` không điều kiện, `q` chỉ có `"` | Redirect `/` |
| 10 | `q`; `q` + danh mục; danh mục + tag | Khớp đủ điều kiện, không bài nháp, form lọc và ô header giữ giá trị |
| 11 | Danh mục không tồn tại | 0 kết quả, "Không tìm thấy bài viết phù hợp" |
| 12 | Tham số lặp / object (`q=a&q=b`, `category[$ne]=x`) | Không 500 |
| 13 | 11 bài khớp | Link trang 2 giữ `q`, `category`; `page=99` kẹp về trang cuối |
| 14 | Viết bài chọn danh mục; danh mục sai / rác; sửa bỏ chọn | Lưu đúng; 400 "Danh mục không tồn tại"; về `null` |
| 15 | Trang bài, thẻ bài, header | Hiện danh mục (link), tag là link, menu danh mục |
| 16 | Render view bằng dữ liệu giả (không DB) | `posts/index` 3 chế độ, `admin/categories` không lỗi; dữ liệu được escape |

## Rủi ro / câu hỏi mở

1. Header thêm dropdown và một link admin: nhánh admin (UC15/16) cũng có thể sửa menu tài khoản → xung đột nhỏ ở `header.ejs`.
2. `posts/index.ejs` đổi cấu trúc (biến `isHome`): nhánh popular/bookmarks dùng chung view nên rebase cần xem lại; không truyền `tab` thì view vẫn chạy.
3. Đổi tên danh mục đổi slug, link `/categories/<slug cũ>` thành 404. Đúng spec 03 (đổi name sinh lại slug); không lưu slug cũ.
4. Không có đề xuất sửa spec.
