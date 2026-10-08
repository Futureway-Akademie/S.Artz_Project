import { useState } from 'react'
import { useRechte } from '../../app/cloudContext.ts'
import { darf, type Bereich } from '../../domain/bereiche.ts'
import { matchPath, useLocation, useNavigate } from 'react-router'
import { Button } from '../../components/ui/Button.tsx'
import { Dialog } from '../../components/ui/Dialog.tsx'
import { useStore } from '../../data/storeContext.ts'
import { bezugInfo } from '../../domain/selectors/bezug.ts'
import type { Bezug } from '../../domain/types.ts'
import { AufgabeDialog } from '../aufgaben/AufgabeDialog.tsx'
import { TerminDialog } from '../aufgaben/TerminDialog.tsx'
import { BewerbungDialog } from '../bewerbungen/BewerbungDialog.tsx'
import { KontaktDialog } from '../kontakte/KontaktDialog.tsx'
import { LeadDialog } from '../kontakte/LeadDialog.tsx'
import { UnternehmenDialog } from '../kontakte/UnternehmenDialog.tsx'
import { ProjektDialog } from '../projekte/ProjektDialog.tsx'
import styles from './Suche.module.css'

type Art = 'aufgabe' | 'termin' | 'kontakt' | 'unternehmen' | 'projekt' | 'bewerbung' | 'lead'

const ARTEN: Array<{ art: Art; label: string; bereich: Bereich }> = [
  { art: 'aufgabe', label: 'Aufgabe', bereich: 'aufgaben' },
  { art: 'termin', label: 'Termin', bereich: 'aufgaben' },
  { art: 'kontakt', label: 'Kontakt', bereich: 'kontakte' },
  { art: 'unternehmen', label: 'Unternehmen', bereich: 'kontakte' },
  { art: 'projekt', label: 'Projekt', bereich: 'projekte' },
  { art: 'bewerbung', label: 'Bewerbung', bereich: 'bewerbungen' },
  { art: 'lead', label: 'Lead', bereich: 'kontakte' },
]

/** Bezug der aktuell geöffneten Detailseite, damit neue Aufgaben und Termine gleich verknüpft sind. */
function bezugAusPfad(pfad: string): Bezug {
  const muster: Array<[string, Bezug['art']]> = [
    ['/projekte/:id', 'projekt'],
    ['/kontakte/unternehmen/:id', 'unternehmen'],
    ['/kontakte/leads/:id', 'lead'],
    ['/kontakte/:id', 'kontakt'],
    ['/bewerbungen/:id', 'bewerbung'],
  ]
  for (const [m, art] of muster) {
    const treffer = matchPath(m, pfad)
    if (treffer?.params.id && !['unternehmen', 'leads', 'zielrollen'].includes(treffer.params.id)) return { art, id: treffer.params.id }
  }
  return { art: 'ohne', id: null }
}

/** „+ Neu“: Auswahl der Art, dann der passende Dialog; auf Detailseiten mit Verknüpfung zum geöffneten Eintrag. */
export function Schnellerfassung({ onSchliessen }: { onSchliessen: () => void }) {
  const { data } = useStore()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [art, setArt] = useState<Art | null>(null)
  const rechte = useRechte()
  const bezug = bezugAusPfad(pathname)
  const info = bezugInfo(data, bezug)
  const vorgabeUnternehmenId = bezug.art === 'unternehmen' ? (bezug.id ?? undefined) : undefined

  if (art === 'aufgabe') return <AufgabeDialog vorgabeBezug={bezug} onSchliessen={onSchliessen} />
  if (art === 'termin') return <TerminDialog vorgabeBezug={bezug} onSchliessen={onSchliessen} />
  if (art === 'kontakt')
    return <KontaktDialog vorgabeUnternehmenId={vorgabeUnternehmenId} onSchliessen={onSchliessen} onAngelegt={(id) => navigate(`/kontakte/${id}`)} />
  if (art === 'unternehmen') return <UnternehmenDialog onSchliessen={onSchliessen} />
  if (art === 'projekt') return <ProjektDialog onSchliessen={onSchliessen} onAngelegt={(id) => navigate(`/projekte/${id}`)} />
  if (art === 'bewerbung') return <BewerbungDialog onSchliessen={onSchliessen} />
  if (art === 'lead') return <LeadDialog onSchliessen={onSchliessen} />

  return (
    <Dialog offen titel="Neu anlegen" breite="sm" onSchliessen={onSchliessen}>
      {info && (
        <p className={styles.status}>
          Aufgaben und Termine werden mit „{info.text}“ verknüpft.
        </p>
      )}
      <ul className={styles.auswahl} aria-label="Was möchtest du anlegen?">
        {ARTEN.filter((a) => darf(rechte, a.bereich)).map((a) => (
          <li key={a.art}>
            <Button variant="secondary" onClick={() => setArt(a.art)}>
              {a.label}
            </Button>
          </li>
        ))}
      </ul>
    </Dialog>
  )
}
