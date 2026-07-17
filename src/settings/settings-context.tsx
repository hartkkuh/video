import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import i18n from '../i18n'
import {
  applyTheme,
  normalizeSettings,
  type AppSettings,
  type ControlsPosition,
  type Language,
  type ThemeMode,
} from './settings'

type SettingsContextValue = {
  settings: AppSettings
  setLanguage: (language: Language) => void
  setTheme: (theme: ThemeMode) => void
  setControlsPosition: (controlsPosition: ControlsPosition) => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

function persistSettings(settings: AppSettings) {
  if (typeof window === 'undefined' || !window.electronAPI?.saveSettings) {
    return
  }

  void window.electronAPI.saveSettings(settings)
}

export function SettingsProvider({
  initialSettings,
  children,
}: {
  initialSettings: AppSettings
  children: ReactNode
}) {
  const [settings, setSettings] = useState(initialSettings)

  useEffect(() => {
    const unsubscribe = window.electronAPI?.onSettingsChanged?.((next) => {
      const normalized = normalizeSettings(next)
      setSettings(normalized)
      applyTheme(normalized.theme)
      void i18n.changeLanguage(normalized.language)
      document.documentElement.lang = normalized.language
      document.documentElement.dir = normalized.language === 'he' ? 'rtl' : 'ltr'
    })

    return () => unsubscribe?.()
  }, [])

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      setLanguage(language) {
        setSettings((current) => {
          const nextSettings = { ...current, language }
          persistSettings(nextSettings)
          void i18n.changeLanguage(language)
          return nextSettings
        })
      },
      setTheme(theme) {
        setSettings((current) => {
          const nextSettings = { ...current, theme }
          persistSettings(nextSettings)
          applyTheme(theme)
          return nextSettings
        })
      },
      setControlsPosition(controlsPosition) {
        setSettings((current) => {
          const nextSettings = { ...current, controlsPosition }
          persistSettings(nextSettings)
          return nextSettings
        })
      },
    }),
    [settings],
  )

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  )
}

export function useAppSettings() {
  const context = useContext(SettingsContext)

  if (!context) {
    throw new Error('useAppSettings must be used within SettingsProvider')
  }

  return context
}
