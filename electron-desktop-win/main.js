const { app, BrowserWindow, session } = require('electron');
const path = require('node:path');
const { spawn, exec } = require('node:child_process');
const http = require('node:http');

// App icon "synth.png courtesy of smalllikeart",
let mainWindow = null;
let springBootProcess = null;
let isLoaded = false; // Flag to prevent multiple loads and fix DevTools disconnection

const SERVER_PORT = 8080;
const LOCAL_URL = `http://127.0.0.1:${SERVER_PORT}`;

function startBackendServer() {
    exec('taskkill /f /im java.exe', () => {
        let javaBin;
        let jarPath;

        if (app.isPackaged) {
            javaBin = path.join(process.resourcesPath, 'jre-win', 'bin', 'java.exe');
            jarPath = path.join(process.resourcesPath, 'server', 'server-0.0.1-SNAPSHOT.jar');
        } else {
            javaBin = path.join(__dirname, jreFolder, 'bin', 'java.exe'); // Fallback dev setup if needed
            jarPath = path.join(__dirname, 'server', 'server-0.0.1-SNAPSHOT.jar');
        }

        console.log(`[Windows Shell] Spawning server via: ${javaBin}`);
        springBootProcess = spawn(javaBin, ['-jar', jarPath]);

        springBootProcess.stdout.on('data', (data) => console.log(`[Spring Boot]: ${data}`));
        springBootProcess.stderr.on('data', (data) => console.error(`[Spring Boot Error]: ${data}`));
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegrationInWorker: true,
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: true
        }
    });

    // Open DevTools immediately
    //mainWindow.webContents.openDevTools();

    const checkServerReady = () => {
        // If already loaded, stop looping completely to prevent DevTools disconnection
        if (isLoaded) return;

        http.get(LOCAL_URL, (res) => {
            if (res.statusCode && mainWindow && !mainWindow.isDestroyed() && !isLoaded) {
                isLoaded = true; // Mark as successfully routed
                console.log(`[Electron Shell] Backend ready! Loading application view.`);
                mainWindow.loadURL(LOCAL_URL);
            } else if (!isLoaded) {
                setTimeout(checkServerReady, 250);
            }
        }).on('error', () => {
            if (!isLoaded) {
                setTimeout(checkServerReady, 250);
            }
        });
    };

    checkServerReady();
}

app.whenReady().then(() => {
    // Clearer, stricter, un-duplicated CSP headers rule definition
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        const updatedHeaders = Object.assign({}, details.responseHeaders);

        // Explicitly handles base rules, scripts, styling sheets, and external font bundles
        updatedHeaders['Content-Security-Policy'] = [
            "default-src 'self'; " +
            "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; " +
            "style-src 'self' 'unsafe-inline' https://googleapis.com; " +
            "font-src 'self' https://fonts.gstatic.com;"
        ];

        callback({ cancel: false, responseHeaders: updatedHeaders });
    });

    startBackendServer();
    createWindow();
});

app.on('window-all-closed', () => {
    if (springBootProcess && springBootProcess.pid) {
        exec(`taskkill /pid ${springBootProcess.pid} /f /t`, () => {
            app.quit();
        });
    } else {
        app.quit();
    }
});
