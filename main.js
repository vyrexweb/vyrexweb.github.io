const { app, BrowserWindow, ipcMain, desktopCapturer, screen } = require('electron');
const path = require('path');
const http = require('http');

let mainWindow;
let robot = null;

// Charge robotjs (natif, peut échouer si pas rebuild)
try {
  robot = require('robotjs');
  robot.setMouseDelay(0);
  robot.setKeyboardDelay(0);
  console.log('[Robot] robotjs chargé ✓');
} catch(e) {
  console.warn('[Robot] robotjs non disponible:', e.message);
  console.warn('[Robot] Lance: npm run install-robot');
}

// ── SERVEUR DE SIGNALEMENT LOCAL (PeerJS Server) ──────────────────────────────
// On héberge notre propre serveur PeerJS pour éviter les problèmes avec 0.peerjs.com
let peerServer = null;
let signalingPort = 9000;

function startSignalingServer() {
  try {
    const { PeerServer } = require('peer');
    peerServer = PeerServer({ port: signalingPort, path: '/sc' });
    peerServer.on('connection', (client) => console.log('[Signal] Client:', client.getId()));
    peerServer.on('disconnect', (client) => console.log('[Signal] Déco:', client.getId()));
    console.log('[Signal] Serveur PeerJS sur port', signalingPort);
    return true;
  } catch(e) {
    console.warn('[Signal] Impossible de démarrer le serveur local:', e.message);
    return false;
  }
}

// ── MAIN WINDOW ───────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  // Démarre le serveur de signalement
  const localServer = startSignalingServer();

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#080810',
    titleBarStyle: 'hiddenInset',
    frame: process.platform !== 'darwin',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false, // Nécessaire pour WebRTC local
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  // Envoie la config au renderer
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('config', {
      hasRobot: !!robot,
      localServer,
      signalingPort,
      screenSize: screen.getPrimaryDisplay().workAreaSize
    });
  });

  mainWindow.on('closed', () => { mainWindow = null; });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (!mainWindow) app.whenReady().then(() => {}); });

// ── IPC : CONTRÔLE SOURIS / CLAVIER ──────────────────────────────────────────
ipcMain.on('ctrl', (event, data) => {
  if (!robot) return;
  try {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    switch(data.t) {
      case 'mm': {
        const x = Math.round(data.x * width);
        const y = Math.round(data.y * height);
        robot.moveMouse(x, y);
        break;
      }
      case 'md': {
        const x = Math.round(data.x * width);
        const y = Math.round(data.y * height);
        robot.moveMouse(x, y);
        const btn = data.b === 2 ? 'right' : data.b === 1 ? 'middle' : 'left';
        robot.mouseToggle('down', btn);
        break;
      }
      case 'mu': {
        const btn = data.b === 2 ? 'right' : data.b === 1 ? 'middle' : 'left';
        robot.mouseToggle('up', btn);
        break;
      }
      case 'dc': {
        const x = Math.round(data.x * width);
        const y = Math.round(data.y * height);
        robot.moveMouse(x, y);
        robot.mouseClick('left', true); // double click
        break;
      }
      case 'wh': {
        const dir = data.dy > 0 ? 'down' : 'up';
        const amt = Math.max(1, Math.round(Math.abs(data.dy) / 40));
        robot.scrollMouse(Math.round(data.dx / 40), data.dy > 0 ? -amt : amt);
        break;
      }
      case 'kd': {
        const key = mapKey(data.k, data.c);
        if (!key) break;
        const mods = [];
        if (data.ctrl) mods.push('control');
        if (data.sh) mods.push('shift');
        if (data.alt) mods.push('alt');
        if (data.meta) mods.push('command');
        if (mods.length) {
          robot.keyToggle(key, 'down', mods);
        } else {
          robot.keyToggle(key, 'down');
        }
        break;
      }
      case 'ku': {
        const key = mapKey(data.k, data.c);
        if (!key) break;
        robot.keyToggle(key, 'up');
        break;
      }
    }
  } catch(e) {
    // Ignore erreurs robot (touche inconnue etc.)
  }
});

// Mapping touches Web → robotjs
function mapKey(key, code) {
  const map = {
    'Enter': 'enter', 'Backspace': 'backspace', 'Delete': 'delete',
    'Tab': 'tab', 'Escape': 'escape', ' ': 'space',
    'ArrowLeft': 'left', 'ArrowRight': 'right', 'ArrowUp': 'up', 'ArrowDown': 'down',
    'Home': 'home', 'End': 'end', 'PageUp': 'pageup', 'PageDown': 'pagedown',
    'Insert': 'insert', 'CapsLock': 'capslock',
    'F1':'f1','F2':'f2','F3':'f3','F4':'f4','F5':'f5','F6':'f6',
    'F7':'f7','F8':'f8','F9':'f9','F10':'f10','F11':'f11','F12':'f12',
    'Shift': 'shift', 'Control': 'control', 'Alt': 'alt', 'Meta': 'command',
  };
  if (map[key]) return map[key];
  // Lettres et chiffres
  if (key.length === 1) return key.toLowerCase();
  return null;
}

// IPC : screen size pour calibration
ipcMain.handle('get-screen-size', () => {
  return screen.getPrimaryDisplay().workAreaSize;
});
