require('dotenv').config();

const connectDB = require('./config/db');
const createApp = require('./app');

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nhom3_blog';
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret';

async function start() {
  try {
    await connectDB(MONGODB_URI);
  } catch (err) {
    console.error('Không kết nối được MongoDB. Đã bật mongod chưa?');
    console.error(err.message);
    process.exit(1);
  }

  const app = createApp({ mongoUri: MONGODB_URI, sessionSecret: SESSION_SECRET });
  app.listen(PORT, () => {
    console.log(`Server chạy tại http://localhost:${PORT}`);
  });
}

start();
