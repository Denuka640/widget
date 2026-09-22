const fs = require('node:fs');
const path = require('node:path');

const shortcutDir = path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
const shortcutPath = path.join(shortcutDir, 'DaylightWidget.lnk');

if (fs.existsSync(shortcutPath)) {
  fs.unlinkSync(shortcutPath);
  console.log(`Removed startup shortcut: ${shortcutPath}`);
} else {
  console.log('No startup shortcut found.');
}
