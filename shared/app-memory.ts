export type RepeatMode = 'off' | 'all' | 'one'

export type EffectsTab = 'audio' | 'video'

export type MediaDetailsTab = 'file' | 'encoding'

export type AudioEffectsState = {
  bands: number[]
  outputGain: number
}

export type VideoEffectsState = {
  grayscale: number
  contrast: number
  brightness: number
  saturation: number
  sepia: number
  hue: number
  gamma: number
  blur: number
}

export const EQUALIZER_BAND_COUNT = 10

export const defaultAudioEffects: AudioEffectsState = {
  bands: Array.from({ length: EQUALIZER_BAND_COUNT }, () => 0),
  outputGain: 1,
}

export const defaultVideoEffects: VideoEffectsState = {
  grayscale: 0,
  contrast: 1,
  brightness: 1,
  saturation: 1,
  sepia: 0,
  hue: 0,
  gamma: 1,
  blur: 0,
}

export type PersistedAppMemory = {
  volume: number
  volumeMuted: boolean
  playbackRate: number
  repeatMode: RepeatMode
  shuffleEnabled: boolean
  lastOpenDirectory: string
  lastEffectsTab: EffectsTab
  lastMediaTab: MediaDetailsTab
  audioEffects: AudioEffectsState
  videoEffects: VideoEffectsState
}

export type AppMemory = PersistedAppMemory & {
  filePaths: string[]
  currentIndex: number
}

export const defaultPersistedAppMemory: PersistedAppMemory = {
  volume: 1,
  volumeMuted: false,
  playbackRate: 1,
  repeatMode: 'off',
  shuffleEnabled: false,
  lastOpenDirectory: '',
  lastEffectsTab: 'audio',
  lastMediaTab: 'file',
  audioEffects: defaultAudioEffects,
  videoEffects: defaultVideoEffects,
}

export const defaultAppMemory: AppMemory = {
  ...defaultPersistedAppMemory,
  filePaths: [],
  currentIndex: 0,
}

export function normalizeRepeatMode(value: unknown): RepeatMode {
  return value === 'all' || value === 'one' ? value : 'off'
}

export function normalizeEffectsTab(value: unknown): EffectsTab {
  return value === 'video' ? 'video' : 'audio'
}

export function normalizeMediaDetailsTab(value: unknown): MediaDetailsTab {
  return value === 'encoding' ? 'encoding' : 'file'
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((item): item is string => typeof item === 'string' && item.length > 0)
}

function normalizeVolume(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return defaultPersistedAppMemory.volume
  }

  return Math.min(2, Math.max(0, value))
}

function normalizePlaybackRate(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return defaultPersistedAppMemory.playbackRate
  }

  return Math.min(2, Math.max(0.25, value))
}

function normalizeIndex(value: unknown, fileCount: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || fileCount === 0) {
    return 0
  }

  return Math.min(Math.max(0, Math.floor(value)), fileCount - 1)
}

function normalizeDirectory(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback
  }

  return Math.min(max, Math.max(min, value))
}

function normalizeAudioEffects(value: unknown): AudioEffectsState {
  const candidate =
    typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
  const rawBands = Array.isArray(candidate.bands) ? candidate.bands : []

  return {
    bands: Array.from({ length: EQUALIZER_BAND_COUNT }, (_, index) =>
      clampNumber(rawBands[index], -12, 12, 0),
    ),
    outputGain: clampNumber(candidate.outputGain, 0.5, 2, 1),
  }
}

function normalizeVideoEffects(value: unknown): VideoEffectsState {
  const candidate =
    typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}

  return {
    grayscale: clampNumber(candidate.grayscale, 0, 100, 0),
    contrast: clampNumber(candidate.contrast, 0, 3, 1),
    brightness: clampNumber(candidate.brightness, 0, 3, 1),
    saturation: clampNumber(candidate.saturation, 0, 3, 1),
    sepia: clampNumber(candidate.sepia, 0, 100, 0),
    hue: clampNumber(candidate.hue, 0, 360, 0),
    gamma: clampNumber(candidate.gamma, 0.01, 10, 1),
    blur: clampNumber(candidate.blur, 0, 10, 0),
  }
}

export function directoryFromFilePath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/')
  const lastSlash = normalized.lastIndexOf('/')
  if (lastSlash < 0) {
    return ''
  }

  return filePath.slice(0, filePath.length - (normalized.length - lastSlash))
}

function migrateLastOpenDirectory(candidate: Record<string, unknown>): string {
  const explicitDirectory = normalizeDirectory(candidate.lastOpenDirectory)
  if (explicitDirectory.length > 0) {
    return explicitDirectory
  }

  const legacyFilePaths = normalizeStringArray(candidate.filePaths)
  if (legacyFilePaths.length === 0) {
    return ''
  }

  const legacyIndex = normalizeIndex(candidate.currentIndex, legacyFilePaths.length)
  const legacyFilePath = legacyFilePaths[legacyIndex] ?? legacyFilePaths[legacyFilePaths.length - 1]
  return directoryFromFilePath(legacyFilePath)
}

export function normalizePersistedMemory(value: unknown): PersistedAppMemory {
  if (typeof value !== 'object' || value === null) {
    return defaultPersistedAppMemory
  }

  const candidate = value as Record<string, unknown>

  return {
    volume: normalizeVolume(candidate.volume),
    volumeMuted: candidate.volumeMuted === true,
    playbackRate: normalizePlaybackRate(candidate.playbackRate),
    repeatMode: normalizeRepeatMode(candidate.repeatMode),
    shuffleEnabled: candidate.shuffleEnabled === true,
    lastOpenDirectory: migrateLastOpenDirectory(candidate),
    lastEffectsTab: normalizeEffectsTab(candidate.lastEffectsTab),
    lastMediaTab: normalizeMediaDetailsTab(candidate.lastMediaTab),
    audioEffects: normalizeAudioEffects(candidate.audioEffects),
    videoEffects: normalizeVideoEffects(candidate.videoEffects),
  }
}

export function normalizeMemory(value: unknown): AppMemory {
  const persisted = normalizePersistedMemory(value)

  return {
    ...persisted,
    filePaths: [],
    currentIndex: 0,
  }
}

export function mergeAppMemory(current: AppMemory, partial: Partial<AppMemory>): AppMemory {
  const persisted = normalizePersistedMemory({ ...current, ...partial })

  return {
    ...persisted,
    filePaths: partial.filePaths ?? current.filePaths,
    currentIndex: partial.currentIndex ?? current.currentIndex,
  }
}

export function toPersistedMemory(memory: AppMemory): PersistedAppMemory {
  return {
    volume: normalizeVolume(memory.volume),
    volumeMuted: memory.volumeMuted === true,
    playbackRate: normalizePlaybackRate(memory.playbackRate),
    repeatMode: normalizeRepeatMode(memory.repeatMode),
    shuffleEnabled: memory.shuffleEnabled === true,
    lastOpenDirectory: normalizeDirectory(memory.lastOpenDirectory),
    lastEffectsTab: normalizeEffectsTab(memory.lastEffectsTab),
    lastMediaTab: normalizeMediaDetailsTab(memory.lastMediaTab),
    audioEffects: normalizeAudioEffects(memory.audioEffects),
    videoEffects: normalizeVideoEffects(memory.videoEffects),
  }
}
