// Test trang admin (UC15, UC16) và hồ sơ (UC07). Cần MongoDB, không có thì skip.
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const h = require('./helpers');
const User = require('../src/models/User');
const Post = require('../src/models/Post');
const Comment = require('../src/models/Comment');

let ok = false;
before(async () => { ok = await h.startApp(); });
after(async () => { if (ok) { await h.clearDb(); } await h.stopApp(); });
beforeEach(async (t) => {
  if (!ok) return t.skip(`Không kết nối được MongoDB (${h.TEST_URI})`);
  await h.clearDb();
});

// Tạo 1 admin + 1 member, trả về client đã đăng nhập
async function setup() {
  const admin = await h.createUser({ username: 'quantri', email: 'admin@test.local', role: 'admin' });
  const member = await h.createUser({ username: 'an', email: 'an@test.local' });
  return {
    admin,
    member,
    adminC: await h.loginAs('admin@test.local'),
    memberC: await h.loginAs('an@test.local'),
  };
}

function newPost(author, title, status = 'published') {
  return new Post({ title, content: 'Nội dung đủ dài để qua validate của schema.', status, author: author._id }).save();
}

// ---------- UC15 ----------

test('khách và member bị 403 ở mọi route admin', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  const { member, memberC } = await setup();
  for (const c of [h.client(), memberC]) {
    assert.strictEqual((await c.get('/admin/users')).status, 403);
    assert.strictEqual((await c.get('/admin/posts')).status, 403);
    assert.strictEqual((await c.post(`/admin/users/${member._id}/lock`)).status, 403);
    assert.strictEqual((await c.post(`/admin/users/${member._id}/role`)).status, 403);
  }
  const fresh = await User.findById(member._id);
  assert.strictEqual(fresh.isLocked, false);
  assert.strictEqual(fresh.role, 'member');
});

test('admin xem danh sách người dùng', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  const { adminC } = await setup();
  const res = await adminC.get('/admin/users');
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /an@test\.local/);
  assert.match(res.text, /admin@test\.local/);
});

test('admin khoá rồi mở khoá member; member bị khoá bị đá ra ngay (BR8)', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  const { member, adminC, memberC } = await setup();
  const res = await adminC.post(`/admin/users/${member._id}/lock`);
  assert.strictEqual(res.status, 302);
  assert.strictEqual(res.location, '/admin/users');
  assert.strictEqual((await User.findById(member._id)).isLocked, true);

  // Request kế tiếp của member bị coi như khách
  const kicked = await memberC.get('/me/posts');
  assert.strictEqual(kicked.status, 302);
  assert.strictEqual(kicked.location, '/login');

  await adminC.post(`/admin/users/${member._id}/lock`);
  assert.strictEqual((await User.findById(member._id)).isLocked, false);
});

test('admin đổi vai trò member <-> admin', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  const { member, adminC, memberC } = await setup();
  await adminC.post(`/admin/users/${member._id}/role`);
  assert.strictEqual((await User.findById(member._id)).role, 'admin');
  // Quyền đọc từ DB nên member vào được trang admin ngay
  assert.strictEqual((await memberC.get('/admin/users')).status, 200);

  await adminC.post(`/admin/users/${member._id}/role`);
  assert.strictEqual((await User.findById(member._id)).role, 'member');
  assert.strictEqual((await memberC.get('/admin/users')).status, 403);
});

test('admin không tự khoá / tự hạ quyền chính mình', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  const { admin, adminC } = await setup();
  const lock = await adminC.post(`/admin/users/${admin._id}/lock`);
  assert.strictEqual(lock.status, 302);
  const role = await adminC.post(`/admin/users/${admin._id}/role`);
  assert.strictEqual(role.status, 302);
  const fresh = await User.findById(admin._id);
  assert.strictEqual(fresh.isLocked, false);
  assert.strictEqual(fresh.role, 'admin');
  // Flash lỗi hiện ở trang kế tiếp
  assert.match((await adminC.get('/admin/users')).text, /Không thể tự đổi vai trò/);
});

test('id sai định dạng hoặc không tồn tại trả 404', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  const { adminC } = await setup();
  assert.strictEqual((await adminC.post('/admin/users/abc/lock')).status, 404);
  assert.strictEqual((await adminC.post('/admin/users/abc/role')).status, 404);
  const missing = new mongoose.Types.ObjectId();
  assert.strictEqual((await adminC.post(`/admin/users/${missing}/lock`)).status, 404);
  assert.strictEqual((await adminC.post(`/admin/users/${missing}/role`)).status, 404);
});

// ---------- UC16 ----------

test('admin xem mọi bài kể cả nháp, lọc theo trạng thái', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  const { member, adminC } = await setup();
  await newPost(member, 'Bai da dang cua an', 'published');
  await newPost(member, 'Bai nhap cua an', 'draft');

  const all = await adminC.get('/admin/posts');
  assert.strictEqual(all.status, 200);
  assert.match(all.text, /Bai da dang cua an/);
  assert.match(all.text, /Bai nhap cua an/);

  const drafts = await adminC.get('/admin/posts?status=draft');
  assert.match(drafts.text, /Bai nhap cua an/);
  assert.doesNotMatch(drafts.text, /Bai da dang cua an/);

  const pub = await adminC.get('/admin/posts?status=published');
  assert.match(pub.text, /Bai da dang cua an/);
  assert.doesNotMatch(pub.text, /Bai nhap cua an/);

  // Giá trị lạ coi như tất cả
  assert.match((await adminC.get('/admin/posts?status=xyz')).text, /Bai nhap cua an/);
});

test('admin xoá bài người khác: xoá cả bình luận (BR6), về /admin/posts', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  const { member, adminC } = await setup();
  const post = await newPost(member, 'Bai se bi xoa');
  await new Comment({ content: 'hay', post: post._id, author: member._id }).save();

  const res = await adminC.post(`/posts/${post.slug}/delete`);
  assert.strictEqual(res.status, 302);
  assert.strictEqual(res.location, '/admin/posts');
  assert.strictEqual(await Post.countDocuments({ _id: post._id }), 0);
  assert.strictEqual(await Comment.countDocuments({ post: post._id }), 0);
});

test('tác giả xoá bài của mình vẫn về /me/posts', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  const { member, memberC } = await setup();
  const post = await newPost(member, 'Bai cua chinh minh');
  const res = await memberC.post(`/posts/${post.slug}/delete`);
  assert.strictEqual(res.location, '/me/posts');
});

test('admin xoá bình luận bất kỳ; member không xoá được bình luận người khác', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  const { admin, member, adminC, memberC } = await setup();
  const post = await newPost(admin, 'Bai cua admin');
  const adminComment = await new Comment({ content: 'cua admin', post: post._id, author: admin._id }).save();
  const memberComment = await new Comment({ content: 'cua an', post: post._id, author: member._id }).save();

  assert.strictEqual((await memberC.post(`/comments/${adminComment._id}/delete`)).status, 403);
  assert.strictEqual((await adminC.post(`/comments/${memberComment._id}/delete`)).status, 302);
  assert.strictEqual(await Comment.countDocuments({ _id: memberComment._id }), 0);
  assert.strictEqual(await Comment.countDocuments({ _id: adminComment._id }), 1);
});

// ---------- UC07 ----------

test('khách mở /profile bị chuyển về /login', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  const c = h.client();
  assert.strictEqual((await c.get('/profile')).location, '/login');
  assert.strictEqual((await c.post('/profile', { form: 'email', email: 'x@test.local' })).location, '/login');
});

test('đổi email: hợp lệ, trùng, sai định dạng (BR3)', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  const { member, memberC } = await setup();
  assert.strictEqual((await memberC.get('/profile')).status, 200);

  const dup = await memberC.post('/profile', { form: 'email', email: 'ADMIN@test.local' });
  assert.strictEqual(dup.status, 400);
  assert.match(dup.text, /Email đã được sử dụng/);

  const bad = await memberC.post('/profile', { form: 'email', email: 'khong-phai-email' });
  assert.strictEqual(bad.status, 400);
  assert.match(bad.text, /Email không đúng định dạng/);

  const good = await memberC.post('/profile', { form: 'email', email: ' Moi@Test.local ' });
  assert.strictEqual(good.status, 302);
  assert.strictEqual((await User.findById(member._id)).email, 'moi@test.local');
});

test('đổi mật khẩu: sai mật khẩu cũ, quá ngắn, không khớp, thành công', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  const { memberC } = await setup();

  const wrongOld = await memberC.post('/profile', {
    form: 'password', currentPassword: 'sai', newPassword: 'matkhaumoi', confirmPassword: 'matkhaumoi',
  });
  assert.strictEqual(wrongOld.status, 400);
  assert.match(wrongOld.text, /Mật khẩu hiện tại không đúng/);

  const short = await memberC.post('/profile', {
    form: 'password', currentPassword: 'matkhau123', newPassword: '123', confirmPassword: '123',
  });
  assert.strictEqual(short.status, 400);

  const mismatch = await memberC.post('/profile', {
    form: 'password', currentPassword: 'matkhau123', newPassword: 'matkhaumoi', confirmPassword: 'khac',
  });
  assert.strictEqual(mismatch.status, 400);
  assert.match(mismatch.text, /không khớp/);

  const good = await memberC.post('/profile', {
    form: 'password', currentPassword: 'matkhau123', newPassword: 'matkhaumoi', confirmPassword: 'matkhaumoi',
  });
  assert.strictEqual(good.status, 302);

  // Mật khẩu cũ hết dùng, mật khẩu mới đăng nhập được
  assert.strictEqual((await h.client().post('/login', { email: 'an@test.local', password: 'matkhau123' })).status, 401);
  await h.loginAs('an@test.local', 'matkhaumoi');
});
