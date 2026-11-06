const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username là bắt buộc'],
      unique: true,
      lowercase: true,
      trim: true,
      minlength: [3,'Username từ 3 đến 30 ký tự'],
      maxlength: [30, 'Username từ 3 đến 30 ký tự'],
      match: [/^[a-zA-Z0-9_]+$/, 'Username chỉ gồm chữ, số và dấu gạch dưới'],
    },
    email: {
      type: String,
      required: [true, 'Email là bắt buộc'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Email không đúng định dạng'],
    },
    // select: false để mặc định không bị lộ ra khi query
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, required: true, enum: ['member', 'admin'], default: 'member' },
    isLocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.methods.setPassword = async function (plain) {
  this.passwordHash = await bcrypt.hash(plain, 10);
};

// Query user phải có .select('+passwordHash') trước khi gọi hàm này
userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);
