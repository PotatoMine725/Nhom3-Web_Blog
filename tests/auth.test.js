// Test mẫu cho luồng đăng nhập (cần MongoDB). Không có MongoDB thì skip.
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const h = require('./helpers');

let ok = false;
before(async () => { ok = await h.startApp(); });
after(async () => { if (ok) { await h.clearDb(); } await h.stopApp(); });
beforeEach(async (t) => {
  if (!ok) return t.skip('Không kết nối được MongoDB test');
  await h.clearDb();
});

test('đăng nhập đúng thì về trang chủ, sai thì 401', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  await h.createUser({ username: 'an_test', email: 'an@test.local' });
  const c = h.client();
  const bad = await c.post('/login', { email: 'an@test.local', password: 'sai' });
  assert.strictEqual(bad.status, 401);
  const good = await c.post('/login', { email: 'an@test.local', password: 'matkhau123' });
  assert.strictEqual(good.status, 302);
  assert.strictEqual(good.location, '/');
});

test('tài khoản bị khoá không đăng nhập được (BR8)', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  await h.createUser({ username: 'binh', email: 'binh@test.local', isLocked: true });
  const res = await h.client().post('/login', { email: 'binh@test.local', password: 'matkhau123' });
  assert.strictEqual(res.status, 403);
});

test('khách vào /posts/new bị chuyển về /login', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  const res = await h.client().get('/posts/new');
  assert.strictEqual(res.status, 302);
  assert.strictEqual(res.location, '/login');
});
