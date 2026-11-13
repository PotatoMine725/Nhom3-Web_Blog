// Thread theo chủ đề (UC21–UC25, phần chọn thread của UC08, UC09, BR12–BR14). Cần MongoDB, không có thì skip.
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const h = require('./helpers');
const Post = require('../src/models/Post');
const Thread = require('../src/models/Thread');
const ThreadMember = require('../src/models/ThreadMember');

let ok = false;
before(async () => {
  ok = await h.startApp();
  // Tạo sẵn index (unique của ThreadMember, text index của Post cho /search); deleteMany không xoá index
  if (ok) await Promise.all([Thread.init(), ThreadMember.init(), Post.init()]);
});
after(async () => { if (ok) { await h.clearDb(); } await h.stopApp(); });
beforeEach(async (t) => {
  if (!ok) return t.skip('Không kết nối được MongoDB test');
  await h.clearDb();
});

const CONTENT = 'Nội dung bài viết đủ dài để qua validate.';

// Tạo thread thẳng trong DB, người tạo là thành viên (giống UC23)
async function makeThread(author, name, extra = {}) {
  const thread = await Thread.create({ name, author: author._id, ...extra });
  await ThreadMember.create({ user: author._id, thread: thread._id });
  return thread;
}

function makePost(author, title, extra = {}) {
  return Post.create({ title, content: CONTENT, status: 'published', author: author._id, ...extra });
}

// an: người tạo thread "Node.js"; binh: thành viên khác (chưa tham gia)
async function setup() {
  const an = await h.createUser({ username: 'an_test', email: 'an@test.local' });
  const binh = await h.createUser({ username: 'binh_test', email: 'binh@test.local' });
  const thread = await makeThread(an, 'Node.js');
  return { an, binh, thread };
}

// Đoạn HTML của một thẻ thread trong /threads (từ tên tới hết thẻ article)
function threadCard(text, name) {
  const start = text.indexOf(`>${name}<`);
  assert.ok(start >= 0, `không thấy thread ${name}`);
  return text.slice(start, text.indexOf('</article>', start));
}

test('#1 khách mở form, tạo / tham gia / rời / xoá thread bị chuyển về /login', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  const { thread } = await setup();
  const c = h.client();
  assert.strictEqual((await c.get('/threads/new')).location, '/login');
  const posts = [
    ['/threads', { name: 'Thread của khách' }],
    [`/threads/${thread.slug}/join`, {}],
    [`/threads/${thread.slug}/leave`, {}],
    [`/threads/${thread.slug}/delete`, {}],
  ];
  for (const [path, form] of posts) {
    const res = await c.post(path, form);
    assert.strictEqual(res.status, 302, path);
    assert.strictEqual(res.location, '/login', path);
  }
  assert.strictEqual(await Thread.countDocuments(), 1);
  assert.strictEqual(await ThreadMember.countDocuments(), 1);
  // Khách vẫn xem được danh sách và trang thread (UC21, UC22)
  assert.strictEqual((await c.get('/threads')).status, 200);
  const page = await c.get(`/threads/${thread.slug}`);
  assert.strictEqual(page.status, 200);
  assert.match(page.text, /Đăng nhập để tham gia/);
});

test('#2 thành viên tạo thread: author từ session, tag lowercase, người tạo là thành viên (UC23)', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  const binh = await h.createUser({ username: 'binh_test', email: 'binh@test.local' });
  const other = await h.createUser({ username: 'other_test', email: 'other@test.local' });
  const c = await h.loginAs('binh@test.local');

  const form = await c.get('/threads/new');
  assert.strictEqual(form.status, 200);
  assert.match(form.text, /action="\/threads"/);

  const res = await c.post('/threads', { name: '  Node.js  ', tag: ' NodeJS ', description: 'Bàn về Node', author: String(other._id) });
  const thread = await Thread.findOne();
  assert.strictEqual(res.status, 302);
  assert.strictEqual(res.location, `/threads/${thread.slug}`);
  assert.strictEqual(thread.name, 'Node.js');
  assert.strictEqual(thread.slug, 'node-js');
  assert.strictEqual(thread.tag, 'nodejs');
  assert.ok(thread.author.equals(binh._id), 'author lấy từ session, không lấy từ form');

  const members = await ThreadMember.find();
  assert.strictEqual(members.length, 1);
  assert.ok(members[0].user.equals(binh._id));
  assert.strictEqual(members[0].updatedAt, undefined);

  const page = await c.get(res.location);
  assert.match(page.text, /Đã tạo thread/);
  assert.match(page.text, /1 thành viên/);
  // Người tạo không có nút rời
  assert.ok(!page.text.includes('Rời thread'));
});

test('#3 tên rỗng, quá ngắn, quá dài, trùng tên khác hoa thường: 400, không tạo thread', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  await setup();
  const c = await h.loginAs('binh@test.local');
  const cases = [
    ['', /Tên thread là bắt buộc/],
    ['ab', /Tên thread từ 3 đến 50 ký tự/],
    ['a'.repeat(51), /Tên thread từ 3 đến 50 ký tự/],
    ['node.js', /Tên thread đã tồn tại/],
    ['NODE.JS', /Tên thread đã tồn tại/],
  ];
  for (const [name, message] of cases) {
    const res = await c.post('/threads', { name, description: 'Mô tả giữ lại' });
    assert.strictEqual(res.status, 400, `tên "${name}"`);
    assert.match(res.text, message);
    // Form hiện lại giá trị đã nhập
    assert.match(res.text, /Mô tả giữ lại/);
  }
  assert.strictEqual(await Thread.countDocuments(), 1);
  assert.strictEqual(await ThreadMember.countDocuments(), 1);
});

test('#4 thread tên "New" có slug khác new, /threads/new vẫn là form', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  await h.createUser({ username: 'binh_test', email: 'binh@test.local' });
  const c = await h.loginAs('binh@test.local');
  const res = await c.post('/threads', { name: 'New' });
  const thread = await Thread.findOne();
  assert.strictEqual(thread.slug, 'new-2');
  assert.strictEqual(res.location, '/threads/new-2');
  const form = await c.get('/threads/new');
  assert.strictEqual(form.status, 200);
  assert.match(form.text, /action="\/threads"/);
  assert.strictEqual((await c.get('/threads/new-2')).status, 200);
});

test('#5 tham gia, bấm lần 2 và 2 request cùng lúc chỉ có 1 ThreadMember (UC24, BR12)', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  const { binh, thread } = await setup();
  const c = await h.loginAs('binh@test.local');

  const [r1, r2] = await Promise.all([c.post(`/threads/${thread.slug}/join`), c.post(`/threads/${thread.slug}/join`)]);
  assert.strictEqual(r1.status, 302);
  assert.strictEqual(r2.status, 302);
  const again = await c.post(`/threads/${thread.slug}/join`);
  assert.strictEqual(again.location, `/threads/${thread.slug}`);

  assert.strictEqual(await ThreadMember.countDocuments({ user: binh._id }), 1);
  assert.strictEqual(await ThreadMember.countDocuments({ thread: thread._id }), 2);
  const page = await c.get(`/threads/${thread.slug}`);
  assert.match(page.text, /2 thành viên/);
  assert.match(page.text, /Rời thread/);
  assert.match(page.text, /Viết bài trong thread/);
});

test('#6 người tạo bấm rời: báo lỗi, vẫn là thành viên', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  const { thread } = await setup();
  const c = await h.loginAs('an@test.local');
  const res = await c.post(`/threads/${thread.slug}/leave`);
  assert.strictEqual(res.location, `/threads/${thread.slug}`);
  assert.match((await c.get(res.location)).text, /Người tạo không thể rời thread/);
  assert.strictEqual(await ThreadMember.countDocuments(), 1);
});

test('#7 rời thread thì bài đã đăng vẫn ở lại trong thread (BR12)', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  const { binh, thread } = await setup();
  await ThreadMember.create({ user: binh._id, thread: thread._id });
  const post = await makePost(binh, 'Bài của Bình trong thread', { thread: thread._id });
  const c = await h.loginAs('binh@test.local');

  const res = await c.post(`/threads/${thread.slug}/leave`);
  assert.strictEqual(res.location, `/threads/${thread.slug}`);
  assert.strictEqual(await ThreadMember.countDocuments({ user: binh._id }), 0);
  assert.ok((await Post.findById(post._id)).thread.equals(thread._id));
  // Chưa tham gia mà bấm rời: không làm gì
  assert.strictEqual((await c.post(`/threads/${thread.slug}/leave`)).status, 302);
  assert.strictEqual(await ThreadMember.countDocuments(), 1);
});

test('#8 chưa tham gia, id sai, thread không tồn tại: 400 "Bạn chưa tham gia thread này"', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  const { thread } = await setup();
  const c = await h.loginAs('binh@test.local');
  for (const value of [String(thread._id), 'abc', '000000000000000000000000']) {
    const res = await c.post('/posts', { title: 'Bài muốn vào thread', content: CONTENT, status: 'published', thread: value });
    assert.strictEqual(res.status, 400, `thread = ${value}`);
    assert.match(res.text, /Bạn chưa tham gia thread này/);
    // Form hiện lại, ô thread về "Không thuộc thread"
    assert.match(res.text, /Bài muốn vào thread/);
  }
  assert.strictEqual(await Post.countDocuments(), 0);
});

test('#9 thành viên đăng bài vào thread: hiện ở trang thread, trang chủ, search, tag kèm nhãn (UC08, BR14)', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  const { binh, thread } = await setup();
  await ThreadMember.create({ user: binh._id, thread: thread._id });
  const c = await h.loginAs('binh@test.local');

  const res = await c.post('/posts', {
    title: 'Hướng dẫn express router',
    content: CONTENT,
    status: 'published',
    tags: 'express',
    thread: String(thread._id),
  });
  assert.strictEqual(res.status, 302);
  const post = await Post.findOne();
  assert.ok(post.thread.equals(thread._id));

  const label = new RegExp(`href="/threads/${thread.slug}"[^>]*>Thread: Node\\.js<`);
  // Lưu bài để kiểm cả /me/bookmarks (reactionController.bookmarks populate thread)
  await c.post(`/posts/${post.slug}/bookmark`);
  const paths = ['/', '/popular', '/me/bookmarks', `/threads/${thread.slug}`, '/search?q=router', '/tags/express', `/posts/${post.slug}`];
  for (const path of paths) {
    const page = await c.get(path);
    assert.strictEqual(page.status, 200, path);
    assert.match(page.text, /Hướng dẫn express router/, path);
    assert.match(page.text, label, `nhãn thread ở ${path}`);
  }
  // Bài không thuộc thread thì không có nhãn
  await makePost(binh, 'Bài ngoài thread nào');
  const home = (await c.get('/')).text;
  const card = home.slice(home.indexOf('Bài ngoài thread nào'), home.indexOf('</article>', home.indexOf('Bài ngoài thread nào')));
  assert.ok(!card.includes('Thread:'));
});

test('#10 rời thread vẫn sửa được bài giữ nguyên thread; đổi sang thread chưa tham gia thì 400 (UC09)', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  const { an, binh, thread } = await setup();
  const other = await makeThread(an, 'Thread khác');
  await ThreadMember.create({ user: binh._id, thread: thread._id });
  const post = await makePost(binh, 'Bài trong thread của Bình', { thread: thread._id });
  await ThreadMember.deleteOne({ user: binh._id, thread: thread._id });
  const c = await h.loginAs('binh@test.local');

  // Form sửa vẫn có thread hiện tại (đã rời) và chọn sẵn
  const form = await c.get(`/posts/${post.slug}/edit`);
  assert.match(form.text, new RegExp(`value="${thread._id}" selected`));
  assert.ok(!form.text.includes(`value="${other._id}"`));

  const keep = await c.post(`/posts/${post.slug}/edit`, {
    title: 'Bài trong thread đã sửa', content: CONTENT, status: 'published', thread: String(thread._id),
  });
  assert.strictEqual(keep.status, 302);
  let saved = await Post.findById(post._id);
  assert.strictEqual(saved.title, 'Bài trong thread đã sửa');
  assert.ok(saved.thread.equals(thread._id));

  const change = await c.post(`/posts/${saved.slug}/edit`, {
    title: 'Bài đổi sang thread khác', content: CONTENT, status: 'published', thread: String(other._id),
  });
  assert.strictEqual(change.status, 400);
  assert.match(change.text, /Bạn chưa tham gia thread này/);
  saved = await Post.findById(post._id);
  assert.ok(saved.thread.equals(thread._id));
  assert.strictEqual(saved.title, 'Bài trong thread đã sửa');

  // Bỏ thread ("Không thuộc thread") luôn được
  await c.post(`/posts/${saved.slug}/edit`, { title: saved.title, content: CONTENT, status: 'published', thread: '' });
  assert.strictEqual((await Post.findById(post._id)).thread, null);
});

test('#11 admin sửa bài trong thread mà admin chưa tham gia: kiểm theo tác giả bài', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  const { an, binh, thread } = await setup();
  await h.createUser({ username: 'admin_test', email: 'admin@test.local', role: 'admin' });
  const binhThread = await makeThread(binh, 'Thread của Bình');
  const anOnly = await makeThread(an, 'Thread chỉ An');
  await ThreadMember.create({ user: binh._id, thread: thread._id });
  const post = await makePost(binh, 'Bài của Bình để admin sửa', { thread: thread._id });
  const admin = await h.loginAs('admin@test.local');

  // Form sửa liệt kê thread của tác giả bài, không phải của admin
  const form = await admin.get(`/posts/${post.slug}/edit`);
  assert.match(form.text, new RegExp(`value="${binhThread._id}"`));
  assert.ok(!form.text.includes(`value="${anOnly._id}"`));

  const keep = await admin.post(`/posts/${post.slug}/edit`, {
    title: 'Admin sửa giữ thread', content: CONTENT, status: 'published', thread: String(thread._id),
  });
  assert.strictEqual(keep.status, 302);
  let saved = await Post.findById(post._id);
  assert.ok(saved.thread.equals(thread._id));
  assert.ok(saved.author.equals(binh._id));

  // Đổi sang thread tác giả đã tham gia: được; thread tác giả chưa tham gia: 400
  assert.strictEqual((await admin.post(`/posts/${saved.slug}/edit`, {
    title: 'Admin đổi thread', content: CONTENT, status: 'published', thread: String(binhThread._id),
  })).status, 302);
  saved = await Post.findById(post._id);
  assert.ok(saved.thread.equals(binhThread._id));
  assert.strictEqual((await admin.post(`/posts/${saved.slug}/edit`, {
    title: 'Admin đổi thread lỗi', content: CONTENT, status: 'published', thread: String(anOnly._id),
  })).status, 400);
});

test('#12 bài nháp trong thread không hiện ở trang thread, không tính vào số bài (BR5, BR14)', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  const { an, thread } = await setup();
  await makePost(an, 'Bài đã đăng trong thread', { thread: thread._id });
  await makePost(an, 'Bài nháp trong thread', { thread: thread._id, status: 'draft' });
  // Tác giả đang đăng nhập cũng không thấy nháp ở trang thread
  for (const c of [h.client(), await h.loginAs('an@test.local')]) {
    const page = (await c.get(`/threads/${thread.slug}`)).text;
    assert.match(page, /Bài đã đăng trong thread/);
    assert.ok(!page.includes('Bài nháp trong thread'));
    assert.match(threadCard((await c.get('/threads')).text, 'Node.js'), /1 bài/);
  }
});

test('#13 /posts/new?thread=<slug> chọn sẵn thread khi đã tham gia, bỏ qua khi chưa', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  const { binh, thread } = await setup();
  const c = await h.loginAs('binh@test.local');

  let form = await c.get(`/posts/new?thread=${thread.slug}`);
  assert.strictEqual(form.status, 200);
  assert.ok(!form.text.includes(`value="${thread._id}"`), 'chưa tham gia: không có trong danh sách');

  await ThreadMember.create({ user: binh._id, thread: thread._id });
  form = await c.get(`/posts/new?thread=${thread.slug}`);
  assert.match(form.text, new RegExp(`value="${thread._id}" selected`));
  // Không có tham số: có option nhưng không chọn sẵn; slug lạ: bỏ qua
  for (const path of ['/posts/new', '/posts/new?thread=khong-co']) {
    const text = (await c.get(path)).text;
    assert.match(text, new RegExp(`value="${thread._id}" >`));
  }
});

test('#14 /threads phân trang 10 thread, mới nhất trước, đúng số thành viên, số bài, nhãn đã tham gia (UC21)', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  const an = await h.createUser({ username: 'an_test', email: 'an@test.local' });
  const binh = await h.createUser({ username: 'binh_test', email: 'binh@test.local' });
  const threads = [];
  for (let i = 1; i <= 11; i++) threads.push(await makeThread(an, `Chủ đề A${String(i).padStart(2, '0')}`));
  const newest = threads[10];
  await ThreadMember.create({ user: binh._id, thread: newest._id });
  await makePost(an, 'Bài một trong A11', { thread: newest._id });
  await makePost(binh, 'Bài hai trong A11', { thread: newest._id });
  await makePost(an, 'Bài nháp trong A11', { thread: newest._id, status: 'draft' });

  const c = await h.loginAs('binh@test.local');
  const page1 = (await c.get('/threads')).text;
  assert.ok(page1.indexOf('>Chủ đề A11<') < page1.indexOf('>Chủ đề A10<'), 'mới nhất trước');
  assert.ok(!page1.includes('>Chủ đề A01<'));
  assert.strictEqual((page1.match(/class="post-row"/g) || []).length, 10);
  assert.match(page1, /href="\/threads\?page=2"/);

  const card = threadCard(page1, 'Chủ đề A11');
  assert.match(card, /2 thành viên/);
  assert.match(card, /2 bài/);
  assert.match(card, /Đã tham gia/);
  assert.match(threadCard(page1, 'Chủ đề A10'), /1 thành viên[\s\S]*0 bài/);
  assert.strictEqual((page1.match(/Đã tham gia/g) || []).length, 1);

  const page2 = (await c.get('/threads?page=2')).text;
  assert.match(page2, />Chủ đề A01</);
  assert.strictEqual((page2.match(/class="post-row"/g) || []).length, 1);

  // Không có thread nào
  await h.clearDb();
  assert.match((await h.client().get('/threads')).text, /Chưa có thread nào/);
});

test('#15 thành viên khác người tạo xoá thread: 403, thread còn', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  const { binh, thread } = await setup();
  await ThreadMember.create({ user: binh._id, thread: thread._id });
  const c = await h.loginAs('binh@test.local');
  assert.ok(!(await c.get(`/threads/${thread.slug}`)).text.includes('Xoá thread'));
  assert.strictEqual((await c.post(`/threads/${thread.slug}/delete`)).status, 403);
  assert.strictEqual(await Thread.countDocuments(), 1);
  assert.strictEqual(await ThreadMember.countDocuments(), 2);
});

test('#16 người tạo và admin xoá thread: mất thread + thành viên, bài còn, thread = null, updatedAt giữ nguyên (UC25, BR13)', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  const { an, binh, thread } = await setup();
  await h.createUser({ username: 'admin_test', email: 'admin@test.local', role: 'admin' });
  const second = await makeThread(binh, 'Thread của Bình');
  await ThreadMember.create({ user: binh._id, thread: thread._id });
  const p1 = await makePost(binh, 'Bài trong thread sắp xoá', { thread: thread._id });
  const p2 = await makePost(an, 'Bài trong thread của Bình', { thread: second._id });

  const cases = [
    [await h.loginAs('an@test.local'), thread, p1],
    [await h.loginAs('admin@test.local'), second, p2],
  ];
  for (const [c, th, post] of cases) {
    assert.match((await c.get(`/threads/${th.slug}`)).text, /Xoá thread/);
    const res = await c.post(`/threads/${th.slug}/delete`);
    assert.strictEqual(res.status, 302);
    assert.strictEqual(res.location, '/threads');
    assert.strictEqual(await Thread.countDocuments({ _id: th._id }), 0);
    assert.strictEqual(await ThreadMember.countDocuments({ thread: th._id }), 0);
    const saved = await Post.findById(post._id);
    assert.ok(saved, 'bài không bị xoá');
    assert.strictEqual(saved.thread, null);
    assert.strictEqual(saved.updatedAt.getTime(), post.updatedAt.getTime());
    assert.match((await c.get('/threads')).text, /Đã xoá thread/);
  }
  // Trang bài không còn nhãn thread
  assert.ok(!(await h.client().get(`/posts/${p1.slug}`)).text.includes('Thread:'));
});

test('#17 thread không tồn tại: 404 ở trang thread, tham gia, rời, xoá', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  await setup();
  assert.strictEqual((await h.client().get('/threads/khong-co')).status, 404);
  const c = await h.loginAs('binh@test.local');
  for (const action of ['join', 'leave', 'delete']) {
    assert.strictEqual((await c.post(`/threads/khong-co/${action}`)).status, 404, action);
  }
  assert.strictEqual(await ThreadMember.countDocuments(), 1);
});
