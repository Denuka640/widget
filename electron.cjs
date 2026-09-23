const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const appDir = __dirname;
const distPath = path.join(appDir, 'dist', 'index.html');
const hasBuiltApp = fs.existsSync(distPath);

function startViteServer() {
  const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const child = spawn(command, ['vite', '--host', '0.0.0.0'], {
    cwd: appDir,
    stdio: 'inherit',
    shell: true,
  });

  child.on('exit', (code) => {
    if (code !== 0) {
      console.error('Vite dev server exited unexpectedly.');
    }
  });

  return child;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 440,
    height: 520,
    minWidth: 280,
    minHeight: 360,
    frame: false,
    transparent: true,
    resizable: false,
    movable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: true,
    hasShadow: false,
    show: false,
    backgroundColor: '#00000000',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.setOpacity(0.98);

  if (hasBuiltApp) {
    win.loadFile(distPath);
  } else {
    startViteServer();
    win.loadURL('http://localhost:5173');
  }

  win.once('ready-to-show', () => {
    win.show();
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
