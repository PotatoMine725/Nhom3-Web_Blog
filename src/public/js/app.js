// JS thuần cho giao diện. Trang vẫn dùng được khi tắt JS.

// Nút "Sao chép liên kết" ở trang bài: mặc định ẩn trong HTML, có JS mới hiện
var copyBtn = document.getElementById('copyLinkBtn');
if (copyBtn && navigator.clipboard) {
  copyBtn.hidden = false;
  copyBtn.addEventListener('click', function () {
    navigator.clipboard.writeText(location.href.split('#')[0]).then(function () {
      var old = copyBtn.textContent;
      copyBtn.textContent = 'Đã sao chép!';
      setTimeout(function () {
        copyBtn.textContent = old;
      }, 2000);
    });
  });
}

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

// ---- Bình luận (UI/UX PR 3) ----
var commentForm = document.getElementById('commentForm');
var commentInput = document.getElementById('commentInput');

if (commentForm && commentInput) {
  var commentCounter = document.getElementById('commentCounter');
  var commentSubmit = document.getElementById('commentSubmit');
  var commentSent = false;

  // Trình duyệt gửi xuống dòng dạng \r\n nên server đếm 2 ký tự cho mỗi lần xuống dòng
  function commentLength() {
    return commentInput.value.replace(/\r?\n/g, '\r\n').length;
  }

  function refreshComment() {
    if (commentForm.classList.contains('is-open')) {
      commentInput.style.height = 'auto';
      // scrollHeight không gồm viền; border-box cần cộng thêm để không hiện thanh cuộn thừa
      commentInput.style.height = commentInput.scrollHeight + (commentInput.offsetHeight - commentInput.clientHeight) + 'px';
    }
    var length = commentLength();
    commentCounter.textContent = length + '/1000';
    commentCounter.classList.toggle('text-danger', length > 1000);
    commentSubmit.disabled = commentSent || commentInput.value.trim() === '';
  }

  commentInput.addEventListener('focus', function () {
    commentForm.classList.add('is-open');
    refreshComment();
  });
  commentInput.addEventListener('input', refreshComment);

  // Enter gửi, Shift+Enter xuống dòng. Bỏ qua khi bộ gõ đang soạn chữ.
  // Màn hình cảm ứng không có Shift nên Enter vẫn xuống dòng, chỉ nút "Bình luận" mới gửi
  commentInput.addEventListener('keydown', function (e) {
    if (window.matchMedia('(pointer: coarse)').matches) return;
    if (e.key !== 'Enter' || e.shiftKey || e.isComposing || e.keyCode === 229) return;
    e.preventDefault();
    if (!commentSubmit.disabled) commentSubmit.click();
  });

  // Chặn gửi đúp khi bấm Enter / nút liên tiếp
  commentForm.addEventListener('submit', function () {
    commentSent = true;
    commentSubmit.disabled = true;
  });
  // Quay lại trang bằng nút Back (bfcache): cho phép gửi lại
  window.addEventListener('pageshow', function () {
    commentSent = false;
    refreshComment();
  });

  refreshComment();

  // Gửi lỗi validate: server render lại trang từ đầu, đưa người dùng tới ô nhập
  if (document.getElementById('commentErrors')) {
    commentForm.scrollIntoView({ block: 'center' });
    commentInput.focus();
    commentInput.setSelectionRange(commentInput.value.length, commentInput.value.length);
  }
}

// Khách bấm ô giả "Viết bình luận…" thì hiện hộp đăng nhập
var guestPill = document.getElementById('commentGuestPill');
if (guestPill) {
  guestPill.addEventListener('click', function () {
    document.getElementById('commentLoginBox').classList.add('is-open');
  });
}

// Nút "Bình luận (N)": cuộn tới ô nhập (hoặc ô giả của khách) rồi mở. Bài nháp không có ô nên giữ link neo #comments
var commentJump = document.getElementById('commentJump');
if (commentJump) {
  commentJump.addEventListener('click', function (e) {
    var target = commentForm || guestPill;
    if (!target) return;
    e.preventDefault();
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    if (commentInput) commentInput.focus({ preventScroll: true });
    else guestPill.click();
  });
}

// Xoá bình luận: form vẫn là POST thật; JS chỉ chặn submit để hỏi lại bằng modal
var deleteModalEl = document.getElementById('deleteCommentModal');
if (deleteModalEl && window.bootstrap) {
  var deleteModal = window.bootstrap.Modal.getOrCreateInstance(deleteModalEl);
  var deleteConfirm = document.getElementById('deleteCommentConfirm');
  var pendingDelete = null;

  document.querySelectorAll('[data-comment-delete]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      pendingDelete = form;
      deleteModal.show();
    });
  });
  deleteConfirm.addEventListener('click', function () {
    if (!pendingDelete) return;
    deleteConfirm.disabled = true;
    pendingDelete.submit(); // form.submit() không kích hoạt lại sự kiện submit
  });
  deleteModalEl.addEventListener('hidden.bs.modal', function () {
    // Mở modal bằng JS nên Bootstrap không tự trả focus; đưa về nút "Xoá" để dùng bàn phím liền mạch
    var opener = pendingDelete && pendingDelete.querySelector('button');
    pendingDelete = null;
    if (opener) opener.focus();
    deleteConfirm.disabled = false;
  });
  // Quay lại bằng nút Back (bfcache): nút xác nhận không được kẹt ở trạng thái vô hiệu
  window.addEventListener('pageshow', function () {
    deleteConfirm.disabled = false;
  });
}
