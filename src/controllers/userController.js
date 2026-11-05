const User = require('../models/User');

// Trường lặp trong form (a=1&a=2) thành mảng; coi như rỗng để ra lỗi validate thay vì 500
const str = (v) => (typeof v === 'string' ? v : '');

// Cùng luật mật khẩu với đăng ký (bcrypt bỏ qua phần sau 72 byte)
function passwordError(password, confirmPassword) {
  if (password.length < 6 || Buffer.byteLength(password, 'utf8') > 72) {
    return 'Mật khẩu mới từ 6 ký tự, tối đa 72 byte (khoảng 72 ký tự không dấu)';
  }
  if (confirmPassword !== password) return 'Mật khẩu nhập lại không khớp';
  return null;
}

function renderProfile(res, status, { email, errors = [] }) {
  res.status(status).render('users/profile', { title: 'Hồ sơ', errors, values: { email } });
}

// UC07
function showProfile(req, res) {
  renderProfile(res, 200, { email: res.locals.currentUser.email });
}

// UC07, BR3: đổi email (giữ luật validate như đăng ký)
async function changeEmail(req, res) {
  const email = str(req.body.email).trim().toLowerCase();
  // Nạp bản mới để lỗi validate không làm sai currentUser đang dùng cho view
  const user = await User.findById(res.locals.currentUser._id);

  if (email === user.email) {
    req.session.flash = { type: 'info', message: 'Email không thay đổi' };
    return res.redirect('/profile');
  }

  user.email = email;
  const errors = [];
  const validationError = user.validateSync(['email']);
  if (validationError) {
    errors.push(...Object.values(validationError.errors).map((e) => e.message));
  } else if (await User.exists({ email, _id: { $ne: user._id } })) {
    errors.push('Email đã được sử dụng');
  }

  if (errors.length === 0) {
    try {
      await user.save();
      req.session.flash = { type: 'success', message: 'Đã cập nhật email' };
      return res.redirect('/profile');
    } catch (err) {
      // Trùng do hai request cùng lúc
      if (err.code !== 11000) throw err;
      errors.push('Email đã được sử dụng');
    }
  }
  renderProfile(res, 400, { email, errors });
}

// UC07: đổi mật khẩu, phải nhập đúng mật khẩu hiện tại
async function changePassword(req, res) {
  const currentPassword = str(req.body.currentPassword);
  const newPassword = str(req.body.newPassword);
  const confirmPassword = str(req.body.confirmPassword);
  const user = await User.findById(res.locals.currentUser._id).select('+passwordHash');

  const errors = [];
  if (!(await user.comparePassword(currentPassword))) {
    errors.push('Mật khẩu hiện tại không đúng');
  } else {
    const msg = passwordError(newPassword, confirmPassword);
    if (msg) errors.push(msg);
  }

  if (errors.length) {
    return renderProfile(res, 400, { email: user.email, errors });
  }
  await user.setPassword(newPassword);
  await user.save();
  req.session.flash = { type: 'success', message: 'Đã đổi mật khẩu' };
  res.redirect('/profile');
}

// Trang hồ sơ có 2 form gửi cùng URL, phân biệt bằng field ẩn "form"
async function updateProfile(req, res, next) {
  try {
    if (req.body.form === 'email') return await changeEmail(req, res);
    if (req.body.form === 'password') return await changePassword(req, res);
    res.redirect('/profile');
  } catch (err) {
    next(err);
  }
}

module.exports = { showProfile, updateProfile };
