import { dialog, type BrowserWindow } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'
import {
  MEDIA_FILE_EXTENSIONS,
  type MediaFileType,
} from '../shared/vlc-media-extensions.js'

const MEDIA_EXTENSION_SETS: Record<MediaFileType, ReadonlySet<string>> = {
  audio: new Set(MEDIA_FILE_EXTENSIONS.audio),
  video: new Set(MEDIA_FILE_EXTENSIONS.video),
  subtitles: new Set(MEDIA_FILE_EXTENSIONS.subtitles),
  media: new Set(MEDIA_FILE_EXTENSIONS.media),
}

const FILTER_NAMES: Record<MediaFileType, string> = {
  audio: 'Audio',
  video: 'Video',
  subtitles: 'Subtitles',
  media: 'Audio and Video',
}

export type { MediaFileType }

export function isMediaFileType(value: unknown): value is MediaFileType {
  return (
    value === 'audio' ||
    value === 'video' ||
    value === 'subtitles' ||
    value === 'media'
  )
}

function getDialogFilter(fileType: MediaFileType) {
  const extensions = MEDIA_FILE_EXTENSIONS[fileType].map((ext) => ext.slice(1))

  return [{ name: FILTER_NAMES[fileType], extensions }]
}

function matchesMediaType(filePath: string, fileType: MediaFileType): boolean {
  const ext = path.extname(filePath).toLowerCase()
  return MEDIA_EXTENSION_SETS[fileType].has(ext)
}

async function scanFolderForType(
  folderPath: string,
  fileType: MediaFileType,
): Promise<string[]> {
  const entries = await fs.readdir(folderPath, { withFileTypes: true })
  const results: string[] = []

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue
    }

    const filePath = path.join(folderPath, entry.name)

    if (matchesMediaType(filePath, fileType)) {
      results.push(filePath)
    }
  }

  return results.sort((a, b) => a.localeCompare(b))
}

export async function openSingleFile(
  window: BrowserWindow,
  fileType: MediaFileType,
  defaultDirectory?: string,
): Promise<string | null> {
  const result = await dialog.showOpenDialog(window, {
    properties: ['openFile'],
    filters: getDialogFilter(fileType),
    ...(defaultDirectory ? { defaultPath: defaultDirectory } : {}),
  })

  if (result.canceled || result.filePaths.length === 0) {
    return null
  }

  return result.filePaths[0]
}

export async function openMultipleFiles(
  window: BrowserWindow,
  fileType: MediaFileType,
  defaultDirectory?: string,
): Promise<string[]> {
  const result = await dialog.showOpenDialog(window, {
    properties: ['openFile', 'multiSelections'],
    filters: getDialogFilter(fileType),
    ...(defaultDirectory ? { defaultPath: defaultDirectory } : {}),
  })

  if (result.canceled) {
    return []
  }

  return result.filePaths
}

export async function openFolderFiles(
  window: BrowserWindow,
  fileType: MediaFileType,
  defaultDirectory?: string,
): Promise<string[]> {
  const result = await dialog.showOpenDialog(window, {
    properties: ['openDirectory'],
    ...(defaultDirectory ? { defaultPath: defaultDirectory } : {}),
  })

  if (result.canceled || result.filePaths.length === 0) {
    return []
  }

  return scanFolderForType(result.filePaths[0], fileType)
}
