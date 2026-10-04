const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('widgetAPI', {
  moveWindowBy: (dx, dy) => {
    if (typeof dx !== 'number' || typeof dy !== 'number') return;
    ipcRenderer.send('widget:move', { dx: Math.round(dx), dy: Math.round(dy) });
  },
  sendMediaControl: (action) => {
    if (typeof action === 'string') {
      ipcRenderer.send('media:control', action);
    }
  },
  onLiveMediaUpdate: (callback) => {
    ipcRenderer.on('media:live-update', (event, data) => callback(data));
  },
  syncSettings: (settings) => {
    ipcRenderer.send('settings:sync', settings);
  },
  onSettingsSync: (callback) => {
    ipcRenderer.on('settings:sync', (event, data) => callback(data));
  },
  getAutoStart: () => ipcRenderer.invoke('autostart:get'),
  setAutoStart: (enabled) => ipcRenderer.invoke('autostart:set', enabled),
});