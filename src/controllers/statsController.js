const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Like = require('../models/Like');

const MONTHS = 6;
const TOP = 5;
// Gom theo tháng theo múi giờ của máy chạy server, khớp với mốc "6 tháng trước" tính bằng Date local
const TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

// Ngày 1 của tháng cách đây (MONTHS - 1) tháng, 0 giờ: 6 tháng gồm cả tháng hiện tại
function monthsAgoStart(now) {
  return new Date(now.getFullYear(), now.getMonth() - (MONTHS - 1), 1);
}

// rows từ $group: [{ _id: { year, month }, count }]. Trả đủ 6 tháng cũ -> mới,
// tháng không có bài thì count = 0; percent = độ rộng thanh so với tháng nhiều bài nhất.
function fillMonths(rows, now) {
  const counts = {};
  rows.forEach((r) => { counts[`${r._id.year}-${r._id.month}`] = r.count; });

  const months = [];
  for (let i = MONTHS - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1; // $month trả 1–12
    months.push({
      label: `${String(month).padStart(2, '0')}/${year}`,
      count: counts[`${year}-${month}`] || 0,
    });
  }

  const max = Math.max(...months.map((m) => m.count));
  months.forEach((m) => { m.percent = max ? Math.round((m.count / max) * 100) : 0; });
  return months;
}

// Top bài theo số bản ghi (like hoặc bình luận) gom theo post; chỉ lấy bài published
function topPostsBy(Model) {
  return Model.aggregate([
    { $group: { _id: '$post', count: { $sum: 1 } } },
    { $lookup: { from: Post.collection.name, localField: '_id', foreignField: '_id', as: 'post' } },
    { $unwind: '$post' },
    { $match: { 'post.status': 'published' } },
    { $sort: { count: -1, _id: 1 } },
    { $limit: TOP },
    { $project: { _id: 0, count: 1, title: '$post.title', slug: '$post.slug' } },
  ]);
}

// Chạy mọi truy vấn ở specs/03 mục "Truy vấn thống kê" (UC20). Không ghi gì vào DB.
async function loadStats(now = new Date()) {
  const [
    userCount,
    lockedCount,
    statusRows,
    commentCount,
    likeCount,
    monthRows,
    topAuthors,
    topLiked,
    topCommented,
    topViewed,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isLocked: true }),
    Post.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Comment.countDocuments(),
    Like.countDocuments(),
    Post.aggregate([
      { $match: { status: 'published', createdAt: { $gte: monthsAgoStart(now) } } },
      {
        $group: {
          _id: {
            year: { $year: { date: '$createdAt', timezone: TIMEZONE } },
            month: { $month: { date: '$createdAt', timezone: TIMEZONE } },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
    Post.aggregate([
      { $match: { status: 'published' } },
      { $group: { _id: '$author', count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: TOP },
      { $lookup: { from: User.collection.name, localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { _id: 0, count: 1, username: '$user.username' } },
    ]),
    topPostsBy(Like),
    topPostsBy(Comment),
    Post.find({ status: 'published' })
      .sort({ views: -1, createdAt: -1 })
      .limit(TOP)
      .select('title slug views')
      .lean(),
  ]);

  // [{ _id: 'draft', count }, ...] -> { draft, published }, thiếu thì 0
  const postsByStatus = { draft: 0, published: 0 };
  statusRows.forEach((r) => { postsByStatus[r._id] = r.count; });

  return {
    userCount,
    lockedCount,
    postsByStatus,
    postCount: postsByStatus.draft + postsByStatus.published,
    commentCount,
    likeCount,
    months: fillMonths(monthRows, now),
    topAuthors,
    topLiked,
    topCommented,
    topViewed,
  };
}

// GET /admin (UC20)
async function dashboard(req, res, next) {
  try {
    const stats = await loadStats();
    res.render('admin/dashboard', { title: 'Thống kê', stats });
  } catch (err) {
    next(err);
  }
}

module.exports = { dashboard, loadStats, fillMonths };
