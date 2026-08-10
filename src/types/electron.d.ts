import type { MediaFileType } from '../../shared/vlc-media-extensions'
import type {
  AppMemory,
  AudioEffectsState,
  PersistedAppMemory,
  VideoEffectsState,
} from '../memory/memory'
import type { AppSettings } from './settings/settings'
import type {
  MediaMetadata,
  MediaThumbnail,
  MediaThumbnailOptions,
  MediaTrackInfo,
} from '../../shared/media-probe'
import type {
  UpdateCheckResult,
  UpdateDownloadProgress,
  UpdateInstallResult,
} from '../../shared/updates'

export type VlcPlayerState = {
  playing: boolean
  paused: boolean
  ended: boolean
  currentTimeMs: number
  durationMs: number
}

export type VlcViewportBounds = {
  x: number
  y: number
  width: number
  height: number
}

export type ControlsOverlayState = {
  hasActiveMedia: boolean
  playableFilesCount: number
  fileInfo?: {
    primaryLabel: string
    trackLabel?: string
    errorLabel?: string
  }
  repeatMode: 'off' | 'all' | 'one'
  shuffleEnabled: boolean
  direction: 'ltr' | 'rtl'
  isFullscreen: boolean
  recordingBarVisible: boolean
  recordingActive: boolean
  recordingStartedAt: number | null
}

export type ControlsOverlayAction =
  | { type: 'previous' }
  | { type: 'next' }
  | { type: 'cycle-repeat' }
  | { type: 'toggle-shuffle' }
  | { type: 'toggle-fullscreen' }
  | { type: 'recording-start' }
  | { type: 'recording-stop' }
  | { type: 'recording-close' }

export type FilesMenuBounds = {
  x: number
  y: number
  width: number
  height: number
}

export type FilesMenuAction =
  | { type: 'single' }
  | { type: 'multiple' }
  | { type: 'folder' }

export type OverlayMenuItem = {
  id: string
  label: string
  variant?: 'normal' | 'parent' | 'child'
  expanded?: boolean
}

export type OverlayMenuContent = {
  ariaLabel?: string
  items: OverlayMenuItem[]
}

declare global {
  interface Window {
    electronAPI?: {
      platform: NodeJS.Platform
      getPathForFile: (file: File) => string
      getAppVersion: () => Promise<string>
      checkForUpdates: () => Promise<UpdateCheckResult>
      openUpdateDownload: (url: string) => Promise<boolean>
      installUpdate: (url: string) => Promise<UpdateInstallResult>
      onUpdateDownloadProgress: (
        callback: (progress: UpdateDownloadProgress) => void,
      ) => () => void
      getLaunchFiles: () => Promise<string[]>
      onOpenFiles: (callback: (filePaths: string[]) => void) => () => void
      getSettings: () => Promise<AppSettings>
      saveSettings: (settings: AppSettings) => Promise<AppSettings>
      onSettingsChanged: (callback: (settings: AppSettings) => void) => () => void
      getMemory: () => Promise<AppMemory>
      saveMemory: (memory: PersistedAppMemory) => Promise<PersistedAppMemory>
      openSingleFile: (fileType: MediaFileType) => Promise<string | null>
      openMultipleFiles: (fileType: MediaFileType) => Promise<string[]>
      openFolderFiles: (fileType: MediaFileType) => Promise<string[]>
      vlcLoad: (filePath: string) => Promise<{ ok: boolean; error?: string; reloaded?: boolean }>
      vlcPlay: () => Promise<void>
      vlcPause: () => Promise<void>
      vlcStop: () => Promise<void>
      vlcSeek: (timeMs: number) => Promise<void>
      vlcSetVolume: (volume: number) => Promise<void>
      vlcSetVolumeMuted: (muted: boolean) => Promise<void>
      vlcSetRate: (rate: number) => Promise<void>
      vlcSetAudioEffects: (effects: AudioEffectsState) => Promise<void>
      vlcSetVideoEffects: (effects: VideoEffectsState) => Promise<void>
      mediaGetMetadata: (filePath: string) => Promise<MediaMetadata | null>
      mediaGetTracks: (filePath: string) => Promise<MediaTrackInfo[]>
      mediaGetThumbnail: (
        filePath: string,
        options?: MediaThumbnailOptions,
      ) => Promise<MediaThumbnail | null>
      vlcSetVideoVisible: (visible: boolean) => Promise<void>
      vlcSuspendVideoOverlay: () => Promise<void>
      vlcResumeVideoOverlay: () => Promise<void>
      vlcSetViewport: (bounds: VlcViewportBounds) => void
      vlcHideVideoOverlay: () => void
      vlcPrioritizeUiOverlay: () => Promise<string | null>
      vlcReleaseUiOverlay: () => Promise<void>
      recordingChoosePath: (
        sourcePath: string,
        suggestedFileName: string,
      ) => Promise<string | null>
      vlcStartRecording: (destPath: string) => Promise<{ ok: boolean; error?: string }>
      vlcStopRecording: () => Promise<void>
      vlcGetState: () => Promise<VlcPlayerState>
      onVlcEnded: (callback: () => void) => () => void
      onVlcParentGeometryChanged: (callback: () => void) => () => void
      setControlsOverlayBounds: (bounds: VlcViewportBounds) => void
      hideControlsOverlay: () => void
      setControlsOverlayInteractive: (interactive: boolean) => void
      raiseControlsOverlay: () => void
      isCursorOverControlsOverlay: () => Promise<boolean>
      sendControlsState: (state: ControlsOverlayState) => void
      onControlsState: (
        callback: (state: ControlsOverlayState) => void,
      ) => () => void
      onControlsSuspended: (callback: () => void) => () => void
      sendControlsAction: (action: ControlsOverlayAction) => void
      onControlsAction: (
        callback: (action: ControlsOverlayAction) => void,
      ) => () => void
      notifyControlsReady: () => void
      onControlsRequestState: (callback: () => void) => () => void
      showFilesMenu: (bounds: FilesMenuBounds, content?: OverlayMenuContent | null) => void
      hideFilesMenu: () => void
      sendFilesMenuAction: (action: FilesMenuAction) => void
      sendFilesMenuSelect: (id: string) => void
      sendFilesMenuClose: () => void
      notifyFilesMenuReady: () => void
      onFilesMenuShow: (callback: (content: OverlayMenuContent | null) => void) => () => void
      onFilesMenuHide: (callback: () => void) => () => void
      onFilesMenuAction: (callback: (action: FilesMenuAction) => void) => () => void
      onFilesMenuSelect: (callback: (id: string) => void) => () => void
      onFilesMenuClose: (callback: () => void) => () => void
    }
  }
}

export {}
