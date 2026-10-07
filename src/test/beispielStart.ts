import { createSeedData, type ProjektQuelle, type StartDaten } from '../data/seed.ts'
import type { AppData } from '../domain/types.ts'

/**
 * Fiktive Startdaten für Tests. Echte Startdaten liegen nur lokal in `src/data/seed.privat.ts`.
 * Die Struktur (12 Projekte, ein Kurs, drei Zielrollen) entspricht der lokalen Datei.
 */
export const BEISPIEL_START: StartDaten = {
  anzeigename: 'Alex',
  projekte: [
    { projekt: { id: 'seed-projekt-spiel', titel: 'Lernspiel (Prototyp)', kategorie: 'Privat / Kreativ', status: 'in_arbeit', zuletztAktiv: '2026-10-07' } },
    { projekt: { id: 'seed-projekt-website', titel: 'Portfolio-Website', kategorie: 'Karriere', status: 'in_arbeit', zuletztAktiv: '2026-10-01' } },
    { projekt: { id: 'seed-projekt-flohmarkt', titel: 'Flohmarkt-Verkauf', kategorie: 'Privat', status: 'in_arbeit', zuletztAktiv: '2026-09-18' } },
    { projekt: { id: 'seed-projekt-produktbilder', titel: 'Produktbilder-Generator', kategorie: 'E-Commerce', status: 'in_arbeit', zuletztAktiv: '2026-09-07' } },
    { projekt: { id: 'seed-projekt-lerntagebuch', titel: 'Lerntagebuch', kategorie: 'Weiterbildung', status: 'in_arbeit', zuletztAktiv: '2026-09-07' } },
    { projekt: { id: 'seed-projekt-lebenslauf', titel: 'Lebenslauf überarbeiten', kategorie: 'Karriere', status: 'abgeschlossen', zuletztAktiv: '2026-09-07' } },
    { projekt: { id: 'seed-projekt-netzwerk', titel: 'Netzwerk-Profil', kategorie: 'Karriere', status: 'in_arbeit', zuletztAktiv: '2026-09-07' } },
    { projekt: { id: 'seed-projekt-stellensuche', titel: 'Stellensuche', kategorie: 'Karriere', status: 'in_arbeit', zuletztAktiv: '2026-08-19' } },
    { projekt: { id: 'seed-projekt-ki-skills', titel: 'KI-Skills', kategorie: 'KI-Agenten', status: 'in_arbeit', zuletztAktiv: '2026-08-19' } },
    { projekt: { id: 'seed-projekt-pruef-agent', titel: 'Prüf-Agent (Konzept)', kategorie: 'KI-Agenten', status: 'idee', zuletztAktiv: '2026-08-19' } },
    { projekt: { id: 'seed-projekt-kundenformular', titel: 'Kundenformular', kategorie: 'Kundenprojekt', status: 'in_arbeit', zuletztAktiv: '2026-08-19' } },
    { projekt: { id: 'seed-projekt-vereinsseite', titel: 'Vereinsseite', kategorie: 'Kundenprojekt / Verein', status: 'in_arbeit', zuletztAktiv: '2026-08-19' } },
  ],
  kurse: [
    {
      id: 'seed-kurs-beispiel',
      titel: 'Beispielkurs Automatisierung',
      anbieter: 'Beispiel-Akademie',
      beschreibung: 'Vollzeit online',
      unterrichtszeit: 'Mo–Fr 09:00–16:00',
      umfang: '800 UE',
      module: ['Grundlagen', 'Automatisierung', 'Software', 'Projekt', 'Prüfung', 'Coaching'],
      startMonat: '2026-08',
      endeMonat: '2026-12',
      startDatum: '2026-08-03',
      endeDatum: '2026-12-18',
      arbeitstage: [1, 2, 3, 4, 5],
      codePraefix: 'KURS',
    },
  ],
  zielrollen: ['Datenanalyst', 'Projektkoordinator', 'Mediengestalter'],
}

/** Startdaten mit fiktiven Beispielprojekten; `details` ergänzt Beschreibung, Tools und Schritte je Projekt-ID. */
export function beispielSeed(now: Date = new Date(), details: ProjektQuelle[] = []): AppData {
  const projekte = BEISPIEL_START.projekte.map((quelle) => {
    const detail = details.find((d) => d.projekt.id === quelle.projekt.id)
    return detail ? { projekt: { ...detail.projekt, ...quelle.projekt }, offen: detail.offen, erledigt: detail.erledigt } : quelle
  })
  return createSeedData(now, { ...BEISPIEL_START, projekte })
}
export type { ProjektQuelle }
