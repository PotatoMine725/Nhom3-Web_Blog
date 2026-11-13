# 02 · Actor và use case

> Trạng thái: **ĐÃ CHỐT** (2026-10-29). Đây là contract. Muốn đổi phải được nhóm duyệt.

## Actor

Có 3 actor theo quan hệ kế thừa: Thành viên làm được mọi thứ của Khách, Admin làm được mọi thứ của Thành viên.

| Actor | Mô tả |
| --- | --- |
| Khách (Guest) | Người chưa đăng nhập. Chỉ xem và tìm bài, đăng ký, đăng nhập. |
| Thành viên (Member) | Người đã đăng nhập. Viết bài, bình luận, like, lưu bài, tạo / tham gia thread, quản lý nội dung của chính mình. |
| Admin | Quản trị viên. Quản lý người dùng, danh mục, xoá bất kỳ bài/bình luận/thread nào, xem thống kê. |

## Danh sách use case

| Mã | Use case | Actor chính | Quy tắc liên quan |
| --- | --- | --- | --- |
| UC01 | Xem danh sách bài viết (phân trang) | Khách | BR5, BR7 |
| UC02 | Xem chi tiết bài viết + bình luận (tăng lượt xem) | Khách | BR5, BR10 |
| UC03 | Tìm kiếm full-text, lọc kết hợp danh mục + tag | Khách | BR5 |
| UC04 | Đăng ký | Khách | BR3 |
| UC05 | Đăng nhập | Khách | BR8 |
| UC06 | Đăng xuất | Thành viên | |
| UC07 | Cập nhật hồ sơ / đổi mật khẩu | Thành viên | BR3 |
| UC08 | Tạo bài viết (có thể kèm ảnh bìa, chọn thread) | Thành viên | BR1, BR4, BR11, BR12 |
| UC09 | Sửa bài viết (đổi / xoá ảnh bìa, đổi thread) | Thành viên | BR2, BR11, BR12 |
| UC10 | Xoá bài viết | Thành viên | BR2, BR6 |
| UC11 | Xem danh sách bài của tôi (kể cả nháp) | Thành viên | BR5 |
| UC12 | Viết bình luận | Thành viên | BR1 |
| UC13 | Xoá bình luận | Thành viên | BR2 |
| UC14 | Quản lý danh mục (thêm/sửa/xoá) | Admin | |
| UC15 | Quản lý người dùng (xem, khoá/mở, đổi vai trò) | Admin | BR8 |
| UC16 | Kiểm duyệt nội dung (xoá bài/bình luận bất kỳ) | Admin | BR2, BR6 |
| UC17 | Like / bỏ like bài viết | Thành viên | BR1, BR9 |
| UC18 | Lưu / bỏ lưu bài viết, xem danh sách đã lưu | Thành viên | BR1, BR5, BR9 |
| UC19 | Xem bài nổi bật (nhiều lượt xem nhất) | Khách | BR5 |
| UC20 | Xem trang thống kê | Admin | |
| UC21 | Xem danh sách thread | Khách | |
| UC22 | Xem chi tiết thread + bài trong thread | Khách | BR5, BR14 |
| UC23 | Tạo thread | Thành viên | BR1, BR12 |
| UC24 | Tham gia / rời thread | Thành viên | BR12 |
| UC25 | Xoá thread | Thành viên (người tạo), Admin | BR13 |

UC08, UC09, UC10, UC12, UC13, UC17, UC18, UC23, UC24, UC25 đều **include** "Kiểm tra đăng nhập". UC09, UC10, UC13, UC25 còn include "Kiểm tra quyền sở hữu" (với thread: người tạo).

## Sơ đồ use case

```mermaid
flowchart LR
  Guest([Khách])
  Member([Thành viên])
  Admin([Admin])
  Member -- kế thừa --> Guest
  Admin -- kế thừa --> Member

  subgraph SYS[Hệ thống Web Blog]
    subgraph PUB[Chức năng công khai]
      UC01((UC01 Xem danh sách bài))
      UC02((UC02 Xem chi tiết bài))
      UC03((UC03 Tìm kiếm, lọc bài))
      UC04((UC04 Đăng ký))
      UC05((UC05 Đăng nhập))
      UC19((UC19 Xem bài nổi bật))
      UC21((UC21 Xem danh sách thread))
      UC22((UC22 Xem chi tiết thread))
    end
    subgraph MEM[Cần đăng nhập]
      UC06((UC06 Đăng xuất))
      UC07((UC07 Cập nhật hồ sơ))
      UC08((UC08 Tạo bài viết))
      UC09((UC09 Sửa bài viết))
      UC10((UC10 Xoá bài viết))
      UC11((UC11 Xem bài của tôi))
      UC12((UC12 Viết bình luận))
      UC13((UC13 Xoá bình luận))
      UC17((UC17 Like bài))
      UC18((UC18 Lưu bài))
      UC23((UC23 Tạo thread))
      UC24((UC24 Tham gia / rời thread))
      UC25((UC25 Xoá thread))
    end
    subgraph ADM[Chỉ admin]
      UC14((UC14 Quản lý danh mục))
      UC15((UC15 Quản lý người dùng))
      UC16((UC16 Kiểm duyệt nội dung))
      UC20((UC20 Xem thống kê))
    end
  end

  Guest --- PUB
  Member --- MEM
  Admin --- ADM
```

## Đặc tả use case chính

### UC05 · Đăng nhập

| Mục | Nội dung |
| --- | --- |
| Actor | Khách |
| Tiền điều kiện | Đã có tài khoản, chưa đăng nhập |
| Luồng chính | 1. Mở trang `/login`. 2. Nhập email + mật khẩu. 3. Hệ thống tìm user theo email. 4. So sánh mật khẩu với hash (bcrypt). 5. Tạo session, chuyển về trang chủ. |
| Luồng phụ | 3a. Không tìm thấy email hoặc 4a. sai mật khẩu: báo "Sai email hoặc mật khẩu". 3b. Tài khoản bị khoá: báo lỗi (BR8). |
| Hậu điều kiện | Session chứa `userId` và `role` |

### UC08 · Tạo bài viết

| Mục | Nội dung |
| --- | --- |
| Actor | Thành viên |
| Tiền điều kiện | Đã đăng nhập (BR1) |
| Luồng chính | 1. Mở `/posts/new` (hoặc `/posts/new?thread=<slug>` từ trang thread, chọn sẵn thread). 2. Nhập tiêu đề, nội dung, chọn danh mục, tag, trạng thái, ảnh bìa, thread (hai mục cuối không bắt buộc; ô thread chỉ liệt kê thread đã tham gia). 3. Bấm Lưu. 4. Hệ thống kiểm tra dữ liệu. 5. Sinh slug từ tiêu đề (BR4). 6. Lưu bài với `author` = user hiện tại. 7. Chuyển tới trang chi tiết bài. |
| Luồng phụ | 4a. Thiếu tiêu đề/nội dung: hiện lại form kèm lỗi. 4b. Ảnh bìa sai định dạng hoặc quá 2 MB: hiện lại form kèm lỗi, không lưu file (BR11). 4c. Thread không tồn tại hoặc chưa tham gia: hiện lại form, báo "Bạn chưa tham gia thread này" (BR12). 5a. Slug trùng: thêm hậu tố `-2`, `-3`. Chưa đăng nhập: chuyển về `/login`. |
| Hậu điều kiện | Bài mới nằm trong DB; nếu `published` thì hiện ở trang chủ |

### UC12 · Viết bình luận

| Mục | Nội dung |
| --- | --- |
| Actor | Thành viên |
| Tiền điều kiện | Đã đăng nhập, bài viết đã đăng |
| Luồng chính | 1. Ở trang chi tiết bài, nhập nội dung. 2. Bấm Gửi. 3. Lưu comment với `post` và `author`. 4. Tải lại trang, comment hiện cuối danh sách. |
| Luồng phụ | 2a. Nội dung rỗng hoặc quá 1000 ký tự: báo lỗi. Chưa đăng nhập: ẩn form, hiện link đăng nhập. |
| Hậu điều kiện | Comment mới gắn với bài |

### UC03 · Tìm kiếm, lọc bài

| Mục | Nội dung |
| --- | --- |
| Actor | Khách |
| Tiền điều kiện | Không |
| Luồng chính | 1. Nhập từ khoá ở ô tìm kiếm, chọn danh mục, nhập tag (đều không bắt buộc). 2. Gửi `GET /search?q=&category=&tag=`. 3. Hệ thống lọc bài `published`, khớp đủ mọi điều kiện đã nhập: từ khoá dùng text index trên `title` (`$text`), danh mục theo slug, tag được trim + lowercase rồi so khớp đúng với một phần tử của `tags`. 4. Có từ khoá thì sắp theo độ khớp, không có thì mới nhất trước. 5. Hiện kết quả 10 bài/trang, giữ nguyên điều kiện khi chuyển trang. |
| Luồng phụ | 2a. Không nhập điều kiện nào: chuyển về `/`. 3a. Không có kết quả: báo "Không tìm thấy bài viết phù hợp". 3b. Danh mục không tồn tại: coi như không có kết quả. |
| Hậu điều kiện | Không đổi dữ liệu |

### UC17 · Like / bỏ like bài viết

| Mục | Nội dung |
| --- | --- |
| Actor | Thành viên |
| Tiền điều kiện | Đã đăng nhập (BR1), bài đã đăng |
| Luồng chính | 1. Ở trang chi tiết bài, bấm nút Like (form POST). 2. Hệ thống tìm Like có `user` + `post`. 3. Chưa có thì tạo, đã có thì xoá (BR9). 4. Quay lại trang bài, nút đổi trạng thái, số like cập nhật. |
| Luồng phụ | Bài nháp hoặc không tồn tại: 404. Chưa đăng nhập: chuyển về `/login`. Bấm 2 lần cùng lúc: unique index chặn bản ghi trùng. |
| Hậu điều kiện | Mỗi cặp (user, bài) có tối đa 1 Like |

UC18 (lưu bài) giống hệt UC17 với collection Bookmark, thêm trang `/me/bookmarks` liệt kê bài đã lưu còn ở trạng thái `published`, mới lưu nhất trước.

### UC20 · Xem trang thống kê

| Mục | Nội dung |
| --- | --- |
| Actor | Admin |
| Tiền điều kiện | Đã đăng nhập, `role = admin` |
| Luồng chính | 1. Mở `/admin`. 2. Hệ thống chạy các truy vấn đếm và aggregation pipeline (danh sách ở specs/03, mục "Truy vấn thống kê"). 3. Hiện các con số tổng và các bảng thống kê. |
| Luồng phụ | Không phải admin: 403. Chưa có dữ liệu: bảng hiện "Chưa có dữ liệu". |
| Hậu điều kiện | Không đổi dữ liệu |

### UC23 · Tạo thread

| Mục | Nội dung |
| --- | --- |
| Actor | Thành viên |
| Tiền điều kiện | Đã đăng nhập |
| Luồng chính | 1. Mở `/threads/new`. 2. Nhập tên, mô tả (không bắt buộc), tag chủ đề (không bắt buộc). 3. Bấm Tạo. 4. Hệ thống kiểm tra dữ liệu, sinh slug từ tên. 5. Lưu thread với `author` = user hiện tại. 6. Tạo bản ghi thành viên cho người tạo (BR12). 7. Chuyển tới trang thread. |
| Luồng phụ | 4a. Tên rỗng, sai độ dài hoặc trùng tên (không phân biệt hoa thường): hiện lại form kèm lỗi. 6a. Lỗi khi tạo bản ghi thành viên: xoá thread vừa tạo, chuyển cho trang lỗi. Chưa đăng nhập: chuyển về `/login`. |
| Hậu điều kiện | Thread mới có đúng 1 thành viên là người tạo |

### UC24 · Tham gia / rời thread

| Mục | Nội dung |
| --- | --- |
| Actor | Thành viên |
| Tiền điều kiện | Đã đăng nhập, thread tồn tại |
| Luồng chính | 1. Ở trang thread, bấm "Tham gia" (hoặc "Rời thread"). 2. Tham gia: tạo bản ghi (user, thread). Rời: xoá bản ghi. 3. Quay lại trang thread, nút đổi trạng thái, số thành viên cập nhật. |
| Luồng phụ | Thread không tồn tại: 404. Đã tham gia mà bấm tham gia (hoặc bấm 2 lần cùng lúc): unique index chặn trùng, coi như đã tham gia. Người tạo bấm rời: báo "Người tạo không thể rời thread", không xoá. Chưa tham gia mà bấm rời: không làm gì. Chưa đăng nhập: chuyển về `/login`. |
| Hậu điều kiện | Mỗi cặp (user, thread) có tối đa 1 bản ghi; bài cũ của người rời vẫn ở trong thread (BR12) |

### UC25 · Xoá thread

| Mục | Nội dung |
| --- | --- |
| Actor | Người tạo thread, Admin |
| Tiền điều kiện | Đã đăng nhập, là người tạo hoặc admin |
| Luồng chính | 1. Ở trang thread, bấm "Xoá thread" (form POST, có hộp xác nhận). 2. Xoá mọi bản ghi thành viên của thread. 3. Đặt `thread = null` cho các bài thuộc thread. 4. Xoá thread. 5. Về `/threads`, báo "Đã xoá thread". |
| Luồng phụ | Không phải người tạo / admin: 403. Thread không tồn tại: 404. |
| Hậu điều kiện | Thread và danh sách thành viên mất; bài viết còn nguyên, không thuộc thread nào (BR13) |

## Sơ đồ hoạt động · UC08 Tạo bài viết

```mermaid
flowchart LR
  S((Bắt đầu)) --> A[Mở /posts/new]
  A --> D1{Đã đăng nhập?}
  D1 -- không --> L[Chuyển về /login] --> E1((Kết thúc))
  D1 -- có --> F[Nhập form, bấm Lưu]
  F --> D2{Hợp lệ?}
  D2 -- "không: hiện lỗi, nhập lại" --> F
  D2 -- có --> G[Sinh slug duy nhất]
  G --> H[Lưu Post vào DB]
  H --> I[Mở trang chi tiết bài] --> E2((Kết thúc))
```

## Sơ đồ tuần tự · UC05 Đăng nhập

```mermaid
sequenceDiagram
  participant B as Trình duyệt
  participant C as Route + Controller
  participant M as Model User
  participant DB as MongoDB
  B->>C: 1. POST /login (email, mật khẩu)
  C->>M: 2. User.findOne(email)
  M->>DB: 3. query users
  DB-->>M: 4. document
  M-->>C: 5. user hoặc null
  C->>C: 6. bcrypt.compare
  alt đúng mật khẩu, chưa bị khoá
    C->>C: 7. tạo session (userId, role)
    C->>B: 8. 302 về trang chủ
  else sai hoặc bị khoá
    C->>B: 9. render /login kèm lỗi
  end
```
