const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    createNotification: (title, options = {}) => {
        ipcRenderer.send('create-notification', { title, ...options });
    }
});