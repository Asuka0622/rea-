// 像素小镇·种田日记：种菜、卖菜、攒金币。
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
const { saveGame, loadGame } = require("./save.js");

const dataDir = __dirname;
let state = loadGame(dataDir);

function createWindow() {
  const win = new BrowserWindow({
    width: 640,
    height: 480,
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true },
  });
  win.loadFile("index.html");
}

ipcMain.handle("farm:state", () => state);
ipcMain.handle("farm:sell", (_event, crop) => {
  const count = state.crops[crop] || 0;
  state.gold += count * 12;
  state.crops[crop] = 0;
  return state;
});
ipcMain.handle("farm:sleep", () => {
  state.day += 1;
  saveGame(dataDir, state);
  return state;
});

app.whenReady().then(createWindow);
