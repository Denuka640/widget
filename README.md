# ☀️ DaylightWidget

[![Platform](https://img.shields.io/badge/Platform-Windows%2010%20%2F%2011-blue.svg)](https://microsoft.com/windows)
[![Electron](https://img.shields.io/badge/Electron-44.4.3-47848F.svg)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-19.2.8-61DAFB.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0.2-3178C6.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.3.0-646CFF.svg)](https://vitejs.dev/)

**DaylightWidget** is a high-performance, customizable, floating desktop widget for Windows. Designed with modern glassmorphism aesthetics, it acts as a permanent ambient desktop companion displaying real-time time & date, live local weather, system media playback controls, and a full theme customizer.

The widget runs frameless with transparent backgrounds, skips the taskbar, floats smoothly on your desktop, and remembers its screen position across system restarts.

---

## 📸 Key Features

- ⏳ **Dual Clock Engine**: Toggle seamlessly between a digital clock (12h/24h with seconds, AM/PM, and animated colon) and a custom vector SVG **Analog Clock** with smooth second hand motion.
- 🌤️ **Live Weather Integration**: Real-time temperature, condition icon, high/low range, wind speed, and humidity powered by Open-Meteo API (with automatic IP-based location detection or custom city search).
- 🎵 **System Media Transport Controls (GSMTC)**: Live system media detection across Spotify, YouTube, Chrome, Edge, Apple Music, and VLC. Displays active track title, artist name, and provides interactive play/pause/skip controls.
- 🎨 **Glassmorphism Theme System**: 5 curated presets (*Frosted Light, Obsidian Dark, Cyber Violet, Pixel Sunset, Emerald Mint*) plus a full **Custom Mode** allowing user-defined glass colors, text color, and background blur opacity.
- 📌 **Desktop Integration**: Frameless, transparent window without taskbar clutter. Features custom drag handles, screen edge bounding clamp, multi-monitor display memory, and a custom right-click context menu (*Reset to center* / *Quit*).
- 🚀 **Windows Startup Support**: One-click autostart registration via settings toggle or CLI helper scripts.

---

## 🧠 How It Was Built

DaylightWidget is engineered with a multi-layered architecture separating native OS hooks, secure IPC messaging, background interop scripts, and reactive web UI components.

```mermaid
graph TD
    subgraph "Native OS & Electron Main Process (electron.cjs)"
        A[Electron BrowserWindow] --> B[Position Clamp & Screen Manager]
        A --> C[Config Storage %APPDATA%]
        D[PowerShell WinRT GSMTC Worker] -->|Polls every 3s| E[IPC Event: media:live-update]
        E --> A
        F[Windows Media Key Sender] <-- IPC: media:control -- A
    end

    subgraph "Secure Preload Bridge (preload.cjs)"
        A <-- ContextBridge IPC --> G[window.widgetAPI]
    end

    subgraph "Renderer Process (React 19 + TypeScript + Vite)"
        G --> H[React App Component]
        H --> I[Digital / SVG Vector Analog Clock]
        H --> J[Open-Meteo Weather Service]
        H --> K[Media Player Widget]
        H --> L[Dynamic CSS Theme Engine]
    end
```

### 1. Electron Main Process (`electron.cjs`)
- **Frameless & Transparent Window**: Configured with `frame: false`, `transparent: true`, `skipTaskbar: true`, `hasShadow: false`, and `#00000000` background.
- **Multi-Monitor Position Management**: Scans all active displays via `electron.screen.getAllDisplays()` and clamps widget coordinates so it stays visible on screen without spilling into dead regions.
- **Debounced Position Saving**: Saves widget `(x, y)` coordinates per monitor ID into `%APPDATA%\DaylightWidget\config.json` with a 300ms debounce timer.
- **System Context Menu**: Custom native context menu bound to `context-menu` event offering *Reset to center of screen* and *Quit DaylightWidget*.

### 2. Live Media Engine (`GSMTC_SCRIPT` via PowerShell)
- Instead of relying on heavy native C++ Node addons, DaylightWidget executes a lightweight, asynchronous WinRT PowerShell script.
- Queries `Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager` for active media sessions.
- Includes fallback process title inspection for Spotify (`Spotify.exe`) and browser tabs (`Chrome`, `Edge`, `VLC`) to extract artist and track title accurately.
- Emits real-time media states to the renderer every 3 seconds over Electron IPC. Media control actions (Play/Pause, Next, Prev) dispatch native Windows virtual media key events via `WScript.Shell.SendKeys`.

### 3. Preload Context Bridge (`preload.cjs`)
- Strictly enforces Electron security best practices (`contextIsolation: true`, `nodeIntegration: false`).
- Exposes safe, typed methods via `window.widgetAPI`:
  - `moveWindowBy(dx, dy)`: Moves the window relative to drag delta.
  - `sendMediaControl(action)`: Triggers media key actions.
  - `onLiveMediaUpdate(callback)`: Subscribes to live track updates.
  - `getAutoStart()` / `setAutoStart(enabled)`: Queries and toggles Windows startup login items.

### 4. React 19 + TypeScript Renderer (`src/App.tsx` & `App.css`)
- **Modern UI Stack**: Built on React 19, TypeScript 6, Vite 8, Lucide Icons, and `@mui/material` elements.
- **Vector SVG Analog Clock**: Math-driven SVG element calculating real-time degree angles for hour, minute, and continuous sub-second hands using `requestAnimationFrame` / interval precision.
- **Dynamic CSS Custom Properties Engine**: Dynamic glass styling built using CSS variables (`--glass-bg`, `--glass-border`, `--glass-blur`, `--text-main`) updated reactively when switching themes or tweaking custom sliders.

---

## 🛠️ Project Structure

```
widget/
├── electron.cjs              # Electron main process (Window lifecycle, IPC, GSMTC polling)
├── preload.cjs               # Secure IPC context bridge (window.widgetAPI)
├── index.html                # Vite web entry point
├── package.json              # Dependencies, scripts, and electron-builder config
├── vite.config.ts            # Vite bundle & plugin configuration
├── tsconfig.json             # TypeScript root setup
├── scripts/
│   ├── register-startup.cjs  # VBScript generator for Windows Startup shortcut
│   └── remove-startup.cjs    # Uninstalls Windows Startup shortcut
├── public/                   # Static assets (icons, logos)
└── src/
    ├── main.tsx              # React DOM mounting point
    ├── App.tsx               # Main React application component & state management
    ├── App.css               # Glassmorphic CSS design system & custom animations
    ├── index.css             # Base styles and font setup
    └── types.d.ts            # Global TypeScript definitions for window.widgetAPI
```

---

## 🚀 Getting Started

### Prerequisites
- **OS**: Windows 10 or Windows 11
- **Node.js**: Node.js v18.0.0 or higher
- **Package Manager**: `npm` (comes with Node.js)

---

### Running the Pre-Built Executable

If you just want to run the application immediately:
1. Navigate to the `release/` directory.
2. Double-click **`DaylightWidget-0.0.0-portable.exe`**.
3. To exit: **Right-click anywhere on the widget** → Select **Quit DaylightWidget**.

---

### Running from Source (Development)

1. **Install Dependencies**:
   ```powershell
   npm install
   ```

2. **Start Desktop App in Development Mode** (Vite + Electron with Hot Reload):
   ```powershell
   npm run dev:desktop
   ```

3. **Alternative - Run Electron against built renderer**:
   ```powershell
   npm run build
   npm start
   ```

---

## 📦 Building & Packaging

To build a production standalone portable executable (`.exe`):

```powershell
# 1. Type-check TypeScript & build Vite web assets into dist/
npm run build

# 2. Package into a single portable EXE using electron-builder
npm run package:win
```

The compiled executable will be placed in the `release/` folder:
`release/DaylightWidget-0.0.0-portable.exe`

---

## ⚙️ Windows Startup Configuration

You can configure DaylightWidget to open automatically whenever you log into Windows:

### Option 1: In-App Settings Toggle
Open the widget **Settings** menu (gear icon at the top right) and toggle **"Launch on Windows Startup"**.

### Option 2: CLI Scripts
Run the automated startup installer script:

```powershell
# Install Windows Startup shortcut
npm run startup:install

# Remove Windows Startup shortcut
npm run startup:remove
```

> **Note**: If you move the executable to a custom folder, set the `WIDGET_EXE` environment variable before running the script:
> ```powershell
> $env:WIDGET_EXE = "C:\Path\To\Your\DaylightWidget-0.0.0-portable.exe"
> npm run startup:install
> ```

---

## ⚙️ Configuration & Data Locations

- **Window Position**: Saved automatically in `%APPDATA%\DaylightWidget\config.json`.
- **User Preferences**: Theme choice, custom colors, weather location, 12h/24h preference, and temperature units are persisted in local storage (`daylight_widget_prefs_v2`).

---

## 📜 Available NPM Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev:desktop` | Launches Vite dev server and Electron concurrently with live reload. |
| `npm run dev` | Runs the Vite web preview server on `http://localhost:5173`. |
| `npm start` | Launches Electron using pre-compiled `dist/` files. |
| `npm run build` | Compiles TypeScript and builds production assets with Vite. |
| `npm run package:win` | Packages the application into a portable Windows `.exe` using `electron-builder`. |
| `npm run lint` | Runs `oxlint` to check code quality and syntax errors. |
| `npm run startup:install` | Registers the app shortcut in the Windows Startup folder. |
| `npm run startup:remove` | Removes the shortcut from the Windows Startup folder. |

---

## 📄 License

Distributed under the MIT License.