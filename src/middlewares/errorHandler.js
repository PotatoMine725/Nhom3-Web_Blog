// Handler lỗi cuối chuỗi middleware (đặt sau mọi route). Tách riêng để test không cần MongoDB.
function errorHandler(err, req, res, next) {
  console.error(err);
  if (res.headersSent) return next(err);
  // res.locals có thể trống nếu lỗi xảy ra trước loadUser: truyền mặc định để header không ném ReferenceError
  const data = {
    title: 'Lỗi máy chủ',
    currentUser: res.locals.currentUser || null,
    flash: null,
    currentPath: req.path,
    sidebar: false,
  };
  res.status(500).render('errors/500', data, (renderErr, html) => {
    if (renderErr) {
      console.error(renderErr);
      return res.send('Lỗi máy chủ'); // đường lui chữ thô nếu chính trang lỗi cũng hỏng
    }
    res.send(html);
  });
}

module.exports = { errorHandler };
