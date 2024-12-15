import {contextBridge, ipcRenderer} from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    createNotification: (title, options = {}) => {
        ipcRenderer.send('create-notification', {title, ...options});
    }
});