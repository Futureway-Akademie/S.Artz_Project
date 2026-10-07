import { NavLink } from 'react-router'
import styles from '../kontakte/KontakteNavigation.module.css'

export function BewerbungenNavigation() {
  const klasse = ({ isActive }: { isActive: boolean }) => `${styles.link} ${isActive ? styles.aktiv : ''}`
  return (
    <nav aria-label="Bewerbungen" className={styles.nav}>
      <NavLink to="/bewerbungen" end className={klasse}>
        Bewerbungen
      </NavLink>
      <NavLink to="/bewerbungen/zielrollen" className={klasse}>
        Zielrollen
      </NavLink>
    </nav>
  )
}
