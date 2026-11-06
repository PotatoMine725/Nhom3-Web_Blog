// Handler lỗi cuối chuỗi middleware (đặt sau mọi route). Tách riêng để test không cần MongoDB.
function errorHandler(err, req, res, next) {
  // Express ném URIError có status 400 khi tham số URL hỏng (vd /posts/%): lỗi do client, trả 400 và không log như lỗi máy chủ.
  // Mọi lỗi khác (kể cả status khác) vẫn là 500, không lộ chi tiết.
  const badRequest = err && err.status === 400;
  if (!badRequest) console.error(err);
  if (res.headersSent) return next(err);
  const status = badRequest ? 400 : 500;
  const title = badRequest ? 'Yêu cầu không hợp lệ' : 'Lỗi máy chủ';
  // res.locals có thể trống nếu lỗi xảy ra trước loadUser: truyền mặc định để header không ném ReferenceError
  const data = {
    title,
    currentUser: res.locals.currentUser || null,
    flash: null,
    currentPath: req.path,
    sidebar: false,
  };
  res.status(status).render(`errors/${status}`, data, (renderErr, html) => {
    if (renderErr) {
      console.error(renderErr);
      return res.send(title); // đường lui chữ thô nếu chính trang lỗi cũng hỏng
    }
    res.send(html);
  });
}

module.exports = { errorHandler };
