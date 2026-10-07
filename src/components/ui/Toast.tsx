import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Icon } from './Icon.tsx'
import styles from './Toast.module.css'
import { ToastContext } from './toastContext.ts'

interface Meldung {
  id: number
  text: string
}

let naechsteId = 1

/** Kurze Bestätigungen unten rechts; Screenreader lesen sie über eine Live-Region vor. */
export function ToastProvider({ children, dauerMs = 4000 }: { children: ReactNode; dauerMs?: number }) {
  const [meldungen, setMeldungen] = useState<Meldung[]>([])

  const entfernen = useCallback((id: number) => setMeldungen((alt) => alt.filter((m) => m.id !== id)), [])

  const zeige = useCallback((text: string) => {
    const id = naechsteId++
    setMeldungen((alt) => [...alt.slice(-2), { id, text }])
  }, [])

  useEffect(() => {
    if (meldungen.length === 0) return
    const aelteste = meldungen[0]!
    const timer = window.setTimeout(() => entfernen(aelteste.id), dauerMs)
    return () => window.clearTimeout(timer)
  }, [meldungen, entfernen, dauerMs])

  const value = useMemo(() => ({ zeige }), [zeige])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.bereich} role="status" aria-live="polite">
        {meldungen.map((m) => (
          <div key={m.id} className={styles.toast}>
            <span>{m.text}</span>
            <button type="button" className={styles.schliessen} onClick={() => entfernen(m.id)} aria-label="Meldung schließen">
              <Icon name="schliessen" size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
