import { fristStatus, relativeDueLabel, type FristStatus } from '../../domain/dates.ts'
import { useNow } from '../../hooks/useNow.ts'
import { Badge, type BadgeTone } from './Badge.tsx'

const TON: Record<FristStatus, BadgeTone> = {
  ohne: 'neutral',
  ueberfaellig: 'danger',
  heute: 'warning',
  bald: 'blue',
  spaeter: 'neutral',
}

/** Frist relativ zum Gerätedatum, z. B. „Heute fällig“ oder „Noch keine Frist hinterlegt“. */
export function DueLabel({ faelligAm }: { faelligAm: string | null }) {
  const now = useNow()
  return <Badge tone={TON[fristStatus(faelligAm, now)]}>{relativeDueLabel(faelligAm, now)}</Badge>
}
