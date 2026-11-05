const mongoose = require('mongoose');

// Cặp "user đã like bài". Không bao giờ sửa nên chỉ có createdAt
const likeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Unique theo cặp để DB tự chặn like trùng (BR9)
likeSchema.index({ user: 1, post: 1 }, { unique: true });
// Đếm like của một bài, xoá theo bài (BR6)
likeSchema.index({ post: 1 });

module.exports = mongoose.model('Like', likeSchema);
