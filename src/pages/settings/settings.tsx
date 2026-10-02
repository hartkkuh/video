import { useState, type ReactNode } from 'react'
import { useAppTranslation } from '../../i18n/useAppTranslation'
import { Link } from 'react-router-dom'
import LanguagePicker from '../../components/language'
import { useAppSettings } from '../../settings/settings-context'
import type { ControlsPosition } from '../../settings/settings'
import styles from './settings.module.css'

const CONTROLS_POSITION_OPTIONS: ControlsPosition[] = ['bottom', 'top']

function SettingSection({
  title,
  children,
  defaultExpanded = false,
}: {
  title: string
  children: ReactNode
  defaultExpanded?: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <div className={styles.section}>
      <button
        type="button"
        className={styles.sectionToggle}
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
      >
        <span className={styles.sectionTitle}>{title}</span>
        <span className={styles.sectionChevron} aria-hidden="true">
          ▾
        </span>
      </button>
      {expanded ? <div className={styles.sectionBody}>{children}</div> : null}
    </div>
  )
}

export default function SettingsPage() {
  const { t } = useAppTranslation()
  const { settings, setTheme, setControlsPosition } = useAppSettings()

  const controlsPositionLabels: Record<
    ControlsPosition,
    { title: string; description: string }
  > = {
    bottom: {
      title: t('settings.controlsPositionBottom'),
      description: t('settings.controlsPositionBottomDescription'),
    },
    top: {
      title: t('settings.controlsPositionTop'),
      description: t('settings.controlsPositionTopDescription'),
    },
  }

  return (
    <section className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <p className={styles.kicker}>{t('settings.kicker')}</p>
          <h2 className={styles.title}>{t('settings.title')}</h2>
          <p className={styles.description}>{t('settings.description')}</p>
        </div>

        <div className={styles.form}>
          <SettingSection title={t('settings.languageLabel')}>
            <LanguagePicker />
          </SettingSection>

          <SettingSection title={t('settings.themeLabel')}>
            <div
              className={styles.radioGrid}
              role="radiogroup"
              aria-label={t('settings.themeLabel')}
            >
              <button
                type="button"
                className={`${styles.radioCard} ${settings.theme === 'dark' ? styles.radioCardActive : ''}`}
                onClick={() => setTheme('dark')}
                aria-pressed={settings.theme === 'dark'}
              >
                <p className={styles.radioTitle}>{t('settings.darkThemeTitle')}</p>
                <p className={styles.radioDescription}>
                  {t('settings.darkThemeDescription')}
                </p>
              </button>

              <button
                type="button"
                className={`${styles.radioCard} ${settings.theme === 'light' ? styles.radioCardActive : ''}`}
                onClick={() => setTheme('light')}
                aria-pressed={settings.theme === 'light'}
              >
                <p className={styles.radioTitle}>{t('settings.lightThemeTitle')}</p>
                <p className={styles.radioDescription}>
                  {t('settings.lightThemeDescription')}
                </p>
              </button>
            </div>
          </SettingSection>

          <SettingSection title={t('settings.controlsPositionLabel')}>
            <div
              className={styles.radioGrid}
              role="radiogroup"
              aria-label={t('settings.controlsPositionLabel')}
            >
              {CONTROLS_POSITION_OPTIONS.map((position) => (
                <button
                  key={position}
                  type="button"
                  className={`${styles.radioCard} ${settings.controlsPosition === position ? styles.radioCardActive : ''}`}
                  onClick={() => setControlsPosition(position)}
                  aria-pressed={settings.controlsPosition === position}
                >
                  <p className={styles.radioTitle}>{controlsPositionLabels[position].title}</p>
                  <p className={styles.radioDescription}>
                    {controlsPositionLabels[position].description}
                  </p>
                </button>
              ))}
            </div>
          </SettingSection>
        </div>

        <div className={styles.backRow}>
          <Link className={styles.backButton} to="/player">
            {t('settings.back')}
          </Link>
        </div>
      </div>
    </section>
  )
}
