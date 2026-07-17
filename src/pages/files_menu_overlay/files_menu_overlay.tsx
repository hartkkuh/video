import { useEffect, useState } from 'react'
import { SettingsProvider, useAppSettings } from '../../settings/settings-context'
import { applyTheme, type AppSettings } from '../../settings/settings'
import { useAppTranslation } from '../../i18n/useAppTranslation'
import type { FilesMenuAction, OverlayMenuContent } from '../../types/electron'
import styles from './files_menu_overlay.module.css'

function FilesMenuOverlay() {
  const { t } = useAppTranslation()
  const { settings } = useAppSettings()
  const [visible, setVisible] = useState(false)
  const [content, setContent] = useState<OverlayMenuContent | null>(null)

  useEffect(() => {
    applyTheme(settings.theme)
  }, [settings.theme])

  useEffect(() => {
    document.documentElement.dir = settings.language === 'he' ? 'rtl' : 'ltr'
  }, [settings.language])

  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const previousHtmlBackground = html.style.background
    const previousBodyBackground = body.style.background
    const previousBodyMargin = body.style.margin

    html.style.background = 'transparent'
    body.style.background = 'transparent'
    body.style.margin = '0'

    return () => {
      html.style.background = previousHtmlBackground
      body.style.background = previousBodyBackground
      body.style.margin = previousBodyMargin
    }
  }, [])

  useEffect(() => {
    const unsubscribeShow = window.electronAPI?.onFilesMenuShow?.((nextContent) => {
      setContent(nextContent ?? null)
      setVisible(true)
    })
    const unsubscribeHide = window.electronAPI?.onFilesMenuHide?.(() => {
      setVisible(false)
    })

    window.electronAPI?.notifyFilesMenuReady?.()

    return () => {
      unsubscribeShow?.()
      unsubscribeHide?.()
    }
  }, [])

  useEffect(() => {
    if (!visible) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        window.electronAPI?.sendFilesMenuClose?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [visible])

  const sendAction = (action: FilesMenuAction) => {
    window.electronAPI?.sendFilesMenuAction?.(action)
  }

  const sendSelect = (id: string) => {
    window.electronAPI?.sendFilesMenuSelect?.(id)
  }

  if (!visible) {
    return null
  }

  if (content) {
    return (
      <div className={styles.menu} role="menu" aria-label={content.ariaLabel}>
        {content.items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`${styles.menuItem} ${item.variant === 'child' ? styles.menuItemChild : ''}`}
            role="menuitem"
            aria-haspopup={item.variant === 'parent' ? 'menu' : undefined}
            aria-expanded={item.variant === 'parent' ? item.expanded === true : undefined}
            onClick={() => sendSelect(item.id)}
          >
            <span>{item.label}</span>
            {item.variant === 'parent' ? (
              <span className={styles.menuItemChevron} aria-hidden="true">
                {item.expanded ? '▾' : '▸'}
              </span>
            ) : null}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className={styles.menu} role="menu" aria-label={t('navbar.openFiles')}>
      <button
        type="button"
        className={styles.menuItem}
        role="menuitem"
        onClick={() => sendAction({ type: 'single' })}
      >
        {t('navbar.openSingle')}
      </button>
      <button
        type="button"
        className={styles.menuItem}
        role="menuitem"
        onClick={() => sendAction({ type: 'multiple' })}
      >
        {t('navbar.openMultiple')}
      </button>
      <button
        type="button"
        className={styles.menuItem}
        role="menuitem"
        onClick={() => sendAction({ type: 'folder' })}
      >
        {t('navbar.openFolder')}
      </button>
    </div>
  )
}

export default function FilesMenuOverlayApp({ initialSettings }: { initialSettings: AppSettings }) {
  return (
    <SettingsProvider initialSettings={initialSettings}>
      <FilesMenuOverlay />
    </SettingsProvider>
  )
}
