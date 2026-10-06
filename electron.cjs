const { app, BrowserWindow, ipcMain, Menu, screen } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

// Ultra-low resource Chromium & V8 memory flags - keep only necessary runs
app.commandLine.appendSwitch('enable-low-end-device-mode');
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=64 --optimize-for-size');
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-breakpad');
app.commandLine.appendSwitch('disable-component-update');
app.commandLine.appendSwitch('disable-background-networking');
app.commandLine.appendSwitch('disable-speech-api');
app.commandLine.appendSwitch('renderer-process-limit', '1');
app.commandLine.appendSwitch('disable-http-cache');
app.commandLine.appendSwitch('disable-site-isolation-trials');

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

const isWin = process.platform === 'win32';
const appDir = __dirname;
const distPath = path.join(appDir, 'dist', 'index.html');
const hasBuiltApp = fs.existsSync(distPath);
const WIDGET_W = 440;
const WIDGET_H = 740;

let mainWindows = [];
let saveTimer = null;
let isPollingMedia = false;

const mediaScriptPath = fs.existsSync(path.join(appDir, 'scripts', 'get-media.ps1'))
  ? path.join(appDir, 'scripts', 'get-media.ps1')
  : path.join(appDir, 'get-media.ps1');

app.setName('DaylightWidget');

// Ensure the app automatically registers for Windows Startup on boot
function ensureAutoStartOnStartup() {
  if (!isWin) return;
  try {
    const loginItem = app.getLoginItemSettings();
    if (!loginItem.openAtLogin) {
      app.setLoginItemSettings({
        openAtLogin: true,
        path: process.execPath,
        args: ['--autostart'],
      });
    }
  } catch (err) {
    console.error('Failed to configure login item settings:', err);
  }
}

const configPath = path.join(app.getPath('userData'), 'config.json');

function loadState() {
  try {
    const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return cfg || {};
  } catch {
    return {};
  }
}

function saveStateNow() {
  clearTimeout(saveTimer);
  saveTimer = null;
  const states = loadState();
  let updated = false;
  for (const win of mainWindows) {
    if (win.isDestroyed() || !win._displayId) continue;
    const [x, y] = win.getPosition();
    const [width, height] = win.getSize();
    states[win._displayId] = { x, y, width, height };
    updated = true;
  }
  if (!updated) return;
  try {
    fs.writeFileSync(configPath, JSON.stringify(states), 'utf8');
  } catch {
    /* ignore */
  }
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveStateNow, 300);
}

function clampToScreens(x, y, w = WIDGET_W, h = WIDGET_H) {
  const displays = screen.getAllDisplays();
  if (!displays.length) return { x, y };
  const area = displays.reduce(
    (acc, d) => {
      const b = d.workArea;
      acc.minX = Math.min(acc.minX, b.x);
      acc.minY = Math.min(acc.minY, b.y);
      acc.maxX = Math.max(acc.maxX, b.x + b.width);
      acc.maxY = Math.max(acc.maxY, b.y + b.height);
      return acc;
    },
    { minX: 0, minY: 0, maxX: 1920, maxY: 1080 },
  );
  const nx = Math.min(Math.max(x, area.minX), area.maxX - w);
  const ny = Math.min(Math.max(y, area.minY), area.maxY - h);
  return { x: Math.round(nx), y: Math.round(ny) };
}

function pollLiveMedia() {
  if (!isWin || mainWindows.length === 0 || isPollingMedia) return;

  const activeWindows = mainWindows.filter(w => !w.isDestroyed() && w.isVisible() && !w.isMinimized());
  if (activeWindows.length === 0) return;

  isPollingMedia = true;

  const ps = spawn('powershell.exe', [
    '-NoLogo',
    '-NoProfile',
    '-NonInteractive',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    mediaScriptPath,
  ], { windowsHide: true });

  let out = '';
  let killed = false;

  const timer = setTimeout(() => {
    killed = true;
    try { ps.kill(); } catch {}
    isPollingMedia = false;
  }, 2500);

  ps.stdout.on('data', (d) => (out += d.toString()));

  ps.on('close', () => {
    clearTimeout(timer);
    isPollingMedia = false;
    if (killed) return;
    try {
      const trimmed = out.trim();
      if (trimmed) {
        const data = JSON.parse(trimmed);
        if (data) {
          mainWindows.forEach((win) => {
            if (!win.isDestroyed()) {
              win.webContents.send('media:live-update', data);
            }
          });
        }
      }
    } catch {
      /* ignore */
    }
  });

  ps.on('error', () => {
    clearTimeout(timer);
    isPollingMedia = false;
  });
}

function createWindow() {
  if (mainWindows.length > 0) return; // Ensure single window instance

  const saved = loadState();
  const primaryDisplay = screen.getPrimaryDisplay();
  const savedDisplayId = Object.keys(saved)[0];
  const targetDisplay = (savedDisplayId && screen.getAllDisplays().find(d => String(d.id) === String(savedDisplayId))) || primaryDisplay;

  const displaySaved = saved[targetDisplay.id];
  const defaultWidth = displaySaved && typeof displaySaved.width === 'number' ? displaySaved.width : WIDGET_W;
  const defaultHeight = displaySaved && typeof displaySaved.height === 'number' ? displaySaved.height : WIDGET_H;

  const defaultX = targetDisplay.workArea.x + Math.floor((targetDisplay.workArea.width - defaultWidth) / 2);
  const defaultY = targetDisplay.workArea.y + Math.floor((targetDisplay.workArea.height - defaultHeight) / 2);

  const initialX = displaySaved && typeof displaySaved.x === 'number' ? displaySaved.x : defaultX;
  const initialY = displaySaved && typeof displaySaved.y === 'number' ? displaySaved.y : defaultY;

  const pos = clampToScreens(initialX, initialY, defaultWidth, defaultHeight);

  const win = new BrowserWindow({
    width: defaultWidth,
    height: defaultHeight,
    x: pos.x,
    y: pos.y,
    minWidth: 360,
    minHeight: 480,
    frame: false,
    transparent: true,
    resizable: true,
    alwaysOnTop: false,
    skipTaskbar: true,
    focusable: true,
    minimizable: false, // Prevent window from being minimizable by OS
    type: 'toolbar', // Tool window type on Windows prevents Show Desktop (Win+D) / Minimize All (Win+M) from minimizing the widget
    hasShadow: false,
    show: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(appDir, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: true,
      spellcheck: false,
    },
  });

  win.setMinimizable(false);

  // Hook native Windows WM_SYSCOMMAND messages to suppress minimize (Win+D / Win+M / SC_MINIMIZE)
  if (isWin) {
    const WM_SYSCOMMAND = 0x0112;
    const SC_MINIMIZE = 0xF020;
    const SC_MAXIMIZE = 0xF030;
    win.hookWindowMessage(WM_SYSCOMMAND, (wParam) => {
      const wCmd = wParam & 0xFFF0;
      if (wCmd === SC_MINIMIZE || wCmd === SC_MAXIMIZE) {
        return true; // Block minimization and maximization attempts
      }
    });
  }

  // Fallback: If OS attempts minimize or hide, immediately restore and show window
  win.on('minimize', (e) => {
    e.preventDefault();
    if (!win.isDestroyed()) {
      win.restore();
      win.show();
    }
  });

  win.on('hide', () => {
    if (!win.isDestroyed() && !win.isVisible()) {
      win.show();
    }
  });

  win._displayId = targetDisplay.id;
  mainWindows.push(win);

  win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load page:', errorCode, errorDescription);
  });

  win.on('move', scheduleSave);
  win.on('resize', scheduleSave);
  win.on('close', () => {
    saveStateNow();
    mainWindows = mainWindows.filter(w => w !== win);
  });

  if (hasBuiltApp) {
    win.loadFile(distPath);
  } else {
    win.loadURL('http://localhost:5173');
  }

  win.webContents.on('context-menu', () => {
    if (win.isDestroyed()) return;
    const menu = Menu.buildFromTemplate([
      {
        label: 'Reset to center of screen',
        click: () => {
          const d = screen.getDisplayNearestPoint({ x: win.getPosition()[0], y: win.getPosition()[1] });
          win.setPosition(d.workArea.x + Math.floor((d.workArea.width - WIDGET_W) / 2), d.workArea.y + Math.floor((d.workArea.height - WIDGET_H) / 2));
          win.setSize(WIDGET_W, WIDGET_H);
          scheduleSave();
        },
      },
      { type: 'separator' },
      { label: 'Quit DaylightWidget', click: () => app.quit() },
    ]);
    menu.popup({ window: win });
  });

  win.once('ready-to-show', () => {
    if (win.isDestroyed()) return;
    win.show();
    win.focus();
  });
}

app.on('second-instance', () => {
  mainWindows.forEach(win => {
    if (win.isDestroyed()) return;
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  });
});

ipcMain.on('widget:move', (event, payload) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  const dx = Number(payload && payload.dx) || 0;
  const dy = Number(payload && payload.dy) || 0;
  const [x, y] = win.getPosition();
  const [w, h] = win.getSize();
  const p = clampToScreens(x + dx, y + dy, w, h);
  win.setPosition(p.x, p.y);
  scheduleSave();
});

ipcMain.on('media:control', (event, action) => {
  if (!isWin) return;
  const keyMap = { playpause: 179, next: 176, prev: 177 };
  const vk = keyMap[action];
  if (vk) {
    const psCmd = `(New-Object -ComObject WScript.Shell).SendKeys([char]${vk})`;
    spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psCmd], { windowsHide: true });
  }
});

ipcMain.on('settings:sync', (event, payload) => {
  mainWindows.forEach((win) => {
    if (!win.isDestroyed() && win.webContents !== event.sender) {
      win.webContents.send('settings:sync', payload);
    }
  });
});

ipcMain.handle('autostart:get', () => {
  try {
    return app.getLoginItemSettings().openAtLogin;
  } catch {
    return false;
  }
});

ipcMain.handle('autostart:set', (event, openAtLogin) => {
  try {
    app.setLoginItemSettings({
      openAtLogin: Boolean(openAtLogin),
      path: process.execPath,
      args: ['--autostart'],
    });
    return app.getLoginItemSettings().openAtLogin;
  } catch {
    return false;
  }
});

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.whenReady().then(() => {
    ensureAutoStartOnStartup();
    createWindow();

    // Live system media polling (5s interval to minimize CPU/runtime overhead)
    setInterval(pollLiveMedia, 5000);

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}