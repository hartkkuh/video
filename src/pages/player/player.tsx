import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type DragEvent as ReactDragEvent,
} from 'react'
import { useFileActions } from '../../components/file-actions'
import { useMediaThumbnail } from '../../components/media_info/media-info'
import PlayerControls from '../../components/player_controls/player_controls'
import { useAppTranslation } from '../../i18n/useAppTranslation'
import type { RepeatMode } from '../../memory/memory'
import { useAppMemory } from '../../memory/memory-context'
import {
  filterPlayablePaths,
  getFileName,
  getMediaKind,
} from '../../tools/media-paths'
import {
  isViewportVisibleInWindow,
  measureVlcViewportBounds,
  viewportBoundsKey,
} from '../../tools/vlc-viewport-bounds'
import type { ControlsOverlayState } from '../../types/electron'
import styles from './player.module.css'

const logoSrc = `${import.meta.env.BASE_URL}logo.png`

function buildSuggestedRecordingFileName(sourcePath: string, suffix: string): string {
  const fileName = getFileName(sourcePath)
  const dotIndex = fileName.lastIndexOf('.')
  const base = dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName
  // Video recordings are written as H.264/AAC MP4.
  const extension =
    getMediaKind(sourcePath) === 'video'
      ? '.mp4'
      : dotIndex > 0
        ? fileName.slice(dotIndex)
        : ''

  return `${base} ${suffix}${extension}`
}

function formatRecordingElapsed(startedAt: number | null, nowMs: number): string {
  if (startedAt === null) {
    return '00:00'
  }

  const totalSeconds = Math.max(0, Math.floor((nowMs - startedAt) / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const minutePart = String(minutes).padStart(2, '0')
  const secondPart = String(seconds).padStart(2, '0')

  if (hours > 0) {
    return `${hours}:${minutePart}:${secondPart}`
  }

  return `${minutePart}:${secondPart}`
}

export default function Player() {
  const { t, i18n } = useAppTranslation()
  const {
    autoplayToken,
    signalAutoplay,
    recordingBarVisible,
    closeRecordingBar,
  } = useFileActions()
  const {
    memory,
    setFilePaths: persistFilePaths,
    setCurrentIndex: persistCurrentIndex,
    setRepeatMode: persistRepeatMode,
    setShuffleEnabled: persistShuffleEnabled,
    setVolume: persistVolume,
    setVolumeMuted: persistVolumeMuted,
  } = useAppMemory()
  const { filePaths, currentIndex, repeatMode, shuffleEnabled, volume } = memory
  const [errorKey, setErrorKey] = useState<'player.invalidFile' | null>(null)
  const [overlayControlsVisible, setOverlayControlsVisible] = useState(true)
  const [recordingActive, setRecordingActive] = useState(false)
  const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(null)
  const [recordingNowMs, setRecordingNowMs] = useState(() => Date.now())

  const consumedAutoplayTokenRef = useRef(autoplayToken)
  const audioEffectsRef = useRef(memory.audioEffects)
  const videoEffectsRef = useRef(memory.videoEffects)
  const lastAppliedAudioEffectsRef = useRef(memory.audioEffects)
  const lastAppliedVideoEffectsRef = useRef(memory.videoEffects)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const videoViewportRef = useRef<HTMLDivElement | null>(null)
  const lastViewportKeyRef = useRef('')
  const overlayHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Tracked via a ref so the viewport-sync effect can read the latest value
  // without re-running (re-running would hide and re-show the native video
  // window on every controls show/hide, causing a black flicker).
  const overlayControlsVisibleRef = useRef(overlayControlsVisible)

  overlayControlsVisibleRef.current = overlayControlsVisible

  const [isStageFullscreen, setIsStageFullscreen] = useState(false)
  const [dropActive, setDropActive] = useState(false)
  const dragDepthRef = useRef(0)

  const currentFilePath = filePaths[currentIndex] ?? null
  const hasActiveMedia = Boolean(currentFilePath)
  const currentMediaKind = currentFilePath ? getMediaKind(currentFilePath) : null
  // The native video window covers HTML, so video controls live in a dedicated
  // transparent window. Audio has no native window, so its controls stay as
  // floating HTML inside this window.
  const useControlsOverlayWindow = currentMediaKind === 'video'

  // For audio, try to pull an embedded thumbnail/cover art via libVLC so the
  // spinning orb shows the artwork instead of the generic logo when available.
  const audioFilePath = currentMediaKind === 'audio' ? currentFilePath : null
  const { data: audioThumbnail } = useMediaThumbnail(audioFilePath, { width: 320 })
  const audioArtworkSrc = audioThumbnail?.dataUrl ?? null

  const loadMediaPaths = useCallback((paths: string[]) => {
    const playablePaths = filterPlayablePaths(paths)

    if (paths.length > 0 && playablePaths.length === 0) {
      persistFilePaths([])
      setErrorKey('player.invalidFile')
      return
    }

    if (playablePaths.length === 0) {
      persistFilePaths([])
      setErrorKey(null)
      return
    }

    persistFilePaths(playablePaths)
    signalAutoplay()
    setErrorKey(null)
  }, [persistFilePaths, signalAutoplay])

  useEffect(() => {
    if (!hasActiveMedia) {
      void window.electronAPI?.vlcStop?.()
      void window.electronAPI?.vlcSetVideoVisible?.(false)
    }
  }, [hasActiveMedia])

  audioEffectsRef.current = memory.audioEffects
  videoEffectsRef.current = memory.videoEffects

  useEffect(() => {
    if (!currentFilePath) {
      return
    }

    let cancelled = false

    void (async () => {
      if (cancelled) {
        return
      }

      await window.electronAPI?.vlcSetVideoVisible?.(currentMediaKind === 'video')

      // Navigating to Effects/Media mid-load must not leave videoVisible true,
      // or a later focus-restore will paint the native video over that page.
      if (cancelled) {
        void window.electronAPI?.vlcSetVideoVisible?.(false)
        return
      }

      const result = await window.electronAPI?.vlcLoad?.(currentFilePath)

      if (cancelled) {
        return
      }

      if (result?.ok === false) {
        setErrorKey('player.invalidFile')
        return
      }

      setErrorKey(null)

      // Apply effects only after media is loaded — avoids a race where IPC ran
      // while mediaLoaded was still false and effects were never attached.
      await window.electronAPI?.vlcSetAudioEffects?.(audioEffectsRef.current)
      if (cancelled) {
        return
      }

      await window.electronAPI?.vlcSetVideoEffects?.(videoEffectsRef.current)
      if (cancelled) {
        return
      }

      lastAppliedAudioEffectsRef.current = audioEffectsRef.current
      lastAppliedVideoEffectsRef.current = videoEffectsRef.current

      const shouldAutoplay =
        result?.reloaded !== false &&
        autoplayToken > consumedAutoplayTokenRef.current

      if (shouldAutoplay) {
        consumedAutoplayTokenRef.current = autoplayToken
        await window.electronAPI?.vlcPlay?.()
      }
    })()

    return () => {
      cancelled = true
    }
  }, [autoplayToken, currentFilePath, currentMediaKind])

  // Live effect updates while the same file stays loaded (skip the initial mount;
  // the load effect above applies effects once media is ready).
  useEffect(() => {
    if (!currentFilePath) {
      return
    }

    const audioChanged = lastAppliedAudioEffectsRef.current !== memory.audioEffects
    const videoChanged = lastAppliedVideoEffectsRef.current !== memory.videoEffects

    if (!audioChanged && !videoChanged) {
      return
    }

    lastAppliedAudioEffectsRef.current = memory.audioEffects
    lastAppliedVideoEffectsRef.current = memory.videoEffects

    if (audioChanged) {
      void window.electronAPI?.vlcSetAudioEffects?.(memory.audioEffects)
    }

    if (videoChanged) {
      void window.electronAPI?.vlcSetVideoEffects?.(memory.videoEffects)
    }
  }, [memory.audioEffects, memory.videoEffects, currentFilePath])

  useEffect(() => {
    if (!hasActiveMedia || currentMediaKind !== 'video') {
      // Keep videoVisible false so focus-restore (resumeVideoOverlay) cannot
      // resurrect the native window over Effects / Media / Settings.
      void window.electronAPI?.vlcSetVideoVisible?.(false)
      window.electronAPI?.vlcHideVideoOverlay?.()
      lastViewportKeyRef.current = ''
      return
    }

    // Tie the native video window to the player page being mounted. Without
    // this, a window move/resize while on another page (e.g. Settings) would
    // re-show the video over that page.
    void window.electronAPI?.vlcResumeVideoOverlay?.()
    void window.electronAPI?.vlcSetVideoVisible?.(true)

    let frameId = 0

    const pushViewportSync = (force = false) => {
      const viewport = videoViewportRef.current

      if (!viewport) {
        return
      }

      if (!isViewportVisibleInWindow(viewport)) {
        window.electronAPI?.vlcHideVideoOverlay?.()
        lastViewportKeyRef.current = ''
        return
      }

      // Video controls live in a separate overlay window, so the native video
      // window can fill the entire viewport.
      const bounds = measureVlcViewportBounds(viewport)

      if (bounds) {
        const nextKey = viewportBoundsKey(bounds)

        if (force || nextKey !== lastViewportKeyRef.current) {
          lastViewportKeyRef.current = nextKey
          window.electronAPI?.vlcSetViewport?.(bounds)
          window.electronAPI?.setControlsOverlayBounds?.(bounds)
        }
      } else {
        window.electronAPI?.vlcHideVideoOverlay?.()
        window.electronAPI?.hideControlsOverlay?.()
        lastViewportKeyRef.current = ''
      }
    }

    const syncViewport = () => {
      if (!videoViewportRef.current) {
        frameId = window.requestAnimationFrame(syncViewport)
        return
      }

      pushViewportSync()
      frameId = window.requestAnimationFrame(syncViewport)
    }

    const invalidateViewport = () => {
      lastViewportKeyRef.current = ''
    }

    const handleParentGeometryChanged = () => {
      lastViewportKeyRef.current = ''
      pushViewportSync(true)
    }

    frameId = window.requestAnimationFrame(syncViewport)
    window.addEventListener('resize', invalidateViewport)
    window.visualViewport?.addEventListener('resize', invalidateViewport)
    window.visualViewport?.addEventListener('scroll', invalidateViewport)
    const unsubscribeParentGeometry =
      window.electronAPI?.onVlcParentGeometryChanged?.(handleParentGeometryChanged)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('resize', invalidateViewport)
      window.visualViewport?.removeEventListener('resize', invalidateViewport)
      window.visualViewport?.removeEventListener('scroll', invalidateViewport)
      unsubscribeParentGeometry?.()
      // videoVisible must go false on leave: tab switches on Effects/Media can
      // spawn short-lived probe windows that blur/focus the main window, and
      // restoreFloatingOverlaysIfNeeded would otherwise resume a still-visible
      // video layer without the controls bar (Player is unmounted).
      void window.electronAPI?.vlcSetVideoVisible?.(false)
      window.electronAPI?.vlcSuspendVideoOverlay?.()
      window.electronAPI?.hideControlsOverlay?.()
      lastViewportKeyRef.current = ''
    }
  }, [hasActiveMedia, currentMediaKind])

  useEffect(() => {
    if (!useControlsOverlayWindow || !hasActiveMedia) {
      return
    }

    lastViewportKeyRef.current = ''

    let frameId = 0

    const restoreControlsOverlay = () => {
      const viewport = videoViewportRef.current

      if (!viewport) {
        frameId = window.requestAnimationFrame(restoreControlsOverlay)
        return
      }

      const bounds = measureVlcViewportBounds(viewport)

      if (bounds) {
        window.electronAPI?.setControlsOverlayBounds?.(bounds)
        window.electronAPI?.raiseControlsOverlay?.()
      }

      if (controlsStateRef.current) {
        window.electronAPI?.sendControlsState?.(controlsStateRef.current)
      }
    }

    frameId = window.requestAnimationFrame(restoreControlsOverlay)

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [useControlsOverlayWindow, hasActiveMedia])

  useEffect(() => {
    if (filePaths.length === 0) {
      if (currentIndex !== 0) {
        persistCurrentIndex(0)
      }
      return
    }

    if (currentIndex >= filePaths.length) {
      persistCurrentIndex(Math.max(0, filePaths.length - 1))
    }
  }, [currentIndex, filePaths.length, persistCurrentIndex])

  function getNextIndex(direction: 1 | -1) {
    if (filePaths.length === 0) {
      return 0
    }

    if (shuffleEnabled && filePaths.length > 1) {
      let candidate = currentIndex
      while (candidate === currentIndex) {
        candidate = Math.floor(Math.random() * filePaths.length)
      }
      return candidate
    }

    const nextIndex = currentIndex + direction
    if (nextIndex < 0) {
      return repeatMode === 'all' ? filePaths.length - 1 : 0
    }

    if (nextIndex >= filePaths.length) {
      return repeatMode === 'all' ? 0 : filePaths.length - 1
    }

    return nextIndex
  }

  function playIndex(index: number) {
    if (filePaths.length === 0) {
      return
    }

    signalAutoplay()
    persistCurrentIndex(Math.max(0, Math.min(index, filePaths.length - 1)))
  }

  function goPrevious() {
    playIndex(getNextIndex(-1))
  }

  function goNext() {
    playIndex(getNextIndex(1))
  }

  function handleEnded() {
    if (repeatMode === 'one') {
      void window.electronAPI?.vlcSeek?.(0)
      void window.electronAPI?.vlcPlay?.()
      return
    }

    if (filePaths.length === 0) {
      return
    }

    if (filePaths.length === 1) {
      if (repeatMode === 'all') {
        playIndex(0)
      }
      return
    }

    if (currentIndex < filePaths.length - 1) {
      goNext()
      return
    }

    if (repeatMode === 'all') {
      playIndex(shuffleEnabled ? getNextIndex(1) : 0)
    }
  }

  useEffect(() => {
    const unsubscribe = window.electronAPI?.onVlcEnded?.(() => {
      handleEnded()
    })

    return () => {
      unsubscribe?.()
    }
  }, [currentIndex, filePaths.length, repeatMode, shuffleEnabled])

  function cycleRepeatMode() {
    const nextMode: RepeatMode =
      repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off'
    persistRepeatMode(nextMode)
  }

  const stopRecording = useCallback(async () => {
    await window.electronAPI?.vlcStopRecording?.()
    setRecordingActive(false)
    setRecordingStartedAt(null)
  }, [])

  const startRecording = useCallback(async () => {
    if (!currentFilePath || recordingActive) {
      return
    }

    try {
      const suggestedFileName = buildSuggestedRecordingFileName(
        currentFilePath,
        t('recording.fileSuffix'),
      )
      const destPath = await window.electronAPI?.recordingChoosePath?.(
        currentFilePath,
        suggestedFileName,
      )

      if (!destPath) {
        return
      }

      const result = await window.electronAPI?.vlcStartRecording?.(destPath)
      if (result?.ok === false) {
        console.warn('Failed to start recording:', result.error)
        setErrorKey('player.invalidFile')
        return
      }

      const startedAt = Date.now()
      setRecordingActive(true)
      setRecordingStartedAt(startedAt)
      setRecordingNowMs(startedAt)
    } catch (error) {
      console.warn('Failed to start recording:', error)
      setErrorKey('player.invalidFile')
    }
  }, [currentFilePath, recordingActive, t])

  const handleCloseRecordingBar = useCallback(() => {
    if (recordingActive) {
      return
    }

    closeRecordingBar()
  }, [closeRecordingBar, recordingActive])

  useEffect(() => {
    if (!recordingActive) {
      return
    }

    // Elapsed time tracks only while playback (and thus recording) is running.
    let lastTickMs = Date.now()
    const timerId = window.setInterval(() => {
      void (async () => {
        const now = Date.now()
        const state = await window.electronAPI?.vlcGetState?.()
        if (!state?.playing) {
          const pausedDelta = now - lastTickMs
          setRecordingStartedAt((prev) => (prev === null ? prev : prev + pausedDelta))
        }
        setRecordingNowMs(now)
        lastTickMs = now
      })()
    }, 500)

    return () => window.clearInterval(timerId)
  }, [recordingActive])

  useEffect(() => {
    if (!hasActiveMedia && recordingActive) {
      void stopRecording()
    }
  }, [hasActiveMedia, recordingActive, stopRecording])

  useEffect(() => {
    // Switching tracks clears the sout chain in the player service; keep the UI in sync.
    setRecordingActive(false)
    setRecordingStartedAt(null)
  }, [currentFilePath])

  useEffect(() => {
    return () => {
      void window.electronAPI?.vlcStopRecording?.()
    }
  }, [])

  const fileLabel = useMemo(() => {
    if (filePaths.length === 0) {
      return t('player.noFileSelected')
    }

    if (filePaths.length === 1) {
      return getFileName(filePaths[0])
    }

    return t('player.filesSelected', { count: filePaths.length })
  }, [filePaths, t])

  const currentTrackLabel =
    filePaths.length > 0
      ? t('player.trackPosition', { current: currentIndex + 1, total: filePaths.length })
      : ''

  const controlFileInfo = {
    primaryLabel: fileLabel,
    trackLabel: currentTrackLabel || undefined,
    errorLabel: errorKey ? t(errorKey) : undefined,
  }

  const controlsDirection = i18n.language === 'he' ? 'ltr' : 'rtl'

  const revealOverlayControls = useCallback(() => {
    setOverlayControlsVisible(true)

    if (overlayHideTimerRef.current) {
      clearTimeout(overlayHideTimerRef.current)
    }

    overlayHideTimerRef.current = setTimeout(() => {
      setOverlayControlsVisible(false)
    }, 5000)
  }, [])

  useEffect(() => {
    if (!hasActiveMedia) {
      setOverlayControlsVisible(true)

      if (overlayHideTimerRef.current) {
        clearTimeout(overlayHideTimerRef.current)
      }

      return
    }

    revealOverlayControls()

    return () => {
      if (overlayHideTimerRef.current) {
        clearTimeout(overlayHideTimerRef.current)
      }
    }
  }, [hasActiveMedia, revealOverlayControls])

  const handleVideoFrameActivity = useCallback(() => {
    revealOverlayControls()
  }, [revealOverlayControls])

  const toggleStageFullscreen = useCallback(() => {
    const stage = stageRef.current
    if (!stage) {
      return
    }

    if (document.fullscreenElement) {
      void document.exitFullscreen()
      return
    }

    void stage.requestFullscreen()
  }, [])

  useEffect(() => {
    function handleFullscreenChange() {
      setIsStageFullscreen(document.fullscreenElement === stageRef.current)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () =>
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // The controls live in a separate transparent window in overlay mode, so
  // their actions are relayed back here where the playlist state lives.
  const actionHandlerRef = useRef<(action: { type: string }) => void>(() => {})
  actionHandlerRef.current = (action) => {
    switch (action.type) {
      case 'previous':
        goPrevious()
        break
      case 'next':
        goNext()
        break
      case 'cycle-repeat':
        cycleRepeatMode()
        break
      case 'toggle-shuffle':
        persistShuffleEnabled(!shuffleEnabled)
        break
      case 'toggle-fullscreen':
        toggleStageFullscreen()
        break
      case 'recording-start':
        void startRecording()
        break
      case 'recording-stop':
        void stopRecording()
        break
      case 'recording-close':
        handleCloseRecordingBar()
        break
    }
  }

  useEffect(() => {
    const unsubscribe = window.electronAPI?.onControlsAction?.((action) => {
      actionHandlerRef.current(action)
    })

    return () => unsubscribe?.()
  }, [])

  const recordingElapsedLabel = formatRecordingElapsed(recordingStartedAt, recordingNowMs)

  const controlsStateRef = useRef<ControlsOverlayState | null>(null)
  controlsStateRef.current = {
    hasActiveMedia,
    playableFilesCount: filePaths.length,
    fileInfo: {
      primaryLabel: fileLabel,
      trackLabel: currentTrackLabel || undefined,
      errorLabel: errorKey ? t(errorKey) : undefined,
    },
    repeatMode,
    shuffleEnabled,
    direction: controlsDirection,
    isFullscreen: isStageFullscreen,
    recordingBarVisible,
    recordingActive,
    recordingStartedAt,
  }

  useEffect(() => {
    const unsubscribe = window.electronAPI?.onControlsRequestState?.(() => {
      if (controlsStateRef.current) {
        window.electronAPI?.sendControlsState?.(controlsStateRef.current)
      }
    })

    return () => unsubscribe?.()
  }, [])

  useEffect(() => {
    if (!useControlsOverlayWindow) {
      window.electronAPI?.hideControlsOverlay?.()
      return
    }

    if (controlsStateRef.current) {
      window.electronAPI?.sendControlsState?.(controlsStateRef.current)
    }
  }, [
    useControlsOverlayWindow,
    hasActiveMedia,
    filePaths.length,
    fileLabel,
    currentTrackLabel,
    errorKey,
    repeatMode,
    shuffleEnabled,
    controlsDirection,
    isStageFullscreen,
    recordingBarVisible,
    recordingActive,
    recordingStartedAt,
    t,
  ])

  function handleEmptyMediaClick() {
    void (async () => {
      const paths = (await window.electronAPI?.openMultipleFiles?.('media')) ?? []
      loadMediaPaths(paths)
    })()
  }

  function handleEmptyMediaKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleEmptyMediaClick()
    }
  }

  function getPathsFromDrop(event: ReactDragEvent<HTMLElement>): string[] {
    const files = event.dataTransfer?.files
    if (!files || files.length === 0) {
      return []
    }

    const paths: string[] = []
    for (const file of Array.from(files)) {
      const path = window.electronAPI?.getPathForFile?.(file)
      if (path) {
        paths.push(path)
      }
    }

    return paths
  }

  function handleMediaDragOver(event: ReactDragEvent<HTMLElement>) {
    event.preventDefault()
    event.stopPropagation()

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy'
    }
  }

  function handleMediaDragEnter(event: ReactDragEvent<HTMLElement>) {
    event.preventDefault()
    event.stopPropagation()
    dragDepthRef.current += 1
    setDropActive(true)
  }

  function handleMediaDragLeave(event: ReactDragEvent<HTMLElement>) {
    event.preventDefault()
    event.stopPropagation()
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)

    if (dragDepthRef.current === 0) {
      setDropActive(false)
    }
  }

  function handleMediaDrop(event: ReactDragEvent<HTMLElement>) {
    event.preventDefault()
    event.stopPropagation()
    dragDepthRef.current = 0
    setDropActive(false)

    const paths = getPathsFromDrop(event)
    if (paths.length > 0) {
      loadMediaPaths(paths)
    }
  }

  const goPreviousRef = useRef(goPrevious)
  const goNextRef = useRef(goNext)
  goPreviousRef.current = goPrevious
  goNextRef.current = goNext

  useEffect(() => {
    // Audio mode: PlayerControls owns shortcuts (same window).
    // Video mode: this handles main-window focus; the overlay handles its own.
    if (!useControlsOverlayWindow) {
      return
    }

    function isEditableTarget(target: EventTarget | null) {
      return (
        target instanceof HTMLInputElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      )
    }

    async function seekBy(offsetMs: number) {
      const state = await window.electronAPI?.vlcGetState?.()
      if (!state) {
        return
      }

      const nextMs = Math.max(0, state.currentTimeMs + offsetMs)
      void window.electronAPI?.vlcSeek?.(nextMs)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.altKey || event.metaKey) {
        return
      }

      if (isEditableTarget(event.target)) {
        return
      }

      if (!hasActiveMedia) {
        return
      }

      if (event.key === ' ' || event.code === 'Space') {
        event.preventDefault()
        void (async () => {
          const state = await window.electronAPI?.vlcGetState?.()
          if (!state) {
            return
          }

          if (state.playing) {
            void window.electronAPI?.vlcPause?.()
          } else {
            void window.electronAPI?.vlcPlay?.()
          }
        })()
        return
      }

      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault()
        const stepMs = event.ctrlKey ? 30_000 : 10_000
        const direction = event.key === 'ArrowLeft' ? -1 : 1
        void seekBy(direction * stepMs)
        return
      }

      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault()
        const delta = event.key === 'ArrowUp' ? 0.05 : -0.05
        const nextVolume = Math.min(2, Math.max(0, Math.round((volume + delta) * 100) / 100))
        persistVolume(nextVolume)
        if (nextVolume > 0) {
          persistVolumeMuted(false)
        }
        return
      }

      if (event.key === '+' || event.key === '=' || event.code === 'NumpadAdd') {
        event.preventDefault()
        goNextRef.current()
        return
      }

      if (event.key === '-' || event.key === '_' || event.code === 'NumpadSubtract') {
        event.preventDefault()
        goPreviousRef.current()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    hasActiveMedia,
    persistVolume,
    persistVolumeMuted,
    useControlsOverlayWindow,
    volume,
  ])

  return (
    <section className={styles.playerCard}>
      <div
        ref={stageRef}
        className={styles.videoShell}
        onDragEnter={handleMediaDragEnter}
        onDragOver={handleMediaDragOver}
        onDragLeave={handleMediaDragLeave}
        onDrop={handleMediaDrop}
      >
        <div className={styles.videoArea}>
          <div
            className={`${styles.videoFrameAttached} ${!hasActiveMedia ? styles.videoFrameEmpty : ''} ${dropActive ? styles.videoFrameDropActive : ''}`}
            onMouseMove={hasActiveMedia ? handleVideoFrameActivity : undefined}
            onClick={hasActiveMedia ? handleVideoFrameActivity : undefined}
          >
            {hasActiveMedia ? (
            currentMediaKind === 'video' ? (
              <div ref={videoViewportRef} className={styles.vlcViewport} aria-hidden="true" />
            ) : (
              <div className={styles.audioStage}>
                <div className={styles.audioArtworkWrap}>
                  <div className={styles.audioGlow} />
                  <div className={styles.audioArtworkOrb}>
                    {audioArtworkSrc ? (
                      <img
                        className={styles.audioArtworkImage}
                        src={audioArtworkSrc}
                        alt=""
                        aria-hidden="true"
                      />
                    ) : (
                      <div
                        className={styles.audioLogo}
                        role="img"
                        aria-label={t('player.audioLogoLabel')}
                      >
                        <img
                          className={styles.audioLogoImage}
                          src={logoSrc}
                          alt=""
                          aria-hidden="true"
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className={styles.audioCaption}>{getFileName(currentFilePath!)}</div>
              </div>
            )
          ) : (
            <div
              className={styles.placeholder}
              onClick={handleEmptyMediaClick}
              onKeyDown={handleEmptyMediaKeyDown}
              role="button"
              tabIndex={0}
            >
              <p>{t('player.emptyTitle')}</p>
              <span>{t('player.emptyDescription')}</span>
            </div>
          )}
          </div>
        </div>

        {useControlsOverlayWindow ? null : (
          <PlayerControls
            hasActiveMedia={hasActiveMedia}
            playableFilesCount={filePaths.length}
            fileInfo={controlFileInfo}
            direction={controlsDirection}
            variant="minimal"
            repeatMode={repeatMode}
            shuffleEnabled={shuffleEnabled}
            onCycleRepeatMode={cycleRepeatMode}
            onToggleShuffle={() => persistShuffleEnabled(!shuffleEnabled)}
            onGoPrevious={goPrevious}
            onGoNext={goNext}
            fullscreenStageRef={stageRef}
            floating={hasActiveMedia}
            overlayHidden={!overlayControlsVisible}
            onOverlayActivity={handleVideoFrameActivity}
            recordingBarVisible={recordingBarVisible}
            recordingActive={recordingActive}
            recordingElapsedLabel={recordingElapsedLabel}
            onRecordingStart={() => void startRecording()}
            onRecordingStop={() => void stopRecording()}
            onRecordingClose={handleCloseRecordingBar}
          />
        )}
      </div>
    </section>
  )
}
