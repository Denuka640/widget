# DaylightWidget

A functional floating glassmorphism desktop widget for Windows, built with React, Vite, and Electron.

The widget lives on the **desktop layer** (pinned to Windows' `Progman`), so it floats over your wallpaper but **never covers your other apps or desktop icons**. You can drag it anywhere and it remembers where you left it.

## Features
- pinned to the desktop layer — sits behind all other application windows
- draggable by its header (grab the clock/header or the grip icon)
- remembers its position between restarts
- transparent, frameless, no taskbar icon
- right-click the widget for options (Reset to center / Quit)
- optional Windows startup registration

## Run the EXE (recommended)
Double-click the portable app:

```
release\DaylightWidget-0.0.0-portable.exe
```

To close it: right-click anywhere on the widget → **Quit DaylightWidget**.

It has no taskbar icon by design (it's a desktop widget, not an app window).

## Run from source

```powershell
cd "D:\visual studio projects\widget"
npm start              # uses the built renderer (dist/)
```

Development mode (hot reload):

```powershell
npm run dev
```

## Build the EXE from source

```powershell
npm run build          # type-check + bundle the renderer
npm run package:win    # build + create the portable EXE in release/
```

## Run automatically at startup (optional)

After building the EXE, register it to launch on login:

```powershell
npm run startup:install
```

This creates a shortcut in the Startup folder pointing at the newest portable
EXE in `release/`. If you moved the EXE elsewhere, point at it directly:

```powershell
$env:WIDGET_EXE = "D:\path\to\DaylightWidget-0.0.0-portable.exe"
npm run startup:install
```

To undo:

```powershell
npm run startup:remove
```

> Note: if you rebuild the EXE with a new version number (e.g.
> `-0.0.1-portable.exe`), run `startup:install` again so the shortcut points to
> the new file.

## Notes
- The widget window is re-parented onto the Windows desktop window
  (`Progman`) using a small PowerShell shim, which is what keeps it behind
  other apps while still being fully interactive and draggable. If that
  re-parenting ever fails on an uncommon shell setup, it falls back to a plain
  non-topmost frameless window that still works the same way.
- Position is saved to `%APPDATA%\DaylightWidget\config.json`.
- This app is intentionally designed as a desktop widget, not a regular
  taskbar app: transparent window, skipped taskbar, and no window activation.