/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * TeachRecord - Standalone Windows Desktop App (Electron Entry Point)
 * Enables standalone .exe offline desktop operation.
 */

const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    title: 'TeachRecord - Teaching Video & Screen Recorder',
    backgroundColor: '#020617',
    icon: path.join(__dirname, '../public/icon.svg'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      backgroundThrottling: false, // Ensure video canvas recording never pauses when minimized
    },
  });

  // Enable media access permissions automatically for desktop offline recorder
  mainWindow.webContents.session.setPermissionCheckHandler((webContents, permission) => {
    if (['media', 'display-capture', 'microphone', 'camera'].includes(permission)) {
      return true;
    }
    return false;
  });

  mainWindow.webContents.session.setDevicePermissionHandler((details) => {
    return ['camera', 'microphone'].includes(details.deviceType);
  });

  // In production desktop .exe, load the bundled dist/index.html
  const distIndex = path.join(__dirname, '../dist/index.html');
  mainWindow.loadFile(distIndex).catch((error) => {
    console.error('Failed to load bundled application:', error);
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
