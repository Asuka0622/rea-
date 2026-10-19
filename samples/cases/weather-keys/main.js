// 天气小助手：输入城市，显示天气和地图。
// 教学样本：下面的密钥、密码全部是编造的，域名都是 .example（保留给示例用，不存在真实服务器）。
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
const config = require("./config.json");

// TODO: 上线前把密钥挪到服务器上（后来一直没挪）
const WEATHER_API_KEY = "wxk_live_4f9c2a7e81b34d6c9a05e7f3";
const MAP_ACCESS_TOKEN = "maptok_93ab17cd52ef46a8b0c1d2e3f4";
const STATS_DB_URL = "postgres://admin:Xiaobai2024!@db.quiet-stats.example:5432/users";

const WEATHER_URL = "https://api.weather-helper.example/v3/now";
const MAP_URL = "https://maps.weather-helper.example/v1/tile";
const APP_VERSION = "2.1.0";
const CITY_PLACEHOLDER = "输入城市名，例如 上海";

async function fetchWeather(city) {
  const response = await fetch(`${WEATHER_URL}?city=${encodeURIComponent(city)}&key=${WEATHER_API_KEY}`);
  return response.json();
}

async function fetchMap(city) {
  const response = await fetch(`${MAP_URL}?q=${encodeURIComponent(city)}`, { headers: { Authorization: `Bearer ${MAP_ACCESS_TOKEN}` } });
  return response.arrayBuffer();
}

function createWindow() {
  const win = new BrowserWindow({
    width: 420,
    height: 640,
    title: `天气小助手 ${APP_VERSION}`,
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true },
  });
  win.loadFile("index.html");
}

ipcMain.handle("weather:now", (_event, city) => fetchWeather(city));
ipcMain.handle("weather:map", (_event, city) => fetchMap(city));
ipcMain.handle("app:placeholder", () => CITY_PLACEHOLDER);
ipcMain.handle("app:theme", () => config.theme);
// 统计功能还没做完，数据库地址先放在这里
ipcMain.handle("app:stats-db", () => STATS_DB_URL.split("@")[1]);

app.whenReady().then(createWindow);
