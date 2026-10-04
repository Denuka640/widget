const { app, BrowserWindow, ipcMain, Menu, screen } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

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
    states[win._displayId] = { x, y };
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

// Live Windows Media Transport Controls (GSMTC Multi-Session & Window Title Engine)
const GSMTC_SCRIPT = String.raw`
[cmdletbinding()]
param()

$list = @()

try {
    [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime] | Out-Null
    $asyncOp = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()
    $i = 0
    while ($asyncOp.Status -eq 'Started' -and $i -lt 15) { Start-Sleep -Milliseconds 40; $i++ }
    if ($asyncOp.Status -eq 'Completed') {
        $mgr = $asyncOp.GetResults()
        if ($mgr) {
            $sessions = $mgr.GetSessions()
            foreach ($s in $sessions) {
                $op = $s.TryGetMediaPropertiesAsync()
                $j = 0
                while ($op.Status -eq 'Started' -and $j -lt 15) { Start-Sleep -Milliseconds 40; $j++ }
                if ($op.Status -eq 'Completed') {
                    $p = $op.GetResults()
                    $pb = $s.GetPlaybackInfo()
                    if ($p -and ($p.Title -or $p.Artist)) {
                        $list += [PSCustomObject]@{
                            title = [string]$p.Title
                            artist = if ([string]$p.Artist) { [string]$p.Artist } else { [string]$p.AlbumArtist }
                            app = [string]$s.SourceAppUserModelId
                            status = if ($pb) { [string]$pb.PlaybackStatus.ToString() } else { "Playing" }
                        }
                    }
                }
            }
        }
    }
} catch {}

$spotify = Get-Process Spotify -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -ne "" -and $_.MainWindowTitle -ne "Spotify" -and $_.MainWindowTitle -ne "Spotify Premium" -and $_.MainWindowTitle -ne "Spotify Free" } | Select-Object -First 1
if ($spotify) {
    $parts = $spotify.MainWindowTitle -split " - ", 2
    $spTitle = if ($parts.Count -ge 2) { $parts[1].Trim() } else { $spotify.MainWindowTitle.Trim() }
    $spArtist = if ($parts.Count -ge 2) { $parts[0].Trim() } else { "Spotify" }
    
    $exists = $list | Where-Object { $_.title -eq $spTitle }
    if (-not $exists) {
        $list += [PSCustomObject]@{
            title = $spTitle
            artist = $spArtist
            app = "Spotify"
            status = "Playing"
        }
    }
}

$browsers = Get-Process chrome, msedge, vlc, Music.UI, AppleMusic, foobar2000 -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like "* - *" }
foreach ($b in $browsers) {
    $cleanTitle = $b.MainWindowTitle -replace " - Google Chrome$", "" -replace " - Microsoft Edge$", "" -replace " - YouTube$", "" -replace " - VLC media player$", ""
    $parts = $cleanTitle -split " - ", 2
    $bTitle = if ($parts.Count -ge 2) { $parts[0].Trim() } else { $cleanTitle.Trim() }
    $bArtist = if ($parts.Count -ge 2) { $parts[1].Trim() } else { $b.ProcessName }
    $exists = $list | Where-Object { $_.title -eq $bTitle }
    if (-not $exists) {
        $list += [PSCustomObject]@{
            title = $bTitle
            artist = $bArtist
            app = $b.ProcessName
            status = "Playing"
        }
    }
}

if ($list.Count -eq 0) {
    Write-Output "[]"
} else {
    $json = $list | ConvertTo-Json -Compress
    if ($json.StartsWith("{")) {
        Write-Output "[$json]"
    } else {
        Write-Output $json
    }
}
`;

function pollLiveMedia() {
  if (!isWin || mainWindows.length === 0) return;
  const ps = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', GSMTC_SCRIPT], { windowsHide: true });
  let out = '';
  ps.stdout.on('data', (d) => (out += d.toString()));
  ps.on('close', () => {
    try {
      const data = JSON.parse(out.trim());
      if (data) {
        mainWindows.forEach((win) => {
          if (!win.isDestroyed()) {
            win.webContents.send('media:live-update', data);
          }
        });
      }
    } catch {
      /* ignore */
    }
  });
}

function createWindow() {
  const saved = loadState();
  const displays = screen.getAllDisplays();

  if (!hasBuiltApp) {
    startViteServer();
  }

  displays.forEach((display) => {
    const displaySaved = saved[display.id];
    
    const defaultX = display.workArea.x + Math.floor((display.workArea.width - WIDGET_W) / 2);
    const defaultY = display.workArea.y + Math.floor((display.workArea.height - WIDGET_H) / 2);

    const initialX = displaySaved && typeof displaySaved.x === 'number' ? displaySaved.x : defaultX;
    const initialY = displaySaved && typeof displaySaved.y === 'number' ? displaySaved.y : defaultY;

    const pos = clampToScreens(initialX, initialY);

    const win = new BrowserWindow({
      width: WIDGET_W,
      height: WIDGET_H,
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
      hasShadow: false,
      show: true,
      backgroundColor: '#00000000',
      webPreferences: {
        preload: path.join(appDir, 'preload.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });
    
    win._displayId = display.id;
    mainWindows.push(win);

    win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('Failed to load page:', errorCode, errorDescription);
    });

    win.on('move', scheduleSave);
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
        { label: 'Reset to center of screen', click: () => {
            const d = screen.getDisplayNearestPoint({ x: win.getPosition()[0], y: win.getPosition()[1] });
            win.setPosition(d.workArea.x + Math.floor((d.workArea.width - WIDGET_W) / 2), d.workArea.y + Math.floor((d.workArea.height - WIDGET_H) / 2));
        }},
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
  const p = clampToScreens(x + dx, y + dy);
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
    createWindow();

    // Start live system media polling every 3 seconds
    setInterval(pollLiveMedia, 3000);

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}