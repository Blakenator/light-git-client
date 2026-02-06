const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronApi', {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  send: (channel, ...args) => ipcRenderer.send(channel, ...args),
  on: (channel, callback) => {
    const subscription = (event, ...args) => callback(event, ...args);
    ipcRenderer.on(channel, subscription);
    return subscription;
  },
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
});

contextBridge.exposeInMainWorld('setTheme', (theme) => {
  document.body.classList.remove('light-theme', 'dark-theme');
  document.body.classList.add(theme === 'dark' ? 'dark-theme' : 'light-theme');
});
