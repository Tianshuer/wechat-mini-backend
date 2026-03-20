const https = require('https');
const crypto = require('crypto');

const APP_ID = process.env.WECHAT_APPID || 'wxd71fc749589ba8a9';
const APP_SECRET = process.env.WECHAT_SECRET || '9c389566e6950c6fb9dcd9a7d04b9806';

// 发送 HTTP 请求
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// 获取 session_key
async function getSessionKey(code) {
  const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${APP_ID}&secret=${APP_SECRET}&js_code=${code}&grant_type=authorization_code`;
  const data = await httpsGet(url);

  if (data.errcode) {
    throw new Error(`微信登录失败: ${data.errmsg}`);
  }

  return data;
}

// 解密手机号
function decryptPhoneNumber(sessionKey, encryptedData, iv) {
  try {
    // Base64 解码
    const sessionKeyBuffer = Buffer.from(sessionKey, 'base64');
    const encryptedDataBuffer = Buffer.from(encryptedData, 'base64');
    const ivBuffer = Buffer.from(iv, 'base64');

    // 解密
    const decipher = crypto.createDecipheriv('aes-128-cbc', sessionKeyBuffer, ivBuffer);
    let decrypted = decipher.update(encryptedDataBuffer, null, 'utf8');
    decrypted += decipher.final('utf8');

    const data = JSON.parse(decrypted);
    return data.phoneNumber;
  } catch (e) {
    console.error('解密手机号失败:', e);
    throw new Error('解密手机号失败');
  }
}

// 微信手机号登录
async function wechatLogin(code, encryptedData, iv) {
  // 1. 获取 session_key 和 openid
  const sessionData = await getSessionKey(code);
  const { session_key, openid } = sessionData;

  // 2. 解密手机号
  const phoneNumber = decryptPhoneNumber(session_key, encryptedData, iv);

  return {
    openid,
    phoneNumber
  };
}

module.exports = {
  wechatLogin,
  getSessionKey
};
