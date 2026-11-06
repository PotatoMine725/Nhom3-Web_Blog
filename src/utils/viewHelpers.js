// Hàm nhỏ dùng trong view EJS (đăng ký vào app.locals ở app.js)

// Màu nền avatar: đủ đậm để chữ trắng đọc rõ
const AVATAR_COLORS = ['#0074cc', '#c2410c', '#15803d', '#7c3aed', '#be185d', '#0f766e', '#b45309', '#475569'];

// Chữ cái đầu của tên, in hoa. Tên rỗng thì trả "?"
function initials(name) {
  const first = String(name || '').trim().charAt(0);
  return first ? first.toUpperCase() : '?';
}

// Cùng một tên luôn ra cùng một màu
function avatarColor(name) {
  const text = String(name || '');
  let sum = 0;
  for (let i = 0; i < text.length; i++) {
    sum += text.charCodeAt(i);
  }
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

// "vừa xong", "5 phút trước", "3 giờ trước", "2 ngày trước"; quá 7 ngày thì hiện ngày
function timeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'vừa xong';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes + ' phút trước';
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + ' giờ trước';
  const days = Math.floor(hours / 24);
  if (days < 7) return days + ' ngày trước';
  return new Date(date).toLocaleDateString('vi-VN');
}

// Số phút đọc ước tính (200 từ/phút), tối thiểu 1
function readingTime(text) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

module.exports = { initials, avatarColor, timeAgo, readingTime };
