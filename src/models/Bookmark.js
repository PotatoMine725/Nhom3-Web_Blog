const mongoose = require('mongoose');

// Cặp "user đã lưu bài". Không bao giờ sửa nên chỉ có createdAt
const bookmarkSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Unique theo cặp để DB tự chặn lưu trùng (BR9)
bookmarkSchema.index({ user: 1, post: 1 }, { unique: true });
// Xoá theo bài (BR6)
bookmarkSchema.index({ post: 1 });
// Trang "Đã lưu": lọc theo user, mới lưu nhất trước
bookmarkSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Bookmark', bookmarkSchema);
