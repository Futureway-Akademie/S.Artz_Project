import { useId } from 'react'
import type { ReactNode } from 'react'
import styles from './Panel.module.css'

interface PanelProps {
  titel: string
  aktionen?: ReactNode
  children: ReactNode
}

/** Weiße Inhaltsfläche mit Überschrift (h2) als benannter Abschnitt. */
export function Panel({ titel, aktionen, children }: PanelProps) {
  const id = useId()
  return (
    <section className={styles.panel} aria-labelledby={id}>
      <div className={styles.kopf}>
        <h2 id={id} className={styles.titel}>
          {titel}
        </h2>
        {aktionen && <div className={styles.aktionen}>{aktionen}</div>}
      </div>
      {children}
    </section>
  )
}
