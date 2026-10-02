import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useInstallUpdate } from '../../hooks/use-install-update'
import { useAppTranslation } from '../../i18n/useAppTranslation'
import type { UpdateCheckResult } from '../../../shared/updates'
import styles from './about.module.css'

const logoSrc = `${import.meta.env.BASE_URL}logo.png`

export default function AboutPage() {
  const { t } = useAppTranslation()
  const [appVersion, setAppVersion] = useState('')
  const [updateChecking, setUpdateChecking] = useState(false)
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null)
  const { installing, progressPercent, error: installError, installUpdate } = useInstallUpdate()

  useEffect(() => {
    let cancelled = false

    async function loadVersion() {
      const version = await window.electronAPI?.getAppVersion?.()
      if (!cancelled && version) {
        setAppVersion(version)
      }
    }

    void loadVersion()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleCheckForUpdates() {
    if (!window.electronAPI?.checkForUpdates || updateChecking) {
      return
    }

    setUpdateChecking(true)
    try {
      const result = await window.electronAPI.checkForUpdates()
      setUpdateResult(result)
    } catch (error) {
      setUpdateResult({
        status: 'error',
        currentVersion: appVersion || '0.0.0',
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setUpdateChecking(false)
    }
  }

  let updateStatusText = t('updates.checkHint')
  if (installing) {
    updateStatusText = t('updates.installing', { percent: progressPercent })
  } else if (installError) {
    updateStatusText = t('updates.installFailed', { message: installError })
  } else if (updateChecking) {
    updateStatusText = t('updates.checking')
  } else if (updateResult?.status === 'up-to-date') {
    updateStatusText = t('updates.upToDate', { version: updateResult.currentVersion })
  } else if (updateResult?.status === 'available') {
    updateStatusText = t('updates.availableMessage', {
      current: updateResult.currentVersion,
      latest: updateResult.latestVersion,
    })
  } else if (updateResult?.status === 'error') {
    updateStatusText = t('updates.checkFailed', { message: updateResult.message })
  }

  return (
    <section className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <img className={styles.logo} src={logoSrc} alt="" />
          <p className={styles.kicker}>{t('about.kicker')}</p>
          <h2 className={styles.title}>{t('navbar.brand')}</h2>
          <p className={styles.description}>{t('about.description')}</p>
        </div>

        <div className={styles.updatePanel}>
          <p className={styles.updateVersion}>
            {t('updates.currentVersion', { version: appVersion || '—' })}
          </p>
          <p className={styles.updateStatus}>{updateStatusText}</p>
          <div className={styles.updateActions}>
            <button
              type="button"
              className={styles.updateButton}
              onClick={() => {
                void handleCheckForUpdates()
              }}
              disabled={updateChecking || installing}
            >
              {updateChecking ? t('updates.checking') : t('updates.checkButton')}
            </button>
            {updateResult?.status === 'available' ? (
              <button
                type="button"
                className={styles.updateButtonPrimary}
                disabled={installing}
                onClick={() => {
                  void installUpdate(updateResult.downloadUrl)
                }}
              >
                {installing ? t('updates.installingButton') : t('updates.installNow')}
              </button>
            ) : null}
          </div>
        </div>

        <div className={styles.backRow}>
          <Link className={styles.backButton} to="/player">
            {t('about.back')}
          </Link>
        </div>
      </div>
    </section>
  )
}
