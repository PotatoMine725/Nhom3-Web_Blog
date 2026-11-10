# Report: Kiểm thử thủ công UC01–UC20 (bước 11)

- Ngày: 2026-11-10
- Plan: `plans/2026-11-10-manual-test.md`
- Branch / PR: `docs/manual-test-uc01-uc20` → `dev`
- Bản được kiểm: `dev` tại commit `7446d8f` (chưa gồm PR #37 `fix/ui-nits`)
- Người chạy: Claude, khi người dùng vắng mặt. Đây là kiểm thử tự động bằng kịch bản HTTP cộng thao tác trên trình duyệt, **không phải người dùng bấm tay**.

## Kết luận ngắn

- 52/52 dòng trong plan đạt (kịch bản chạy 67 phép kiểm, tách nhỏ một số dòng, cả 67 đạt).
- Không tìm thấy lỗi nào trái spec, nên không mở branch `fix/...` nào.
- Có 1 quan sát nhỏ không trái spec (tên danh mục chỉ duy nhất khi viết đúng hoa thường), ghi ở cuối để nhóm quyết.
- Bước 11 trong `specs/05` **chưa đánh dấu xong**: chờ nhóm xem report này và tự bấm thử những luồng muốn chắc chắn.

## Đã làm

- Chạy `npm test` trên `dev` trước khi kiểm: **110/110 pass**.
- Bật server riêng: `MONGODB_URI=mongodb://127.0.0.1:27017/nhom3_blog_manual_test PORT=3100 node src/server.js`. Không đụng DB thật `nhom3_blog`, không đụng `nhom3_blog_test` của `npm test`, không chiếm cổng 3000.
- Tạo admin bằng chính script `npm run create-admin -- quan@vd.com`, chạy với cùng biến `MONGODB_URI` ở trên (đã đọc script trước: nó dùng `process.env.MONGODB_URI`).
- Kịch bản HTTP (Node `fetch` có giữ cookie, cách làm giống `tests/helpers.js`) đi qua mọi dòng của plan, kiểm status, redirect, nội dung trang và đối chiếu dữ liệu trong DB kiểm thử. Kịch bản để ngoài repo (không thêm code vào dự án).
- Đi lại bằng trình duyệt (khung trình duyệt trong app Claude, `http://localhost:3100`): đăng nhập qua form, bỏ thích, viết bình luận, đổi chế độ tối, mở `/admin` bằng thành viên (403) và admin (trang thống kê), menu avatar của admin, trang `/search` có lọc tag.
- Dọn dẹp: tắt server. Thư mục `uploads/` trước và sau đều chỉ có `.gitkeep` (app tự xoá mọi ảnh bìa khi sửa/xoá bài nên không còn file nào phải dọn). DB `nhom3_blog_manual_test` để lại, không ảnh hưởng gì; muốn xoá thì tự drop.

Dữ liệu thử: 3 tài khoản `anh`, `binh`, `quan` (admin), 2 danh mục, 13 bài đã đăng + 1 nháp, ảnh PNG 1×1 hợp lệ, file 2 MB + 10 byte để thử giới hạn.

## Lệch so với plan (nếu có) và lý do

- Dòng 1: plan ghi "đăng ký xong thì đăng nhập luôn, về `/`". Code thật chuyển sang `/login` kèm flash "Đăng ký thành công, mời đăng nhập", không tự đăng nhập. Spec 02 (UC04) không quy định việc tự đăng nhập, nên đây là **plan viết sai**, không phải lỗi code. Đã kiểm theo hành vi thật.
- Username trong plan là `an`; schema yêu cầu 3–30 ký tự nên đổi thành `anh` (và kiểm luôn `ab` bị từ chối).
- Nội dung bài tối thiểu 20 ký tự (có trong schema). Kịch bản tự thêm chữ cho đủ 20 ký tự ở các bài thử.

## Kết quả kiểm thử

Cột "Cách kiểm": **HTTP** = kịch bản; **TD** = thao tác trên trình duyệt.

| # | UC/BR | Thao tác | Kết quả quan sát | Cách kiểm | Đạt? |
| --- | --- | --- | --- | --- | --- |
| 1 | UC04, BR3 | Đăng ký `anh` hợp lệ; username 2 ký tự | 302 → `/login`, `role = member`; `ab` bị 400 "3 đến 30 ký tự" | HTTP | Đạt |
| 2 | UC04, BR3 | Trùng username (`ANH`) / trùng email (`AN@vd.com`) | Cả hai 400, vẫn 1 user | HTTP | Đạt |
| 3 | UC04 | Mật khẩu 5 ký tự; 74 byte; nhập lại lệch | Cả ba 400, không tạo user | HTTP | Đạt |
| 4 | BR3 | Xem user trong DB | `passwordHash` dạng `$2a$10$…`, không có field mật khẩu rõ | HTTP | Đạt |
| 5 | UC05 | Đăng nhập đúng | 302 → `/`, header có nút đăng xuất | HTTP, TD | Đạt |
| 6 | UC05 | Sai mật khẩu / email không có | 401, "Sai email hoặc mật khẩu" | HTTP | Đạt |
| 7 | UC05 | Đã đăng nhập mở `/login`, `/register` | 302 → `/` | HTTP | Đạt |
| 8 | UC06 | Đăng xuất | 302 → `/`, sau đó `/posts/new` → `/login`; khách POST `/logout` → `/login` | HTTP, TD | Đạt |
| 9 | UC08, BR1 | Khách GET `/posts/new`, POST `/posts` | Cả hai → `/login`, 0 bài | HTTP | Đạt |
| 10 | UC08, BR4 | Hai bài cùng tiêu đề "Học Node.js từ đầu" | `hoc-node-js-tu-dau`, `hoc-node-js-tu-dau-2` | HTTP | Đạt |
| 11 | UC08 | Thiếu tiêu đề / thiếu nội dung | 400, form giữ giá trị đã nhập | HTTP | Đạt |
| 12 | UC08, BR11 | Ảnh PNG, tên gốc `../../evil name.png` | Lưu tên `<thời gian>-<16 hex>.png`, có trên đĩa, hiện ở trang bài, `/uploads/...` trả 200 | HTTP | Đạt |
| 13 | UC08, BR11 | Ảnh GIF; ảnh 2 MB + 10 byte | 400 kèm lỗi định dạng / "2 MB"; không thêm bài, không thêm file | HTTP | Đạt |
| 14 | UC08 | Gửi `author` = id của `binh` trong form | `author` vẫn là `anh`; tag `" NodeJS, Express ,nodejs"` thành `["nodejs","express"]` | HTTP | Đạt |
| 15 | UC01, BR7 | 13 bài đã đăng + 1 nháp, mở `/`, `/?page=2` | Trang 1: 10 bài, mới nhất trước; trang 2: 3 bài; không trùng, không có nháp; `page=abc`, `page=999` vẫn 200 | HTTP, TD | Đạt |
| 16 | UC02 | Khách mở bài đã đăng | 200, có nội dung, tác giả, tag, lượt xem, số like | HTTP, TD | Đạt |
| 17 | UC02, BR5 | Bài nháp: khách / `binh` / tác giả / admin | 404 / 404 / 200 / 200 | HTTP | Đạt |
| 18 | UC02 | Slug không có; `/posts/%` | 404; 400 | HTTP | Đạt |
| 19 | UC09, BR2 | Tác giả sửa tiêu đề, tag | 302 → `/posts/tieu-de-da-sua` (slug theo tiêu đề mới) | HTTP | Đạt |
| 20 | UC09, BR2 | `binh` GET/POST sửa bài của `anh`, kể cả gửi kèm ảnh | 403, bài không đổi, không có file mới trên đĩa | HTTP | Đạt |
| 21 | UC09, BR11 | Đổi ảnh bìa; tick "Xoá ảnh bìa" | File cũ bị xoá khỏi đĩa; xoá ảnh thì `coverImage` rỗng và file bị xoá | HTTP | Đạt |
| 22 | UC10, BR2 | `binh` xoá bài của `anh` | 403, bài còn | HTTP | Đạt |
| 23 | UC10, BR6 | Tác giả xoá bài có bình luận, like, bookmark, ảnh | 302 → `/me/posts`; bài/bình luận/like/bookmark còn 0/0/0/0; file ảnh bị xoá | HTTP | Đạt |
| 24 | UC11, BR5 | `/me/posts` | Có bài nháp của mình, không có bài của người khác | HTTP | Đạt |
| 25 | UC12, BR1 | Viết bình luận | 302 → `/posts/...#comments`, hiện trong danh sách; trên trình duyệt hiện flash "Đã gửi bình luận", thẻ "Bắt đầu nhanh" ẩn khi đủ bước | HTTP, TD | Đạt |
| 26 | UC12 | Bình luận rỗng; 1001 ký tự; đúng 1000 ký tự | 400; 400; lưu được | HTTP | Đạt |
| 27 | UC12, BR1 | Khách xem bài; khách POST bình luận; bình luận vào nháp người khác | Không có form, có link đăng nhập; → `/login`; 404 | HTTP | Đạt |
| 28 | UC13, BR2 | Chủ bài (`anh`) xoá bình luận của `binh`; `binh` tự xoá | 403; xoá được | HTTP | Đạt |
| 29 | UC03 | `/search?q=express` | Chỉ bài đã đăng khớp, ô tìm kiếm giữ từ khoá | HTTP, TD | Đạt |
| 30 | UC03 | `q=express` + `category=lap-trinh` + `tag=" EXPRESS "` | Đúng 1 bài khớp đủ ba điều kiện | HTTP | Đạt |
| 31 | UC03 | Không điều kiện; danh mục không có; không khớp | → `/`; 0 bài; "Không tìm thấy bài viết phù hợp" | HTTP | Đạt |
| 32 | UC03 | `/categories/lap-trinh`, `/tags/express`, `/tags/nhap` (tag chỉ có ở bài nháp), `/categories/khong-co` | 2 bài; 2 bài; 0 bài; 404 | HTTP | Đạt |
| 33 | UC14 | Admin thêm 2 danh mục, đổi tên | Slug `lap-trinh`, `doi-song`; đổi tên thì slug thành `doi-song-hoc-tap` | HTTP | Đạt |
| 34 | UC14 | Xoá danh mục đang có 2 bài | Bài còn, `category = null`, trang bài hiện "Chưa phân loại" | HTTP | Đạt |
| 35 | UC14 | Thành viên mở `/admin/categories` | 403 | HTTP | Đạt |
| 36 | UC15, BR8 | Admin khoá `binh` | Phiên cũ của `binh` bị coi là khách (`/posts/new` → `/login`); đăng nhập lại 403 kèm "…khoá, liên hệ admin" | HTTP | Đạt |
| 37 | UC15 | Mở khoá; đổi vai trò 2 lần | `isLocked = false`; `member → admin → member` | HTTP | Đạt |
| 38 | UC15 | Admin tự khoá, tự hạ quyền | Bị chặn, vẫn `admin`, không khoá | HTTP | Đạt |
| 39 | UC15, UC16, UC20 | Thành viên mở `/admin/users`, `/admin/posts`, `/admin`, POST khoá; khách mở `/admin` | 403 hết | HTTP, TD | Đạt |
| 40 | UC16 | `/admin/posts`, lọc `draft`/`published`; admin xoá bài của `binh` | Thấy cả nháp, lọc đúng; xoá được, bình luận đi kèm bị xoá, quay về `/admin/posts` | HTTP | Đạt |
| 41 | UC16 | Admin xoá bình luận người khác | Xoá được | HTTP | Đạt |
| 42 | UC07, BR3 | Đổi email; đổi sang email của `binh` (viết hoa) | Lưu `an.moi@vd.com`; 400 | HTTP | Đạt |
| 43 | UC07 | Đổi mật khẩu sai mật khẩu cũ; đúng | 400; đổi được, mật khẩu cũ 401, mật khẩu mới đăng nhập được | HTTP | Đạt |
| 44 | UC17, BR9 | Like rồi like lần nữa | 1 rồi 0; trên trình duyệt nút đổi "Bỏ thích (1)" → "Thích (0)" | HTTP, TD | Đạt |
| 45 | UC17, BR9 | Like bài nháp; slug không có; khách like | 404; 404; → `/login` | HTTP | Đạt |
| 46 | UC18, BR9 | Lưu 2 bài, xem `/me/bookmarks`, bỏ lưu 1 | Mới lưu nhất trước; bỏ lưu thì mất khỏi danh sách | HTTP | Đạt |
| 47 | BR9 | Bài đã lưu chuyển nháp rồi đăng lại | Nháp: "Đã lưu" rỗng, bookmark trong DB vẫn còn; đăng lại: hiện lại | HTTP | Đạt |
| 48 | UC19, BR10 | Người khác mở bài 3 lần; tác giả mở; admin mở bài nháp | 0 → 3; tác giả không tăng; nháp không tăng | HTTP, TD | Đạt |
| 49 | UC19 | `/popular` | 10 bài, bài nhiều lượt xem nhất đứng đầu, không phân trang | HTTP | Đạt |
| 50 | UC20 | Admin mở `/admin` | Số liệu khớp DB (3 user, 13 bài: 12 đăng + 1 nháp, 1 bình luận); bảng 6 tháng có thanh ngang CSS | HTTP, TD | Đạt |
| 51 | Chung | Trang 403, 404, 400 | Khung chung, có "Về trang chủ", "Tìm bài viết", không lộ stack | HTTP, TD | Đạt |
| 52 | Giao diện | Chế độ tối, header, menu admin | Tối giữ khi chuyển trang; menu avatar admin: Bài của tôi, Đã lưu, Hồ sơ, Thống kê, Người dùng, Kiểm duyệt bài, Quản lý danh mục, Đăng xuất (khớp `specs/04`) | TD | Đạt |

Thêm: `npm run create-admin` với email không có thì báo "Không tìm thấy user", không tạo user mới (đạt).

## Quan sát (không trái spec)

- **Tên danh mục phân biệt hoa thường.** Đã có "Lập trình", thêm "lập trình" vẫn được, slug thành `lap-trinh-2`. `specs/03` chỉ ghi `name` là duy nhất, không nói về hoa thường, nên code đúng spec. Trong menu "Danh mục" sẽ thấy hai mục gần giống nhau. Nếu nhóm muốn chặn, cần sửa spec 03 trước (vd so tên đã chuẩn hoá hoặc so slug gốc), rồi mới sửa code. Chưa làm gì.

## Chưa kiểm thử

- Giao diện điện thoại (menu ☰, ô tìm kiếm thu gọn).
- Lỗi 500 thật (chỉ kiểm được 400/403/404 không lộ chi tiết).
- Hai người bấm like cùng lúc (unique index): không giả lập được request song song đúng nghĩa.
- Upload ảnh qua hộp chọn file của trình duyệt (đã kiểm bằng request multipart giống trình duyệt gửi).

## Việc còn lại

- Nhóm xem report, tự bấm lại vài luồng nếu muốn, rồi đánh dấu bước 11 trong `specs/05` là xong.
- Quyết định về quan sát tên danh mục (giữ nguyên hay sửa spec 03).
- PR #37 (`fix/ui-nits`) vẫn chờ duyệt; report này kiểm bản `dev` trước #37.
