const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("weather", {
  now: (city) => ipcRenderer.invoke("weather:now", city),
  map: (city) => ipcRenderer.invoke("weather:map", city),
  placeholder: () => ipcRenderer.invoke("app:placeholder"),
});
