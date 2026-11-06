# Report: URL có tham số hỏng trả 400 (`fix/malformed-url-400`)

- Ngày: 2026-11-06
- Plan: không có plan riêng. Việc này đã được chốt ở `plans/2026-10-31-ui-ux.md` (PR 4, rủi ro 6: "sửa thành 400/404 làm ở PR `fix/` riêng, không trộn vào PR giao diện"); ghi nhận trước đó là case 42 của plan categories-search
- Branch / PR: `fix/malformed-url-400` → PR vào `dev` (title `fix: URL có tham số hỏng trả 400 thay vì 500`)
- Trạng thái: xong, `npm test` 106/106 xanh (MongoDB bật, DB `nhom3_blog_test`)

## Đã làm

Nguyên nhân (đã tái hiện trên app thật trước khi sửa): khi một tham số route có mã hoá phần trăm hỏng (`%`, `%zz`, `%E0%A4%A`), router của Express ném `URIError` có `status = statusCode = 400`. `errorHandler` (thêm ở UI/UX PR 4a) bỏ qua `err.status` nên luôn trả 500. Ảnh hưởng mọi route có `:param`: `/posts/%`, `/posts/%/edit`, `/tags/%`, `/categories/%`. Không ảnh hưởng `/%`, `/uploads/%`, `/search?q=%` (không ném lỗi).

| Commit | Nội dung |
| --- | --- |
| `65d79db` `test: URL có tham số hỏng phải trả 400, không phải 500` | 3 test, chạy trước khi sửa: **3 đỏ** (8 test cũ vẫn xanh) |
| commit `fix:` | `src/middlewares/errorHandler.js`: `err.status === 400` thì trả 400 và render `errors/400`, không `console.error` (lỗi do client); mọi lỗi khác (kể cả status khác như 418) vẫn 500 như trước. `src/views/errors/400.ejs` mới, dùng khung chung `partials/error-page`. |
| commit chứa file này | Report |

Test mới (`tests/ui-extras.test.js`): view `errors/400` (khung lỗi, mã 400, nút về trang chủ); app Express nhỏ ném lỗi `status 400` → trả 400, không lộ chi tiết, không gọi `console.error`, còn lỗi `status 418` vẫn 500; trên app thật (cần MongoDB): `/posts/%`, `/posts/%zz`, `/tags/%`, `/categories/%`, `/posts/%/edit` đều 400 có khung lỗi, thành viên đã đăng nhập cũng 400 với header đúng người dùng, và `/posts/khong%20co` (mã hoá đúng, không có bài) vẫn 404.

## Lệch so với plan (nếu có) và lý do

- Không có plan riêng nên không có gì để lệch; phạm vi bám đúng dòng rủi ro 6.
- **Chỉ xử lý status 400**, theo yêu cầu "trả 400". Lỗi có status 4xx khác (vd 413 khi thân form quá lớn từ `express.urlencoded`) vẫn trả 500 như cũ; xem "Phát hiện ngoài phạm vi".
- Lỗi 400 không còn in stack ra terminal (trước đây in, vì bị coi là 500). Lỗi 500 thật vẫn in.

## Kết quả kiểm thử

- `npm test`: **106 test, 106 đạt, 0 lỗi, 0 skip.**
- Tái hiện lại bằng script ngoài repo trên app thật (DB `nhom3_blog_test`):

| URL | Trước | Sau |
| --- | --- | --- |
| `/posts/%`, `/posts/%/edit`, `/tags/%`, `/categories/%`, `/posts/%zz`, `/posts/%E0%A4%A` | 500 | **400** |
| `/%`, `/uploads/%` | 404 | 404 |
| `/search?q=%` | 200 | 200 |
| `/posts/ok%20slug` (mã hoá đúng, không có bài) | 404 | 404 |

## Phát hiện ngoài phạm vi (không sửa)

- Các lỗi 4xx khác từ middleware (vd thân form > 100 KB → 413, thân form hỏng) vẫn ra 500. Nếu muốn, có thể mở rộng handler dùng `err.status` cho mọi 4xx kèm trang lỗi tương ứng; đó là đổi hành vi lớn hơn nên chưa làm.
- Chưa xem trang 400 bằng trình duyệt thật (giao diện dùng lại khung 403/404/500 đã kiểm ở UI/UX PR 4a; test chỉ kiểm markup). Nếu PR #31 (chế độ tối) merge sau PR này thì trang 400 tự theo giao diện tối vì dùng chung khung.

## Việc còn lại

- Người dùng duyệt và merge.
