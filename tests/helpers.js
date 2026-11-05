// Hàm dùng chung cho test. Chỉ dùng thư viện có sẵn của Node (node:test, fetch).
// Test cần MongoDB đang bật. DB test tách riêng khỏi DB thật: tên phải kết thúc bằng "_test".
require('dotenv').config();
const mongoose = require('mongoose');
const createApp = require('../src/app');
const User = require('../src/models/User');

const TEST_URI = process.env.MONGODB_URI_TEST || 'mongodb://127.0.0.1:27017/nhom3_blog_test';

let server;
let baseUrl;

// Kết nối DB test và chạy app ở cổng ngẫu nhiên. Không kết nối được thì trả false để test tự skip.
async function startApp() {
  const dbName = new URL(TEST_URI).pathname.slice(1);
  if (!dbName.endsWith('_test')) throw new Error(`DB test phải kết thúc bằng _test, đang là "${dbName}"`);
  try {
    await mongoose.connect(TEST_URI, { serverSelectionTimeoutMS: 2000 });
  } catch (err) {
    // Chỉ skip khi không có MongoDB chạy. Lỗi khác (sai URI, sai mật khẩu DB) thì báo fail.
    if (err.name === 'MongooseServerSelectionError') return false;
    throw err;
  }
  const app = createApp({ sessionSecret: 'test-secret' });
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  return true;
}

async function stopApp() {
  if (server) await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
}

// Xoá dữ liệu trong DB test (chỉ deleteMany, không drop). Có kiểm tên DB để không đụng DB thật.
async function clearDb() {
  if (!mongoose.connection.name.endsWith('_test')) throw new Error('Không phải DB test');
  const collections = await mongoose.connection.db.collections();
  for (const c of collections) await c.deleteMany({});
}

// Client nhỏ có giữ cookie, không tự đi theo redirect để kiểm tra được status 302.
function client() {
  let cookie = '';
  async function request(method, path, form) {
    const headers = {};
    if (cookie) headers.cookie = cookie;
    let body;
    if (form instanceof FormData) {
      body = form; // fetch tự đặt content-type multipart kèm boundary
    } else if (form) {
      headers['content-type'] = 'application/x-www-form-urlencoded';
      body = new URLSearchParams(form).toString();
    }
    const res = await fetch(baseUrl + path, { method, headers, body, redirect: 'manual' });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    const text = await res.text();
    return { status: res.status, location: res.headers.get('location'), text };
  }
  return {
    get: (path) => request('GET', path),
    post: (path, form = {}) => request('POST', path, form),
    postMultipart: (path, fields = {}, file) => request('POST', path, multipartForm(fields, file)),
  };
}

// Form multipart/form-data giống trình duyệt gửi (FormData, Blob có sẵn của Node).
// file = { field, name, type, data (Buffer) }, ô file đặt sau các ô chữ như trong form thật.
function multipartForm(fields, file) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.append(key, value);
  if (file) fd.append(file.field || 'coverImage', new Blob([file.data], { type: file.type }), file.name);
  return fd;
}

// Tạo user thẳng trong DB (nhanh hơn đi qua form đăng ký)
async function createUser({ username, email, password = 'matkhau123', role = 'member', isLocked = false }) {
  const user = new User({ username, email, role, isLocked });
  await user.setPassword(password);
  await user.save();
  return user;
}

// Tạo client đã đăng nhập bằng email + mật khẩu
async function loginAs(email, password = 'matkhau123') {
  const c = client();
  const res = await c.post('/login', { email, password });
  if (res.status !== 302) throw new Error(`Đăng nhập thất bại (${res.status}) cho ${email}`);
  return c;
}

module.exports = { startApp, stopApp, clearDb, client, multipartForm, createUser, loginAs, TEST_URI };
