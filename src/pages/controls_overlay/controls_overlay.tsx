import { useCallback, useEffect, useRef, useState } from 'react'
import PlayerControls from '../../components/player_controls/player_controls'
import { MemoryProvider } from '../../memory/memory-context'
import type { AppMemory } from '../../memory/memory'
import { SettingsProvider, useAppSettings } from '../../settings/settings-context'
import { applyTheme, type AppSettings } from '../../settings/settings'
import type {
  ControlsOverlayAction,
  ControlsOverlayState,
} from '../../types/electron'
import styles from './controls_overlay.module.css'

const HIDE_DELAY_MS = 2600

const defaultState: ControlsOverlayState = {
  hasActiveMedia: false,
  playableFilesCount: 0,
  fileInfo: undefined,
  repeatMode: 'off',
  shuffleEnabled: false,
  direction: 'rtl',
  isFullscreen: false,
  recordingBarVisible: false,
  recordingActive: false,
  recordingStartedAt: null,
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

function ControlsOverlay() {
  const { settings } = useAppSettings()
  const [state, setState] = useState<ControlsOverlayState>(defaultState)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [recordingNowMs, setRecordingNowMs] = useState(() => Date.now())
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const interactiveRef = useRef(false)

  const showControls = useCallback(() => {
    setControlsVisible(true)
    interactiveRef.current = true
    window.electronAPI?.setControlsOverlayInteractive?.(true)
  }, [])

  const hideControls = useCallback(() => {
    setControlsVisible(false)
    interactiveRef.current = false
    window.electronAPI?.setControlsOverlayInteractive?.(false)
  }, [])

  const restartHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
    }

    hideTimerRef.current = setTimeout(() => {
      hideControls()
    }, HIDE_DELAY_MS)
  }, [hideControls])

  const revealControls = useCallback(() => {
    window.electronAPI?.raiseControlsOverlay?.()
    showControls()
    restartHideTimer()
  }, [restartHideTimer, showControls])

  useEffect(() => {
    applyTheme(settings.theme)
  }, [settings.theme])

  useEffect(() => {
    document.documentElement.dir = settings.language === 'he' ? 'rtl' : 'ltr'
  }, [settings.language])

  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const previousHtmlBackground = html.style.background
    const previousBodyBackground = body.style.background
    const previousBodyMargin = body.style.margin

    html.style.background = 'transparent'
    body.style.background = 'transparent'
    body.style.margin = '0'

    return () => {
      html.style.background = previousHtmlBackground
      body.style.background = previousBodyBackground
      body.style.margin = previousBodyMargin
    }
  }, [])

  useEffect(() => {
    const unsubscribeState = window.electronAPI?.onControlsState?.((next) => {
      setState(next)
      revealControls()
    })

    const unsubscribeSuspended = window.electronAPI?.onControlsSuspended?.(() => {
      interactiveRef.current = false
    })

    window.electronAPI?.notifyControlsReady?.()

    return () => {
      unsubscribeState?.()
      unsubscribeSuspended?.()
    }
  }, [revealControls])

  useEffect(() => {
    const handleMove = () => {
      revealControls()
    }

    const handlePointerDown = () => {
      revealControls()
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('pointerdown', handlePointerDown)

    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('pointerdown', handlePointerDown)
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current)
      }
    }
  }, [revealControls])

  useEffect(() => {
    if (controlsVisible || !state.hasActiveMedia) {
      return
    }

    const pollCursor = () => {
      void window.electronAPI?.isCursorOverControlsOverlay?.().then((over) => {
        if (over) {
          revealControls()
        }
      })
    }

    pollCursor()
    const pollId = window.setInterval(pollCursor, 120)

    return () => {
      window.clearInterval(pollId)
    }
  }, [controlsVisible, revealControls, state.hasActiveMedia])

  useEffect(() => {
    if (!state.recordingActive || state.recordingStartedAt === null) {
      return
    }

    const timerId = window.setInterval(() => {
      setRecordingNowMs(Date.now())
    }, 500)

    return () => window.clearInterval(timerId)
  }, [state.recordingActive, state.recordingStartedAt])

  const sendAction = useCallback((action: ControlsOverlayAction) => {
    window.electronAPI?.sendControlsAction?.(action)
  }, [])

  return (
    <div className={styles.root}>
      <PlayerControls
        hasActiveMedia={state.hasActiveMedia}
        playableFilesCount={state.playableFilesCount}
        fileInfo={state.fileInfo}
        direction={state.direction}
        variant="minimal"
        repeatMode={state.repeatMode}
        shuffleEnabled={state.shuffleEnabled}
        onCycleRepeatMode={() => sendAction({ type: 'cycle-repeat' })}
        onToggleShuffle={() => sendAction({ type: 'toggle-shuffle' })}
        onGoPrevious={() => sendAction({ type: 'previous' })}
        onGoNext={() => sendAction({ type: 'next' })}
        floating
        overlayHidden={!controlsVisible}
        onToggleFullscreen={() => sendAction({ type: 'toggle-fullscreen' })}
        isFullscreenOverride={state.isFullscreen}
        recordingBarVisible={state.recordingBarVisible}
        recordingActive={state.recordingActive}
        recordingElapsedLabel={formatRecordingElapsed(
          state.recordingStartedAt,
          recordingNowMs,
        )}
        onRecordingStart={() => sendAction({ type: 'recording-start' })}
        onRecordingStop={() => sendAction({ type: 'recording-stop' })}
        onRecordingClose={() => sendAction({ type: 'recording-close' })}
      />
    </div>
  )
}

export default function ControlsOverlayApp({
  initialSettings,
  initialMemory,
}: {
  initialSettings: AppSettings
  initialMemory: AppMemory
}) {
  return (
    <SettingsProvider initialSettings={initialSettings}>
      <MemoryProvider initialMemory={initialMemory}>
        <ControlsOverlay />
      </MemoryProvider>
    </SettingsProvider>
  )
}
