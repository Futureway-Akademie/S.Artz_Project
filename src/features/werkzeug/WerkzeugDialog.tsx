import { useId, useState } from 'react'
import { Button } from '../../components/ui/Button.tsx'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.tsx'
import { SelectField, TextAreaField, TextField } from '../../components/ui/Field.tsx'
import { FormDialog } from '../../components/ui/FormDialog.tsx'
import { useToast } from '../../components/ui/toastContext.ts'
import { useStore } from '../../data/storeContext.ts'
import { loeschfolgen } from '../../data/reducer.ts'
import { AVV_STATUS, geheimnisVerdacht, INTEGRATION_ART, leeresWerkzeug, schritteAusText, WERKZEUG_STATUS, WERKZEUG_TYP, werkzeugPlattformen } from '../../domain/selectors/werkzeug.ts'
import type { Werkzeug, WerkzeugTyp } from '../../domain/types.ts'
import { listeAusKomma, useForm, type Fehler } from '../../hooks/useForm.ts'
import styles from '../aufgaben/AufgabeDialog.module.css'
import ws from './Werkzeug.module.css'

interface Werte extends Record<string, unknown> {
  titel: string
  beschreibung: string
  plattform: string
  status: string
  inhalt: string
  version: string
  link: string
  schlagworte: string
  projektIds: string[]
  ausloeser: string
  schritte: string
  werkzeugIds: string[]
  art: string
  schluesselOrt: string
  region: string
  avv: string
  /** Bestätigt: Der verdächtige Text ist kein Schlüssel */
  keinGeheimnis: boolean
}

/** Alle frei eingegebenen Texte – darin darf kein Schlüssel und kein Passwort landen. */
const freitexte = (w: Werte) => [w.titel, w.beschreibung, w.plattform, w.inhalt, w.version, w.link, w.schlagworte, w.ausloeser, w.schritte, w.schluesselOrt, w.region]

function verdachtIn(werte: Werte): string | null {
  for (const t of freitexte(werte)) {
    const v = geheimnisVerdacht(t)
    if (v) return v
  }
  return null
}

function validiere(werte: Werte): Fehler<Werte> {
  const fehler: Fehler<Werte> = {}
  if (!werte.titel.trim()) fehler.titel = 'Bitte einen Titel eingeben.'
  if (verdachtIn(werte) && !werte.keinGeheimnis) fehler.keinGeheimnis = 'Bitte den Schlüssel entfernen und nur seinen Ablageort angeben – oder bestätigen, dass es keiner ist.'
  return fehler
}

interface WerkzeugDialogProps {
  typ: WerkzeugTyp
  eintrag?: Werkzeug
  /** Neu angelegt: ID des Eintrags, z. B. um zur Detailseite zu wechseln */
  onAngelegt?: (id: string) => void
  onSchliessen: () => void
  onGeloescht?: () => void
}

function umschalten(liste: string[], id: string, an: boolean): string[] {
  return an ? [...liste, id] : liste.filter((x) => x !== id)
}

/** Werkzeug anlegen oder bearbeiten – Felder und Hinweise passen sich dem Typ an. */
export function WerkzeugDialog({ typ, eintrag, onAngelegt, onSchliessen, onGeloescht }: WerkzeugDialogProps) {
  const { data, dispatch } = useStore()
  const { zeige } = useToast()
  const info = WERKZEUG_TYP[typ]
  const plattformListe = useId()
  const [loeschen, setLoeschen] = useState(false)
  const basis = eintrag ?? { ...leeresWerkzeug(typ), id: '' }
  const form = useForm<Werte>(
    {
      titel: basis.titel,
      beschreibung: basis.beschreibung,
      plattform: basis.plattform,
      status: basis.status,
      inhalt: basis.inhalt,
      version: basis.version,
      link: basis.link,
      schlagworte: basis.schlagworte.join(', '),
      projektIds: basis.projektIds,
      ausloeser: basis.ausloeser,
      schritte: basis.schritte.map((s) => s.text).join('\n'),
      werkzeugIds: basis.werkzeugIds,
      art: basis.integration?.art ?? 'mcp',
      schluesselOrt: basis.integration?.schluesselOrt ?? '',
      region: basis.integration?.region ?? '',
      avv: basis.integration?.avv ?? '',
      keinGeheimnis: false,
    },
    validiere,
  )
  const { werte, setze, fehler } = form
  const verdacht = verdachtIn(werte)
  // Andere Werkzeuge zum Verknüpfen; Integrationen zuerst (Werkzeuge eines Agenten)
  const andere = data.werkzeug
    .filter((w) => w.id !== eintrag?.id)
    .sort((a, b) => Number(b.typ === 'integration') - Number(a.typ === 'integration') || a.typ.localeCompare(b.typ) || a.titel.localeCompare(b.titel, 'de'))

  const speichern = () => {
    const g = form.pruefen()
    if (!g) return
    const daten = {
      titel: g.titel.trim(),
      beschreibung: g.beschreibung.trim(),
      plattform: g.plattform.trim(),
      status: g.status as Werkzeug['status'],
      inhalt: g.inhalt.replace(/\s+$/, ''),
      version: g.version.trim(),
      link: g.link.trim(),
      schlagworte: listeAusKomma(g.schlagworte),
      projektIds: g.projektIds,
      ausloeser: info.ausloeser ? g.ausloeser.trim() : basis.ausloeser,
      schritte: info.schritte ? schritteAusText(g.schritte, basis.schritte) : basis.schritte,
      werkzeugIds: g.werkzeugIds.filter((id) => andere.some((w) => w.id === id)),
      integration:
        typ === 'integration'
          ? {
              art: g.art as NonNullable<Werkzeug['integration']>['art'],
              schluesselOrt: g.schluesselOrt.trim(),
              region: g.region.trim(),
              avv: (g.avv || null) as NonNullable<Werkzeug['integration']>['avv'],
            }
          : basis.integration,
    }
    if (eintrag) {
      dispatch({
        type: 'aendern',
        sammlung: 'werkzeug',
        id: eintrag.id,
        aenderung: daten,
      })
      zeige(`${info.einzahl} gespeichert`)
    } else {
      const id = crypto.randomUUID()
      dispatch({
        type: 'anlegen',
        sammlung: 'werkzeug',
        id,
        daten: { ...leeresWerkzeug(typ), ...daten },
      })
      zeige(`${info.einzahl} angelegt`)
      onAngelegt?.(id)
    }
    onSchliessen()
  }

  const folge = eintrag ? loeschfolgen(data, 'werkzeug', eintrag.id) : null

  return (
    <>
      <FormDialog
        offen
        titel={eintrag ? `${info.einzahl} bearbeiten` : `Neu: ${info.einzahl}`}
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
        <TextField label="Titel" required value={werte.titel} onChange={(e) => setze('titel', e.target.value)} error={fehler.titel} />
        <TextField label="Wofür" value={werte.beschreibung} onChange={(e) => setze('beschreibung', e.target.value)} hint="Ein Satz: Wann setzt du es ein?" />
        <div className={styles.zeile}>
          <TextField label={info.plattform.label} value={werte.plattform} onChange={(e) => setze('plattform', e.target.value)} list={plattformListe} hint={info.plattform.hinweis} />
          <datalist id={plattformListe}>
            {werkzeugPlattformen(data, typ).map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
          <SelectField
            label="Status"
            required
            value={werte.status}
            onChange={(e) => setze('status', e.target.value)}
            options={Object.entries(WERKZEUG_STATUS).map(([value, label]) => ({
              value,
              label,
            }))}
          />
        </div>
        {typ === 'integration' && (
          <fieldset className={styles.gruppe}>
            <legend>Zugang und Datenschutz</legend>
            <div className={styles.zeile}>
              <SelectField label="Art" required value={werte.art} onChange={(e) => setze('art', e.target.value)} options={Object.entries(INTEGRATION_ART).map(([value, label]) => ({ value, label }))} />
              <SelectField
                label="Auftragsverarbeitung (AVV)"
                value={werte.avv}
                onChange={(e) => setze('avv', e.target.value)}
                placeholder="Noch offen"
                options={Object.entries(AVV_STATUS).map(([value, label]) => ({ value, label }))}
              />
            </div>
            <TextField
              label="Ablageort der Zugangsdaten"
              value={werte.schluesselOrt}
              onChange={(e) => setze('schluesselOrt', e.target.value)}
              hint="Nur wo der Schlüssel liegt, z. B. „Passwortmanager › Supabase“ – nie den Schlüssel selbst."
            />
            <TextField label="Region der Daten" value={werte.region} onChange={(e) => setze('region', e.target.value)} hint="z. B. EU (Frankfurt), USA" />
          </fieldset>
        )}
        <TextAreaField
          label={info.inhalt.label}
          value={werte.inhalt}
          onChange={(e) => setze('inhalt', e.target.value)}
          rows={typ === 'befehl' ? 4 : 10}
          hint={info.inhalt.hinweis}
          spellCheck={typ !== 'befehl'}
        />
        {info.ausloeser && <TextField label={info.ausloeser.label} value={werte.ausloeser} onChange={(e) => setze('ausloeser', e.target.value)} hint={info.ausloeser.hinweis} />}
        {info.schritte && <TextAreaField label="Schritte" value={werte.schritte} onChange={(e) => setze('schritte', e.target.value)} rows={6} hint={info.schritte.hinweis} />}
        <div className={styles.zeile}>
          <TextField label="Version" value={werte.version} onChange={(e) => setze('version', e.target.value)} hint="z. B. v2 – mit Beispielen" />
          <TextField label="Link" type="url" value={werte.link} onChange={(e) => setze('link', e.target.value)} hint="Doku oder Quelle" />
        </div>
        <TextField label="Schlagworte" value={werte.schlagworte} onChange={(e) => setze('schlagworte', e.target.value)} hint="Mehrere mit Komma trennen." />
        {verdacht && (
          <div className={ws.warnung} role="alert">
            <p>
              <strong>Achtung: Das sieht aus wie ein {verdacht}.</strong> Zugangsdaten gehören in deinen Passwortmanager. Trag hier nur ein, wo sie liegen.
            </p>
            <label className={styles.check}>
              <input type="checkbox" checked={werte.keinGeheimnis} onChange={(e) => setze('keinGeheimnis', e.target.checked)} aria-describedby={fehler.keinGeheimnis ? `${plattformListe}-geheimnis` : undefined} />
              Ist kein Schlüssel – trotzdem speichern
            </label>
            {fehler.keinGeheimnis && (
              <p id={`${plattformListe}-geheimnis`} className={ws.fehler}>
                {fehler.keinGeheimnis}
              </p>
            )}
          </div>
        )}
        {(data.projekte.length > 0 || andere.length > 0) && (
          <fieldset className={styles.gruppe}>
            <legend>Verknüpfungen</legend>
            {andere.length > 0 && (
              <div className={styles.auswahlListe} role="group" aria-label="Werkzeuge">
                {andere.map((w) => (
                  <label key={w.id} className={styles.check}>
                    <input type="checkbox" checked={werte.werkzeugIds.includes(w.id)} onChange={(e) => setze('werkzeugIds', umschalten(werte.werkzeugIds, w.id, e.target.checked))} />
                    {w.titel} ({WERKZEUG_TYP[w.typ].einzahl})
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
        )}
      </FormDialog>
      {loeschen && eintrag && (
        <ConfirmDialog
          offen
          titel={`${info.einzahl} löschen?`}
          bestaetigenLabel={`${info.einzahl} löschen`}
          gefahr
          onAbbrechen={() => setLoeschen(false)}
          onBestaetigen={() => {
            dispatch({
              type: 'loeschen',
              sammlung: 'werkzeug',
              id: eintrag.id,
            })
            zeige(`${info.einzahl} gelöscht`)
            onSchliessen()
            onGeloescht?.()
          }}
        >
          <p>„{eintrag.titel}“ wird endgültig gelöscht.</p>
          {folge && folge.entknuepft.length > 0 && <p>Die Verknüpfung mit {folge.entknuepft.length} anderen Werkzeugen wird entfernt.</p>}
        </ConfirmDialog>
      )}
    </>
  )
}
