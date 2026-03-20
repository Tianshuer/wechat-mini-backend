const express = require('express');
const { historyOps } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 所有历史记录接口需要登录
router.use(authMiddleware);

// 获取搜索历史
router.get('/', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;
    const history = await historyOps.findByUser(req.userId, limit);
    const list = history.map(h => ({
      id: h.id,
      cityCode: h.cityCode,
      cityName: h.cityName,
      searchDate: h.searchDate,
      createdAt: h.createdAt
    }));
    res.json({ list });
  } catch (err) {
    console.error('获取历史错误:', err);
    res.status(500).json({ error: '获取历史记录失败' });
  }
});

// 清空搜索历史
router.delete('/', async (req, res) => {
  try {
    await historyOps.clear(req.userId);
    res.json({ success: true });
  } catch (err) {
    console.error('清空历史错误:', err);
    res.status(500).json({ error: '清空历史记录失败' });
  }
});

module.exports = router;
