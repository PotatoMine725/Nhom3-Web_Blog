// Giao diện bổ sung (UI/UX PR 4a): trang lỗi, ô tìm kiếm, màu CSS. Phần cần MongoDB tự skip khi không có.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const express = require('express');
const h = require('./helpers');
const viewHelpers = require('../src/utils/viewHelpers');
const Post = require('../src/models/Post');

let ok = false;
before(async () => { ok = await h.startApp(); });
after(async () => { if (ok) { await h.clearDb(); } await h.stopApp(); });

const viewsDir = path.join(__dirname, '..', 'src', 'views');

// ---- Không cần MongoDB ----

test('ô tìm kiếm có nút kính lúp và vẫn giữ #searchInput', async () => {
  const html = await h.renderView('errors/404');
  assert.match(html, /class="search-box"/);
  assert.match(html, /class="search-box__btn" type="submit"/);
  assert.match(html, /id="searchInput"/);
});

for (const [view, code, text] of [['errors/403', '403', 'không có quyền'], ['errors/404', '404', 'không tồn tại'], ['errors/500', '500', 'Có lỗi xảy ra']]) {
  test(`${view}: khung trang lỗi, mã ${code}, nút về trang chủ`, async () => {
    const html = await h.renderView(view);
    assert.match(html, /class="error-page"/);
    assert.ok(html.includes(`>${code}<`));
    assert.ok(html.includes(text));
    assert.match(html, /class="error-page__actions"[\s\S]*href="\/"/);
  });
}

test('403: khách thấy nút Đăng nhập, thành viên thì không', async () => {
  const guest = await h.renderView('errors/403');
  assert.match(guest, /class="error-page__actions"[\s\S]*href="\/login"/);
  const member = await h.renderView('errors/403', { currentUser: { username: 'an_test', role: 'member' } });
  assert.doesNotMatch(member, /href="\/login"/);
});

test('lỗi 500: trang lỗi đẹp, không lộ chi tiết, render được khi res.locals trống', async (t) => {
  // require trong thân test: file test vẫn nạp được trước bước 7, các test khác xanh dần theo từng bước
  const { errorHandler } = require('../src/middlewares/errorHandler');
  t.mock.method(console, 'error', () => {}); // handler có console.error(err)
  const app = express();
  app.set('view engine', 'ejs');
  app.set('views', viewsDir);
  Object.assign(app.locals, viewHelpers);
  app.get('/boom', () => { throw new Error('bí mật nội bộ'); });
  app.use(errorHandler); // không có loadUser: res.locals không có currentUser, flash, currentPath
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/boom`);
    const text = await res.text();
    assert.strictEqual(res.status, 500);
    assert.match(text, /class="error-page"/);
    assert.match(text, /Về trang chủ/);
    assert.doesNotMatch(text, /bí mật nội bộ/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

// Chặn quay lại màu cứng: ngoài khối :root và [data-bs-theme="dark"], style.css chỉ được có #fff (chữ avatar)
test('style.css không còn màu cứng ngoài khối biến', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'public', 'css', 'style.css'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(:root|\[data-bs-theme="dark"\])\s*\{[^}]*\}/g, '');
  const found = (css.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(/g) || []).filter((c) => c !== '#fff');
  assert.deepStrictEqual(found, []);
});

// ---- Cần MongoDB ----

test('403 và 404 thật dùng khung trang lỗi mới', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  await h.clearDb();
  const an = await h.createUser({ username: 'an_test', email: 'an@test.local' });
  await h.createUser({ username: 'chi_test', email: 'chi@test.local' });
  const post = await Post.create({ title: 'Bài của An', content: 'Nội dung bài viết đủ dài để qua validate.', status: 'published', author: an._id });

  const notOwner = await (await h.loginAs('chi@test.local')).get(`/posts/${post.slug}/edit`);
  assert.strictEqual(notOwner.status, 403);
  assert.match(notOwner.text, /class="error-page"/);

  const notAdmin = await h.client().get('/admin');
  assert.strictEqual(notAdmin.status, 403);
  assert.match(notAdmin.text, /class="error-page__actions"[\s\S]*href="\/login"/); // header khách cũng có /login nên phải neo vào khung lỗi

  const missing = await h.client().get('/khong-co-trang-nay');
  assert.strictEqual(missing.status, 404);
  assert.match(missing.text, /class="error-page"/);
});
