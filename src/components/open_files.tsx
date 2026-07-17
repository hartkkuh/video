import { useCallback, type ReactNode } from 'react'
import {
  MEDIA_FILE_EXTENSIONS,
  type MediaFileType,
} from '../../shared/vlc-media-extensions'

export type { MediaFileType }
export { MEDIA_FILE_EXTENSIONS }

type OpenFilesButtonProps = {
  fileType: MediaFileType
  children: ReactNode
  className?: string
  disabled?: boolean
}

type OpenSingleFileProps = OpenFilesButtonProps & {
  onPath: (path: string | null) => void
}

type OpenMultipleFilesProps = OpenFilesButtonProps & {
  onPaths: (paths: string[]) => void
}

type OpenFolderFilesProps = OpenFilesButtonProps & {
  onPaths: (paths: string[]) => void
}

function isElectronFilesAvailable() {
  return (
    typeof window !== 'undefined' &&
    window.electronAPI?.openSingleFile != null &&
    window.electronAPI?.openMultipleFiles != null &&
    window.electronAPI?.openFolderFiles != null
  )
}

export function OpenSingleFile({
  fileType,
  onPath,
  children,
  className,
  disabled,
}: OpenSingleFileProps) {
  const handleClick = useCallback(async () => {
    if (!isElectronFilesAvailable()) {
      onPath(null)
      return
    }

    const path = await window.electronAPI!.openSingleFile(fileType)
    onPath(path)
  }, [fileType, onPath])

  return (
    <button
      type="button"
      className={className}
      disabled={disabled}
      onClick={() => void handleClick()}
    >
      {children}
    </button>
  )
}

export function OpenMultipleFiles({
  fileType,
  onPaths,
  children,
  className,
  disabled,
}: OpenMultipleFilesProps) {
  const handleClick = useCallback(async () => {
    if (!isElectronFilesAvailable()) {
      onPaths([])
      return
    }

    const paths = await window.electronAPI!.openMultipleFiles(fileType)
    onPaths(paths)
  }, [fileType, onPaths])

  return (
    <button
      type="button"
      className={className}
      disabled={disabled}
      onClick={() => void handleClick()}
    >
      {children}
    </button>
  )
}

export function OpenFolderFiles({
  fileType,
  onPaths,
  children,
  className,
  disabled,
}: OpenFolderFilesProps) {
  const handleClick = useCallback(async () => {
    if (!isElectronFilesAvailable()) {
      onPaths([])
      return
    }

    const paths = await window.electronAPI!.openFolderFiles(fileType)
    onPaths(paths)
  }, [fileType, onPaths])

  return (
    <button
      type="button"
      className={className}
      disabled={disabled}
      onClick={() => void handleClick()}
    >
      {children}
    </button>
  )
}
