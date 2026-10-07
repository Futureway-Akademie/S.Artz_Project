import { useState } from 'react'
import { Link } from 'react-router'
import { useGmailDienst, useGoogle } from '../../app/gmailContext.ts'
import { Seite } from '../../components/layout/Seite.tsx'
import { Badge } from '../../components/ui/Badge.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { SelectField } from '../../components/ui/Field.tsx'
import { EmptyState } from '../../components/ui/States.tsx'
import { useToast } from '../../components/ui/toastContext.ts'
import { anmeldungStarten } from '../../data/gmail/googleAuth.ts'
import { useStore } from '../../data/storeContext.ts'
import { formatDatum, formatZeitpunkt, toDatum } from '../../domain/dates.ts'
import { BEWERBUNG_STATUS } from '../../domain/labels.ts'
import { abrufAb, abrufZiele, adresseAus, kontaktAusMail, postfachNeu } from '../../domain/selectors/postfach.ts'
import type { Mail } from '../../domain/types.ts'
import { useNow } from '../../hooks/useNow.ts'
import { mailsAbrufen } from './abruf.ts'
import styles from './PostfachSeite.module.css'

const NEUER_KONTAKT = '__neu'

/** Postfach: Mails zu Kontakten, Unternehmen und Bewerbungen aus Gmail abrufen und in den Verlauf übernehmen. */
export function PostfachSeite({ onVerbinden = () => anmeldungStarten() }: { onVerbinden?: () => void }) {
  const { data, dispatch } = useStore()
  const google = useGoogle()
  const dienst = useGmailDienst()
  const { zeige } = useToast()
  const now = useNow()
  const [laeuft, setLaeuft] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const neu = postfachNeu(data)
  const ziele = abrufZiele(data)
  const letzter = data.einstellungen.letzterMailAbrufAm

  const abrufen = async () => {
    setLaeuft(true)
    setFehler(null)
    try {
      const ergebnis = await mailsAbrufen(dienst, data, new Date())
      dispatch({ type: 'mailsAbgerufen', mails: ergebnis.mails, abrufAm: ergebnis.abrufAm })
      zeige(ergebnis.mails.length === 0 ? 'Keine neuen Mails' : `${ergebnis.mails.length} neue ${ergebnis.mails.length === 1 ? 'Mail' : 'Mails'} abgerufen`)
    } catch (e) {
      setFehler(e instanceof Error ? e.message : 'Abruf fehlgeschlagen')
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <Seite titel="Postfach" einleitung="Mails von und an deine Kontakte und Unternehmen aus Gmail – nur lesend abgerufen, verschlüsselt gespeichert, mit einem Klick im Verlauf.">
      {!google.konfiguriert ? (
        <EmptyState title="Gmail ist nicht eingerichtet" action={<Link to="/einstellungen">Zu den Einstellungen</Link>}>
          Ohne Einrichtung besteht keine Verbindung zu Google. Wie es geht, steht in docs/gmail-einrichtung.md.
        </EmptyState>
      ) : (
        <section className={styles.abruf} aria-label="Abruf">
          {ziele.adressen.length + ziele.domains.length === 0 ? (
            <p>Noch nichts zum Suchen: Trage bei Kontakten E-Mail-Adressen oder bei Unternehmen die Website ein.</p>
          ) : (
            <p>
              Gesucht wird nach Mails von und an {ziele.adressen.length} {ziele.adressen.length === 1 ? 'Adresse' : 'Adressen'} und {ziele.domains.length}{' '}
              {ziele.domains.length === 1 ? 'Unternehmensdomain' : 'Unternehmensdomains'} seit {formatDatum(abrufAb(data, now))}.
            </p>
          )}
          <p className={styles.leise}>{letzter ? `Letzter Abruf: ${formatZeitpunkt(letzter)}` : 'Noch nie abgerufen.'}</p>
          {google.verbunden ? (
            <Button onClick={abrufen} disabled={laeuft || ziele.adressen.length + ziele.domains.length === 0}>
              {laeuft ? 'Ruft ab …' : 'Mails abrufen'}
            </Button>
          ) : (
            <Button onClick={onVerbinden}>Mit Google verbinden (nur lesen)</Button>
          )}
          {fehler && (
            <p className={styles.fehler} role="alert">
              {fehler}
            </p>
          )}
        </section>
      )}

      <h2 className={styles.ueberschrift}>Neue Mails ({neu.length})</h2>
      {neu.length === 0 ? (
        <p className={styles.leise}>Keine neuen Mails. Übernommene Mails stehen im Verlauf des Kontakts.</p>
      ) : (
        <ul className={styles.liste}>
          {neu.map((m) => (
            <li key={m.id}>
              <MailKarte mail={m} />
            </li>
          ))}
        </ul>
      )}
    </Seite>
  )
}

function MailKarte({ mail }: { mail: Mail }) {
  const { data, dispatch } = useStore()
  const { zeige } = useToast()
  const [kontaktId, setKontaktId] = useState(mail.kontaktId ?? NEUER_KONTAKT)
  const [bewerbungId, setBewerbungId] = useState(mail.bewerbungId ?? '')
  const titelId = `mail-${mail.id}`
  const kontakt = data.kontakte.find((k) => k.id === kontaktId)
  const unternehmen = data.unternehmen.find((u) => u.id === (kontakt?.unternehmenId ?? mail.unternehmenId))
  const gegenueber = mail.richtung === 'eingang' ? mail.von : mail.an.join(', ')

  // Kontakte des Unternehmens zuerst
  const kontakte = [...data.kontakte].sort(
    (a, b) => Number(b.unternehmenId === mail.unternehmenId && mail.unternehmenId !== null) - Number(a.unternehmenId === mail.unternehmenId && mail.unternehmenId !== null) || a.name.localeCompare(b.name, 'de'),
  )
  const neuerKontakt = kontaktId === NEUER_KONTAKT ? kontaktAusMail(data, { ...mail, bewerbungId: bewerbungId || null }) : null

  const uebernehmen = () => {
    const id = neuerKontakt ? crypto.randomUUID() : kontaktId
    dispatch({ type: 'mailUebernehmen', mailId: mail.id, kontaktId: id, bewerbungId: bewerbungId || null, neuerKontakt: neuerKontakt ?? undefined })
    zeige(neuerKontakt ? `Kontakt „${neuerKontakt.name}“ angelegt, Mail im Verlauf` : 'Mail in den Verlauf übernommen')
  }

  const verwerfen = () => {
    dispatch({ type: 'aendern', sammlung: 'mails', id: mail.id, aenderung: { status: 'verworfen', von: '', an: [], betreff: '', auszug: '' } })
    zeige('Mail verworfen – Inhalt gelöscht')
  }

  return (
    <article className={styles.karte} aria-labelledby={titelId}>
      <div className={styles.kopf}>
        <h3 id={titelId} className={styles.betreff}>
          {mail.betreff || '(ohne Betreff)'}
        </h3>
        <Badge tone={mail.richtung === 'eingang' ? 'blue' : 'neutral'}>{mail.richtung === 'eingang' ? 'Eingang' : 'Ausgang'}</Badge>
      </div>
      <p className={styles.leise}>
        {mail.richtung === 'eingang' ? 'Von' : 'An'} {gegenueber} · {formatDatum(toDatum(new Date(mail.zeitpunkt)))}
        {unternehmen && ` · ${unternehmen.name}`}
      </p>
      {mail.auszug && <p className={styles.auszug}>{mail.auszug}</p>}
      <div className={styles.zuordnung}>
        <SelectField
          label="Kontakt"
          optionalKennzeichnen={false}
          value={kontaktId}
          onChange={(e) => setKontaktId(e.target.value)}
          options={[{ value: NEUER_KONTAKT, label: `Neu anlegen: ${neuerKontaktName(mail)}` }, ...kontakte.map((k) => ({ value: k.id, label: k.name }))]}
        />
        <SelectField
          label="Bewerbung"
          optionalKennzeichnen={false}
          value={bewerbungId}
          onChange={(e) => setBewerbungId(e.target.value)}
          placeholder="Keine"
          options={data.bewerbungen.map((b) => ({ value: b.id, label: `${b.stelle} (${BEWERBUNG_STATUS[b.status]})` }))}
        />
      </div>
      <div className={styles.knoepfe}>
        <Button onClick={uebernehmen}>{neuerKontakt ? 'Kontakt anlegen und übernehmen' : 'In den Verlauf übernehmen'}</Button>
        <Button variant="ghost" onClick={verwerfen}>
          Verwerfen
        </Button>
      </div>
    </article>
  )
}

function neuerKontaktName(mail: Mail): string {
  const roh = mail.richtung === 'eingang' ? mail.von : (mail.an[0] ?? '')
  return roh.replace(/<[^>]*>/, '').replace(/"/g, '').trim() || adresseAus(roh)
}
