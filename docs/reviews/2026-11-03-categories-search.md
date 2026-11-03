# Review: Plan danh mục, tag, tìm kiếm kết hợp (bước 5)

- Ngày: 2026-11-03
- Người review: Claude (đọc plan, đối chiếu spec và code trên `dev` = `325c204`; không chạy MongoDB)
- PR / branch: plan cho `feature/categories-search` (chưa có code)
- Đối chiếu: `specs/02` (UC03, UC14), `specs/03`, `specs/04`, `specs/05`, `plans/2026-10-31-search.md`, `plans/2026-10-31-ui-ux.md`

## Review plan

### Khớp spec?

- [x] Route, quyền đúng specs/04: `/search`, `/categories/:slug`, `/tags/:tag` công khai; 4 route `/admin/categories*` có `requireLogin` + `requireAdmin`.
- [x] Schema Category đúng specs/03 (name unique, trim, ≤ 50; slug unique sinh từ name). Không đổi schema Post.
- [x] UC03 đủ luồng chính và luồng phụ 2a, 3a, 3b (danh mục không tồn tại ép 0 kết quả bằng `_id: { $in: [] }`, không gán `category: null`). UC14 đủ thêm, sửa, xoá; xoá thì bài về "Chưa phân loại".
- [x] BR5 (chỉ `published` ở mọi trang danh sách), BR7 (10 bài/trang, kẹp page).
- [x] Không thêm thư viện, không đổi spec.

### Đã kiểm, không có vấn đề

- `partials/pagination.ejs` trên `dev` đã nhận `query` và dùng `URLSearchParams`, nên plan chỉ cần truyền `query`. `basePath` của tag có `encodeURIComponent`, đúng vì partial ghép `basePath` trực tiếp.
- `posts/index.ejs` hiện đọc biến trần `tab` ở 4 chỗ. Plan đổi sang `locals.tab`, nếu không 3 trang mới sẽ báo 500.
- `renderShow` có 2 nơi gọi (`show` và `commentController.create`). Plan thêm `populate('category')` ở cả hai.
- `requireAdmin` render view 403 có header, nên cần `loadCategories` toàn app như plan chọn. Middleware đứng sau `express.static`, nên không chạy cho file tĩnh.
- `find(filter, { score: { $meta: 'textScore' } })` vẫn trả đủ field của bài. `countDocuments` chạy được với `$text`.
- `str()` chặn mảng và object, không có chỗ nào dựng `RegExp`, nên không cần escape regex.
- `confirm()` khi xoá danh mục dùng chữ cố định, không chèn tên danh mục vào JS.
- `updateMany(..., { timestamps: false })` giữ `updatedAt` của bài.

### Vấn đề

| # | Mức | Chỗ | Mô tả | Đề xuất |
| --- | --- | --- | --- | --- |
| 1 | Thấp | `categoryController.create` | Hai request tạo cùng tên ("Node js" và "Node.js") cùng lúc có thể bị lỗi 11000 trên `slug`, không phải `name`, và hiện câu "Tên danh mục đã tồn tại" sai | Phân biệt theo `err.keyPattern`: `name` thì "Tên danh mục đã tồn tại"; `slug` thì "Bấm Lưu lại lần nữa", giống `validationMessages` của Post |
| 2 | Thấp | `categoryController.list` | Nếu truyền danh sách bảng admin với tên `categories`, biến này sẽ đè `res.locals.categories` của header. Vẫn chạy được, nhưng khó đọc | Đặt tên khác, ví dụ `rows` |
| 3 | Rất thấp | `showNew` | Plan chỉ nói `showEdit` truyền `values.category` | `showNew` truyền `category: ''` cho đồng bộ |
| 4 | Ghi nhớ | `loadCategories` sort `{ name: 1 }` | So theo mã ký tự, nên tên bắt đầu bằng "Đ" đứng sau "Z" | Chấp nhận |

### Trả lời câu hỏi mở

1. Giữ đúng spec: `unique` phân biệt hoa thường. Không đổi spec 03.
2. Menu danh mục để ở header theo spec 04 là đủ.
3. Đồng ý: `/categories/:slug` không tồn tại trả 404.
4. Đồng ý: bảng admin đếm cả bài nháp.
5. Đồng ý: lỗi sửa dùng flash + redirect, lỗi thêm render lại 400.
6. Đồng ý: không cache.
7. và 8. Đồng ý, ghi kết quả thật vào report.

### Kết luận

**Duyệt.** Nên sửa #1–#3 lúc code (mỗi cái 1–2 dòng).
