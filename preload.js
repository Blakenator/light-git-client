const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronApi', {
  invoke: (channel, ...props) => ipcRenderer.invoke(channel, ...props),
  on: (channel, callback) => ipcRenderer.on(channel, callback),
  send: (channel, ...props) => ipcRenderer.send(channel, ...props),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
});
