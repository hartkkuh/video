import fs from 'node:fs'
import path from 'node:path'
import { VLC_MEDIA_EXTENSIONS } from '../shared/vlc-media-extensions.js'

const mediaExtensionSet = new Set<string>(VLC_MEDIA_EXTENSIONS)

export function isLaunchMediaPath(filePath: string): boolean {
  const extension = path.extname(filePath).toLowerCase()
  return mediaExtensionSet.has(extension)
}

/** Collect playable media paths passed on the command line (Open with / double-click). */
export function collectLaunchMediaFiles(argv: readonly string[]): string[] {
  const results: string[] = []

  for (const arg of argv.slice(1)) {
    if (!arg || arg === '.' || arg.startsWith('-')) {
      continue
    }

    // Skip the Electron/app executable entry when present as an absolute path.
    if (/\.(exe|asar)$/i.test(arg) && !isLaunchMediaPath(arg)) {
      continue
    }

    const resolved = path.resolve(arg)
    if (!isLaunchMediaPath(resolved)) {
      continue
    }

    try {
      if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
        continue
      }
    } catch {
      continue
    }

    if (!results.includes(resolved)) {
      results.push(resolved)
    }
  }

  return results
}
