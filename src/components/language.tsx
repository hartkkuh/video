import { useAppTranslation } from '../i18n/useAppTranslation'
import { useAppSettings } from '../settings/settings-context'
import settingsStyles from '../pages/settings/settings.module.css'

export default function LanguagePicker() {
  const { t } = useAppTranslation()
  const { settings, setLanguage } = useAppSettings()

  return (
    <div
      className={settingsStyles.languageGrid}
      role="radiogroup"
      aria-label={t('settings.languageLabel')}
    >
      <button
        type="button"
        className={`${settingsStyles.languageCard} ${settings.language === 'he' ? settingsStyles.languageCardActive : ''}`}
        onClick={() => setLanguage('he')}
        aria-pressed={settings.language === 'he'}
      >
        <div className={settingsStyles.languageCode}>HE</div>
        <div className={settingsStyles.languageName}>{t('settings.hebrew')}</div>
      </button>
      <button
        type="button"
        className={`${settingsStyles.languageCard} ${settings.language === 'en' ? settingsStyles.languageCardActive : ''}`}
        onClick={() => setLanguage('en')}
        aria-pressed={settings.language === 'en'}
      >
        <div className={settingsStyles.languageCode}>EN</div>
        <div className={settingsStyles.languageName}>{t('settings.english')}</div>
      </button>
    </div>
  )
}
