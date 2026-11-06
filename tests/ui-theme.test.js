// Chế độ tối và thẻ Bắt đầu nhanh (UI/UX PR 4b). Phần cần MongoDB tự skip khi không có.
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const h = require('./helpers');
const Post = require('../src/models/Post');
const Comment = require('../src/models/Comment');

let ok = false;
before(async () => { ok = await h.startApp(); });
after(async () => { if (ok) { await h.clearDb(); } await h.stopApp(); });
// Không skip cả file: test header bên dưới không cần DB, chỉ các test có `if (!ok)` mới skip
beforeEach(async () => {
  if (ok) await h.clearDb();
});

const CONTENT = 'Nội dung bài viết đủ dài để qua validate.';
const done = (html) => (html.match(/data-done="true"/g) || []).length;

test('header có nút đổi giao diện và script đặt theme trước thẻ CSS (không nháy)', async () => {
  const html = await h.renderView('errors/404');
  assert.match(html, /id="themeToggle"[^>]*\bhidden\b/);
  assert.match(html, /theme-icon--moon/);
  assert.match(html, /theme-icon--sun/);
  assert.ok(html.indexOf("localStorage.getItem('theme')") !== -1);
  assert.ok(html.indexOf("localStorage.getItem('theme')") < html.indexOf('rel="stylesheet"'));
});

test('khách thấy thẻ chào mừng, không thấy thẻ Bắt đầu nhanh', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  const page = await h.client().get('/');
  assert.strictEqual(page.status, 200);
  assert.match(page.text, /id="welcomeCard"/);
  assert.match(page.text, /id="welcomeCard"[\s\S]*href="\/register"/);
  assert.doesNotMatch(page.text, /id="quickStart"/);
});

test('thành viên mới: thẻ Bắt đầu nhanh với 1/3 bước', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  await h.createUser({ username: 'chi_test', email: 'chi@test.local' });
  const page = await (await h.loginAs('chi@test.local')).get('/');
  assert.match(page.text, /id="quickStart"/);
  assert.doesNotMatch(page.text, /id="welcomeCard"/);
  assert.strictEqual(done(page.text), 1);
});

test('đã viết bài (kể cả nháp): 2/3 bước; có cả bình luận: thẻ tự ẩn', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  const chi = await h.createUser({ username: 'chi_test', email: 'chi@test.local' });
  const post = await Post.create({ title: 'Nháp của Chi', content: CONTENT, status: 'draft', author: chi._id });
  const client = await h.loginAs('chi@test.local');
  assert.strictEqual(done((await client.get('/')).text), 2);

  await Comment.create({ content: 'Bình luận đầu tiên', post: post._id, author: chi._id });
  const page = await client.get('/');
  assert.doesNotMatch(page.text, /id="quickStart"/);
  assert.doesNotMatch(page.text, /id="welcomeCard"/);
});
