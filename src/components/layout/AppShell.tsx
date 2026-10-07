import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import { useStore } from '../../data/storeContext.ts'
import { Wordmark } from '../brand/Wordmark.tsx'
import { Button } from '../ui/Button.tsx'
import { Icon } from '../ui/Icon.tsx'
import styles from './AppShell.module.css'
import { SEITENTITEL_ID } from './ids.ts'
import { NavDrawer } from './NavDrawer.tsx'
import { NavList } from './NavList.tsx'

function DemoBanner() {
  const { persistenz } = useStore()
  return (
    <div className={styles.demo} role="note" aria-label="Demo-Hinweis">
      <strong>Demo-Modus.</strong>{' '}
      {persistenz === 'lokal'
        ? 'Die Daten werden nur in diesem Browser gespeichert – nicht sicher und nicht dauerhaft. Sichere sie regelmäßig über den Export in den Einstellungen.'
        : 'Der Browser-Speicher ist nicht verfügbar. Änderungen gehen beim Schließen der Seite verloren.'}
    </div>
  )
}

function StatusHinweise() {
  const { speicherFehler, externGeaendert, neuLaden } = useStore()
  if (!speicherFehler && !externGeaendert) return null
  return (
    <div className={styles.hinweise}>
      {speicherFehler && (
        <div className={styles.fehlerHinweis} role="alert">
          <strong>Speichern fehlgeschlagen.</strong> {speicherFehler} Exportiere deine Daten in den Einstellungen, damit nichts verloren geht.
        </div>
      )}
      {externGeaendert && (
        <div className={styles.infoHinweis} role="status">
          <span>Die Daten wurden in einem anderen Tab geändert.</span>
          <Button size="sm" variant="secondary" onClick={neuLaden}>
            Neu laden
          </Button>
        </div>
      )}
    </div>
  )
}

export function AppShell() {
  const [menueOffen, setMenueOffen] = useState(false)
  const menueButton = useRef<HTMLButtonElement>(null)
  const location = useLocation()
  const ersteSeite = useRef(true)

  // Bei Seitenwechsel den Fokus auf die Überschrift setzen, damit Screenreader den neuen Inhalt ansagen.
  useEffect(() => {
    if (ersteSeite.current) {
      ersteSeite.current = false
      return
    }
    document.getElementById(SEITENTITEL_ID)?.focus()
  }, [location.pathname])

  const menueSchliessen = (fokusZurueck: boolean) => {
    setMenueOffen(false)
    if (fokusZurueck) menueButton.current?.focus()
  }

  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#inhalt">
        Zum Inhalt springen
      </a>

      <header className={styles.topbar}>
        <Wordmark tone="dark" />
        <button
          ref={menueButton}
          type="button"
          className={styles.menueButton}
          onClick={() => setMenueOffen(true)}
          aria-label="Menü öffnen"
          aria-expanded={menueOffen}
        >
          <Icon name="menue" size={24} />
        </button>
      </header>
      <NavDrawer offen={menueOffen} onSchliessen={menueSchliessen} />

      <aside className={styles.sidebar}>
        <div className={styles.sidebarMarke}>
          <span className={styles.markeVoll}>
            <Wordmark tone="dark" />
          </span>
          <span className={styles.markeKurz} aria-hidden="true">
            P<span className={styles.ai}>.AI</span>
          </span>
        </div>
        <nav aria-label="Hauptnavigation" className={styles.navVoll}>
          <NavList variante="voll" />
        </nav>
        <nav aria-label="Hauptnavigation" className={styles.navRail}>
          <NavList variante="rail" />
        </nav>
      </aside>

      <div className={styles.spalte}>
        <DemoBanner />
        <StatusHinweise />
        <main id="inhalt" className={styles.main} tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
