import { useAppTranslation } from '../../i18n/useAppTranslation'
import type { UpdateCheckResult } from '../../../shared/updates'
import styles from './update-banner.module.css'

type AvailableUpdate = Extract<UpdateCheckResult, { status: 'available' }>

type UpdateBannerProps = {
  update: AvailableUpdate
  onDismiss: () => void
}

export default function UpdateBanner({ update, onDismiss }: UpdateBannerProps) {
  const { t } = useAppTranslation()

  return (
    <div className={styles.banner} role="status">
      <div className={styles.textBlock}>
        <p className={styles.title}>
          {t('updates.availableTitle', { version: update.latestVersion })}
        </p>
        <p className={styles.message}>
          {t('updates.availableMessage', {
            current: update.currentVersion,
            latest: update.latestVersion,
          })}
        </p>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={() => {
            void window.electronAPI?.openUpdateDownload?.(update.downloadUrl)
          }}
        >
          {t('updates.download')}
        </button>
        <button type="button" className={styles.secondaryButton} onClick={onDismiss}>
          {t('updates.dismiss')}
        </button>
      </div>
    </div>
  )
}
