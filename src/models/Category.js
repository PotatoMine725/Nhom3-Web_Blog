const mongoose = require('mongoose');
const slugify = require('../utils/slugify');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Tên danh mục là bắt buộc'],
      unique: true,
      trim: true,
      maxlength: [50, 'Tên danh mục tối đa 50 ký tự'],
    },
    // Không có trong form, hook pre('validate') tự sinh từ name
    slug: { type: String, required: true, unique: true, lowercase: true },
  },
  { timestamps: true }
);

// Escape ký tự đặc biệt để tên như "C++", "Node.js" được so khớp đúng từng chữ
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Khi tạo mới hoặc đổi tên: chặn tên trùng không phân biệt hoa thường ("Lập trình" và "lập trình"),
// rồi sinh slug; slug trùng thì thêm -2, -3, ... (giống Post)
categorySchema.pre('validate', async function () {
  if (!this.name || !(this.isNew || this.isModified('name'))) return;

  const sameName = await this.constructor.exists({
    name: new RegExp(`^${escapeRegex(this.name)}$`, 'i'),
    _id: { $ne: this._id },
  });
  if (sameName) {
    this.invalidate('name', 'Tên danh mục đã tồn tại');
    return;
  }

  const base = slugify(this.name) || 'danh-muc';
  let slug = base;
  let n = 1;
  while (await this.constructor.exists({ slug, _id: { $ne: this._id } })) {
    n += 1;
    slug = `${base}-${n}`;
  }
  this.slug = slug;
});

module.exports = mongoose.model('Category', categorySchema);
