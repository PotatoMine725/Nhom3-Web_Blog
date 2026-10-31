const express = require('express');
const posts = require('../controllers/postController');
const Post = require('../models/Post');
const { requireLogin, requireOwnerOrAdmin } = require('../middlewares/auth');
const loadSidebar = require('../middlewares/loadSidebar');

const router = express.Router();

const ownPost = requireOwnerOrAdmin((req) => Post.findOne({ slug: req.params.slug }));

router.get('/', loadSidebar, posts.index);
// /posts/new phải khai báo trước /posts/:slug
router.get('/posts/new', requireLogin, posts.showNew);
router.post('/posts', requireLogin, posts.create);
router.get('/posts/:slug', loadSidebar, posts.show);
router.get('/posts/:slug/edit', requireLogin, ownPost, posts.showEdit);
router.post('/posts/:slug/edit', requireLogin, ownPost, posts.update);
router.post('/posts/:slug/delete', requireLogin, ownPost, posts.remove);
router.get('/me/posts', requireLogin, posts.mine);

module.exports = router;
