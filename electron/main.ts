import { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, screen } from 'electron'
import { collectLaunchMediaFiles } from './launch-files.js'
import {
  checkForAppUpdates,
  downloadAndInstallUpdate,
  getCurrentAppVersion,
  openUpdateDownload,
} from './updates.js'
import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  isMediaFileType,
  openFolderFiles,
  openMultipleFiles,
  openSingleFile,
} from './open-files.js'
import {
  defaultAppMemory,
  normalizeStoredMemory,
  toRuntimeMemory,
  type PersistedAppMemory,
} from './memory.js'
import {
  defaultAppSettings,
  normalizeSettings,
  type AppSettings,
} from './settings.js'
import {
  VlcPlayerService,
  type ViewportBounds,
  type VlcAudioEffects,
  type VlcVideoEffects,
} from './vlc-player.js'
import { getMediaProbeService } from './media-probe.js'
import type { MediaThumbnailOptions } from '../shared/media-probe.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isDev = !app.isPackaged
const rendererIndex = path.join(__dirname, '../dist/index.html')

let mainWindow: BrowserWindow | null = null
let controlsWindow: BrowserWindow | null = null
let filesMenuWindow: BrowserWindow | null = null
let filesMenuReady = false
let filesMenuRevealPending = false
let filesMenuContent: unknown = null
let rendererWatcher: fs.FSWatcher | null = null
let vlcPlayer: VlcPlayerService | null = null
let controlsOverlayWanted = false
let pendingLaunchFiles = collectLaunchMediaFiles(process.argv)

app.setAppUserModelId('com.fmp.videoplayer')

const gotSingleInstanceLock = app.requestSingleInstanceLock()
if (!gotSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, argv) => {
    const files = collectLaunchMediaFiles(argv)
    if (files.length > 0) {
      pendingLaunchFiles = files
    }

    if (!mainWindow || mainWindow.isDestroyed()) {
      return
    }

    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }

    mainWindow.show()
    mainWindow.focus()

    if (files.length > 0) {
      mainWindow.webContents.send('app:open-files', files)
    }
  })
}

// While a native open/save dialog is shown, always-on-top overlay windows and
// the native video layer must be tucked away or they intercept clicks.
async function withFileDialog<T>(callback: () => Promise<T>): Promise<T> {
  const hadVisibleControls =
    Boolean(controlsWindow && !controlsWindow.isDestroyed() && controlsWindow.isVisible())
  const hadVisibleFilesMenu =
    Boolean(filesMenuWindow && !filesMenuWindow.isDestroyed() && filesMenuWindow.isVisible())

  if (hadVisibleControls) {
    controlsWindow?.hide()
  }

  if (hadVisibleFilesMenu) {
    filesMenuWindow?.hide()
    filesMenuWindow?.setIgnoreMouseEvents(true, { forward: true })
  }

  filesMenuRevealPending = false
  vlcPlayer?.suspendVideoOverlay()

  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.focus()
    }

    return await callback()
  } finally {
    vlcPlayer?.resumeVideoOverlay()
    restoreControlsOverlayAfterFileDialog(hadVisibleControls)
  }
}

function restoreControlsOverlayAfterFileDialog(hadVisibleControls: boolean) {
  if (!hadVisibleControls || !controlsWindow || controlsWindow.isDestroyed()) {
    return
  }

  controlsOverlayWanted = true

  if (!mainWindow || mainWindow.isDestroyed() || !mainWindow.isFocused()) {
    return
  }

  controlsWindow.showInactive()
  controlsWindow.setIgnoreMouseEvents(true, { forward: true })
  vlcPlayer?.raiseControlsOverlay()
  mainWindow.webContents.send('controls:request-state-relayed')
  mainWindow.webContents.send('vlc:parent-geometry-changed')
}

function tuckFloatingOverlays() {
  if (controlsWindow && !controlsWindow.isDestroyed()) {
    // Drop out of the topmost band before hide — otherwise an always-on-top
    // child can keep painting over other apps after the parent blurs.
    controlsWindow.setAlwaysOnTop(false)
    controlsWindow.hide()
    controlsWindow.webContents.send('controls:suspended-relayed')
  }

  if (filesMenuWindow && !filesMenuWindow.isDestroyed()) {
    filesMenuRevealPending = false
    filesMenuWindow.setAlwaysOnTop(false)
    filesMenuWindow.webContents.send('files-menu:hide-relayed')
    filesMenuWindow.hide()
    filesMenuWindow.setIgnoreMouseEvents(true, { forward: true })
  }

  vlcPlayer?.suspendVideoOverlay()
}

function shouldKeepFloatingOverlays(): boolean {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return false
  }

  // Minimized / hidden main → never keep always-on-top children on screen.
  if (mainWindow.isMinimized() || !mainWindow.isVisible()) {
    return false
  }

  if (mainWindow.isFocused()) {
    return true
  }

  const focused = BrowserWindow.getFocusedWindow()

  // Clicking the controls bar focuses that child and blurs main. That is still
  // "inside the app" — tucking here used to suspend the video and leave a
  // black hole under the navbar.
  if (focused === controlsWindow || focused === filesMenuWindow) {
    return true
  }

  return false
}

function hideFloatingOverlays() {
  const run = () => {
    if (shouldKeepFloatingOverlays()) {
      if (BrowserWindow.getFocusedWindow() === filesMenuWindow) {
        if (controlsWindow && !controlsWindow.isDestroyed()) {
          controlsWindow.setAlwaysOnTop(false)
          controlsWindow.hide()
          controlsWindow.webContents.send('controls:suspended-relayed')
        }
      }
      return
    }

    tuckFloatingOverlays()
  }

  // Focus can take a few ms to leave our process after blur. A single
  // setTimeout(0) raced and left the always-on-top bar over other apps.
  setTimeout(run, 50)
  setTimeout(run, 200)
}

// Safety net: if the always-on-top controls are still painted while the app
// has no legitimate focus, tuck them. Covers focus races blur misses.
let overlayWatchdog: ReturnType<typeof setInterval> | null = null

function ensureOverlayWatchdog() {
  if (overlayWatchdog) {
    return
  }

  overlayWatchdog = setInterval(() => {
    if (!controlsWindow || controlsWindow.isDestroyed() || !controlsWindow.isVisible()) {
      return
    }

    if (!shouldKeepFloatingOverlays()) {
      tuckFloatingOverlays()
    }
  }, 300)
}

function restoreFloatingOverlaysIfNeeded() {
  if (!mainWindow || mainWindow.isDestroyed() || mainWindow.isMinimized()) {
    return
  }

  if (!mainWindow.isVisible() || !mainWindow.isFocused()) {
    return
  }

  // Clears the blur-time suspend flag. Safe off the player page because the
  // renderer sets videoVisible=false when leaving /player, so applyVisibility
  // keeps the native window hidden (and controls stay down unless wanted).
  vlcPlayer?.resumeVideoOverlay()

  if (controlsOverlayWanted && controlsWindow && !controlsWindow.isDestroyed()) {
    controlsWindow.setAlwaysOnTop(true, 'pop-up-menu')
    controlsWindow.showInactive()
    controlsWindow.setIgnoreMouseEvents(true, { forward: true })
    vlcPlayer?.raiseControlsOverlay()
    mainWindow.webContents.send('controls:request-state-relayed')
  }
}

// Settings and playback memory share a single store file with the shape
// { settings: {...}, memory: {...} }. A legacy flat settings.json plus a
// separate memory.json are migrated into it on first read.
type CombinedStore = {
  settings: AppSettings
  memory: PersistedAppMemory
}

let cachedStore: CombinedStore | null = null

function getStorePath() {
  return path.join(app.getPath('userData'), 'settings.json')
}

function getLegacyMemoryPath() {
  return path.join(app.getPath('userData'), 'memory.json')
}

async function writeStore(store: CombinedStore): Promise<CombinedStore> {
  cachedStore = store
  await fsPromises.mkdir(app.getPath('userData'), { recursive: true })
  await fsPromises.writeFile(
    getStorePath(),
    `${JSON.stringify({ settings: store.settings, memory: store.memory }, null, 2)}\n`,
    'utf8',
  )
  return store
}

async function readStore(): Promise<CombinedStore> {
  if (cachedStore) {
    return cachedStore
  }

  let parsed: unknown = null
  try {
    parsed = JSON.parse(await fsPromises.readFile(getStorePath(), 'utf8'))
  } catch {
    parsed = null
  }

  // Already in the combined { settings, memory } format.
  if (
    parsed &&
    typeof parsed === 'object' &&
    ('settings' in (parsed as object) || 'memory' in (parsed as object))
  ) {
    const candidate = parsed as { settings?: unknown; memory?: unknown }
    const store: CombinedStore = {
      settings: normalizeSettings(candidate.settings),
      memory: await normalizeStoredMemory(candidate.memory),
    }
    cachedStore = store
    return store
  }

  // Legacy format: flat settings.json + separate memory.json. Merge them.
  const settings = parsed ? normalizeSettings(parsed) : defaultAppSettings

  let memory: PersistedAppMemory
  try {
    const legacyMemory = JSON.parse(await fsPromises.readFile(getLegacyMemoryPath(), 'utf8'))
    memory = await normalizeStoredMemory(legacyMemory)
  } catch {
    memory = await normalizeStoredMemory(defaultAppMemory)
  }

  const store = await writeStore({ settings, memory })

  try {
    await fsPromises.unlink(getLegacyMemoryPath())
  } catch {
    // Nothing to clean up.
  }

  return store
}

async function getLastOpenDirectory(): Promise<string> {
  const store = await readStore()
  return store.memory.lastOpenDirectory
}

function registerVlcHandlers() {
  ipcMain.handle('vlc:load', async (_event, filePath: string) => {
    if (!vlcPlayer) {
      return { ok: false as const, error: 'VLC player is not ready', reloaded: true }
    }

    return vlcPlayer.loadIfNeeded(filePath)
  })

  ipcMain.handle('vlc:play', async () => {
    vlcPlayer?.play()
  })

  ipcMain.handle('vlc:pause', async () => {
    vlcPlayer?.pause()
  })

  ipcMain.handle('vlc:stop', async () => {
    vlcPlayer?.stop()
  })

  ipcMain.handle('vlc:seek', async (_event, timeMs: number) => {
    vlcPlayer?.seek(timeMs)
  })

  ipcMain.handle('vlc:set-volume', async (_event, volume: number) => {
    vlcPlayer?.setVolume(volume)
  })

  ipcMain.handle('vlc:set-volume-muted', async (_event, muted: boolean) => {
    vlcPlayer?.setVolumeMuted(muted)
  })

  ipcMain.handle('vlc:set-rate', async (_event, rate: number) => {
    vlcPlayer?.setRate(rate)
  })

  ipcMain.handle('vlc:set-audio-effects', async (_event, effects: VlcAudioEffects) => {
    vlcPlayer?.setAudioEffects(effects)
  })

  ipcMain.handle('vlc:set-video-effects', async (_event, effects: VlcVideoEffects) => {
    vlcPlayer?.setVideoEffects(effects)
  })

  ipcMain.handle('vlc:set-video-visible', async (_event, visible: boolean) => {
    vlcPlayer?.setVideoVisible(visible)
  })

  ipcMain.handle('vlc:suspend-video-overlay', async () => {
    vlcPlayer?.suspendVideoOverlay()
  })

  ipcMain.handle('vlc:resume-video-overlay', async () => {
    vlcPlayer?.resumeVideoOverlay()
  })

  ipcMain.handle('vlc:set-viewport', async (_event, bounds: ViewportBounds) => {
    vlcPlayer?.setViewport(bounds)
  })

  ipcMain.on('vlc:set-viewport-sync', (_event, bounds: ViewportBounds) => {
    vlcPlayer?.setViewport(bounds)
  })

  ipcMain.handle('vlc:hide-video-overlay', async () => {
    vlcPlayer?.hideVideoOverlay()
  })

  ipcMain.on('vlc:hide-video-overlay-sync', () => {
    vlcPlayer?.hideVideoOverlay()
  })

  ipcMain.handle('vlc:prioritize-ui-overlay', async () => {
    if (!vlcPlayer) {
      return null
    }

    return vlcPlayer.prioritizeUiOverlay()
  })

  ipcMain.handle('vlc:release-ui-overlay', async () => {
    vlcPlayer?.releaseUiOverlay()
  })

  ipcMain.handle('vlc:start-recording', async (_event, destPath: string) => {
    if (!vlcPlayer) {
      return { ok: false as const, error: 'VLC player is not ready' }
    }

    return vlcPlayer.startRecording(destPath)
  })

  ipcMain.handle('vlc:stop-recording', async () => {
    vlcPlayer?.stopRecording()
  })

  ipcMain.handle('vlc:get-state', async () => {
    return (
      vlcPlayer?.getState() ?? {
        playing: false,
        paused: false,
        ended: false,
        currentTimeMs: 0,
        durationMs: 0,
      }
    )
  })
}

function registerMediaProbeHandlers() {
  ipcMain.handle('media-probe:metadata', async (_event, filePath: string) => {
    try {
      return await getMediaProbeService().extractMetadata(filePath)
    } catch (error) {
      console.warn('media-probe:metadata failed:', error)
      return null
    }
  })

  ipcMain.handle('media-probe:tracks', async (_event, filePath: string) => {
    try {
      return await getMediaProbeService().extractTracks(filePath)
    } catch (error) {
      console.warn('media-probe:tracks failed:', error)
      return []
    }
  })

  ipcMain.handle(
    'media-probe:thumbnail',
    async (_event, filePath: string, options?: MediaThumbnailOptions) => {
      try {
        return await getMediaProbeService().extractThumbnail(filePath, options ?? {})
      } catch (error) {
        console.warn('media-probe:thumbnail failed:', error)
        return null
      }
    },
  )
}

function resolveAppIcon() {
  const iconCandidates =
    process.platform === 'win32'
      ? ['public/icon.ico', 'dist/icon.ico', 'public/logo.png', 'dist/logo.png', 'icon.ico', 'logo.png']
      : ['public/logo.png', 'dist/logo.png', 'public/icon.ico', 'dist/icon.ico', 'logo.png', 'icon.ico']

  const roots = [app.getAppPath(), path.join(__dirname, '..'), process.resourcesPath]

  for (const root of roots) {
    for (const relativePath of iconCandidates) {
      const iconPath = path.join(root, relativePath)
      const source = nativeImage.createFromPath(iconPath)

      if (source.isEmpty()) {
        continue
      }

      if (relativePath.endsWith('.ico')) {
        return source
      }

      const { width, height } = source.getSize()
      const cropInset = Math.round(Math.min(width, height) * 0.1)
      const cropped = source.crop({
        x: cropInset,
        y: cropInset,
        width: Math.max(1, width - cropInset * 2),
        height: Math.max(1, height - cropInset * 2),
      })

      return cropped.resize({ width: 256, height: 256, quality: 'best' })
    }
  }

  return undefined
}

function initializeVlcPlayer(window: BrowserWindow) {
  try {
    vlcPlayer?.destroy()
    vlcPlayer = new VlcPlayerService()
    vlcPlayer.attachParent(window)
    vlcPlayer.setOnEnded(() => {
      mainWindow?.webContents.send('vlc:ended')
    })
  } catch (error) {
    console.error('Failed to initialize libVLC:', error)
    vlcPlayer = null
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    show: false,
    icon: resolveAppIcon(),
    backgroundColor: '#0b1020',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false,
    },
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  void mainWindow.loadFile(rendererIndex)
  initializeVlcPlayer(mainWindow)

  mainWindow.on('blur', hideFloatingOverlays)
  mainWindow.on('focus', restoreFloatingOverlaysIfNeeded)
  mainWindow.on('hide', hideFloatingOverlays)
  mainWindow.on('show', restoreFloatingOverlaysIfNeeded)
  // Minimize must tuck overlays immediately — blur alone can see focus on the
  // always-on-top child and skip hiding, leaving controls over other apps.
  mainWindow.on('minimize', () => {
    tuckFloatingOverlays()
  })
  mainWindow.on('restore', restoreFloatingOverlaysIfNeeded)

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  }

  mainWindow.on('closed', () => {
    if (controlsWindow && !controlsWindow.isDestroyed()) {
      controlsWindow.destroy()
    }
    controlsWindow = null
    if (filesMenuWindow && !filesMenuWindow.isDestroyed()) {
      filesMenuWindow.destroy()
    }
    filesMenuWindow = null
    vlcPlayer?.destroy()
    vlcPlayer = null
    mainWindow = null
  })
}

function ensureControlsWindow(): BrowserWindow | null {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return null
  }

  if (controlsWindow && !controlsWindow.isDestroyed()) {
    return controlsWindow
  }

  controlsWindow = new BrowserWindow({
    parent: mainWindow,
    frame: false,
    transparent: true,
    show: false,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    // Keep focus on the main window so clicking controls does not blur it
    // (blur used to tuck the video layer and leave a black stage).
    focusable: false,
    minWidth: 1,
    minHeight: 1,
    hasShadow: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false,
    },
  })

  controlsWindow.setIgnoreMouseEvents(true, { forward: true })
  // Keep the controls overlay above the native (non-topmost) video window so
  // clicks always land on the controls instead of the video underneath.
  controlsWindow.setAlwaysOnTop(true, 'pop-up-menu')
  void controlsWindow.loadFile(rendererIndex, { hash: '/controls-overlay' })
  vlcPlayer?.setControlsOverlayWindow(controlsWindow)

  controlsWindow.on('closed', () => {
    vlcPlayer?.setControlsOverlayWindow(null)
    controlsWindow = null
  })

  return controlsWindow
}

function ensureFilesMenuWindow(): BrowserWindow | null {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return null
  }

  if (filesMenuWindow && !filesMenuWindow.isDestroyed()) {
    return filesMenuWindow
  }

  filesMenuWindow = new BrowserWindow({
    parent: mainWindow,
    frame: false,
    transparent: true,
    show: false,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    focusable: true,
    hasShadow: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false,
    },
  })

  filesMenuWindow.setIgnoreMouseEvents(true, { forward: true })
  // The files menu must sit above the controls overlay (which is itself kept
  // above the video window), so give it a higher always-on-top level.
  filesMenuWindow.setAlwaysOnTop(true, 'screen-saver')
  void filesMenuWindow.loadFile(rendererIndex, { hash: '/files-menu-overlay' })
  vlcPlayer?.setFilesMenuOverlayWindow(filesMenuWindow)

  filesMenuWindow.webContents.on('did-start-loading', () => {
    filesMenuReady = false
  })

  filesMenuWindow.on('closed', () => {
    vlcPlayer?.setFilesMenuOverlayWindow(null)
    filesMenuWindow = null
  })

  return filesMenuWindow
}

function watchRenderer() {
  if (!isDev || rendererWatcher) {
    return
  }

  rendererWatcher = fs.watch(rendererIndex, () => {
    mainWindow?.webContents.reload()
    if (controlsWindow && !controlsWindow.isDestroyed()) {
      controlsWindow.webContents.reload()
    }
    if (filesMenuWindow && !filesMenuWindow.isDestroyed()) {
      filesMenuWindow.webContents.reload()
    }
  })
}

ipcMain.handle('updates:get-version', () => getCurrentAppVersion())

ipcMain.handle('updates:check', async () => checkForAppUpdates())

ipcMain.handle('updates:open-download', async (_event, url: unknown) => {
  if (typeof url !== 'string') {
    return false
  }

  return openUpdateDownload(url)
})

ipcMain.handle('updates:install', async (event, url: unknown) => {
  if (typeof url !== 'string') {
    return { ok: false, message: 'Invalid download URL' }
  }

  return downloadAndInstallUpdate(url, (progress) => {
    if (!event.sender.isDestroyed()) {
      event.sender.send('updates:download-progress', progress)
    }
  })
})

ipcMain.handle('app:get-launch-files', () => {
  const files = pendingLaunchFiles
  pendingLaunchFiles = []
  return files
})

ipcMain.handle('settings:get', async () => (await readStore()).settings)

function broadcastSettings(settings: AppSettings) {
  for (const window of [mainWindow, controlsWindow, filesMenuWindow]) {
    if (window && !window.isDestroyed()) {
      window.webContents.send('settings:changed-relayed', settings)
    }
  }
}

ipcMain.handle('settings:save', async (_event, settings: AppSettings) => {
  const store = await readStore()
  const nextSettings = normalizeSettings(settings)
  await writeStore({ ...store, settings: nextSettings })
  broadcastSettings(nextSettings)
  return nextSettings
})

ipcMain.handle('memory:get', async () => toRuntimeMemory((await readStore()).memory))
ipcMain.handle('memory:save', async (_event, memory: PersistedAppMemory) => {
  const store = await readStore()
  const nextMemory = await normalizeStoredMemory(memory)
  await writeStore({ ...store, memory: nextMemory })
  return nextMemory
})

type ControlsOverlayBounds = { x: number; y: number; width: number; height: number }

type FilesMenuBounds = { x: number; y: number; width: number; height: number }

function revealFilesMenuWindow() {
  if (!filesMenuWindow || filesMenuWindow.isDestroyed()) {
    filesMenuRevealPending = false
    return
  }

  filesMenuRevealPending = false
  filesMenuWindow.webContents.send('files-menu:show-relayed', filesMenuContent)
  vlcPlayer?.raiseFilesMenuOverlay()
}

ipcMain.on('files-menu:ready', () => {
  filesMenuReady = true
  if (filesMenuRevealPending) {
    revealFilesMenuWindow()
  }
})

ipcMain.on('files-menu:show', (_event, bounds: FilesMenuBounds, content: unknown) => {
  const window = ensureFilesMenuWindow()
  if (!window || !mainWindow || mainWindow.isDestroyed()) {
    return
  }

  filesMenuContent = content ?? null

  const contentBounds = mainWindow.getContentBounds()
  window.setBounds({
    x: Math.round(contentBounds.x + bounds.x),
    y: Math.round(contentBounds.y + bounds.y),
    width: Math.max(1, Math.round(bounds.width)),
    height: Math.max(1, Math.round(bounds.height)),
  })

  window.setIgnoreMouseEvents(false)

  if (!window.isVisible()) {
    window.showInactive()
  }

  filesMenuRevealPending = true

  if (filesMenuReady && !window.webContents.isLoading()) {
    revealFilesMenuWindow()
    return
  }

  if (window.webContents.isLoading()) {
    window.webContents.once('did-finish-load', () => {
      if (filesMenuReady) {
        revealFilesMenuWindow()
      }
    })
  }
})

ipcMain.on('files-menu:hide', () => {
  filesMenuRevealPending = false

  if (filesMenuWindow && !filesMenuWindow.isDestroyed()) {
    filesMenuWindow.webContents.send('files-menu:hide-relayed')
    filesMenuWindow.hide()
    filesMenuWindow.setIgnoreMouseEvents(true, { forward: true })
  }
})

ipcMain.on('files-menu:action', (_event, action: unknown) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('files-menu:action-relayed', action)
  }

  filesMenuRevealPending = false

  if (filesMenuWindow && !filesMenuWindow.isDestroyed()) {
    filesMenuWindow.webContents.send('files-menu:hide-relayed')
    filesMenuWindow.hide()
    filesMenuWindow.setIgnoreMouseEvents(true, { forward: true })
  }
})

// A menu item selection that should NOT close the overlay (e.g. expanding a
// submenu). The renderer decides whether to reposition or hide afterwards.
ipcMain.on('files-menu:select', (_event, id: unknown) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('files-menu:select-relayed', id)
  }
})

ipcMain.on('files-menu:close', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('files-menu:close-relayed')
  }

  filesMenuRevealPending = false

  if (filesMenuWindow && !filesMenuWindow.isDestroyed()) {
    filesMenuWindow.webContents.send('files-menu:hide-relayed')
    filesMenuWindow.hide()
    filesMenuWindow.setIgnoreMouseEvents(true, { forward: true })
  }
})

ipcMain.on('controls:set-bounds', (_event, bounds: ControlsOverlayBounds) => {
  const window = ensureControlsWindow()
  if (!window || !mainWindow || mainWindow.isDestroyed()) {
    return
  }

  controlsOverlayWanted = true

  const contentBounds = mainWindow.getContentBounds()
  window.setBounds({
    x: Math.round(contentBounds.x + bounds.x),
    y: Math.round(contentBounds.y + bounds.y),
    width: Math.max(1, Math.round(bounds.width)),
    height: Math.max(1, Math.round(bounds.height)),
  })

  if (!mainWindow.isFocused()) {
    return
  }

  if (!window.isVisible()) {
    window.showInactive()
    window.setIgnoreMouseEvents(true, { forward: true })
    window.webContents.send('controls:suspended-relayed')
  }

  vlcPlayer?.raiseControlsOverlay()
})

function getControlsOverlayCursor(): { x: number; y: number; inside: boolean } | null {
  if (!controlsWindow || controlsWindow.isDestroyed() || !controlsWindow.isVisible()) {
    return null
  }

  const cursor = screen.getCursorScreenPoint()
  const bounds = controlsWindow.getBounds()
  const x = cursor.x - bounds.x
  const y = cursor.y - bounds.y

  return {
    x,
    y,
    inside: x >= 0 && y >= 0 && x <= bounds.width && y <= bounds.height,
  }
}

ipcMain.handle('controls:cursor-point', () => getControlsOverlayCursor())

ipcMain.on('controls:raise', () => {
  vlcPlayer?.raiseControlsOverlay()
})

ipcMain.on('controls:hide', () => {
  controlsOverlayWanted = false

  if (controlsWindow && !controlsWindow.isDestroyed()) {
    controlsWindow.hide()
    controlsWindow.webContents.send('controls:suspended-relayed')
  }
})

ipcMain.on('controls:set-interactive', (_event, interactive: boolean) => {
  if (!controlsWindow || controlsWindow.isDestroyed()) {
    return
  }

  if (interactive) {
    controlsWindow.setIgnoreMouseEvents(false)
    vlcPlayer?.raiseControlsOverlay()
  } else {
    controlsWindow.setIgnoreMouseEvents(true, { forward: true })
    // Keep the transparent overlay above the native video window so forwarded
    // mouse-move events still reach the controls after settings navigation.
    vlcPlayer?.raiseControlsOverlay()
  }
})

ipcMain.on('controls:state', (_event, state: unknown) => {
  if (controlsWindow && !controlsWindow.isDestroyed()) {
    controlsWindow.webContents.send('controls:state-relayed', state)

    if (controlsWindow.isVisible()) {
      vlcPlayer?.raiseControlsOverlay()
    }
  }
})

ipcMain.on('controls:action', (_event, action: unknown) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('controls:action-relayed', action)
  }
})

ipcMain.on('controls:ready', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('controls:request-state-relayed')
  }
})

ipcMain.handle('files:openSingle', async (_event, fileType: unknown) => {
  if (!isMediaFileType(fileType)) {
    return null
  }

  if (!mainWindow || mainWindow.isDestroyed()) {
    return null
  }

  const defaultDirectory = await getLastOpenDirectory()
  return withFileDialog(() => openSingleFile(mainWindow!, fileType, defaultDirectory))
})

ipcMain.handle('files:openMultiple', async (_event, fileType: unknown) => {
  if (!isMediaFileType(fileType)) {
    return []
  }

  if (!mainWindow || mainWindow.isDestroyed()) {
    return []
  }

  const defaultDirectory = await getLastOpenDirectory()
  return withFileDialog(() => openMultipleFiles(mainWindow!, fileType, defaultDirectory))
})

ipcMain.handle('files:openFolder', async (_event, fileType: unknown) => {
  if (!isMediaFileType(fileType)) {
    return []
  }

  if (!mainWindow || mainWindow.isDestroyed()) {
    return []
  }

  const defaultDirectory = await getLastOpenDirectory()
  return withFileDialog(() => openFolderFiles(mainWindow!, fileType, defaultDirectory))
})

ipcMain.handle(
  'recording:choose-path',
  async (_event, sourcePath: string, suggestedFileName: string) => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return null
    }

    if (typeof sourcePath !== 'string' || typeof suggestedFileName !== 'string') {
      return null
    }

    const suggestedExtension = path.extname(suggestedFileName).replace('.', '')
    const sourceExtension = path.extname(sourcePath).replace('.', '')
    const dialogExtension = suggestedExtension || sourceExtension
    const defaultPath = path.join(path.dirname(sourcePath), suggestedFileName)

    return withFileDialog(async () => {
      const result = await dialog.showSaveDialog(mainWindow!, {
        defaultPath,
        filters: dialogExtension
          ? [{ name: dialogExtension.toUpperCase(), extensions: [dialogExtension] }]
          : undefined,
      })

      if (result.canceled || !result.filePath) {
        return null
      }

      return result.filePath
    })
  },
)

if (gotSingleInstanceLock) {
  app.whenReady().then(() => {
    // Hide the default File/Edit/View/Window menu bar; the app uses its own navbar.
    Menu.setApplicationMenu(null)

    ensureOverlayWatchdog()
    app.on('browser-window-blur', (_event, window) => {
      if (window === mainWindow) {
        hideFloatingOverlays()
      }
    })

    registerVlcHandlers()
    registerMediaProbeHandlers()
    createWindow()
    watchRenderer()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
      }
    })
  })

  app.on('window-all-closed', () => {
    rendererWatcher?.close()
    rendererWatcher = null

    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  app.on('before-quit', () => {
    vlcPlayer?.destroy()
    vlcPlayer = null
  })
}
