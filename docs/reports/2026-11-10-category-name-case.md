# Report: Tên danh mục không phân biệt hoa thường

- Ngày: 2026-11-10
- Plan: `plans/2026-11-10-category-name-case.md`
- Branch / PR: `fix/category-name-case` → `dev`

## Đã làm

- `specs/03`: ràng buộc `name` của Category ghi rõ "không phân biệt hoa thường"; `specs/01` thêm dòng lịch sử thay đổi (Hoang quyết định ngày 2026-11-10).
- `src/models/Category.js`: hook `pre('validate')` tìm danh mục khác có tên trùng bằng regex `^tên$` cờ `i` (đã escape ký tự đặc biệt); trùng thì báo "Tên danh mục đã tồn tại", không sinh slug. Controller không đổi: lỗi validate đã được hiện ở form thêm (400) và flash khi đổi tên.
- `tests/categories-search.test.js`: thêm 1 test cho 4 dòng kiểm thử đầu của plan.

## Lệch so với plan (nếu có) và lý do

- Không có.

## Kết quả kiểm thử

| # | Thao tác | Kết quả | Đạt? |
| --- | --- | --- | --- |
| 1 | Có "Lập trình Web", thêm "LẬP TRÌNH WEB" / "lập trình web" | 400 "Tên danh mục đã tồn tại" (MongoDB so khớp đúng cả chữ có dấu viết hoa) | Đạt |
| 2 | "C++" rồi "c++"; "Node.js" rồi "Nodexjs" | "c++" bị chặn; "Nodexjs" thêm được | Đạt |
| 3 | Đổi tên "C++" thành "lập trình web" | Flash lỗi, tên không đổi | Đạt |
| 4 | Đổi "Lập trình Web" thành "LẬP TRÌNH WEB" | Lưu được | Đạt |
| 5 | `npm test` | 111/111 pass (110 cũ + 1 mới) | Đạt |

Đã thử trả `Category.js` về bản cũ: test mới fail, nên test bắt được lỗi này.

## Việc còn lại

- Nếu DB thật `nhom3_blog` đã có danh mục trùng khác hoa thường, chúng vẫn giữ nguyên; admin tự đổi tên hoặc xoá.
