const express = require('express');
const weatherService = require('../services/weatherService');
const { historyOps } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 搜索城市
router.get('/search', async (req, res) => {
  try {
    const { location } = req.query;

    if (!location) {
      return res.status(400).json({ error: '请提供城市名称' });
    }

    const results = await weatherService.searchLocation(location);
    res.json({ list: results });
  } catch (err) {
    console.error('搜索城市错误:', err);
    res.status(500).json({ error: '获取城市列表失败' });
  }
});

// 获取实时天气
router.get('/current', async (req, res) => {
  try {
    const { location } = req.query;

    if (!location) {
      return res.status(400).json({ error: '请提供城市名称' });
    }

    // 先搜索城市获取坐标
    const cities = await weatherService.searchLocation(location);
    if (cities.length === 0) {
      return res.status(404).json({ error: '未找到该城市' });
    }

    const city = cities[0];
    const weather = await weatherService.getCurrentWeather(city.code);

    // 使用搜索结果中的城市名称
    weather.cityName = city.name;
    weather.cityCode = city.code;

    // 如果用户已登录，记录搜索历史
    const userId = req.headers.authorization ? req.userId : null;
    if (userId) {
      try {
        await historyOps.add(userId, city.code, city.name);
      } catch (e) {
        console.error('记录历史失败:', e);
      }
    }

    res.json(weather);
  } catch (err) {
    console.error('获取天气错误:', err);
    res.status(500).json({ error: '获取天气失败' });
  }
});

// 获取天气预报
router.get('/forecast', async (req, res) => {
  try {
    const { location, days } = req.query;

    if (!location) {
      return res.status(400).json({ error: '请提供城市名称' });
    }

    // 先搜索城市获取坐标
    const cities = await weatherService.searchLocation(location);
    if (cities.length === 0) {
      return res.status(404).json({ error: '未找到该城市' });
    }

    const city = cities[0];
    const forecastDays = days ? parseInt(days) : 7;
    const forecast = await weatherService.getForecast(city.code, forecastDays);

    // 使用搜索结果中的城市名称
    forecast.cityName = city.name;
    forecast.cityCode = city.code;

    res.json(forecast);
  } catch (err) {
    console.error('获取预报错误:', err);
    res.status(500).json({ error: '获取天气预报失败' });
  }
});

module.exports = router;
