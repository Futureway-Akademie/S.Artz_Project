import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Button } from '../components/ui/Button.tsx'
import { TextField } from '../components/ui/Field.tsx'
import { PasswortDialog } from '../components/ui/PasswortDialog.tsx'
import type { CloudStand } from '../data/cloud/cloud.ts'
import { abgleichen, hierBehalten, ladeSyncMeta, serverUebernehmen, speichereSyncMeta, vomServerHolen, type SyncErgebnis } from '../data/cloud/sync.ts'
import { FalschesPasswort } from '../data/krypto.ts'
import { STORAGE_KEY, type KeyValueStorage } from '../data/storage.ts'
import type { VerschluesselterSpeicher } from '../data/tresor.ts'
import { alsTresor, tresorOeffnen, type Tresorschluessel } from '../data/tresorKrypto.ts'
import { useCloud } from './cloudContext.ts'
import { SyncContext, type SyncStatus, type SyncValue } from './syncContext.ts'
import styles from './TresorGate.module.css'

const VERZOEGERUNG_MS = 2000

interface CloudSyncProps {
  basis: KeyValueStorage
  speicher: VerschluesselterSpeicher
  /** Zählt lokale Schreibvorgänge; jede Erhöhung plant einen Abgleich */
  schreibZaehler: number
  /** Server-Stand übernommen: Store neu laden */
  onUebernommen: () => void
  /** Fremden Tresor aus der Cloud mit dessen Passwort geöffnet: Tresor ersetzen */
  onTresorErsetzen: (geoeffnet: { klartext: string; schluessel: Tresorschluessel }) => void
  children: ReactNode
}

/**
 * Hält den verschlüsselten Stand mit Supabase abgeglichen: beim Entsperren, nach dem Anmelden,
 * kurz nach jeder Änderung und wenn der Tab wieder sichtbar wird. Konflikte entscheidet Sascha.
 */
export function CloudSync({ basis, speicher, schreibZaehler, onUebernommen, onTresorErsetzen, children }: CloudSyncProps) {
  const cloud = useCloud()
  const angemeldet = Boolean(cloud?.konfiguriert && cloud.nutzer)
  const [status, setStatus] = useState<SyncStatus>('aus')
  const [fehler, setFehler] = useState<string | null>(null)
  const [server, setServer] = useState<CloudStand | null>(null)
  const [passwortFragen, setPasswortFragen] = useState(false)
  const [letzteSync, setLetzteSync] = useState(() => ladeSyncMeta(basis).letzteSync)
  const laeuft = useRef(false)

  const auswerten = useCallback(
    (r: SyncErgebnis) => {
      if (r.art === 'uebernommen') {
        speicher.uebernehmen(r.klartext, r.schluessel)
        onUebernommen()
      }
      if (r.art === 'konflikt' || r.art === 'fremd') {
        setServer(r.server)
        setStatus(r.art)
      } else {
        setServer(null)
        setStatus('ok')
      }
      setLetzteSync(ladeSyncMeta(basis).letzteSync)
    },
    [basis, speicher, onUebernommen],
  )

  const ausfuehren = useCallback(
    async (aktion: () => Promise<SyncErgebnis>) => {
      if (!cloud || laeuft.current) return
      laeuft.current = true
      setStatus('laeuft')
      setFehler(null)
      try {
        await speicher.fertig()
        auswerten(await aktion())
      } catch (error) {
        setStatus('fehler')
        setFehler(error instanceof Error ? error.message : String(error))
      } finally {
        laeuft.current = false
      }
    },
    [cloud, speicher, auswerten],
  )

  const jetztAbgleichen = useCallback(() => {
    if (!cloud || !angemeldet) return
    void ausfuehren(() => abgleichen(cloud.dienst, basis, speicher.aktuellerSchluessel()))
  }, [cloud, angemeldet, ausfuehren, basis, speicher])

  // Beim Anmelden bzw. Entsperren und wenn der Tab wieder sichtbar wird
  useEffect(() => {
    if (!angemeldet) return
    const start = window.setTimeout(jetztAbgleichen, 0)
    const sichtbar = () => document.visibilityState === 'visible' && jetztAbgleichen()
    document.addEventListener('visibilitychange', sichtbar)
    return () => {
      window.clearTimeout(start)
      document.removeEventListener('visibilitychange', sichtbar)
    }
  }, [angemeldet, jetztAbgleichen])

  // Kurz nach lokalen Änderungen hochladen
  const erster = useRef(true)
  useEffect(() => {
    if (erster.current) {
      erster.current = false
      return
    }
    if (!angemeldet) return
    const timer = window.setTimeout(jetztAbgleichen, VERZOEGERUNG_MS)
    return () => window.clearTimeout(timer)
  }, [schreibZaehler, angemeldet, jetztAbgleichen])

  const fremdOeffnen = async (passwort: string) => {
    if (!server) return null
    const umschlag = alsTresor(server.umschlag)
    if (!umschlag) return 'Die Daten in der Cloud sind nicht lesbar.'
    try {
      const geoeffnet = await tresorOeffnen(passwort, umschlag)
      basis.setItem(STORAGE_KEY, server.umschlag)
      speichereSyncMeta(basis, { revision: server.revision, lokalGeaendert: false, letzteSync: new Date().toISOString() })
      setPasswortFragen(false)
      setServer(null)
      setStatus('ok')
      onTresorErsetzen(geoeffnet)
      return null
    } catch (error) {
      if (error instanceof FalschesPasswort) return 'Das Passwort passt nicht zu den Daten in der Cloud.'
      throw error
    }
  }

  const value: SyncValue = { status: angemeldet ? status : 'aus', letzteSync, fehler, jetztAbgleichen }

  return (
    <SyncContext.Provider value={value}>
      {angemeldet && (status === 'konflikt' || status === 'fremd') && server && cloud && (
        <div className={styles.konflikt} role="alert">
          {status === 'konflikt' ? (
            <p>
              <strong>Auch auf einem anderen Gerät wurde geändert.</strong> Welcher Stand soll gelten? Der andere wird ersetzt – erstelle bei
              Bedarf vorher eine Sicherung.
            </p>
          ) : (
            <p>
              <strong>In der Cloud liegen Daten mit einem anderen Passwort.</strong> Öffne sie mit deren Passwort, oder ersetze sie durch
              die Daten auf diesem Gerät.
            </p>
          )}
          <div className={styles.aktionen}>
            {status === 'konflikt' ? (
              <Button size="sm" variant="secondary" onClick={() => void ausfuehren(() => serverUebernehmen(basis, server, speicher.aktuellerSchluessel()))}>
                Stand aus der Cloud übernehmen
              </Button>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => setPasswortFragen(true)}>
                Cloud-Daten öffnen
              </Button>
            )}
            <Button size="sm" variant="danger" onClick={() => void ausfuehren(() => hierBehalten(cloud.dienst, basis, server))}>
              Diesen Stand behalten und hochladen
            </Button>
          </div>
        </div>
      )}
      {angemeldet && status === 'fehler' && fehler && (
        <div className={styles.schreibFehler} role="alert">
          <strong>Synchronisierung fehlgeschlagen.</strong> {fehler} Die Daten bleiben sicher auf diesem Gerät.{' '}
          <Button size="sm" variant="secondary" onClick={jetztAbgleichen}>
            Erneut versuchen
          </Button>
        </div>
      )}
      {passwortFragen && (
        <PasswortDialog titel="Cloud-Daten öffnen" neu={false} bestaetigenLabel="Öffnen" onAbsenden={fremdOeffnen} onSchliessen={() => setPasswortFragen(false)}>
          <p>Gib das Passwort ein, mit dem die Daten in der Cloud verschlüsselt sind. Die Daten auf diesem Gerät werden dann ersetzt.</p>
        </PasswortDialog>
      )}
      {children}
    </SyncContext.Provider>
  )
}

/** Neues Gerät: Anmelden und den verschlüsselten Stand aus der Cloud holen (vor dem Entsperren). */
export function CloudEinstieg({ basis, onGeholt }: { basis: KeyValueStorage; onGeholt: () => void }) {
  const cloud = useCloud()
  const [email, setEmail] = useState('')
  const [meldung, setMeldung] = useState<string | null>(null)
  const [laeuft, setLaeuft] = useState(false)

  if (!cloud?.konfiguriert) return null

  const holen = async () => {
    setLaeuft(true)
    setMeldung(null)
    try {
      if (await vomServerHolen(cloud.dienst, basis)) onGeholt()
      else setMeldung('In der Cloud liegen noch keine Daten. Lege hier ein Passwort fest – die Daten werden danach hochgeladen.')
    } catch (error) {
      setMeldung(error instanceof Error ? error.message : String(error))
    } finally {
      setLaeuft(false)
    }
  }

  const senden = async (event: FormEvent) => {
    event.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setMeldung('Bitte eine gültige E-Mail-Adresse eingeben.')
      return
    }
    setLaeuft(true)
    try {
      await cloud.anmelden(email)
      setMeldung(`Anmeldelink an ${email.trim()} geschickt. Klicke ihn auf diesem Gerät an.`)
    } catch (error) {
      setMeldung(error instanceof Error ? error.message : String(error))
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <section className={styles.karte} aria-labelledby="cloud-einstieg">
      <h2 id="cloud-einstieg" className={styles.untertitel}>
        Schon Daten auf einem anderen Gerät?
      </h2>
      {cloud.nutzer ? (
        <>
          <p>Angemeldet als {cloud.nutzer.email}. Hole den verschlüsselten Stand und entsperre ihn mit deinem Passwort.</p>
          <div>
            <Button variant="secondary" onClick={() => void holen()} disabled={laeuft}>
              Daten aus der Cloud laden
            </Button>
          </div>
        </>
      ) : (
        <form className={styles.aktionen} onSubmit={senden} noValidate aria-label="Für die Cloud anmelden">
          <TextField label="E-Mail-Adresse" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} optionalKennzeichnen={false} />
          <Button type="submit" variant="secondary" disabled={laeuft}>
            Anmeldelink senden
          </Button>
        </form>
      )}
      {meldung && <p role="status">{meldung}</p>}
    </section>
  )
}
