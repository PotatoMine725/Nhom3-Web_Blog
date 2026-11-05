// Like, lưu bài, lượt xem, bài nổi bật (UC17, UC18, UC19, BR6, BR9, BR10). Cần MongoDB, không có thì skip.
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const h = require('./helpers');
const Post = require('../src/models/Post');
const Comment = require('../src/models/Comment');
const Like = require('../src/models/Like');
const Bookmark = require('../src/models/Bookmark');

let ok = false;
before(async () => {
  ok = await h.startApp();
  // Tạo sẵn unique index để test bấm trùng (deleteMany không xoá index)
  if (ok) await Promise.all([Like.init(), Bookmark.init()]);
});
after(async () => { if (ok) { await h.clearDb(); } await h.stopApp(); });
beforeEach(async (t) => {
  if (!ok) return t.skip('Không kết nối được MongoDB test');
  await h.clearDb();
});

const CONTENT = 'Nội dung bài viết đủ dài để qua validate.';

function makePost(author, title, extra = {}) {
  return Post.create({ title, content: CONTENT, status: 'published', author: author._id, ...extra });
}

// Hai thành viên: an (tác giả), binh (người đọc), cùng một bài đã đăng của an
async function setup() {
  const an = await h.createUser({ username: 'an_test', email: 'an@test.local' });
  const binh = await h.createUser({ username: 'binh_test', email: 'binh@test.local' });
  const post = await makePost(an, 'Bài viết của An');
  return { an, binh, post };
}

test('khách POST like / bookmark và mở /me/bookmarks bị chuyển về /login', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  const { post } = await setup();
  const c = h.client();
  for (const path of [`/posts/${post.slug}/like`, `/posts/${post.slug}/bookmark`]) {
    const res = await c.post(path);
    assert.strictEqual(res.status, 302);
    assert.strictEqual(res.location, '/login');
  }
  assert.strictEqual((await c.get('/me/bookmarks')).location, '/login');
  assert.strictEqual(await Like.countDocuments(), 0);
  // Khách thấy link đăng nhập thay cho nút
  const page = await c.get(`/posts/${post.slug}`);
  assert.match(page.text, /href="\/login"[^>]*>Thích \(0\)/);
});

test('like rồi bấm lần nữa là bỏ like (UC17, BR9)', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  const { binh, post } = await setup();
  const c = await h.loginAs('binh@test.local');

  const first = await c.post(`/posts/${post.slug}/like`, { user: String(post.author) });
  assert.strictEqual(first.status, 302);
  assert.strictEqual(first.location, `/posts/${post.slug}`);
  const likes = await Like.find();
  assert.strictEqual(likes.length, 1);
  // user lấy từ session, không lấy từ form
  assert.ok(likes[0].user.equals(binh._id));
  assert.ok(likes[0].createdAt);
  assert.strictEqual(likes[0].updatedAt, undefined);

  const page = await c.get(`/posts/${post.slug}`);
  assert.match(page.text, /Bỏ thích \(1\)/);

  await c.post(`/posts/${post.slug}/like`);
  assert.strictEqual(await Like.countDocuments(), 0);
  assert.match((await c.get(`/posts/${post.slug}`)).text, />Thích \(0\)/);
});

test('bấm like 2 lần cùng lúc vẫn chỉ có tối đa 1 Like, không lỗi 500', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  const { post } = await setup();
  const c = await h.loginAs('binh@test.local');
  const [r1, r2] = await Promise.all([c.post(`/posts/${post.slug}/like`), c.post(`/posts/${post.slug}/like`)]);
  assert.strictEqual(r1.status, 302);
  assert.strictEqual(r2.status, 302);
  assert.ok((await Like.countDocuments()) <= 1);
});

test('like / bookmark bài nháp hoặc không tồn tại trả 404', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  const { an } = await setup();
  const draft = await makePost(an, 'Bài nháp của An', { status: 'draft' });
  // Kể cả tác giả cũng không like được bài nháp
  const c = await h.loginAs('an@test.local');
  for (const slug of [draft.slug, 'khong-ton-tai']) {
    assert.strictEqual((await c.post(`/posts/${slug}/like`)).status, 404);
    assert.strictEqual((await c.post(`/posts/${slug}/bookmark`)).status, 404);
  }
  assert.strictEqual(await Like.countDocuments(), 0);
  assert.strictEqual(await Bookmark.countDocuments(), 0);
});

test('lưu / bỏ lưu và trang /me/bookmarks chỉ hiện bài còn published, mới lưu trước (UC18)', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  const { an, post } = await setup();
  const second = await makePost(an, 'Bài thứ hai của An');
  const c = await h.loginAs('binh@test.local');

  assert.match((await c.get('/me/bookmarks')).text, /Bạn chưa lưu bài nào/);

  await c.post(`/posts/${post.slug}/bookmark`);
  await c.post(`/posts/${second.slug}/bookmark`);
  assert.match((await c.get(`/posts/${post.slug}`)).text, />Bỏ lưu</);

  let text = (await c.get('/me/bookmarks')).text;
  assert.ok(text.indexOf('Bài thứ hai của An') < text.indexOf('Bài viết của An'), 'mới lưu nhất trước');

  // Bài về nháp: bookmark giữ nguyên nhưng ẩn khỏi trang (BR9)
  await Post.updateOne({ _id: post._id }, { status: 'draft' });
  text = (await c.get('/me/bookmarks')).text;
  assert.ok(!text.includes('Bài viết của An'));
  assert.strictEqual(await Bookmark.countDocuments(), 2);

  // Bỏ lưu
  await c.post(`/posts/${second.slug}/bookmark`);
  assert.strictEqual(await Bookmark.countDocuments(), 1);

  // Người khác không thấy bookmark của binh
  await h.createUser({ username: 'cuong_test', email: 'cuong@test.local' });
  const other = await h.loginAs('cuong@test.local');
  assert.match((await other.get('/me/bookmarks')).text, /Bạn chưa lưu bài nào/);
});

test('/me/bookmarks phân trang 10 bài/trang', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  const { an, binh } = await setup();
  for (let i = 1; i <= 11; i++) {
    const p = await makePost(an, `Bài số ${String(i).padStart(2, '0')} để lưu`);
    // Tạo lần lượt: cùng mili giây thì _id (tăng dần) quyết định thứ tự
    await Bookmark.create({ user: binh._id, post: p._id });
  }
  const c = await h.loginAs('binh@test.local');
  const page1 = (await c.get('/me/bookmarks')).text;
  assert.ok(page1.includes('Bài số 11 để lưu'));
  assert.ok(!page1.includes('Bài số 01 để lưu'));
  assert.ok(page1.includes('/me/bookmarks?page=2'));
  const page2 = (await c.get('/me/bookmarks?page=2')).text;
  assert.ok(page2.includes('Bài số 01 để lưu'));
  // page lớn quá thì kẹp về trang cuối, không lỗi
  assert.strictEqual((await c.get('/me/bookmarks?page=99')).status, 200);
});

test('lượt xem tăng khi người khác mở, không tăng khi tác giả mở, không đổi updatedAt (BR10)', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  const { post } = await setup();
  const updatedAt = post.updatedAt.getTime();

  const guest = await h.client().get(`/posts/${post.slug}`);
  assert.match(guest.text, /1 lượt xem/);
  const binh = await h.loginAs('binh@test.local');
  await binh.get(`/posts/${post.slug}`);
  const author = await h.loginAs('an@test.local');
  const authorPage = await author.get(`/posts/${post.slug}`);
  assert.match(authorPage.text, /2 lượt xem/);

  const fresh = await Post.findById(post._id);
  assert.strictEqual(fresh.views, 2);
  assert.strictEqual(fresh.updatedAt.getTime(), updatedAt);
});

test('bài nháp không tăng lượt xem; views trong form bị bỏ qua', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  const { an } = await setup();
  const draft = await makePost(an, 'Bài nháp xem thử', { status: 'draft' });
  await h.createUser({ username: 'admin_test', email: 'admin@test.local', role: 'admin' });
  const admin = await h.loginAs('admin@test.local');
  assert.strictEqual((await admin.get(`/posts/${draft.slug}`)).status, 200);
  assert.strictEqual((await Post.findById(draft._id)).views, 0);

  const c = await h.loginAs('an@test.local');
  await c.post('/posts', { title: 'Bài có views giả', content: CONTENT, status: 'published', views: '999' });
  assert.strictEqual((await Post.findOne({ title: 'Bài có views giả' })).views, 0);
});

test('/popular: 10 bài published nhiều lượt xem nhất, không có bài nháp (UC19)', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  const { an } = await setup(); // "Bài viết của An" có 0 lượt xem
  for (let i = 1; i <= 11; i++) {
    await makePost(an, `Bài nổi bật số ${String(i).padStart(2, '0')}`, { views: i * 10 });
  }
  await makePost(an, 'Bài nháp rất nhiều lượt xem', { status: 'draft', views: 9999 });

  const res = await h.client().get('/popular');
  assert.strictEqual(res.status, 200);
  assert.ok(!res.text.includes('Bài nháp rất nhiều lượt xem'));
  assert.ok(!res.text.includes('Bài viết của An'));
  assert.ok(!res.text.includes('Bài nổi bật số 01'), 'chỉ lấy 10 bài');
  assert.ok(res.text.indexOf('Bài nổi bật số 11') < res.text.indexOf('Bài nổi bật số 10'));
  assert.ok(!res.text.includes('aria-label="Phân trang"'));
});

test('xoá bài thì xoá cả bình luận, like, bookmark của bài; bài khác giữ nguyên (BR6)', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  const { an, binh, post } = await setup();
  const other = await makePost(an, 'Bài khác của An');
  for (const p of [post, other]) {
    await Like.create({ user: binh._id, post: p._id });
    await Bookmark.create({ user: binh._id, post: p._id });
    await Comment.create({ content: 'Hay', post: p._id, author: binh._id });
  }
  const c = await h.loginAs('an@test.local');
  const res = await c.post(`/posts/${post.slug}/delete`);
  assert.strictEqual(res.status, 302);
  for (const Model of [Like, Bookmark, Comment]) {
    assert.strictEqual(await Model.countDocuments({ post: post._id }), 0);
    assert.strictEqual(await Model.countDocuments({ post: other._id }), 1);
  }
});
