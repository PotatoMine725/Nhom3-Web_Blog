require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const User = require('../src/models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nhom3_blog';

// Nâng một user đã đăng ký lên admin: npm run create-admin -- <email>
async function main() {
  const emailArg = process.argv[2];
  if (!emailArg) {
    console.error('Cách dùng: npm run create-admin -- <email>');
    process.exitCode = 1;
    return;
  }

  await connectDB(MONGODB_URI);
  try {
    const user = await User.findOne({ email: emailArg.trim().toLowerCase() });
    if (!user) {
      console.error(`Không tìm thấy user với email ${emailArg}`);
      process.exitCode = 1;
    } else if (user.role === 'admin') {
      console.log(`${user.username} đã là admin`);
    } else {
      user.role = 'admin';
      await user.save();
      console.log(`Đã nâng ${user.username} lên admin`);
    }
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
