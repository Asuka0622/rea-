const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("notes", {
  list: () => ipcRenderer.invoke("notes:list"),
  save: (note) => ipcRenderer.invoke("notes:save", note),
  exportTo: (file) => ipcRenderer.invoke("notes:export", file),
});
