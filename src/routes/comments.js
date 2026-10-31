const express = require('express');
const mongoose = require('mongoose');
const comments = require('../controllers/commentController');
const Comment = require('../models/Comment');
const { requireLogin, requireOwnerOrAdmin } = require('../middlewares/auth');

const router = express.Router();

// id sai định dạng trả null để ra 404 thay vì CastError -> 500
const ownComment = requireOwnerOrAdmin((req) =>
  mongoose.isValidObjectId(req.params.id) ? Comment.findById(req.params.id).populate('post', 'slug') : null
);

router.post('/posts/:slug/comments', requireLogin, comments.create);
router.post('/comments/:id/delete', requireLogin, ownComment, comments.remove);

module.exports = router;
