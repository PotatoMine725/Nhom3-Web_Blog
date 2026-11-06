// Giao diện bình luận (UI/UX PR 3; UC12, UC13, BR1, BR2). Cần MongoDB, không có thì skip.
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const h = require('./helpers');
const Post = require('../src/models/Post');
const Comment = require('../src/models/Comment');

let ok = false;
before(async () => { ok = await h.startApp(); });
after(async () => { if (ok) { await h.clearDb(); } await h.stopApp(); });
beforeEach(async (t) => {
  if (!ok) return t.skip('Không kết nối được MongoDB test');
  await h.clearDb();
});

const CONTENT = 'Nội dung bài viết đủ dài để qua validate.';

// an: chủ bài; binh: người bình luận; chi: thành viên khác; root: admin
async function setup(postExtra = {}) {
  const an = await h.createUser({ username: 'an_test', email: 'an@test.local' });
  const binh = await h.createUser({ username: 'binh_test', email: 'binh@test.local' });
  await h.createUser({ username: 'chi_test', email: 'chi@test.local' });
  await h.createUser({ username: 'root_test', email: 'root@test.local', role: 'admin' });
  const post = await Post.create({ title: 'Bài của An', content: CONTENT, status: 'published', author: an._id, ...postExtra });
  const comment = await Comment.create({ content: 'Bình luận của Bình', post: post._id, author: binh._id });
  return { an, binh, post, comment };
}

test('khách thấy hộp đăng nhập, không có form và không có nút xoá', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  const { post } = await setup();
  const page = await h.client().get(`/posts/${post.slug}`);
  assert.strictEqual(page.status, 200);
  assert.match(page.text, /id="commentLoginBox"/);
  assert.doesNotMatch(page.text, /id="commentForm"/);
  assert.doesNotMatch(page.text, /action="\/comments\//);
});

test('chủ bình luận và admin thấy form xoá, người khác thì không (BR2)', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  const { post, comment } = await setup();
  const del = `action="/comments/${comment._id}/delete"`;
  for (const [email, canSee] of [['binh@test.local', true], ['root@test.local', true], ['chi@test.local', false], ['an@test.local', false]]) {
    const page = await (await h.loginAs(email)).get(`/posts/${post.slug}`);
    assert.strictEqual(page.text.includes(del), canSee, email);
    assert.match(page.text, /id="commentForm"/); // đã đăng nhập thì ai cũng có form
  }
});

test('bài nháp: chủ bài thấy dòng thông báo, không có form (BR5)', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  const { post } = await setup({ status: 'draft' });
  const page = await (await h.loginAs('an@test.local')).get(`/posts/${post.slug}`);
  assert.match(page.text, /Bài nháp chưa nhận bình luận/);
  assert.doesNotMatch(page.text, /id="commentForm"/);
});

test('gửi bình luận trống: 400, hiện lỗi, form mở sẵn (BR1)', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  const { post } = await setup();
  const res = await (await h.loginAs('chi@test.local')).post(`/posts/${post.slug}/comments`, { content: '   ' });
  assert.strictEqual(res.status, 400);
  assert.match(res.text, /id="commentErrors"/);
  assert.match(res.text, /Bình luận không được để trống/);
  assert.match(res.text, /id="commentForm"[^>]*is-open/);
});

test('bình luận > 1000 ký tự: 400, giữ lại nội dung, không lưu (BR1)', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  const { post } = await setup();
  const long = 'a'.repeat(1001);
  const res = await (await h.loginAs('chi@test.local')).post(`/posts/${post.slug}/comments`, { content: long });
  assert.strictEqual(res.status, 400);
  assert.match(res.text, /Bình luận tối đa 1000 ký tự/);
  assert.ok(res.text.includes(long));
  assert.strictEqual(await Comment.countDocuments(), 1); // chỉ bình luận của setup
});

test('nội dung bình luận được escape, tác giả đã mất hiện "Không rõ"', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  const { post } = await setup();
  await Comment.create({ content: '<b>đậm</b>', post: post._id, author: new mongoose.Types.ObjectId() });
  const page = await h.client().get(`/posts/${post.slug}`);
  assert.strictEqual(page.status, 200);
  assert.match(page.text, /&lt;b&gt;đậm&lt;\/b&gt;/);
  assert.doesNotMatch(page.text, /<b>đậm<\/b>/);
  assert.match(page.text, /Không rõ/);
});
