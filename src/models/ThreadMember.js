const mongoose = require('mongoose');

// Cặp "user đã tham gia thread". Không bao giờ sửa nên chỉ có createdAt
const threadMemberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    thread: { type: mongoose.Schema.Types.ObjectId, ref: 'Thread', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Unique theo cặp để DB tự chặn tham gia trùng (BR12); cũng dùng để đếm thành viên của thread
threadMemberSchema.index({ thread: 1, user: 1 }, { unique: true });
// Danh sách thread tôi đã tham gia (ô chọn thread ở form bài viết)
threadMemberSchema.index({ user: 1 });

module.exports = mongoose.model('ThreadMember', threadMemberSchema);
