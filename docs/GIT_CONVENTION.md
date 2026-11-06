# Git convention

Quy tắc ngắn gọn, đủ cho nhóm nhỏ. Áp dụng cho cả người và Claude Code.

## Nhánh

| Nhánh | Vai trò | Ai được push trực tiếp |
| --- | --- | --- |
| `main` | Bản ổn định, chạy được trên trình duyệt. Chỉ nhận merge từ `dev` | Không ai |
| `dev` | Gom các feature đã xong, dùng để test chung | Không ai (chỉ merge qua PR) |
| `feature/...`, `fix/...`, `docs/...`, `chore/...` | Làm một việc cụ thể, tạo từ `dev` | Người làm việc đó |

Luồng làm việc:

```text
dev ──► feature/auth ──(PR)──► dev ──(PR release khi ổn định trên GUI)──► main
```

1. Cập nhật `dev` rồi tạo nhánh mới từ đó: `git checkout dev && git pull && git checkout -b feature/auth`.
2. Code, commit, push nhánh, mở PR **vào `dev`**.
3. Merge vào `dev` khi PR đã được review và chạy được trên máy.
4. Khi các feature trên `dev` chạy ổn định qua giao diện web (đã test thủ công các use case liên quan), mở PR **`dev` → `main`**.
5. Xoá nhánh feature sau khi merge.

## Đặt tên nhánh

`<loại>/<mô-tả-ngắn>`: chữ thường, không dấu, nối bằng `-`.

| Loại | Dùng khi | Ví dụ |
| --- | --- | --- |
| `feature/` | Thêm chức năng | `feature/auth`, `feature/post-crud` |
| `fix/` | Sửa lỗi | `fix/slug-trung` |
| `docs/` | Chỉ sửa tài liệu | `docs/git-convention` |
| `chore/` | Cấu hình, thư viện, dọn dẹp | `chore/update-deps` |

Ngoại lệ: phiên Claude Code trên cloud có thể tự đặt tên nhánh dạng `claude/...`. Vẫn mở PR vào `dev` như bình thường.

## Commit message

`<loại>: <mô tả ngắn>`, tối đa khoảng 72 ký tự, tiếng Việt hoặc tiếng Anh, viết ở thể mệnh lệnh / mô tả việc đã làm.

| Loại | Ý nghĩa |
| --- | --- |
| `feat` | Chức năng mới |
| `fix` | Sửa lỗi |
| `docs` | Tài liệu |
| `refactor` | Sửa code không đổi hành vi |
| `style` | Giao diện, CSS, format code |
| `chore` | Cấu hình, thư viện, việc lặt vặt |

Ví dụ:

```text
feat: thêm đăng ký và đăng nhập (UC04, UC05)
fix: chặn sửa bài của người khác
docs: thêm plan cho CRUD bài viết
```

Mỗi commit làm một việc. Không commit `.env`, `node_modules`.

## Pull request

- **Title**: cùng định dạng commit, kèm mã use case nếu có. Ví dụ `feat: CRUD bài viết (UC08–UC11)`.
- PR release `dev` → `main`: `release: <tóm tắt>`, ví dụ `release: đăng nhập + CRUD bài viết`.
- **Body**: theo template `.github/pull_request_template.md` (tự hiện khi mở PR).
- Một PR một mục tiêu. PR quá lớn thì tách.
- Merge vào `dev`: chọn **Squash and merge** để lịch sử `dev` gọn (mỗi feature một commit).
- Merge `dev` → `main`: chọn **Create a merge commit** để giữ lịch sử từ `dev`.

## Checklist trước khi merge `dev` → `main`

- [ ] `npm install` và `npm run dev` chạy không lỗi trên máy sạch (có `.env`, MongoDB đã bật).
- [ ] Test thủ công trên trình duyệt các use case của các feature mới.
- [ ] Không còn link/nút dẫn tới trang 404 trong phần đã làm.
- [ ] Có report trong `docs/reports/` cho các feature mới.
