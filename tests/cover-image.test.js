// Ảnh bìa (BR11, UC08, UC09) và xoá file ảnh khi xoá bài (BR6). Cần MongoDB, không có thì skip.
const { test, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const h = require('./helpers');
const Post = require('../src/models/Post');
const Category = require('../src/models/Category');
const { UPLOAD_DIR, MAX_SIZE } = require('../src/middlewares/uploadCover');

const listUploads = () => fs.readdirSync(UPLOAD_DIR).filter((f) => f !== '.gitkeep');
const exists = (f) => fs.existsSync(path.join(UPLOAD_DIR, f));

let ok = false;
let filesBefore = [];
before(async () => {
  ok = await h.startApp();
  filesBefore = listUploads();
});
after(async () => { if (ok) { await h.clearDb(); } await h.stopApp(); });
beforeEach(async (t) => {
  if (!ok) return t.skip('Không kết nối được MongoDB test');
  await h.clearDb();
});
// Dọn mọi file test tạo ra trong uploads/
afterEach(() => {
  for (const f of listUploads()) {
    if (!filesBefore.includes(f)) fs.unlinkSync(path.join(UPLOAD_DIR, f));
  }
});

const CONTENT = 'Nội dung bài viết đủ dài để qua validate.';
const PNG = { name: 'anh-goc.png', type: 'image/png', data: Buffer.from('png-data') };
const JPG = { name: 'anh-moi.jpg', type: 'image/jpeg', data: Buffer.from('jpg-data') };

// an (tác giả), binh (thành viên khác), admin
async function setup() {
  const an = await h.createUser({ username: 'an_test', email: 'an@test.local' });
  await h.createUser({ username: 'binh_test', email: 'binh@test.local' });
  await h.createUser({ username: 'admin_test', email: 'admin@test.local', role: 'admin' });
  const c = await h.loginAs('an@test.local');
  return { an, c };
}

// An tạo bài qua form thật (multipart), kèm ảnh nếu có
async function createPost(c, title, file) {
  const res = await c.postMultipart('/posts', { title, content: CONTENT, status: 'published', tags: '' }, file);
  assert.strictEqual(res.status, 302, res.text);
  return Post.findOne({ title });
}

test('khách gửi form có ảnh: về /login, không ghi file, không tạo bài', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  const res = await h.client().postMultipart('/posts', { title: 'Bài của khách', content: CONTENT }, PNG);
  assert.strictEqual(res.status, 302);
  assert.strictEqual(res.location, '/login');
  assert.deepStrictEqual(listUploads(), filesBefore);
  assert.strictEqual(await Post.countDocuments(), 0);
});

test('tạo bài kèm ảnh PNG: lưu file, đọc đủ các ô chữ, hiện ảnh ở trang bài và danh sách (UC08)', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  const { an, c } = await setup();
  const cat = await Category.create({ name: 'Lập trình' });
  const res = await c.postMultipart(
    '/posts',
    // coverImage dạng chữ trong form bị bỏ qua: tên file luôn do server đặt
    { title: 'Bài có ảnh bìa', content: CONTENT, status: 'published', tags: 'NodeJS, web', category: String(cat._id), coverImage: 'hack.png' },
    PNG
  );
  assert.strictEqual(res.status, 302);
  const post = await Post.findOne({ title: 'Bài có ảnh bìa' });
  assert.strictEqual(res.location, `/posts/${post.slug}`);
  assert.ok(post.author.equals(an._id));
  assert.strictEqual(post.status, 'published');
  assert.deepStrictEqual([...post.tags], ['nodejs', 'web']);
  assert.ok(post.category.equals(cat._id));
  assert.match(post.coverImage, /^\d+-[0-9a-f]{16}\.png$/);
  assert.ok(exists(post.coverImage));

  assert.match((await c.get(`/posts/${post.slug}`)).text, new RegExp(`src="/uploads/${post.coverImage}"`));
  assert.match((await c.get('/')).text, new RegExp(`src="/uploads/${post.coverImage}"`));
  // File phục vụ công khai qua /uploads
  const file = await h.client().get(`/uploads/${post.coverImage}`);
  assert.strictEqual(file.status, 200);
  assert.strictEqual(file.text, 'png-data');
});

test('tạo bài không ảnh: coverImage null, coverImage dạng chữ trong form bị bỏ qua', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  const { c } = await setup();
  const post = await createPost(c, 'Bài không có ảnh');
  assert.strictEqual(post.coverImage, null);
  await c.post('/posts', { title: 'Bài gửi kiểu urlencoded', content: CONTENT, coverImage: 'hack.png' });
  assert.strictEqual((await Post.findOne({ title: 'Bài gửi kiểu urlencoded' })).coverImage, null);
});

test('ảnh sai loại hoặc quá 2 MB: hiện lại form 400, giữ ô đã nhập, không lưu file, không tạo bài (UC08 4b)', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  const { c } = await setup();
  const cases = [
    [{ name: 'anh.gif', type: 'image/gif', data: Buffer.from('gif') }, /JPG, PNG hoặc WEBP/],
    [{ name: 'a.txt', type: 'text/plain', data: Buffer.from('txt') }, /JPG, PNG hoặc WEBP/],
    [{ name: 'to.png', type: 'image/png', data: Buffer.alloc(MAX_SIZE + 1) }, /tối đa 2 MB/],
  ];
  for (const [file, msg] of cases) {
    const res = await c.postMultipart('/posts', { title: 'Bài ảnh lỗi', content: CONTENT, status: 'draft' }, file);
    assert.strictEqual(res.status, 400);
    assert.match(res.text, msg);
    assert.match(res.text, /value="Bài ảnh lỗi"/);
  }
  assert.deepStrictEqual(listUploads(), filesBefore);
  assert.strictEqual(await Post.countDocuments(), 0);
});

test('tạo bài lỗi validate kèm ảnh hợp lệ: xoá file vừa upload', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  const { c } = await setup();
  const res = await c.postMultipart('/posts', { title: 'Ngắn', content: CONTENT }, PNG);
  assert.strictEqual(res.status, 400);
  assert.deepStrictEqual(listUploads(), filesBefore);
  assert.strictEqual(await Post.countDocuments(), 0);
});

test('khách và người không có quyền sửa gửi ảnh: không ghi file, bài giữ nguyên', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  const { c } = await setup();
  const post = await createPost(c, 'Bài của An có ảnh', PNG);
  const filesNow = listUploads();

  const guest = await h.client().postMultipart(`/posts/${post.slug}/edit`, { title: 'Khách sửa', content: CONTENT }, JPG);
  assert.strictEqual(guest.location, '/login');
  const binh = await h.loginAs('binh@test.local');
  const res = await binh.postMultipart(`/posts/${post.slug}/edit`, { title: 'Bình sửa bài', content: CONTENT }, JPG);
  assert.strictEqual(res.status, 403);

  assert.deepStrictEqual(listUploads(), filesNow);
  const after = await Post.findById(post._id);
  assert.strictEqual(after.title, 'Bài của An có ảnh');
  assert.strictEqual(after.coverImage, post.coverImage);
});

test('form sửa hiện ảnh hiện tại và ô "Xoá ảnh bìa"; tick ô thì bỏ ảnh và xoá file (UC09)', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  const { c } = await setup();
  const post = await createPost(c, 'Bài sẽ xoá ảnh', PNG);
  const form = await c.get(`/posts/${post.slug}/edit`);
  assert.match(form.text, /enctype="multipart\/form-data"/);
  assert.match(form.text, new RegExp(`src="/uploads/${post.coverImage}"`));
  assert.match(form.text, /name="removeCover"/);

  const res = await c.postMultipart(`/posts/${post.slug}/edit`, {
    title: post.title, content: CONTENT, status: 'published', tags: '', removeCover: '1',
  });
  assert.strictEqual(res.status, 302);
  assert.strictEqual((await Post.findById(post._id)).coverImage, null);
  assert.ok(!exists(post.coverImage));
});

test('sửa bài không chọn ảnh, không tick: giữ ảnh cũ, các ô chữ vẫn cập nhật', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  const { c } = await setup();
  const post = await createPost(c, 'Bài giữ ảnh cũ', PNG);
  const res = await c.postMultipart(`/posts/${post.slug}/edit`, {
    title: 'Bài giữ ảnh cũ đã sửa', content: CONTENT, status: 'draft', tags: 'moi', coverImage: 'hack.png',
  });
  assert.strictEqual(res.status, 302);
  const after = await Post.findById(post._id);
  assert.strictEqual(after.title, 'Bài giữ ảnh cũ đã sửa');
  assert.strictEqual(after.status, 'draft');
  assert.deepStrictEqual([...after.tags], ['moi']);
  assert.strictEqual(after.coverImage, post.coverImage);
  assert.ok(exists(post.coverImage));
});

test('thay ảnh: lưu ảnh mới, xoá file cũ (admin sửa bài người khác cũng vậy)', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  const { c } = await setup();
  const post = await createPost(c, 'Bài thay ảnh', PNG);
  const fields = { title: post.title, content: CONTENT, status: 'published', tags: '' };

  await c.postMultipart(`/posts/${post.slug}/edit`, fields, JPG);
  const after = await Post.findById(post._id);
  assert.match(after.coverImage, /\.jpg$/);
  assert.ok(exists(after.coverImage));
  assert.ok(!exists(post.coverImage));

  const admin = await h.loginAs('admin@test.local');
  const res = await admin.postMultipart(`/posts/${post.slug}/edit`, fields, PNG);
  assert.strictEqual(res.status, 302);
  const byAdmin = await Post.findById(post._id);
  assert.match(byAdmin.coverImage, /\.png$/);
  assert.ok(!exists(after.coverImage));
  assert.deepStrictEqual(listUploads().filter((f) => !filesBefore.includes(f)), [byAdmin.coverImage]);
});

test('sửa lỗi (validate hoặc ảnh sai loại): giữ ảnh cũ, không còn file mới, form hiện ảnh cũ', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  const { c } = await setup();
  const post = await createPost(c, 'Bài sửa bị lỗi', PNG);
  const filesNow = listUploads();

  const bad = await c.postMultipart(`/posts/${post.slug}/edit`, { title: 'Ngắn', content: CONTENT }, JPG);
  assert.strictEqual(bad.status, 400);
  assert.match(bad.text, new RegExp(`src="/uploads/${post.coverImage}"`));
  const gif = await c.postMultipart(`/posts/${post.slug}/edit`, { title: post.title, content: CONTENT }, {
    name: 'a.gif', type: 'image/gif', data: Buffer.from('gif'),
  });
  assert.strictEqual(gif.status, 400);

  assert.deepStrictEqual(listUploads(), filesNow);
  assert.strictEqual((await Post.findById(post._id)).coverImage, post.coverImage);
});

test('xoá bài thì xoá file ảnh bìa (BR6)', async (t) => {
  if (!ok) return t.skip('Cần MongoDB');
  const { c } = await setup();
  const post = await createPost(c, 'Bài sẽ bị xoá', PNG);
  const other = await createPost(c, 'Bài khác giữ ảnh', JPG);
  assert.ok(exists(post.coverImage));

  const res = await c.post(`/posts/${post.slug}/delete`);
  assert.strictEqual(res.status, 302);
  assert.strictEqual(await Post.exists({ _id: post._id }), null);
  assert.ok(!exists(post.coverImage));
  assert.ok(exists(other.coverImage));
});
