// 像素计算器：免费版只能加减乘除，专业版多了科学计算。
// 教学样本：开发者在里面留了几个只有自己知道的入口。
const { app, BrowserWindow, ipcMain, globalShortcut } = require("electron");
const path = require("node:path");

let win;
let license = { pro: false };

function createWindow() {
  win = new BrowserWindow({
    width: 320,
    height: 480,
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true },
  });
  win.loadFile("index.html");
}

ipcMain.handle("calc:license", () => license);
ipcMain.handle("calc:buy-pro", () => ({ url: "https://shop.pixel-calc.example/pro" }));
ipcMain.handle("calc:history", () => []);
// 测试用：不用付钱直接打开专业版（发布前忘了删）
ipcMain.handle("debug:unlock-pro", () => {
  license = { pro: true };
  return license;
});

app.whenReady().then(() => {
  createWindow();
  // 开发者自己用的：按下组合键打开调试工具
  globalShortcut.register("CommandOrControl+Shift+D", () => win.webContents.openDevTools());
});
