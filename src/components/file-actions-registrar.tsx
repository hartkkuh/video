import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppMemory } from '../memory/memory-context'
import { filterPlayablePaths } from '../tools/media-paths'
import { useFileActions } from './file-actions'

export function FileActionsRegistrar() {
  const navigate = useNavigate()
  const { setFilePaths: persistFilePaths } = useAppMemory()
  const { setActions, signalAutoplay } = useFileActions()

  useEffect(() => {
    function openPaths(paths: string[]) {
      const playablePaths = filterPlayablePaths(paths)
      if (playablePaths.length === 0) {
        return
      }

      persistFilePaths(playablePaths)
      signalAutoplay()
      navigate('/player')
    }

    setActions({
      openSingle: () => {
        void (async () => {
          const path = await window.electronAPI?.openSingleFile?.('media')
          openPaths(path ? [path] : [])
        })()
      },
      openMultiple: () => {
        void (async () => {
          const paths = (await window.electronAPI?.openMultipleFiles?.('media')) ?? []
          openPaths(paths)
        })()
      },
      openFolder: () => {
        void (async () => {
          const paths = (await window.electronAPI?.openFolderFiles?.('media')) ?? []
          openPaths(paths)
        })()
      },
    })

    void window.electronAPI?.getLaunchFiles?.().then((paths) => {
      if (paths?.length) {
        openPaths(paths)
      }
    })

    const unsubscribeOpenFiles = window.electronAPI?.onOpenFiles?.((paths) => {
      openPaths(paths)
    })

    return () => {
      unsubscribeOpenFiles?.()
    }
  }, [navigate, persistFilePaths, setActions, signalAutoplay])

  return null
}
