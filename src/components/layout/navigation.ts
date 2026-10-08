import { WERKZEUG_TYP, WERKZEUG_TYPEN } from '../../domain/selectors/werkzeug.ts'
import type { IconName } from '../ui/Icon.tsx'

export interface NavEintrag {
  to: string
  label: string
  /** Kurzlabel für die Icon-Leiste (Tablet) */
  kurz: string
  icon: IconName
  /** Nur in der vollen Navigation, nicht in der Icon-Leiste */
  nurVoll?: boolean
}

export interface NavGruppe {
  titel: string
  eintraege: NavEintrag[]
  /** Gruppe lässt sich in der vollen Navigation zuklappen */
  einklappbar?: boolean
}

/** Die Bereiche der App, gegliedert und in Navigationsreihenfolge. */
export const NAV_GRUPPEN: NavGruppe[] = [
  {
    titel: 'Arbeit',
    eintraege: [
      { to: '/', label: 'Arbeitscockpit', kurz: 'Cockpit', icon: 'cockpit' },
      { to: '/dashboard', label: 'Dashboard', kurz: 'Dashboard', icon: 'dashboard' },
      { to: '/aufgaben', label: 'Aufgaben & Termine', kurz: 'Aufgaben', icon: 'aufgaben' },
      { to: '/kalender', label: 'Kalender', kurz: 'Kalender', icon: 'kalender' },
      { to: '/projekte', label: 'Projekte', kurz: 'Projekte', icon: 'projekte' },
      { to: '/automationen', label: 'Automationen', kurz: 'Automat.', icon: 'automationen' },
    ],
  },
  {
    titel: 'KI-Werkzeugkasten',
    einklappbar: true,
    eintraege: [
      { to: '/werkzeug', label: 'Werkzeugkasten', kurz: 'Werkzeug', icon: 'werkzeug' },
      ...WERKZEUG_TYPEN.map((t) => ({ to: `/werkzeug/${WERKZEUG_TYP[t].slug}`, label: WERKZEUG_TYP[t].mehrzahl, kurz: WERKZEUG_TYP[t].kurz, icon: WERKZEUG_TYP[t].icon, nurVoll: true })),
    ],
  },
  {
    titel: 'Lernen',
    eintraege: [
      { to: '/weiterbildung', label: 'Weiterbildung', kurz: 'Kurs', icon: 'weiterbildung' },
      { to: '/wissen', label: 'Wissen', kurz: 'Wissen', icon: 'wissen' },
    ],
  },
  {
    titel: 'Netzwerk & Karriere',
    eintraege: [
      { to: '/kontakte', label: 'Kontakte & Leads', kurz: 'Kontakte', icon: 'kontakte' },
      { to: '/postfach', label: 'Postfach', kurz: 'Postfach', icon: 'mail' },
      { to: '/bewerbungen', label: 'Bewerbungen', kurz: 'Bewerb.', icon: 'bewerbungen' },
    ],
  },
  {
    titel: 'Marke & System',
    eintraege: [
      { to: '/pikartz-ai', label: 'PIKARTZ.AI', kurz: 'Marke', icon: 'marke' },
      { to: '/einstellungen', label: 'Einstellungen', kurz: 'Optionen', icon: 'einstellungen' },
    ],
  },
]

/** Alle Einträge in Navigationsreihenfolge */
export const NAVIGATION: NavEintrag[] = NAV_GRUPPEN.flatMap((g) => g.eintraege)
