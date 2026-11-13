const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Category = require('../models/Category');

const PAGE_SIZE = 10;
const NEWEST = { createdAt: -1, _id: -1 };

// Tham số lặp (?q=a&q=b) hoặc object (?q[x]=1) thành chuỗi rỗng: không 500, không NoSQL injection
const str = (v) => (typeof v === 'string' ? v : '');

// Từ khoá: bỏ dấu " (tránh cú pháp cụm từ của $text bị lệch cặp), trim, tối đa 100 ký tự
function normalizeQuery(value) {
  return str(value).replace(/"/g, ' ').trim().slice(0, 100).trim();
}

// Tag: trim + lowercase như lúc lưu bài (UC03 bước 3)
function normalizeTag(value) {
  return str(value).trim().toLowerCase().slice(0, 100);
}

// Đếm bình luận của các bài trong trang bằng một truy vấn (giống index của postController)
async function attachCommentCounts(posts) {
  const counts = await Comment.aggregate([
    { $match: { post: { $in: posts.map((p) => p._id) } } },
    { $group: { _id: '$post', count: { $sum: 1 } } },
  ]);
  const countByPost = new Map(counts.map((c) => [String(c._id), c.count]));
  posts.forEach((p) => {
    p.commentCount = countByPost.get(String(p._id)) || 0;
  });
}

// Phân trang + render posts/index cho 3 trang /search, /categories/:slug, /tags/:tag. BR5, BR7
async function renderList(req, res, { filter, sort = NEWEST, projection, view }) {
  let page = parseInt(req.query.page, 10);
  if (!(page >= 1)) page = 1;

  // Đếm trước để kẹp page, tránh skip quá lớn
  const total = await Post.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  page = Math.min(page, totalPages);

  const posts = await Post.find(filter, projection)
    .sort(sort)
    .skip((page - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE)
    .populate('author', 'username')
    .populate('category', 'name slug')
    .populate('thread', 'name slug')
    .lean();
  await attachCommentCounts(posts);

  res.render('posts/index', { ...view, posts, page, totalPages, total });
}

// UC03: GET /search?q=&category=&tag=&page=
async function search(req, res, next) {
  try {
    const q = normalizeQuery(req.query.q);
    const category = str(req.query.category).trim().toLowerCase();
    const tag = normalizeTag(req.query.tag);

    // 2a. Không nhập điều kiện nào
    if (!q && !category && !tag) return res.redirect('/');

    // BR5: chỉ bài đã đăng. Khớp đủ mọi điều kiện đã nhập
    const filter = { status: 'published' };
    if (q) filter.$text = { $search: q };
    if (category) {
      const found = await Category.findOne({ slug: category });
      if (found) {
        filter.category = found._id;
      } else {
        // 3b. Danh mục không tồn tại: ép 0 kết quả (không gán category: null, vì null = "Chưa phân loại")
        filter._id = { $in: [] };
      }
    }
    if (tag) filter.tags = tag;

    // Chỉ giữ tham số có giá trị khi chuyển trang
    const query = {};
    if (q) query.q = q;
    if (category) query.category = category;
    if (tag) query.tag = tag;

    await renderList(req, res, {
      filter,
      // Có từ khoá thì sắp theo độ khớp, bằng điểm thì mới hơn trước; không có thì mới nhất trước
      sort: q ? { score: { $meta: 'textScore' }, ...NEWEST } : NEWEST,
      projection: q ? { score: { $meta: 'textScore' } } : undefined,
      view: {
        title: q ? `Kết quả cho “${q}”` : 'Kết quả lọc',
        basePath: '/search',
        query,
        q,
        searchForm: true,
        filters: { q, category, tag },
      },
    });
  } catch (err) {
    next(err);
  }
}

// UC03: GET /categories/:slug. Danh mục không tồn tại thì 404
async function byCategory(req, res, next) {
  try {
    const category = await Category.findOne({ slug: req.params.slug.toLowerCase() });
    if (!category) {
      return res.status(404).render('errors/404', { title: 'Không tìm thấy trang' });
    }
    await renderList(req, res, {
      filter: { status: 'published', category: category._id },
      view: { title: `Danh mục: ${category.name}`, basePath: `/categories/${category.slug}` },
    });
  } catch (err) {
    next(err);
  }
}

// UC03: GET /tags/:tag
async function byTag(req, res, next) {
  try {
    const tag = normalizeTag(req.params.tag);
    if (!tag) return res.redirect('/');
    await renderList(req, res, {
      filter: { status: 'published', tags: tag },
      // partial pagination ghép basePath trực tiếp nên phải mã hoá tag
      view: { title: `Tag: ${tag}`, basePath: `/tags/${encodeURIComponent(tag)}` },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { search, byCategory, byTag, normalizeQuery, normalizeTag };
