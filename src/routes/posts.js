const express = require('express');
const posts = require('../controllers/postController');
const reactions = require('../controllers/reactionController');
const Post = require('../models/Post');
const { requireLogin, requireOwnerOrAdmin } = require('../middlewares/auth');
const loadSidebar = require('../middlewares/loadSidebar');

const router = express.Router();

const ownPost = requireOwnerOrAdmin((req) => Post.findOne({ slug: req.params.slug }));

router.get('/', loadSidebar, posts.index);
router.get('/popular', loadSidebar, posts.popular);
// /posts/new phải khai báo trước /posts/:slug
router.get('/posts/new', requireLogin, posts.showNew);
router.post('/posts', requireLogin, posts.create);
router.get('/posts/:slug', loadSidebar, posts.show);
router.get('/posts/:slug/edit', requireLogin, ownPost, posts.showEdit);
router.post('/posts/:slug/edit', requireLogin, ownPost, posts.update);
router.post('/posts/:slug/delete', requireLogin, ownPost, posts.remove);
router.get('/me/posts', requireLogin, posts.mine);

// Like / lưu bài (UC17, UC18)
router.post('/posts/:slug/like', requireLogin, reactions.like);
router.post('/posts/:slug/bookmark', requireLogin, reactions.bookmark);
router.get('/me/bookmarks', requireLogin, reactions.bookmarks);

module.exports = router;
