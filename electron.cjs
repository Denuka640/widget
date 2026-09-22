const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 460,
    height: 560,
    minWidth: 320,
    minHeight: 420,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: true,
    hasShadow: false,
    backgroundColor: '#00000000',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.setAlwaysOnTop(true, 'screen-saver');
  win.loadURL(isDev ? 'http://localhost:5173' : `file://${path.join(__dirname, 'dist/index.html')}`);
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.show();

  win.webContents.on('did-fail-load', () => {
    if (!isDev) return;
    console.log('Failed to load app, continuing...');
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
