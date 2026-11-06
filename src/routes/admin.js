const express = require('express');
const admin = require('../controllers/adminController');
const stats = require('../controllers/statsController');
const { requireAdmin } = require('../middlewares/auth');

const router = express.Router();

// Gắn requireAdmin cho từng route (không dùng router.use vì router mount ở '/' sẽ chặn mọi URL).
// requireAdmin trả 403 cho cả khách lẫn member.
router.get('/admin', requireAdmin, stats.dashboard);
router.get('/admin/users', requireAdmin, admin.users);
router.post('/admin/users/:id/lock', requireAdmin, admin.toggleLock);
router.post('/admin/users/:id/role', requireAdmin, admin.toggleRole);
router.get('/admin/posts', requireAdmin, admin.posts);

module.exports = router;
