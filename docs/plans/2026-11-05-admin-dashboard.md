# Plan: Trang thống kê admin

- Ngày: 2026-11-05
- Branch: `feature/admin-dashboard` (tạo từ `origin/feature/like-bookmark-popular`, đã gồm test-setup, danh mục/tìm kiếm, admin/hồ sơ, like/bookmark/popular)
- Spec liên quan: `specs/02` (UC20), `specs/03` (mục "Truy vấn thống kê"), `specs/04` (route `/admin`, view `admin/dashboard`, header), `specs/05` bước 10
- Đáp ứng: UC20

## Mục tiêu

Admin mở `/admin` thấy các con số tổng (user, bị khoá, bài theo trạng thái, bình luận, like) và các bảng: bài đã đăng theo tháng (6 tháng gần nhất, thanh ngang CSS), top 5 tác giả, top 5 bài nhiều like / bình luận / lượt xem. Khách và member bị 403.

## Ngoài phạm vi

- Ảnh bìa (bước 9, agent khác làm song song): không đụng `postController`, `posts/form`, `posts/show`, `post-card`, `app.js`, `package.json`.
- Thư viện biểu đồ, lọc theo khoảng thời gian, xuất file, cache kết quả thống kê.

## Các bước

1. Controller mới `statsController.js` (tách khỏi `adminController` cho gọn file):
   - `loadStats(now)`: chạy song song bằng `Promise.all` đúng các truy vấn ở spec 03: `countDocuments` user / user bị khoá / comment / like; `$group` bài theo `status`; bài published theo tháng (`$match` published + `createdAt` ≥ ngày 1 của tháng cách 5 tháng → `$group` theo `$year`/`$month` → `$sort`); top 5 tác giả (`$match` published → `$group` author → `$sort` → `$limit` → `$lookup` users); top 5 bài nhiều like và nhiều bình luận (`$group` post → `$lookup` posts → `$match` published → `$sort` → `$limit`); top 5 bài nhiều views (`find` published, sort views).
   - `fillMonths(rows, now)`: hàm thuần, trả đủ 6 tháng cũ → mới, tháng trống = 0, kèm `percent` so với tháng lớn nhất (tháng lớn nhất 0 thì percent 0).
   - `dashboard`: render `admin/dashboard`.
   — file: `src/controllers/statsController.js`
2. Route `GET /admin` với `requireAdmin` — file: `src/routes/admin.js`.
3. View `admin/dashboard`: 4 thẻ số liệu (Bootstrap `card`), bảng theo tháng có thanh ngang (Bootstrap `.progress`, `style="width: N%"`), 4 bảng top; bảng rỗng hiện "Chưa có dữ liệu"; link bài `/posts/:slug`; in dữ liệu bằng `<%=` — file: `src/views/admin/dashboard.ejs`.
4. Header: thêm "Thống kê" (`/admin`) đầu nhóm "Quản trị" — file: `src/views/partials/header.ejs`.
5. Test — file: `tests/admin-dashboard.test.js`.

## Kiểm thử

| # | Thao tác | Kết quả mong đợi |
| --- | --- | --- |
| 1 | `fillMonths` với tháng 2/2026 (qua năm), dữ liệu 10/2025 và 2/2026 | 6 tháng 09/2025 → 02/2026, tháng trống 0, percent 50 / 100 |
| 2 | `fillMonths` không có dữ liệu | 6 tháng đều 0, percent 0 |
| 3 | Khách, member mở `/admin`; admin mở `/admin` | 403, 403, 200; header admin có link "Thống kê" |
| 4 | DB chỉ có admin | Bảng tháng + 4 bảng top hiện "Chưa có dữ liệu", số liệu 1 user, 0 bài / bình luận / like |
| 5 | 4 user (1 khoá), 4 bài published (1 bài cách 7 tháng) + 1 nháp nhiều like/bình luận/views nhất | Đếm đúng; bảng tháng chỉ tính bài published trong 6 tháng; bài nháp không vào top nào và không xuất hiện trên trang; top đúng thứ tự; có thanh 100% và 50% |
| 6 | 7 bài có like / views | Top tối đa 5 dòng |

## Quyết định tự chốt

1. Controller riêng `statsController.js` thay vì thêm vào `adminController.js`: thống kê là một use case riêng, file admin không phình thêm, ít xung đột với nhánh khác. Route vẫn nằm trong `routes/admin.js`.
2. "6 tháng gần nhất" = tháng hiện tại và 5 tháng trước, tính từ ngày 1 lúc 0 giờ. Gom `$year` / `$month` theo múi giờ của máy chạy server (`Intl...timeZone`), khớp với mốc tính bằng `Date` local, để bài đăng ngày 1 không bị tính sang tháng trước (MongoDB mặc định gom theo UTC).
3. Bảng tháng luôn có đủ 6 dòng (điền 0); nếu cả 6 tháng đều 0 thì coi là rỗng, hiện "Chưa có dữ liệu".
4. Thanh ngang dùng `.progress` / `.progress-bar` có sẵn của Bootstrap (chỉ CSS) với `style="width: N%"`, không thêm CSS vào `style.css` để tránh xung đột với nhánh ảnh bìa. Thanh `aria-hidden`, con số bên cạnh là dữ liệu.
5. Top 5 bài nhiều lượt xem lấy mọi bài published (kể cả 0 lượt xem), đúng `find` ở spec 03. Hoà thì bài mới hơn trước. Top like / bình luận / tác giả hoà thì sắp theo `_id` để thứ tự ổn định.
6. Không thêm "Thống kê" vào `left-nav` (spec 04 chỉ yêu cầu ở menu người dùng trên header).

## Rủi ro / câu hỏi mở

- Các truy vấn quét toàn collection (không cache). Với dữ liệu đồ án là đủ nhanh; spec 03 cũng không yêu cầu lưu kết quả.
- Spec 03 viết pipeline like/bình luận là `$lookup` → `$match` → `$sort` → `$limit` (lookup trên mọi bài có like trước khi cắt 5). Giữ đúng thứ tự này vì phải lọc bài nháp trước khi lấy top 5.
