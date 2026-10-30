const path = require('path');
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');

const { loadUser } = require('./middlewares/auth');
const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');

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

  // Biến dùng chung cho mọi view: currentUser (loadUser) và flash (thông báo hiện một lần)
  app.use(loadUser);
  app.use((req, res, next) => {
    res.locals.flash = req.session.flash || null;
    delete req.session.flash;
    next();
  });

  app.use('/', indexRoutes);
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
