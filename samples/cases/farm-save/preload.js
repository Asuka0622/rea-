const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("farm", {
  state: () => ipcRenderer.invoke("farm:state"),
  sell: (crop) => ipcRenderer.invoke("farm:sell", crop),
  sleep: () => ipcRenderer.invoke("farm:sleep"),
});
