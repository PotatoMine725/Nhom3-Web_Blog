const Post = require('../models/Post');

const PAGE_SIZE = 10;

// Trường lặp trong form (a=1&a=2) thành mảng; coi như rỗng để ra lỗi validate thay vì 500
const str = (v) => (typeof v === 'string' ? v : '');

// "NodeJS, backend, nodejs" -> ['nodejs', 'backend']. Không cắt bớt: quá 10 tag để schema báo lỗi
function parseTags(input) {
  const tags = str(input)
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(tags)];
}

// Chỉ đọc 4 field này từ form; author, slug, category không bao giờ lấy từ form
function readForm(body) {
  return {
    title: str(body.title).trim(),
    content: str(body.content).trim(),
    tags: parseTags(body.tags),
    status: body.status === 'published' ? 'published' : 'draft',
  };
}

function renderForm(res, status, { data, errors, action, isEdit }) {
  res.status(status).render('posts/form', {
    title: isEdit ? 'Sửa bài' : 'Viết bài',
    errors,
    action,
    values: { ...data, tags: data.tags.join(', ') },
  });
}

// Trả về mảng message nếu là lỗi người dùng sửa được, null nếu là lỗi khác (ném tiếp)
function validationMessages(err) {
  if (err.name === 'ValidationError') {
    // Bỏ lỗi của slug: tiêu đề rỗng thì hook không sinh slug, lỗi tiêu đề đã đủ
    return Object.values(err.errors)
      .filter((e) => e.path !== 'slug')
      .map((e) => e.message);
  }
  // Hai request cùng tiêu đề cùng lúc va unique index của slug
  if (err.code === 11000 && err.keyPattern && err.keyPattern.slug) {
    return ['Đường dẫn bài bị trùng, bấm Lưu lại lần nữa'];
  }
  return null;
}

function isOwnerOrAdmin(post, user) {
  if (!user) return false;
  return Boolean((post.author && post.author._id.equals(user._id)) || user.role === 'admin');
}

// UC01, BR7
async function index(req, res, next) {
  try {
    let page = parseInt(req.query.page, 10);
    if (!(page >= 1)) page = 1;

    const filter = { status: 'published' };
    // Đếm trước để kẹp page, tránh skip quá lớn làm MongoDB báo lỗi
    const total = await Post.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    page = Math.min(page, totalPages);

    const posts = await Post.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .populate('author', 'username');

    res.render('posts/index', { title: 'Bài viết mới nhất', posts, page, totalPages, basePath: '/' });
  } catch (err) {
    next(err);
  }
}

// UC02, BR5
async function show(req, res, next) {
  try {
    const post = await Post.findOne({ slug: req.params.slug }).populate('author', 'username');
    const canEdit = post ? isOwnerOrAdmin(post, res.locals.currentUser) : false;

    // Bài nháp người khác mở cũng trả 404 để không lộ việc bài tồn tại
    if (!post || (post.status === 'draft' && !canEdit)) {
      return res.status(404).render('errors/404', { title: 'Không tìm thấy trang' });
    }
    res.render('posts/show', { title: post.title, post, canEdit });
  } catch (err) {
    next(err);
  }
}

// UC08
function showNew(req, res) {
  renderForm(res, 200, {
    data: { title: '', content: '', tags: [], status: 'draft' },
    errors: [],
    action: '/posts',
    isEdit: false,
  });
}

// UC08, BR1, BR4
async function create(req, res, next) {
  try {
    const data = readForm(req.body);
    // author lấy từ session, không lấy từ form
    const post = new Post({ ...data, author: res.locals.currentUser._id });
    try {
      await post.save();
    } catch (err) {
      const errors = validationMessages(err);
      if (!errors) throw err;
      return renderForm(res, 400, { data, errors, action: '/posts', isEdit: false });
    }
    req.session.flash = { type: 'success', message: 'Đã tạo bài viết' };
    res.redirect(`/posts/${post.slug}`);
  } catch (err) {
    next(err);
  }
}

// UC09 (req.doc do requireOwnerOrAdmin nạp)
function showEdit(req, res) {
  const post = req.doc;
  renderForm(res, 200, {
    data: { title: post.title, content: post.content, tags: post.tags, status: post.status },
    errors: [],
    action: `/posts/${post.slug}/edit`,
    isEdit: true,
  });
}

// UC09, BR2, BR4
async function update(req, res, next) {
  try {
    const post = req.doc;
    // Giữ slug cũ trước khi save vì hook có thể đổi post.slug trong bộ nhớ dù validate lỗi
    const oldSlug = post.slug;
    const data = readForm(req.body);
    Object.assign(post, data); // không đụng author
    try {
      await post.save();
    } catch (err) {
      const errors = validationMessages(err);
      if (!errors) throw err;
      return renderForm(res, 400, { data, errors, action: `/posts/${oldSlug}/edit`, isEdit: true });
    }
    req.session.flash = { type: 'success', message: 'Đã cập nhật bài viết' };
    res.redirect(`/posts/${post.slug}`);
  } catch (err) {
    next(err);
  }
}

// UC10, BR2
async function remove(req, res, next) {
  try {
    await req.doc.deleteOne();
    // BR6: bước 4 thêm Comment.deleteMany({ post: req.doc._id })
    req.session.flash = { type: 'success', message: 'Đã xoá bài viết' };
    res.redirect('/me/posts');
  } catch (err) {
    next(err);
  }
}

// UC11, BR5
async function mine(req, res, next) {
  try {
    const posts = await Post.find({ author: res.locals.currentUser._id }).sort({ createdAt: -1 });
    res.render('posts/mine', { title: 'Bài của tôi', posts });
  } catch (err) {
    next(err);
  }
}

module.exports = { index, show, showNew, create, showEdit, update, remove, mine };
