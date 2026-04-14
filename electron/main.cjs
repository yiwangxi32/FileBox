const { app, BrowserWindow } = require("electron")
const { spawn } = require("child_process")
const path = require("path")
const fs = require("fs")

const PORT = process.env.ELECTRON_PORT || "3123"
const HOST = "127.0.0.1"
const APP_URL = `http://${HOST}:${PORT}`

let mainWindow = null
let serverProcess = null

function resolveStandaloneServerPath() {
  const candidates = app.isPackaged
    ? [
        path.join(process.resourcesPath, "app.asar", ".next", "standalone", "server.js"),
        path.join(process.resourcesPath, "app", ".next", "standalone", "server.js"),
      ]
    : [path.join(app.getAppPath(), ".next", "standalone", "server.js")]

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate
  }
  return null
}

function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now()
  return new Promise((resolve, reject) => {
    const check = async () => {
      try {
        const res = await fetch(url)
        if (res.ok) return resolve()
      } catch (_) {
        // ignore until timeout
      }
      if (Date.now() - start > timeoutMs) {
        return reject(new Error("server_start_timeout"))
      }
      setTimeout(check, 500)
    }
    check()
  })
}

async function startInternalServer() {
  const serverEntry = resolveStandaloneServerPath()
  if (!serverEntry) throw new Error("standalone_server_not_found")

  serverProcess = spawn(process.execPath, [serverEntry], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      PORT,
      HOSTNAME: HOST,
    },
    stdio: "ignore",
    windowsHide: true,
  })

  serverProcess.on("exit", () => {
    serverProcess = null
  })

  await waitForServer(APP_URL)
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1100,
    minHeight: 720,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  if (app.isPackaged) {
    await startInternalServer()
    await mainWindow.loadURL(APP_URL)
  } else {
    await mainWindow.loadURL(process.env.NEXT_DEV_URL || "http://localhost:3001")
  }
}

app.whenReady().then(createWindow).catch((err) => {
  console.error("[electron] startup failed:", err)
  app.quit()
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})

app.on("before-quit", () => {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill()
  }
})

