import { useId, useState } from 'react'
import { Button } from '../../components/ui/Button.tsx'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.tsx'
import { SelectField, TextAreaField, TextField } from '../../components/ui/Field.tsx'
import { FormDialog } from '../../components/ui/FormDialog.tsx'
import { useToast } from '../../components/ui/toastContext.ts'
import { useStore } from '../../data/storeContext.ts'
import { heute } from '../../domain/dates.ts'
import { WISSEN_TYP, wissenThemen } from '../../domain/selectors/wissen.ts'
import type { Wissen } from '../../domain/types.ts'
import { listeAusKomma, useForm, type Fehler } from '../../hooks/useForm.ts'
import { useNow } from '../../hooks/useNow.ts'
import styles from '../aufgaben/AufgabeDialog.module.css'

interface Werte extends Record<string, unknown> {
  typ: string
  titel: string
  inhalt: string
  thema: string
  quelle: string
  schlagworte: string
  datum: string
  projektIds: string[]
  kursId: string
  kursAufgabeIds: string[]
}

function validiere(werte: Werte): Fehler<Werte> {
  const fehler: Fehler<Werte> = {}
  if (!werte.titel.trim()) fehler.titel = 'Bitte einen Titel eingeben.'
  if (werte.typ === 'tagebuch' && !werte.datum) fehler.datum = 'Bitte den Kurstag angeben.'
  return fehler
}

interface WissenDialogProps {
  eintrag?: Wissen
  /** Vorbelegung für neue Einträge, z. B. Lerntagebuch für heute oder ein Projekt */
  vorgabe?: Partial<Pick<Wissen, 'typ' | 'datum' | 'titel' | 'kursId'>> & { projektId?: string }
  onSchliessen: () => void
  onGeloescht?: () => void
}

function umschalten(liste: string[], id: string, an: boolean): string[] {
  return an ? [...liste, id] : liste.filter((x) => x !== id)
}

/** Wissenseintrag anlegen oder bearbeiten: Typ, Thema, Inhalt, Quelle, Schlagworte und Verknüpfungen. */
export function WissenDialog({ eintrag, vorgabe = {}, onSchliessen, onGeloescht }: WissenDialogProps) {
  const { data, dispatch } = useStore()
  const { zeige } = useToast()
  const now = useNow()
  const themenListe = useId()
  const [loeschen, setLoeschen] = useState(false)
  const form = useForm<Werte>(
    {
      typ: eintrag?.typ ?? vorgabe.typ ?? 'notiz',
      titel: eintrag?.titel ?? vorgabe.titel ?? '',
      inhalt: eintrag?.inhalt ?? '',
      thema: eintrag?.thema ?? '',
      quelle: eintrag?.quelle ?? '',
      schlagworte: eintrag?.schlagworte.join(', ') ?? '',
      datum: eintrag?.datum ?? vorgabe.datum ?? (vorgabe.typ === 'tagebuch' ? heute(now) : ''),
      projektIds: eintrag?.projektIds ?? (vorgabe.projektId ? [vorgabe.projektId] : []),
      kursId: eintrag?.kursId ?? vorgabe.kursId ?? (vorgabe.typ === 'tagebuch' ? (data.kurse[0]?.id ?? '') : ''),
      kursAufgabeIds: eintrag?.kursAufgabeIds ?? [],
    },
    validiere,
  )
  const { werte, setze, fehler } = form
  const kursAufgaben = data.kursAufgaben.filter((k) => k.kursId === werte.kursId)

  const speichern = () => {
    const g = form.pruefen()
    if (!g) return
    const daten = {
      typ: g.typ as Wissen['typ'],
      titel: g.titel.trim(),
      inhalt: g.inhalt.trim(),
      thema: g.thema.trim(),
      quelle: g.quelle.trim(),
      schlagworte: listeAusKomma(g.schlagworte),
      datum: g.datum || null,
      projektIds: g.projektIds,
      kursId: g.kursId || null,
      kursAufgabeIds: g.kursAufgabeIds.filter((id) => data.kursAufgaben.some((k) => k.id === id && k.kursId === g.kursId)),
    }
    if (eintrag) dispatch({ type: 'aendern', sammlung: 'wissen', id: eintrag.id, aenderung: daten })
    else dispatch({ type: 'anlegen', sammlung: 'wissen', daten })
    zeige(eintrag ? 'Eintrag gespeichert' : 'Eintrag angelegt')
    onSchliessen()
  }

  return (
    <>
      <FormDialog
        offen
        titel={eintrag ? 'Wissen bearbeiten' : 'Wissen festhalten'}
        geaendert={form.geaendert}
        onSpeichern={speichern}
        onSchliessen={onSchliessen}
        nebenaktion={
          eintrag && (
            <Button variant="ghost" onClick={() => setLoeschen(true)}>
              Löschen
            </Button>
          )
        }
      >
        <div className={styles.zeile}>
          <SelectField
            label="Art"
            required
            value={werte.typ}
            onChange={(e) => setze('typ', e.target.value)}
            options={Object.entries(WISSEN_TYP).map(([value, t]) => ({ value, label: t.label }))}
            hint={WISSEN_TYP[werte.typ as Wissen['typ']].hinweis}
          />
          <TextField label="Thema" value={werte.thema} onChange={(e) => setze('thema', e.target.value)} list={themenListe} hint="z. B. Prompting, n8n, Datenschutz" />
          <datalist id={themenListe}>
            {wissenThemen(data).map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>
        <TextField label="Titel" required value={werte.titel} onChange={(e) => setze('titel', e.target.value)} error={fehler.titel} />
        <TextAreaField
          label="Inhalt"
          value={werte.inhalt}
          onChange={(e) => setze('inhalt', e.target.value)}
          rows={10}
          hint={werte.typ === 'prompt' ? 'Den Prompt so einfügen, wie du ihn wiederverwenden willst.' : 'Absätze und Aufzählungen bleiben erhalten.'}
        />
        <div className={styles.zeile}>
          <TextField label="Quelle" value={werte.quelle} onChange={(e) => setze('quelle', e.target.value)} hint="Link oder Herkunft, z. B. Kurstag 12, Buch, Video" />
          <TextField
            label={werte.typ === 'tagebuch' ? 'Kurstag' : 'Datum'}
            type="date"
            required={werte.typ === 'tagebuch'}
            value={werte.datum}
            onChange={(e) => setze('datum', e.target.value)}
            error={fehler.datum}
          />
        </div>
        <TextField label="Schlagworte" value={werte.schlagworte} onChange={(e) => setze('schlagworte', e.target.value)} hint="Mehrere mit Komma trennen." />
        <fieldset className={styles.gruppe}>
          <legend>Verknüpfungen</legend>
          {data.kurse.length > 0 && (
            <SelectField
              label="Weiterbildung"
              value={werte.kursId}
              onChange={(e) => setze('kursId', e.target.value)}
              placeholder="Keine"
              options={data.kurse.map((k) => ({ value: k.id, label: k.titel }))}
            />
          )}
          {kursAufgaben.length > 0 && (
            <div className={styles.auswahlListe} role="group" aria-label="Kursaufgaben">
              {kursAufgaben.map((k) => (
                <label key={k.id} className={styles.check}>
                  <input type="checkbox" checked={werte.kursAufgabeIds.includes(k.id)} onChange={(e) => setze('kursAufgabeIds', umschalten(werte.kursAufgabeIds, k.id, e.target.checked))} />
                  {k.code} {k.titel}
                </label>
              ))}
            </div>
          )}
          {data.projekte.length > 0 && (
            <div className={styles.auswahlListe} role="group" aria-label="Projekte">
              {[...data.projekte]
                .sort((a, b) => a.titel.localeCompare(b.titel, 'de'))
                .map((p) => (
                  <label key={p.id} className={styles.check}>
                    <input type="checkbox" checked={werte.projektIds.includes(p.id)} onChange={(e) => setze('projektIds', umschalten(werte.projektIds, p.id, e.target.checked))} />
                    {p.titel}
                  </label>
                ))}
            </div>
          )}
        </fieldset>
      </FormDialog>
      {loeschen && eintrag && (
        <ConfirmDialog
          offen
          titel="Eintrag löschen?"
          bestaetigenLabel="Eintrag löschen"
          gefahr
          onAbbrechen={() => setLoeschen(false)}
          onBestaetigen={() => {
            dispatch({ type: 'loeschen', sammlung: 'wissen', id: eintrag.id })
            zeige('Eintrag gelöscht')
            onSchliessen()
            onGeloescht?.()
          }}
        >
          <p>„{eintrag.titel}“ wird endgültig gelöscht.</p>
        </ConfirmDialog>
      )}
    </>
  )
}
