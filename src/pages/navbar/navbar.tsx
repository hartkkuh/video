import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useFileActions } from '../../components/file-actions'
import { useAppTranslation } from '../../i18n/useAppTranslation'
import { useAppMemory } from '../../memory/memory-context'
import type { EffectsTab, MediaDetailsTab } from '../../memory/memory'
import type { FilesMenuBounds, OverlayMenuContent } from '../../types/electron'
import styles from './navbar.module.css'

const MENU_WIDTH = 220
const FILES_MENU_RECENT_WIDTH = 400
const MENU_PADDING = 16
const MENU_GAP = 6
const MENU_ITEM_HEIGHT = 38
const RECENT_HEADING_HEIGHT = 22
const RECENT_ROW_HEIGHT = 56
const RECENT_SECTION_CHROME = 7
const PLAYLIST_ROW_HEIGHT = 38

type OpenMenu = 'none' | 'files' | 'tools'
type ExpandedSubmenu = 'none' | 'effects' | 'media'

function computeMenuBounds(button: HTMLElement, itemCount: number): FilesMenuBounds {
  const rect = button.getBoundingClientRect()
  const gap = 10
  const isRtl = document.documentElement.dir === 'rtl'
  const menuHeight = MENU_PADDING + itemCount * MENU_ITEM_HEIGHT + (itemCount - 1) * MENU_GAP

  let y = rect.bottom + gap
  if (y + menuHeight > window.innerHeight - gap) {
    y = Math.max(gap, rect.top - menuHeight - gap)
  }

  const x = isRtl ? rect.left : rect.left + rect.width - MENU_WIDTH

  return {
    x: Math.max(gap, Math.min(x, window.innerWidth - MENU_WIDTH - gap)),
    y,
    width: MENU_WIDTH,
    height: menuHeight,
  }
}

function computeFilesMenuBounds(
  button: HTMLElement,
  recentCount: number,
  playlistCount: number,
): FilesMenuBounds {
  const rect = button.getBoundingClientRect()
  const gap = 10
  const isRtl = document.documentElement.dir === 'rtl'
  const width = FILES_MENU_RECENT_WIDTH
  const rowCount = Math.max(recentCount, 1)
  const playlistRows = Math.max(playlistCount, 1) + 1
  let menuHeight = MENU_PADDING + 3 * MENU_ITEM_HEIGHT + 2 * MENU_GAP
  menuHeight += MENU_GAP + RECENT_SECTION_CHROME + RECENT_HEADING_HEIGHT
  menuHeight += rowCount * (RECENT_ROW_HEIGHT + MENU_GAP)
  menuHeight += MENU_GAP + RECENT_SECTION_CHROME + RECENT_HEADING_HEIGHT
  menuHeight += playlistRows * (PLAYLIST_ROW_HEIGHT + MENU_GAP)

  const maxHeight = Math.max(MENU_ITEM_HEIGHT, window.innerHeight - gap * 2)
  menuHeight = Math.min(menuHeight, maxHeight)

  let y = rect.bottom + gap
  if (y + menuHeight > window.innerHeight - gap) {
    y = Math.max(gap, rect.top - menuHeight - gap)
  }
  if (y + menuHeight > window.innerHeight - gap) {
    y = gap
  }

  const x = isRtl ? rect.left : rect.left + rect.width - width

  return {
    x: Math.max(gap, Math.min(x, window.innerWidth - width - gap)),
    y,
    width,
    height: menuHeight,
  }
}

export default function Navbar() {
  const { t } = useAppTranslation()
  const { actions, openRecordingBar } = useFileActions()
  const { memory } = useAppMemory()
  const location = useLocation()
  const navigate = useNavigate()
  const isSettingsPage = location.pathname === '/settings'
  const isAboutPage = location.pathname === '/about'
  const isPlaylistsPage = location.pathname === '/playlists'

  const [openMenu, setOpenMenu] = useState<OpenMenu>('none')
  const [expandedSubmenu, setExpandedSubmenu] = useState<ExpandedSubmenu>('none')

  const filesWrapRef = useRef<HTMLDivElement | null>(null)
  const filesButtonRef = useRef<HTMLButtonElement | null>(null)
  const toolsWrapRef = useRef<HTMLDivElement | null>(null)
  const toolsButtonRef = useRef<HTMLButtonElement | null>(null)

  const closeMenu = useCallback(() => {
    setOpenMenu('none')
    setExpandedSubmenu('none')
  }, [])

  const goToEffects = useCallback(
    (tab: EffectsTab) => {
      closeMenu()
      navigate(`/effects?tab=${tab}`)
    },
    [closeMenu, navigate],
  )

  const goToMediaDetails = useCallback(
    (tab: MediaDetailsTab) => {
      closeMenu()
      navigate(`/media?tab=${tab}`)
    },
    [closeMenu, navigate],
  )

  // Files menu actions are relayed from the native overlay window.
  useEffect(() => {
    const unsubscribeAction = window.electronAPI?.onFilesMenuAction?.((action) => {
      closeMenu()

      switch (action.type) {
        case 'single':
          actions?.openSingle()
          break
        case 'multiple':
          actions?.openMultiple()
          break
        case 'folder':
          actions?.openFolder()
          break
        case 'recent':
          if (action.path) {
            actions?.openRecent(action.path)
          }
          break
        case 'playlist': {
          const playlist = memory.playlists.find((item) => item.id === action.id)
          if (playlist) {
            actions?.openPlaylist(playlist.filePaths)
          }
          break
        }
        case 'playlists':
          navigate('/playlists')
          break
      }
    })
    const unsubscribeClose = window.electronAPI?.onFilesMenuClose?.(() => {
      closeMenu()
    })

    return () => {
      unsubscribeAction?.()
      unsubscribeClose?.()
    }
  }, [actions, closeMenu, memory.playlists, navigate])

  // Generic menu selections (Tools menu) are relayed without closing the
  // overlay, so the renderer decides whether to expand, navigate, or close.
  useEffect(() => {
    const unsubscribeSelect = window.electronAPI?.onFilesMenuSelect?.((id) => {
      if (id === 'effects') {
        if (expandedSubmenu === 'effects') {
          // Clicking "Effects" again while the submenu is open opens the last
          // tab that was used (persisted in memory.json).
          goToEffects(memory.lastEffectsTab)
        } else {
          setExpandedSubmenu('effects')
        }
        return
      }

      if (id === 'effects-audio') {
        goToEffects('audio')
        return
      }

      if (id === 'effects-video') {
        goToEffects('video')
        return
      }

      if (id === 'media') {
        if (expandedSubmenu === 'media') {
          goToMediaDetails(memory.lastMediaTab)
        } else {
          setExpandedSubmenu('media')
        }
        return
      }

      if (id === 'media-file') {
        goToMediaDetails('file')
        return
      }

      if (id === 'media-encoding') {
        goToMediaDetails('encoding')
        return
      }

      if (id === 'recording') {
        closeMenu()
        openRecordingBar()
        if (location.pathname !== '/player') {
          navigate('/player')
        }
        return
      }

      if (id === 'shortcuts') {
        closeMenu()
        navigate('/shortcuts')
      }
    })

    return () => {
      unsubscribeSelect?.()
    }
  }, [
    closeMenu,
    expandedSubmenu,
    goToEffects,
    goToMediaDetails,
    location.pathname,
    memory.lastEffectsTab,
    memory.lastMediaTab,
    navigate,
    openRecordingBar,
  ])

  // Close the open menu when clicking outside it or pressing Escape.
  useEffect(() => {
    if (openMenu === 'none') {
      return
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target
      if (!(target instanceof Node)) {
        return
      }

      if (
        filesWrapRef.current?.contains(target) ||
        toolsWrapRef.current?.contains(target)
      ) {
        return
      }

      closeMenu()
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeMenu()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [openMenu, closeMenu])

  const buildToolsContent = useCallback((): OverlayMenuContent => {
    const items: OverlayMenuContent['items'] = [
      {
        id: 'effects',
        label: t('navbar.effects'),
        variant: 'parent',
        expanded: expandedSubmenu === 'effects',
      },
    ]

    if (expandedSubmenu === 'effects') {
      items.push(
        { id: 'effects-audio', label: t('navbar.audioEffects'), variant: 'child' },
        { id: 'effects-video', label: t('navbar.videoEffects'), variant: 'child' },
      )
    }

    items.push({
      id: 'media',
      label: t('navbar.mediaDetails'),
      variant: 'parent',
      expanded: expandedSubmenu === 'media',
    })

    if (expandedSubmenu === 'media') {
      items.push(
        { id: 'media-file', label: t('navbar.mediaFile'), variant: 'child' },
        { id: 'media-encoding', label: t('navbar.mediaEncoding'), variant: 'child' },
      )
    }

    items.push(
      {
        id: 'recording',
        label: t('navbar.recording'),
      },
      {
        id: 'shortcuts',
        label: t('navbar.shortcuts'),
      },
    )

    return { ariaLabel: t('navbar.tools'), items }
  }, [expandedSubmenu, t])

  // Drive the shared native overlay window (the same one used by Open Files),
  // which renders above the native video window. A single effect owns the
  // window so the two menus never fight over it.
  useLayoutEffect(() => {
    if (openMenu === 'files' && filesButtonRef.current) {
      window.electronAPI?.showFilesMenu?.(
        computeFilesMenuBounds(
          filesButtonRef.current,
          memory.recentFiles.length,
          memory.playlists.length,
        ),
        {
          recentFiles: memory.recentFiles,
          playlists: memory.playlists.map((playlist) => ({
            id: playlist.id,
            name: playlist.name,
            count: playlist.filePaths.length,
          })),
        },
      )
      return
    }

    if (openMenu === 'tools' && toolsButtonRef.current) {
      const content = buildToolsContent()
      window.electronAPI?.showFilesMenu?.(
        computeMenuBounds(toolsButtonRef.current, content.items.length),
        content,
      )
      return
    }

    window.electronAPI?.hideFilesMenu?.()
  }, [openMenu, expandedSubmenu, buildToolsContent, memory.playlists, memory.recentFiles])

  // Reposition while open if the window is resized.
  useEffect(() => {
    if (openMenu === 'none') {
      return
    }

    function handleResize() {
      if (openMenu === 'files' && filesButtonRef.current) {
        window.electronAPI?.showFilesMenu?.(
          computeFilesMenuBounds(
            filesButtonRef.current,
            memory.recentFiles.length,
            memory.playlists.length,
          ),
          {
            recentFiles: memory.recentFiles,
            playlists: memory.playlists.map((playlist) => ({
              id: playlist.id,
              name: playlist.name,
              count: playlist.filePaths.length,
            })),
          },
        )
      } else if (openMenu === 'tools' && toolsButtonRef.current) {
        const content = buildToolsContent()
        window.electronAPI?.showFilesMenu?.(
          computeMenuBounds(toolsButtonRef.current, content.items.length),
          content,
        )
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [openMenu, expandedSubmenu, buildToolsContent, memory.playlists, memory.recentFiles])

  // Make sure the overlay never lingers if the navbar unmounts.
  useEffect(() => {
    return () => {
      window.electronAPI?.hideFilesMenu?.()
    }
  }, [])

  return (
    <header className={styles.navbar}>
      <div className={styles.brandGroup}>
        <div className={styles.brandRow}>
          <img
            className={styles.brandMark}
            src={`${import.meta.env.BASE_URL}logo.png`}
            alt=""
            aria-hidden="true"
          />
          <p className={styles.brand}>{t('navbar.brand')}</p>
        </div>
      </div>

      <div className={styles.actions}>
        <div ref={toolsWrapRef} className={styles.menuWrap}>
          <button
            ref={toolsButtonRef}
            type="button"
            className={styles.menuButton}
            aria-haspopup="menu"
            aria-expanded={openMenu === 'tools'}
            onClick={() => {
              setExpandedSubmenu('none')
              setOpenMenu((current) => (current === 'tools' ? 'none' : 'tools'))
            }}
          >
            {t('navbar.tools')}
          </button>
        </div>

        <div ref={filesWrapRef} className={styles.menuWrap}>
          <button
            ref={filesButtonRef}
            type="button"
            className={styles.menuButton}
            aria-haspopup="menu"
            aria-expanded={openMenu === 'files'}
            onClick={() =>
              setOpenMenu((current) => (current === 'files' ? 'none' : 'files'))
            }
          >
            {t('navbar.openFiles')}
          </button>
        </div>

        <Link
          to="/playlists"
          className={`${styles.settingsButton} ${isPlaylistsPage ? styles.settingsButtonActive : ''}`}
          onClick={(event) => {
            if (isPlaylistsPage) {
              event.preventDefault()
              navigate('/player')
            }
          }}
        >
          {t('navbar.playlists')}
        </Link>

        <Link
          to="/about"
          className={`${styles.settingsButton} ${isAboutPage ? styles.settingsButtonActive : ''}`}
          onClick={(event) => {
            if (isAboutPage) {
              event.preventDefault()
              navigate('/player')
            }
          }}
        >
          {t('navbar.about')}
        </Link>

        <Link
          to="/settings"
          className={`${styles.settingsButton} ${isSettingsPage ? styles.settingsButtonActive : ''}`}
          onClick={(event) => {
            if (isSettingsPage) {
              event.preventDefault()
              navigate('/player')
            }
          }}
        >
          {t('navbar.settings')}
        </Link>
      </div>
    </header>
  )
}
