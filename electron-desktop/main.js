const { app, BrowserWindow, session } = require('electron'); // Fixed: Added session import

// Add this line to disable hardware acceleration completely:
//app.disableHardwareAcceleration();

// Alternative 1: Disable GPU rasterization specifically (keeps core acceleration on)
app.commandLine.appendSwitch('disable-gpu-rasterization');

// Alternative 2: Force the app to use software backings for rendering frames
// app.commandLine.appendSwitch('disable-software-rasterizer');

// Alternative 3: Force standard angle graphics architecture processing
// app.commandLine.appendSwitch('use-gl', 'desktop');

const path = require('node:path');
const { spawn } = require('node:child_process');

let mainWindow;
let springBootProcess = null;

const SERVER_PORT = 8080;
const LOCAL_URL = `http://localhost:${SERVER_PORT}`;

function startBackendServer() {
    // 1. Compute absolute paths inside the project structure
    let javaBin = path.join(__dirname, 'jre', 'bin', process.platform === 'win32' ? 'java.exe' : 'java');
    let jarPath = path.join(__dirname, 'server', 'server-0.0.1-SNAPSHOT.jar');

    // 2. Fix: Intercept and map virtual ASAR directory boundaries to physical locations
    if (javaBin.includes('app.asar')) {
        javaBin = javaBin.replace('app.asar', 'app.asar.unpacked');
        jarPath = jarPath.replace('app.asar', 'app.asar.unpacked');
    }

    console.log(`[Electron Shell] Spawning server using private Java: ${javaBin}`);

    // 3. Launch the Spring Boot 4 jar dynamically
    springBootProcess = spawn(javaBin, ['-jar', jarPath, `--server.port=${SERVER_PORT}`]);

    // 4. Pipe Spring Boot logs straight to your IntelliJ Terminal stream
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
        // width: 1200,
        // height: 800,
        webPreferences: {
            nodeIntegrationInWorker: true, // Absolutely mandatory for production WASM workers
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: true             // Standard enforcement
        }
    });

    // 5. Implement a resilient health check mechanism to await server initialization
    const checkServerReady = () => {
        fetch(LOCAL_URL)
            .then((res) => {
                if (res.ok) {
                    mainWindow.loadURL(LOCAL_URL);
                  //  mainWindow.webContents.openDevTools(); // Optional development logging
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
    // Inject custom security headers for all network exchanges
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
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

    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        const updatedHeaders = Object.assign({}, details.responseHeaders);

        // 1. Updated CSP Directives to allow your external fonts and fix inline script blocks
        updatedHeaders['Content-Security-Policy'] = [
            "default-src 'self';" +
            "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval';" + // Added 'wasm-unsafe-eval'
            "style-src 'self' 'unsafe-inline' https://googleapis.com;" + // Allows Google Fonts stylesheets
            "font-src 'self' https://fonts.gstatic.com;"            // Fixes the Material Icons blocked asset error
        ];

        callback({
            cancel: false,
            responseHeaders: updatedHeaders
        });
    });

    startBackendServer(); // First, boot up the Java 25 backend
    createWindow();        // Next, initialize the application UI pipeline

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });

    // Cleaned: Removed duplicate startBackendServer() and createWindow() lines here
});

// Ensure the Spring Boot backend cleanly terminates when Electron quits
app.on('window-all-closed', () => {
    if (springBootProcess) {
        console.log('[Electron Shell] Shutting down Spring Boot server context cleanly...');

        // Cross-platform lifecycle termination checklist
        if (process.platform === 'win32') {
            // Windows process tree mitigation
            spawn('taskkill', ['/pid', springBootProcess.pid, '/f', '/t']);
        } else {
            springBootProcess.kill('SIGTERM'); // Send standard kill intercept signal
        }
    }
    if (process.platform !== 'darwin') app.quit();
});
