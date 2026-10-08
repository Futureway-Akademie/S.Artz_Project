import type { ReactNode } from 'react'
import { useRechte } from '../app/cloudContext.ts'
import { darf, type Bereich } from '../domain/bereiche.ts'

/** Zeigt den Inhalt nur, wenn mindestens einer der Bereiche freigegeben ist. */
export function NurMit({ bereich, children }: { bereich: Bereich | Bereich[]; children: ReactNode }) {
  const rechte = useRechte()
  const liste = Array.isArray(bereich) ? bereich : [bereich]
  return liste.some((b) => darf(rechte, b)) ? children : null
}
