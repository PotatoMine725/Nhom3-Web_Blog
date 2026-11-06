# Review: Ảnh bìa bài viết (BR11, UC08, UC09)

- Ngày: 2026-11-05
- Người review: Claude Code (đọc code trên `dev` sau khi PR đã merge; chạy `npm test` có MongoDB: 84 test đạt, 0 lỗi, 0 bỏ qua, `git status` sạch sau khi chạy; không mở trình duyệt)
- PR / branch: PR #24 `feature/cover-image` (commit `ff561d3`), đã merge vào `dev`. Sourcery không review được vì diff quá 150.000 ký tự (PR xếp chồng), nên đây là lần review đầu tiên
- Đối chiếu: `specs/01` (BR6, BR11), `specs/02` (UC08, UC09), `specs/03` (Post.coverImage, quy tắc controller), `specs/04` (route, `uploadCover`, `/uploads`), `plans/2026-11-05-cover-image.md`, `reports/2026-11-05-cover-image.md`

## Khớp spec?

- [x] Route, quyền đúng specs/04: `uploadCover` nằm sau `requireLogin` (và sau `requireOwnerOrAdmin` ở route sửa), nên khách và người không có quyền không ghi được file; có test cho cả hai trường hợp.
- [x] BR11: chỉ JPG, PNG, WEBP; tối đa 2 MB (đúng 2 MB vẫn nhận); 1 file; tên `thời gian-16 hex ngẫu nhiên.đuôi theo mimetype`, không dùng tên gốc; lưu trong `uploads/`.
- [x] Lỗi người dùng không thành 500: sai loại hoặc quá 2 MB gắn `req.uploadError`, controller hiện lại form 400, giữ các ô đã nhập (ô ảnh đặt cuối form để ô chữ được đọc trước), không còn file trên đĩa.
- [x] Quy tắc controller (specs/03): sửa bài lưu thành công rồi mới xoá ảnh cũ; lưu lỗi thì xoá ảnh mới và giữ ảnh cũ; tạo bài lỗi thì xoá ảnh vừa upload; ảnh mới thắng khi vừa chọn ảnh vừa tick "Xoá ảnh bìa".
- [x] BR6 mở rộng: xoá bài xoá luôn file ảnh (sau khi xoá DB). `removeCover` dùng `basename` nên không xoá ra ngoài `uploads/`, lỗi `ENOENT` bị bỏ qua.
- [x] `coverImage` không lấy từ form (`readForm` chỉ đọc 4 trường, ảnh lấy từ `req.file`); có test cho trường hợp gửi chuỗi giả.
- [x] Phục vụ `/uploads` công khai bằng `express.static` kèm `X-Content-Type-Options: nosniff`; `.gitignore` bỏ qua `uploads/*` trừ `.gitkeep`.
- [x] Thư viện `multer@2.5.0` mới nhưng đã được specs/04 và specs/05 chốt, lý do có trong plan.
- [x] XSS: `coverImage` do server đặt, vẫn đi qua `<%= %>`.

## Vấn đề

| Mức | File:dòng | Mô tả | Đề xuất |
| --- | --- | --- | --- |
| Thấp | `uploadCover.js:47-48` | Lỗi không phải `MulterError` (ví dụ request multipart bị hỏng do tự dựng) đi vào `next(err)` nên trả 500, trong khi specs/04 nói `uploadCover` không ném 500. Chưa tái hiện; trình duyệt thật không gửi request kiểu này. | Chấp nhận; nếu muốn chặt thì gắn `req.uploadError` cho mọi lỗi từ multer. |
| Thấp | `uploadCover.js:30` | Chỉ kiểm mimetype do client gửi, không kiểm nội dung file. File giả mạo vẫn lưu thành `.png` và phục vụ với `nosniff` nên không chạy được như script. | Đúng như spec đã chốt; không sửa. |
| Thấp | `reports/2026-11-05-cover-image.md` | Report còn ghi 11 test DB "chưa chạy" và PR "chưa merge". Nay đã chạy đạt (84/84) và PR đã merge. | Cập nhật report. |

Hai điểm đã được spec và report chấp nhận từ trước, không tính là lỗi: ảnh của bài nháp truy cập được qua URL nếu biết tên file ngẫu nhiên; file mồ côi khi server tắt giữa chừng không được dọn.

## Kết luận

Duyệt. Không có vấn đề Cao hoặc Trung bình. Còn thiếu lần thử trên trình duyệt (chọn ảnh, thay ảnh, tick xoá, file GIF hoặc trên 2 MB, xoá bài rồi xem `uploads/`).
