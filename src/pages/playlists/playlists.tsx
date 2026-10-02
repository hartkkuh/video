import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFileActions } from '../../components/file-actions'
import { useAppTranslation } from '../../i18n/useAppTranslation'
import { useAppMemory } from '../../memory/memory-context'
import { appendPlaylistFiles, createPlaylistId, type SavedPlaylist } from '../../memory/memory'
import { filterPlayablePaths, getFileName } from '../../tools/media-paths'
import styles from './playlists.module.css'

export default function PlaylistsPage() {
  const { t } = useAppTranslation()
  const navigate = useNavigate()
  const { signalAutoplay } = useFileActions()
  const { memory, setFilePaths, updateMemory } = useAppMemory()
  const [name, setName] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const playlists = memory.playlists
  const queuePaths = filterPlayablePaths(memory.filePaths)

  function savePlaylists(next: SavedPlaylist[]) {
    updateMemory({ playlists: next })
  }

  function playlistName() {
    return name.trim() || t('playlists.untitled')
  }

  function addPlaylist(filePaths: string[]) {
    const playable = filterPlayablePaths(filePaths)
    if (playable.length === 0) {
      return
    }

    const playlist: SavedPlaylist = {
      id: createPlaylistId(),
      name: playlistName(),
      filePaths: appendPlaylistFiles([], playable),
    }
    savePlaylists([playlist, ...playlists])
    setName('')
    setExpandedId(playlist.id)
    setDraftName(playlist.name)
    setConfirmDeleteId(null)
  }

  function playPlaylist(playlist: SavedPlaylist) {
    const playable = filterPlayablePaths(playlist.filePaths)
    if (playable.length === 0) {
      return
    }

    setFilePaths(playable)
    signalAutoplay()
    navigate('/player')
  }

  function updatePlaylist(id: string, patch: Partial<Pick<SavedPlaylist, 'name' | 'filePaths'>>) {
    savePlaylists(
      playlists.map((playlist) => (playlist.id === id ? { ...playlist, ...patch } : playlist)),
    )
  }

  async function createFromFiles() {
    const paths = (await window.electronAPI?.openMultipleFiles?.('media')) ?? []
    addPlaylist(paths)
  }

  async function addFiles(playlist: SavedPlaylist) {
    const paths = (await window.electronAPI?.openMultipleFiles?.('media')) ?? []
    const playable = filterPlayablePaths(paths)
    if (playable.length === 0) {
      return
    }

    updatePlaylist(playlist.id, {
      filePaths: appendPlaylistFiles(playlist.filePaths, playable),
    })
  }

  function toggleExpanded(playlist: SavedPlaylist) {
    if (expandedId === playlist.id) {
      setExpandedId(null)
      return
    }

    setExpandedId(playlist.id)
    setDraftName(playlist.name)
    setConfirmDeleteId(null)
  }

  return (
    <section className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <p className={styles.kicker}>{t('playlists.kicker')}</p>
          <h2 className={styles.title}>{t('playlists.title')}</h2>
          <p className={styles.description}>{t('playlists.description')}</p>
        </div>

        <form
          className={styles.createRow}
          onSubmit={(event) => {
            event.preventDefault()
            if (queuePaths.length > 0) {
              addPlaylist(queuePaths)
            }
          }}
        >
          <input
            className={styles.nameInput}
            value={name}
            placeholder={t('playlists.namePlaceholder')}
            aria-label={t('playlists.namePlaceholder')}
            onChange={(event) => setName(event.target.value)}
          />
          <button
            type="submit"
            className={styles.primaryButton}
            disabled={queuePaths.length === 0}
          >
            {t('playlists.createFromQueue')}
          </button>
          <button type="button" className={styles.secondaryButton} onClick={() => void createFromFiles()}>
            {t('playlists.createFromFiles')}
          </button>
        </form>

        {playlists.length === 0 ? <p className={styles.empty}>{t('playlists.empty')}</p> : null}

        <div className={styles.list}>
          {playlists.map((playlist) => {
            const expanded = expandedId === playlist.id
            const playableCount = filterPlayablePaths(playlist.filePaths).length

            return (
              <article key={playlist.id} className={styles.playlist}>
                <div className={styles.playlistHeader}>
                  <button
                    type="button"
                    className={styles.playlistToggle}
                    aria-expanded={expanded}
                    onClick={() => toggleExpanded(playlist)}
                  >
                    <span className={styles.playlistName}>{playlist.name}</span>
                    <span className={styles.playlistCount}>
                      {t('playlists.trackCount', { count: playlist.filePaths.length })}
                    </span>
                  </button>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    disabled={playableCount === 0}
                    onClick={() => playPlaylist(playlist)}
                  >
                    {t('playlists.play')}
                  </button>
                </div>

                {expanded ? (
                  <div className={styles.playlistBody}>
                    <form
                      className={styles.renameRow}
                      onSubmit={(event) => {
                        event.preventDefault()
                        const nextName = draftName.trim()
                        if (!nextName) {
                          return
                        }
                        updatePlaylist(playlist.id, { name: nextName })
                      }}
                    >
                      <input
                        className={styles.nameInput}
                        value={draftName}
                        aria-label={t('playlists.rename')}
                        onChange={(event) => setDraftName(event.target.value)}
                      />
                      <button type="submit" className={styles.secondaryButton} disabled={!draftName.trim()}>
                        {t('playlists.save')}
                      </button>
                    </form>

                    <div className={styles.actions}>
                      <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={() => void addFiles(playlist)}
                      >
                        {t('playlists.addFiles')}
                      </button>
                      {confirmDeleteId === playlist.id ? (
                        <>
                          <span className={styles.confirmText}>{t('playlists.confirmDelete')}</span>
                          <button
                            type="button"
                            className={styles.dangerButton}
                            onClick={() => {
                              savePlaylists(playlists.filter((item) => item.id !== playlist.id))
                              setExpandedId(null)
                              setConfirmDeleteId(null)
                            }}
                          >
                            {t('playlists.delete')}
                          </button>
                          <button
                            type="button"
                            className={styles.secondaryButton}
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            {t('playlists.cancel')}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className={styles.dangerButton}
                          onClick={() => setConfirmDeleteId(playlist.id)}
                        >
                          {t('playlists.delete')}
                        </button>
                      )}
                    </div>

                    {playlist.filePaths.length === 0 ? (
                      <p className={styles.empty}>{t('playlists.emptyTracks')}</p>
                    ) : (
                      <ul className={styles.tracks}>
                        {playlist.filePaths.map((filePath) => (
                          <li key={filePath} className={styles.track}>
                            <span className={styles.trackName} title={filePath}>
                              {getFileName(filePath)}
                            </span>
                            <span className={styles.trackPath} title={filePath}>
                              {filePath}
                            </span>
                            <button
                              type="button"
                              className={styles.secondaryButton}
                              onClick={() =>
                                updatePlaylist(playlist.id, {
                                  filePaths: playlist.filePaths.filter((path) => path !== filePath),
                                })
                              }
                            >
                              {t('playlists.remove')}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
