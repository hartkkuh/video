import { useCallback, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAppTranslation } from '../../i18n/useAppTranslation'
import { useMediaThumbnail } from '../../components/media_info/media-info'
import { getMediaKind } from '../../tools/media-paths'
import { useAppMemory } from '../../memory/memory-context'
import {
  defaultAudioEffects,
  defaultVideoEffects,
  EQUALIZER_BAND_COUNT,
  normalizeEffectsTab,
  type AudioEffectsState,
  type EffectsTab,
  type VideoEffectsState,
} from '../../memory/memory'
import type { TranslationKey } from '../../i18n/useAppTranslation'
import styles from './effects.module.css'

const EQ_BANDS = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] as const

type EqPreset =
  | 'flat'
  | 'rock'
  | 'pop'
  | 'jazz'
  | 'classical'
  | 'bass'
  | 'treble'
  | 'vocal'

const EQ_PRESETS: Record<EqPreset, number[]> = {
  flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  rock: [5, 4, 3, 1, -1, -1, 1, 3, 4, 5],
  pop: [-1, 1, 3, 4, 4, 3, 1, -1, -1, -2],
  jazz: [3, 2, 1, 2, -1, -1, 0, 1, 2, 3],
  classical: [4, 3, 2, 1, -1, -1, 0, 2, 3, 4],
  bass: [7, 6, 5, 3, 1, 0, 0, 0, 0, 0],
  treble: [0, 0, 0, 0, 0, 1, 3, 5, 6, 7],
  vocal: [-2, -1, 0, 2, 4, 4, 3, 1, 0, -1],
}

// Card order chosen to match the reference layout (RTL).
const EQ_PRESET_ORDER: EqPreset[] = [
  'flat',
  'bass',
  'vocal',
  'treble',
  'rock',
  'pop',
  'jazz',
  'classical',
]

const EQ_PRESET_META: Record<EqPreset, { label: TranslationKey; desc: TranslationKey }> = {
  flat: { label: 'effects.audio.presetFlat', desc: 'effects.audio.presetFlatDesc' },
  rock: { label: 'effects.audio.presetRock', desc: 'effects.audio.presetRockDesc' },
  pop: { label: 'effects.audio.presetPop', desc: 'effects.audio.presetPopDesc' },
  jazz: { label: 'effects.audio.presetJazz', desc: 'effects.audio.presetJazzDesc' },
  classical: {
    label: 'effects.audio.presetClassical',
    desc: 'effects.audio.presetClassicalDesc',
  },
  bass: { label: 'effects.audio.presetBass', desc: 'effects.audio.presetBassDesc' },
  treble: { label: 'effects.audio.presetTreble', desc: 'effects.audio.presetTrebleDesc' },
  vocal: { label: 'effects.audio.presetVocal', desc: 'effects.audio.presetVocalDesc' },
}

function formatBand(hz: number): string {
  return hz >= 1000 ? `${hz / 1000}k` : `${hz}`
}

function formatDb(value: number): string {
  return value > 0 ? `+${value}` : `${value}`
}

function matchPreset(bands: number[]): EqPreset | null {
  for (const key of Object.keys(EQ_PRESETS) as EqPreset[]) {
    if (EQ_PRESETS[key].every((value, index) => value === (bands[index] ?? 0))) {
      return key
    }
  }
  return null
}

function AudioEffectsPanel() {
  const { t } = useAppTranslation()
  const { memory, setAudioEffects } = useAppMemory()
  const effects = memory.audioEffects

  const apply = useCallback(
    (next: AudioEffectsState) => {
      setAudioEffects(next)
      void window.electronAPI?.vlcSetAudioEffects?.(next)
    },
    [setAudioEffects],
  )

  const applyPreset = useCallback(
    (preset: EqPreset) => {
      apply({ bands: [...EQ_PRESETS[preset]], outputGain: effects.outputGain })
    },
    [apply, effects.outputGain],
  )

  const setBand = useCallback(
    (index: number, value: number) => {
      const bands = effects.bands.slice(0, EQUALIZER_BAND_COUNT)
      while (bands.length < EQUALIZER_BAND_COUNT) {
        bands.push(0)
      }
      bands[index] = value
      apply({ bands, outputGain: effects.outputGain })
    },
    [apply, effects.bands, effects.outputGain],
  )

  const setOutputGain = useCallback(
    (value: number) => {
      apply({ bands: [...effects.bands], outputGain: value })
    },
    [apply, effects.bands],
  )

  const reset = useCallback(() => {
    apply({ bands: [...defaultAudioEffects.bands], outputGain: defaultAudioEffects.outputGain })
  }, [apply])

  const activePreset = matchPreset(effects.bands)
  const gainPercent = Math.round(effects.outputGain * 100)

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <h3 className={styles.panelTitle}>{t('effects.audio.title')}</h3>
          <p className={styles.panelDescription}>{t('effects.audio.description')}</p>
        </div>
      </div>

      <div className={styles.presetGrid}>
        {EQ_PRESET_ORDER.map((preset) => (
          <button
            key={preset}
            type="button"
            className={`${styles.presetCard} ${activePreset === preset ? styles.presetCardActive : ''}`}
            aria-pressed={activePreset === preset}
            onClick={() => applyPreset(preset)}
          >
            <span className={styles.presetTitle}>{t(EQ_PRESET_META[preset].label)}</span>
            <span className={styles.presetDesc}>{t(EQ_PRESET_META[preset].desc)}</span>
          </button>
        ))}
      </div>

      <div className={styles.eqCard}>
        <div className={styles.equalizer}>
          <div className={styles.eqAxis} aria-hidden="true">
            <span>12+</span>
            <span>0</span>
            <span>12-</span>
          </div>
          <div className={styles.eqBands}>
            {EQ_BANDS.map((hz, index) => {
              const value = effects.bands[index] ?? 0
              return (
                <div key={hz} className={styles.eqBand}>
                  <span className={styles.eqValue}>{formatDb(value)}</span>
                  <input
                    className={styles.verticalSlider}
                    type="range"
                    min={-12}
                    max={12}
                    step={1}
                    value={value}
                    aria-label={`${formatBand(hz)}Hz`}
                    onChange={(event) => setBand(index, Number(event.target.value))}
                  />
                  <span className={styles.eqLabel}>{formatBand(hz)}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className={styles.outputGainCard}>
        <span className={styles.outputGainLabel}>{t('effects.audio.outputGain')}</span>
        <input
          className={styles.horizontalSlider}
          type="range"
          min={50}
          max={200}
          step={5}
          value={gainPercent}
          aria-label={t('effects.audio.outputGain')}
          onChange={(event) => setOutputGain(Number(event.target.value) / 100)}
        />
        <span className={styles.outputGainValue}>{gainPercent}%</span>
      </div>

      <div className={styles.panelFooter}>
        <button type="button" className={styles.ghostButton} onClick={reset}>
          {t('effects.audio.reset')}
        </button>
      </div>
    </div>
  )
}

type VideoSlider = {
  key: keyof VideoEffectsState
  label: string
  min: number
  max: number
  step: number
  toDisplay: (value: number) => number
  fromDisplay: (display: number) => number
  suffix: string
}

type VideoProfile =
  | 'original'
  | 'vivid'
  | 'warm'
  | 'cool'
  | 'mono'
  | 'soft'
  | 'cinema'
  | 'bright'

const VIDEO_PROFILE_ORDER: VideoProfile[] = [
  'original',
  'vivid',
  'warm',
  'cool',
  'mono',
  'soft',
  'cinema',
  'bright',
]

const VIDEO_PROFILES: Record<VideoProfile, VideoEffectsState> = {
  original: { ...defaultVideoEffects },
  vivid: { ...defaultVideoEffects, contrast: 1.2, brightness: 1.04, saturation: 1.4 },
  warm: { ...defaultVideoEffects, hue: 25, contrast: 1.03, brightness: 1.03, saturation: 1.12 },
  cool: { ...defaultVideoEffects, hue: 210, contrast: 1.02, saturation: 1.05 },
  mono: { ...defaultVideoEffects, contrast: 1.08, saturation: 0 },
  soft: { ...defaultVideoEffects, contrast: 0.9, brightness: 1.06, saturation: 0.92, gamma: 1.12 },
  cinema: { ...defaultVideoEffects, contrast: 1.22, brightness: 0.96, saturation: 1.12, gamma: 0.9 },
  bright: { ...defaultVideoEffects, contrast: 1.06, brightness: 1.22 },
}

const VIDEO_PROFILE_META: Record<
  VideoProfile,
  { label: TranslationKey; desc: TranslationKey }
> = {
  original: { label: 'effects.video.profileOriginal', desc: 'effects.video.profileOriginalDesc' },
  vivid: { label: 'effects.video.profileVivid', desc: 'effects.video.profileVividDesc' },
  warm: { label: 'effects.video.profileWarm', desc: 'effects.video.profileWarmDesc' },
  cool: { label: 'effects.video.profileCool', desc: 'effects.video.profileCoolDesc' },
  mono: { label: 'effects.video.profileMono', desc: 'effects.video.profileMonoDesc' },
  soft: { label: 'effects.video.profileSoft', desc: 'effects.video.profileSoftDesc' },
  cinema: { label: 'effects.video.profileCinema', desc: 'effects.video.profileCinemaDesc' },
  bright: { label: 'effects.video.profileBright', desc: 'effects.video.profileBrightDesc' },
}

const VIDEO_PROFILE_KEYS: (keyof VideoEffectsState)[] = [
  'hue',
  'contrast',
  'brightness',
  'saturation',
  'gamma',
]

function matchVideoProfile(effects: VideoEffectsState): VideoProfile | null {
  for (const profile of VIDEO_PROFILE_ORDER) {
    const target = VIDEO_PROFILES[profile]
    const matches = VIDEO_PROFILE_KEYS.every(
      (key) => Math.abs(effects[key] - target[key]) < 0.001,
    )
    if (matches) {
      return profile
    }
  }
  return null
}

function VideoEffectsPanel() {
  const { t } = useAppTranslation()
  const { memory, setVideoEffects } = useAppMemory()
  const effects = memory.videoEffects

  const applyFull = useCallback(
    (next: VideoEffectsState) => {
      setVideoEffects(next)
      void window.electronAPI?.vlcSetVideoEffects?.(next)
    },
    [setVideoEffects],
  )

  const apply = useCallback(
    (partial: Partial<VideoEffectsState>) => {
      applyFull({ ...effects, ...partial })
    },
    [applyFull, effects],
  )

  const reset = useCallback(() => {
    applyFull({ ...defaultVideoEffects })
  }, [applyFull])

  const sliders: VideoSlider[] = useMemo(
    () => [
      {
        key: 'hue',
        label: t('effects.video.hue'),
        min: 0,
        max: 360,
        step: 1,
        toDisplay: (value) => Math.round(value),
        fromDisplay: (display) => display,
        suffix: '°',
      },
      {
        key: 'contrast',
        label: t('effects.video.contrast'),
        min: 0,
        max: 200,
        step: 1,
        toDisplay: (value) => Math.round(value * 100),
        fromDisplay: (display) => display / 100,
        suffix: '%',
      },
      {
        key: 'brightness',
        label: t('effects.video.brightness'),
        min: 0,
        max: 200,
        step: 1,
        toDisplay: (value) => Math.round(value * 100),
        fromDisplay: (display) => display / 100,
        suffix: '%',
      },
      {
        key: 'saturation',
        label: t('effects.video.saturation'),
        min: 0,
        max: 200,
        step: 1,
        toDisplay: (value) => Math.round(value * 100),
        fromDisplay: (display) => display / 100,
        suffix: '%',
      },
      {
        key: 'gamma',
        label: t('effects.video.gamma'),
        min: 10,
        max: 300,
        step: 1,
        toDisplay: (value) => Math.round(value * 100),
        fromDisplay: (display) => display / 100,
        suffix: '%',
      },
    ],
    [t],
  )

  const activeProfile = matchVideoProfile(effects)
  const previewFilter = `hue-rotate(${effects.hue}deg) contrast(${effects.contrast}) brightness(${effects.brightness}) saturate(${effects.saturation})`

  const currentFilePath = memory.filePaths[memory.currentIndex] ?? null
  const videoFilePath =
    currentFilePath && getMediaKind(currentFilePath) === 'video' ? currentFilePath : null
  const { data: previewThumbnail } = useMediaThumbnail(videoFilePath, { width: 480 })

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <h3 className={styles.panelTitle}>{t('effects.video.title')}</h3>
          <p className={styles.panelDescription}>{t('effects.video.description')}</p>
        </div>
      </div>

      <div className={styles.presetGrid}>
        {VIDEO_PROFILE_ORDER.map((profile) => (
          <button
            key={profile}
            type="button"
            className={`${styles.presetCard} ${activeProfile === profile ? styles.presetCardActive : ''}`}
            aria-pressed={activeProfile === profile}
            onClick={() => applyFull({ ...VIDEO_PROFILES[profile] })}
          >
            <span className={styles.presetTitle}>{t(VIDEO_PROFILE_META[profile].label)}</span>
            <span className={styles.presetDesc}>{t(VIDEO_PROFILE_META[profile].desc)}</span>
          </button>
        ))}
      </div>

      <div className={styles.videoLayout}>
        <div className={styles.sliderStack}>
          {sliders.map((slider) => {
            const display = slider.toDisplay(effects[slider.key])
            return (
              <div key={slider.key} className={styles.sliderRow}>
                <span className={styles.sliderLabel}>{slider.label}</span>
                <input
                  className={styles.horizontalSlider}
                  type="range"
                  min={slider.min}
                  max={slider.max}
                  step={slider.step}
                  value={display}
                  aria-label={slider.label}
                  onChange={(event) =>
                    apply({ [slider.key]: slider.fromDisplay(Number(event.target.value)) })
                  }
                />
                <span className={styles.sliderValue}>
                  {display}
                  {slider.suffix}
                </span>
              </div>
            )
          })}
          <div className={styles.panelFooter}>
            <button type="button" className={styles.ghostButton} onClick={reset}>
              {t('effects.video.reset')}
            </button>
          </div>
        </div>

        <div className={styles.previewColumn}>
          <span className={styles.previewLabel}>{t('effects.video.preview')}</span>
          <div className={styles.preview}>
            {previewThumbnail ? (
              <img
                className={styles.previewImage}
                src={previewThumbnail.dataUrl}
                alt=""
                aria-hidden="true"
                style={{ filter: previewFilter, objectFit: 'cover' }}
              />
            ) : (
              <div className={styles.previewImage} style={{ filter: previewFilter }} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function EffectsPage() {
  const { t } = useAppTranslation()
  const { memory, setLastEffectsTab } = useAppMemory()
  const [searchParams, setSearchParams] = useSearchParams()

  const tabParam = searchParams.get('tab')
  const activeTab: EffectsTab = tabParam ? normalizeEffectsTab(tabParam) : memory.lastEffectsTab

  useEffect(() => {
    if (tabParam !== activeTab) {
      setSearchParams({ tab: activeTab }, { replace: true })
    }
  }, [activeTab, tabParam, setSearchParams])

  useEffect(() => {
    if (memory.lastEffectsTab !== activeTab) {
      setLastEffectsTab(activeTab)
    }
  }, [activeTab, memory.lastEffectsTab, setLastEffectsTab])

  const selectTab = useCallback(
    (tab: EffectsTab) => {
      setSearchParams({ tab }, { replace: true })
    },
    [setSearchParams],
  )

  const tabs = useMemo(
    () => [
      { id: 'audio' as const, label: t('effects.audioTab') },
      { id: 'video' as const, label: t('effects.videoTab') },
    ],
    [t],
  )

  return (
    <section className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <p className={styles.kicker}>{t('effects.kicker')}</p>
          <h2 className={styles.title}>{t('effects.title')}</h2>
          <p className={styles.description}>{t('effects.description')}</p>
        </div>

        <div className={styles.tabs} role="tablist" aria-label={t('effects.title')}>
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
          {activeTab === 'audio' ? <AudioEffectsPanel /> : <VideoEffectsPanel />}
        </div>

        <div className={styles.backRow}>
          <Link className={styles.backButton} to="/player">
            {t('effects.back')}
          </Link>
        </div>
      </div>
    </section>
  )
}
