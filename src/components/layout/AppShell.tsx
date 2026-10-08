import { useEffect, useRef, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { useRechte } from '../../app/cloudContext.ts'
import { BEREICHE, darf, darfPfad } from '../../domain/bereiche.ts'
import { EmptyState } from '../ui/States.tsx'
import { Seite } from './Seite.tsx'
import { useTresor } from '../../app/tresorContext.ts'
import { useStore } from '../../data/storeContext.ts'
import { Wordmark } from '../brand/Wordmark.tsx'
import { Button } from '../ui/Button.tsx'
import { Icon } from '../ui/Icon.tsx'
import styles from './AppShell.module.css'
import { Schnellerfassung } from '../../features/suche/Schnellerfassung.tsx'
import { SucheDialog } from '../../features/suche/SucheDialog.tsx'
import { SEITENTITEL_ID } from './ids.ts'
import { NavDrawer } from './NavDrawer.tsx'
import { NavList } from './NavList.tsx'

/** Zeigt die Seite nur mit Berechtigung; gesperrte Nutzer sehen einen Hinweis, ohne Cockpit-Recht geht es zum ersten freien Bereich. */
function Zugang() {
  const rechte = useRechte()
  const { pathname } = useLocation()
  if (rechte.gesperrt) {
    return (
      <Seite titel="Zugang gesperrt">
        <EmptyState title="Dein Zugang ist gesperrt">Bitte wende dich an den Admin. Deine Daten auf diesem Gerät bleiben verschlüsselt erhalten.</EmptyState>
      </Seite>
    )
  }
  if (darfPfad(rechte, pathname)) return <Outlet />
  if (pathname === '/') {
    const erster = BEREICHE.find((b) => b.pfad && darf(rechte, b.key))
    return <Navigate to={erster?.pfad ?? '/einstellungen'} replace />
  }
  return (
    <Seite titel="Kein Zugriff">
      <EmptyState title="Dieser Bereich ist für dich nicht freigegeben">Wenn du ihn brauchst, frag den Admin.</EmptyState>
    </Seite>
  )
}

function DemoBanner() {
  const { persistenz } = useStore()
  const tresor = useTresor()
  return (
    <div className={styles.demo} role="note" aria-label="Speicherhinweis">
      <span>
        {persistenz !== 'lokal' ? (
          <>
            <strong>Nicht gespeichert.</strong> Der Browser-Speicher ist nicht verfügbar. Änderungen gehen beim Schließen der Seite verloren.
          </>
        ) : tresor ? (
          <>
            <strong>Verschlüsselt.</strong> Die Daten liegen nur in diesem Browser. Sichere sie regelmäßig über den Export in den Einstellungen.
          </>
        ) : (
          <>
            <strong>Demo-Modus.</strong> Die Daten werden nur in diesem Browser gespeichert. Sichere sie regelmäßig über den Export in den Einstellungen.
          </>
        )}
      </span>
      {tresor && (
        <Button size="sm" variant="secondary" onClick={tresor.sperren}>
          Jetzt sperren
        </Button>
      )}
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

/** Suchen und Neu anlegen – in der Topbar nur als Icon, in der Icon-Leiste mit Kurzlabel, in der Sidebar mit Text. */
function Werkzeuge({ variante, onSuchen, onNeu }: { variante: 'topbar' | 'rail' | 'voll'; onSuchen: () => void; onNeu: () => void }) {
  const kurz = variante !== 'voll'
  return (
    <div className={`${styles.werkzeuge} ${styles[`werkzeuge_${variante}`]}`}>
      <button type="button" className={styles.werkzeug} onClick={onSuchen} aria-label={kurz ? 'Suchen (Strg+K)' : undefined} title="Suchen (Strg+K)">
        <Icon name="suche" size={variante === 'topbar' ? 22 : 20} />
        {variante === 'rail' && <span className={styles.werkzeugKurz}>Suche</span>}
        {variante === 'voll' && (
          <span>
            Suchen <kbd className={styles.kbd}>Strg K</kbd>
          </span>
        )}
      </button>
      <button type="button" className={styles.werkzeug} onClick={onNeu} aria-label={kurz ? 'Neu anlegen' : undefined}>
        <Icon name="plus" size={variante === 'topbar' ? 22 : 20} />
        {variante === 'rail' && <span className={styles.werkzeugKurz}>Neu</span>}
        {variante === 'voll' && <span>Neu anlegen</span>}
      </button>
    </div>
  )
}

export function AppShell() {
  const [menueOffen, setMenueOffen] = useState(false)
  const [suchen, setSuchen] = useState(false)
  const [neu, setNeu] = useState(false)

  // Strg+K bzw. Cmd+K öffnet die Suche von überall
  useEffect(() => {
    const taste = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSuchen(true)
      }
    }
    window.addEventListener('keydown', taste)
    return () => window.removeEventListener('keydown', taste)
  }, [])
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
        <span className={styles.topbarRechts}>
          <Werkzeuge variante="topbar" onSuchen={() => setSuchen(true)} onNeu={() => setNeu(true)} />
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
        </span>
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
        <div className={styles.navVoll}>
          <Werkzeuge variante="voll" onSuchen={() => setSuchen(true)} onNeu={() => setNeu(true)} />
        </div>
        <div className={styles.navRail}>
          <Werkzeuge variante="rail" onSuchen={() => setSuchen(true)} onNeu={() => setNeu(true)} />
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
          <Zugang />
        </main>
      </div>
      {suchen && <SucheDialog onSchliessen={() => setSuchen(false)} />}
      {neu && <Schnellerfassung onSchliessen={() => setNeu(false)} />}
    </div>
  )
}
