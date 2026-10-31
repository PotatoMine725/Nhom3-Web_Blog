const Post = require('../models/Post');
const Comment = require('../models/Comment');
const { renderShow } = require('./postController');

// Trường lặp trong form (a=1&a=2) thành mảng; coi như rỗng để ra lỗi validate thay vì 500
const str = (v) => (typeof v === 'string' ? v : '');

// UC12, BR1
async function create(req, res, next) {
  try {
    // Bài nháp coi như không tồn tại để không lộ bài
    const post = await Post.findOne({ slug: req.params.slug, status: 'published' }).populate(
      'author',
      'username'
    );
    if (!post) {
      return res.status(404).render('errors/404', { title: 'Không tìm thấy trang' });
    }

    // Chỉ đọc content từ form; author lấy từ session, post lấy từ URL
    const content = str(req.body.content).trim();
    try {
      await new Comment({ content, post: post._id, author: res.locals.currentUser._id }).save();
    } catch (err) {
      if (err.name !== 'ValidationError') throw err;
      const errors = Object.values(err.errors).map((e) => e.message);
      // Phải có await: renderShow là async, thiếu thì lỗi của nó không tới next(err)
      return await renderShow(res, post, { status: 400, errors, commentContent: content });
    }
    req.session.flash = { type: 'success', message: 'Đã gửi bình luận' };
    res.redirect(`/posts/${post.slug}#comments`);
  } catch (err) {
    next(err);
  }
}

// UC13, BR2, UC16 (req.doc do requireOwnerOrAdmin nạp, kèm post.slug)
async function remove(req, res, next) {
  try {
    await req.doc.deleteOne();
    req.session.flash = { type: 'success', message: 'Đã xoá bình luận' };
    // Bình luận mồ côi (bài đã mất) thì về trang chủ
    res.redirect(req.doc.post ? `/posts/${req.doc.post.slug}#comments` : '/');
  } catch (err) {
    next(err);
  }
}

module.exports = { create, remove };
