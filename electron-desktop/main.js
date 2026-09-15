const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const { spawn } = require('node:child_process');

let mainWindow;
let springBootProcess = null;

const SERVER_PORT = 8080;
const LOCAL_URL = `http://localhost:${SERVER_PORT}`;

function startBackendServer() {
    // 1. Compute absolute paths to your private Java 25 binary and JAR
    const javaBin = path.join(__dirname, 'jre', 'bin', process.platform === 'win32' ? 'java.exe' : 'java');
    const jarPath = path.join(__dirname, 'server', 'server-0.0.1-SNAPSHOT.jar');

    console.log(`[Electron Shell] Spawning server using private Java: ${javaBin}`);

    // 2. Launch the Spring Boot 4 jar dynamically
    springBootProcess = spawn(javaBin, ['-jar', jarPath, `--server.port=${SERVER_PORT}`]);

    // 3. Pipe Spring Boot logs straight to your IntelliJ Terminal stream
    springBootProcess.stdout.on('data', (data) => {
        console.log(`[Spring Boot Tooling]: ${data}`);
    });

    springBootProcess.stderr.on('data', (data) => {
        console.error(`[Spring Boot Error]: ${data}`);
    });

    springBootProcess.on('close', (code) => {
        console.log(`[Electron Shell] Spring Boot server exited with system code ${code}`);
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    // 4. Implement a resilient health check mechanism to await server initialization
    const checkServerReady = () => {
        fetch(LOCAL_URL)
            .then((res) => {
                if (res.ok) {
                    mainWindow.loadURL(LOCAL_URL);
                    mainWindow.webContents.openDevTools(); // Optional development logging
                } else {
                    setTimeout(checkServerReady, 200);
                }
            })
            .catch(() => {
                // Keep checking until Spring Boot 4 initializes completely
                setTimeout(checkServerReady, 200);
            });
    };

    checkServerReady();
}

app.whenReady().then(() => {
    startBackendServer(); // First, boot up the Java 25 backend
    createWindow();        // Next, initialize the application UI pipeline

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });

    // Inject custom security headers for all network exchanges
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        // Build a fresh object to bypass framework caching conflicts
        const updatedHeaders = Object.assign({}, details.responseHeaders);

        // Force fully explicit, strict CSP directives
        updatedHeaders['Content-Security-Policy'] = [
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';"
        ];

        callback({
            cancel: false,
            responseHeaders: updatedHeaders
        });
    });

    startBackendServer();
    createWindow();

});

// Ensure the Spring Boot backend cleanly terminates when Electron quits
app.on('window-all-closed', () => {
    if (springBootProcess) {
        console.log('[Electron Shell] Shutting down Spring Boot server context cleanly...');
        springBootProcess.kill('SIGTERM'); // Send kill intercept signal
    }
    if (process.platform !== 'darwin') app.quit();
});
