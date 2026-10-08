import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useRechte } from '../../app/cloudContext.ts'
import { darfPfad } from '../../domain/bereiche.ts'
import type { KeyboardEvent } from 'react'
import { useNavigate } from 'react-router'
import { Dialog } from '../../components/ui/Dialog.tsx'
import { useStore } from '../../data/storeContext.ts'
import { suche } from '../../domain/selectors/suche.ts'
import styles from './Suche.module.css'

/** Suche über alle Bereiche (Strg+K). Pfeiltasten wählen, Enter öffnet. */
export function SucheDialog({ onSchliessen }: { onSchliessen: () => void }) {
  const { data } = useStore()
  const navigate = useNavigate()
  const [eingabe, setEingabe] = useState('')
  const [aktiv, setAktiv] = useState(0)
  const listeId = useId()
  const eingabeRef = useRef<HTMLInputElement>(null)

  // Nach dem Öffnen (showModal fokussiert zunächst „Schließen“) direkt ins Suchfeld
  useEffect(() => {
    eingabeRef.current?.focus()
  }, [])
  const rechte = useRechte()
  const treffer = useMemo(() => suche(data, eingabe).filter((t) => darfPfad(rechte, t.link)), [data, eingabe, rechte])
  const aktuell = treffer[Math.min(aktiv, treffer.length - 1)]

  const oeffnen = (link: string) => {
    onSchliessen()
    navigate(link)
  }

  const taste = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setAktiv((a) => (treffer.length ? (a + 1) % treffer.length : 0))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setAktiv((a) => (treffer.length ? (a - 1 + treffer.length) % treffer.length : 0))
    } else if (event.key === 'Enter' && aktuell) {
      event.preventDefault()
      oeffnen(aktuell.link)
    }
  }

  return (
    <Dialog offen titel="Suchen" onSchliessen={onSchliessen}>
      <div className={styles.suche}>
        <label htmlFor={`${listeId}-eingabe`} className="visually-hidden">
          Suchbegriff
        </label>
        <input
          ref={eingabeRef}
          id={`${listeId}-eingabe`}
          className={styles.eingabe}
          type="search"
          role="combobox"
          aria-expanded={treffer.length > 0}
          aria-controls={listeId}
          aria-autocomplete="list"
          aria-activedescendant={aktuell ? `${listeId}-${aktuell.schluessel}` : undefined}
          placeholder="Projekte, Kontakte, Aufgaben, Bewerbungen …"
          value={eingabe}
          onChange={(e) => {
            setEingabe(e.target.value)
            setAktiv(0)
          }}
          onKeyDown={taste}
          autoComplete="off"
        />
        <p className={styles.status} role="status">
          {eingabe.trim() === '' ? 'Tippe, um alle Bereiche zu durchsuchen.' : treffer.length === 0 ? 'Keine Treffer.' : `${treffer.length} Treffer`}
        </p>
        <ul id={listeId} role="listbox" aria-label="Suchergebnisse" className={styles.liste}>
          {treffer.map((t) => (
            <li
              key={t.schluessel}
              id={`${listeId}-${t.schluessel}`}
              role="option"
              aria-selected={t === aktuell}
              className={`${styles.treffer} ${t === aktuell ? styles.aktiv : ''}`}
              onClick={() => oeffnen(t.link)}
              onKeyDown={(e) => e.key === 'Enter' && oeffnen(t.link)}
              onMouseEnter={() => setAktiv(treffer.indexOf(t))}
            >
              <span className={styles.art}>{t.art}</span>
              <span className={styles.titel}>{t.titel}</span>
              {t.unter && <span className={styles.unter}>{t.unter}</span>}
            </li>
          ))}
        </ul>
      </div>
    </Dialog>
  )
}
