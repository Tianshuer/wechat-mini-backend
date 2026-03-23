const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const weatherRoutes = require('./routes/weather');
const favoritesRoutes = require('./routes/favorites');
const historyRoutes = require('./routes/history');
const tripsRoutes = require('./routes/trips');

const app = express();

// 中间件
app.use(cors());
app.use(express.json());

// 根路径
app.get('/', (req, res) => {
  res.json({ message: '天气伴旅 API 服务', version: '1.0.0' });
});

// 请求日志
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/trips', tripsRoutes);

// 404 处理
app.use((req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ error: '服务器内部错误' });
});

module.exports = app;
