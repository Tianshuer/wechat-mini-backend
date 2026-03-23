const express = require('express');
const bcrypt = require('bcryptjs');
const { userOps } = require('../config/database');
const { generateToken, authMiddleware } = require('../middleware/auth');
const { wechatLogin } = require('../services/wechatService');

const router = express.Router();

// 验证码存储（内存存储，生产环境建议用 Redis）
// phone -> { code, expiresAt }
const verifyCodes = new Map();

// 生成6位验证码
const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

// 发送短信验证码（模拟模式）
router.post('/send-sms', async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ error: '手机号不能为空' });
    }

    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ error: '手机号格式不正确' });
    }

    // 检查是否频繁发送（1分钟内只能发一次）
    const existing = verifyCodes.get(phone);
    if (existing && existing.expiresAt > Date.now() - 60 * 1000) {
      return res.status(400).json({ error: '发送过于频繁，请稍后再试' });
    }

    // 生成验证码
    const code = generateCode();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5分钟有效

    // 存储验证码
    verifyCodes.set(phone, { code, expiresAt });

    // 模拟发送短信（实际项目中调用短信平台API）
    console.log(`[短信验证码] 手机号: ${phone}, 验证码: ${code}`);

    res.json({
      success: true,
      message: '验证码已发送',
      code: code // 开发测试用，生产环境请删除
    });
  } catch (err) {
    console.error('发送验证码错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 短信验证码登录
router.post('/sms-login', async (req, res) => {
  try {
    const { phone, code } = req.body;

    if (!phone || !code) {
      return res.status(400).json({ error: '手机号和验证码不能为空' });
    }

    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ error: '手机号格式不正确' });
    }

    // 验证验证码
    const stored = verifyCodes.get(phone);
    if (!stored) {
      return res.status(400).json({ error: '请先获取验证码' });
    }

    if (stored.expiresAt < Date.now()) {
      verifyCodes.delete(phone);
      return res.status(400).json({ error: '验证码已过期，请重新获取' });
    }

    if (stored.code !== code) {
      return res.status(400).json({ error: '验证码错误' });
    }

    // 验证成功，删除验证码
    verifyCodes.delete(phone);

    // 查询或创建用户
    let user = await userOps.findByPhone(phone);

    if (!user) {
      // 自动注册用户
      user = await userOps.create({
        username: `user_${phone.slice(-4)}`,
        phone: phone,
        nickname: `用户${phone.slice(-4)}`
      });
    }

    // 生成 token
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
    console.error('短信登录错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

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
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    // 1. 获取微信用户信息
    const wechatInfo = await wechatLogin(code);
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
