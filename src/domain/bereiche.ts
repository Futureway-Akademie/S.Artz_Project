/**
 * Bereiche des Cockpits, die der Admin je Rolle und Nutzer freigibt.
 * Einstellungen sind immer erreichbar; der Admin-Bereich nur für Admins.
 */
export const BEREICHE = [
  { key: 'cockpit', label: 'Arbeitscockpit', pfad: '/' },
  { key: 'dashboard', label: 'Dashboard', pfad: '/dashboard' },
  { key: 'aufgaben', label: 'Aufgaben & Termine', pfad: '/aufgaben' },
  { key: 'kalender', label: 'Kalender', pfad: '/kalender' },
  { key: 'projekte', label: 'Projekte', pfad: '/projekte' },
  { key: 'automationen', label: 'Automationen', pfad: '/automationen' },
  { key: 'werkzeug', label: 'KI-Werkzeugkasten', pfad: '/werkzeug' },
  { key: 'weiterbildung', label: 'Weiterbildung', pfad: '/weiterbildung' },
  { key: 'wissen', label: 'Wissen', pfad: '/wissen' },
  { key: 'kontakte', label: 'Kontakte & Leads', pfad: '/kontakte' },
  { key: 'postfach', label: 'Postfach', pfad: '/postfach' },
  { key: 'bewerbungen', label: 'Bewerbungen', pfad: '/bewerbungen' },
  { key: 'marke', label: 'PIKARTZ.AI', pfad: '/pikartz-ai' },
  { key: 'ki', label: 'KI-Assistent', pfad: '/assistent' },
] as const

export type Bereich = (typeof BEREICHE)[number]['key']

const SCHLUESSEL = new Set<string>(BEREICHE.map((b) => b.key))
export const istBereich = (wert: string): wert is Bereich => SCHLUESSEL.has(wert)

export interface Profil {
  userId: string
  email: string
  anzeigename: string
  rolleId: string | null
  istAdmin: boolean
  gesperrt: boolean
  bereicheAn: string[]
  bereicheAus: string[]
}

export interface Rolle {
  id: string
  name: string
  bereiche: string[]
}

export interface Rechte {
  /** Kein Mehrbenutzer-Konto (lokal oder Admin): alles erlaubt */
  alle: boolean
  istAdmin: boolean
  gesperrt: boolean
  bereiche: ReadonlySet<Bereich>
}

export const ALLE_RECHTE: Rechte = { alle: true, istAdmin: false, gesperrt: false, bereiche: new Set(BEREICHE.map((b) => b.key)) }

/** Bereiche aus Rolle plus Freigaben minus Sperren; Unbekanntes wird ignoriert. */
export function effektiveBereiche(rolle: readonly string[], an: readonly string[], aus: readonly string[]): Bereich[] {
  const gesperrt = new Set(aus)
  return BEREICHE.map((b) => b.key).filter((k) => (rolle.includes(k) || an.includes(k)) && !gesperrt.has(k))
}

/** Rechte eines angemeldeten Nutzers; ohne Profil (nicht angemeldet, kein Mehrbenutzer) gilt: alles erlaubt. */
export function rechteAus(profil: Profil | null, rollen: readonly Rolle[]): Rechte {
  if (!profil) return ALLE_RECHTE
  if (profil.gesperrt) return { alle: false, istAdmin: false, gesperrt: true, bereiche: new Set() }
  if (profil.istAdmin) return { ...ALLE_RECHTE, istAdmin: true }
  const rolle = rollen.find((r) => r.id === profil.rolleId)
  return { alle: false, istAdmin: false, gesperrt: false, bereiche: new Set(effektiveBereiche(rolle?.bereiche ?? [], profil.bereicheAn, profil.bereicheAus)) }
}

export function darf(rechte: Rechte, bereich: Bereich): boolean {
  return rechte.alle || rechte.bereiche.has(bereich)
}

/** Zu welchem Bereich gehört eine Adresse? `null` = immer erreichbar (Einstellungen, Hilfe, unbekannt). */
export function bereichVonPfad(pfad: string): Bereich | 'admin' | null {
  const p = pfad.split(/[?#]/)[0] ?? '/'
  if (p === '/' || p === '') return 'cockpit'
  if (p.startsWith('/admin')) return 'admin'
  const treffer = BEREICHE.find((b) => b.pfad && b.pfad !== '/' && (p === b.pfad || p.startsWith(`${b.pfad}/`)))
  return treffer?.key ?? null
}

/** Darf diese Adresse geöffnet werden? */
export function darfPfad(rechte: Rechte, pfad: string): boolean {
  const b = bereichVonPfad(pfad)
  if (b === 'admin') return rechte.istAdmin
  return b === null || darf(rechte, b)
}

/**
 * Einen Bereich für einen Nutzer ein- oder ausschalten: Abweichungen von der Rolle werden in
 * `bereicheAn`/`bereicheAus` festgehalten, Überflüssiges wird entfernt.
 */
export function bereichUmschalten(profil: Pick<Profil, 'bereicheAn' | 'bereicheAus'>, rolle: readonly string[], bereich: Bereich, an: boolean): Pick<Profil, 'bereicheAn' | 'bereicheAus'> {
  const ohne = (liste: string[]) => liste.filter((b) => b !== bereich)
  const inRolle = rolle.includes(bereich)
  if (an) return { bereicheAn: inRolle ? ohne(profil.bereicheAn) : [...ohne(profil.bereicheAn), bereich], bereicheAus: ohne(profil.bereicheAus) }
  return { bereicheAn: ohne(profil.bereicheAn), bereicheAus: inRolle ? [...ohne(profil.bereicheAus), bereich] : ohne(profil.bereicheAus) }
}
