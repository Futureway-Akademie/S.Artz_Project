import type { Vorlage } from '../domain/types.ts'

type VorlagenDaten = Omit<Vorlage, 'erstelltAm' | 'geaendertAm'>

/** Neutrale Startvorlagen (keine persönlichen Daten); Platzhalter siehe `PLATZHALTER` in domain/selectors/vorlagen.ts. */
export const STANDARD_VORLAGEN: VorlagenDaten[] = [
  {
    id: 'vorlage-nachfassen-bewerbung',
    titel: 'Nachfassen zur Bewerbung',
    betreff: 'Meine Bewerbung als {{stelle}}',
    text: 'Hallo {{name}},\n\nich habe mich vor einiger Zeit als {{stelle}} bei {{unternehmen}} beworben und wollte kurz nachfragen, wie der aktuelle Stand ist.\n\nÜber eine kurze Rückmeldung freue ich mich.\n\nViele Grüße\n{{absender}}',
  },
  {
    id: 'vorlage-dank-gespraech',
    titel: 'Dank nach dem Gespräch',
    betreff: 'Vielen Dank für das Gespräch',
    text: 'Hallo {{name}},\n\nvielen Dank für das angenehme Gespräch. Ich habe einen guten Eindruck von {{unternehmen}} gewonnen und bin weiterhin sehr interessiert.\n\nViele Grüße\n{{absender}}',
  },
  {
    id: 'vorlage-erstkontakt',
    titel: 'Erstkontakt',
    betreff: 'Kurze Vorstellung',
    text: 'Hallo {{name}},\n\nwir hatten uns kurz kennengelernt. Gerne würde ich mich mit dir bzw. Ihnen zu einer möglichen Zusammenarbeit austauschen.\n\nViele Grüße\n{{absender}}',
  },
]

export function standardVorlagen(zeit: string): Vorlage[] {
  return STANDARD_VORLAGEN.map((v) => ({ ...v, erstelltAm: zeit, geaendertAm: zeit }))
}
