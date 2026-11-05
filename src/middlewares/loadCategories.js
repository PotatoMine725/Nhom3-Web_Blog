const Category = require('../models/Category');

// Nạp danh sách danh mục cho mọi view: menu danh mục trên header, ô chọn ở form bài và form lọc /search.
// Gắn toàn app, sau express.static nên không chạy cho file tĩnh. Ít danh mục nên không cache.
// Sắp theo name (so theo mã ký tự: tên bắt đầu bằng "Đ" đứng sau "Z", chấp nhận).
async function loadCategories(req, res, next) {
  try {
    res.locals.categories = await Category.find().sort({ name: 1 }).select('name slug').lean();
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = loadCategories;
