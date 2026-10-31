const Post = require('../models/Post');
const Comment = require('../models/Comment');

// Bật sidebar phải và nạp dữ liệu cho nó: thẻ phổ biến, bình luận mới.
// BR5: cả hai chỉ tính bài đã đăng (published), không lộ bài nháp.
async function loadSidebar(req, res, next) {
  try {
    // $match trước $unwind để không tách tag của bài nháp
    const popularTags = await Post.aggregate([
      { $match: { status: 'published' } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: 10 },
    ]);

    // Lọc theo danh sách _id bài đã đăng, rồi mới lấy 5 bình luận mới nhất
    const publishedIds = await Post.distinct('_id', { status: 'published' });
    const recentComments = await Comment.find({ post: { $in: publishedIds } })
      .sort({ createdAt: -1, _id: -1 })
      .limit(5)
      .populate('author', 'username')
      .populate('post', 'title slug')
      .lean();

    res.locals.sidebar = true;
    res.locals.popularTags = popularTags;
    res.locals.recentComments = recentComments;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = loadSidebar;
