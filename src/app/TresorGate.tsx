import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Wordmark } from '../components/brand/Wordmark.tsx'
import { Button } from '../components/ui/Button.tsx'
import { TextField } from '../components/ui/Field.tsx'
import { FalschesPasswort, MIN_PASSWORT_LAENGE, pruefePasswort, STANDARD_ITERATIONEN } from '../data/krypto.ts'
import { STORAGE_KEY, type KeyValueStorage } from '../data/storage.ts'
import { ladeSperreMinuten, speichereSperreMinuten, VerschluesselterSpeicher } from '../data/tresor.ts'
import {
  alsTresor,
  mitWiederherstellungOeffnen,
  passwortSetzen,
  tresorAnlegen,
  tresorOeffnen,
  tresorVerschluesseln,
  wiederherstellungEinrichten,
  wiederherstellungEntfernen,
  type TresorUmschlag,
} from '../data/tresorKrypto.ts'
import { geheimnisAusLink, WIEDERHERSTELLUNG_PFAD, wiederherstellungsLink } from '../data/wiederherstellung.ts'
import { TresorContext, type TresorValue } from './tresorContext.ts'
import styles from './TresorGate.module.css'

type Phase =
  | { art: 'einrichten'; klartextVorhanden: boolean }
  | { art: 'gesperrt' }
  | { art: 'vergessen' }
  | { art: 'wiederherstellen'; geheimnis: string }
  | { art: 'offen'; speicher: VerschluesselterSpeicher }

interface TresorGateProps {
  /** Browser-Speicher; ohne Speicher läuft die App flüchtig und unverschlüsselt (es wird nichts abgelegt). */
  basis: KeyValueStorage | null
  children: (storage: KeyValueStorage | null) => ReactNode
  /** Nur für Tests kleiner wählen. */
  iterationen?: number
}

const AKTIVITAET = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'focusin'] as const

function anfangsPhase(basis: KeyValueStorage): Phase {
  // Aufruf über den Wiederherstellungslink aus der eigenen Mail: Schlüssel sofort aus der Adresszeile entfernen
  let geheimnis: string | null = null
  if (window.location.pathname === WIEDERHERSTELLUNG_PFAD) {
    geheimnis = geheimnisAusLink(window.location.hash)
    window.history.replaceState(null, '', '/')
  }
  const roh = basis.getItem(STORAGE_KEY)
  if (roh === null) return { art: 'einrichten', klartextVorhanden: false }
  if (!alsTresor(roh)) return { art: 'einrichten', klartextVorhanden: true }
  return geheimnis ? { art: 'wiederherstellen', geheimnis } : { art: 'gesperrt' }
}

function aktuellerUmschlag(basis: KeyValueStorage) {
  return alsTresor(basis.getItem(STORAGE_KEY) ?? '')
}

/**
 * Schützt alle Daten mit einem Passwort: Ohne Entsperren wird die App nicht angezeigt,
 * im Browser-Speicher steht nur verschlüsselter Text. Nach Inaktivität wird automatisch gesperrt.
 * Ein vergessenes Passwort lässt sich über den Wiederherstellungslink aus der eigenen Mail ersetzen.
 */
export function TresorGate({ basis, children, iterationen = STANDARD_ITERATIONEN }: TresorGateProps) {
  const [phase, setPhase] = useState<Phase>(() => (basis ? anfangsPhase(basis) : { art: 'gesperrt' }))
  const [sperreMinuten, setSperreMinutenState] = useState(() => ladeSperreMinuten(basis))
  const [schreibFehler, setSchreibFehler] = useState<string | null>(null)
  const [wiederherstellungEmail, setWiederherstellungEmail] = useState<string | null>(null)

  const sperren = useCallback(() => {
    setPhase((alt) => (alt.art === 'offen' ? { art: 'gesperrt' } : alt))
  }, [])

  // Automatische Sperre nach Inaktivität
  const letzteAktivitaet = useRef(0)
  const offen = phase.art === 'offen'
  useEffect(() => {
    if (!offen) return
    letzteAktivitaet.current = Date.now()
    const merken = () => {
      letzteAktivitaet.current = Date.now()
    }
    const pruefen = () => {
      if (Date.now() - letzteAktivitaet.current >= sperreMinuten * 60_000) sperren()
    }
    for (const e of AKTIVITAET) window.addEventListener(e, merken, { passive: true, capture: true })
    document.addEventListener('visibilitychange', pruefen)
    const timer = window.setInterval(pruefen, 15_000)
    return () => {
      for (const e of AKTIVITAET) window.removeEventListener(e, merken, { capture: true })
      document.removeEventListener('visibilitychange', pruefen)
      window.clearInterval(timer)
    }
  }, [offen, sperreMinuten, sperren])

  // Speichert ein anderer Tab, den neuen Stand entschlüsselt übernehmen
  const speicher = phase.art === 'offen' ? phase.speicher : null
  useEffect(() => {
    if (!speicher) return
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) void speicher.vonAussenAktualisieren(event.newValue)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [speicher])

  const tresor = useMemo<TresorValue | null>(() => {
    if (!speicher || !basis) return null
    return {
      sperren,
      sperreMinuten,
      setSperreMinuten: (minuten) => {
        speichereSperreMinuten(basis, minuten)
        setSperreMinutenState(minuten)
      },
      passwortAendern: async (alt, neu) => {
        await speicher.fertig()
        const umschlag = aktuellerUmschlag(basis)
        if (umschlag) await tresorOeffnen(alt, umschlag) // wirft FalschesPasswort
        await speicher.schluesselWechseln(await passwortSetzen(speicher.aktuellerSchluessel(), neu, iterationen))
      },
      wiederherstellung: wiederherstellungEmail,
      wiederherstellungEinrichten: async (email) => {
        const { schluessel, geheimnis } = await wiederherstellungEinrichten(speicher.aktuellerSchluessel(), email)
        await speicher.schluesselWechseln(schluessel)
        setWiederherstellungEmail(email)
        return wiederherstellungsLink(window.location.origin, geheimnis)
      },
      wiederherstellungEntfernen: async () => {
        await speicher.schluesselWechseln(wiederherstellungEntfernen(speicher.aktuellerSchluessel()))
        setWiederherstellungEmail(null)
      },
    }
  }, [speicher, basis, sperren, sperreMinuten, iterationen, wiederherstellungEmail])

  if (!basis) return children(null)

  if (phase.art === 'offen') {
    return (
      <TresorContext.Provider value={tresor}>
        {schreibFehler && (
          <div className={styles.schreibFehler} role="alert">
            <strong>Speichern fehlgeschlagen.</strong> {schreibFehler}
          </div>
        )}
        {children(phase.speicher)}
      </TresorContext.Provider>
    )
  }

  const oeffnen = async (geoeffnet: { klartext: string | null; schluessel: Awaited<ReturnType<typeof tresorAnlegen>> }) => {
    setSchreibFehler(null)
    // Sofort im aktuellen Format schreiben (stellt ältere Umschläge um)
    if (geoeffnet.klartext !== null) basis.setItem(STORAGE_KEY, JSON.stringify(await tresorVerschluesseln(geoeffnet.schluessel, geoeffnet.klartext)))
    setWiederherstellungEmail(geoeffnet.schluessel.kopf.wiederherstellung?.email ?? null)
    // Browser bitten, die Daten nicht bei Speicherknappheit automatisch zu löschen
    void navigator.storage?.persist?.().catch(() => false)
    setPhase({ art: 'offen', speicher: new VerschluesselterSpeicher(basis, geoeffnet.schluessel, geoeffnet.klartext, setSchreibFehler) })
  }

  const umschlag = aktuellerUmschlag(basis)
  const eingerichtet = umschlag?.version === 2 ? umschlag.wiederherstellung : null

  return (
    <main className={styles.seite}>
      <Wordmark size="lg" />
      {phase.art === 'einrichten' && (
        <Einrichten
          klartextVorhanden={phase.klartextVorhanden}
          onFertig={async (passwort) => {
            await oeffnen({ klartext: basis.getItem(STORAGE_KEY), schluessel: await tresorAnlegen(passwort, iterationen) })
          }}
        />
      )}
      {phase.art === 'gesperrt' && (
        <Entsperren
          onEntsperren={async (passwort) => {
            if (!umschlag) {
              setPhase(anfangsPhase(basis))
              return
            }
            await oeffnen(await tresorOeffnen(passwort, umschlag))
          }}
          onVergessen={() => setPhase({ art: 'vergessen' })}
        />
      )}
      {phase.art === 'vergessen' && (
        <Vergessen
          email={eingerichtet?.email ?? null}
          onZurueck={() => setPhase({ art: 'gesperrt' })}
          onLoeschen={() => {
            basis.removeItem(STORAGE_KEY)
            setPhase({ art: 'einrichten', klartextVorhanden: false })
          }}
        />
      )}
      {phase.art === 'wiederherstellen' && (
        <Wiederherstellen
          email={eingerichtet?.email ?? null}
          onAbbrechen={() => setPhase({ art: 'gesperrt' })}
          onNeuesPasswort={async (passwort) => {
            if (umschlag?.version !== 2) throw new Error('Für diese Daten ist keine Wiederherstellung eingerichtet.')
            const geoeffnet = await mitWiederherstellungOeffnen(phase.geheimnis, umschlag as TresorUmschlag)
            await oeffnen({ klartext: geoeffnet.klartext, schluessel: await passwortSetzen(geoeffnet.schluessel, passwort, iterationen) })
          }}
        />
      )}
    </main>
  )
}

function useAbsenden(aktion: () => Promise<void>, falschMeldung = 'Das Passwort ist falsch.') {
  const [laeuft, setLaeuft] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const absenden = async (event: FormEvent) => {
    event.preventDefault()
    if (laeuft) return
    setLaeuft(true)
    setFehler(null)
    try {
      await aktion()
    } catch (error) {
      setFehler(error instanceof FalschesPasswort ? falschMeldung : error instanceof Error ? error.message : String(error))
    } finally {
      setLaeuft(false)
    }
  }
  return { laeuft, fehler, setFehler, absenden }
}

function Einrichten({ klartextVorhanden, onFertig }: { klartextVorhanden: boolean; onFertig: (passwort: string) => Promise<void> }) {
  const [passwort, setPasswort] = useState('')
  const [wiederholung, setWiederholung] = useState('')
  const [verstanden, setVerstanden] = useState(false)
  const [eingabeFehler, setEingabeFehler] = useState<{ passwort?: string; verstanden?: string }>({})
  const { laeuft, fehler, absenden } = useAbsenden(async () => {
    const problem = pruefePasswort(passwort, wiederholung)
    const neu = { passwort: problem ?? undefined, verstanden: verstanden ? undefined : 'Bitte bestätigen.' }
    setEingabeFehler(neu)
    if (neu.passwort || neu.verstanden) return
    await onFertig(passwort)
  })

  return (
    <form className={styles.karte} onSubmit={absenden} noValidate>
      <h1 className={styles.titel}>{klartextVorhanden ? 'Daten verschlüsseln' : 'Passwort festlegen'}</h1>
      <p>
        {klartextVorhanden
          ? 'Deine Daten liegen bisher unverschlüsselt in diesem Browser. Lege ein Passwort fest – danach wird alles verschlüsselt gespeichert.'
          : 'Alle Daten werden nur in diesem Browser und nur verschlüsselt gespeichert. Lege dafür ein Passwort fest.'}
      </p>
      <TextField
        label="Passwort"
        type="password"
        autoComplete="new-password"
        required
        value={passwort}
        onChange={(e) => setPasswort(e.target.value)}
        hint={`Mindestens ${MIN_PASSWORT_LAENGE} Zeichen. Ein Satz aus mehreren Wörtern ist gut zu merken.`}
        error={eingabeFehler.passwort}
      />
      <TextField
        label="Passwort wiederholen"
        type="password"
        autoComplete="new-password"
        required
        value={wiederholung}
        onChange={(e) => setWiederholung(e.target.value)}
      />
      <div className={styles.bestaetigung}>
        <label>
          <input type="checkbox" checked={verstanden} onChange={(e) => setVerstanden(e.target.checked)} aria-describedby="tresor-hinweis" />{' '}
          Ich habe verstanden: Ohne dieses Passwort sind die Daten verloren.
        </label>
        <p id="tresor-hinweis" className={styles.hinweis}>
          Richte danach in den Einstellungen die Wiederherstellung per E-Mail ein und sichere deine Daten regelmäßig – ohne beides gibt es keinen Weg zurück.
        </p>
        {eingabeFehler.verstanden && <p className={styles.fehler}>{eingabeFehler.verstanden}</p>}
      </div>
      {fehler && (
        <p className={styles.fehler} role="alert">
          {fehler}
        </p>
      )}
      <div>
        <Button type="submit" disabled={laeuft}>
          {laeuft ? 'Wird verschlüsselt …' : klartextVorhanden ? 'Verschlüsseln und öffnen' : 'Festlegen und öffnen'}
        </Button>
      </div>
    </form>
  )
}

function Entsperren({ onEntsperren, onVergessen }: { onEntsperren: (passwort: string) => Promise<void>; onVergessen: () => void }) {
  const [passwort, setPasswort] = useState('')
  const { laeuft, fehler, absenden } = useAbsenden(() => onEntsperren(passwort))
  return (
    <form className={styles.karte} onSubmit={absenden} noValidate>
      <h1 className={styles.titel}>Gesperrt</h1>
      <p>Deine Daten sind verschlüsselt. Gib dein Passwort ein, um weiterzuarbeiten.</p>
      <TextField
        label="Passwort"
        type="password"
        autoComplete="current-password"
        required
        value={passwort}
        onChange={(e) => setPasswort(e.target.value)}
        error={fehler ?? undefined}
      />
      <div className={styles.aktionen}>
        <Button type="submit" disabled={laeuft || !passwort}>
          {laeuft ? 'Wird entsperrt …' : 'Entsperren'}
        </Button>
        <Button variant="ghost" onClick={onVergessen}>
          Passwort vergessen?
        </Button>
      </div>
    </form>
  )
}

function Vergessen({ email, onZurueck, onLoeschen }: { email: string | null; onZurueck: () => void; onLoeschen: () => void }) {
  const [sicher, setSicher] = useState(false)
  return (
    <section className={styles.karte} aria-labelledby="vergessen-titel">
      <h1 id="vergessen-titel" className={styles.titel}>
        Passwort vergessen
      </h1>
      {email ? (
        <div className={styles.hinweisBox}>
          <p>
            <strong>Wiederherstellung ist eingerichtet.</strong> Öffne in deinem Postfach <strong>{email}</strong> die Mail
            „Wiederherstellung PIKARTZ.AI Arbeitscockpit“ und klicke auf den Link. Danach vergibst du hier ein neues Passwort – deine Daten
            bleiben erhalten.
          </p>
        </div>
      ) : (
        <p>
          Für diese Daten ist keine Wiederherstellung per E-Mail eingerichtet, und das Passwort wird nirgends gespeichert. Du kannst neu
          beginnen und danach eine Sicherung importieren.
        </p>
      )}
      {sicher && (
        <p className={styles.fehler} role="alert">
          Damit werden alle verschlüsselten Daten in diesem Browser endgültig gelöscht.
        </p>
      )}
      <div className={styles.aktionen}>
        {sicher ? (
          <Button variant="danger" onClick={onLoeschen}>
            Ja, alles löschen und neu beginnen
          </Button>
        ) : (
          <Button variant="danger" onClick={() => setSicher(true)}>
            Daten löschen und neu beginnen
          </Button>
        )}
        <Button variant="ghost" onClick={onZurueck}>
          Zurück
        </Button>
      </div>
    </section>
  )
}

/** Aufruf über den Wiederherstellungslink: bestätigen und ein neues Passwort setzen. */
function Wiederherstellen({
  email,
  onAbbrechen,
  onNeuesPasswort,
}: {
  email: string | null
  onAbbrechen: () => void
  onNeuesPasswort: (passwort: string) => Promise<void>
}) {
  const [passwort, setPasswort] = useState('')
  const [wiederholung, setWiederholung] = useState('')
  const [eingabeFehler, setEingabeFehler] = useState<string | null>(null)
  const { laeuft, fehler, absenden } = useAbsenden(async () => {
    const problem = pruefePasswort(passwort, wiederholung)
    setEingabeFehler(problem)
    if (problem) return
    await onNeuesPasswort(passwort)
  }, 'Der Wiederherstellungslink passt nicht zu diesen Daten. Nutze den Link aus der neuesten Mail.')

  return (
    <form className={styles.karte} onSubmit={absenden} noValidate>
      <h1 className={styles.titel}>Passwort wiederherstellen</h1>
      <p>
        Du hast den Wiederherstellungslink {email ? <>aus der Mail an <strong>{email}</strong> </> : ''}geöffnet. Bestätige mit einem neuen
        Passwort – deine Daten bleiben erhalten, das alte Passwort gilt danach nicht mehr.
      </p>
      <TextField
        label="Neues Passwort"
        type="password"
        autoComplete="new-password"
        required
        value={passwort}
        onChange={(e) => setPasswort(e.target.value)}
        hint={`Mindestens ${MIN_PASSWORT_LAENGE} Zeichen.`}
        error={eingabeFehler ?? undefined}
      />
      <TextField label="Neues Passwort wiederholen" type="password" autoComplete="new-password" required value={wiederholung} onChange={(e) => setWiederholung(e.target.value)} />
      {fehler && (
        <p className={styles.fehler} role="alert">
          {fehler}
        </p>
      )}
      <div className={styles.aktionen}>
        <Button type="submit" disabled={laeuft}>
          {laeuft ? 'Wird wiederhergestellt …' : 'Bestätigen und Passwort setzen'}
        </Button>
        <Button variant="ghost" onClick={onAbbrechen}>
          Abbrechen
        </Button>
      </div>
    </form>
  )
}
