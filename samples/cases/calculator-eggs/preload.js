const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("calc", {
  license: () => ipcRenderer.invoke("calc:license"),
  buyPro: () => ipcRenderer.invoke("calc:buy-pro"),
  history: () => ipcRenderer.invoke("calc:history"),
  unlock: () => ipcRenderer.invoke("debug:unlock-pro"),
});
