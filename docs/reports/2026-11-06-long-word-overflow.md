# Report: từ dài không dấu cách làm trang cuộn ngang (`fix/long-word-overflow`)

- Ngày: 2026-11-06
- Plan: không có plan riêng. Phát hiện ở report UI/UX PR 4a ("Phát hiện ngoài phạm vi"); người dùng đồng ý làm ở PR nhỏ riêng
- Branch / PR: `fix/long-word-overflow` → PR vào `dev` (title `fix: từ dài không dấu cách không làm trang cuộn ngang (UI/UX)`)
- Trạng thái: xong, `npm test` 102/102 xanh. Còn một trang vẫn tràn vì nguyên nhân khác (xem "Phát hiện ngoài phạm vi")

## Đã làm

Report 4a chỉ ghi nhận tiêu đề và tag ở danh sách bài. Quét có hệ thống (dữ liệu chứa từ dài ở mọi trường người dùng nhập, 15 trang × 375px và 320px) cho thấy phạm vi rộng hơn: **24/30** trang×độ rộng bị tràn trước khi sửa.

| Nguồn tràn | Trang bị ảnh hưởng | Cách sửa |
| --- | --- | --- |
| Tiêu đề trong danh sách, `<h1>` (tiêu đề bài, từ khoá tìm kiếm, tên tag/danh mục), chip tag, chip danh mục, username ở dòng meta và bình luận | `/`, `/popular`, `/posts/:slug`, `/search`, `/tags/:tag`, `/categories/:slug` | `overflow-wrap: anywhere` cho `.layout__main h1`, `.post-row__title`, `.post-row__meta`, `.post-meta`, `.comment__author`, `.tag-chip`, `.category-chip` |
| Ô chọn danh mục rộng theo tên danh mục dài nhất (541px ở 375px) | `/posts/:slug/edit` (và form tạo bài) | `.form-select.w-auto { max-width: 100% }` |
| Ô bảng chứa chữ tự do (tiêu đề bài 2372px, 2602px) | `/me/posts`, `/admin/posts`, `/admin/users`, `/admin/categories` | Thêm lớp Bootstrap `text-break` vào đúng các ô tiêu đề, tác giả, username, email, slug (4 view, 6 ô) |

Một commit `fix:` (CSS + 4 view `.ejs`, +23/−6 dòng) và commit report này. Không đổi controller, route, model, `docs/specs/`; không thêm thư viện; không có test tự động mới (kiểm bố cục cần trình duyệt, xem bên dưới).

## Lệch so với plan (nếu có) và lý do

- Không có plan riêng nên không có gì để lệch. Phạm vi lớn hơn mô tả của report 4a ("tiêu đề, tag trong danh sách") vì quét cho thấy cùng một nguyên nhân ở nhiều trang.
- **Đã thử và bỏ một cách sửa sai:** áp `overflow-wrap: anywhere` cho mọi `.table td` làm trang `/me/posts` hết tràn, nhưng ở 768px cột ngày bị cắt giữa số ("6/11/2 026") và nút Sửa/Xoá bị bẻ từng chữ, vì `anywhere` cho phép *mọi* cột co về một ký tự. Chuyển sang `text-break` chỉ trên các ô có chữ tự do; ngày và nút giữ nguyên.

## Kết quả kiểm thử

- `npm test`: **102 test, 102 đạt, 0 lỗi, 0 skip.**
- Quét bố cục bằng Edge headless (script ngoài repo, không commit), DB riêng `nhom3_blog_fixprobe_test`, 15 trang × (375px, 320px), đo `document.documentElement.scrollWidth <= innerWidth`. Dữ liệu: username 30 chữ `u`, tiêu đề 60 và 200 chữ liền, tag 60 ký tự, tên danh mục 50 ký tự, từ khoá tìm kiếm 100 chữ `a`, một bình luận.

| Trang | Trước | Sau |
| --- | --- | --- |
| `/`, `/popular`, `/posts/:slug` (tiêu đề 60 và 200), `/search?q=…`, `/tags/:tag`, `/categories/:slug`, `/me/posts`, `/me/bookmarks`, `/posts/:slug/edit`, `/profile`, `/admin/posts`, `/admin/categories` | tràn ở 375px và 320px (rộng nhất 3257px) | **không tràn** ở cả hai độ rộng |
| `/admin/users` | tràn (686px) | **vẫn tràn 409px** (xem dưới) |

Tổng: 28/30 trang×độ rộng không tràn sau khi sửa (trước: 6/30). Đã xem ảnh chụp: danh sách ở 1366px (hàng bình thường không đổi, từ dài xuống dòng trong cột), danh sách và trang bài ở 375px, `/me/posts` ở 768px.

**Một lần chạy bị loại:** một lần chạy giữa chừng báo 30/30 nhưng thực ra DB rỗng (các trang trả 404/403, đăng nhập thất bại), nên "không tràn" vô nghĩa; tôi chỉ nhận ra khi xem ảnh chụp. Nghi có tiến trình khác dọn `nhom3_blog_test` cùng lúc (chưa xác nhận). Đã chuyển sang DB riêng và thêm kiểm tra "trang phải là 200 và có dữ liệu thử"; số liệu trên là của các lần chạy sau đó.

## Phát hiện ngoài phạm vi (không sửa)

- **`/admin/users` vẫn tràn 409px ở 375px và 320px**, không phải do từ dài: đáy của bảng là cột nút hành động (Khoá / Nâng lên admin / Hạ thành thành viên) trong một hàng `d-flex` không xuống dòng, cộng 5 cột. Hướng sửa: `flex-wrap` cho hàng nút hoặc bọc bảng trong `.table-responsive`. Làm riêng nếu cần (trang quản trị, ít dùng trên điện thoại).
- Chưa quét: modal xoá, dropdown, trang `/admin` (dashboard), `/register`, `/login` với dữ liệu dài (không có từ dài tự do ở đó), bình luận rất dài ở thẻ "Bình luận mới" (đã sửa ở PR 4a).

## Chưa kiểm thử

- Chỉ Edge (Chromium) headless: chưa kiểm Chrome/Firefox/Safari, cảm ứng thật. `overflow-wrap: anywhere` hỗ trợ tốt ở trình duyệt hiện đại nhưng chưa thử trình duyệt cũ.
- Chưa so sánh chi tiết bố cục bảng ở các độ rộng giữa (vd 600px) với dữ liệu thường: chỉ xem ảnh ở 768px.
- Không có test tự động cho bố cục (cần trình duyệt, như đã ghi ở plan UI/UX, rủi ro 12).

## Việc còn lại

- Người dùng duyệt và merge.
- Quyết định có sửa `/admin/users` trên điện thoại hay không.
