# Plan: Tên danh mục không phân biệt hoa thường

- Ngày: 2026-11-10
- Branch: `fix/category-name-case`
- Spec liên quan: `specs/03-data-model.md` (Category)
- Đáp ứng: UC14

## Mục tiêu

Admin không tạo được hai danh mục chỉ khác nhau ở chữ hoa/thường (vd "Lập trình" và "lập trình"). Quyết định của Hoang ngày 2026-11-10, sau quan sát ở `reports/2026-11-10-manual-test.md`.

## Ngoài phạm vi

- Không đổi index trong MongoDB (không thêm collation): index `name_1` đã có trên DB thật, đổi tuỳ chọn index cần xoá index cũ. Kiểm tra ở tầng ứng dụng là đủ cho trang admin một người dùng.
- Không gộp hay sửa các danh mục trùng đã có sẵn trong DB (nếu có). Admin tự đổi tên/xoá nếu cần.
- Không chuẩn hoá Unicode (dựng sẵn / tổ hợp).

## Các bước

1. Sửa spec 03: cột ràng buộc của `name` thành "unique (không phân biệt hoa thường), trim, tối đa 50 ký tự"; ghi lịch sử thay đổi ở spec 01 — file: `docs/specs/03-data-model.md`, `docs/specs/01-business-requirements.md`.
2. Trong hook `pre('validate')` của Category: khi tạo mới hoặc đổi tên, tìm danh mục khác có tên trùng không phân biệt hoa thường (regex `^...$` cờ `i`, có escape ký tự đặc biệt); có thì `invalidate('name', 'Tên danh mục đã tồn tại')`. Đổi tên chính nó sang cách viết hoa khác vẫn được — file: `src/models/Category.js`.
3. Test: thêm "LẬP TRÌNH WEB" khi đã có "Lập trình Web" bị 400; tên có ký tự đặc biệt (`C++`, `Node.js`) không làm lỗi regex; đổi tên trùng (khác hoa thường) với danh mục khác bị chặn; đổi tên chính nó sang cách viết khác được — file: `tests/categories-search.test.js`.

## Kiểm thử

| # | Thao tác | Kết quả mong đợi |
| --- | --- | --- |
| 1 | Có "Lập trình Web", thêm "LẬP TRÌNH WEB" / "lập trình web" | 400 "Tên danh mục đã tồn tại", không thêm |
| 2 | Thêm "C++" rồi "c++"; thêm "Node.js" rồi "Nodexjs" | "c++" bị chặn; "Nodexjs" thêm được (dấu `.` không bị hiểu là ký tự bất kỳ) |
| 3 | Đổi tên danh mục B thành "lập trình web" | Flash lỗi, B không đổi |
| 4 | Đổi tên "Lập trình Web" thành "LẬP TRÌNH WEB" | Lưu được |
| 5 | `npm test` | Toàn bộ pass |

## Rủi ro / câu hỏi mở

- Hai request thêm cùng lúc vẫn có thể lọt (kiểm ở ứng dụng, không ở index). Chấp nhận: chỉ admin thêm danh mục.
