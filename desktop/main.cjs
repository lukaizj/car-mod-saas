const { app, BrowserWindow, shell } = require("electron");
const { spawn } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const { ensureDatabase } = require("./storage.cjs");

let nextProcess;

function findAvailablePort(preferred = 3210) {
  return new Promise((resolve) => {
    const testServer = net.createServer();
    testServer.unref();
    testServer.on("error", () => {
      const fallbackServer = net.createServer();
      fallbackServer.unref();
      fallbackServer.on("error", () => resolve(preferred));
      fallbackServer.listen(0, "127.0.0.1", () => {
        const port = fallbackServer.address().port;
        fallbackServer.close(() => resolve(port));
      });
    });
    testServer.listen(preferred, "127.0.0.1", () => {
      const port = testServer.address().port;
      testServer.close(() => resolve(port));
    });
  });
}

function nextCli() {
  return path.join(app.getAppPath(), "node_modules", "next", "dist", "bin", "next");
}

function waitForServer(url, attempts = 80) {
  return new Promise((resolve, reject) => {
    const check = () => {
      const request = http.get(url, (response) => {
        response.resume();
        if (response.statusCode && response.statusCode < 500) {
          resolve();
        } else if (attempts-- > 0) {
          setTimeout(check, 250);
        } else {
          reject(new Error(`carmod server returned ${response.statusCode}`));
        }
      });
      request.on("error", () => {
        if (attempts-- > 0) setTimeout(check, 250);
        else reject(new Error("carmod server did not start"));
      });
    };
    check();
  });
}

function startNextServer(port) {
  if (nextProcess && nextProcess.exitCode === null) return;

  const dataDirectory = path.join(app.getPath("userData"), "data");
  fs.mkdirSync(path.join(dataDirectory, "models", "uploads"), { recursive: true });
  const templatePath = app.isPackaged
    ? path.join(process.resourcesPath, "dev.db")
    : path.join(app.getAppPath(), "dev.db");
  const databasePath = ensureDatabase({ dataDirectory, templatePath });
  nextProcess = spawn(process.execPath, [nextCli(), "start", "-p", String(port)], {
    cwd: app.getAppPath(),
    env: {
      ...process.env,
      NODE_ENV: "production",
      ELECTRON_RUN_AS_NODE: "1",
      CARMOD_DB_PATH: databasePath,
      CARMOD_DATA_DIR: dataDirectory,
    },
    stdio: "inherit",
    windowsHide: true,
  });
  nextProcess.on("error", (error) => console.error("Failed to start carmod server", error));
  nextProcess.on("exit", () => {
    nextProcess = undefined;
  });
}

async function createWindow() {
  const preferredPort = process.env.CARMOD_PORT ? Number(process.env.CARMOD_PORT) : 3210;
  const port = await findAvailablePort(preferredPort);

  startNextServer(port);
  await waitForServer(`http://127.0.0.1:${port}/configure`);

  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1024,
    minHeight: 700,
    title: "carmod",
    icon: path.join(app.getAppPath(), "assets", "carmod.png"),
    backgroundColor: "#09090b",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(`http://127.0.0.1:${port}`)) shell.openExternal(url);
    return { action: "deny" };
  });

  await window.loadURL(`http://127.0.0.1:${port}/`);
}

app.whenReady().then(() => createWindow().catch((error) => {
  console.error(error);
  app.quit();
}));

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (nextProcess && !nextProcess.killed) nextProcess.kill();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
