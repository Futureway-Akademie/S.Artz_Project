import { useId, useState } from 'react'
import { NavLink } from 'react-router'
import { useRechte } from '../../app/cloudContext.ts'
import { darfPfad } from '../../domain/bereiche.ts'
import { Icon } from '../ui/Icon.tsx'
import styles from './NavList.module.css'
import { NAV_GRUPPEN, type NavEintrag, type NavGruppe } from './navigation.ts'

interface NavListProps {
  variante: 'voll' | 'rail'
  /** Wird nach dem Klick auf einen Link aufgerufen (z. B. Schublade schließen). */
  onNavigate?: () => void
}

/** Ober- und Unterbereiche ohne eigene Unterseiten-Links gelten nur exakt als aktiv. */
const exakt = (to: string) => to === '/' || to === '/werkzeug'

function Eintrag({ eintrag, variante, onNavigate }: { eintrag: NavEintrag } & NavListProps) {
  return (
    <li>
      <NavLink
        to={eintrag.to}
        end={exakt(eintrag.to)}
        className={({ isActive }) => `${styles.link} ${isActive ? styles.aktiv : ''} ${eintrag.nurVoll ? styles.unter : ''}`}
        onClick={onNavigate}
        aria-label={variante === 'rail' ? eintrag.label : undefined}
      >
        <Icon name={eintrag.icon} size={eintrag.nurVoll ? 18 : 20} />
        <span className={styles.text}>{variante === 'rail' ? eintrag.kurz : eintrag.label}</span>
      </NavLink>
    </li>
  )
}

function Gruppe({ gruppe, variante, onNavigate }: { gruppe: NavGruppe } & NavListProps) {
  const id = useId()
  const [offen, setOffen] = useState(true)
  const rechte = useRechte()
  const eintraege = (variante === 'rail' ? gruppe.eintraege.filter((e) => !e.nurVoll) : gruppe.eintraege).filter((e) => darfPfad(rechte, e.to))

  if (eintraege.length === 0) return null

  if (variante === 'rail') {
    return (
      <li className={styles.gruppe}>
        <ul className={styles.liste} aria-label={gruppe.titel}>
          {eintraege.map((e) => (
            <Eintrag key={e.to} eintrag={e} variante={variante} onNavigate={onNavigate} />
          ))}
        </ul>
      </li>
    )
  }

  return (
    <li className={styles.gruppe}>
      {gruppe.einklappbar ? (
        <button type="button" className={styles.gruppenKnopf} aria-expanded={offen} aria-controls={`${id}-liste`} onClick={() => setOffen(!offen)} id={`${id}-titel`}>
          <span>{gruppe.titel}</span>
          <span className={`${styles.pfeil} ${offen ? styles.pfeilOffen : ''}`} aria-hidden="true">
            ›
          </span>
        </button>
      ) : (
        <span className={styles.gruppenTitel} id={`${id}-titel`}>
          {gruppe.titel}
        </span>
      )}
      <ul className={styles.liste} id={`${id}-liste`} aria-labelledby={`${id}-titel`} hidden={!offen}>
        {eintraege.map((e) => (
          <Eintrag key={e.to} eintrag={e} variante={variante} onNavigate={onNavigate} />
        ))}
      </ul>
    </li>
  )
}

/** Navigationslinks in Gruppen: „voll“ mit Gruppentiteln und Labels, „rail“ als Icon-Leiste mit Kurzlabels. */
export function NavList({ variante, onNavigate }: NavListProps) {
  return (
    <ul className={`${styles.gruppen} ${styles[variante]}`}>
      {NAV_GRUPPEN.map((g) => (
        <Gruppe key={g.titel} gruppe={g} variante={variante} onNavigate={onNavigate} />
      ))}
    </ul>
  )
}
