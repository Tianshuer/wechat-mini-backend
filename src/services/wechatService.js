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

// 发送 POST 请求
function httpsPost(url, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(JSON.stringify(postData));
    req.end();
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

// 微信手机号登录 (新版本)
async function wechatLogin(code) {
  // 1. 获取 access_token
  const tokenUrl = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APP_ID}&secret=${APP_SECRET}`;
  const tokenData = await httpsGet(tokenUrl);

  if (tokenData.errcode) {
    throw new Error(`获取access_token失败: ${tokenData.errmsg}`);
  }

  const accessToken = tokenData.access_token;

  // 2. 通过 code 获取手机号
  const phoneUrl = `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${accessToken}`;
  const phoneData = await httpsPost(phoneUrl, { code });

  if (phoneData.errcode) {
    throw new Error(`获取手机号失败: ${phoneData.errmsg} (errcode: ${phoneData.errcode})`);
  }

  return {
    openid: '', // 新接口不返回 openid，通过 code 换手机号时不需要
    phoneNumber: phoneData.phone_info.phoneNumber
  };
}

module.exports = {
  wechatLogin,
  getSessionKey
};
