const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const Store = require("electron-store");
const store = new Store();

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 600,
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true },
  });
  win.loadFile("index.html");
}

ipcMain.handle("notes:list", () => store.get("notes", []));
ipcMain.handle("notes:save", (_event, note) => {
  const notes = store.get("notes", []);
  notes.push(note);
  store.set("notes", notes);
  return notes.length;
});
ipcMain.handle("notes:export", (_event, file) => fs.writeFileSync(file, JSON.stringify(store.get("notes", []))));

app.whenReady().then(createWindow);
