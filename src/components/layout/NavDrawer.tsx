import { useEffect, useRef } from 'react'
import { Wordmark } from '../brand/Wordmark.tsx'
import { Icon } from '../ui/Icon.tsx'
import styles from './NavDrawer.module.css'
import { NavList } from './NavList.tsx'

interface NavDrawerProps {
  offen: boolean
  /** `fokusZurueck`: Fokus auf den Menü-Button zurückgeben (nicht nach einer Navigation). */
  onSchliessen: (fokusZurueck: boolean) => void
}

/**
 * Mobile Navigation als modaler <dialog>: Der Browser fängt den Fokus und schließt mit Esc.
 * Nach Esc oder „Schließen“ kehrt der Fokus zum Menü-Button zurück, nach einer Navigation
 * übernimmt die neue Seitenüberschrift den Fokus.
 */
export function NavDrawer({ offen, onSchliessen }: NavDrawerProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const durchNavigation = useRef(false)

  useEffect(() => {
    const el = dialog.current
    if (!el) return
    if (offen && !el.open) el.showModal()
    if (!offen && el.open) el.close()
  }, [offen])

  const navigiert = () => {
    durchNavigation.current = true
    // Synchron schließen, damit die Seitenüberschrift danach den Fokus erhält
    dialog.current?.close()
    onSchliessen(false)
  }

  return (
    <dialog
      ref={dialog}
      className={styles.drawer}
      aria-label="Menü"
      onClose={() => {
        const fokusZurueck = !durchNavigation.current
        durchNavigation.current = false
        onSchliessen(fokusZurueck)
      }}
    >
      <div className={styles.inhalt}>
        <div className={styles.kopf}>
          <Wordmark tone="dark" />
          <button
            type="button"
            className={styles.schliessen}
            onClick={() => onSchliessen(true)}
            aria-label="Menü schließen"
          >
            <Icon name="schliessen" />
          </button>
        </div>
        <nav aria-label="Hauptnavigation">
          <NavList variante="voll" onNavigate={navigiert} />
        </nav>
      </div>
    </dialog>
  )
}
