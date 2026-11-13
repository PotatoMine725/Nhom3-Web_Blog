const Thread = require('../models/Thread');
const ThreadMember = require('../models/ThreadMember');
const Post = require('../models/Post');
const { PAGE_SIZE, addCommentCounts } = require('./postController');

const NEWEST = { createdAt: -1, _id: -1 };

// Trường lặp trong form (a=1&a=2) thành mảng; coi như rỗng để ra lỗi validate thay vì 500
const str = (v) => (typeof v === 'string' ? v : '');

function notFound(res) {
  return res.status(404).render('errors/404', { title: 'Không tìm thấy trang' });
}

// ?page= hợp lệ, kẹp trong [1, totalPages]
function readPage(query, total) {
  let page = parseInt(query.page, 10);
  if (!(page >= 1)) page = 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return { page: Math.min(page, totalPages), totalPages };
}

// Đếm theo thread bằng aggregation ($match các thread trong trang -> $group theo thread), trả về Map id -> số
async function countByThread(Model, match) {
  const rows = await Model.aggregate([{ $match: match }, { $group: { _id: '$thread', count: { $sum: 1 } } }]);
  return new Map(rows.map((r) => [String(r._id), r.count]));
}

function renderForm(res, status, { values, errors }) {
  res.status(status).render('threads/form', { title: 'Tạo thread', values, errors });
}

// UC21: danh sách thread, mới tạo nhất trước, 10 thread/trang
async function index(req, res, next) {
  try {
    const user = res.locals.currentUser;
    const total = await Thread.countDocuments();
    const { page, totalPages } = readPage(req.query, total);

    // lean() để gắn thêm memberCount, postCount, joined lên object thường
    const threads = await Thread.find()
      .sort(NEWEST)
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .populate('author', 'username')
      .lean();

    const ids = threads.map((t) => t._id);
    const members = await countByThread(ThreadMember, { thread: { $in: ids } });
    // BR14: chỉ đếm bài đã đăng
    const posts = await countByThread(Post, { thread: { $in: ids }, status: 'published' });
    const joinedIds = user ? (await ThreadMember.distinct('thread', { user: user._id })).map(String) : [];
    threads.forEach((t) => {
      t.memberCount = members.get(String(t._id)) || 0;
      t.postCount = posts.get(String(t._id)) || 0;
      t.joined = joinedIds.includes(String(t._id));
    });

    res.render('threads/index', { title: 'Threads', threads, page, totalPages, basePath: '/threads' });
  } catch (err) {
    next(err);
  }
}

// UC23
function showNew(req, res) {
  renderForm(res, 200, { values: { name: '', description: '', tag: '' }, errors: [] });
}

// UC23, BR1, BR12
async function create(req, res, next) {
  try {
    // Chỉ đọc 3 field này từ form; author lấy từ session, slug do hook sinh
    const values = {
      name: str(req.body.name).trim(),
      description: str(req.body.description).trim(),
      tag: str(req.body.tag).trim().toLowerCase(),
    };
    const thread = new Thread({ ...values, author: res.locals.currentUser._id });
    try {
      await thread.save();
    } catch (err) {
      let errors = null;
      if (err.name === 'ValidationError') {
        // Bỏ lỗi của slug: tên rỗng thì hook không sinh slug, lỗi tên đã đủ
        errors = Object.values(err.errors)
          .filter((e) => e.path !== 'slug')
          .map((e) => e.message);
      } else if (err.code === 11000) {
        // Hai request cùng tên cùng lúc va unique index của name / slug
        errors = ['Tên thread đã tồn tại hoặc đang được tạo, thử lại'];
      }
      if (!errors) throw err;
      return renderForm(res, 400, { values, errors });
    }

    // BR12: người tạo tự động là thành viên. Lỗi thì xoá thread vừa tạo (không có transaction)
    try {
      await ThreadMember.create({ user: thread.author, thread: thread._id });
    } catch (err) {
      await Thread.deleteOne({ _id: thread._id });
      throw err;
    }

    req.session.flash = { type: 'success', message: 'Đã tạo thread' };
    res.redirect(`/threads/${thread.slug}`);
  } catch (err) {
    next(err);
  }
}

// UC22, BR5, BR14: ai cũng xem được, chỉ bài đã đăng
async function show(req, res, next) {
  try {
    const user = res.locals.currentUser;
    const thread = await Thread.findOne({ slug: req.params.slug.toLowerCase() }).populate('author', 'username');
    if (!thread) return notFound(res);

    const memberCount = await ThreadMember.countDocuments({ thread: thread._id });
    const isMember = user ? Boolean(await ThreadMember.exists({ thread: thread._id, user: user._id })) : false;
    const isCreator = Boolean(user && thread.author && thread.author._id.equals(user._id));
    const canDelete = Boolean(user && (isCreator || user.role === 'admin'));

    const filter = { thread: thread._id, status: 'published' };
    const total = await Post.countDocuments(filter);
    const { page, totalPages } = readPage(req.query, total);
    // Sắp xếp rồi mới phân trang
    const posts = await Post.find(filter)
      .sort(NEWEST)
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .populate('author', 'username')
      .populate('category', 'name slug')
      .populate('thread', 'name slug')
      .lean();
    await addCommentCounts(posts);

    res.render('threads/show', {
      title: thread.name,
      thread,
      memberCount,
      isMember,
      isCreator,
      canDelete,
      posts,
      page,
      totalPages,
      basePath: `/threads/${thread.slug}`,
    });
  } catch (err) {
    next(err);
  }
}

// UC24: tham gia
async function join(req, res, next) {
  try {
    const thread = await Thread.findOne({ slug: req.params.slug.toLowerCase() });
    if (!thread) return notFound(res);
    try {
      await ThreadMember.create({ user: res.locals.currentUser._id, thread: thread._id });
    } catch (err) {
      // Đã tham gia hoặc bấm 2 lần cùng lúc: unique index chặn, coi như đã tham gia
      if (err.code !== 11000) throw err;
    }
    res.redirect(`/threads/${thread.slug}`);
  } catch (err) {
    next(err);
  }
}

// UC24: rời. Bài đã đăng vẫn ở lại trong thread (BR12)
async function leave(req, res, next) {
  try {
    const thread = await Thread.findOne({ slug: req.params.slug.toLowerCase() });
    if (!thread) return notFound(res);
    const userId = res.locals.currentUser._id;
    if (thread.author.equals(userId)) {
      req.session.flash = { type: 'danger', message: 'Người tạo không thể rời thread' };
    } else {
      // Chưa tham gia thì deleteOne không xoá gì
      await ThreadMember.deleteOne({ thread: thread._id, user: userId });
    }
    res.redirect(`/threads/${thread.slug}`);
  } catch (err) {
    next(err);
  }
}

// UC25, BR13 (req.doc do requireOwnerOrAdmin nạp)
async function remove(req, res, next) {
  try {
    const thread = req.doc;
    await ThreadMember.deleteMany({ thread: thread._id });
    // Bài không bị xoá, chỉ về "không thuộc thread"; timestamps: false để không đổi updatedAt
    await Post.updateMany({ thread: thread._id }, { thread: null }, { timestamps: false });
    await thread.deleteOne();
    req.session.flash = { type: 'success', message: 'Đã xoá thread' };
    res.redirect('/threads');
  } catch (err) {
    next(err);
  }
}

module.exports = { index, showNew, create, show, join, leave, remove };
