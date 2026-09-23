# DaylightWidget

A floating glassmorphism desktop widget built with React, Vite, and Electron for Windows.

## Features
- transparent desktop overlay
- always-on-top frameless window
- draggable widget on the desktop
- no taskbar icon by default
- optional Windows startup registration

## Run locally

```powershell
cd "D:\visual studio projects\widget"
npm install
npm start
```

## Run in development mode

```powershell
cd "D:\visual studio projects\widget"
npm run dev
```

## Build the app

```powershell
cd "D:\visual studio projects\widget"
npm run build
```

## Package a portable Windows EXE

```powershell
cd "D:\visual studio projects\widget"
npm run package:win
```

The portable EXE is created in the release folder.

## Optional startup on login

```powershell
cd "D:\visual studio projects\widget"
npm run startup:install
```

To remove it:

```powershell
cd "D:\visual studio projects\widget"
npm run startup:remove
```

## Why the EXE was failing before

The earlier packaging error was caused by stale Electron or Node processes and an old release directory remaining locked from a previous build. Windows rejects the portable EXE packaging step when that temp folder is still in use, which produces the EPERM rename error. Closing the stale processes and removing the release folder resolves it.

## Notes
This app is intentionally designed as a desktop widget, not a regular taskbar app. The transparent window, `skipTaskbar`, and drag handling make it sit over the desktop while preserving the wallpaper behind it.
