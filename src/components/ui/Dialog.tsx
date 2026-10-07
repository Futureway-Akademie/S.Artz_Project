import { useId, useLayoutEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { Icon } from './Icon.tsx'
import styles from './Dialog.module.css'

interface DialogProps {
  offen: boolean
  titel: string
  /** Wird bei Esc, Schließen-Button und nach `close()` aufgerufen. */
  onSchliessen: () => void
  children: ReactNode
  /** Buttons am Fußende */
  aktionen?: ReactNode
  breite?: 'sm' | 'md'
}

/**
 * Modaler Dialog auf Basis von <dialog>: Fokusfang und Esc liefert der Browser,
 * der Fokus kehrt beim Schließen zum auslösenden Element zurück. Auf Mobil im Vollbild.
 */
export function Dialog({ offen, titel, onSchliessen, children, aktionen, breite = 'md' }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titelId = useId()

  // Layout-Effekt: läuft beim Ausblenden noch vor dem Entfernen aus dem DOM,
  // damit der Fokus sicher zum auslösenden Element zurückkehrt.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !offen) return
    const vorher = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (!el.open) el.showModal()
    return () => {
      if (el.open) el.close()
      if (vorher?.isConnected) vorher.focus()
    }
  }, [offen])

  return (
    <dialog
      ref={ref}
      className={`${styles.dialog} ${styles[breite]}`}
      aria-labelledby={titelId}
      onCancel={(event) => {
        // Esc: Schließen entscheidet die Elternkomponente (z. B. Rückfrage bei ungespeicherten Änderungen)
        event.preventDefault()
        onSchliessen()
      }}
    >
      {offen && (
        <div className={styles.rahmen}>
          <div className={styles.kopf}>
            <h2 id={titelId} className={styles.titel}>
              {titel}
            </h2>
            <button type="button" className={styles.schliessen} onClick={onSchliessen} aria-label="Dialog schließen">
              <Icon name="schliessen" />
            </button>
          </div>
          <div className={styles.inhalt}>{children}</div>
          {aktionen && <div className={styles.aktionen}>{aktionen}</div>}
        </div>
      )}
    </dialog>
  )
}
