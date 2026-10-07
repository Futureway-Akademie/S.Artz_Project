import { Panel } from '../../components/ui/Panel.tsx'
import type { Kontakt } from '../../domain/types.ts'
import styles from './crm.module.css'

/** Platz für Verlauf, nächste Aktion und Projektbezug (task-3-2). */
export function KontaktVerlauf({ kontakt }: { kontakt: Kontakt }) {
  return (
    <Panel titel="Verlauf">
      <p className={styles.leer}>Verlauf und nächste Aktion für {kontakt.name} folgen.</p>
    </Panel>
  )
}
