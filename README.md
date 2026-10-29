# Nhom3-Web_Blog

Web blog đơn giản bằng Node.js, Express, EJS và MongoDB. Chạy trên localhost.

## Yêu cầu

- Node.js >= 18
- MongoDB Community Server chạy local (cổng mặc định 27017)

## Chạy dự án

```bash
npm install
cp .env.example .env   # Windows: copy .env.example .env
```

Bật MongoDB (ví dụ `mongod`, hoặc service MongoDB trên Windows), rồi:

```bash
npm run dev
```

Mở http://localhost:3000.

Nếu thấy dòng `Không kết nối được MongoDB. Đã bật mongod chưa?` thì MongoDB chưa chạy hoặc `MONGODB_URI` trong `.env` sai.

## Tài liệu

- Thiết kế đã chốt: [docs/specs](docs/specs/README.md)
- Quy trình làm việc (spec → plan → code → report → review): [docs/README.md](docs/README.md)
- Quy ước Git (nhánh, commit, PR): [docs/GIT_CONVENTION.md](docs/GIT_CONVENTION.md)
- Hướng dẫn cho Claude Code: [CLAUDE.md](CLAUDE.md)
