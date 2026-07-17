import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useFileActions } from '../../components/file-actions'
import { useAppTranslation } from '../../i18n/useAppTranslation'
import { useAppMemory } from '../../memory/memory-context'
import type { EffectsTab, MediaDetailsTab } from '../../memory/memory'
import type { FilesMenuBounds, OverlayMenuContent } from '../../types/electron'
import styles from './navbar.module.css'

const MENU_WIDTH = 220
const MENU_PADDING = 16
const MENU_GAP = 6
const MENU_ITEM_HEIGHT = 38

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
    x: Math.max(gap, x),
    y,
    width: MENU_WIDTH,
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
      }
    })
    const unsubscribeClose = window.electronAPI?.onFilesMenuClose?.(() => {
      closeMenu()
    })

    return () => {
      unsubscribeAction?.()
      unsubscribeClose?.()
    }
  }, [actions, closeMenu])

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

    items.push({
      id: 'recording',
      label: t('navbar.recording'),
    })

    return { ariaLabel: t('navbar.tools'), items }
  }, [expandedSubmenu, t])

  // Drive the shared native overlay window (the same one used by Open Files),
  // which renders above the native video window. A single effect owns the
  // window so the two menus never fight over it.
  useLayoutEffect(() => {
    if (openMenu === 'files' && filesButtonRef.current) {
      window.electronAPI?.showFilesMenu?.(computeMenuBounds(filesButtonRef.current, 3))
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
  }, [openMenu, expandedSubmenu, buildToolsContent])

  // Reposition while open if the window is resized.
  useEffect(() => {
    if (openMenu === 'none') {
      return
    }

    function handleResize() {
      if (openMenu === 'files' && filesButtonRef.current) {
        window.electronAPI?.showFilesMenu?.(computeMenuBounds(filesButtonRef.current, 3))
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
  }, [openMenu, expandedSubmenu, buildToolsContent])

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
