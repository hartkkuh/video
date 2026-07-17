import { useEffect } from 'react'
import { useAppTranslation } from './i18n/useAppTranslation'
import { HashRouter } from 'react-router-dom'
import './App.css'
import Layout from './components/layout/layout'
import type { AppMemory } from './memory/memory'
import { MemoryProvider } from './memory/memory-context'
import type { AppSettings } from './settings/settings'
import { SettingsProvider, useAppSettings } from './settings/settings-context'
import { applyTheme } from './settings/settings'

type AppProps = {
  initialSettings: AppSettings
  initialMemory: AppMemory
}

function AppContent() {
  const { settings } = useAppSettings()
  const { i18n } = useAppTranslation()

  useEffect(() => {
    applyTheme(settings.theme)
  }, [settings.theme])

  useEffect(() => {
    document.documentElement.lang = i18n.language
    document.documentElement.dir = i18n.language === 'he' ? 'rtl' : 'ltr'
  }, [i18n.language])

  return (
    <HashRouter>
        <Layout />
    </HashRouter>
  )
}

function App({ initialSettings, initialMemory }: AppProps) {
  return (
    <SettingsProvider initialSettings={initialSettings}>
      <MemoryProvider initialMemory={initialMemory}>
        <AppContent />
      </MemoryProvider>
    </SettingsProvider>
  )
}

export default App
