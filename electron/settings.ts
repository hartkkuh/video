export type Language = 'en' | 'he'

export type ThemeMode = 'dark' | 'light'

export type ControlsPosition = 'bottom' | 'top'

export type AppSettings = {
  language: Language
  theme: ThemeMode
  controlsPosition: ControlsPosition
}

export const defaultAppSettings: AppSettings = {
  language: 'he',
  theme: 'dark',
  controlsPosition: 'bottom',
}

export function normalizeLanguage(value: unknown): Language {
  return value === 'en' || value === 'he' ? value : defaultAppSettings.language
}

export function normalizeThemeMode(value: unknown): ThemeMode {
  return value === 'light' ? 'light' : 'dark'
}

export function normalizeControlsPosition(value: unknown): ControlsPosition {
  if (value === 'top') {
    return 'top'
  }

  return defaultAppSettings.controlsPosition
}

export function normalizeSettings(value: unknown): AppSettings {
  if (typeof value !== 'object' || value === null) {
    return defaultAppSettings
  }

  const candidate = value as Record<string, unknown>

  return {
    language: normalizeLanguage(candidate.language),
    theme: normalizeThemeMode(candidate.theme),
    controlsPosition: normalizeControlsPosition(candidate.controlsPosition),
  }
}
