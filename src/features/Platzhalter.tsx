import { Link } from 'react-router'
import { Seite } from '../components/layout/Seite.tsx'
import { EmptyState } from '../components/ui/States.tsx'

interface PlatzhalterProps {
  titel: string
  /** Was der Bereich künftig bietet */
  inhalt: string
}

/** Vorläufige Bereichsseite, bis der jeweilige Task den Bereich umsetzt. */
export function Platzhalter({ titel, inhalt }: PlatzhalterProps) {
  return (
    <Seite titel={titel}>
      <EmptyState title="Dieser Bereich wird gerade aufgebaut">{inhalt}</EmptyState>
    </Seite>
  )
}

export function NichtGefunden() {
  return (
    <Seite titel="Seite nicht gefunden">
      <EmptyState title="Diese Adresse gibt es nicht." action={<Link to="/">Zum Arbeitscockpit</Link>}>
        Wähle einen Bereich in der Navigation.
      </EmptyState>
    </Seite>
  )
}
