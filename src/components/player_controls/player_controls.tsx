import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { useAppTranslation } from '../../i18n/useAppTranslation'
import { useAppMemory } from '../../memory/memory-context'
import { useAppSettings } from '../../settings/settings-context'
import styles from './player_controls.module.css'

export type RepeatMode = 'off' | 'all' | 'one'

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2]

export type PlayerFileInfo = {
  primaryLabel: string
  trackLabel?: string
  errorLabel?: string
}

type PlayerControlsProps = {
  hasActiveMedia: boolean
  playableFilesCount: number
  fileInfo?: PlayerFileInfo
  direction: 'ltr' | 'rtl'
  variant?: 'solid' | 'minimal'
  repeatMode: RepeatMode
  shuffleEnabled: boolean
  onCycleRepeatMode: () => void
  onToggleShuffle: () => void
  onGoPrevious: () => void
  onGoNext: () => void
  fullscreenStageRef?: RefObject<HTMLElement | null>
  floating?: boolean
  overlayHidden?: boolean
  onOverlayActivity?: () => void
  // When the controls live in their own overlay window the fullscreen toggle and
  // state must be driven externally (the window has no media stage of its own).
  onToggleFullscreen?: () => void
  isFullscreenOverride?: boolean
  recordingBarVisible?: boolean
  recordingActive?: boolean
  recordingElapsedLabel?: string
  onRecordingStart?: () => void
  onRecordingStop?: () => void
  onRecordingClose?: () => void
}

function formatTime(value: number) {
  if (!Number.isFinite(value) || value < 0) {
    return '00:00'
  }

  const wholeSeconds = Math.floor(value)
  const hours = Math.floor(wholeSeconds / 3600)
  const minutes = Math.floor((wholeSeconds % 3600) / 60)
  const seconds = wholeSeconds % 60
  const minutePart = String(minutes).padStart(2, '0')
  const secondPart = String(seconds).padStart(2, '0')

  if (hours > 0) {
    return `${hours}:${minutePart}:${secondPart}`
  }

  return `${minutePart}:${secondPart}`
}

function playIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5v14l11-7z" fill="currentColor" />
    </svg>
  )
}

function pauseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 5h3v14H7zm7 0h3v14h-3z" fill="currentColor" />
    </svg>
  )
}

function previousIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M16 6h2v12h-2zm-1.5 6L8 6v12z" fill="currentColor" />
    </svg>
  )
}

function nextIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 6h2v12H8zm7.5 6L16 6v12z" fill="currentColor" />
    </svg>
  )
}

function rewindIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19 7h-2v10h2zm-4.5 5L6 6v12z" fill="currentColor" />
    </svg>
  )
}

function forwardIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 7h2v10H5zm4.5 5L18 6v12z" fill="currentColor" />
    </svg>
  )
}

function repeatIcon(repeatMode: RepeatMode) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {repeatMode === 'one' ? (
        <path
          d="M7 7h10l-2-2 1.4-1.4L21.8 8l-5.4 4.4L15 11l2-2H7v3H5V7zm10 10H7l2 2-1.4 1.4L2.2 16l5.4-4.4L9 13l-2 2h10v-3h2v5zm-3-4.5h-2V9.8l-1 .7-1.1-1.5 2.6-1.9H14z"
          fill="currentColor"
        />
      ) : repeatMode === 'all' ? (
        <path
          d="M7 7h10l-2-2 1.4-1.4L21.8 8l-5.4 4.4L15 11l2-2H7v3H5V7zM17 17H7l2 2-1.4 1.4L2.2 16l5.4-4.4L9 13l-2 2h10v-3h2v5z"
          fill="currentColor"
        />
      ) : (
        <path
          d="M7 7h10l-2-2 1.4-1.4L21.8 8l-5.4 4.4L15 11l2-2H7v3H5V7zM17 17H7l2 2-1.4 1.4L2.2 16l5.4-4.4L9 13l-2 2h10v-3h2v5z"
          fill="currentColor"
          opacity="0.45"
        />
      )}
    </svg>
  )
}

function shuffleIcon(shuffleEnabled: boolean) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {shuffleEnabled ? (
        <path
          d="M16 3h5v5h-2V6.4l-4.1 4.1-1.4-1.4L17.6 5H16zM4 5h4.6l3.8 3.8-1.4 1.4L7.2 7H4zm14.6 9.6 1.4 1.4L21 17v-2h2v5h-5v-2h1.6zM4 19h4.6l3.8-3.8 1.4 1.4L7.2 19H4z"
          fill="currentColor"
        />
      ) : (
        <>
          <path
            d="M16 3h5v5h-2V6.4l-4.1 4.1-1.4-1.4L17.6 5H16zM4 5h4.6l3.8 3.8-1.4 1.4L7.2 7H4zm0 14h4.6l3.8-3.8 1.4 1.4L7.2 19H4z"
            fill="currentColor"
            opacity="0.45"
          />
          <path
            d="M16 13h5v5h-2v-1.6l-4.1 4.1-1.4-1.4 4.1-4.1H16z"
            fill="currentColor"
            opacity="0.45"
          />
          <path d="M4 20 20 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </>
      )}
    </svg>
  )
}

function formatSpeed(rate: number) {
  return `${rate}×`
}

function volumeIcon(muted: boolean) {
  if (muted) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M5 9v6h4l5 5V4L9 9H5zm8.59 3.41L15 11.83V14h2v-2.17l1.41 1.42 1.42-1.42L16.83 11 18.24 9.59 16.83 8.17 15.41 9.59 14 8.17V6h-2v2.17l-1.41-1.42-1.42 1.42L11.83 11 10.41 9.59 9 11l1.41 1.41L9 13.83V16h2v-2.17l1.41 1.42 1.42-1.42L14.59 13 16 14.41 17.41 13z"
          fill="currentColor"
        />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 9v6h4l5 5V4L9 9H5zm11.5 3c0-1.77-1.02-3.29-2.5-4.03v8.06c1.48-.74 2.5-2.26 2.5-4.03z"
        fill="currentColor"
      />
    </svg>
  )
}

function fullscreenIcon(isFullscreen: boolean) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {isFullscreen ? (
        <path d="M8 3v3H5v2h5V3zm8 0v5h5V6h-3V3zM5 16v3h3v2H3v-5zm14 0v5h-5v-2h3v-3z" fill="currentColor" />
      ) : (
        <path
          d="M7 7H3v5h2V9h2zm10 0h2v3h2V7h-4zM7 17H5v-2H3v5h4zm10 0v2h-2v2h4v-5h-2z"
          fill="currentColor"
        />
      )}
    </svg>
  )
}

export default function PlayerControls({
  hasActiveMedia,
  playableFilesCount,
  fileInfo,
  direction,
  variant = 'minimal',
  repeatMode,
  shuffleEnabled,
  onCycleRepeatMode,
  onToggleShuffle,
  onGoPrevious,
  onGoNext,
  fullscreenStageRef,
  floating = false,
  overlayHidden = false,
  onOverlayActivity,
  onToggleFullscreen,
  isFullscreenOverride,
  recordingBarVisible = false,
  recordingActive = false,
  recordingElapsedLabel = '00:00',
  onRecordingStart,
  onRecordingStop,
  onRecordingClose,
}: PlayerControlsProps) {
  const { t } = useAppTranslation()
  const { settings } = useAppSettings()
  const {
    memory,
    setVolume: persistVolume,
    setVolumeMuted: persistVolumeMuted,
    setPlaybackRate: persistPlaybackRate,
  } = useAppMemory()
  const { volume, volumeMuted, playbackRate } = memory
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false)
  const [volumeMenuOpen, setVolumeMenuOpen] = useState(false)
  const speedMenuRef = useRef<HTMLDivElement | null>(null)
  const volumeMenuRef = useRef<HTMLDivElement | null>(null)

  const labels = {
    seek: t('player.seek'),
    previous: t('player.previous'),
    rewind10: t('player.rewind10'),
    play: t('player.play'),
    pause: t('player.pause'),
    volume: t('player.volume'),
    mute: t('player.mute'),
    unmute: t('player.unmute'),
    speed: t('player.speed'),
    forward10: t('player.forward10'),
    next: t('player.next'),
    repeatOff: t('player.repeatOff'),
    repeatAll: t('player.repeatAll'),
    repeatOne: t('player.repeatOne'),
    shuffleOn: t('player.shuffleOn'),
    shuffleOff: t('player.shuffleOff'),
    fullscreenEnter: t('player.fullscreenEnter'),
    fullscreenExit: t('player.fullscreenExit'),
    recordingTitle: t('recording.title'),
    recordingIdle: t('recording.idle'),
    recordingActive: t('recording.active'),
    recordingPaused: t('recording.paused'),
    recordingStart: t('recording.start'),
    recordingStop: t('recording.stop'),
    recordingClose: t('recording.close'),
  }

  useEffect(() => {
    if (!hasActiveMedia) {
      setIsPlaying(false)
      setCurrentTime(0)
      setDuration(0)
      return
    }

    void window.electronAPI?.vlcSetVolume?.(volume)
    void window.electronAPI?.vlcSetVolumeMuted?.(volumeMuted)
  }, [hasActiveMedia, volume, volumeMuted])

  useEffect(() => {
    if (!hasActiveMedia) {
      return
    }

    void window.electronAPI?.vlcSetRate?.(playbackRate)
  }, [hasActiveMedia, playbackRate])

  useEffect(() => {
    if (!hasActiveMedia) {
      return
    }

    const pollState = window.setInterval(() => {
      void (async () => {
        const state = await window.electronAPI?.vlcGetState?.()
        if (!state) {
          return
        }

        setIsPlaying(state.playing)
        setCurrentTime(state.currentTimeMs / 1000)
        if (state.durationMs > 0) {
          setDuration(state.durationMs / 1000)
        }
      })()
    }, 250)

    return () => window.clearInterval(pollState)
  }, [hasActiveMedia])

  useEffect(() => {
    if (!speedMenuOpen && !volumeMenuOpen) {
      return
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target
      if (!(target instanceof Node)) {
        return
      }

      if (speedMenuRef.current?.contains(target) || volumeMenuRef.current?.contains(target)) {
        return
      }

      setSpeedMenuOpen(false)
      setVolumeMenuOpen(false)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setSpeedMenuOpen(false)
        setVolumeMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [speedMenuOpen, volumeMenuOpen])

  useEffect(() => {
    if (!speedMenuOpen && !volumeMenuOpen) {
      return
    }

    window.electronAPI?.setControlsOverlayInteractive?.(true)
  }, [speedMenuOpen, volumeMenuOpen])

  useEffect(() => {
    if (!fullscreenStageRef) {
      return
    }

    function handleFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === fullscreenStageRef?.current)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [fullscreenStageRef])

  const togglePlayback = useCallback(() => {
    if (!hasActiveMedia) {
      return
    }

    if (isPlaying) {
      void window.electronAPI?.vlcPause?.()
      return
    }

    void window.electronAPI?.vlcPlay?.()
  }, [hasActiveMedia, isPlaying])

  const seekTo = useCallback(
    (nextTime: number) => {
      if (!hasActiveMedia) {
        return
      }

      const clampedTime = Math.max(0, duration > 0 ? Math.min(nextTime, duration) : nextTime)
      void window.electronAPI?.vlcSeek?.(Math.round(clampedTime * 1000))
      setCurrentTime(clampedTime)
    },
    [duration, hasActiveMedia],
  )

  const skipSeconds = useCallback(
    (offset: number) => {
      seekTo(currentTime + offset)
    },
    [currentTime, seekTo],
  )

  useEffect(() => {
    function isEditableTarget(target: EventTarget | null) {
      return (
        target instanceof HTMLInputElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      )
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

      onOverlayActivity?.()

      if (event.key === ' ' || event.code === 'Space') {
        event.preventDefault()
        togglePlayback()
        return
      }

      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault()
        const stepSeconds = event.ctrlKey ? 30 : 10
        const direction = event.key === 'ArrowLeft' ? -1 : 1
        skipSeconds(direction * stepSeconds)
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
        onGoNext()
        return
      }

      if (event.key === '-' || event.key === '_' || event.code === 'NumpadSubtract') {
        event.preventDefault()
        onGoPrevious()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    hasActiveMedia,
    onGoNext,
    onGoPrevious,
    onOverlayActivity,
    persistVolume,
    persistVolumeMuted,
    skipSeconds,
    togglePlayback,
    volume,
  ])

  const toggleFullscreen = useCallback(async () => {
    if (onToggleFullscreen) {
      onToggleFullscreen()
      return
    }

    const stage = fullscreenStageRef?.current
    if (!stage) {
      return
    }

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
        return
      }

      await stage.requestFullscreen()
    } catch {
      // Ignore unsupported fullscreen requests.
    }
  }, [fullscreenStageRef, onToggleFullscreen])

  const hasPlayableFiles = playableFilesCount > 0
  const effectiveIsFullscreen = isFullscreenOverride ?? isFullscreen
  const repeatButtonLabel =
    repeatMode === 'one' ? labels.repeatOne : repeatMode === 'all' ? labels.repeatAll : labels.repeatOff
  const shuffleLabel = shuffleEnabled ? labels.shuffleOn : labels.shuffleOff
  const fullscreenLabel = effectiveIsFullscreen ? labels.fullscreenExit : labels.fullscreenEnter
  const controlsClassName = [
    styles.bottomBar,
    variant === 'solid' ? styles.bottomBarSolid : styles.bottomBarMinimal,
    settings.controlsPosition === 'top' ? styles.bottomBarControlsAbove : '',
    recordingBarVisible ? styles.bottomBarWithRecording : '',
  ]
    .filter(Boolean)
    .join(' ')

  const isFloating = floating || effectiveIsFullscreen
  const controlsPosition = settings.controlsPosition
  const overlayPlacementClass =
    controlsPosition === 'top' ? styles.overlayFloatingTop : styles.overlayFloatingBottom
  const overlayClassName = [
    styles.overlay,
    isFloating ? styles.overlayFloating : '',
    isFloating ? overlayPlacementClass : '',
    isFloating && overlayHidden ? styles.overlayHidden : '',
  ]
    .filter(Boolean)
    .join(' ')

  const recordingBar = recordingBarVisible ? (
    <div className={styles.recordingBar} data-recording-active={recordingActive ? 'true' : 'false'}>
      <div className={styles.recordingBarInfo}>
        <span
          className={
            recordingActive ? styles.recordingBarDotActive : styles.recordingBarDot
          }
          aria-hidden="true"
        />
        <div className={styles.recordingBarText}>
          <span className={styles.recordingBarTitle}>{labels.recordingTitle}</span>
          <span className={styles.recordingBarStatus}>
            {recordingActive
              ? `${isPlaying ? labels.recordingActive : labels.recordingPaused} · ${recordingElapsedLabel}`
              : labels.recordingIdle}
          </span>
        </div>
      </div>
      <div className={styles.recordingBarActions}>
        {recordingActive ? (
          <button
            type="button"
            className={styles.recordingBarStopButton}
            onClick={onRecordingStop}
            disabled={!hasActiveMedia}
          >
            {labels.recordingStop}
          </button>
        ) : (
          <button
            type="button"
            className={styles.recordingBarStartButton}
            onClick={onRecordingStart}
            disabled={!hasActiveMedia}
          >
            {labels.recordingStart}
          </button>
        )}
        <button
          type="button"
          className={styles.recordingBarCloseButton}
          onClick={onRecordingClose}
          aria-label={labels.recordingClose}
          title={labels.recordingClose}
          disabled={recordingActive}
        >
          ×
        </button>
      </div>
    </div>
  ) : null

  return (
    <div
      data-player-controls-overlay=""
      data-controls-position={settings.controlsPosition}
      className={overlayClassName}
      onMouseMove={onOverlayActivity}
    >
      <div className={controlsClassName} data-variant={variant} dir={direction}>
        {recordingBar}

        {fileInfo ? (
          <div className={styles.controlsFileInfo} aria-live="polite">
            <span className={styles.controlsFileName}>{fileInfo.primaryLabel}</span>
            {fileInfo.trackLabel ? (
              <span className={styles.controlsTrackPosition}>{fileInfo.trackLabel}</span>
            ) : null}
            {fileInfo.errorLabel ? (
              <span className={styles.controlsFileError}>{fileInfo.errorLabel}</span>
            ) : null}
          </div>
        ) : null}

        <div className={styles.progressRow}>
          <div className={styles.timeLabel}>{formatTime(currentTime)}</div>
          <input
            type="range"
            className={styles.progressBar}
            min={0}
            max={Math.max(duration, 0)}
            step={0.1}
            value={duration > 0 ? Math.min(currentTime, duration) : 0}
            onChange={(event) => seekTo(Number(event.target.value))}
            disabled={!hasPlayableFiles || duration <= 0}
            aria-label={labels.seek}
          />
          <div className={styles.timeLabel}>{formatTime(duration)}</div>
        </div>

        <div className={styles.controlsRow}>
          <div className={styles.transportGroup}>
            <button
              type="button"
              className={styles.iconButton}
              onClick={onGoPrevious}
              disabled={!hasPlayableFiles}
              aria-label={labels.previous}
              title={labels.previous}
            >
              {rewindIcon()}
            </button>
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => skipSeconds(-10)}
              disabled={!hasPlayableFiles}
              aria-label={labels.rewind10}
              title={labels.rewind10}
            >
              {previousIcon()}
            </button>
            <button
              type="button"
              className={styles.iconButtonPrimary}
              onClick={togglePlayback}
              disabled={!hasPlayableFiles}
              aria-label={isPlaying ? labels.pause : labels.play}
              title={isPlaying ? labels.pause : labels.play}
            >
              {isPlaying ? pauseIcon() : playIcon()}
            </button>
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => skipSeconds(10)}
              disabled={!hasPlayableFiles}
              aria-label={labels.forward10}
              title={labels.forward10}
            >
              {nextIcon()}
            </button>
            <button
              type="button"
              className={styles.iconButton}
              onClick={onGoNext}
              disabled={!hasPlayableFiles}
              aria-label={labels.next}
              title={labels.next}
            >
              {forwardIcon()}
            </button>
          </div>

          <div className={styles.toggleGroup}>
            <button
              type="button"
              className={repeatMode === 'off' ? styles.iconButton : styles.iconButtonActive}
              onClick={onCycleRepeatMode}
              aria-label={repeatButtonLabel}
              title={repeatButtonLabel}
            >
              {repeatIcon(repeatMode)}
            </button>
            <button
              type="button"
              className={shuffleEnabled ? styles.iconButtonActive : styles.iconButton}
              onClick={onToggleShuffle}
              aria-label={shuffleLabel}
              title={shuffleLabel}
            >
              {shuffleIcon(shuffleEnabled)}
            </button>
            {hasActiveMedia ? (
              <button
                type="button"
                className={effectiveIsFullscreen ? styles.iconButtonActive : styles.iconButton}
                onClick={() => void toggleFullscreen()}
                aria-label={fullscreenLabel}
                title={fullscreenLabel}
              >
                {fullscreenIcon(effectiveIsFullscreen)}
              </button>
            ) : null}

            <div className={styles.volumeMenuWrap} ref={volumeMenuRef}>
              <button
                type="button"
                className={
                  volumeMuted || volume !== 1 || volumeMenuOpen
                    ? styles.iconButtonActive
                    : styles.iconButton
                }
                onClick={() => {
                  setVolumeMenuOpen((open) => !open)
                  setSpeedMenuOpen(false)
                }}
                aria-label={labels.volume}
                title={labels.volume}
                aria-haspopup="menu"
                aria-expanded={volumeMenuOpen}
                disabled={!hasActiveMedia}
              >
                {volumeIcon(false)}
              </button>
              {volumeMenuOpen ? (
                <div
                  className={`${styles.volumeMenu} ${volume > 1 && !volumeMuted ? styles.volumeMenuBoosted : ''}`}
                  role="menu"
                  aria-label={labels.volume}
                  data-player-popup=""
                >
                  <div className={styles.volumeMenuLabel}>{labels.volume}</div>
                  <div className={styles.volumeMenuRow}>
                    <button
                      type="button"
                      className={
                        volumeMuted
                          ? `${styles.volumeMuteIconButton} ${styles.volumeMuteIconButtonActive}`
                          : styles.volumeMuteIconButton
                      }
                      onClick={() => persistVolumeMuted(!volumeMuted)}
                      aria-label={volumeMuted ? labels.unmute : labels.mute}
                      title={volumeMuted ? labels.unmute : labels.mute}
                    >
                      {volumeIcon(volumeMuted)}
                    </button>
                    <input
                      type="range"
                      className={`${styles.volumeMenuSlider} ${volume > 1 && !volumeMuted ? styles.volumeMenuSliderBoosted : ''}`}
                      min={0}
                      max={2}
                      step={0.01}
                      value={volume}
                      onChange={(event) => {
                        const nextVolume = Number(event.target.value)
                        persistVolume(nextVolume)
                        if (volumeMuted && nextVolume > 0) {
                          persistVolumeMuted(false)
                        }
                      }}
                      aria-label={labels.volume}
                    />
                    <div
                      className={`${styles.volumeMenuValue} ${volume > 1 && !volumeMuted ? styles.volumeMenuValueBoosted : ''}`}
                    >
                      {volumeMuted ? '0%' : `${Math.round(volume * 100)}%`}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className={styles.speedMenuWrap} ref={speedMenuRef}>
              <button
                type="button"
                className={playbackRate !== 1 ? styles.iconButtonActive : styles.iconButton}
                onClick={() => {
                  setSpeedMenuOpen((open) => !open)
                  setVolumeMenuOpen(false)
                }}
                aria-label={labels.speed}
                title={labels.speed}
                aria-haspopup="menu"
                aria-expanded={speedMenuOpen}
              >
                <span className={styles.speedButtonValue}>{formatSpeed(playbackRate)}</span>
              </button>
              {speedMenuOpen ? (
                <div
                  className={styles.speedMenu}
                  role="menu"
                  aria-label={labels.speed}
                  data-player-popup=""
                >
                  {SPEED_OPTIONS.map((speed) => (
                    <button
                      key={speed}
                      type="button"
                      role="menuitemradio"
                      aria-checked={Math.abs(playbackRate - speed) < 0.001}
                      className={
                        Math.abs(playbackRate - speed) < 0.001
                          ? styles.speedMenuItemActive
                          : styles.speedMenuItem
                      }
                      onClick={() => {
                        persistPlaybackRate(speed)
                        setSpeedMenuOpen(false)
                      }}
                    >
                      {formatSpeed(speed)}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
