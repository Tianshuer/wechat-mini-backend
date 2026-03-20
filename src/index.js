require('dotenv').config();
const app = require('./app');
const { initDB } = require('./config/database');

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    // 初始化数据库
    await initDB();

    // 启动服务器
    app.listen(PORT, () => {
      console.log(`✅ 后端服务已启动: http://localhost:${PORT}`);
      console.log(`📡 API 地址: http://localhost:${PORT}/api`);
    });
  } catch (err) {
    console.error('启动失败:', err);
    process.exit(1);
  }
}

start();
