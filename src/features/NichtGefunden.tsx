import { Link } from 'react-router'
import { Seite } from '../components/layout/Seite.tsx'
import { EmptyState } from '../components/ui/States.tsx'

export function NichtGefunden() {
  return (
    <Seite titel="Seite nicht gefunden">
      <EmptyState title="Diese Adresse gibt es nicht." action={<Link to="/">Zum Arbeitscockpit</Link>}>
        Wähle einen Bereich in der Navigation.
      </EmptyState>
    </Seite>
  )
}
