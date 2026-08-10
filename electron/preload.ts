import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type { MediaFileType } from './open-files.js'
import type { AppMemory, PersistedAppMemory } from './memory.js'
import type { AppSettings } from './settings.js'
import type {
  MediaMetadata,
  MediaThumbnail,
  MediaThumbnailOptions,
  MediaTrackInfo,
} from '../shared/media-probe.js'
import type { UpdateCheckResult } from '../shared/updates.js'

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  getPathForFile: (file: File) => webUtils.getPathForFile(file),
  getAppVersion: () => ipcRenderer.invoke('updates:get-version') as Promise<string>,
  checkForUpdates: () => ipcRenderer.invoke('updates:check') as Promise<UpdateCheckResult>,
  openUpdateDownload: (url: string) =>
    ipcRenderer.invoke('updates:open-download', url) as Promise<boolean>,
  getLaunchFiles: () => ipcRenderer.invoke('app:get-launch-files') as Promise<string[]>,
  onOpenFiles: (callback: (filePaths: string[]) => void) => {
    const listener = (_event: unknown, filePaths: string[]) => {
      if (Array.isArray(filePaths)) {
        callback(filePaths)
      }
    }
    ipcRenderer.on('app:open-files', listener)
    return () => {
      ipcRenderer.removeListener('app:open-files', listener)
    }
  },
  getSettings: () => ipcRenderer.invoke('settings:get') as Promise<AppSettings>,
  saveSettings: (settings: AppSettings) =>
    ipcRenderer.invoke('settings:save', settings) as Promise<AppSettings>,
  onSettingsChanged: (callback: (settings: AppSettings) => void) => {
    const listener = (_event: unknown, settings: AppSettings) => callback(settings)
    ipcRenderer.on('settings:changed-relayed', listener)
    return () => {
      ipcRenderer.removeListener('settings:changed-relayed', listener)
    }
  },
  getMemory: () => ipcRenderer.invoke('memory:get') as Promise<AppMemory>,
  saveMemory: (memory: PersistedAppMemory) =>
    ipcRenderer.invoke('memory:save', memory) as Promise<PersistedAppMemory>,
  openSingleFile: (fileType: MediaFileType) =>
    ipcRenderer.invoke('files:openSingle', fileType) as Promise<string | null>,
  openMultipleFiles: (fileType: MediaFileType) =>
    ipcRenderer.invoke('files:openMultiple', fileType) as Promise<string[]>,
  openFolderFiles: (fileType: MediaFileType) =>
    ipcRenderer.invoke('files:openFolder', fileType) as Promise<string[]>,
  vlcLoad: (filePath: string) =>
    ipcRenderer.invoke('vlc:load', filePath) as Promise<{
      ok: boolean
      error?: string
      reloaded?: boolean
    }>,
  vlcPlay: () => ipcRenderer.invoke('vlc:play') as Promise<void>,
  vlcPause: () => ipcRenderer.invoke('vlc:pause') as Promise<void>,
  vlcStop: () => ipcRenderer.invoke('vlc:stop') as Promise<void>,
  vlcSeek: (timeMs: number) => ipcRenderer.invoke('vlc:seek', timeMs) as Promise<void>,
  vlcSetVolume: (volume: number) =>
    ipcRenderer.invoke('vlc:set-volume', volume) as Promise<void>,
  vlcSetVolumeMuted: (muted: boolean) =>
    ipcRenderer.invoke('vlc:set-volume-muted', muted) as Promise<void>,
  vlcSetRate: (rate: number) => ipcRenderer.invoke('vlc:set-rate', rate) as Promise<void>,
  vlcSetAudioEffects: (effects: { bands: number[]; outputGain: number }) =>
    ipcRenderer.invoke('vlc:set-audio-effects', effects) as Promise<void>,
  vlcSetVideoEffects: (effects: {
    grayscale: number
    contrast: number
    brightness: number
    saturation: number
    sepia: number
    hue: number
    gamma: number
    blur: number
  }) => ipcRenderer.invoke('vlc:set-video-effects', effects) as Promise<void>,
  mediaGetMetadata: (filePath: string) =>
    ipcRenderer.invoke('media-probe:metadata', filePath) as Promise<MediaMetadata | null>,
  mediaGetTracks: (filePath: string) =>
    ipcRenderer.invoke('media-probe:tracks', filePath) as Promise<MediaTrackInfo[]>,
  mediaGetThumbnail: (filePath: string, options?: MediaThumbnailOptions) =>
    ipcRenderer.invoke('media-probe:thumbnail', filePath, options ?? null) as Promise<MediaThumbnail | null>,
  vlcSetVideoVisible: (visible: boolean) =>
    ipcRenderer.invoke('vlc:set-video-visible', visible) as Promise<void>,
  vlcSuspendVideoOverlay: () =>
    ipcRenderer.invoke('vlc:suspend-video-overlay') as Promise<void>,
  vlcResumeVideoOverlay: () =>
    ipcRenderer.invoke('vlc:resume-video-overlay') as Promise<void>,
  vlcSetViewport: (bounds: { x: number; y: number; width: number; height: number }) => {
    ipcRenderer.send('vlc:set-viewport-sync', bounds)
  },
  vlcHideVideoOverlay: () => {
    ipcRenderer.send('vlc:hide-video-overlay-sync')
  },
  vlcPrioritizeUiOverlay: () =>
    ipcRenderer.invoke('vlc:prioritize-ui-overlay') as Promise<string | null>,
  vlcReleaseUiOverlay: () => ipcRenderer.invoke('vlc:release-ui-overlay') as Promise<void>,
  recordingChoosePath: (sourcePath: string, suggestedFileName: string) =>
    ipcRenderer.invoke('recording:choose-path', sourcePath, suggestedFileName) as Promise<
      string | null
    >,
  vlcStartRecording: (destPath: string) =>
    ipcRenderer.invoke('vlc:start-recording', destPath) as Promise<{
      ok: boolean
      error?: string
    }>,
  vlcStopRecording: () => ipcRenderer.invoke('vlc:stop-recording') as Promise<void>,
  vlcGetState: () =>
    ipcRenderer.invoke('vlc:get-state') as Promise<{
      playing: boolean
      paused: boolean
      ended: boolean
      currentTimeMs: number
      durationMs: number
    }>,
  onVlcEnded: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('vlc:ended', listener)
    return () => {
      ipcRenderer.removeListener('vlc:ended', listener)
    }
  },
  onVlcParentGeometryChanged: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('vlc:parent-geometry-changed', listener)
    return () => {
      ipcRenderer.removeListener('vlc:parent-geometry-changed', listener)
    }
  },
  // Floating controls overlay window (used in the "controls inside video" mode).
  setControlsOverlayBounds: (bounds: { x: number; y: number; width: number; height: number }) => {
    ipcRenderer.send('controls:set-bounds', bounds)
  },
  hideControlsOverlay: () => {
    ipcRenderer.send('controls:hide')
  },
  setControlsOverlayInteractive: (interactive: boolean) => {
    ipcRenderer.send('controls:set-interactive', interactive)
  },
  raiseControlsOverlay: () => {
    ipcRenderer.send('controls:raise')
  },
  isCursorOverControlsOverlay: () =>
    ipcRenderer.invoke('controls:cursor-over') as Promise<boolean>,
  sendControlsState: (state: unknown) => {
    ipcRenderer.send('controls:state', state)
  },
  onControlsState: (callback: (state: unknown) => void) => {
    const listener = (_event: unknown, state: unknown) => callback(state)
    ipcRenderer.on('controls:state-relayed', listener)
    return () => {
      ipcRenderer.removeListener('controls:state-relayed', listener)
    }
  },
  onControlsSuspended: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('controls:suspended-relayed', listener)
    return () => {
      ipcRenderer.removeListener('controls:suspended-relayed', listener)
    }
  },
  sendControlsAction: (action: unknown) => {
    ipcRenderer.send('controls:action', action)
  },
  notifyControlsReady: () => {
    ipcRenderer.send('controls:ready')
  },
  onControlsRequestState: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('controls:request-state-relayed', listener)
    return () => {
      ipcRenderer.removeListener('controls:request-state-relayed', listener)
    }
  },
  onControlsAction: (callback: (action: unknown) => void) => {
    const listener = (_event: unknown, action: unknown) => callback(action)
    ipcRenderer.on('controls:action-relayed', listener)
    return () => {
      ipcRenderer.removeListener('controls:action-relayed', listener)
    }
  },
  showFilesMenu: (
    bounds: { x: number; y: number; width: number; height: number },
    content?: unknown,
  ) => {
    ipcRenderer.send('files-menu:show', bounds, content ?? null)
  },
  hideFilesMenu: () => {
    ipcRenderer.send('files-menu:hide')
  },
  sendFilesMenuAction: (action: unknown) => {
    ipcRenderer.send('files-menu:action', action)
  },
  sendFilesMenuSelect: (id: string) => {
    ipcRenderer.send('files-menu:select', id)
  },
  sendFilesMenuClose: () => {
    ipcRenderer.send('files-menu:close')
  },
  notifyFilesMenuReady: () => {
    ipcRenderer.send('files-menu:ready')
  },
  onFilesMenuShow: (callback: (content: unknown) => void) => {
    const listener = (_event: unknown, content: unknown) => callback(content)
    ipcRenderer.on('files-menu:show-relayed', listener)
    return () => {
      ipcRenderer.removeListener('files-menu:show-relayed', listener)
    }
  },
  onFilesMenuHide: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('files-menu:hide-relayed', listener)
    return () => {
      ipcRenderer.removeListener('files-menu:hide-relayed', listener)
    }
  },
  onFilesMenuAction: (callback: (action: unknown) => void) => {
    const listener = (_event: unknown, action: unknown) => callback(action)
    ipcRenderer.on('files-menu:action-relayed', listener)
    return () => {
      ipcRenderer.removeListener('files-menu:action-relayed', listener)
    }
  },
  onFilesMenuSelect: (callback: (id: string) => void) => {
    const listener = (_event: unknown, id: string) => callback(id)
    ipcRenderer.on('files-menu:select-relayed', listener)
    return () => {
      ipcRenderer.removeListener('files-menu:select-relayed', listener)
    }
  },
  onFilesMenuClose: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('files-menu:close-relayed', listener)
    return () => {
      ipcRenderer.removeListener('files-menu:close-relayed', listener)
    }
  },
})
