import type { KiAufgabe } from '../../supabase/functions/_gemeinsam/ki.ts'
import type { KiAntwort } from '../data/cloud/cloud.ts'
import { darf } from '../domain/bereiche.ts'
import { useCloud, useRechte } from './cloudContext.ts'

export interface KiZugang {
  verfuegbar: boolean
  /** Warum der Assistent nicht verfügbar ist (für einen Hinweis) */
  grund: string | null
  anfragen: (aufgabe: KiAufgabe, eingabe: string) => Promise<KiAntwort>
}

/** KI-Assistent: nur mit Supabase, Anmeldung und dem Bereich „ki“. */
export function useKi(): KiZugang {
  const cloud = useCloud()
  const rechte = useRechte()
  const grund = !cloud?.konfiguriert
    ? 'Der KI-Assistent braucht die Einrichtung von Supabase und der KI-Funktion.'
    : !cloud.nutzer
      ? 'Bitte melde dich an (Einstellungen → Konto), um den KI-Assistenten zu nutzen.'
      : !darf(rechte, 'ki')
        ? 'Der KI-Assistent ist für dich nicht freigegeben.'
        : null
  return {
    verfuegbar: grund === null,
    grund,
    anfragen: (aufgabe, eingabe) => {
      if (!cloud || grund) return Promise.reject(new Error(grund ?? 'Nicht verfügbar.'))
      return cloud.dienst.ki(aufgabe, eingabe)
    },
  }
}
