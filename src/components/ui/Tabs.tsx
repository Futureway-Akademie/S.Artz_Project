import { useId, useRef } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import styles from './Tabs.module.css'

export interface Tab<K extends string> {
  key: K
  label: string
  /** Optionale Zahl hinter dem Label, z. B. Anzahl Einträge */
  zahl?: number
}

interface TabsProps<K extends string> {
  label: string
  tabs: Array<Tab<K>>
  aktiv: K
  onWechsel: (key: K) => void
  children: ReactNode
}

/** Tabs nach WAI-ARIA-Muster: Pfeiltasten, Pos1/Ende; nur der aktive Tab ist im Tab-Fokus. */
export function Tabs<K extends string>({ label, tabs, aktiv, onWechsel, children }: TabsProps<K>) {
  const basis = useId()
  const refs = useRef<Array<HTMLButtonElement | null>>([])

  const taste = (event: KeyboardEvent, index: number) => {
    const ziel =
      event.key === 'ArrowRight' ? (index + 1) % tabs.length
      : event.key === 'ArrowLeft' ? (index - 1 + tabs.length) % tabs.length
      : event.key === 'Home' ? 0
      : event.key === 'End' ? tabs.length - 1
      : null
    if (ziel === null) return
    event.preventDefault()
    onWechsel(tabs[ziel]!.key)
    refs.current[ziel]?.focus()
  }

  return (
    <div className={styles.tabs}>
      <div role="tablist" aria-label={label} className={styles.liste}>
        {tabs.map((tab, index) => (
          <button
            key={tab.key}
            ref={(el) => {
              refs.current[index] = el
            }}
            type="button"
            role="tab"
            id={`${basis}-tab-${tab.key}`}
            aria-selected={tab.key === aktiv}
            aria-controls={`${basis}-panel`}
            tabIndex={tab.key === aktiv ? 0 : -1}
            className={styles.tab}
            onClick={() => onWechsel(tab.key)}
            onKeyDown={(e) => taste(e, index)}
          >
            {tab.label}
            {tab.zahl !== undefined && <span className={styles.zahl}>{tab.zahl}</span>}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${basis}-panel`} aria-labelledby={`${basis}-tab-${aktiv}`} className={styles.panel}>
        {children}
      </div>
    </div>
  )
}
