const { app, BrowserWindow, ipcMain, Menu, screen } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const isWin = process.platform === 'win32';
const appDir = __dirname;
const distPath = path.join(appDir, 'dist', 'index.html');
const hasBuiltApp = fs.existsSync(distPath);
const WIDGET_W = 440;
const WIDGET_H = 520;

let mainWindow = null;
let saveTimer = null;

app.setName('DaylightWidget');

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

// Pins the widget window to the Windows desktop layer (inside Progman), so it
// floats over the wallpaper but stays BEHIND every other application window
// and behind the desktop icons. Uses the standard 0x052C / WorkerW technique.
const PIN_SCRIPT = String.raw`
param([long]$widgetHwnd)
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class DeskPin {
    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr FindWindow(string cls, string name);
    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr SendMessageTimeout(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam, uint fuFlags, uint uTimeout, out IntPtr lpdwResult);
    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool SetParent(IntPtr hWndChild, IntPtr hWndNewParent);
    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int x, int y, int cx, int cy, uint uFlags);
}
"@

$widget = [IntPtr]$widgetHwnd
$progman = [DeskPin]::FindWindow('Progman', $null)
if ($progman -eq [IntPtr]::Zero) {
    Write-Output 'NO_PROGMAN'
    exit 1
}

$out = [IntPtr]::Zero
$null = [DeskPin]::SendMessageTimeout($progman, 0x052C, [IntPtr]0x0000000D, [IntPtr]::Zero, 0x00000002, 1000, [ref]$out)
[void][DeskPin]::SetParent($widget, $progman)
[void][DeskPin]::SetWindowPos($widget, [IntPtr]1, 0, 0, 0, 0, 0x0003 -bor 0x0010)

Write-Output 'PINNED'
`;

function pinToDesktop(win) {
  return new Promise((resolve) => {
    if (!isWin) return resolve(false);
    const handleBuf = win.getNativeWindowHandle();
    if (!handleBuf || handleBuf.length < 4) return resolve(false);
    const hwnd = handleBuf.length >= 8 ? Number(handleBuf.readBigUInt64LE(0)) : handleBuf.readUInt32LE(0);

    const userData = app.getPath('userData');
    const scriptPath = path.join(userData, 'pin-to-desktop.ps1');
    try {
      fs.writeFileSync(scriptPath, PIN_SCRIPT, 'utf8');
    } catch {
      return resolve(false);
    }

    const ps = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, String(hwnd)], { windowsHide: true });
    let stdout = '';
    ps.stdout.on('data', (d) => (stdout += d.toString()));
    ps.on('error', () => resolve(false));
    ps.on('close', (code) => resolve(code === 0 && stdout.includes('PINNED')));
  });
}

const configPath = path.join(app.getPath('userData'), 'config.json');

function loadState() {
  try {
    const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (typeof cfg.x === 'number' && typeof cfg.y === 'number') return { x: cfg.x, y: cfg.y };
    return null;
  } catch {
    return null;
  }
}

function saveStateNow() {
  clearTimeout(saveTimer);
  saveTimer = null;
  if (!mainWindow) return;
  const [x, y] = mainWindow.getPosition();
  try {
    fs.writeFileSync(configPath, JSON.stringify({ x, y }), 'utf8');
  } catch {
    /* ignore */
  }
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveStateNow, 300);
}

function clampToScreens(x, y) {
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
  const nx = Math.min(Math.max(x, area.minX), area.maxX - WIDGET_W);
  const ny = Math.min(Math.max(y, area.minY), area.maxY - WIDGET_H);
  return { x: Math.round(nx), y: Math.round(ny) };
}

function createWindow() {
  const saved = loadState();

  mainWindow = new BrowserWindow({
    width: WIDGET_W,
    height: WIDGET_H,
    ...(saved ? { x: saved.x, y: saved.y } : {}),
    minWidth: WIDGET_W,
    minHeight: WIDGET_H,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: false,
    skipTaskbar: true,
    focusable: false,
    hasShadow: false,
    show: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(appDir, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.on('move', scheduleSave);
  mainWindow.on('close', saveStateNow);

  if (hasBuiltApp) {
    mainWindow.loadFile(distPath);
  } else {
    startViteServer();
    mainWindow.loadURL('http://localhost:5173');
  }

  mainWindow.webContents.on('context-menu', () => {
    if (!mainWindow) return;
    const menu = Menu.buildFromTemplate([
      { label: 'Reset to center of screen', click: () => mainWindow.center(), },
      { type: 'separator' },
      { label: 'Quit DaylightWidget', click: () => app.quit() },
    ]);
    menu.popup({ window: mainWindow });
  });

  let finalized = false;
  const finalizeShow = () => {
    if (finalized || !mainWindow) return;
    finalized = true;
    mainWindow.setAlwaysOnTop(false);
    mainWindow.showInactive();
  };

  const pinTimer = setTimeout(finalizeShow, 12000);

  mainWindow.once('ready-to-show', () => {
    if (isWin) {
      pinToDesktop(mainWindow)
        .then(() => {
          clearTimeout(pinTimer);
          finalizeShow();
        })
        .catch(() => finalizeShow());
    } else {
      clearTimeout(pinTimer);
      finalizeShow();
    }
  });
}

app.on('second-instance', () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.showInactive();
});

ipcMain.on('widget:move', (event, payload) => {
  if (!mainWindow) return;
  const dx = Number(payload && payload.dx) || 0;
  const dy = Number(payload && payload.dy) || 0;
  const [x, y] = mainWindow.getPosition();
  const p = clampToScreens(x + dx, y + dy);
  mainWindow.setPosition(p.x, p.y);
  scheduleSave();
});

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}