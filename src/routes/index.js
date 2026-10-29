const express = require('express');

const router = express.Router();

// Trang chủ tạm thời. UC01 sẽ thay bằng danh sách bài viết.
router.get('/', (req, res) => {
  res.render('posts/index', { title: 'Trang chủ', posts: [] });
});

module.exports = router;
