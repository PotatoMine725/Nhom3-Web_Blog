# docs · Spec Driven Development

Mọi thay đổi code đi theo một chiều: **spec → plan → code → report → review**. Spec là contract, code phải khớp spec.

| Thư mục | Chứa gì | Ai viết | Khi nào |
| --- | --- | --- | --- |
| `specs/` | Thiết kế đã chốt: nghiệp vụ, use case, dữ liệu, route, kiến trúc. **Contract.** | Nhóm duyệt | Trước khi code. Chỉ sửa khi nhóm đồng ý, ghi lịch sử thay đổi |
| `plans/` | Implementation plan cho từng phần: các bước, file đụng tới, cách kiểm thử | Claude Code / thành viên | Trước khi code một phần |
| `prompts/` | Prompt giao cho Claude Code, lưu lại để tái sử dụng và truy vết | Người giao việc | Mỗi lần giao việc |
| `reports/` | Báo cáo sau khi làm: đã làm gì, lệch plan chỗ nào, test ra sao | Người làm | Sau khi code xong một plan |
| `reviews/` | Review code/PR so với spec và plan: lỗi, đề xuất, kết luận | Người review | Trước khi merge |

## Quy ước đặt tên

- `specs/NN-ten-ngan.md` (đánh số theo thứ tự đọc).
- `plans/`, `reports/`, `reviews/`, `prompts/`: `YYYY-MM-DD-ten-ngan.md`. Cùng một phần việc thì dùng cùng `ten-ngan`, ví dụ:
  - `prompts/2026-10-29-auth.md`
  - `plans/2026-10-29-auth.md`
  - `reports/2026-10-30-auth.md`
  - `reviews/2026-10-30-auth.md`
- Mỗi thư mục có `_template.md`, copy ra để viết.

## Quy trình

1. Đọc spec liên quan trong `specs/`.
2. Viết plan vào `plans/` (từ template), trích mã use case / quy tắc (UC.., BR..) mà plan đáp ứng.
3. Code theo plan trên một branch riêng.
4. Viết report vào `reports/`.
5. Review vào `reviews/`, sửa nếu cần, rồi merge.

Nếu khi code phát hiện spec sai hoặc thiếu: **dừng lại**, đề xuất sửa spec và chờ duyệt, không tự ý code khác spec.
