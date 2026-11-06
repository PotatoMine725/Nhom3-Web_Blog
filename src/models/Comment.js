const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    // trim chạy trước validate: chuỗi toàn dấu cách thành '' và bị required chặn
    content: {
      type: String,
      required: [true, 'Bình luận không được để trống'],
      trim: true,
      maxlength: [1000, 'Bình luận tối đa 1000 ký tự'],
    },
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Lấy bình luận của một bài theo thứ tự cũ -> mới
commentSchema.index({ post: 1, createdAt: 1 });

module.exports = mongoose.model('Comment', commentSchema);
