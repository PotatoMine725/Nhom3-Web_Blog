const Post = require('../models/Post');
const Like = require('../models/Like');
const Bookmark = require('../models/Bookmark');
const { PAGE_SIZE, addCommentCounts } = require('./postController');

// Like và Bookmark xử lý giống hệt nhau, chỉ khác collection (UC17, UC18, BR1, BR9).
// Có cặp (user, post) thì xoá, chưa có thì tạo; xong quay lại trang bài.
function toggle(Model) {
  return async (req, res, next) => {
    try {
      // Bài nháp coi như không tồn tại (giống UC02)
      const post = await Post.findOne({ slug: req.params.slug, status: 'published' });
      if (!post) {
        return res.status(404).render('errors/404', { title: 'Không tìm thấy trang' });
      }

      // user lấy từ session, post lấy từ URL
      const pair = { user: res.locals.currentUser._id, post: post._id };
      const removed = await Model.findOneAndDelete(pair);
      if (!removed) {
        try {
          await Model.create(pair);
        } catch (err) {
          // Bấm 2 lần cùng lúc: unique index chặn bản ghi thứ hai, coi như đã like / đã lưu
          if (err.code !== 11000) throw err;
        }
      }
      res.redirect(`/posts/${post.slug}`);
    } catch (err) {
      next(err);
    }
  };
}

// UC18, BR5, BR9: bài đã lưu còn published, mới lưu nhất trước, 10 bài/trang
async function bookmarks(req, res, next) {
  try {
    const userId = res.locals.currentUser._id;
    let page = parseInt(req.query.page, 10);
    if (!(page >= 1)) page = 1;

    // Bài chuyển về nháp vẫn giữ bookmark nhưng ẩn khỏi trang này (BR9)
    const savedPostIds = await Bookmark.distinct('post', { user: userId });
    const publishedIds = await Post.distinct('_id', { _id: { $in: savedPostIds }, status: 'published' });
    const filter = { user: userId, post: { $in: publishedIds } };

    // Đếm trước để kẹp page, tránh skip quá lớn
    const total = await Bookmark.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    page = Math.min(page, totalPages);

    const rows = await Bookmark.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .populate({ path: 'post', populate: { path: 'author', select: 'username' } })
      .lean();
    const posts = rows.map((b) => b.post).filter(Boolean);
    await addCommentCounts(posts);

    res.render('posts/index', {
      title: 'Bài đã lưu',
      posts,
      page,
      totalPages,
      basePath: '/me/bookmarks',
      emptyMessage: 'Bạn chưa lưu bài nào. Bấm "Lưu" ở trang bài viết để lưu lại đọc sau.',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  like: toggle(Like),
  bookmark: toggle(Bookmark),
  bookmarks,
};
