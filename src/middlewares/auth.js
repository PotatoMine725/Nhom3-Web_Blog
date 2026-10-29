const User = require('../models/User');

// Gắn currentUser cho mọi view. User bị xoá hoặc bị khoá thì coi như khách.
async function loadUser(req, res, next) {
  res.locals.currentUser = null;
  try {
    if (req.session.userId) {
      const user = await User.findById(req.session.userId);
      if (!user || user.isLocked) {
        delete req.session.userId;
        delete req.session.role;
      } else {
        res.locals.currentUser = user;
      }
    }
    next();
  } catch (err) {
    next(err);
  }
}

function requireLogin(req, res, next) {
  if (!res.locals.currentUser) return res.redirect('/login');
  next();
}

// Quyền lấy từ DB (currentUser.role), không tin req.session.role vì có thể cũ
function requireAdmin(req, res, next) {
  const user = res.locals.currentUser;
  if (!user || user.role !== 'admin') {
    return res.status(403).render('errors/403', { title: 'Không có quyền' });
  }
  next();
}

function redirectIfLoggedIn(req, res, next) {
  if (res.locals.currentUser) return res.redirect('/');
  next();
}

module.exports = { loadUser, requireLogin, requireAdmin, redirectIfLoggedIn };
