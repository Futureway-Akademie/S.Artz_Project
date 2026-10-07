import { entschluesselnMit, alsUmschlag, verschluesseln, type Schluessel } from './krypto.ts'
import { STORAGE_KEY, type KeyValueStorage } from './storage.ts'

/** Unverschlüsselte, nicht persönliche Einstellungen der Sperre (z. B. Minuten bis zur Sperre). */
export const SICHERHEIT_KEY = `${STORAGE_KEY}:sicherheit`
export const SPERRE_OPTIONEN = [5, 15, 30, 60] as const
export const STANDARD_SPERRE_MINUTEN = 15

export function ladeSperreMinuten(basis: KeyValueStorage | null): number {
  try {
    const wert = Number(JSON.parse(basis?.getItem(SICHERHEIT_KEY) ?? 'null')?.sperreMinuten)
    return (SPERRE_OPTIONEN as readonly number[]).includes(wert) ? wert : STANDARD_SPERRE_MINUTEN
  } catch {
    return STANDARD_SPERRE_MINUTEN
  }
}

export function speichereSperreMinuten(basis: KeyValueStorage | null, minuten: number): void {
  try {
    basis?.setItem(SICHERHEIT_KEY, JSON.stringify({ sperreMinuten: minuten }))
  } catch {
    // nicht kritisch
  }
}

/**
 * Speicher-Adapter für den StoreProvider: hält die entschlüsselten Daten nur im Arbeitsspeicher
 * und schreibt sie ausschließlich verschlüsselt in den Browser-Speicher.
 * Schreiben ist asynchron und wird in Reihenfolge abgearbeitet; nur der jeweils neueste Stand wird geschrieben.
 */
export class VerschluesselterSpeicher implements KeyValueStorage {
  private klartext: string | null
  private kette: Promise<void> = Promise.resolve()
  private schluessel: Schluessel
  private readonly basis: KeyValueStorage
  private readonly onFehler: (fehler: string) => void

  constructor(basis: KeyValueStorage, schluessel: Schluessel, klartext: string | null, onFehler: (fehler: string) => void = () => {}) {
    this.basis = basis
    this.schluessel = schluessel
    this.klartext = klartext
    this.onFehler = onFehler
  }

  getItem(key: string): string | null {
    return key === STORAGE_KEY ? this.klartext : this.basis.getItem(key)
  }

  setItem(key: string, value: string): void {
    if (key !== STORAGE_KEY) return this.basis.setItem(key, value)
    this.klartext = value
    this.schreiben(value)
  }

  removeItem(key: string): void {
    if (key === STORAGE_KEY) this.klartext = null
    this.basis.removeItem(key)
  }

  private schreiben(value: string): void {
    const schluessel = this.schluessel
    this.kette = this.kette.then(async () => {
      if (this.klartext !== value) return // ein neuerer Stand folgt
      try {
        const umschlag = await verschluesseln(schluessel, value)
        if (this.klartext !== value) return
        this.basis.setItem(STORAGE_KEY, JSON.stringify(umschlag))
      } catch (error) {
        const voll = error instanceof DOMException && (error.name === 'QuotaExceededError' || error.code === 22)
        this.onFehler(voll ? 'Der Browser-Speicher ist voll.' : 'Die Daten konnten nicht verschlüsselt gespeichert werden.')
      }
    })
  }

  /** Wartet, bis alle Schreibvorgänge erledigt sind. */
  fertig(): Promise<void> {
    return this.kette
  }

  /** Neuer Schlüssel (Passwort geändert): aktueller Stand wird sofort neu verschlüsselt geschrieben. */
  async schluesselWechseln(neu: Schluessel): Promise<void> {
    await this.kette
    this.schluessel = neu
    if (this.klartext !== null) this.schreiben(this.klartext)
    await this.kette
  }

  /** Ein anderer Tab hat gespeichert: neuen Stand mit demselben Schlüssel entschlüsseln. */
  async vonAussenAktualisieren(roh: string | null): Promise<void> {
    if (roh === null) {
      this.klartext = null
      return
    }
    const umschlag = alsUmschlag(roh)
    if (!umschlag) return
    try {
      this.klartext = await entschluesselnMit(this.schluessel, umschlag)
    } catch {
      // Mit anderem Passwort gespeichert: beim nächsten Entsperren klärt sich das.
    }
  }
}
