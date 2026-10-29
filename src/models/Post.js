const mongoose = require('mongoose');
const slugify = require('../utils/slugify');

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Tiêu đề là bắt buộc'],
      trim: true,
      minlength: [5, 'Tiêu đề từ 5 đến 200 ký tự'],
      maxlength: [200, 'Tiêu đề từ 5 đến 200 ký tự'],
    },
    // Không có trong form, hook pre('validate') tự sinh từ title
    slug: { type: String, required: true, unique: true, lowercase: true },
    content: {
      type: String,
      required: [true, 'Nội dung là bắt buộc'],
      minlength: [20, 'Nội dung tối thiểu 20 ký tự'],
    },
    status: { type: String, required: true, enum: ['draft', 'published'], default: 'draft' },
    // Validator gắn vào path mảng (không gắn trong phần tử) để chỉ chạy một lần
    tags: {
      type: [{ type: String, lowercase: true, trim: true }],
      default: [],
      validate: { validator: (arr) => arr.length <= 10, message: 'Tối đa 10 tag' },
    },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Chưa có model Category (làm ở bước 5), tạm luôn null
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  },
  { timestamps: true }
);

postSchema.index({ status: 1, createdAt: -1 });
postSchema.index({ author: 1 });
postSchema.index({ category: 1 });
postSchema.index({ tags: 1 });
// default_language: 'none' để MongoDB không bỏ stop word / cắt đuôi từ theo tiếng Anh
postSchema.index({ title: 'text' }, { default_language: 'none' });

// Sinh slug khi tạo mới hoặc đổi title; trùng thì thêm -2, -3, ...
postSchema.pre('validate', async function () {
  if (!this.title || !(this.isNew || this.isModified('title'))) return;

  const base = slugify(this.title) || 'bai-viet';
  let slug = base;
  let n = 1;
  // "new" bị route /posts/new chiếm nên coi như đã dùng
  while (
    slug === 'new' ||
    (await this.constructor.exists({ slug, _id: { $ne: this._id } }))
  ) {
    n += 1;
    slug = `${base}-${n}`;
  }
  this.slug = slug;
});

module.exports = mongoose.model('Post', postSchema);
