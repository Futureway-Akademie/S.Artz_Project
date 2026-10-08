import { Button } from '../../components/ui/Button.tsx'
import { useToast } from '../../components/ui/toastContext.ts'
import { useStore } from '../../data/storeContext.ts'
import type { Aufgabe } from '../../domain/types.ts'

/** Aufgabe in den Tagesfokus nehmen oder herausnehmen; der Zustand ist für Screenreader als „gedrückt“ erkennbar. */
export function FokusKnopf({ aufgabe }: { aufgabe: Aufgabe }) {
  const { dispatch } = useStore()
  const { zeige } = useToast()
  return (
    <Button
      size="sm"
      variant={aufgabe.fokus ? 'secondary' : 'ghost'}
      aria-pressed={aufgabe.fokus}
      aria-label={`„${aufgabe.titel}“ im Fokus`}
      onClick={() => {
        dispatch({ type: 'aendern', sammlung: 'aufgaben', id: aufgabe.id, aenderung: { fokus: !aufgabe.fokus } })
        zeige(aufgabe.fokus ? 'Aus dem Fokus genommen' : 'In den Fokus genommen')
      }}
    >
      {aufgabe.fokus ? '★ Fokus' : '☆ Fokus'}
    </Button>
  )
}
