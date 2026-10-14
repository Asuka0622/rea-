const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("notes", {
  list: () => ipcRenderer.invoke("notes:list"),
  add: (text) => ipcRenderer.invoke("notes:add", text),
  exportTxt: (file) => ipcRenderer.invoke("notes:export-txt", file),
});
