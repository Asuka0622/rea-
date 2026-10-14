const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("ledger", {
  add: (entry) => ipcRenderer.invoke("ledger:add", entry),
  list: () => ipcRenderer.invoke("ledger:list"),
  sync: () => ipcRenderer.invoke("ledger:sync"),
});

// 没有出现在界面上的接口
contextBridge.exposeInMainWorld("helper", {
  peek: () => ipcRenderer.invoke("helper:peek-clipboard"),
});
