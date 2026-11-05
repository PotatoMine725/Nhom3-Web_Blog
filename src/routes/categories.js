const express = require('express');
const search = require('../controllers/searchController');
const categories = require('../controllers/categoryController');
const { requireAdmin } = require('../middlewares/auth');

const router = express.Router();

// UC03: công khai
router.get('/search', search.search);
router.get('/categories/:slug', search.byCategory);
router.get('/tags/:tag', search.byTag);

// UC14: chỉ requireAdmin (theo specs/04). Khách và member đều nhận 403
router.get('/admin/categories', requireAdmin, categories.list);
router.post('/admin/categories', requireAdmin, categories.create);
router.post('/admin/categories/:id/edit', requireAdmin, categories.update);
router.post('/admin/categories/:id/delete', requireAdmin, categories.remove);

module.exports = router;
