import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

type FileActions = {
  openSingle: () => void
  openMultiple: () => void
  openFolder: () => void
}

type FileActionsContextValue = {
  actions: FileActions | null
  setActions: (actions: FileActions | null) => void
  autoplayToken: number
  signalAutoplay: () => void
  recordingBarVisible: boolean
  openRecordingBar: () => void
  closeRecordingBar: () => void
}

const FileActionsContext = createContext<FileActionsContextValue | null>(null)

export function FileActionsProvider({ children }: { children: ReactNode }) {
  const [actions, setActions] = useState<FileActions | null>(null)
  const [autoplayToken, setAutoplayToken] = useState(0)
  const [recordingBarVisible, setRecordingBarVisible] = useState(false)

  const signalAutoplay = useCallback(() => {
    setAutoplayToken((token) => token + 1)
  }, [])

  const openRecordingBar = useCallback(() => {
    setRecordingBarVisible(true)
  }, [])

  const closeRecordingBar = useCallback(() => {
    setRecordingBarVisible(false)
  }, [])

  const value = useMemo(
    () => ({
      actions,
      setActions,
      autoplayToken,
      signalAutoplay,
      recordingBarVisible,
      openRecordingBar,
      closeRecordingBar,
    }),
    [
      actions,
      autoplayToken,
      signalAutoplay,
      recordingBarVisible,
      openRecordingBar,
      closeRecordingBar,
    ],
  )

  return <FileActionsContext.Provider value={value}>{children}</FileActionsContext.Provider>
}

export function useFileActions() {
  const context = useContext(FileActionsContext)

  if (!context) {
    throw new Error('useFileActions must be used within FileActionsProvider')
  }

  return context
}
