const mongoose = require('mongoose');
const slugify = require('../utils/slugify');

const threadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Tên thread là bắt buộc'],
      unique: true,
      trim: true,
      minlength: [3, 'Tên thread từ 3 đến 50 ký tự'],
      maxlength: [50, 'Tên thread từ 3 đến 50 ký tự'],
    },
    // Không có trong form, hook pre('validate') tự sinh từ name
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, default: '', trim: true, maxlength: [500, 'Mô tả tối đa 500 ký tự'] },
    // Tag chủ đề: chỉ để hiển thị và link tới /tags/:tag, không tự gắn vào bài
    tag: { type: String, default: '', lowercase: true, trim: true, maxlength: [30, 'Tag tối đa 30 ký tự'] },
    // Người tạo, gán từ session. Tên "author" để dùng lại requireOwnerOrAdmin
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Escape ký tự đặc biệt để tên như "C++", "Node.js" được so khớp đúng từng chữ
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Giống Category: chặn tên trùng không phân biệt hoa thường, rồi sinh slug; trùng thì thêm -2, -3, ...
threadSchema.pre('validate', async function () {
  if (!this.name || !(this.isNew || this.isModified('name'))) return;

  const sameName = await this.constructor.exists({
    name: new RegExp(`^${escapeRegex(this.name)}$`, 'i'),
    _id: { $ne: this._id },
  });
  if (sameName) {
    this.invalidate('name', 'Tên thread đã tồn tại');
    return;
  }

  const base = slugify(this.name) || 'thread';
  let slug = base;
  let n = 1;
  // "new" bị route /threads/new chiếm nên coi như đã dùng (giống Post)
  while (
    slug === 'new' ||
    (await this.constructor.exists({ slug, _id: { $ne: this._id } }))
  ) {
    n += 1;
    slug = `${base}-${n}`;
  }
  this.slug = slug;
});

module.exports = mongoose.model('Thread', threadSchema);
