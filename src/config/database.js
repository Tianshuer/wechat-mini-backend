const path = require('path');
const fs = require('fs');

// 使用 lowdb
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');

const dbPath = path.join(__dirname, '../../data/db.json');

// 确保 data 目录存在
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 默认数据结构
const defaultData = {
  users: [],
  favorites: [],
  history: []
};

// 创建数据库实例
const adapter = new JSONFile(dbPath);
const db = new Low(adapter, defaultData);

// 初始化数据库
async function initDB() {
  await db.read();
  if (!db.data) {
    db.data = defaultData;
    await db.write();
  }
  console.log('数据库初始化完成');
}

// 用户相关操作
const userOps = {
  findByUsername: async (username) => {
    await db.read();
    return db.data.users.find(u => u.username === username);
  },

  findById: async (id) => {
    await db.read();
    return db.data.users.find(u => u.id === id);
  },

  findByPhone: async (phone) => {
    await db.read();
    return db.data.users.find(u => u.phone === phone);
  },

  findByWechat: async (openid) => {
    await db.read();
    return db.data.users.find(u => u.wechatOpenid === openid);
  },

  create: async (user) => {
    await db.read();
    const id = db.data.users.length > 0
      ? Math.max(...db.data.users.map(u => u.id)) + 1
      : 1;
    const newUser = { ...user, id, createdAt: new Date().toISOString() };
    db.data.users.push(newUser);
    await db.write();
    return newUser;
  }
};

// 收藏相关操作
const favoriteOps = {
  findByUser: async (userId) => {
    await db.read();
    return db.data.favorites.filter(f => f.userId === userId);
  },

  add: async (userId, cityCode, cityName) => {
    await db.read();
    // 检查是否已存在
    const exists = db.data.favorites.find(
      f => f.userId === userId && f.cityCode === cityCode
    );
    if (exists) return exists;

    const id = db.data.favorites.length > 0
      ? Math.max(...db.data.favorites.map(f => f.id)) + 1
      : 1;
    const favorite = {
      id,
      userId,
      cityCode,
      cityName,
      createdAt: new Date().toISOString()
    };
    db.data.favorites.push(favorite);
    await db.write();
    return favorite;
  },

  remove: async (id, userId) => {
    await db.read();
    const index = db.data.favorites.findIndex(f => f.id === id && f.userId === userId);
    if (index > -1) {
      db.data.favorites.splice(index, 1);
      await db.write();
      return true;
    }
    return false;
  }
};

// 历史记录相关操作
const historyOps = {
  findByUser: async (userId, limit = 20) => {
    await db.read();
    const userHistory = db.data.history
      .filter(h => h.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
    return userHistory;
  },

  add: async (userId, cityCode, cityName) => {
    await db.read();
    const id = db.data.history.length > 0
      ? Math.max(...db.data.history.map(h => h.id)) + 1
      : 1;
    const history = {
      id,
      userId,
      cityCode,
      cityName,
      searchDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    };
    db.data.history.push(history);
    await db.write();
    return history;
  },

  clear: async (userId) => {
    await db.read();
    db.data.history = db.data.history.filter(h => h.userId !== userId);
    await db.write();
    return true;
  }
};

module.exports = {
  db,
  initDB,
  userOps,
  favoriteOps,
  historyOps
};
