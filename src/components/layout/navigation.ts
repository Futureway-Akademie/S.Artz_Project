import type { IconName } from '../ui/Icon.tsx'

export interface NavEintrag {
  to: string
  label: string
  /** Kurzlabel für die Icon-Leiste (Tablet) */
  kurz: string
  icon: IconName
}

/** Die neun Bereiche der App, in Navigationsreihenfolge. */
export const NAVIGATION: NavEintrag[] = [
  { to: '/', label: 'Arbeitscockpit', kurz: 'Cockpit', icon: 'cockpit' },
  { to: '/projekte', label: 'Projekte', kurz: 'Projekte', icon: 'projekte' },
  { to: '/automationen', label: 'Automationen', kurz: 'Automat.', icon: 'automationen' },
  { to: '/weiterbildung', label: 'Weiterbildung', kurz: 'Kurs', icon: 'weiterbildung' },
  { to: '/pikartz-ai', label: 'PIKARTZ.AI', kurz: 'Marke', icon: 'marke' },
  { to: '/aufgaben', label: 'Aufgaben & Termine', kurz: 'Aufgaben', icon: 'aufgaben' },
  { to: '/kontakte', label: 'Kontakte & Leads', kurz: 'Kontakte', icon: 'kontakte' },
  { to: '/bewerbungen', label: 'Bewerbungen', kurz: 'Bewerb.', icon: 'bewerbungen' },
  { to: '/einstellungen', label: 'Einstellungen', kurz: 'Optionen', icon: 'einstellungen' },
]
