const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("notes", {
  list: () => ipcRenderer.invoke("notes:list"),
  add: (text) => ipcRenderer.invoke("notes:add", text),
  pin: (index) => ipcRenderer.invoke("notes:pin", index),
});
