const mongoose = require('mongoose');
const User = require('../models/User');
const Post = require('../models/Post');

const PAGE_SIZE = 10;

function notFound(res) {
  return res.status(404).render('errors/404', { title: 'Không tìm thấy trang' });
}

// id sai định dạng trả null để ra 404 thay vì CastError -> 500
function findUserById(id) {
  return mongoose.isValidObjectId(id) ? User.findById(id) : null;
}

// UC15: danh sách người dùng
async function users(req, res, next) {
  try {
    const list = await User.find().sort({ createdAt: 1, _id: 1 });
    res.render('admin/users', { title: 'Quản lý người dùng', users: list });
  } catch (err) {
    next(err);
  }
}

// UC15, BR8: khoá / mở khoá. User bị khoá bị loadUser đá ra ở request kế tiếp
async function toggleLock(req, res, next) {
  try {
    const user = await findUserById(req.params.id);
    if (!user) return notFound(res);

    if (user._id.equals(res.locals.currentUser._id)) {
      req.session.flash = { type: 'danger', message: 'Không thể tự khoá tài khoản của mình' };
      return res.redirect('/admin/users');
    }

    user.isLocked = !user.isLocked;
    await user.save();
    req.session.flash = {
      type: 'success',
      message: `${user.isLocked ? 'Đã khoá' : 'Đã mở khoá'} tài khoản ${user.username}`,
    };
    res.redirect('/admin/users');
  } catch (err) {
    next(err);
  }
}

// UC15: đổi vai trò member <-> admin
async function toggleRole(req, res, next) {
  try {
    const user = await findUserById(req.params.id);
    if (!user) return notFound(res);

    if (user._id.equals(res.locals.currentUser._id)) {
      req.session.flash = { type: 'danger', message: 'Không thể tự đổi vai trò của mình' };
      return res.redirect('/admin/users');
    }

    user.role = user.role === 'admin' ? 'member' : 'admin';
    await user.save();
    req.session.flash = {
      type: 'success',
      message: `Đã đổi vai trò của ${user.username} thành ${user.role}`,
    };
    res.redirect('/admin/users');
  } catch (err) {
    next(err);
  }
}

// UC16: mọi bài, kể cả nháp, lọc theo ?status=draft|published
async function posts(req, res, next) {
  try {
    const status = ['draft', 'published'].includes(req.query.status) ? req.query.status : '';
    const filter = status ? { status } : {};

    let page = parseInt(req.query.page, 10);
    if (!(page >= 1)) page = 1;
    const total = await Post.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    page = Math.min(page, totalPages);

    const list = await Post.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .populate('author', 'username');

    res.render('admin/posts', {
      title: 'Kiểm duyệt bài viết',
      posts: list,
      status,
      total,
      page,
      totalPages,
      basePath: '/admin/posts',
      // pagination giữ bộ lọc khi chuyển trang
      query: status ? { status } : {},
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { users, toggleLock, toggleRole, posts };
