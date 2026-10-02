import { Link } from 'react-router-dom'
import { useAppTranslation } from '../../i18n/useAppTranslation'
import styles from './shortcuts.module.css'

type Shortcut = {
  keys: string[][]
  action: string
}

function ShortcutKeys({ keys }: { keys: string[][] }) {
  const { t } = useAppTranslation()

  return (
    <div className={styles.keys}>
      {keys.map((combo, comboIndex) => (
        <span key={combo.join('+')} className={styles.comboWrap}>
          {comboIndex > 0 ? <span className={styles.or}>{t('shortcuts.or')}</span> : null}
          <span className={styles.combo}>
            {combo.map((key) => (
              <kbd key={key} className={styles.key}>
                {key}
              </kbd>
            ))}
          </span>
        </span>
      ))}
    </div>
  )
}

export default function ShortcutsPage() {
  const { t } = useAppTranslation()

  const groups: { title: string; items: Shortcut[] }[] = [
    {
      title: t('shortcuts.playback'),
      items: [
        { keys: [[t('shortcuts.keys.space')]], action: t('shortcuts.playPause') },
        { keys: [[t('shortcuts.keys.left')]], action: t('shortcuts.seekBack') },
        { keys: [[t('shortcuts.keys.right')]], action: t('shortcuts.seekForward') },
        {
          keys: [[t('shortcuts.keys.ctrl'), t('shortcuts.keys.left')]],
          action: t('shortcuts.seekBackLong'),
        },
        {
          keys: [[t('shortcuts.keys.ctrl'), t('shortcuts.keys.right')]],
          action: t('shortcuts.seekForwardLong'),
        },
        { keys: [[t('shortcuts.keys.up')]], action: t('shortcuts.volumeUp') },
        { keys: [[t('shortcuts.keys.down')]], action: t('shortcuts.volumeDown') },
        {
          keys: [['+'], ['=']],
          action: t('shortcuts.next'),
        },
        {
          keys: [['−']],
          action: t('shortcuts.previous'),
        },
      ],
    },
    {
      title: t('shortcuts.general'),
      items: [
        { keys: [['Esc']], action: t('shortcuts.closeMenu') },
        {
          keys: [[t('shortcuts.keys.enter')], [t('shortcuts.keys.space')]],
          action: t('shortcuts.openFiles'),
        },
      ],
    },
  ]

  return (
    <section className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <p className={styles.kicker}>{t('shortcuts.kicker')}</p>
          <h2 className={styles.title}>{t('shortcuts.title')}</h2>
          <p className={styles.description}>{t('shortcuts.description')}</p>
        </div>

        {groups.map((group) => (
          <section key={group.title} className={styles.group}>
            <h3 className={styles.groupTitle}>{group.title}</h3>
            <ul className={styles.list}>
              {group.items.map((item) => (
                <li key={item.action} className={styles.row}>
                  <ShortcutKeys keys={item.keys} />
                  <span className={styles.action}>{item.action}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <div className={styles.backRow}>
          <Link className={styles.backButton} to="/player">
            {t('shortcuts.back')}
          </Link>
        </div>
      </div>
    </section>
  )
}
