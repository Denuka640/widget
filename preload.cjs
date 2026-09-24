const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('widgetAPI', {
  moveWindowBy: (dx, dy) => {
    if (typeof dx !== 'number' || typeof dy !== 'number') return;
    ipcRenderer.send('widget:move', { dx: Math.round(dx), dy: Math.round(dy) });
  },
});