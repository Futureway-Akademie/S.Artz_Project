import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useCloud } from '../../app/cloudContext.ts'
import { Seite } from '../../components/layout/Seite.tsx'
import { Badge } from '../../components/ui/Badge.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.tsx'
import { SelectField, TextField } from '../../components/ui/Field.tsx'
import { Panel } from '../../components/ui/Panel.tsx'
import { EmptyState } from '../../components/ui/States.tsx'
import { useToast } from '../../components/ui/toastContext.ts'
import { BEREICHE, bereichUmschalten, darfTeilen, effektiveBereiche, imKreis, type Bereich, type KreisPaar, type Profil, type Rolle } from '../../domain/bereiche.ts'
import { useFreigaben } from '../../app/freigabeContext.ts'
import type { EigeneFreigabe } from '../../data/cloud/cloud.ts'
import { TEILBARE_BEREICHE, type TeilbarerBereich } from '../../data/freigabe/ausschnitt.ts'
import { bereichTeilen } from '../../data/freigabe/freigabe.ts'
import { useStore } from '../../data/storeContext.ts'
import styles from './AdminSeite.module.css'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Admin-Bereich: Nutzer einladen, Rollen vergeben, Bereiche je Nutzer schalten, Nutzer sperren, Rollen pflegen. */
export function AdminSeite() {
  const cloud = useCloud()
  const { zeige } = useToast()
  const [profile, setProfile] = useState<Profil[] | null>(null)
  const [rollen, setRollen] = useState<Rolle[]>([])
  const [fehler, setFehler] = useState<string | null>(null)
  const [freigaben, setFreigaben] = useState<EigeneFreigabe[]>([])
  const [kreis, setKreis] = useState<KreisPaar[]>([])
  const { data } = useStore()
  const { freigabenGeaendert } = useFreigaben()
  const dienst = cloud?.dienst
  const istAdmin = Boolean(cloud?.rechte.istAdmin && cloud.nutzer)

  const laden = useCallback(async () => {
    if (!dienst) return
    try {
      const [p, r, f, k] = await Promise.all([dienst.profile(), dienst.rollen(), dienst.eigeneFreigaben(), dienst.freigabeKreis()])
      setProfile(p)
      setRollen(r)
      setFreigaben(f)
      setKreis(k)
      setFehler(null)
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e))
    }
  }, [dienst])

  useEffect(() => {
    if (!istAdmin || !dienst) return
    let aktiv = true
    Promise.all([dienst.profile(), dienst.rollen(), dienst.eigeneFreigaben(), dienst.freigabeKreis()])
      .then(([p, r, f, k]) => {
        if (!aktiv) return
        setProfile(p)
        setRollen(r)
        setFreigaben(f)
        setKreis(k)
      })
      .catch((e: unknown) => aktiv && setFehler(e instanceof Error ? e.message : String(e)))
    return () => {
      aktiv = false
    }
  }, [istAdmin, dienst])

  /** Änderung ausführen, Liste und eigene Rechte neu laden */
  const aendern = async (aktion: () => Promise<unknown>, meldung: string) => {
    try {
      await aktion()
      await laden()
      await cloud?.rechteNeuLaden()
      zeige(meldung)
    } catch (e) {
      zeige(e instanceof Error ? e.message : 'Änderung fehlgeschlagen')
    }
  }

  /** Bereich für einen Nutzer teilen oder nicht mehr teilen; verschlüsselt neu mit neuem Bereichsschlüssel */
  const teilen = async (userId: string, bereich: TeilbarerBereich, an: boolean) => {
    if (!dienst) return
    const bisher = freigaben.find((f) => f.bereich === bereich)?.empfaenger ?? []
    const empfaenger = an ? [...new Set([...bisher, userId])] : bisher.filter((id) => id !== userId)
    try {
      const e = await bereichTeilen(dienst, data, bereich, empfaenger, new Date())
      const neu = await dienst.eigeneFreigaben()
      setFreigaben(neu)
      freigabenGeaendert(neu.some((f) => f.empfaenger.length > 0))
      zeige(e.ohneSchluessel.includes(userId) ? 'Noch nicht möglich: Die Person muss sich einmal anmelden und ihren Tresor entsperren.' : an ? 'Bereich verschlüsselt geteilt' : 'Freigabe beendet – neue Stände sind für die Person nicht mehr lesbar')
    } catch (err) {
      zeige(err instanceof Error ? err.message : 'Teilen fehlgeschlagen')
    }
  }

  if (!cloud?.konfiguriert || !cloud.nutzer) {
    return (
      <Seite titel="Nutzer & Rollen">
        <EmptyState title="Nur mit Anmeldung">Der Admin-Bereich braucht Supabase und eine Anmeldung (Einstellungen → Konto und Synchronisierung).</EmptyState>
      </Seite>
    )
  }
  if (!istAdmin) {
    return (
      <Seite titel="Nutzer & Rollen">
        <EmptyState title="Kein Zugriff">Diesen Bereich sieht nur der Admin.</EmptyState>
      </Seite>
    )
  }

  return (
    <Seite titel="Nutzer & Rollen" einleitung="Lade Nutzer ein, vergib Rollen und schalte Bereiche je Nutzer frei. Im Freigabe-Kreis legst du fest, wer mit wem teilen und Aufgaben übergeben darf. Die Daten jedes Nutzers bleiben in seinem eigenen, verschlüsselten Tresor.">
      {fehler && (
        <p className={styles.fehler} role="alert">
          {fehler}
        </p>
      )}
      <Einladen rollen={rollen} onEinladen={(email, rolleId) => aendern(() => cloud.dienst.einladen(email, rolleId, `${window.location.origin}/`), `Einladung an ${email} verschickt`)} />

      <Panel titel="Nutzer">
        {profile === null ? (
          <p>Lädt …</p>
        ) : (
          <ul className={styles.liste} aria-label="Nutzer">
            {profile.map((p) => (
              <li key={p.userId}>
                <NutzerKarte
                  profil={p}
                  rollen={rollen}
                  ichSelbst={p.userId === cloud.nutzer?.id}
                  andere={profile.filter((x) => x.userId !== p.userId)}
                  kreis={kreis}
                  onKreis={(anderer, an) => aendern(() => cloud.dienst.kreisPaarSetzen(p.userId, anderer.userId, an), an ? `${name(p)} und ${name(anderer)} dürfen jetzt teilen` : `${name(p)} und ${name(anderer)} dürfen nicht mehr teilen`)}
                  geteilt={new Set(freigaben.filter((f) => f.empfaenger.includes(p.userId)).map((f) => f.bereich))}
                  onTeilen={(bereich, an) => teilen(p.userId, bereich, an)}
                  onAendern={(aenderung, meldung) => aendern(() => cloud.dienst.profilAendern(p.userId, aenderung), meldung)}
                />
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Rollen
        rollen={rollen}
        onSpeichern={(r) => aendern(() => cloud.dienst.rolleSpeichern(r), `Rolle „${r.name}“ gespeichert`)}
        onLoeschen={(r) => aendern(() => cloud.dienst.rolleLoeschen(r.id), `Rolle „${r.name}“ gelöscht`)}
      />
    </Seite>
  )
}

/** Anzeigename, sonst E-Mail-Adresse */
const name = (p: Pick<Profil, 'anzeigename' | 'email'>) => p.anzeigename.trim() || p.email

function Einladen({ rollen, onEinladen }: { rollen: Rolle[]; onEinladen: (email: string, rolleId: string | null) => Promise<void> }) {
  const [email, setEmail] = useState('')
  const [rolleId, setRolleId] = useState('')
  const [fehler, setFehler] = useState<string | undefined>()

  const senden = async (e: FormEvent) => {
    e.preventDefault()
    if (!EMAIL.test(email.trim())) {
      setFehler('Bitte eine gültige E-Mail-Adresse eingeben.')
      return
    }
    setFehler(undefined)
    await onEinladen(email.trim(), rolleId || null)
    setEmail('')
  }

  return (
    <Panel titel="Einladen">
      <form className={styles.einladen} onSubmit={senden} noValidate aria-label="Nutzer einladen">
        <TextField label="E-Mail-Adresse" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={fehler} optionalKennzeichnen={false} />
        <SelectField label="Rolle" value={rolleId} onChange={(e) => setRolleId(e.target.value)} placeholder="Ohne Rolle (sieht nichts)" options={rollen.map((r) => ({ value: r.id, label: r.name }))} optionalKennzeichnen={false} />
        <Button type="submit">Einladung senden</Button>
      </form>
      <p className={styles.hinweis}>Die Person bekommt eine Mail mit Link, legt ihr eigenes Passwort fest und sieht nur die Bereiche ihrer Rolle.</p>
    </Panel>
  )
}

function NutzerKarte({
  profil,
  rollen,
  ichSelbst,
  onAendern,
  geteilt,
  onTeilen,
  andere,
  kreis,
  onKreis,
}: {
  profil: Profil
  rollen: Rolle[]
  ichSelbst: boolean
  onAendern: (aenderung: Partial<Profil>, meldung: string) => Promise<void>
  geteilt: Set<string>
  onTeilen: (bereich: TeilbarerBereich, an: boolean) => Promise<void>
  andere: Profil[]
  kreis: KreisPaar[]
  onKreis: (anderer: Profil, an: boolean) => Promise<void>
}) {
  const [sperren, setSperren] = useState(false)
  const rolle = rollen.find((r) => r.id === profil.rolleId)
  const rolleBereiche = rolle?.bereiche ?? []
  const aktiv = new Set<string>(effektiveBereiche(rolleBereiche, profil.bereicheAn, profil.bereicheAus))
  const id = `nutzer-${profil.userId}`
  const ausRolle = rolle?.darfTeilen ?? false
  const teilenWert = profil.darfTeilen === true ? 'ja' : profil.darfTeilen === false ? 'nein' : ''
  const darfEs = darfTeilen(profil, rolle)

  return (
    <article className={styles.karte} aria-labelledby={id}>
      <div className={styles.kopf}>
        <h3 id={id} className={styles.name}>
          {profil.email}
        </h3>
        {profil.istAdmin && <Badge tone="blue">Admin</Badge>}
        {profil.gesperrt && <Badge>Gesperrt</Badge>}
        {ichSelbst && <Badge>Du</Badge>}
      </div>
      {profil.istAdmin ? (
        <p className={styles.hinweis}>Admins sehen alle Bereiche und dürfen mit allen teilen und Aufgaben übergeben.</p>
      ) : (
        <>
          <div className={styles.zeile}>
            <SelectField
              label="Rolle"
              value={profil.rolleId ?? ''}
              onChange={(e) => void onAendern({ rolleId: e.target.value || null, bereicheAn: [], bereicheAus: [] }, 'Rolle geändert')}
              placeholder="Ohne Rolle"
              options={rollen.map((r) => ({ value: r.id, label: r.name }))}
              optionalKennzeichnen={false}
            />
            <Button variant={profil.gesperrt ? 'secondary' : 'ghost'} onClick={() => (profil.gesperrt ? void onAendern({ gesperrt: false }, 'Nutzer entsperrt') : setSperren(true))}>
              {profil.gesperrt ? 'Entsperren' : 'Sperren'}
            </Button>
          </div>
          <fieldset className={styles.bereiche}>
            <legend>Bereiche</legend>
            {BEREICHE.map((b) => {
              const abweichung = aktiv.has(b.key) !== rolleBereiche.includes(b.key)
              return (
                <label key={b.key} className={styles.check}>
                  <input
                    type="checkbox"
                    checked={aktiv.has(b.key)}
                    disabled={profil.gesperrt}
                    onChange={(e) => void onAendern(bereichUmschalten(profil, rolleBereiche, b.key as Bereich, e.target.checked), `${b.label} ${e.target.checked ? 'freigegeben' : 'gesperrt'}`)}
                  />
                  {b.label}
                  {abweichung && <span className={styles.abweichung}> (abweichend von der Rolle)</span>}
                </label>
              )
            })}
          </fieldset>
          <fieldset className={styles.bereiche}>
            <legend>Von deinen Daten teilen (nur lesen, verschlüsselt)</legend>
            {TEILBARE_BEREICHE.map((b) => (
              <label key={b.key} className={styles.check}>
                <input type="checkbox" checked={geteilt.has(b.key)} disabled={profil.gesperrt} onChange={(e) => void onTeilen(b.key, e.target.checked)} />
                {b.label}
              </label>
            ))}
          </fieldset>
          <div className={styles.zeile}>
            <SelectField
              label="Teilen und Aufgaben übergeben"
              value={teilenWert}
              disabled={profil.gesperrt}
              onChange={(e) => void onAendern({ darfTeilen: e.target.value === 'ja' ? true : e.target.value === 'nein' ? false : null }, 'Recht zum Teilen geändert')}
              placeholder={`Wie die Rolle (${ausRolle ? 'erlaubt' : 'nicht erlaubt'})`}
              options={[
                { value: 'ja', label: 'Erlaubt' },
                { value: 'nein', label: 'Nicht erlaubt' },
              ]}
              optionalKennzeichnen={false}
            />
          </div>
          <fieldset className={styles.bereiche}>
            <legend>Freigabe-Kreis: darf teilen und Aufgaben übergeben an</legend>
            {andere.length === 0 && <p className={styles.hinweis}>Noch keine anderen Nutzer.</p>}
            {andere.map((a) => (
              <label key={a.userId} className={styles.check}>
                <input type="checkbox" checked={imKreis(kreis, profil.userId, a.userId)} disabled={profil.gesperrt} onChange={(e) => void onKreis(a, e.target.checked)} />
                {name(a)}
              </label>
            ))}
          </fieldset>
          {!darfEs && !profil.gesperrt && <p className={styles.hinweis}>Ohne das Recht „Teilen und Aufgaben übergeben“ kann diese Person selbst nichts teilen. Andere aus ihrem Kreis können ihr trotzdem etwas teilen oder übergeben.</p>}
        </>
      )}
      {sperren && (
        <ConfirmDialog
          offen
          titel="Nutzer sperren?"
          bestaetigenLabel="Sperren"
          gefahr
          onAbbrechen={() => setSperren(false)}
          onBestaetigen={() => {
            setSperren(false)
            void onAendern({ gesperrt: true }, 'Nutzer gesperrt')
          }}
        >
          <p>{profil.email} kommt danach nicht mehr an seine Daten in der Cloud, bis du entsperrst.</p>
        </ConfirmDialog>
      )}
    </article>
  )
}

function Rollen({ rollen, onSpeichern, onLoeschen }: { rollen: Rolle[]; onSpeichern: (r: { id?: string; name: string; bereiche: string[] }) => Promise<void>; onLoeschen: (r: Rolle) => Promise<void> }) {
  const [neu, setNeu] = useState('')
  return (
    <Panel titel="Rollen">
      <ul className={styles.liste} aria-label="Rollen">
        {rollen.map((r) => (
          <li key={r.id}>
            <RolleKarte rolle={r} onSpeichern={onSpeichern} onLoeschen={onLoeschen} />
          </li>
        ))}
      </ul>
      <form
        className={styles.einladen}
        onSubmit={(e) => {
          e.preventDefault()
          if (!neu.trim()) return
          void onSpeichern({ name: neu.trim(), bereiche: ['cockpit'] }).then(() => setNeu(''))
        }}
        aria-label="Neue Rolle"
      >
        <TextField label="Neue Rolle" value={neu} onChange={(e) => setNeu(e.target.value)} optionalKennzeichnen={false} hint="z. B. Praktikant" />
        <Button type="submit" variant="secondary">
          Rolle anlegen
        </Button>
      </form>
    </Panel>
  )
}

function RolleKarte({ rolle, onSpeichern, onLoeschen }: { rolle: Rolle; onSpeichern: (r: Rolle) => Promise<void>; onLoeschen: (r: Rolle) => Promise<void> }) {
  const [loeschen, setLoeschen] = useState(false)
  const id = `rolle-${rolle.id}`
  const umschalten = (b: string, an: boolean) => void onSpeichern({ ...rolle, bereiche: an ? [...rolle.bereiche, b] : rolle.bereiche.filter((x) => x !== b) })
  return (
    <article className={styles.karte} aria-labelledby={id}>
      <div className={styles.kopf}>
        <h3 id={id} className={styles.name}>
          {rolle.name}
        </h3>
        <Button variant="ghost" size="sm" onClick={() => setLoeschen(true)}>
          Löschen
        </Button>
      </div>
      <fieldset className={styles.bereiche}>
        <legend>Bereiche der Rolle</legend>
        {BEREICHE.map((b) => (
          <label key={b.key} className={styles.check}>
            <input type="checkbox" checked={rolle.bereiche.includes(b.key)} onChange={(e) => umschalten(b.key, e.target.checked)} />
            {b.label}
          </label>
        ))}
      </fieldset>
      <label className={styles.check}>
        <input type="checkbox" checked={rolle.darfTeilen ?? false} onChange={(e) => void onSpeichern({ ...rolle, darfTeilen: e.target.checked })} />
        Darf teilen und Aufgaben übergeben (nur im Freigabe-Kreis)
      </label>
      {loeschen && (
        <ConfirmDialog
          offen
          titel="Rolle löschen?"
          bestaetigenLabel="Rolle löschen"
          gefahr
          onAbbrechen={() => setLoeschen(false)}
          onBestaetigen={() => {
            setLoeschen(false)
            void onLoeschen(rolle)
          }}
        >
          <p>Nutzer mit der Rolle „{rolle.name}“ sehen danach nur noch ihre einzeln freigegebenen Bereiche.</p>
        </ConfirmDialog>
      )}
    </article>
  )
}
