// Middleware uploadCover (BR11) chạy trên một app express nhỏ. KHÔNG cần MongoDB.
const { test, before, after, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const express = require('express');
const { multipartForm } = require('./helpers');
const { uploadCover, removeCover, UPLOAD_DIR, MAX_SIZE } = require('../src/middlewares/uploadCover');

let server;
let baseUrl;
let filesBefore;

const listUploads = () => fs.readdirSync(UPLOAD_DIR).filter((f) => f !== '.gitkeep');

before(async () => {
  const app = express();
  app.post('/upload', uploadCover, (req, res) => {
    res.json({ file: req.file ? req.file.filename : null, uploadError: req.uploadError || null, body: req.body });
  });
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  filesBefore = listUploads();
});

// Dọn mọi file test tạo ra trong uploads/
afterEach(() => {
  for (const f of listUploads()) {
    if (!filesBefore.includes(f)) fs.unlinkSync(path.join(UPLOAD_DIR, f));
  }
});

after(() => new Promise((resolve) => server.close(resolve)));

async function send(fields, file) {
  const res = await fetch(`${baseUrl}/upload`, { method: 'POST', body: multipartForm(fields, file) });
  return { status: res.status, ...(await res.json()) };
}

const FIELDS = { title: 'Tiêu đề', content: 'Nội dung', status: 'published', tags: 'a, b', category: '' };

test('ảnh PNG hợp lệ: lưu với tên do server đặt, đọc đủ các ô chữ', async () => {
  const r = await send(FIELDS, { name: '../../ten-goc.png', type: 'image/png', data: Buffer.from('png') });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.uploadError, null);
  // thời gian + chuỗi ngẫu nhiên + đuôi theo loại file, không dùng tên gốc
  assert.match(r.file, /^\d+-[0-9a-f]{16}\.png$/);
  assert.ok(fs.existsSync(path.join(UPLOAD_DIR, r.file)));
  assert.deepStrictEqual({ ...r.body }, FIELDS);
});

test('đuôi file theo mimetype: JPEG -> .jpg, WEBP -> .webp', async () => {
  const jpg = await send({}, { name: 'anh.jpeg', type: 'image/jpeg', data: Buffer.from('jpg') });
  assert.match(jpg.file, /\.jpg$/);
  const webp = await send({}, { name: 'anh', type: 'image/webp', data: Buffer.from('webp') });
  assert.match(webp.file, /\.webp$/);
});

test('sai loại file (GIF, text): báo lỗi, không ghi file, vẫn đọc ô chữ', async () => {
  for (const type of ['image/gif', 'text/plain']) {
    const r = await send(FIELDS, { name: 'anh.png', type, data: Buffer.from('x') });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.file, null);
    assert.match(r.uploadError, /JPG, PNG hoặc WEBP/);
    assert.strictEqual(r.body.title, FIELDS.title);
  }
  assert.deepStrictEqual(listUploads(), filesBefore);
});

test('file quá 2 MB: báo lỗi, không còn file trên đĩa, không lỗi 500', async () => {
  const r = await send(FIELDS, { name: 'to.png', type: 'image/png', data: Buffer.alloc(MAX_SIZE + 1) });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.file, null);
  assert.match(r.uploadError, /2 MB/);
  // Ô chữ đứng trước ô file nên vẫn đọc được
  assert.strictEqual(r.body.title, FIELDS.title);
  assert.deepStrictEqual(listUploads(), filesBefore);
});

test('đúng 2 MB vẫn nhận', async () => {
  const r = await send({}, { name: 'vua.png', type: 'image/png', data: Buffer.alloc(MAX_SIZE) });
  assert.strictEqual(r.uploadError, null);
  assert.ok(r.file);
});

test('không chọn ảnh: không lỗi, không file', async () => {
  const r = await send(FIELDS);
  assert.strictEqual(r.file, null);
  assert.strictEqual(r.uploadError, null);
  assert.strictEqual(r.body.content, FIELDS.content);
});

test('removeCover xoá file, bỏ qua file không tồn tại hoặc null', async () => {
  const r = await send({}, { name: 'a.png', type: 'image/png', data: Buffer.from('png') });
  await removeCover(r.file);
  assert.ok(!fs.existsSync(path.join(UPLOAD_DIR, r.file)));
  await removeCover(r.file); // không ném lỗi
  await removeCover(null);
});
