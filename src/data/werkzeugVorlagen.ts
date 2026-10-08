import { leeresWerkzeug } from '../domain/selectors/werkzeug.ts'
import type { Neu, Werkzeug, WerkzeugTyp } from '../domain/types.ts'

/**
 * Neutrale Startvorlagen für den Werkzeugkasten – allgemein nützlich, ohne persönliche Inhalte.
 * Werden nur auf Wunsch übernommen und lassen sich danach frei anpassen.
 */
type Vorlage = Partial<Omit<Werkzeug, 'id' | 'erstelltAm' | 'geaendertAm' | 'typ' | 'titel'>> & { typ: WerkzeugTyp; titel: string }

const schritte = (...texte: string[]) => texte.map((text) => ({ text, erledigt: false }))

const VORLAGEN: Vorlage[] = [
  // Masterprompts
  {
    typ: 'prompt',
    titel: 'Masterprompt-Gerüst (Rolle, Ziel, Format)',
    beschreibung: 'Grundgerüst für neue Masterprompts',
    plattform: 'Claude',
    version: 'v1',
    inhalt:
      'Du bist {{Rolle}}.\n\nZiel: {{Ziel}}\n\nKontext:\n{{Kontext}}\n\nVorgehen:\n1. Kläre offene Fragen, bevor du loslegst.\n2. Arbeite Schritt für Schritt.\n3. Prüfe dein Ergebnis gegen das Ziel.\n\nAusgabeformat: {{Format}}\nTon: {{Ton}}',
    schlagworte: ['Vorlage'],
  },
  {
    typ: 'prompt',
    titel: 'Text zusammenfassen',
    beschreibung: 'Lange Texte, Mails oder Artikel auf das Wesentliche bringen',
    plattform: 'Claude',
    inhalt: 'Fasse den folgenden Text in {{Anzahl}} Stichpunkten zusammen. Zielgruppe: {{Zielgruppe}}. Nenne am Ende die wichtigste offene Frage.\n\nText:\n{{Text}}',
    schlagworte: ['Alltag'],
  },
  {
    typ: 'prompt',
    titel: 'Anschreiben für eine Bewerbung',
    beschreibung: 'Erster Entwurf eines Anschreibens aus Stellenanzeige und eigenen Stärken',
    plattform: 'Claude',
    inhalt:
      'Schreibe ein Anschreiben (max. 1 Seite, Deutsch, Sie-Form) für die Stelle „{{Stelle}}“ bei {{Unternehmen}}.\n\nAnforderungen aus der Anzeige:\n{{Anforderungen}}\n\nMeine passenden Erfahrungen und Stärken:\n{{Stärken}}\n\nVermeide Floskeln, nenne konkrete Beispiele und schließe mit einem klaren nächsten Schritt.',
    schlagworte: ['Bewerbung'],
  },
  {
    typ: 'prompt',
    titel: 'Klassifizieren mit Begründung (für Automationen)',
    beschreibung: 'Eingehende Anfragen einer Kategorie zuordnen, maschinenlesbar',
    plattform: 'Claude',
    inhalt:
      'Ordne die folgende Anfrage genau einer Kategorie zu: {{Kategorien}}.\nAntworte nur mit JSON im Format {"kategorie": "...", "sicherheit": 0-100, "begruendung": "ein Satz"}.\nWenn keine Kategorie passt, nutze "sonstiges".\n\nAnfrage:\n{{Anfrage}}',
    schlagworte: ['Automation', 'n8n'],
  },
  {
    typ: 'prompt',
    titel: 'Code-Review',
    beschreibung: 'Änderungen auf Fehler, Sicherheit und Lesbarkeit prüfen lassen',
    plattform: 'Claude Code',
    inhalt: 'Prüfe die Änderungen in {{Datei oder Zweig}} auf Fehler, Sicherheitsprobleme und unnötige Komplexität. Nenne jeden Fund mit Datei, Zeile, Auswirkung und Vorschlag. Sortiere nach Schwere.',
    schlagworte: ['Entwicklung'],
  },
  // Befehle
  { typ: 'befehl', titel: 'Projekt lokal starten', plattform: 'Terminal', inhalt: 'npm run dev', beschreibung: 'Entwicklungsserver starten (Vite)' },
  { typ: 'befehl', titel: 'Alle Prüfungen', plattform: 'Terminal', inhalt: 'npm run typecheck && npm run lint && npm test', beschreibung: 'Vor jedem Commit' },
  { typ: 'befehl', titel: 'Neuen Zweig anlegen', plattform: 'Git', inhalt: 'git switch -c {{Name}}', beschreibung: 'Für jede neue Aufgabe ein eigener Zweig' },
  { typ: 'befehl', titel: 'Änderungen hochladen', plattform: 'Git', inhalt: 'git add -A && git commit -m "{{Nachricht}}" && git push', beschreibung: 'Speichern und zu GitHub hochladen' },
  { typ: 'befehl', titel: 'Claude Code starten', plattform: 'Claude Code', inhalt: 'claude', beschreibung: 'Im Projektordner ausführen' },
  { typ: 'befehl', titel: 'Projektanweisungen anlegen', plattform: 'Claude Code', inhalt: '/init', beschreibung: 'Erzeugt eine CLAUDE.md mit Projektwissen' },
  // Agent und Skill
  {
    typ: 'agent',
    titel: 'Recherche-Agent für Unternehmen',
    beschreibung: 'Vor Bewerbungen oder Erstgesprächen ein Unternehmen kurz einordnen',
    plattform: 'Claude Projects',
    ausloeser: 'Vor einer Bewerbung oder einem Erstgespräch',
    inhalt:
      'Du recherchierst Unternehmen für ein Erstgespräch. Liefere: Geschäftsmodell in 2 Sätzen, Produkte, Größe, aktuelle Themen, mögliche Gesprächsaufhänger und drei kluge Fragen. Kennzeichne Unsicheres deutlich. Erfinde nichts.',
  },
  {
    typ: 'skill',
    titel: 'Review vor dem Commit',
    beschreibung: 'Kurzer Qualitätscheck der eigenen Änderungen',
    plattform: 'Claude Code',
    ausloeser: '/review',
    inhalt: 'Prüft die aktuellen Änderungen auf Fehler, fehlende Tests und Datenschutzprobleme und schlägt Korrekturen vor.',
  },
  // Anleitungen
  {
    typ: 'anleitung',
    titel: 'MCP-Server in Claude Code einrichten',
    plattform: 'MCP-Server',
    link: 'https://docs.anthropic.com/en/docs/claude-code/mcp',
    inhalt: 'Zugangsdaten nie in Dateien im Repository ablegen, sondern im Passwortmanager.',
    schritte: schritte(
      'Doku des MCP-Servers lesen: Was darf er, welche Daten sieht er?',
      'Server hinzufügen: claude mcp add …',
      'Prüfen: claude mcp list',
      'In Claude Code testen und Berechtigungen bewusst erlauben',
      'Als Integration im Werkzeugkasten erfassen (Ablageort der Zugangsdaten, Region, AVV)',
    ),
  },
  {
    typ: 'anleitung',
    titel: 'Supabase-Projekt anlegen',
    plattform: 'Supabase',
    link: 'https://supabase.com/dashboard',
    inhalt: 'Ausführlich: docs/supabase-einrichtung.md im Projekt.',
    schritte: schritte(
      'Projekt anlegen, Region Central EU (Frankfurt)',
      'Datenbank-Passwort im Passwortmanager speichern',
      'Tabellen per SQL Editor anlegen',
      'Login per E-Mail-Link erlauben, Rücksprung-Adressen eintragen',
      'Werte in .env.local eintragen, nie den service_role-Key',
      'Auftragsverarbeitungsvertrag (DPA) abschließen',
    ),
  },
  {
    typ: 'anleitung',
    titel: 'App mit Lovable bauen und zu GitHub bringen',
    plattform: 'Lovable',
    schritte: schritte(
      'Idee als klaren Prompt formulieren (Ziel, Nutzer, Seiten, Daten)',
      'In Lovable erste Version erzeugen und durchklicken',
      'Mit GitHub verbinden und Repository anlegen',
      'Lokal klonen und mit Claude Code weiterentwickeln',
    ),
  },
  // Integrationen
  { typ: 'integration', titel: 'Supabase (Datenbank und Login)', plattform: 'Supabase', integration: { art: 'api', schluesselOrt: '', region: 'EU (Frankfurt)', avv: null } },
  { typ: 'integration', titel: 'Gmail (nur lesen)', plattform: 'Google', integration: { art: 'api', schluesselOrt: '', region: '', avv: 'nicht_noetig' } },
  { typ: 'integration', titel: 'Claude über AWS Bedrock', plattform: 'Amazon Web Services', integration: { art: 'api', schluesselOrt: '', region: 'EU (Frankfurt)', avv: null } },
  // Workflow
  {
    typ: 'workflow',
    titel: 'Kontaktanfragen automatisch einordnen',
    plattform: 'n8n',
    ausloeser: 'Webhook bei neuer Formular-Anfrage',
    schritte: schritte('Webhook empfängt die Anfrage', 'KI ordnet die Anfrage ein (Masterprompt „Klassifizieren“)', 'Weiche nach Kategorie', 'Antwort oder Weiterleitung an die passende Stelle'),
  },
  // Modelle & Abos – Beträge selbst eintragen, Preise ändern sich
  { typ: 'abo', titel: 'Claude Pro', plattform: 'Anthropic', abo: { kostenEur: null, intervall: 'monatlich', naechsteVerlaengerung: null, kuendigungsfristTage: null } },
  { typ: 'abo', titel: 'Lovable', plattform: 'Lovable', abo: { kostenEur: null, intervall: 'monatlich', naechsteVerlaengerung: null, kuendigungsfristTage: null } },
  { typ: 'abo', titel: 'Supabase (Free)', plattform: 'Supabase', abo: { kostenEur: null, intervall: 'kostenlos', naechsteVerlaengerung: null, kuendigungsfristTage: null } },
  { typ: 'abo', titel: 'GitHub (Free)', plattform: 'GitHub', abo: { kostenEur: null, intervall: 'kostenlos', naechsteVerlaengerung: null, kuendigungsfristTage: null } },
]

/** Alle Startvorlagen als neue Werkzeug-Einträge */
export function werkzeugVorlagen(): Array<Neu<'werkzeug'>> {
  return VORLAGEN.map((v) => ({ ...leeresWerkzeug(v.typ), ...v }))
}

/** Schlüssel zum Erkennen bereits übernommener Vorlagen */
export const vorlagenSchluessel = (w: Pick<Werkzeug, 'typ' | 'titel'>) => `${w.typ}:${w.titel.trim().toLowerCase()}`
