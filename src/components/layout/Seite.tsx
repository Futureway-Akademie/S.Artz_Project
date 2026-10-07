import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { SEITENTITEL_ID } from './ids.ts'
import styles from './Seite.module.css'

interface SeiteProps {
  titel: string
  /** Kurze Einordnung unter der Überschrift */
  einleitung?: ReactNode
  aktionen?: ReactNode
  children?: ReactNode
}

/** Rahmen jeder Seite: Überschrift (fokussierbar für Seitenwechsel) und Dokumenttitel. */
export function Seite({ titel, einleitung, aktionen, children }: SeiteProps) {
  useEffect(() => {
    document.title = `${titel} – PIKARTZ.AI Arbeitscockpit`
  }, [titel])

  return (
    <div className={styles.seite}>
      <div className={styles.kopf}>
        <div className={styles.titelblock}>
          <h1 id={SEITENTITEL_ID} tabIndex={-1} className={styles.titel}>
            {titel}
          </h1>
          {einleitung && <p className={styles.einleitung}>{einleitung}</p>}
        </div>
        {aktionen && <div className={styles.aktionen}>{aktionen}</div>}
      </div>
      {children}
    </div>
  )
}
