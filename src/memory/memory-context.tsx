import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  mergeAppMemory,
  type AppMemory,
  type RepeatMode,
  type EffectsTab,
  type MediaDetailsTab,
  type AudioEffectsState,
  type VideoEffectsState,
  toPersistedMemory,
  directoryFromFilePath,
  rememberRecentFiles,
} from './memory'

type MemoryContextValue = {
  memory: AppMemory
  setFilePaths: (filePaths: string[]) => void
  touchRecentFile: (filePath: string) => void
  setCurrentIndex: (currentIndex: number) => void
  setVolume: (volume: number) => void
  setVolumeMuted: (volumeMuted: boolean) => void
  setPlaybackRate: (playbackRate: number) => void
  setRepeatMode: (repeatMode: RepeatMode) => void
  setShuffleEnabled: (shuffleEnabled: boolean) => void
  setLastEffectsTab: (lastEffectsTab: EffectsTab) => void
  setLastMediaTab: (lastMediaTab: MediaDetailsTab) => void
  setAudioEffects: (audioEffects: AudioEffectsState) => void
  setVideoEffects: (videoEffects: VideoEffectsState) => void
  updateMemory: (partial: Partial<AppMemory>) => void
}

const MemoryContext = createContext<MemoryContextValue | null>(null)

function persistMemory(memory: AppMemory) {
  if (typeof window === 'undefined' || !window.electronAPI?.saveMemory) {
    return
  }

  void window.electronAPI.saveMemory(toPersistedMemory(memory))
}

export function MemoryProvider({
  initialMemory,
  children,
}: {
  initialMemory: AppMemory
  children: ReactNode
}) {
  const [memory, setMemory] = useState(initialMemory)

  const updateMemory = useCallback((partial: Partial<AppMemory>) => {
    setMemory((current) => {
      const nextState = mergeAppMemory(current, partial)
      persistMemory(nextState)
      return nextState
    })
  }, [])

  const setFilePaths = useCallback((filePaths: string[]) => {
    setMemory((current) => {
      const lastOpenDirectory =
        filePaths.length > 0 ? directoryFromFilePath(filePaths[0]) : undefined
      const nextState = mergeAppMemory(current, {
        filePaths,
        currentIndex: 0,
        ...(filePaths.length > 0
          ? { recentFiles: rememberRecentFiles(current.recentFiles, filePaths) }
          : {}),
        ...(lastOpenDirectory ? { lastOpenDirectory } : {}),
      })
      persistMemory(nextState)
      return nextState
    })
  }, [])

  const touchRecentFile = useCallback((filePath: string) => {
    setMemory((current) => {
      const recentFiles = rememberRecentFiles(current.recentFiles, [filePath])
      if (
        recentFiles.length === current.recentFiles.length &&
        recentFiles.every((path, index) => path === current.recentFiles[index])
      ) {
        return current
      }

      const nextState = mergeAppMemory(current, { recentFiles })
      persistMemory(nextState)
      return nextState
    })
  }, [])

  const value = useMemo<MemoryContextValue>(
    () => ({
      memory,
      setFilePaths,
      touchRecentFile,
      setCurrentIndex(currentIndex) {
        updateMemory({ currentIndex })
      },
      setVolume(volume) {
        updateMemory({ volume })
      },
      setVolumeMuted(volumeMuted) {
        updateMemory({ volumeMuted })
      },
      setPlaybackRate(playbackRate) {
        updateMemory({ playbackRate })
      },
      setRepeatMode(repeatMode) {
        updateMemory({ repeatMode })
      },
      setShuffleEnabled(shuffleEnabled) {
        updateMemory({ shuffleEnabled })
      },
      setLastEffectsTab(lastEffectsTab) {
        updateMemory({ lastEffectsTab })
      },
      setLastMediaTab(lastMediaTab) {
        updateMemory({ lastMediaTab })
      },
      setAudioEffects(audioEffects) {
        updateMemory({ audioEffects })
      },
      setVideoEffects(videoEffects) {
        updateMemory({ videoEffects })
      },
      updateMemory,
    }),
    [memory, setFilePaths, touchRecentFile, updateMemory],
  )

  return <MemoryContext.Provider value={value}>{children}</MemoryContext.Provider>
}

export function useAppMemory() {
  const context = useContext(MemoryContext)

  if (!context) {
    throw new Error('useAppMemory must be used within MemoryProvider')
  }

  return context
}
