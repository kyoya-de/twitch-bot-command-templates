const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // Data operations
  loadData: () => ipcRenderer.invoke('load-data'),
  saveData: (data) => ipcRenderer.invoke('save-data', data),

  // Clipboard
  copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', text),

  // External links
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // Twitch API
  twitchGetToken: (clientId, clientSecret) => ipcRenderer.invoke('twitch-get-token', clientId, clientSecret),
  twitchSearch: (query, clientId) => ipcRenderer.invoke('twitch-search', query, clientId),
  twitchValidate: (clientId, clientSecret) => ipcRenderer.invoke('twitch-validate', clientId, clientSecret)
});

