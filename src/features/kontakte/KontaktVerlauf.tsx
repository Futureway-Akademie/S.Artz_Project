import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { Button } from '../../components/ui/Button.tsx'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.tsx'
import { DueLabel } from '../../components/ui/DueLabel.tsx'
import { SelectField, TextAreaField, TextField } from '../../components/ui/Field.tsx'
import { Panel } from '../../components/ui/Panel.tsx'
import { EmptyState } from '../../components/ui/States.tsx'
import { useToast } from '../../components/ui/toastContext.ts'
import { useStore } from '../../data/storeContext.ts'
import { formatDatum, heute } from '../../domain/dates.ts'
import { INTERAKTION_ART, optionen } from '../../domain/labels.ts'
import type { Interaktion, Kontakt } from '../../domain/types.ts'
import { useNow } from '../../hooks/useNow.ts'
import styles from './KontaktVerlauf.module.css'

/** Nächste Aktion (Wiedervorlage) eines Kontakts: setzen, ändern, als erledigt entfernen. */
function NaechsteAktion({ kontakt }: { kontakt: Kontakt }) {
  const { dispatch } = useStore()
  const { zeige } = useToast()
  const [bearbeiten, setBearbeiten] = useState(false)
  const [text, setText] = useState(kontakt.naechsteAktion?.text ?? '')
  const [datum, setDatum] = useState(kontakt.naechsteAktion?.faelligAm ?? '')
  const [fehler, setFehler] = useState<string>()

  const speichern = (event: FormEvent) => {
    event.preventDefault()
    if (!text.trim()) {
      setFehler('Bitte beschreibe die nächste Aktion.')
      return
    }
    dispatch({ type: 'aendern', sammlung: 'kontakte', id: kontakt.id, aenderung: { naechsteAktion: { text: text.trim(), faelligAm: datum || null } } })
    zeige('Nächste Aktion gespeichert')
    setFehler(undefined)
    setBearbeiten(false)
  }

  const erledigt = () => {
    dispatch({ type: 'aendern', sammlung: 'kontakte', id: kontakt.id, aenderung: { naechsteAktion: null } })
    zeige('Nächste Aktion erledigt')
    setText('')
    setDatum('')
  }

  if (bearbeiten || !kontakt.naechsteAktion) {
    return (
      <form className={styles.form} onSubmit={speichern} noValidate aria-label="Nächste Aktion festlegen">
        <TextField label="Was ist als Nächstes zu tun?" required value={text} onChange={(e) => setText(e.target.value)} error={fehler} hint="z. B. Nachfassen wegen Gespräch" />
        <TextField label="Wiedervorlage am" type="date" value={datum} onChange={(e) => setDatum(e.target.value)} />
        <div className={styles.knoepfe}>
          <Button type="submit" size="sm">
            Speichern
          </Button>
          {bearbeiten && (
            <Button size="sm" variant="ghost" onClick={() => setBearbeiten(false)}>
              Abbrechen
            </Button>
          )}
        </div>
      </form>
    )
  }

  return (
    <div className={styles.aktion}>
      <p className={styles.aktionText}>{kontakt.naechsteAktion.text}</p>
      <DueLabel faelligAm={kontakt.naechsteAktion.faelligAm} />
      <div className={styles.knoepfe}>
        <Button size="sm" onClick={erledigt}>
          Erledigt
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setBearbeiten(true)}>
          Ändern
        </Button>
      </div>
    </div>
  )
}

/** Kommunikationsverlauf: kurze Einträge mit Art, Datum und optionalem Projektbezug. */
function Verlauf({ kontakt }: { kontakt: Kontakt }) {
  const { data, dispatch } = useStore()
  const { zeige } = useToast()
  const now = useNow()
  const [art, setArt] = useState<Interaktion['art']>('notiz')
  const [datum, setDatum] = useState(() => heute(now))
  const [text, setText] = useState('')
  const [projektId, setProjektId] = useState('')
  const [fehler, setFehler] = useState<string>()
  const [loeschen, setLoeschen] = useState<Interaktion | null>(null)

  const eintraege = data.interaktionen
    .filter((i) => i.kontaktId === kontakt.id)
    .sort((a, b) => b.datum.localeCompare(a.datum) || b.erstelltAm.localeCompare(a.erstelltAm))

  const hinzufuegen = (event: FormEvent) => {
    event.preventDefault()
    if (!text.trim()) {
      setFehler('Bitte kurz festhalten, worum es ging.')
      return
    }
    dispatch({ type: 'anlegen', sammlung: 'interaktionen', daten: { kontaktId: kontakt.id, art, datum, text: text.trim(), projektId: projektId || null } })
    zeige('Verlaufseintrag hinzugefügt')
    setText('')
    setFehler(undefined)
  }

  return (
    <>
      <form className={styles.form} onSubmit={hinzufuegen} noValidate aria-label="Verlaufseintrag hinzufügen">
        <div className={styles.zeile}>
          <SelectField label="Art" required value={art} onChange={(e) => setArt(e.target.value as Interaktion['art'])} options={optionen(INTERAKTION_ART)} />
          <TextField label="Datum" type="date" required value={datum} onChange={(e) => setDatum(e.target.value)} />
        </div>
        <TextAreaField label="Inhalt" required value={text} onChange={(e) => setText(e.target.value)} rows={2} error={fehler} hint="1–3 Sätze genügen." />
        <SelectField
          label="Projekt"
          value={projektId}
          onChange={(e) => setProjektId(e.target.value)}
          placeholder="Kein Projektbezug"
          options={data.projekte.map((p) => ({ value: p.id, label: p.titel }))}
        />
        <div>
          <Button type="submit" size="sm">
            Eintrag hinzufügen
          </Button>
        </div>
      </form>

      {eintraege.length === 0 ? (
        <EmptyState title="Noch kein Verlauf">Halte Telefonate, E-Mails und Treffen in ein, zwei Sätzen fest.</EmptyState>
      ) : (
        <ol className={styles.verlauf} aria-label="Verlauf">
          {eintraege.map((i) => {
            const projekt = data.projekte.find((p) => p.id === i.projektId)
            return (
              <li key={i.id} className={styles.eintrag}>
                <div className={styles.eintragKopf}>
                  <span className="label">
                    {INTERAKTION_ART[i.art]} · {formatDatum(i.datum)}
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => setLoeschen(i)} aria-label={`Verlaufseintrag vom ${formatDatum(i.datum)} löschen`}>
                    Löschen
                  </Button>
                </div>
                <p className={styles.text}>{i.text}</p>
                {projekt && (
                  <Link to={`/projekte/${projekt.id}`} className={styles.projekt}>
                    {projekt.titel}
                  </Link>
                )}
              </li>
            )
          })}
        </ol>
      )}

      {loeschen && (
        <ConfirmDialog
          offen
          titel="Verlaufseintrag löschen?"
          bestaetigenLabel="Eintrag löschen"
          gefahr
          onAbbrechen={() => setLoeschen(null)}
          onBestaetigen={() => {
            dispatch({ type: 'loeschen', sammlung: 'interaktionen', id: loeschen.id })
            zeige('Verlaufseintrag gelöscht')
            setLoeschen(null)
          }}
        >
          <p>Der Eintrag vom {formatDatum(loeschen.datum)} wird endgültig gelöscht.</p>
        </ConfirmDialog>
      )}
    </>
  )
}

/** Projektbezug: Kontakte lassen sich Projekten zuordnen. */
function Projekte({ kontakt }: { kontakt: Kontakt }) {
  const { data, dispatch } = useStore()
  const { zeige } = useToast()

  const umschalten = (projektId: string, an: boolean) => {
    const projektIds = an ? [...kontakt.projektIds, projektId] : kontakt.projektIds.filter((p) => p !== projektId)
    dispatch({ type: 'aendern', sammlung: 'kontakte', id: kontakt.id, aenderung: { projektIds } })
    zeige(an ? 'Projekt zugeordnet' : 'Projektzuordnung entfernt')
  }

  if (data.projekte.length === 0) return <p className={styles.leer}>Es gibt noch keine Projekte.</p>

  return (
    <fieldset className={styles.projekte}>
      <legend className="visually-hidden">Projekte dieses Kontakts</legend>
      {[...data.projekte]
        .sort((a, b) => a.titel.localeCompare(b.titel, 'de'))
        .map((p) => (
          <label key={p.id} className={styles.check}>
            <input type="checkbox" checked={kontakt.projektIds.includes(p.id)} onChange={(e) => umschalten(p.id, e.target.checked)} />
            {p.titel}
          </label>
        ))}
    </fieldset>
  )
}

export function KontaktVerlauf({ kontakt }: { kontakt: Kontakt }) {
  return (
    <>
      <Panel titel="Nächste Aktion">
        <NaechsteAktion key={JSON.stringify(kontakt.naechsteAktion)} kontakt={kontakt} />
      </Panel>
      <Panel titel="Verlauf">
        <Verlauf kontakt={kontakt} />
      </Panel>
      <Panel titel={`Projekte (${kontakt.projektIds.length})`}>
        <Projekte kontakt={kontakt} />
      </Panel>
    </>
  )
}
