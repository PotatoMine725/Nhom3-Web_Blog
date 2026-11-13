# Report: phiên làm việc từ xa ngày 2026-11-10

- Ngày: 2026-11-10
- Người làm: Claude (chạy trên máy của Hoang qua Remote Control, Hoang vắng mặt)
- Yêu cầu: đọc `docs/`, tìm các bước chưa làm trong `specs/05`, làm tiếp theo thứ tự (plan → code → report → PR vào `dev`), tự quyết các câu hỏi giữa chừng và ghi lại lý do.

## Tóm tắt

- Repo local: `D:\Code\CSDLPQH` (remote `PotatoMine725/Nhom3-Web_Blog`).
- Ghi chú giao việc nói "tiếp theo là bước 3 (CRUD bài viết)", nhưng repo thực tế đã xa hơn nhiều: **bước 1–10 của `specs/05` đều đã merge vào `dev`** (PR #4 đến #36). Bước duy nhất còn lại là **bước 11: kiểm thử thủ công UC01–UC20**.
- Đã làm bước 11: plan, chạy kiểm thử 52 dòng (67 phép kiểm): 51 dòng đạt, 1 dòng đạt một phần (chưa kiểm trang 500), không tìm thấy lỗi trái spec. Chi tiết: `reports/2026-11-10-manual-test.md`.
- Không có PR sửa lỗi nào vì không có lỗi.

## Đối chiếu các bước trong `specs/05`

| Bước | Nội dung | PR | Trạng thái |
| --- | --- | --- | --- |
| 1 | Khung project, kết nối DB | #1 | Đã merge |
| 2 | Đăng ký / đăng nhập / đăng xuất, `create-admin` | #4 | Đã merge |
| 3 | CRUD bài viết | #8 | Đã merge |
| 4 | Bình luận | #11 | Đã merge |
| 5 | Danh mục, tag, tìm kiếm | #22 | Đã merge |
| 6 | Admin người dùng, kiểm duyệt, hồ sơ | #20 | Đã merge |
| 7–8 | Like, lưu bài, lượt xem, bài nổi bật | #21 | Đã merge |
| 9 | Ảnh bìa | #24 | Đã merge |
| 10 | Trang thống kê admin | #23 | Đã merge |
| 11 | Kiểm thử thủ công UC01–UC20 | [#38](https://github.com/PotatoMine725/Nhom3-Web_Blog/pull/38) | Đã chạy, chờ nhóm duyệt |

Ngoài ra các PR giao diện (#13–#17, #27–#31), sửa lỗi (#33, #34), sửa spec 04 (#32, #36) đã merge. `dev` đã được merge vào `main` một lần ở PR #35. PR #37 (`fix/ui-nits`) đang mở, chờ duyệt.

## Quyết định và lý do

1. **Không làm lại bước 3.** Ghi chú giao việc đã cũ; `git log`, danh sách PR và `docs/reports/` cho thấy bước 3–10 đã xong. Làm theo trạng thái thật của repo.
2. **Chạy plan khi chưa được duyệt.** `CLAUDE.md` yêu cầu chờ người dùng duyệt plan. Hoang vắng mặt và đã giao "tự quyết". Plan bước 11 chỉ chạy thử, không đổi code, spec hay dữ liệu thật, nên chạy luôn; plan vẫn được commit trước khi chạy để truy vết.
3. **Dùng MongoDB mà không hỏi trước.** `CLAUDE.md` yêu cầu hỏi trước khi chạy thứ gì cần DB. Lúc bắt đầu, cổng 27017 đã mở (Hoang đã bật `mongod`). Để an toàn, mọi thứ chạy trên **DB riêng `nhom3_blog_manual_test`**, cổng 3100; không đọc, không ghi DB thật `nhom3_blog`; không đụng `nhom3_blog_test` của `npm test`. `npm test` chỉ chạy một lần trước khi bật server kiểm thử (110/110 pass).
4. **`create-admin` chạy với `MONGODB_URI` ghi đè.** Script đọc `.env` nên nếu chạy thường sẽ nâng quyền user trong DB thật. Đã đọc script, xác nhận dùng `process.env.MONGODB_URI`, rồi chạy với biến trỏ vào DB kiểm thử.
5. **Bảo vệ `uploads/`.** Chụp danh sách file trước khi kiểm, sau khi kiểm chỉ được xoá file mới sinh. Thực tế trước và sau đều chỉ có `.gitkeep`.
6. **Kịch bản kiểm thử không commit.** Để tránh thêm code không có trong plan/spec (không over-engineering). Report ghi đủ thao tác và kết quả để làm lại được.
7. **Không đánh dấu bước 11 là xong.** Kiểm thử do Claude chạy (kịch bản HTTP + trình duyệt), không phải người dùng bấm tay. Nhóm xem report rồi mới chốt.
8. **Quan sát tên danh mục phân biệt hoa thường: không sửa.** Code đúng `specs/03`; muốn đổi thì phải sửa spec trước và cần nhóm duyệt. Chỉ ghi lại.
9. **Lệch giữa plan và code ở UC04** (plan ghi đăng ký xong tự đăng nhập; code chuyển sang `/login`): spec không quy định, nên coi là plan viết sai, giữ nguyên code.
10. **Branch tạo từ `origin/dev`**, không từ `fix/ui-nits` (đang checkout lúc bắt đầu), để PR không kéo theo thay đổi chưa duyệt của #37. Thư mục `.claude/` chưa track được để nguyên.

## Thay đổi trong repo

- `docs/plans/2026-11-10-manual-test.md` (plan bước 11)
- `docs/reports/2026-11-10-manual-test.md` (kết quả)
- `docs/reports/remote-session-2026-11-10.md` (file này)

Không đổi code, spec, schema.

## Việc còn lại cho nhóm

- Duyệt PR #38 bước 11 (chỉ tài liệu) vào `dev`: https://github.com/PotatoMine725/Nhom3-Web_Blog/pull/38
- Duyệt PR #37 (`fix/ui-nits`).
- Xem report kiểm thử, bấm lại vài luồng nếu muốn, rồi đánh dấu bước 11 trong `specs/05` là xong.
- Quyết định về tên danh mục khác hoa thường.
- Tuỳ chọn: drop DB `nhom3_blog_manual_test` (dữ liệu thử, không dùng nữa).
- Khi `dev` ổn định trên web: quyết định merge `dev` → `main` (chỉ nhóm quyết).

## Cập nhật sau khi Hoang trả lời (2026-11-10, 18:08)

Hoang trả lời: "duyệt 2 PR, tên danh mục không phân biệt hoa thường. Tất cả nội dung liên quan đến điện thoại đánh dấu không phát triển".

- **Merge PR #37 và #38 vào `dev`** (merge commit, giống các PR trước). Hai PR không đụng cùng file. Không merge gì vào `main`.
- **Tên danh mục không phân biệt hoa thường:** [PR #39](https://github.com/PotatoMine725/Nhom3-Web_Blog/pull/39), branch `fix/category-name-case`. Sửa `specs/03` (Hoang đã đồng ý trong tin nhắn), kiểm tra trong hook `pre('validate')` của model, thêm 1 test; `npm test` 111/111. Quyết định: kiểm ở tầng ứng dụng, không đổi index MongoDB, vì đổi tuỳ chọn index `name_1` trên DB thật cần xoá index cũ; chấp nhận khả năng hai request cùng lúc lọt (chỉ admin thêm danh mục).
- **Điện thoại không phát triển:** PR `docs/mobile-not-developed`. Thêm một dòng "Ngoài phạm vi" ở `specs/01` và dòng lịch sử thay đổi; đánh dấu "Không phát triển" ở các mục còn mở về điện thoại trong `reports/2026-11-06-long-word-overflow.md` (`/admin/users` tràn ngang ở 375px), `reports/2026-11-06-ui-nits.md`, `reports/2026-11-10-manual-test.md`. Quyết định: **không xoá** code giao diện điện thoại đã có (menu ☰, ô tìm kiếm thu gọn), vì xoá là đổi hành vi và cần plan riêng; chỉ ngừng phát triển và kiểm thử thêm. Plan/spec cũ (`plans/2026-10-31-ui-ux.md`, `specs/04`) giữ nguyên vì là lịch sử đã làm.
- PR này tạo từ branch của PR #39 để không xung đột ở bảng lịch sử thay đổi của `specs/01`: **merge #39 trước**, rồi PR này.
