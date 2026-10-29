const User = require('../models/User');

// Trường lặp trong form (a=1&a=2) thành mảng; coi như rỗng để ra lỗi validate thay vì 500
const str = (v) => (typeof v === 'string' ? v : '');

function showRegister(req, res) {
  res.render('auth/register', { title: 'Đăng ký', errors: [], values: {} });
}

// UC04, BR3
async function register(req, res, next) {
  try {
    // Không lấy role/isLocked từ form; role mặc định là member
    const username = str(req.body.username).trim();
    const email = str(req.body.email).trim().toLowerCase();
    const password = str(req.body.password);
    const confirmPassword = str(req.body.confirmPassword);

    const errors = [];
    const user = new User({ username, email });

    // Lỗi validate của schema (độ dài, ký tự, định dạng email, bắt buộc)
    const validationError = user.validateSync(['username', 'email']);
    if (validationError) {
      errors.push(...Object.values(validationError.errors).map((e) => e.message));
    }

    // Mật khẩu không nằm trong schema nên kiểm tra ở đây (bcrypt bỏ qua phần sau 72 byte)
    if (password.length < 6 || Buffer.byteLength(password, 'utf8') > 72) {
      errors.push('Mật khẩu từ 6 ký tự, tối đa 72 byte (khoảng 72 ký tự không dấu)');
    } else if (confirmPassword !== password) {
      errors.push('Mật khẩu nhập lại không khớp');
    }

    if (email && (await User.findOne({ email }))) errors.push('Email đã được sử dụng');
    if (username && (await User.findOne({ username }))) errors.push('Username đã được sử dụng');

    if (errors.length === 0) {
      try {
        await user.setPassword(password);
        await user.save();
        req.session.flash = { type: 'success', message: 'Đăng ký thành công, mời đăng nhập' };
        return res.redirect('/login');
      } catch (err) {
        if (err.name === 'ValidationError') {
          errors.push(...Object.values(err.errors).map((e) => e.message));
        } else if (err.code === 11000) {
          // Trùng do hai request đăng ký cùng lúc
          errors.push(err.keyPattern && err.keyPattern.email ? 'Email đã được sử dụng' : 'Username đã được sử dụng');
        } else {
          throw err;
        }
      }
    }

    res.status(400).render('auth/register', {
      title: 'Đăng ký',
      errors,
      values: { username, email },
    });
  } catch (err) {
    next(err);
  }
}

function showLogin(req, res) {
  res.render('auth/login', { title: 'Đăng nhập', error: null, values: {} });
}

// UC05, BR8
async function login(req, res, next) {
  try {
    const email = str(req.body.email).trim().toLowerCase();
    const password = str(req.body.password);

    const user = await User.findOne({ email }).select('+passwordHash');
    // Cùng một câu cho "không có user" và "sai mật khẩu" để không lộ email nào tồn tại
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).render('auth/login', {
        title: 'Đăng nhập',
        error: 'Sai email hoặc mật khẩu',
        values: { email },
      });
    }

    // Chỉ báo khoá sau khi mật khẩu đúng
    if (user.isLocked) {
      return res.status(403).render('auth/login', {
        title: 'Đăng nhập',
        error: 'Tài khoản đã bị khoá, liên hệ admin',
        values: { email },
      });
    }

    // regenerate để chống session fixation
    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.userId = user._id;
      req.session.role = user.role;
      res.redirect('/');
    });
  } catch (err) {
    next(err);
  }
}

// UC06
function logout(req, res, next) {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
}

module.exports = { showRegister, register, showLogin, login, logout };
