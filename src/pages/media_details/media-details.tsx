import { useCallback, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAppTranslation, type TranslationKey } from '../../i18n/useAppTranslation'
import { useAppMemory } from '../../memory/memory-context'
import { normalizeMediaDetailsTab, type MediaDetailsTab } from '../../memory/memory'
import { getFileName } from '../../tools/media-paths'
import {
  useMediaChannels,
  useMediaMetadata,
  type MediaMetadataData,
  type MediaTrackInfo,
} from '../../components/media_info/media-info'
import styles from './media-details.module.css'

type DetailRow = {
  label: string
  value: string
}

function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) {
    return '0:00'
  }

  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const mm = String(minutes).padStart(2, '0')
  const ss = String(seconds).padStart(2, '0')

  return hours > 0 ? `${hours}:${mm}:${ss}` : `${minutes}:${ss}`
}

const META_FIELDS: { key: keyof MediaMetadataData; label: TranslationKey }[] = [
  { key: 'title', label: 'media.file.title' },
  { key: 'artist', label: 'media.file.artist' },
  { key: 'album', label: 'media.file.album' },
  { key: 'albumArtist', label: 'media.file.albumArtist' },
  { key: 'genre', label: 'media.file.genre' },
  { key: 'date', label: 'media.file.date' },
  { key: 'trackNumber', label: 'media.file.trackNumber' },
  { key: 'discNumber', label: 'media.file.discNumber' },
  { key: 'showName', label: 'media.file.showName' },
  { key: 'season', label: 'media.file.season' },
  { key: 'episode', label: 'media.file.episode' },
  { key: 'director', label: 'media.file.director' },
  { key: 'publisher', label: 'media.file.publisher' },
  { key: 'encodedBy', label: 'media.file.encodedBy' },
  { key: 'language', label: 'media.file.language' },
  { key: 'description', label: 'media.file.description' },
  { key: 'copyright', label: 'media.file.copyright' },
]

function DetailList({ rows }: { rows: DetailRow[] }) {
  return (
    <dl className={styles.detailList}>
      {rows.map((row) => (
        <div key={row.label} className={styles.detailRow}>
          <dt className={styles.detailLabel}>{row.label}</dt>
          <dd className={styles.detailValue}>{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function FileDetailsPanel({ filePath }: { filePath: string | null }) {
  const { t } = useAppTranslation()
  const { data, loading } = useMediaMetadata(filePath)

  if (!filePath) {
    return <p className={styles.note}>{t('media.empty')}</p>
  }

  const rows: DetailRow[] = [
    { label: t('media.file.fileName'), value: getFileName(filePath) },
  ]

  if (data) {
    rows.push({ label: t('media.file.duration'), value: formatDuration(data.durationMs) })

    for (const field of META_FIELDS) {
      const value = data[field.key]
      if (typeof value === 'string' && value.length > 0) {
        rows.push({ label: t(field.label), value })
      }
    }
  }

  rows.push({ label: t('media.file.path'), value: filePath })

  return (
    <div className={styles.panel}>
      {loading && !data ? <p className={styles.note}>{t('media.loading')}</p> : null}
      <DetailList rows={rows} />
    </div>
  )
}

function trackKindLabel(kind: MediaTrackInfo['kind'], t: (key: TranslationKey) => string): string {
  switch (kind) {
    case 'video':
      return t('media.encoding.video')
    case 'audio':
      return t('media.encoding.audio')
    case 'subtitle':
      return t('media.encoding.subtitle')
    default:
      return t('media.encoding.unknown')
  }
}

function buildTrackRows(
  track: MediaTrackInfo,
  t: (key: TranslationKey, options?: Record<string, unknown>) => string,
): DetailRow[] {
  const rows: DetailRow[] = []

  if (track.codec) {
    rows.push({ label: t('media.encoding.codec'), value: track.codec })
  }

  if (track.kind === 'video') {
    if (track.width && track.height) {
      rows.push({
        label: t('media.encoding.resolution'),
        value: `${track.width}\u00d7${track.height}`,
      })
    }
    if (track.frameRate && track.frameRate > 0) {
      rows.push({
        label: t('media.encoding.frameRate'),
        value: t('media.encoding.fps', { value: Math.round(track.frameRate * 1000) / 1000 }),
      })
    }
    if (track.sampleAspectRatio) {
      rows.push({ label: t('media.encoding.sar'), value: track.sampleAspectRatio })
    }
  }

  if (track.kind === 'audio') {
    if (track.channels && track.channels > 0) {
      rows.push({
        label: t('media.encoding.channels'),
        value: t('media.encoding.channelsValue', { value: track.channels }),
      })
    }
    if (track.sampleRate && track.sampleRate > 0) {
      rows.push({
        label: t('media.encoding.sampleRate'),
        value: t('media.encoding.khz', { value: Math.round((track.sampleRate / 1000) * 10) / 10 }),
      })
    }
  }

  if (track.kind === 'subtitle' && track.encoding) {
    rows.push({ label: t('media.encoding.encoding'), value: track.encoding })
  }

  if (track.bitrate && track.bitrate > 0) {
    rows.push({
      label: t('media.encoding.bitrate'),
      value: t('media.encoding.kbps', { value: Math.round(track.bitrate / 1000) }),
    })
  }

  if (track.language) {
    rows.push({ label: t('media.encoding.language'), value: track.language })
  }

  rows.push({ label: t('media.encoding.trackId'), value: String(track.id) })

  return rows
}

function EncodingPanel({ filePath }: { filePath: string | null }) {
  const { t } = useAppTranslation()
  const { data, loading } = useMediaChannels(filePath)

  if (!filePath) {
    return <p className={styles.note}>{t('media.empty')}</p>
  }

  if (loading && !data) {
    return <p className={styles.note}>{t('media.loading')}</p>
  }

  if (!data || data.length === 0) {
    return <p className={styles.note}>{t('media.encoding.noTracks')}</p>
  }

  return (
    <div className={styles.trackGrid}>
      {data.map((track) => (
        <div key={`${track.kind}-${track.id}`} className={styles.trackCard}>
          <div className={styles.trackHeader}>
            <span className={`${styles.trackBadge} ${styles[`badge_${track.kind}`] ?? ''}`}>
              {trackKindLabel(track.kind, t)}
            </span>
            {track.description ? (
              <span className={styles.trackName}>{track.description}</span>
            ) : null}
          </div>
          <DetailList rows={buildTrackRows(track, t)} />
        </div>
      ))}
    </div>
  )
}

export default function MediaDetailsPage() {
  const { t } = useAppTranslation()
  const { memory, setLastMediaTab } = useAppMemory()
  const [searchParams, setSearchParams] = useSearchParams()

  const currentFilePath = memory.filePaths[memory.currentIndex] ?? null

  const tabParam = searchParams.get('tab')
  const activeTab: MediaDetailsTab = tabParam
    ? normalizeMediaDetailsTab(tabParam)
    : memory.lastMediaTab

  useEffect(() => {
    if (tabParam !== activeTab) {
      setSearchParams({ tab: activeTab }, { replace: true })
    }
  }, [activeTab, tabParam, setSearchParams])

  useEffect(() => {
    if (memory.lastMediaTab !== activeTab) {
      setLastMediaTab(activeTab)
    }
  }, [activeTab, memory.lastMediaTab, setLastMediaTab])

  const selectTab = useCallback(
    (tab: MediaDetailsTab) => {
      setSearchParams({ tab }, { replace: true })
    },
    [setSearchParams],
  )

  const tabs = useMemo(
    () => [
      { id: 'file' as const, label: t('media.fileTab') },
      { id: 'encoding' as const, label: t('media.encodingTab') },
    ],
    [t],
  )

  return (
    <section className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <p className={styles.kicker}>{t('media.kicker')}</p>
          <h2 className={styles.title}>{t('media.title')}</h2>
          <p className={styles.description}>{t('media.description')}</p>
        </div>

        <div className={styles.tabs} role="tablist" aria-label={t('media.title')}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
              onClick={() => selectTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className={styles.tabPanel} role="tabpanel">
          {activeTab === 'file' ? (
            <FileDetailsPanel filePath={currentFilePath} />
          ) : (
            <EncodingPanel filePath={currentFilePath} />
          )}
        </div>

        <div className={styles.backRow}>
          <Link className={styles.backButton} to="/player">
            {t('media.back')}
          </Link>
        </div>
      </div>
    </section>
  )
}
