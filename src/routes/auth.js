const express = require('express');
const bcrypt = require('bcryptjs');
const { userOps } = require('../config/database');
const { generateToken, authMiddleware } = require('../middleware/auth');
const { wechatLogin } = require('../services/wechatService');

const router = express.Router();

// 注册
router.post('/register', async (req, res) => {
  try {
    const { username, password, nickname } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: '密码至少6位' });
    }

    // 检查用户是否已存在
    const existingUser = await userOps.findByUsername(username);
    if (existingUser) {
      return res.status(400).json({ error: '用户名已存在' });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户
    const user = await userOps.create({
      username,
      password: hashedPassword,
      nickname: nickname || username
    });

    // 生成 token
    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    console.error('注册错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    // 查找用户
    const user = await userOps.findByUsername(username);
    if (!user) {
      return res.status(400).json({ error: '用户名或密码错误' });
    }

    // 验证密码
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(400).json({ error: '用户名或密码错误' });
    }

    // 生成 token
    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    console.error('登录错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 微信手机号登录
router.post('/wechat-login', async (req, res) => {
  try {
    const { code, encryptedData, iv } = req.body;

    if (!code || !encryptedData || !iv) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    // 1. 获取微信用户信息
    const wechatInfo = await wechatLogin(code, encryptedData, iv);
    const { openid, phoneNumber } = wechatInfo;

    // 2. 查询用户是否存在
    let user = await userOps.findByPhone(phoneNumber);

    // 3. 不存在则自动注册
    if (!user) {
      user = await userOps.create({
        username: `user_${phoneNumber.slice(-4)}`,
        phone: phoneNumber,
        wechatOpenid: openid,
        nickname: `用户${phoneNumber.slice(-4)}`
      });
    } else if (!user.wechatOpenid) {
      // 已有手机号用户，绑定微信
      user.wechatOpenid = openid;
      // 需要更新用户，这里简化处理
    }

    // 4. 生成 token
    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        phone: user.phone,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    console.error('微信登录错误:', err);
    res.status(500).json({ error: err.message || '微信登录失败' });
  }
});

// 获取用户信息
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await userOps.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json({
      userId: user.id,
      username: user.username,
      nickname: user.nickname
    });
  } catch (err) {
    console.error('获取用户信息错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
