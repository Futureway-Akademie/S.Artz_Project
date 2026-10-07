import type { ReactNode } from 'react'
import styles from './Badge.module.css'

export type BadgeTone = 'neutral' | 'blue' | 'success' | 'warning' | 'danger'

interface BadgeProps {
  tone?: BadgeTone
  children: ReactNode
}

/** Kurzes Status-Label. Die Bedeutung steht immer im Text, nie nur in der Farbe. */
export function Badge({ tone = 'neutral', children }: BadgeProps) {
  return <span className={`${styles.badge} ${styles[tone]}`}>{children}</span>
}
