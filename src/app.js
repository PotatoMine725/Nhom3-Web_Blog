const path = require('path');
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');

const { loadUser } = require('./middlewares/auth');
const viewHelpers = require('./utils/viewHelpers');
const postRoutes = require('./routes/posts');
const authRoutes = require('./routes/auth');
const commentRoutes = require('./routes/comments');

function createApp({ mongoUri, sessionSecret }) {
  const app = express();

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  app.use(express.urlencoded({ extended: false }));
  app.use(express.static(path.join(__dirname, 'public')));

  // Session lưu trong MongoDB (collection "sessions"), sống 7 ngày
  app.use(
    session({
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({ mongoUrl: mongoUri }),
      cookie: { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 },
    })
  );

  // Hàm nhỏ cho view: initials, avatarColor, timeAgo, readingTime
  Object.assign(app.locals, viewHelpers);

  // Biến dùng chung cho mọi view: currentUser (loadUser), flash (thông báo hiện một lần)
  // và currentPath (để tô đậm mục menu đang mở)
  app.use(loadUser);
  app.use((req, res, next) => {
    res.locals.flash = req.session.flash || null;
    delete req.session.flash;
    res.locals.currentPath = req.path;
    next();
  });

  app.use('/', postRoutes);
  app.use('/', commentRoutes);
  app.use('/', authRoutes);

  app.use((req, res) => {
    res.status(404).render('errors/404', { title: 'Không tìm thấy trang' });
  });

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).send('Lỗi máy chủ');
  });

  return app;
}

module.exports = createApp;
