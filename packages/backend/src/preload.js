const { contextBridge, ipcRenderer } = require('electron');
const { registerElectronApiBridge } = require('@superflag/super-ipc-preloader');

// Register the super-ipc bridge (exposes invoke, on, removeListener)
registerElectronApiBridge(contextBridge, ipcRenderer);

// Keep setTheme separate (not part of IPC)
contextBridge.exposeInMainWorld('setTheme', (theme) => {
  document.body.classList.remove('light-theme', 'dark-theme');
  document.body.classList.add(theme === 'dark' ? 'dark-theme' : 'light-theme');
});
