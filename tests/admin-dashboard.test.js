// Trang thống kê admin (UC20). Phần fillMonths không cần DB; phần còn lại cần MongoDB, không có thì skip.
const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const h = require('./helpers');
const Post = require('../src/models/Post');
const Comment = require('../src/models/Comment');
const Like = require('../src/models/Like');
const { fillMonths, loadStats } = require('../src/controllers/statsController');

const CONTENT = 'Nội dung bài viết đủ dài để qua validate.';

// Ngày 15 lúc 12 giờ (giờ máy) của tháng cách hiện tại `ago` tháng, tránh rơi đúng mốc đầu tháng
function midMonth(now, ago) {
  return new Date(now.getFullYear(), now.getMonth() - ago, 15, 12);
}

function label(d) {
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

// ---------- Không cần DB ----------

test('fillMonths: đủ 6 tháng cũ -> mới, tháng trống = 0, percent theo tháng lớn nhất', () => {
  // Tháng 2/2026: 6 tháng gồm 9/2025 .. 2/2026 (qua năm)
  const now = new Date(2026, 1, 10);
  const months = fillMonths(
    [
      { _id: { year: 2025, month: 10 }, count: 2 },
      { _id: { year: 2026, month: 2 }, count: 4 },
    ],
    now
  );
  assert.deepStrictEqual(
    months.map((m) => [m.label, m.count, m.percent]),
    [
      ['09/2025', 0, 0],
      ['10/2025', 2, 50],
      ['11/2025', 0, 0],
      ['12/2025', 0, 0],
      ['01/2026', 0, 0],
      ['02/2026', 4, 100],
    ]
  );
});

test('fillMonths: không có bài thì mọi tháng 0, percent 0 (không chia cho 0)', () => {
  const months = fillMonths([], new Date(2026, 10, 5));
  assert.strictEqual(months.length, 6);
  assert.ok(months.every((m) => m.count === 0 && m.percent === 0));
});

// ---------- Cần MongoDB ----------

describe('trang /admin', () => {
  let ok = false;
  before(async () => { ok = await h.startApp(); });
  after(async () => { if (ok) { await h.clearDb(); } await h.stopApp(); });
  beforeEach(async (t) => {
    if (!ok) return t.skip('Không kết nối được MongoDB test');
    await h.clearDb();
  });

  async function makePost(author, title, extra = {}) {
    const { createdAt, ...rest } = extra;
    const post = await Post.create({ title, content: CONTENT, status: 'published', author: author._id, ...rest });
    // createdAt do timestamps quản lý (immutable), sửa thẳng trên collection để giả bài cũ
    if (createdAt) await Post.collection.updateOne({ _id: post._id }, { $set: { createdAt } });
    return post;
  }

  test('khách và member bị 403, admin được 200', async (t) => {
    if (!ok) return t.skip('Cần MongoDB');
    await h.createUser({ username: 'quantri', email: 'admin@test.local', role: 'admin' });
    await h.createUser({ username: 'an_test', email: 'an@test.local' });
    assert.strictEqual((await h.client().get('/admin')).status, 403);
    assert.strictEqual((await (await h.loginAs('an@test.local')).get('/admin')).status, 403);

    const res = await (await h.loginAs('admin@test.local')).get('/admin');
    assert.strictEqual(res.status, 200);
    assert.match(res.text, /Thống kê/);
    // Header của admin có link Thống kê
    assert.match(res.text, /href="\/admin">Thống kê</);
  });

  test('chưa có dữ liệu: các bảng hiện "Chưa có dữ liệu"', async (t) => {
    if (!ok) return t.skip('Cần MongoDB');
    await h.createUser({ username: 'quantri', email: 'admin@test.local', role: 'admin' });
    const res = await (await h.loginAs('admin@test.local')).get('/admin');
    assert.strictEqual(res.status, 200);
    // Bảng theo tháng + 4 bảng top
    assert.strictEqual(res.text.match(/Chưa có dữ liệu/g).length, 5);
    assert.doesNotMatch(res.text, /progress-bar/);

    const stats = await loadStats();
    assert.strictEqual(stats.userCount, 1);
    assert.deepStrictEqual(stats.postsByStatus, { draft: 0, published: 0 });
    assert.strictEqual(stats.commentCount, 0);
    assert.strictEqual(stats.likeCount, 0);
  });

  test('số liệu khớp dữ liệu: đếm, theo tháng, top tác giả / like / bình luận / lượt xem', async (t) => {
    if (!ok) return t.skip('Cần MongoDB');
    const now = new Date();
    const admin = await h.createUser({ username: 'quantri', email: 'admin@test.local', role: 'admin' });
    const an = await h.createUser({ username: 'an_test', email: 'an@test.local' });
    const binh = await h.createUser({ username: 'binh_test', email: 'binh@test.local' });
    await h.createUser({ username: 'khoa_test', email: 'khoa@test.local', isLocked: true });

    // an: 3 bài published (2 tháng này, 1 cách 2 tháng), binh: 1 bài cách 7 tháng (ngoài 6 tháng)
    const a1 = await makePost(an, 'Bài một của An', { views: 5, createdAt: midMonth(now, 0) });
    const a2 = await makePost(an, 'Bài hai của An', { views: 9, createdAt: midMonth(now, 0) });
    const a3 = await makePost(an, 'Bài ba của An', { views: 1, createdAt: midMonth(now, 2) });
    const b1 = await makePost(binh, 'Bài cũ của Bình', { views: 3, createdAt: midMonth(now, 7) });
    // Bài nháp: nhiều like, bình luận, lượt xem nhất nhưng không được vào top hay bảng tháng
    const draft = await makePost(binh, 'Bài nháp của Bình', { status: 'draft', views: 100, createdAt: midMonth(now, 0) });

    await Like.create([
      { user: admin._id, post: draft._id },
      { user: an._id, post: draft._id },
      { user: binh._id, post: draft._id },
      { user: admin._id, post: a2._id },
      { user: binh._id, post: a2._id },
      { user: binh._id, post: a1._id },
    ]);
    await Comment.create([
      { content: 'c1', post: draft._id, author: an._id },
      { content: 'c2', post: draft._id, author: an._id },
      { content: 'c3', post: draft._id, author: an._id },
      { content: 'c4', post: b1._id, author: an._id },
      { content: 'c5', post: b1._id, author: admin._id },
      { content: 'c6', post: a3._id, author: binh._id },
    ]);

    const stats = await loadStats(now);
    assert.strictEqual(stats.userCount, 4);
    assert.strictEqual(stats.lockedCount, 1);
    assert.deepStrictEqual(stats.postsByStatus, { draft: 1, published: 4 });
    assert.strictEqual(stats.postCount, 5);
    assert.strictEqual(stats.commentCount, 6);
    assert.strictEqual(stats.likeCount, 6);

    // 6 tháng cũ -> mới: tháng này 2 bài (nháp không tính), cách 2 tháng 1 bài, bài 7 tháng trước bị loại
    assert.strictEqual(stats.months.length, 6);
    assert.deepStrictEqual(
      stats.months.map((m) => [m.label, m.count, m.percent]),
      [5, 4, 3, 2, 1, 0].map((ago) => {
        const count = ago === 0 ? 2 : ago === 2 ? 1 : 0;
        return [label(midMonth(now, ago)), count, count * 50];
      })
    );

    assert.deepStrictEqual(stats.topAuthors, [
      { count: 3, username: 'an_test' },
      { count: 1, username: 'binh_test' },
    ]);
    assert.deepStrictEqual(stats.topLiked, [
      { count: 2, title: a2.title, slug: a2.slug },
      { count: 1, title: a1.title, slug: a1.slug },
    ]);
    assert.deepStrictEqual(stats.topCommented, [
      { count: 2, title: b1.title, slug: b1.slug },
      { count: 1, title: a3.title, slug: a3.slug },
    ]);
    assert.deepStrictEqual(
      stats.topViewed.map((p) => [p.slug, p.views]),
      [[a2.slug, 9], [a1.slug, 5], [b1.slug, 3], [a3.slug, 1]]
    );

    // Trang hiển thị đúng: link bài, không có bài nháp, có thanh ngang
    const res = await (await h.loginAs('admin@test.local')).get('/admin');
    assert.strictEqual(res.status, 200);
    assert.match(res.text, new RegExp(`href="/posts/${a2.slug}"`));
    assert.doesNotMatch(res.text, new RegExp(draft.slug));
    assert.match(res.text, /style="width: 100%"/);
    assert.match(res.text, /style="width: 50%"/);
    assert.doesNotMatch(res.text, /Chưa có dữ liệu/);
  });

  test('top giới hạn 5 dòng', async (t) => {
    if (!ok) return t.skip('Cần MongoDB');
    const an = await h.createUser({ username: 'an_test', email: 'an@test.local' });
    for (let i = 1; i <= 7; i += 1) {
      const post = await makePost(an, `Bài số ${i} của An`, { views: i });
      await Like.create({ user: an._id, post: post._id });
    }
    const stats = await loadStats();
    assert.strictEqual(stats.topViewed.length, 5);
    assert.strictEqual(stats.topViewed[0].views, 7);
    assert.strictEqual(stats.topLiked.length, 5);
    assert.strictEqual(stats.topAuthors.length, 1);
  });
});
