const https = require('https');

// 天气代码映射 (WMO Weather interpretation codes)
const WEATHER_CODES = {
  0: '晴',
  1: '晴间多云',
  2: '多云',
  3: '阴',
  45: '雾',
  48: '雾',
  51: '小毛毛雨',
  53: '中毛毛雨',
  55: '大毛毛雨',
  56: '冻毛毛雨',
  57: '强冻毛毛雨',
  61: '小雨',
  63: '中雨',
  65: '大雨',
  66: '小冻雨',
  67: '大冻雨',
  71: '小雪',
  73: '中雪',
  75: '大雪',
  77: '雪粒',
  80: '小阵雨',
  81: '中阵雨',
  82: '大阵雨',
  85: '小阵雪',
  86: '大阵雪',
  95: '雷暴',
  96: '雷暴加小冰雹',
  99: '雷暴加大冰雹'
};

// 风向映射
const WIND_DIR = {
  N: '北风',
  NE: '东北风',
  E: '东风',
  SE: '东南风',
  S: '南风',
  SW: '西南风',
  W: '西风',
  NW: '西北风'
};

function getWindDirection(degree) {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(degree / 45) % 8;
  return WIND_DIR[directions[index]] || `${Math.round(degree)}°`;
}

function getWindScale(speed) {
  if (speed < 1) return '0';
  if (speed < 6) return '1';
  if (speed < 12) return '2';
  if (speed < 20) return '3';
  if (speed < 29) return '4';
  if (speed < 39) return '5';
  if (speed < 50) return '6';
  if (speed < 62) return '7';
  if (speed < 75) return '8';
  if (speed < 89) return '9';
  return '10';
}

// 发送 HTTP 请求
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
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
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('请求超时'));
    });
  });
}

// 搜索城市
async function searchLocation(location) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=10&language=zh&format=json`;

  const data = await httpsGet(url);

  if (!data.results || data.results.length === 0) {
    return [];
  }

  return data.results.map(city => ({
    code: `${city.latitude},${city.longitude}`,
    name: city.name,
    country: city.country,
    admin1: city.admin1
  }));
}

// 获取实时天气
async function getCurrentWeather(location) {
  const [latitude, longitude] = location.split(',');

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m,relative_humidity_2m,surface_pressure`;

  const data = await httpsGet(url);

  const current = data.current;

  return {
    cityCode: location,
    cityName: location, // 需要通过反向地理编码获取城市名，这里先用坐标
    current: {
      temp: Math.round(current.temperature_2m),
      text: WEATHER_CODES[current.weather_code] || '未知',
      code: current.weather_code,
      windDir: getWindDirection(current.wind_direction_10m),
      windScale: getWindScale(current.wind_speed_10m),
      humidity: current.relative_humidity_2m,
      pressure: current.surface_pressure,
      obsTime: current.time
    }
  };
}

// 获取天气预报
async function getForecast(location, days = 7) {
  const [latitude, longitude] = location.split(',');

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min,wind_direction_10m_dominant,wind_speed_10m_max,relative_humidity_2m_max,precipitation_sum&timezone=auto&forecast_days=${days}`;

  const data = await httpsGet(url);

  const daily = data.daily;

  const dailyData = daily.time.map((date, index) => ({
    date,
    codeDay: daily.weather_code[index],
    textDay: WEATHER_CODES[daily.weather_code[index]] || '未知',
    tempMax: Math.round(daily.temperature_2m_max[index]),
    tempMin: Math.round(daily.temperature_2m_min[index]),
    windDirDay: getWindDirection(daily.wind_direction_10m_dominant[index]),
    windScaleDay: getWindScale(daily.wind_speed_10m_max[index]),
    humidity: daily.relative_humidity_2m_max[index] || 0,
    precip: daily.precipitation_sum[index] || 0
  }));

  return {
    cityCode: location,
    cityName: location,
    daily: dailyData
  };
}

// 反向地理编码获取城市名称
async function getCityName(location) {
  const [latitude, longitude] = location.split(',');

  const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&language=zh`;

  try {
    const data = await httpsGet(url);
    return data.address.city || data.address.town || data.address.village || data.display_name.split(',')[0];
  } catch (e) {
    return location;
  }
}

module.exports = {
  searchLocation,
  getCurrentWeather,
  getForecast,
  getCityName,
  WEATHER_CODES
};
