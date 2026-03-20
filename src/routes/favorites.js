const express = require('express');
const { favoriteOps } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 所有收藏接口需要登录
router.use(authMiddleware);

// 获取收藏列表
router.get('/', async (req, res) => {
  try {
    const favorites = await favoriteOps.findByUser(req.userId);
    const list = favorites.map(f => ({
      id: f.id,
      cityCode: f.cityCode,
      cityName: f.cityName,
      createdAt: f.createdAt
    }));
    res.json({ list });
  } catch (err) {
    console.error('获取收藏错误:', err);
    res.status(500).json({ error: '获取收藏列表失败' });
  }
});

// 添加收藏
router.post('/', async (req, res) => {
  try {
    const { cityCode, cityName } = req.body;

    if (!cityCode || !cityName) {
      return res.status(400).json({ error: '城市信息不完整' });
    }

    const favorite = await favoriteOps.add(req.userId, cityCode, cityName);
    res.json({
      id: favorite.id,
      cityCode: favorite.cityCode,
      cityName: favorite.cityName,
      createdAt: favorite.createdAt
    });
  } catch (err) {
    console.error('添加收藏错误:', err);
    res.status(500).json({ error: '添加收藏失败' });
  }
});

// 删除收藏
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const success = await favoriteOps.remove(id, req.userId);

    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: '收藏不存在' });
    }
  } catch (err) {
    console.error('删除收藏错误:', err);
    res.status(500).json({ error: '删除收藏失败' });
  }
});

module.exports = router;
