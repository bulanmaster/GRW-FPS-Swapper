const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  closeWindow: () => ipcRenderer.send('close-window'),
  pickFolder: () => ipcRenderer.invoke('dialog:pick-folder'),
  applySettings: (desired) => ipcRenderer.invoke('apply-settings', desired),
  loadState: () => ipcRenderer.invoke('load-state'),
  saveCurrent: (currentSnapshot) => ipcRenderer.invoke('save-current', currentSnapshot),
  verifyOriginals: (gamePath) => ipcRenderer.invoke('verify-originals', gamePath),
  getAvailableVersions: () => ipcRenderer.invoke('get-available-versions'),
  openExternal: (url) => ipcRenderer.send('open-external', url),
  openModFolder: () => ipcRenderer.send('open-mod-folder'),
  getFilePath: (file) => webUtils.getPathForFile(file),
  copyToModFolder: (paths) => ipcRenderer.invoke('copy-to-mod-folder', paths),
  onGameRunningChange: (cb) => ipcRenderer.on('game-running-changed', (_e, val) => cb(val)),
});
