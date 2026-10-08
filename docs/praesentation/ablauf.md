# Präsentation am 21.10.2026 – Demo-Ablauf

Dauer: etwa 10–12 Minuten Live-Demo, dazu die Folien in `docs/praesentation/folien.html` (im Browser öffnen, mit den Pfeiltasten blättern, `F` für Vollbild).

## Vorbereitung (am Vortag)

1. **Sicherung:** Einstellungen → „Verschlüsselte Sicherung herunterladen“. Damit sind deine echten Daten geschützt, falls etwas schiefgeht.
2. **Supabase und KI:**
   - eingerichtet nach `docs/supabase-einrichtung.md` und `docs/ki-einrichtung.md`
   - einmal „Anschreiben mit KI“ ausprobieren, damit Login und KI sicher laufen
3. **Zweiter Nutzer für die Mehrbenutzer-Demo:**
   - Im Admin-Bereich (*Nutzer & Rollen*) eine zweite eigene Adresse mit der Rolle **Kunde** einladen, z. B. eine zweite Gmail-Adresse.
   - Die Einladung in einem **zweiten Browserprofil** (oder einem anderen Browser) annehmen und ein Passwort festlegen.
4. **Demo-Daten:** Einstellungen → „Demo für Präsentationen“ → **Demo-Daten hinzufügen**. Nach der Präsentation dort wieder entfernen.
5. **Bildschirm:** Browser-Zoom auf 110–125 %, Benachrichtigungen aus, nur die nötigen Tabs offen.

## Ablauf

| Zeit | Zeigen | Sagen |
|---|---|---|
| 0:00 | **Folien 1–3** | Problem: Arbeit verteilt über viele Tools. Lösung: ein Cockpit, alles verbunden, nichts nach außen. |
| 1:30 | **Entsperren** (Passwort) | Daten liegen nur verschlüsselt im Browser; das Passwort verlässt das Gerät nie. |
| 2:00 | **Arbeitscockpit** | Fokus, Woche, nächste Schritte, Abo-Fristen. Einmal **„Tag mit KI planen“**: Freigabe-Dialog zeigen (genau dieser Text geht raus), senden, Aufgaben in den Fokus übernehmen. |
| 4:00 | **Bewerbungen → „KI-Anwendungsentwicklung“** | Gesamtsicht (Verlauf, Termin, Aufgabe). **„Anschreiben mit KI“** → Entwurf in die Notizen übernehmen. |
| 5:30 | **Kontakte → Lena Brandt** | Empfangene Mail im Verlauf → **„Antwort mit KI“**; **„Zusammenfassen mit KI“** → nächste Aktion übernehmen. |
| 7:00 | **KI-Assistent** | Frage: „Welche Bewerbungen warten auf Antwort?“ – Bereiche wählen, Antwort mit Links zu den Einträgen. |
| 8:00 | **Nutzer & Rollen** | Rolle „Kunde“ zeigen, beim zweiten Nutzer einen Bereich freischalten. |
| 8:30 | **Zweites Browserprofil** | Der Kunde sieht nur seine Bereiche; Direktaufruf eines anderen Bereichs zeigt „Kein Zugriff“. Zurück im Admin: **Sperren** → beim Kunden „Zugang gesperrt“. Wieder entsperren. |
| 10:00 | **Werkzeugkasten** | Masterprompt mit Platzhaltern ausfüllen und kopieren; Modelle & Abos mit Monatskosten. |
| 11:00 | **Folien 5–12** | Datenschutz-Architektur, Qualität (automatische Tests, Barrierefreiheit), Ausblick. |

## Notfallplan

- **Kein Internet:** Das Cockpit läuft lokal weiter. Die KI zeigt dann einen Hinweis statt einer Antwort. Dann den Freigabe-Dialog zeigen und erklären, was gesendet würde.
- **KI antwortet nicht:** Der Dialog meldet „Die KI ist gerade nicht erreichbar“. Weiter mit Werkzeugkasten und Mehrbenutzer.
- **Login klappt nicht:** Die Mehrbenutzer-Demo über die Folie 7 erklären; die Rechte-Logik ist mit automatischen Tests belegt.
- **Nach der Präsentation:** Demo-Daten entfernen (Einstellungen → Demo für Präsentationen).
