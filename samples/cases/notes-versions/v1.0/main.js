// 随手便签 1.0：写便签、自动保存、导出为文本。
const { app, BrowserWindow, ipcMain } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

let notes = [];

function createWindow() {
  const win = new BrowserWindow({
    width: 360,
    height: 520,
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true },
  });
  win.loadFile("index.html");
}

ipcMain.handle("notes:list", () => notes);
ipcMain.handle("notes:add", (_event, text) => {
  notes.push({ text, at: Date.now() });
  return notes;
});
ipcMain.handle("notes:export-txt", (_event, file) => fs.writeFileSync(file, notes.map((n) => n.text).join("\n")));

app.whenReady().then(createWindow);
