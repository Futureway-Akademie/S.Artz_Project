import styles from './Wordmark.module.css'

interface WordmarkProps {
  /** `dark`: für dunkle Flächen (Sidebar, Topbar). */
  tone?: 'light' | 'dark'
  size?: 'md' | 'lg'
}

/** Wortmarke als Text; „.AI“ in Markenblau. Mindestgröße 20 px fett (große Schrift für Blau auf Dunkel). */
export function Wordmark({ tone = 'light', size = 'md' }: WordmarkProps) {
  return (
    <span className={`${styles.wordmark} ${styles[tone]} ${styles[size]}`}>
      PIKARTZ<span className={styles.ai}>.AI</span>
    </span>
  )
}
