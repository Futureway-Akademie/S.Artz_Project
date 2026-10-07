import { NavLink } from 'react-router'
import { Icon } from '../ui/Icon.tsx'
import styles from './NavList.module.css'
import { NAVIGATION } from './navigation.ts'

interface NavListProps {
  /** `rail`: Icon-Leiste mit Kurzlabel (Tablet) */
  variante: 'voll' | 'rail'
  onNavigate?: () => void
}

/** Liste der neun Bereiche. NavLink setzt `aria-current="page"` für den aktiven Bereich. */
export function NavList({ variante, onNavigate }: NavListProps) {
  return (
    <ul className={`${styles.liste} ${styles[variante]}`}>
      {NAVIGATION.map((eintrag) => (
        <li key={eintrag.to}>
          <NavLink
            to={eintrag.to}
            end={eintrag.to === '/'}
            className={({ isActive }) => `${styles.link} ${isActive ? styles.aktiv : ''}`}
            onClick={onNavigate}
            aria-label={variante === 'rail' ? eintrag.label : undefined}
          >
            <Icon name={eintrag.icon} />
            <span className={styles.text}>{variante === 'rail' ? eintrag.kurz : eintrag.label}</span>
          </NavLink>
        </li>
      ))}
    </ul>
  )
}
