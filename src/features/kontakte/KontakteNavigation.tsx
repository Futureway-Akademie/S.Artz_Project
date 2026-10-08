import { NavLink } from 'react-router'
import styles from './KontakteNavigation.module.css'

/** Unternavigation des CRM-Bereichs: Kontakte, Unternehmen, Leads, E-Mail-Vorlagen. */
export function KontakteNavigation() {
  const klasse = ({ isActive }: { isActive: boolean }) => `${styles.link} ${isActive ? styles.aktiv : ''}`
  return (
    <nav aria-label="Kontakte & Leads" className={styles.nav}>
      <NavLink to="/kontakte" end className={klasse}>
        Kontakte
      </NavLink>
      <NavLink to="/kontakte/unternehmen" className={klasse}>
        Unternehmen
      </NavLink>
      <NavLink to="/kontakte/leads" className={klasse}>
        Leads
      </NavLink>
      <NavLink to="/kontakte/vorlagen" className={klasse}>
        E-Mail-Vorlagen
      </NavLink>
    </nav>
  )
}
