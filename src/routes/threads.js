const express = require('express');
const threads = require('../controllers/threadController');
const Thread = require('../models/Thread');
const { requireLogin, requireOwnerOrAdmin } = require('../middlewares/auth');

const router = express.Router();

// Thread lưu người tạo ở field author nên dùng lại requireOwnerOrAdmin (UC25)
const ownThread = requireOwnerOrAdmin((req) => Thread.findOne({ slug: req.params.slug.toLowerCase() }));

router.get('/threads', threads.index);
// /threads/new phải khai báo trước /threads/:slug
router.get('/threads/new', requireLogin, threads.showNew);
router.post('/threads', requireLogin, threads.create);
router.get('/threads/:slug', threads.show);
router.post('/threads/:slug/join', requireLogin, threads.join);
router.post('/threads/:slug/leave', requireLogin, threads.leave);
router.post('/threads/:slug/delete', requireLogin, ownThread, threads.remove);

module.exports = router;
