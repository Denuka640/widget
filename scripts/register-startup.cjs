const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const appName = 'DaylightWidget';
const shortcutDir = path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
const shortcutPath = path.join(shortcutDir, `${appName}.lnk`);
const targetPath = process.execPath;
const cwd = path.join(__dirname, '..');

const script = `
Set WshShell = CreateObject("WScript.Shell")
Set shortcut = WshShell.CreateShortcut("${shortcutPath}")
shortcut.TargetPath = "${targetPath}"
shortcut.WorkingDirectory = "${cwd}"
shortcut.Arguments = ""
shortcut.IconLocation = "${targetPath},0"
shortcut.Save
`;

fs.mkdirSync(shortcutDir, { recursive: true });
fs.writeFileSync(path.join(__dirname, 'startup.vbs'), script, 'utf8');

try {
  execSync(`cscript //NoLogo "${path.join(__dirname, 'startup.vbs')}"`, { stdio: 'inherit' });
  console.log(`Startup shortcut installed: ${shortcutPath}`);
} catch (error) {
  console.error('Failed to create startup shortcut:', error.message);
  process.exit(1);
}
