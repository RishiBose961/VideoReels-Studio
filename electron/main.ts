import { app, BrowserWindow, ipcMain, dialog ,Menu} from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    icon: path.join(process.env.VITE_PUBLIC, 'logoimg.png'),
    backgroundColor: '#0d0d1a',
    titleBarStyle: 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  Menu.setApplicationMenu(null);

  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// IPC: open image files
ipcMain.handle('dialog:openImages', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'] }],
  })
  if (result.canceled) return []
  return result.filePaths.map((p) => ({
    path: p,
    name: path.basename(p, path.extname(p)),
    data: `data:image/${path.extname(p).slice(1)};base64,${fs.readFileSync(p).toString('base64')}`,
  }))
})

// IPC: save project
ipcMain.handle('dialog:saveProject', async (_e, data: string) => {
  const result = await dialog.showSaveDialog({
    defaultPath: 'project.vreel',
    filters: [{ name: 'VideoReels Project', extensions: ['vreel'] }],
  })
  if (!result.canceled && result.filePath) {
    fs.writeFileSync(result.filePath, data, 'utf-8')
    return true
  }
  return false
})

// IPC: load project
ipcMain.handle('dialog:loadProject', async () => {
  const result = await dialog.showOpenDialog({
    filters: [{ name: 'VideoReels Project', extensions: ['vreel'] }],
  })
  if (result.canceled || !result.filePaths[0]) return null
  return fs.readFileSync(result.filePaths[0], 'utf-8')
})

// IPC: background startup (launch at login)
ipcMain.handle('app:getBackgroundStartup', () => {
  return app.getLoginItemSettings().openAtLogin
})

ipcMain.handle('app:setBackgroundStartup', (_e, enabled: boolean) => {
  app.setLoginItemSettings({
    openAtLogin: !!enabled,
    openAsHidden: !!enabled,
  })
  return app.getLoginItemSettings().openAtLogin
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow)
