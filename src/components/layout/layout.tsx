import { useLocation } from 'react-router-dom'
import Routing from '../../routing'
import { FileActionsProvider } from '../file-actions'
import { FileActionsRegistrar } from '../file-actions-registrar'
import Navbar from '../../pages/navbar/navbar'
import styles from './layout.module.css'

export default function Layout() {
  const location = useLocation()
  const isMediaRoute = location.pathname === '/player'

  return (
    <FileActionsProvider>
      <FileActionsRegistrar />
      <div className={styles.layoutShell}>
        <div className={styles.navbarRegion} data-app-navbar="">
          <Navbar />
        </div>
        <main
          className={`app-shell ${styles.content} ${isMediaRoute ? '' : styles.contentScrollable}`}
        >
          <Routing />
        </main>
      </div>
    </FileActionsProvider>
  )
}
