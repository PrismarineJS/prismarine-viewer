const path = require('path')
const { app, BrowserWindow, globalShortcut, ipcMain } = require('electron')

let mainWindow = null

function createMainWindow() {
  const window = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      nodeIntegrationInWorker: true,
      preload: path.join(__dirname, "./client/preload.js")
    }
  })

  // Open dev tools on load
  window.webContents.openDevTools()

  window.loadFile(path.join(__dirname, "./client/index.html"));

  window.on('closed', () => {
    mainWindow = null
  })

  window.webContents.on('devtools-opened', () => {
    window.focus()
    setImmediate(() => {
      window.focus()
    })
  })

  return window
}


app.on('ready', () => {
  mainWindow = createMainWindow()
})

app.on('window-all-closed', function () {
  app.quit()
})

app.allowRendererProcessReuse = false