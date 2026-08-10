import { useCallback, useEffect, useState } from 'react'

export function useInstallUpdate() {
  const [installing, setInstalling] = useState(false)
  const [progressPercent, setProgressPercent] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = window.electronAPI?.onUpdateDownloadProgress?.((progress) => {
      setProgressPercent(progress.percent)
    })

    return () => {
      unsubscribe?.()
    }
  }, [])

  const installUpdate = useCallback(async (downloadUrl: string) => {
    if (!window.electronAPI?.installUpdate || installing) {
      return
    }

    setInstalling(true)
    setError(null)
    setProgressPercent(0)

    try {
      const result = await window.electronAPI.installUpdate(downloadUrl)
      if (!result.ok) {
        setError(result.message)
        setInstalling(false)
      }
      // On success the app quits shortly after launching the installer.
    } catch (installError) {
      setError(installError instanceof Error ? installError.message : 'Unknown error')
      setInstalling(false)
    }
  }, [installing])

  return {
    installing,
    progressPercent,
    error,
    installUpdate,
  }
}
