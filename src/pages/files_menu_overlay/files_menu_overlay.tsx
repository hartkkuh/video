import { useEffect, useState } from 'react'
import { SettingsProvider, useAppSettings } from '../../settings/settings-context'
import { applyTheme, type AppSettings } from '../../settings/settings'
import { useAppTranslation } from '../../i18n/useAppTranslation'
import { getFileName } from '../../tools/media-paths'
import type {
  FilesMenuAction,
  FilesMenuPanel,
  FilesMenuPlaylistItem,
  OverlayMenuContent,
} from '../../types/electron'
import styles from './files_menu_overlay.module.css'

const thumbnailCache = new Map<string, string | null>()

function isToolsMenu(
  content: OverlayMenuContent | FilesMenuPanel | null,
): content is OverlayMenuContent {
  return Boolean(content && 'items' in content && Array.isArray(content.items))
}

function useRecentThumbnails(paths: string[]) {
  const [thumbs, setThumbs] = useState<Record<string, string>>({})
  const pathKey = paths.join('\0')

  useEffect(() => {
    const filePaths = pathKey.length > 0 ? pathKey.split('\0') : []
    if (filePaths.length === 0) {
      return
    }

    let cancelled = false
    const known: Record<string, string> = {}
    for (const filePath of filePaths) {
      const cached = thumbnailCache.get(filePath)
      if (cached) {
        known[filePath] = cached
      }
    }
    if (Object.keys(known).length > 0) {
      setThumbs((current) => ({ ...current, ...known }))
    }

    async function load() {
      for (const filePath of filePaths) {
        if (cancelled || thumbnailCache.has(filePath)) {
          continue
        }

        const result = await window.electronAPI?.mediaGetThumbnail?.(filePath, { width: 160 })
        if (cancelled) {
          return
        }

        const dataUrl = result?.dataUrl ?? null
        thumbnailCache.set(filePath, dataUrl)
        if (dataUrl) {
          setThumbs((current) => ({ ...current, [filePath]: dataUrl }))
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [pathKey])

  return thumbs
}

function RecentFilesList({ paths }: { paths: string[] }) {
  const { t } = useAppTranslation()
  const thumbs = useRecentThumbnails(paths)

  return (
    <div className={styles.recentSection}>
      <div className={styles.recentHeading}>{t('navbar.recentFiles')}</div>
      {paths.length === 0 ? (
        <div className={`${styles.recentItem} ${styles.recentItemEmpty}`} aria-hidden="true">
          <span className={styles.recentThumb} />
          <span className={styles.recentText} />
        </div>
      ) : null}
      {paths.map((filePath) => {
        const image = thumbs[filePath]

        return (
          <button
            key={filePath}
            type="button"
            className={styles.recentItem}
            role="menuitem"
            title={filePath}
            onClick={() => {
              window.electronAPI?.sendFilesMenuAction?.({ type: 'recent', path: filePath })
            }}
          >
            <span className={styles.recentThumb}>
              {image ? <img src={image} alt="" /> : null}
            </span>
            <span className={styles.recentText}>
              <span className={styles.recentName}>{getFileName(filePath)}</span>
              <span className={styles.recentPath}>{filePath}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

function PlaylistList({ playlists }: { playlists: FilesMenuPlaylistItem[] }) {
  const { t } = useAppTranslation()

  return (
    <div className={styles.playlistSection}>
      <div className={styles.recentHeading}>{t('playlists.title')}</div>
      {playlists.length === 0 ? (
        <div className={`${styles.playlistItem} ${styles.recentItemEmpty}`} aria-hidden="true" />
      ) : (
        playlists.map((playlist) => (
          <button
            key={playlist.id}
            type="button"
            className={styles.playlistItem}
            role="menuitem"
            onClick={() => {
              window.electronAPI?.sendFilesMenuAction?.({ type: 'playlist', id: playlist.id })
            }}
          >
            <span className={styles.playlistName}>{playlist.name}</span>
            <span className={styles.playlistCount}>
              {t('playlists.trackCount', { count: playlist.count })}
            </span>
          </button>
        ))
      )}
      <button
        type="button"
        className={styles.playlistItem}
        role="menuitem"
        onClick={() => {
          window.electronAPI?.sendFilesMenuAction?.({ type: 'playlists' })
        }}
      >
        <span className={styles.playlistName}>{t('playlists.manage')}</span>
      </button>
    </div>
  )
}

function FilesMenuOverlay() {
  const { t } = useAppTranslation()
  const { settings } = useAppSettings()
  const [visible, setVisible] = useState(false)
  const [content, setContent] = useState<OverlayMenuContent | FilesMenuPanel | null>(null)

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

  if (isToolsMenu(content)) {
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

  const recentFiles =
    content && 'recentFiles' in content && Array.isArray(content.recentFiles)
      ? content.recentFiles.filter((filePath) => typeof filePath === 'string' && filePath.length > 0)
      : []
  const playlists =
    content && 'playlists' in content && Array.isArray(content.playlists)
      ? content.playlists.filter(
          (playlist): playlist is FilesMenuPlaylistItem =>
            Boolean(playlist) &&
            typeof playlist.id === 'string' &&
            playlist.id.length > 0 &&
            typeof playlist.name === 'string' &&
            playlist.name.length > 0 &&
            typeof playlist.count === 'number',
        )
      : []

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
      <RecentFilesList paths={recentFiles} />
      <PlaylistList playlists={playlists} />
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
