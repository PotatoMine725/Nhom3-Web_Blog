// JS thuần cho giao diện. Trang vẫn dùng được khi tắt JS.

// Phím "/" nhảy vào ô tìm kiếm (trừ khi đang gõ trong ô nhập khác)
document.addEventListener('keydown', function (e) {
  if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;

  var tag = e.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) return;

  var input = document.getElementById('searchInput');
  if (!input) return;

  e.preventDefault();
  // Màn hình nhỏ: ô tìm kiếm đang thu gọn, bấm nút biểu tượng để mở trước
  if (!input.offsetParent) {
    var toggle = document.querySelector('[data-bs-target="#searchForm"]');
    if (toggle) toggle.click();
  }
  input.focus();
});
