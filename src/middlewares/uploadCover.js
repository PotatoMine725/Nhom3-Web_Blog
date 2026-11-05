// Upload ảnh bìa (BR11): multer đọc form multipart/form-data, lưu file vào uploads/ ở gốc repo.
// Đặt SAU requireLogin / requireOwnerOrAdmin để khách và người không có quyền không ghi được file.
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

// Chỉ nhận 3 loại ảnh; đuôi file lấy theo loại (mimetype), không theo tên gốc
const EXT_BY_TYPE = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  // Tên do server đặt: thời gian + chuỗi ngẫu nhiên + đuôi. Không dùng tên file gốc
  filename(req, file, cb) {
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${EXT_BY_TYPE[file.mimetype]}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE, files: 1 },
  fileFilter(req, file, cb) {
    if (EXT_BY_TYPE[file.mimetype]) return cb(null, true);
    // Sai loại: bỏ qua file (không ghi ra đĩa), controller hiện lại form với lỗi này
    req.uploadError = 'Ảnh bìa chỉ nhận JPG, PNG hoặc WEBP';
    cb(null, false);
  },
}).single('coverImage');

// Lỗi của người dùng (sai loại, quá 2 MB) không ném 500: gắn req.uploadError rồi đi tiếp.
// Khi có lỗi, multer tự xoá file đang ghi dở nên không còn file nào trên đĩa.
function uploadCover(req, res, next) {
  upload(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      req.uploadError = err.code === 'LIMIT_FILE_SIZE' ? 'Ảnh bìa tối đa 2 MB' : 'Ảnh bìa không hợp lệ';
      req.file = undefined;
      req.body = req.body || {};
      return next();
    }
    next(err);
  });
}

// Xoá một file ảnh bìa trong uploads/. Không có file thì thôi; lỗi khác chỉ ghi log
// vì việc chính (lưu / xoá bài) đã xong, không nên báo lỗi 500 cho người dùng.
async function removeCover(filename) {
  if (!filename) return;
  try {
    // basename để chắc chắn chỉ xoá trong uploads/
    await fs.promises.unlink(path.join(UPLOAD_DIR, path.basename(filename)));
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('Không xoá được ảnh bìa', filename, err);
  }
}

module.exports = { uploadCover, removeCover, UPLOAD_DIR, MAX_SIZE };
