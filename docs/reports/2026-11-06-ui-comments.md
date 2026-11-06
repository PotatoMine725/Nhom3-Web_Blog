# Report: UI/UX PR 3 — bình luận kiểu Facebook (`feature/ui-comments`)

- Ngày: 2026-11-06
- Plan: `plans/2026-10-31-ui-ux.md` (mục "PR 3 — feature/ui-comments")
- Branch / PR: `feature/ui-comments` → PR vào `dev` (title `feat: bình luận kiểu Facebook (UI/UX PR 3)`)
- Trạng thái: code xong, `npm test` 92/92 xanh, đã kiểm trình duyệt bằng Edge headless (30 kiểm tra đạt). Các mục chưa kiểm ở "Chưa kiểm thử"; một lỗi có sẵn từ PR 2 (sidebar) ở "Phát hiện ngoài phạm vi".

## Đã làm

Mỗi bước một commit, đúng thứ tự plan (thêm 1 commit `fix` ở cuối, xem "Lệch so với plan"):

| # | Commit | Nội dung |
| --- | --- | --- |
| 1 | `f1b22b3` `test: kiểm thử giao diện bình luận (UI/UX PR 3)` | `tests/comments-ui.test.js` (6 test). Chạy trước khi viết markup: 3 test đỏ (`commentLoginBox`, form xoá + `commentForm`, `commentErrors`/`is-open`), 3 test xanh bảo vệ hành vi cũ (bài nháp, > 1000 ký tự, escape + "Không rõ") |
| 2 | `60d72f6` `feat: markup bình luận kiểu Facebook (UI/UX PR 3)` | `header.ejs` thêm script 1 dòng đặt lớp `js` trên `<html>`; `partials/comment-item.ejs`, `partials/comment-form.ejs` (mới); `posts/show.ejs` thay `<section id="comments">` + modal xoá bình luận, thêm `id="commentJump"` cho link `Bình luận (N)` |
| 3 | `af11ebb` `style: CSS bình luận kiểu Facebook (UI/UX PR 3)` | Thêm cuối `style.css`: biến `--comment-bubble-bg`, bong bóng, ô nhập thu gọn/mở rộng, ô giả và hộp đăng nhập của khách |
| 4 | `b29f6a1` `feat: JS ô bình luận và modal xoá bình luận (UI/UX PR 3)` | Thêm cuối `src/public/js/app.js`: mở rộng khi focus, tự giãn chiều cao, đếm ký tự (tính `\n` = 2), Enter gửi / Shift+Enter xuống dòng, chặn gửi đúp, cuộn tới lỗi, nút `Bình luận (N)`, ô giả của khách, modal xác nhận xoá |
| 5 | `cb7a645` `fix: trả focus về nút Xoá khi đóng modal xoá bình luận (UI/UX PR 3)` | Sửa phát hiện khi kiểm tay (dòng 3.14) |
| 6 | commit chứa file này | Report |

- Tên trong "Bảng tên dùng chung" giữ nguyên (EJS, `app.js`, CSS khớp nhau).
- Không đổi controller, route, model, `docs/specs/`; không thêm thư viện; `src/public/js/app.js` vẫn là file JS duy nhất; phần "Sao chép liên kết" và phím `/` trong `app.js` giữ nguyên; phần phía trên `<section id="comments">` của `show.ejs` không đụng, chỉ thêm `id="commentJump"`.

## Lệch so với plan (nếu có) và lý do

- **Thêm 1 commit `fix` (bước 4 bổ sung).** Code mẫu bước 4 mở modal bằng `deleteModal.show()` (JS), nên Bootstrap không tự trả focus về nút "Xoá" khi đóng bằng Esc/Huỷ (Bootstrap chỉ trả focus cho nút có `data-bs-toggle`). Kiểm tay dòng 3.14 ("modal trả focus về nút Xoá") phát hiện `document.activeElement` là `body`. Sửa: trong `hidden.bs.modal` lấy nút của form đang chờ xoá và `focus()` lại (3 dòng, `app.js`). Không đổi tên nào trong bảng dùng chung.
- Ngoài ra không lệch.

## Kết quả kiểm thử

### Test tự động

`npm test` (MongoDB đã bật, DB `nhom3_blog_test`): **92 test, 92 đạt, 0 lỗi, 0 skip.** `tests/comments-ui.test.js`: 6/6 đạt; `tests/views.test.js` biên dịch được cả `comment-item.ejs` và `comment-form.ejs`.

### Kiểm tay trên trình duyệt

Chạy sau khi người dùng bật `mongod`: app ở cổng 3101 trên DB `nhom3_blog_test` (không đụng `nhom3_blog`, dữ liệu xoá bằng `deleteMany` sau khi chạy), Microsoft Edge headless qua `playwright-core` cài ở thư mục tạm ngoài repo. Script không commit. Seed: 4 tài khoản (chủ bài, người bình luận, thành viên khác, admin), bài đã đăng có bình luận, bài chưa có bình luận, bài nháp, một bình luận 300 ký tự liền không dấu cách kèm `<script>`. Cũng chụp ảnh màn hình một lần để xem bằng mắt (bong bóng, avatar, hàng meta, ô nhập mở rộng đều đúng hình).

| # | Thao tác | Kết quả | Đạt? |
| --- | --- | --- | --- |
| 6a | Bấm `Bình luận (N)` khi đang ở đầu trang | Ô nhập vào khung nhìn, nằm dưới navbar (top 631 > đáy header 58), có focus, đã mở rộng | Đạt (không đo được độ "mượt" của cuộn) |
| 6b | Ô lúc đầu và sau khi bấm | Lúc đầu cao 38px, ẩn đếm/nút; bấm vào: mở rộng, `0/1000`, nút bị vô hiệu | Đạt |
| 6c | Shift+Enter nhiều dòng | Ô giãn (66 → 138px), dừng ở 240px rồi cuộn trong ô; đếm cập nhật; Shift+Enter không gửi | Đạt |
| 6d | Gõ bằng bộ gõ tiếng Việt rồi Enter giữa lúc soạn | Không kiểm được | **Chưa kiểm** |
| 6e | Enter khi có chữ | Gửi 1 lần, URL kết thúc `#comments`, thấy bình luận mới, có flash "Đã gửi bình luận" | Đạt |
| 6f | Enter ×3 và bấm nút liên tiếp | Chỉ tạo thêm đúng 1 bình luận | Đạt |
| 7a | Gửi toàn dấu cách (tắt JS, vì bật JS thì nút bị vô hiệu) | 400, khung lỗi "không được để trống", form mở sẵn, sidebar còn | Đạt |
| 7b | Gõ 1001 ký tự | Đếm đỏ, nút vẫn bấm được, server báo "tối đa 1000 ký tự", nội dung giữ nguyên (1001), trang tự cuộn tới ô và focus, sidebar còn, không lưu thêm | Đạt |
| 7c | 995 ký tự + 3 lần xuống dòng | Hiện `1001/1000`, đỏ | Đạt |
| 8 | Tắt JS | Form hiện đủ (ô cao > 45px, có đếm và nút, nút bấm được), không thấy ô giả; gửi bằng POST thường được | Đạt |
| 9a | Khách mở bài (JS bật) | Thấy ô giả, chưa thấy hộp đăng nhập | Đạt |
| 9b | Khách bấm ô giả / bấm `Bình luận (N)` | Hộp "Hãy đăng nhập để bình luận" hiện, link `/login` | Đạt |
| 9c | Khách, tắt JS | Hộp đăng nhập luôn hiện, không có ô giả | Đạt |
| 10a | Chủ bình luận bấm Xoá | Modal "Xoá bình luận?"; Huỷ → còn; Xoá bình luận → mất, flash "Đã xoá bình luận", về `#comments`. Admin cũng thấy nút Xoá của bình luận người khác | Đạt |
| 10b | Người khác / khách không thấy nút Xoá | Đã có test tự động (`comments-ui.test.js`) | Đạt |
| 10c | Tắt JS rồi bấm Xoá | Form gửi thẳng, bình luận bị xoá, không hỏi lại | Đạt |
| 3.11 | Bài chưa có bình luận / bài nháp | "Chưa có bình luận nào. Hãy là người đầu tiên!" / "Bài nháp chưa nhận bình luận."; bài nháp bấm `Bình luận (N)` thì chỉ neo `#comments`, không lỗi | Đạt |
| 3.12 | Bình luận 300 ký tự liền + `<script>` | Bong bóng không tràn (xuống dòng), `<script>alert(1)</script>` hiện thành chữ | Đạt |
| 3.13 | 375px và 320px | **Bong bóng và ô nhập đạt**: không bong bóng nào tràn, vùng nội dung chính không rộng hơn khung nhìn, ô nhập rộng 303px / 248px. **Cả trang vẫn cuộn ngang 50px** vì thẻ "Bình luận mới" ở sidebar (PR 2) tràn khi bình luận có từ rất dài (xem "Phát hiện ngoài phạm vi") | **Đạt một phần** |
| 3.14 | Bàn phím | Ô nhập có vòng focus (box-shadow); ô giả của khách có vòng focus bàn phím (outline mặc định); Enter trên nút Xoá mở modal, Esc đóng modal và focus về nút Xoá (sau commit `fix`) | Đạt một phần (xem "Chưa kiểm thử") |

## Phát hiện ngoài phạm vi (không sửa)

- **Sidebar "Bình luận mới" (PR 2) tràn ngang khi bình luận có từ dài không dấu cách.** Khi ẩn `.layout__right` bằng DevTools thì trang hết cuộn ngang. `.sidebar-comment` chưa có `overflow-wrap`. Plan PR 3 (rủi ro #7) ghi rõ không đụng sidebar nên mình không sửa; đề xuất sửa 1 dòng CSS (`.sidebar-comment { overflow-wrap: anywhere; }`) trong PR riêng hoặc PR 4. Đây là lý do dòng 3.13 chỉ ghi "đạt một phần".

## Chưa kiểm thử

- **6d** — bộ gõ tiếng Việt thật (Unikey/Telex): code có chặn `e.isComposing` và `keyCode 229` nhưng chưa thử với bộ gõ thật.
- Màn hình cảm ứng thật: nhánh `(pointer: coarse)` (Enter xuống dòng, chỉ nút mới gửi) chưa chạy.
- 3.14 đầy đủ: chuỗi phím Tab liên tiếp qua cả trang chưa chạy; focus được đặt bằng `focus()` hoặc Tab/Shift+Tab ngắn. Chưa kiểm vòng focus của nút Xoá bằng mắt.
- Chỉ thử Microsoft Edge (Chromium); chưa thử Chrome, Firefox, Safari.
- Độ mượt của cuộn (`behavior: 'smooth'`) và `prefers-reduced-motion`: chỉ kiểm vị trí cuối, chưa kiểm hiệu ứng.
- Quay lại bằng nút Back (bfcache) sau khi gửi bình luận/xoá: code có xử lý `pageshow` nhưng chưa thử.
- Chế độ tối: ngoài phạm vi PR 3 (PR 4).

## Việc còn lại

- Review PR này ở session khác.
- Sửa tràn ngang ở sidebar (xem trên) và đổi mã màu cứng `#0074cc` trong `.comment-form__input:focus` sang biến CSS cùng đợt với `#f48024` (PR 4, plan rủi ro #6).
- PR 4 (`feature/ui-extras`) và các việc phản hồi sau test trình duyệt (navbar/sidebar nổi bật, footer dính đáy, icon tìm kiếm); thread cần đề xuất sửa spec trước.
