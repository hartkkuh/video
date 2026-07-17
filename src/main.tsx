import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n'
import './index.css'
import App from './App.tsx'
import ControlsOverlayApp from './pages/controls_overlay/controls_overlay.tsx'
import FilesMenuOverlayApp from './pages/files_menu_overlay/files_menu_overlay.tsx'
import { i18n } from './i18n'
import {
  defaultAppMemory,
  normalizeMemory,
  type AppMemory,
} from './memory/memory'
import {
  applyTheme,
  defaultAppSettings,
  normalizeSettings,
  type AppSettings,
} from './settings/settings'

async function loadInitialSettings(): Promise<AppSettings> {
  if (typeof window === 'undefined' || !window.electronAPI?.getSettings) {
    return defaultAppSettings
  }

  try {
    const settings = await window.electronAPI.getSettings()
    return normalizeSettings(settings)
  } catch {
    return defaultAppSettings
  }
}

async function loadInitialMemory(): Promise<AppMemory> {
  if (typeof window === 'undefined' || !window.electronAPI?.getMemory) {
    return defaultAppMemory
  }

  try {
    const memory = await window.electronAPI.getMemory()
    return normalizeMemory(memory)
  } catch {
    return defaultAppMemory
  }
}

async function bootstrap() {
  const [initialSettings, initialMemory] = await Promise.all([
    loadInitialSettings(),
    loadInitialMemory(),
  ])

  await i18n.changeLanguage(initialSettings.language)
  document.documentElement.lang = initialSettings.language
  document.documentElement.dir = initialSettings.language === 'he' ? 'rtl' : 'ltr'
  applyTheme(initialSettings.theme)

  const isControlsOverlay = window.location.hash.includes('controls-overlay')
  const isFilesMenuOverlay = window.location.hash.includes('files-menu-overlay')

  if (isControlsOverlay || isFilesMenuOverlay) {
    document.documentElement.style.background = 'transparent'
    document.body.style.background = 'transparent'
    document.body.style.margin = '0'
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      {isControlsOverlay ? (
        <ControlsOverlayApp
          initialSettings={initialSettings}
          initialMemory={initialMemory}
        />
      ) : isFilesMenuOverlay ? (
        <FilesMenuOverlayApp initialSettings={initialSettings} />
      ) : (
        <App initialSettings={initialSettings} initialMemory={initialMemory} />
      )}
    </StrictMode>,
  )
}

void bootstrap()
