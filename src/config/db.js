const mongoose = require('mongoose');

// Kết nối MongoDB local. MongoDB server phải được bật trước (mongod).
async function connectDB(uri) {
  await mongoose.connect(uri);
  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
}

module.exports = connectDB;
