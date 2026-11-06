// Không cần MongoDB: kiểm tra mọi file EJS biên dịch được (bắt lỗi cú pháp trong view).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');

const viewsDir = path.join(__dirname, '..', 'src', 'views');

function listEjs(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return listEjs(p);
    return e.name.endsWith('.ejs') ? [p] : [];
  });
}

for (const file of listEjs(viewsDir)) {
  test(`biên dịch được ${path.relative(viewsDir, file)}`, () => {
    assert.doesNotThrow(() => ejs.compile(fs.readFileSync(file, 'utf8'), { filename: file }));
  });
}
