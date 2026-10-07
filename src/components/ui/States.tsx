import type { ReactNode } from 'react'
import styles from './States.module.css'

interface StateProps {
  title: string
  children?: ReactNode
  /** z. B. ein Button „Erste Aufgabe anlegen“ */
  action?: ReactNode
}

/** Leerzustand: erklärt, warum nichts angezeigt wird, statt Werte zu erfinden. */
export function EmptyState({ title, children, action }: StateProps) {
  return (
    <div className={`${styles.state} ${styles.empty}`}>
      <p className={styles.title}>{title}</p>
      {children && <div className={styles.text}>{children}</div>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  )
}

export function ErrorState({ title, children, action }: StateProps) {
  return (
    <div className={`${styles.state} ${styles.error}`} role="alert">
      <p className={styles.title}>{title}</p>
      {children && <div className={styles.text}>{children}</div>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  )
}

interface LoadingStateProps {
  label?: string
}

export function LoadingState({ label = 'Wird geladen …' }: LoadingStateProps) {
  return (
    <div className={`${styles.state} ${styles.loading}`} role="status" aria-live="polite">
      <span className={styles.spinner} aria-hidden="true" />
      <p className={styles.text}>{label}</p>
    </div>
  )
}
