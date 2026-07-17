import { VLC_AUDIO_EXTENSIONS, VLC_VIDEO_EXTENSIONS } from '../../shared/vlc-media-extensions'

const videoExtensionSet = new Set<string>(VLC_VIDEO_EXTENSIONS)
const audioExtensionSet = new Set<string>(VLC_AUDIO_EXTENSIONS)

function getFileExtension(filePath: string): string | null {
  const dotIndex = filePath.lastIndexOf('.')
  if (dotIndex < 0) {
    return null
  }

  return filePath.slice(dotIndex).toLowerCase()
}

export function getMediaKind(filePath: string): 'video' | 'audio' | null {
  const extension = getFileExtension(filePath)
  if (!extension) {
    return null
  }

  if (videoExtensionSet.has(extension)) {
    return 'video'
  }

  if (audioExtensionSet.has(extension)) {
    return 'audio'
  }

  return null
}

export function isPlayablePath(filePath: string): boolean {
  return getMediaKind(filePath) !== null
}

export function filterPlayablePaths(paths: string[]): string[] {
  return paths.filter(isPlayablePath)
}

export function getFileName(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/')
  const segments = normalized.split('/')
  return segments[segments.length - 1] ?? filePath
}
