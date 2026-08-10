import { useAppTranslation } from '../../i18n/useAppTranslation'
import { useInstallUpdate } from '../../hooks/use-install-update'
import type { UpdateCheckResult } from '../../../shared/updates'
import styles from './update-banner.module.css'

type AvailableUpdate = Extract<UpdateCheckResult, { status: 'available' }>

type UpdateBannerProps = {
  update: AvailableUpdate
  onDismiss: () => void
}

export default function UpdateBanner({ update, onDismiss }: UpdateBannerProps) {
  const { t } = useAppTranslation()
  const { installing, progressPercent, error, installUpdate } = useInstallUpdate()

  return (
    <div className={styles.banner} role="status">
      <div className={styles.textBlock}>
        <p className={styles.title}>
          {t('updates.availableTitle', { version: update.latestVersion })}
        </p>
        <p className={styles.message}>
          {installing
            ? t('updates.installing', { percent: progressPercent })
            : t('updates.availableMessage', {
                current: update.currentVersion,
                latest: update.latestVersion,
              })}
        </p>
        {error ? <p className={styles.message}>{t('updates.installFailed', { message: error })}</p> : null}
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primaryButton}
          disabled={installing}
          onClick={() => {
            void installUpdate(update.downloadUrl)
          }}
        >
          {installing ? t('updates.installingButton') : t('updates.installNow')}
        </button>
        <button
          type="button"
          className={styles.secondaryButton}
          disabled={installing}
          onClick={onDismiss}
        >
          {t('updates.dismiss')}
        </button>
      </div>
    </div>
  )
}
