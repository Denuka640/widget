const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const appName = 'DaylightWidget';
const releaseDir = path.join(__dirname, '..', 'release');

function findExe() {
  if (process.env.WIDGET_EXE && fs.existsSync(process.env.WIDGET_EXE)) {
    return path.resolve(process.env.WIDGET_EXE);
  }
  if (!fs.existsSync(releaseDir)) return null;
  const exes = fs
    .readdirSync(releaseDir)
    .filter((f) => /portable\.exe$/i.test(f))
    .map((f) => path.join(releaseDir, f))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return exes[0] || null;
}

const targetPath = findExe();
if (!targetPath) {
  console.error('No portable EXE found in the release folder.');
  console.error('Build one first with: npm run package:win');
  process.exit(1);
}

const workingDir = path.dirname(targetPath);
const shortcutDir = path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
const shortcutPath = path.join(shortcutDir, `${appName}.lnk`);

const vbs = (p) => String(p).replace(/\\/g, '\\\\').replace(/"/g, '""');

const script = `
Set WshShell = CreateObject("WScript.Shell")
Set shortcut = WshShell.CreateShortcut("${vbs(shortcutPath)}")
shortcut.TargetPath = "${vbs(targetPath)}"
shortcut.WorkingDirectory = "${vbs(workingDir)}"
shortcut.Arguments = ""
shortcut.IconLocation = "${vbs(targetPath)},0"
shortcut.Save
`;

fs.mkdirSync(shortcutDir, { recursive: true });
const vbsPath = path.join(__dirname, 'startup.vbs');
fs.writeFileSync(vbsPath, script, 'utf8');

try {
  execSync(`cscript //NoLogo "${vbsPath}"`, { stdio: 'inherit' });
  console.log(`Startup shortcut installed: ${shortcutPath}`);
} catch (error) {
  console.error('Failed to create startup shortcut:', error.message);
} finally {
  try { fs.unlinkSync(vbsPath); } catch {}
}

// Register Windows Task Scheduler Task (runs automatically on user logon)
try {
  const schCommand = `schtasks /Create /TN "${appName}" /TR "\\"${targetPath}\\"" /SC ONLOGON /F`;
  execSync(schCommand, { stdio: 'inherit' });
  console.log(`Windows Task Scheduler task created: ${appName}`);
  console.log(`Target Executable: ${targetPath}`);
} catch (error) {
  console.error('Task Scheduler registration note:', error.message);
}