const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("harnessDesktop", {
  getState: () => ipcRenderer.invoke("sidecar:state"),
  retry: () => ipcRenderer.invoke("sidecar:retry"),
  update: () => ipcRenderer.invoke("sidecar:update"),
  restore: () => ipcRenderer.invoke("sidecar:restore"),
  enter: () => ipcRenderer.invoke("sidecar:enter"),
  chooseWorkspace: () => ipcRenderer.invoke("sidecar:chooseWorkspace"),
  setLocale: (locale) => ipcRenderer.invoke("desktop:setLocale", locale),
  onState: (listener) => {
    const wrapped = (_event, state) => listener(state);
    ipcRenderer.on("sidecar:state", wrapped);
    return () => ipcRenderer.removeListener("sidecar:state", wrapped);
  },
});
