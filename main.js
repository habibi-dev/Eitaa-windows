const {app, BrowserWindow, Tray, Menu, ipcMain, Notification} = require('electron');
const path = require('path');
const fs = require('fs');

class EitaaApp {
    constructor() {
        this.mainWindow = null;
        this.tray = null;
        this.initNotificationHandlers();
        this.initApp();
    }

    initNotificationHandlers() {
        if (!Notification.isSupported()) {
            console.error('Notifications are not supported');
            return;
        }
    }

    createWindow() {
        this.mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            icon: this.getIconPath(),
            autoHideMenuBar: true,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                webviewTag: false,
                enableRemoteModule: false,
                preload: path.join(__dirname, 'preload.js')
            },
        });

        this.mainWindow.removeMenu();

        this.mainWindow.webContents.setWindowOpenHandler(this.handleExternalLinks);

        this.mainWindow.loadURL('https://web.eitaa.com/');

        this.setupWindowEvents();
        this.setupPermissions();
        this.setupNotificationListener();
        this.injectCustomAssets();

    }

    handleExternalLinks = (details) => {
        require('electron').shell.openExternal(details.url);
        return {action: 'deny'};
    }

    setupNotificationListener() {
        this.mainWindow.webContents.executeJavaScript(`
            Notification.requestPermission().then(permission => {
                console.log('Notification permission:', permission);
            });
        `);

        ipcMain.on('create-notification', (event, {title, body, icon}) => {
            try {
                const notification = new Notification({
                    title: title,
                    body: body || '',
                    icon: this.getIconPath()
                });

                notification.show();

                notification.on('click', () => {
                    this.mainWindow.show();
                });
            } catch (error) {
                console.error('Error creating notification:', error);
            }
        });
    }

    setupPermissions() {
        this.mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
            if (permission === 'notifications') {
                callback(true);
            } else {
                callback(false);
            }
        });
    }

    injectCustomAssets() {
        this.mainWindow.webContents.on('dom-ready', () => {
            try {
                this.injectCSS();
                this.injectJS();
            } catch (error) {
                console.error('Error injecting assets:', error);
            }
        });
    }

    injectCSS() {
        const cssPath = path.join(__dirname, 'assets', 'style.css');
        if (fs.existsSync(cssPath)) {
            const cssContent = fs.readFileSync(cssPath, 'utf-8');
            this.mainWindow.webContents.insertCSS(cssContent);
        }
    }

    injectJS() {
        const jsPath = path.join(__dirname, 'assets', 'script.js');
        if (fs.existsSync(jsPath)) {
            const jsContent = fs.readFileSync(jsPath, 'utf-8');
            this.mainWindow.webContents.executeJavaScript(jsContent);
        }
    }

    createTray() {
        this.tray = new Tray(this.getIconPath());
        const contextMenu = Menu.buildFromTemplate([
            {label: 'نمایش', click: () => this.mainWindow.show()},
            {label: 'خروج', click: () => app.exit()},
        ]);

        this.tray.setToolTip('Eitaa');
        this.tray.setContextMenu(contextMenu);
        this.setupTrayEvents();
    }

    setupTrayEvents() {
        this.tray.on('click', () => {
            this.mainWindow.isVisible() ? this.mainWindow.hide() : this.mainWindow.show();
        });
    }

    setupWindowEvents() {
        this.mainWindow.on('close', (event) => {
            if (!app.isQuiting) {
                event.preventDefault();
                this.mainWindow.hide();
            }
        });
    }

    getIconPath() {
        return path.join(__dirname, 'icon.png');
    }

    initApp() {
        const gotTheLock = app.requestSingleInstanceLock();
        if (!gotTheLock) {
            app.exit();
            return;
        }

        app.on('second-instance', (event, commandLine, workingDirectory) => {
            if (this.mainWindow) {
                if (this.mainWindow.isMinimized()) this.mainWindow.restore();
                this.mainWindow.focus();
            }
        });

        app.setLoginItemSettings({openAtLogin: true});

        app.on('ready', () => {
            this.createWindow();
            this.createTray();
        });
    }
}

new EitaaApp();