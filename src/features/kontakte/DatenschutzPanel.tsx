import { Button } from '../../components/ui/Button.tsx'
import { Panel } from '../../components/ui/Panel.tsx'
import { useToast } from '../../components/ui/toastContext.ts'
import { herunterladen } from '../../data/exportImport.ts'
import { useStore } from '../../data/storeContext.ts'
import { formatDatum, toDatum } from '../../domain/dates.ts'
import { RECHTSGRUNDLAGE } from '../../domain/labels.ts'
import { datenauskunft, kontakteZurPruefung, letzteAktivitaet, PRUEFUNG_NACH_MONATEN } from '../../domain/selectors/datenschutz.ts'
import type { Kontakt } from '../../domain/types.ts'
import { useNow } from '../../hooks/useNow.ts'
import styles from './crm.module.css'

function dateiname(name: string, now: Date): string {
  const kurz = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30)
  return `auskunft-${kurz || 'kontakt'}-${toDatum(now)}.txt`
}

/** Zweck, Rechtsgrundlage, Prüfhinweis und Auskunft nach Art. 15 DSGVO für einen Kontakt. */
export function DatenschutzPanel({ kontakt, onBearbeiten }: { kontakt: Kontakt; onBearbeiten: () => void }) {
  const { data } = useStore()
  const { zeige } = useToast()
  const now = useNow()
  const zuPruefen = kontakteZurPruefung(data, now).some((k) => k.id === kontakt.id)

  const auskunft = () => {
    const text = datenauskunft(data, kontakt.id, now)
    if (!text) return
    herunterladen(text, dateiname(kontakt.name, now), 'text/plain;charset=utf-8')
    zeige('Auskunft erstellt')
  }

  return (
    <Panel titel="Datenschutz">
      <dl className={styles.daten}>
        <dt>Rechtsgrundlage</dt>
        <dd>{kontakt.rechtsgrundlage ? RECHTSGRUNDLAGE[kontakt.rechtsgrundlage].label : <strong className={styles.warnText}>Noch nicht festgelegt</strong>}</dd>
        <dt>Zweck</dt>
        <dd>{kontakt.zweck || <strong className={styles.warnText}>Noch nicht festgelegt</strong>}</dd>
        <dt>Letzte Aktivität</dt>
        <dd>{formatDatum(letzteAktivitaet(data, kontakt).slice(0, 10))}</dd>
      </dl>
      {(!kontakt.rechtsgrundlage || !kontakt.zweck) && (
        <p className={styles.folge}>
          Halte fest, warum und wozu du die Daten speicherst.{' '}
          <Button size="sm" variant="ghost" onClick={onBearbeiten}>
            Jetzt ergänzen
          </Button>
        </p>
      )}
      {zuPruefen && (
        <p className={styles.folge} role="status">
          Seit {PRUEFUNG_NACH_MONATEN} Monaten keine Aktivität. Brauchst du die Daten noch? Wenn nicht, lösche den Kontakt.
        </p>
      )}
      <div>
        <Button size="sm" variant="secondary" onClick={auskunft}>
          Auskunft erstellen (Art. 15)
        </Button>
      </div>
      <p className={styles.unter}>Textdatei mit allen gespeicherten Angaben zur Person, unverschlüsselt, weil sie für die Person bestimmt ist.</p>
    </Panel>
  )
}
