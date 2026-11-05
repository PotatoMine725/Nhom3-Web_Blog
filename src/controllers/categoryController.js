const mongoose = require('mongoose');
const Category = require('../models/Category');
const Post = require('../models/Post');

const str = (v) => (typeof v === 'string' ? v : '');

// Trả về mảng message nếu là lỗi người dùng sửa được, null nếu là lỗi khác (ném tiếp)
function validationMessages(err) {
  if (err.name === 'ValidationError') {
    // Bỏ lỗi của slug: tên rỗng thì hook không sinh slug, lỗi tên đã đủ
    return Object.values(err.errors)
      .filter((e) => e.path !== 'slug')
      .map((e) => e.message);
  }
  if (err.code === 11000 && err.keyPattern && err.keyPattern.name) {
    return ['Tên danh mục đã tồn tại'];
  }
  // Hai request tên khác nhau nhưng cùng slug ("Node js", "Node.js") gửi cùng lúc
  if (err.code === 11000 && err.keyPattern && err.keyPattern.slug) {
    return ['Đường dẫn danh mục bị trùng, bấm Lưu lại lần nữa'];
  }
  return null;
}

// Danh mục theo :id; id sai định dạng coi như không tồn tại (404 thay vì CastError -> 500)
function findById(id) {
  return mongoose.isValidObjectId(id) ? Category.findById(id) : null;
}

function notFound(res) {
  res.status(404).render('errors/404', { title: 'Không tìm thấy trang' });
}

// Bảng danh mục + số bài (đếm cả bài nháp). Đặt tên rows để không đè res.locals.categories của header
async function renderPage(res, { status = 200, errors = [], name = '' } = {}) {
  const categories = await Category.find().sort({ name: 1 }).lean();
  const counts = await Post.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]);
  const countById = new Map(counts.map((c) => [String(c._id), c.count]));
  const rows = categories.map((c) => ({ ...c, postCount: countById.get(String(c._id)) || 0 }));

  res.status(status).render('admin/categories', {
    title: 'Quản lý danh mục',
    rows,
    // _id null = bài chưa phân loại
    uncategorizedCount: countById.get('null') || 0,
    errors,
    name,
  });
}

// UC14: GET /admin/categories
async function list(req, res, next) {
  try {
    await renderPage(res);
  } catch (err) {
    next(err);
  }
}

// UC14: POST /admin/categories. Lỗi thì render lại trang (400), giữ tên đã nhập
async function create(req, res, next) {
  try {
    const name = str(req.body.name).trim();
    try {
      await new Category({ name }).save();
    } catch (err) {
      const errors = validationMessages(err);
      if (!errors) throw err;
      return await renderPage(res, { status: 400, errors, name });
    }
    req.session.flash = { type: 'success', message: 'Đã thêm danh mục' };
    res.redirect('/admin/categories');
  } catch (err) {
    next(err);
  }
}

// UC14: POST /admin/categories/:id/edit. Lỗi thì báo bằng flash rồi quay lại trang
async function update(req, res, next) {
  try {
    const category = await findById(req.params.id);
    if (!category) return notFound(res);

    category.name = str(req.body.name).trim();
    try {
      await category.save(); // đổi tên thì hook sinh lại slug
    } catch (err) {
      const errors = validationMessages(err);
      if (!errors) throw err;
      req.session.flash = { type: 'danger', message: errors.join('. ') };
      return res.redirect('/admin/categories');
    }
    req.session.flash = { type: 'success', message: 'Đã đổi tên danh mục' };
    res.redirect('/admin/categories');
  } catch (err) {
    next(err);
  }
}

// UC14: POST /admin/categories/:id/delete. Bài thuộc danh mục về "Chưa phân loại"
async function remove(req, res, next) {
  try {
    const category = await findById(req.params.id);
    if (!category) return notFound(res);

    // Xoá danh mục trước: sau đó form bài không chọn được danh mục này nữa, rồi mới gỡ khỏi bài.
    // timestamps: false để không đổi updatedAt của bài
    await category.deleteOne();
    await Post.updateMany({ category: category._id }, { $set: { category: null } }, { timestamps: false });

    req.session.flash = { type: 'success', message: 'Đã xoá danh mục, các bài của nó chuyển về "Chưa phân loại"' };
    res.redirect('/admin/categories');
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove };
