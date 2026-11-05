# Review: Trang thống kê admin (UC20)

- Ngày: 2026-11-05
- Người review: Claude Code (đọc code trên `dev` sau khi PR đã merge; chạy `npm test` có MongoDB: 84 test đạt, 0 lỗi, 0 bỏ qua; không mở trình duyệt)
- PR / branch: PR #23 `feature/admin-dashboard` (commit `5db0cfd`), đã merge vào `dev`. Sourcery không review được vì diff quá 150.000 ký tự (PR xếp chồng trên nhánh khác), nên đây là lần review đầu tiên
- Đối chiếu: `specs/02` (UC20), `specs/03` (mục "Truy vấn thống kê"), `specs/04` (route `/admin`), `plans/2026-11-05-admin-dashboard.md`, `reports/2026-11-05-admin-dashboard.md`

## Khớp spec?

- [x] Route, quyền đúng bảng route (specs/04): `GET /admin` qua `requireAdmin`; test xác nhận khách và member nhận 403, admin nhận 200.
- [x] Đủ 10 truy vấn của specs/03: đếm user, user bị khoá, bài theo trạng thái, tổng bình luận, tổng like, bài đã đăng theo 6 tháng, top 5 tác giả, top 5 bài nhiều like, nhiều bình luận, nhiều lượt xem. Các top bài chỉ lấy bài `published`.
- [x] Chỉ đọc dữ liệu, không ghi vào DB (hậu điều kiện UC20).
- [x] Chưa có dữ liệu: mỗi bảng hiện "Chưa có dữ liệu"; `fillMonths` không chia cho 0.
- [x] XSS: `username`, `title`, `slug` đều qua `<%= %>`; `m.percent` là số do server tính. `<%-` chỉ dùng cho `include`.
- [x] Không thêm thư viện, không sửa spec, chỉ thêm 1 dòng "Thống kê" ở header.

## Vấn đề

| Mức | File:dòng | Mô tả | Đề xuất |
| --- | --- | --- | --- |
| Thấp | `statsController.js:9` | Múi giờ gom tháng lấy từ máy (`Intl...timeZone`) rồi đưa vào `$year`/`$month`. Nếu tên múi giờ của máy không có trong danh sách múi giờ MongoDB thì truy vấn lỗi và `/admin` trả 500. Chưa tái hiện: trên máy này chạy đạt. | Chấp nhận cho đồ án chạy localhost; nếu gặp lỗi thì bỏ `timezone` (gom theo UTC). |
| Thấp | `statsController.js:70-71` | "Bài đăng theo tháng" tính theo `createdAt`, không phải lúc đăng. Bài nháp tạo từ tháng trước rồi mới đăng sẽ nằm ở tháng tạo. | Đúng như specs/03 viết (`createdAt`); chỉ cần biết khi giải thích với giảng viên. |
| Thấp | `statsController.js:39-49` | Top like / bình luận `$group` toàn bộ collection rồi mới lọc bài `published`. | Không cần sửa ở quy mô đồ án. |
| Thấp | `reports/2026-11-05-admin-dashboard.md` | Report còn ghi 4 test DB "chưa chạy" và PR "chưa merge". Nay đã chạy đạt (84/84) và PR đã merge. | Cập nhật report. |

## Kết luận

Duyệt. Không có vấn đề Cao hoặc Trung bình. Còn thiếu một lần mở `/admin` bằng tài khoản admin trên trình duyệt (thanh ngang theo tháng, link tới bài) trước khi coi UC20 là xong.
