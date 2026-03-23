const express = require('express');
const { tripOps } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 配置行程最大天数
const MAX_TRIP_DAYS = 7;

// 获取当前用户的行程
router.get('/', authMiddleware, async (req, res) => {
  try {
    const trip = await tripOps.findByUser(req.userId);
    res.json({ trip });
  } catch (err) {
    console.error('获取行程错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 创建行程
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate, days } = req.body;

    if (!startDate || !endDate || !days || !Array.isArray(days)) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    // 验证日期范围
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dayCount = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    if (dayCount < 1) {
      return res.status(400).json({ error: '结束日期不能早于开始日期' });
    }

    if (dayCount > MAX_TRIP_DAYS) {
      return res.status(400).json({ error: `行程最多支持${MAX_TRIP_DAYS}天` });
    }

    // 验证每天的城市数据
    if (days.length !== dayCount) {
      return res.status(400).json({ error: '城市数量与日期天数不匹配' });
    }

    for (const day of days) {
      if (!day.date || !day.cityName || !day.cityCode) {
        return res.status(400).json({ error: '每天的城市信息不完整' });
      }
    }

    // 先删除旧行程
    const oldTrip = await tripOps.findByUser(req.userId);
    if (oldTrip) {
      await tripOps.delete(oldTrip.id, req.userId);
    }

    // 创建新行程
    const trip = await tripOps.create(req.userId, {
      startDate,
      endDate,
      days
    });

    res.json({ trip });
  } catch (err) {
    console.error('创建行程错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 更新行程
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, days } = req.body;

    if (!startDate || !endDate || !days || !Array.isArray(days)) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const trip = await tripOps.update(parseInt(id), req.userId, {
      startDate,
      endDate,
      days
    });

    if (!trip) {
      return res.status(404).json({ error: '行程不存在' });
    }

    res.json({ trip });
  } catch (err) {
    console.error('更新行程错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 删除行程
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const success = await tripOps.delete(parseInt(id), req.userId);

    if (!success) {
      return res.status(404).json({ error: '行程不存在' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('删除行程错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
