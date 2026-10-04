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
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('media:live-update', handler);
    return () => {
      ipcRenderer.removeListener('media:live-update', handler);
    };
  },
  syncSettings: (settings) => {
    ipcRenderer.send('settings:sync', settings);
  },
  onSettingsSync: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('settings:sync', handler);
    return () => {
      ipcRenderer.removeListener('settings:sync', handler);
    };
  },
  getAutoStart: () => ipcRenderer.invoke('autostart:get'),
  setAutoStart: (enabled) => ipcRenderer.invoke('autostart:set', enabled),
});