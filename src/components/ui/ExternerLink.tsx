import type { ReactNode } from 'react'
import { istWebadresse } from '../../domain/url.ts'

/** Öffnet eine fremde Seite in einem neuen Tab, ohne Referrer und ohne Zugriff auf dieses Fenster. */
export function ExternerLink({ href, children, 'aria-label': ariaLabel }: { href: string; children: ReactNode; 'aria-label'?: string }) {
  if (!istWebadresse(href)) return <span>{children}</span>
  return (
    <a href={href.trim()} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" aria-label={ariaLabel}>
      {children}
    </a>
  )
}
