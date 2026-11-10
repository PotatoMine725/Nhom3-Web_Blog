# Plan: Kiểm thử thủ công UC01–UC20 (bước 11)

- Ngày: 2026-11-10
- Branch: `docs/manual-test-uc01-uc20`
- Spec liên quan: `specs/01-business-requirements.md`, `specs/02-use-cases.md`, `specs/04-routes-and-views.md`, `specs/05-architecture.md` (bước 11)
- Đáp ứng: kiểm tra lại UC01–UC20, BR1–BR11 trên bản `dev` hiện tại

## Mục tiêu

Chạy thử toàn bộ use case UC01–UC20 trên app thật (server + MongoDB), theo từng vai trò (khách, thành viên, người không phải chủ bài, admin, user bị khoá), ghi lại kết quả từng dòng. Xong plan này thì nhóm có một bảng kiểm thử đầy đủ để duyệt bước 11.

## Ngoài phạm vi

- Không sửa code trong branch này. Lỗi tìm được ghi vào report; lỗi nhỏ, rõ ràng thì sửa ở branch `fix/...` riêng (plan + report + PR riêng). Lỗi đụng spec thì chỉ viết đề xuất, không tự sửa spec.
- Không kiểm thử trên điện thoại, không đo hiệu năng.
- Không gồm thay đổi của PR #37 (`fix/ui-nits`, chưa merge). Bản được kiểm: `dev` tại commit `7446d8f`.

## Môi trường

- Server chạy riêng: `MONGODB_URI=mongodb://127.0.0.1:27017/nhom3_blog_manual_test PORT=3100 node src/server.js`. `dotenv` không ghi đè biến đã có, nên server dùng DB riêng này, **không đụng DB thật `nhom3_blog`** và không đụng `nhom3_blog_test` (DB mà `npm test` xoá dữ liệu).
- Tạo admin: `MONGODB_URI=...manual_test npm run create-admin -- <email>` (script đọc `process.env.MONGODB_URI`, đã kiểm).
- `uploads/`: chụp danh sách file trước khi test, sau khi test chỉ xoá các file mới sinh ra.
- Không chạy `npm test` khi server kiểm thử đang chạy. Chạy `npm test` một lần trước để có mốc.

## Các bước

1. Chạy `npm test` lấy mốc (số test pass).
2. Bật server kiểm thử như trên, tạo dữ liệu qua chính giao diện/route: 3 tài khoản (`an` thành viên, `binh` thành viên, `quan` sẽ được nâng admin), danh mục, bài đã đăng, bài nháp, bài có ảnh bìa, đủ 11+ bài để thử phân trang.
3. Chạy kịch bản HTTP (fetch có giữ cookie, giống `tests/helpers.js`) đi qua từng dòng ở bảng dưới, kiểm status, redirect, nội dung HTML và dữ liệu trong DB kiểm thử.
4. Đi lại các luồng chính bằng trình duyệt (khung trình duyệt của Claude): đăng ký, đăng nhập, viết bài, bình luận, like, lưu, trang admin, chế độ tối, trang lỗi.
5. Dọn: tắt server, xoá file mới trong `uploads/`. DB `nhom3_blog_manual_test` để lại (DB riêng, không ảnh hưởng gì); muốn xoá thì người dùng tự drop.
6. Viết report `docs/reports/2026-11-10-manual-test.md`.

## Kiểm thử

| # | UC/BR | Thao tác | Kết quả mong đợi |
| --- | --- | --- | --- |
| 1 | UC04, BR3 | Đăng ký `an` hợp lệ | Tạo user `member`, đăng nhập luôn, về `/` |
| 2 | UC04, BR3 | Đăng ký trùng username / trùng email | Hiện lại form kèm lỗi, không tạo user |
| 3 | UC04 | Mật khẩu 5 ký tự; mật khẩu > 72 byte | Báo lỗi độ dài |
| 4 | BR3 | Xem user trong DB | Chỉ có `passwordHash` dạng bcrypt, không có mật khẩu rõ |
| 5 | UC05 | Đăng nhập đúng | Về `/`, header có menu avatar |
| 6 | UC05 | Sai mật khẩu / email không tồn tại | "Sai email hoặc mật khẩu" |
| 7 | UC05 | Đã đăng nhập mà mở `/login`, `/register` | Redirect `/` |
| 8 | UC06 | Đăng xuất (POST `/logout`) | Session huỷ, về khách |
| 9 | UC08, BR1 | Khách mở `/posts/new`, POST `/posts` | Redirect `/login`, không tạo bài |
| 10 | UC08, BR4 | Tạo bài đã đăng, rồi bài cùng tiêu đề | Slug sinh từ tiêu đề; bài 2 có hậu tố `-2` |
| 11 | UC08 | Thiếu tiêu đề / nội dung | Hiện lại form kèm lỗi, giữ giá trị đã nhập |
| 12 | UC08, BR11 | Ảnh bìa PNG hợp lệ | Lưu file trong `uploads/` tên do server đặt, hiện ở trang bài |
| 13 | UC08, BR11 | Ảnh sai định dạng (.txt/.gif), ảnh > 2 MB | Hiện lại form kèm lỗi, không lưu bài, không còn file trên đĩa |
| 14 | UC08 | Gửi `author` giả trong form | `author` vẫn là user đăng nhập |
| 15 | UC01, BR7 | Có ≥ 11 bài đã đăng, mở `/` và `/?page=2` | Trang 1: 10 bài mới nhất trước; trang 2 phần còn lại; không có bài nháp |
| 16 | UC02 | Mở bài đã đăng | Hiện nội dung, tác giả, tag, lượt xem, số like, bình luận |
| 17 | UC02, BR5 | Bài nháp: khách / người khác / tác giả / admin | 404 / 404 / xem được / xem được |
| 18 | UC02 | Slug không tồn tại; slug hỏng `/posts/%` | 404; 400 |
| 19 | UC09, BR2 | Tác giả sửa bài (đổi tiêu đề, tag, trạng thái) | Lưu được, quay về trang bài |
| 20 | UC09, BR2 | Người khác GET/POST `/posts/:slug/edit` | 403, bài không đổi |
| 21 | UC09, BR11 | Đổi ảnh bìa; tick "Xoá ảnh bìa" | File cũ bị xoá khỏi đĩa; xoá ảnh thì bài không còn ảnh |
| 22 | UC10, BR2 | Người khác xoá bài | 403 |
| 23 | UC10, BR6 | Tác giả xoá bài có bình luận, like, bookmark, ảnh bìa | Bài, bình luận, like, bookmark trong DB và file ảnh đều bị xoá |
| 24 | UC11, BR5 | `/me/posts` | Có cả bài nháp của mình, không có bài người khác |
| 25 | UC12, BR1 | Bình luận hợp lệ | Hiện cuối danh sách |
| 26 | UC12 | Bình luận rỗng; > 1000 ký tự | Báo lỗi, không lưu |
| 27 | UC12, BR1 | Khách xem bài; khách POST bình luận | Không có form, có link đăng nhập; POST bị chuyển `/login` |
| 28 | UC13, BR2 | Chủ bình luận xoá; người khác xoá | Xoá được; 403 |
| 29 | UC03 | `/search?q=` từ khoá trong tiêu đề | Chỉ bài đã đăng khớp; giữ từ khoá ở ô tìm kiếm |
| 30 | UC03 | Kết hợp `q` + `category` + `tag` (tag viết hoa, có khoảng trắng) | Khớp đủ mọi điều kiện, tag được trim + lowercase |
| 31 | UC03 | Không điều kiện nào; danh mục không tồn tại; không có kết quả | Về `/`; không có kết quả; "Không tìm thấy bài viết phù hợp" |
| 32 | UC03 | `/categories/:slug`, `/tags/:tag` | Bài đúng danh mục / tag, chỉ bài đã đăng |
| 33 | UC14 | Admin thêm, đổi tên danh mục; thêm trùng tên | Thêm/sửa được; trùng tên báo lỗi |
| 34 | UC14 | Admin xoá danh mục đang có bài | Bài về "Chưa phân loại", không mất bài |
| 35 | UC14 | Thành viên mở `/admin/categories` | 403 |
| 36 | UC15, BR8 | Admin khoá `binh` | `binh` đang đăng nhập bị coi là khách ở request sau; đăng nhập lại bị từ chối |
| 37 | UC15 | Admin mở khoá; đổi vai trò member ↔ admin | Đổi đúng `isLocked`, `role` |
| 38 | UC15 | Admin tự khoá / tự hạ quyền chính mình | Bị chặn |
| 39 | UC15, UC16, UC20 | Thành viên mở `/admin/users`, `/admin/posts`, `/admin`; khách mở `/admin` | 403 |
| 40 | UC16 | Admin xem `/admin/posts` (có nháp), lọc theo trạng thái, xoá bài người khác | Thấy cả nháp; lọc đúng; xoá được kèm BR6 |
| 41 | UC16 | Admin xoá bình luận người khác | Xoá được |
| 42 | UC07, BR3 | Đổi email (hợp lệ / trùng email người khác) | Lưu được / báo lỗi |
| 43 | UC07 | Đổi mật khẩu: sai mật khẩu cũ; đúng | Báo lỗi; đổi được, đăng nhập bằng mật khẩu mới |
| 44 | UC17, BR9 | Like rồi like lần nữa | Số like 1 rồi về 0; nút đổi chữ |
| 45 | UC17, BR9 | Like bài nháp / slug không tồn tại; khách like | 404; 404; chuyển `/login` |
| 46 | UC18, BR9 | Lưu bài, xem `/me/bookmarks`, bỏ lưu | Có trong danh sách, mới lưu nhất trước; bỏ lưu thì mất |
| 47 | BR9 | Bài đã lưu chuyển về nháp rồi đăng lại | Ẩn khỏi "Đã lưu" khi nháp; hiện lại khi đăng lại; bookmark không mất |
| 48 | UC19, BR10 | Người khác mở bài 3 lần; tác giả mở bài | Lượt xem +3; tác giả mở không tăng |
| 49 | UC19 | `/popular` | Tối đa 10 bài đã đăng, xếp theo lượt xem giảm dần, không có phân trang |
| 50 | UC20 | Admin mở `/admin` | Số liệu tổng khớp DB kiểm thử, bảng theo tháng có thanh ngang CSS |
| 51 | Chung | Trang lỗi 403/404/400/500 | Dùng khung chung, có nút "Về trang chủ", 500 không lộ stack |
| 52 | Giao diện | Đổi chế độ sáng/tối, header, menu trái, sidebar phải | Đúng mô tả ở `specs/04` |

## Rủi ro / câu hỏi mở

- Kiểm thử do Claude chạy (kịch bản HTTP + khung trình duyệt), không phải người dùng bấm tay. Bước 11 trong `specs/05` chỉ đánh dấu xong khi nhóm xem report và đồng ý.
- Plan này viết khi người dùng vắng mặt nên chưa qua duyệt trước khi chạy. Vì plan chỉ đọc/chạy thử, không đổi code, dữ liệu thật hay spec, nên chạy luôn và ghi quyết định này vào `docs/reports/remote-session-2026-11-10.md`.
