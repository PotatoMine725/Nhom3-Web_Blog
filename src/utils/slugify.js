// Đổi tiêu đề thành slug: "Học Node.js từ đầu" -> "hoc-node-js-tu-dau"
// Chỉ xử lý chuỗi; việc chống trùng slug nằm trong hook của model Post.
function slugify(text) {
  return String(text)
    .replace(/đ/g, 'd') // NFD không tách được chữ đ
    .replace(/Đ/g, 'D')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // bỏ dấu
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

module.exports = slugify;
