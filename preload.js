const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Envoie un événement de contrôle au main process (→ robotjs)
  sendCtrl: (data) => ipcRenderer.send('ctrl', data),
  // Reçoit la config (hasRobot, localServer, etc.)
  onConfig: (cb) => ipcRenderer.on('config', (_, data) => cb(data)),
  // Taille écran réelle
  getScreenSize: () => ipcRenderer.invoke('get-screen-size'),
});
