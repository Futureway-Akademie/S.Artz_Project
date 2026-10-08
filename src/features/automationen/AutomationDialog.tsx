import { useState } from 'react'
import { Button } from '../../components/ui/Button.tsx'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.tsx'
import { SelectField, TextAreaField, TextField } from '../../components/ui/Field.tsx'
import { FormDialog } from '../../components/ui/FormDialog.tsx'
import { useToast } from '../../components/ui/toastContext.ts'
import { useStore } from '../../data/storeContext.ts'
import { optionen, PLATTFORM } from '../../domain/labels.ts'
import { projekteOhneAutomation, routingAlsText, routingAusText } from '../../domain/selectors/automationen.ts'
import type { AutomationProfil, Projekt } from '../../domain/types.ts'
import { listeAusKomma, listeAusZeilen, useForm, type Fehler } from '../../hooks/useForm.ts'
import styles from './AutomationDialog.module.css'

interface Werte extends Record<string, unknown> {
  projektId: string
  plattform: string
  modell: string
  promptVersion: string
  schwelle: string
  statuswerte: string
  datenquellen: string
  pipeline: string
  routing: string
  routingStatus: string
  logikHinweise: string
}

function validiere(werte: Werte): Fehler<Werte> {
  const fehler: Fehler<Werte> = {}
  if (!werte.projektId) fehler.projektId = 'Bitte ein Projekt wählen.'
  if (werte.schwelle) {
    const zahl = Number(werte.schwelle.replace(',', '.'))
    if (!Number.isFinite(zahl) || zahl < 0 || zahl > 100) fehler.schwelle = 'Bitte eine Zahl zwischen 0 und 100 eingeben.'
  }
  const ohneZiel = routingAusText(werte.routing).find((r) => !r.ziel)
  if (ohneZiel) fehler.routing = `Regel „${ohneZiel.bedingung}“ braucht ein Ziel (Format: Bedingung → Ziel).`
  return fehler
}

interface AutomationDialogProps {
  /** Bestehende Automation eines Projekts bearbeiten; ohne: neue erfassen */
  projekt?: Projekt
  onSchliessen: () => void
}

/** Automationsprofil eines Projekts erfassen, bearbeiten oder entfernen. Die Verbindung bleibt immer „nicht verbunden“. */
export function AutomationDialog({ projekt, onSchliessen }: AutomationDialogProps) {
  const { data, dispatch } = useStore()
  const { zeige } = useToast()
  const [entfernenFragen, setEntfernenFragen] = useState(false)
  const a = projekt?.automation ?? null

  const form = useForm<Werte>(
    {
      projektId: projekt?.id ?? '',
      plattform: a?.plattform ?? 'n8n',
      modell: a?.modell ?? '',
      promptVersion: a?.promptVersion ?? '',
      schwelle: a?.schwelleProzent?.toString() ?? '',
      statuswerte: a?.statuswerte.join(', ') ?? '',
      datenquellen: a?.datenquellen.join(', ') ?? '',
      pipeline: a?.pipeline.join('\n') ?? '',
      routing: a ? routingAlsText(a.routing) : '',
      routingStatus: a?.routingStatus ?? '',
      logikHinweise: a?.logikHinweise.join('\n') ?? '',
    },
    validiere,
  )
  const { werte, setze, fehler } = form

  const speichern = () => {
    const g = form.pruefen()
    if (!g) return
    const automation: AutomationProfil = {
      plattform: g.plattform as AutomationProfil['plattform'],
      modell: g.modell.trim() || null,
      promptVersion: g.promptVersion.trim() || null,
      schwelleProzent: g.schwelle ? Number(g.schwelle.replace(',', '.')) : null,
      statuswerte: listeAusKomma(g.statuswerte),
      datenquellen: listeAusKomma(g.datenquellen),
      pipeline: listeAusZeilen(g.pipeline),
      routing: routingAusText(g.routing),
      routingStatus: (g.routingStatus || null) as AutomationProfil['routingStatus'],
      logikHinweise: listeAusZeilen(g.logikHinweise),
      verbindung: 'nicht_verbunden',
    }
    dispatch({ type: 'aendern', sammlung: 'projekte', id: g.projektId, aenderung: { automation } })
    zeige(projekt ? 'Automation gespeichert' : 'Automation erfasst')
    onSchliessen()
  }

  const projektOptionen = projekt
    ? [{ value: projekt.id, label: projekt.titel }]
    : projekteOhneAutomation(data).map((p) => ({ value: p.id, label: p.titel }))

  return (
    <>
      <FormDialog
        offen
        titel={projekt ? `Automation: ${projekt.titel}` : 'Automation erfassen'}
        geaendert={form.geaendert}
        onSpeichern={speichern}
        onSchliessen={onSchliessen}
        nebenaktion={
          projekt && (
            <Button variant="ghost" onClick={() => setEntfernenFragen(true)}>
              Automation entfernen
            </Button>
          )
        }
      >
        <p className={styles.hinweis}>
          Das Cockpit ist nicht mit n8n, Make.com oder anderen Diensten verbunden. Hier dokumentierst du nur, wie die Automation aufgebaut ist.
        </p>
        <div className={styles.zeile}>
          <SelectField
            label="Projekt"
            required
            value={werte.projektId}
            onChange={(e) => setze('projektId', e.target.value)}
            placeholder={projekt ? undefined : 'Projekt wählen …'}
            options={projektOptionen}
            disabled={Boolean(projekt)}
            error={fehler.projektId}
          />
          <SelectField label="Plattform" required value={werte.plattform} onChange={(e) => setze('plattform', e.target.value)} options={optionen(PLATTFORM)} />
        </div>
        <div className={styles.zeile}>
          <TextField label="Modell" value={werte.modell} onChange={(e) => setze('modell', e.target.value)} />
          <TextField label="Prompt-Version" value={werte.promptVersion} onChange={(e) => setze('promptVersion', e.target.value)} />
        </div>
        <TextField
          label="Schwelle in %"
          inputMode="decimal"
          value={werte.schwelle}
          onChange={(e) => setze('schwelle', e.target.value)}
          error={fehler.schwelle}
        />
        <TextField label="Statuswerte" value={werte.statuswerte} onChange={(e) => setze('statuswerte', e.target.value)} hint="Mit Komma trennen." />
        <TextField label="Datenquellen" value={werte.datenquellen} onChange={(e) => setze('datenquellen', e.target.value)} hint="Mit Komma trennen." />
        <TextAreaField label="Pipeline" value={werte.pipeline} onChange={(e) => setze('pipeline', e.target.value)} rows={3} hint="Ein Schritt pro Zeile, in Reihenfolge." />
        <TextAreaField
          label="Routing-Regeln"
          value={werte.routing}
          onChange={(e) => setze('routing', e.target.value)}
          rows={3}
          hint="Eine Regel pro Zeile: Bedingung → Ziel. „Fallback → Ziel“ markiert die Rückfallregel."
          error={fehler.routing}
        />
        <SelectField
          label="Routing-Stand"
          value={werte.routingStatus}
          onChange={(e) => setze('routingStatus', e.target.value)}
          placeholder="Nicht hinterlegt"
          options={[
            { value: 'geplant', label: 'Geplant' },
            { value: 'umgesetzt', label: 'Umgesetzt' },
          ]}
        />
        <TextAreaField label="Logik-Hinweise" value={werte.logikHinweise} onChange={(e) => setze('logikHinweise', e.target.value)} rows={3} hint="Ein Hinweis pro Zeile." />
      </FormDialog>
      {entfernenFragen && projekt && (
        <ConfirmDialog
          offen
          titel="Automation entfernen?"
          bestaetigenLabel="Automation entfernen"
          gefahr
          onAbbrechen={() => setEntfernenFragen(false)}
          onBestaetigen={() => {
            dispatch({ type: 'aendern', sammlung: 'projekte', id: projekt.id, aenderung: { automation: null } })
            zeige('Automation entfernt')
            onSchliessen()
          }}
        >
          <p>Die Beschreibung der Automation von „{projekt.titel}“ wird gelöscht. Das Projekt selbst bleibt erhalten.</p>
        </ConfirmDialog>
      )}
    </>
  )
}
