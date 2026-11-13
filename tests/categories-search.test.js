// Test danh mục, tag, tìm kiếm (UC03, UC14). Phần đầu không cần MongoDB; phần sau cần MongoDB, không có thì skip.
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const h = require('./helpers');
const Post = require('../src/models/Post');
const Category = require('../src/models/Category');
const { normalizeQuery, normalizeTag } = require('../src/controllers/searchController');

// ---- Hàm thuần, không cần DB ----

test('normalizeQuery: bỏ dấu ", trim, cắt 100 ký tự, mảng/object thành rỗng', () => {
  assert.strictEqual(normalizeQuery('  "node  '), 'node');
  assert.strictEqual(normalizeQuery('""'), '');
  assert.strictEqual(normalizeQuery(['a', 'b']), '');
  assert.strictEqual(normalizeQuery({ $ne: 1 }), '');
  assert.strictEqual(normalizeQuery(undefined), '');
  assert.strictEqual(normalizeQuery('a'.repeat(500)).length, 100);
});

test('normalizeTag: trim + lowercase, mảng thành rỗng', () => {
  assert.strictEqual(normalizeTag('  NodeJS '), 'nodejs');
  assert.strictEqual(normalizeTag(['a']), '');
});

// Render view bằng dữ liệu giả (không DB) để bắt lỗi lúc chạy, vd. đọc biến chưa truyền
const path = require('path');
const ejs = require('ejs');
const viewHelpers = require('../src/utils/viewHelpers');

function render(view, data) {
  const base = { ...viewHelpers, currentUser: null, flash: null, currentPath: '/', categories: [{ _id: 'c1', name: 'Web', slug: 'web' }] };
  return ejs.renderFile(path.join(__dirname, '..', 'src', 'views', view + '.ejs'), { ...base, ...data });
}

const fakePost = {
  _id: 'p1', slug: 'bai-1', title: 'Bài <b>1</b>', content: 'Nội dung', tags: ['node js'], commentCount: 0,
  author: { username: 'an' }, category: { name: 'Web', slug: 'web' }, createdAt: new Date(),
};

test('posts/index chế độ tìm kiếm: form lọc giữ giá trị, không cần biến tab, escape từ khoá', async () => {
  const html = await render('posts/index', {
    title: 'Kết quả cho “<x>”', posts: [], page: 1, totalPages: 1, total: 0, basePath: '/search', query: {},
    q: '<x>', searchForm: true, filters: { q: '<x>', category: 'web', tag: 'nodejs' },
  });
  assert.match(html, /Không tìm thấy bài viết phù hợp/);
  assert.match(html, /<option value="web" selected>/);
  assert.match(html, /value="&lt;x&gt;"/);
  assert.doesNotMatch(html, /post-tabs/);
});

test('posts/index trang danh mục và trang chủ render được; thẻ bài có link danh mục, tag', async () => {
  const cat = await render('posts/index', { title: 'Danh mục: Web', posts: [fakePost], page: 1, totalPages: 1, total: 1, basePath: '/categories/web' });
  assert.match(cat, /class="category-chip" href="\/categories\/web"/);
  assert.match(cat, /href="\/tags\/node%20js"/);
  assert.match(cat, /Bài &lt;b&gt;1&lt;\/b&gt;/);
  const home = await render('posts/index', { title: 'Bài viết', posts: [], page: 1, totalPages: 1, basePath: '/', tab: 'new', query: {} });
  assert.match(home, /post-tabs/);
  assert.match(home, /Chưa có bài nào/);
});

test('admin/categories render được bảng + số bài', async () => {
  const html = await render('admin/categories', {
    title: 'Quản lý danh mục', errors: [], name: '', uncategorizedCount: 2,
    rows: [{ _id: 'c1', name: 'Web', slug: 'web', postCount: 3 }],
    currentUser: { username: 'admin', role: 'admin' },
  });
  assert.match(html, /action="\/admin\/categories\/c1\/edit"/);
  assert.match(html, /action="\/admin\/categories\/c1\/delete"/);
  assert.match(html, /Bài chưa phân loại: 2/);
  assert.match(html, /href="\/admin\/categories">Quản lý danh mục/);
});

// ---- Cần MongoDB ----

let ok = false;
before(async () => {
  ok = await h.startApp();
  // $text cần text index đã được tạo
  if (ok) await Promise.all([Post.init(), Category.init()]);
});
after(async () => { if (ok) { await h.clearDb(); } await h.stopApp(); });
beforeEach(async (t) => {
  if (!ok) return;
  await h.clearDb();
});

function needDb(t) {
  if (!ok) t.skip(`Không kết nối được MongoDB (${h.TEST_URI})`);
  return !ok;
}

let seq = 0;
function makePost(author, fields = {}) {
  seq += 1;
  return new Post({
    title: `Bài viết số ${seq}`,
    content: 'Nội dung bài viết đủ dài để qua validate.',
    status: 'published',
    author: author._id,
    ...fields,
  }).save();
}

async function setupUsers() {
  const member = await h.createUser({ username: 'member', email: 'member@test.local' });
  const admin = await h.createUser({ username: 'admin', email: 'admin@test.local', role: 'admin' });
  return { member, admin };
}

test('UC14: chỉ admin vào /admin/categories; khách và member nhận 403', async (t) => {
  if (needDb(t)) return;
  await setupUsers();
  assert.strictEqual((await h.client().get('/admin/categories')).status, 403);
  assert.strictEqual((await h.client().post('/admin/categories', { name: 'Khách' })).status, 403);
  const member = await h.loginAs('member@test.local');
  assert.strictEqual((await member.get('/admin/categories')).status, 403);
  assert.strictEqual((await member.post('/admin/categories', { name: 'Member' })).status, 403);
  assert.strictEqual(await Category.countDocuments(), 0);
  const admin = await h.loginAs('admin@test.local');
  assert.strictEqual((await admin.get('/admin/categories')).status, 200);
});

test('UC14: thêm danh mục, sinh slug, chặn trùng tên, rỗng, quá 50 ký tự', async (t) => {
  if (needDb(t)) return;
  await setupUsers();
  const admin = await h.loginAs('admin@test.local');

  const res = await admin.post('/admin/categories', { name: '  Lập trình Web  ' });
  assert.strictEqual(res.status, 302);
  const cat = await Category.findOne({ name: 'Lập trình Web' });
  assert.strictEqual(cat.slug, 'lap-trinh-web');

  const dup = await admin.post('/admin/categories', { name: 'Lập trình Web' });
  assert.strictEqual(dup.status, 400);
  assert.match(dup.text, /Tên danh mục đã tồn tại/);

  // Tên khác nhưng cùng slug thì thêm -2
  await admin.post('/admin/categories', { name: 'Lập trình web!' });
  assert.ok(await Category.exists({ slug: 'lap-trinh-web-2' }));

  assert.strictEqual((await admin.post('/admin/categories', { name: '   ' })).status, 400);
  assert.strictEqual((await admin.post('/admin/categories', { name: 'a'.repeat(51) })).status, 400);
  assert.strictEqual(await Category.countDocuments(), 2);

  // Trang danh sách hiện số bài
  const page = await admin.get('/admin/categories');
  assert.match(page.text, /lap-trinh-web/);
});

test('UC14: tên danh mục không phân biệt hoa thường, ký tự đặc biệt so khớp đúng chữ', async (t) => {
  if (needDb(t)) return;
  await setupUsers();
  const admin = await h.loginAs('admin@test.local');
  await admin.post('/admin/categories', { name: 'Lập trình Web' });

  for (const name of ['LẬP TRÌNH WEB', 'lập trình web']) {
    const res = await admin.post('/admin/categories', { name });
    assert.strictEqual(res.status, 400);
    assert.match(res.text, /Tên danh mục đã tồn tại/);
  }

  await admin.post('/admin/categories', { name: 'C++' });
  assert.strictEqual((await admin.post('/admin/categories', { name: 'c++' })).status, 400);
  await admin.post('/admin/categories', { name: 'Node.js' });
  // Dấu "." không được hiểu là ký tự bất kỳ
  assert.strictEqual((await admin.post('/admin/categories', { name: 'Nodexjs' })).status, 302);
  assert.strictEqual(await Category.countDocuments(), 4);

  // Đổi tên trùng (khác hoa thường) với danh mục khác: bị chặn
  const other = await Category.findOne({ name: 'C++' });
  const bad = await admin.post(`/admin/categories/${other._id}/edit`, { name: 'lập trình web' });
  assert.strictEqual(bad.status, 302);
  assert.strictEqual((await Category.findById(other._id)).name, 'C++');

  // Đổi tên chính nó sang cách viết hoa khác: được
  const web = await Category.findOne({ name: 'Lập trình Web' });
  await admin.post(`/admin/categories/${web._id}/edit`, { name: 'LẬP TRÌNH WEB' });
  assert.strictEqual((await Category.findById(web._id)).name, 'LẬP TRÌNH WEB');
});

test('UC14: đổi tên thì đổi slug; id sai 404; member không sửa được', async (t) => {
  if (needDb(t)) return;
  await setupUsers();
  const cat = await new Category({ name: 'Cũ' }).save();
  const member = await h.loginAs('member@test.local');
  assert.strictEqual((await member.post(`/admin/categories/${cat._id}/edit`, { name: 'Hack' })).status, 403);

  const admin = await h.loginAs('admin@test.local');
  const res = await admin.post(`/admin/categories/${cat._id}/edit`, { name: 'Mới tinh' });
  assert.strictEqual(res.status, 302);
  const updated = await Category.findById(cat._id);
  assert.strictEqual(updated.name, 'Mới tinh');
  assert.strictEqual(updated.slug, 'moi-tinh');

  assert.strictEqual((await admin.post('/admin/categories/abc/edit', { name: 'X' })).status, 404);
  // Tên rỗng: không lưu, quay lại trang kèm flash lỗi
  const bad = await admin.post(`/admin/categories/${cat._id}/edit`, { name: '' });
  assert.strictEqual(bad.status, 302);
  assert.strictEqual((await Category.findById(cat._id)).name, 'Mới tinh');
});

test('UC14: xoá danh mục thì bài về Chưa phân loại, không đổi updatedAt', async (t) => {
  if (needDb(t)) return;
  const { member } = await setupUsers();
  const cat = await new Category({ name: 'Xoá tôi' }).save();
  const post = await makePost(member, { category: cat._id });
  const before = post.updatedAt.getTime();

  const m = await h.loginAs('member@test.local');
  assert.strictEqual((await m.post(`/admin/categories/${cat._id}/delete`)).status, 403);

  const admin = await h.loginAs('admin@test.local');
  const res = await admin.post(`/admin/categories/${cat._id}/delete`);
  assert.strictEqual(res.status, 302);
  assert.strictEqual(await Category.countDocuments(), 0);
  const after = await Post.findById(post._id);
  assert.strictEqual(after.category, null);
  assert.strictEqual(after.updatedAt.getTime(), before);
  assert.strictEqual((await admin.post(`/admin/categories/${cat._id}/delete`)).status, 404);
});

test('UC03: /categories/:slug chỉ bài đã đăng của danh mục; không tồn tại thì 404', async (t) => {
  if (needDb(t)) return;
  const { member } = await setupUsers();
  const web = await new Category({ name: 'Web' }).save();
  await makePost(member, { title: 'Bài web đã đăng', category: web._id });
  await makePost(member, { title: 'Bài web bản nháp', category: web._id, status: 'draft' });
  await makePost(member, { title: 'Bài không danh mục' });

  const res = await h.client().get('/categories/web');
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /Bài web đã đăng/);
  assert.doesNotMatch(res.text, /Bài web bản nháp/);
  assert.doesNotMatch(res.text, /Bài không danh mục/);
  // Menu danh mục trên header
  assert.match(res.text, /href="\/categories\/web"/);

  assert.strictEqual((await h.client().get('/categories/khong-co')).status, 404);
});

test('UC03: /tags/:tag không phân biệt hoa thường, không lộ bài nháp', async (t) => {
  if (needDb(t)) return;
  const { member } = await setupUsers();
  await makePost(member, { title: 'Bài có tag nodejs', tags: ['nodejs'] });
  await makePost(member, { title: 'Bài nháp có tag', tags: ['nodejs'], status: 'draft' });
  await makePost(member, { title: 'Bài tag khác', tags: ['python'] });

  const res = await h.client().get('/tags/NodeJS');
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /Bài có tag nodejs/);
  assert.doesNotMatch(res.text, /Bài nháp có tag/);
  assert.doesNotMatch(res.text, /Bài tag khác/);
});

test('UC03: /search kết hợp từ khoá + danh mục + tag; luồng phụ 2a, 3a, 3b', async (t) => {
  if (needDb(t)) return;
  const { member } = await setupUsers();
  const web = await new Category({ name: 'Web' }).save();
  await makePost(member, { title: 'Học Express cơ bản', category: web._id, tags: ['express'] });
  await makePost(member, { title: 'Học Express nâng cao', tags: ['express'] });
  await makePost(member, { title: 'Học Express bản nháp', category: web._id, status: 'draft' });
  await makePost(member, { title: 'Nhập môn Python', category: web._id, tags: ['python'] });
  const c = h.client();

  // 2a
  const empty = await c.get('/search');
  assert.strictEqual(empty.status, 302);
  assert.strictEqual(empty.location, '/');
  assert.strictEqual((await c.get('/search?q=%20%22%20&category=&tag=')).location, '/');

  // Chỉ từ khoá: không có bài nháp (BR5)
  const onlyQ = await c.get('/search?q=express');
  assert.strictEqual(onlyQ.status, 200);
  assert.match(onlyQ.text, /Học Express cơ bản/);
  assert.match(onlyQ.text, /Học Express nâng cao/);
  assert.doesNotMatch(onlyQ.text, /bản nháp/);
  assert.match(onlyQ.text, /2 kết quả/);
  // Form lọc giữ giá trị, ô header giữ q
  assert.match(onlyQ.text, /id="filterQ"[^>]*value="express"/);
  assert.match(onlyQ.text, /id="searchInput"[^>]*value="express"/);

  // Từ khoá + danh mục
  const qCat = await c.get('/search?q=express&category=web');
  assert.match(qCat.text, /Học Express cơ bản/);
  assert.doesNotMatch(qCat.text, /Học Express nâng cao/);
  assert.match(qCat.text, /<option value="web" selected>/);

  // Chỉ danh mục (không từ khoá) + tag
  const catTag = await c.get('/search?category=web&tag=%20Python%20');
  assert.match(catTag.text, /Nhập môn Python/);
  assert.match(catTag.text, /1 kết quả/);

  // 3b: danh mục không tồn tại -> 0 kết quả (không lẫn bài chưa phân loại)
  const noCat = await c.get('/search?q=express&category=khong-co');
  assert.strictEqual(noCat.status, 200);
  assert.match(noCat.text, /Không tìm thấy bài viết phù hợp/);
  assert.match(noCat.text, /0 kết quả/);

  // 3a
  assert.match((await c.get('/search?q=zzzzzz')).text, /Không tìm thấy bài viết phù hợp/);

  // Tham số lặp / object không gây 500
  assert.strictEqual((await c.get('/search?q=a&q=b')).status, 302);
  assert.strictEqual((await c.get('/search?category[$ne]=x')).status, 302);
  assert.strictEqual((await c.get('/search?q=express&tag=a&tag=b')).status, 200);
});

test('UC03: phân trang /search giữ điều kiện lọc, kẹp page', async (t) => {
  if (needDb(t)) return;
  const { member } = await setupUsers();
  const web = await new Category({ name: 'Web' }).save();
  for (let i = 0; i < 11; i++) {
    await makePost(member, { title: `Express phần ${i + 1}`, category: web._id });
  }
  const c = h.client();
  const p1 = await c.get('/search?q=express&category=web');
  assert.match(p1.text, /11 kết quả/);
  assert.match(p1.text, /href="\/search\?q=express&amp;category=web&amp;page=2"/);
  const p2 = await c.get('/search?q=express&category=web&page=99');
  assert.strictEqual(p2.status, 200);
  assert.strictEqual((p2.text.match(/class="post-row"/g) || []).length, 1);
});

test('UC08/UC09: chọn danh mục trong form bài; danh mục sai thì báo lỗi; trang bài hiện danh mục', async (t) => {
  if (needDb(t)) return;
  await setupUsers();
  const web = await new Category({ name: 'Web' }).save();
  const m = await h.loginAs('member@test.local');

  const form = await m.get('/posts/new');
  assert.match(form.text, new RegExp(`<option value="${web._id}"`));

  const content = 'Nội dung bài viết đủ dài để qua validate.';
  const res = await m.post('/posts', { title: 'Bài có danh mục', content, category: String(web._id), status: 'published' });
  assert.strictEqual(res.status, 302);
  const post = await Post.findOne({ title: 'Bài có danh mục' });
  assert.ok(post.category.equals(web._id));

  const show = await m.get(`/posts/${post.slug}`);
  assert.match(show.text, /Danh mục:\s*<a href="\/categories\/web">Web<\/a>/);

  const edit = await m.get(`/posts/${post.slug}/edit`);
  assert.match(edit.text, new RegExp(`<option value="${web._id}" selected>`));

  const bad = await m.post('/posts', { title: 'Bài danh mục sai', content, category: '000000000000000000000000' });
  assert.strictEqual(bad.status, 400);
  assert.match(bad.text, /Danh mục không tồn tại/);
  assert.strictEqual((await m.post('/posts', { title: 'Bài danh mục rác', content, category: 'abc' })).status, 400);

  // Bỏ chọn danh mục khi sửa -> Chưa phân loại
  await m.post(`/posts/${post.slug}/edit`, { title: 'Bài có danh mục', content, category: '', status: 'published' });
  assert.strictEqual((await Post.findById(post._id)).category, null);
});
