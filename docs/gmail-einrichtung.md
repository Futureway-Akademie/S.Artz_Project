# Gmail und Google-Kalender einrichten (nur lesen)

Ohne diese Einrichtung hat das Arbeitscockpit **keine Verbindung zu Google**. Mit ihr kann es Mails von und an deine Kontakte und Unternehmen abrufen. So siehst du z. B. Antworten auf Bewerbungen direkt im Verlauf.

## Was dabei passiert

| | |
|---|---|
| **Berechtigung** | nur `gmail.readonly` und `calendar.readonly`: lesen. Die App kann keine Mails senden und keine Termine anlegen, ändern oder löschen. |
| **Anmeldung** | Weiterleitung zu Google, kein Google-Skript in der App |
| **Zugang (Token)** | liegt nur im Arbeitsspeicher, gilt etwa eine Stunde, ist nach dem Neuladen weg. Er wird nie gespeichert. |
| **Abgerufen wird** | nur Mails von oder an Adressen deiner Kontakte und Domains deiner Unternehmen |
| **Gespeichert wird** | Absender, Empfänger, Betreff, Datum und der kurze Auszug, den Gmail liefert. Alles liegt verschlüsselt im Tresor, ohne Anhänge und ohne Volltext. |
| **Kalender** | Google-Termine werden nur angezeigt (Titel, Zeit, Ort) und nie gespeichert. Termine aus dem Cockpit lassen sich auf Wunsch eintragen: Die Berechtigung dafür (calendar.events) fragt das Cockpit erst beim ersten Eintragen an, jedes Eintragen wird bestätigt. |
| **Verbindungen** | nur `gmail.googleapis.com`, `www.googleapis.com` (Kalender) und `oauth2.googleapis.com` (Widerruf). Die Content-Security-Policy erlaubt nichts sonst. |

## Schritte

1. **Projekt anlegen:** In der [Google Cloud Console](https://console.cloud.google.com/) ein neues Projekt anlegen, z. B. „Arbeitscockpit“.
2. **APIs aktivieren:** *APIs & Dienste → Bibliothek* → **Gmail API** und **Google Calendar API** jeweils aktivieren.
3. **Zustimmungsbildschirm (OAuth consent screen / Google Auth Platform):**
   - Nutzertyp **Extern**, App-Name z. B. „Arbeitscockpit (privat)“
   - als Bereiche (Scopes) `.../auth/gmail.readonly`, `.../auth/calendar.readonly` und – nur wenn du Termine eintragen willst – `.../auth/calendar.events` hinzufügen
   - Veröffentlichungsstatus **Testing** lassen und unter *Testnutzer* die eigene Gmail-Adresse eintragen. So braucht es keine Prüfung durch Google. Bei der Anmeldung erscheint der Hinweis „Google hat diese App nicht überprüft“. Das ist bei eigenen Test-Apps normal: *Weiter* wählen.
4. **Zugangsdaten anlegen:** *APIs & Dienste → Anmeldedaten → Anmeldedaten erstellen → OAuth-Client-ID*
   - Anwendungstyp: **Webanwendung**
   - **Autorisierte JavaScript-Quellen:** `http://localhost:5173` (und später die Adresse, unter der die App läuft)
   - **Autorisierte Weiterleitungs-URIs:** `http://localhost:5173/` (mit Schrägstrich am Ende)
   - Ein Client-Secret wird **nicht** gebraucht und nicht eingetragen.
5. **Client-ID eintragen:** in `.env.local` (wird nicht committet):
   ```
   VITE_GOOGLE_CLIENT_ID=1234567890-abc.apps.googleusercontent.com
   ```
   Die Client-ID ist öffentlich und kein Geheimnis. Sie legt nur fest, welches Google-Projekt um Erlaubnis fragt.
6. **App neu starten:** `npm run dev`. In den Einstellungen erscheint „Gmail (nur lesen)“ mit „Mit Google verbinden“.

## Verbinden und trennen

- **Verbinden:** *Einstellungen → Gmail → Mit Google verbinden*. Nach der Rückkehr ist der Tresor gesperrt (die Seite wurde neu geladen); einfach entsperren.
- **Trennen:** *Einstellungen → Gmail → Trennen* widerruft den Zugang bei Google sofort.
- Zusätzlich lässt sich der Zugriff jederzeit unter [myaccount.google.com/permissions](https://myaccount.google.com/permissions) entziehen.

## Datenschutz

- Die Verarbeitung findet im eigenen Browser statt. Google sieht nur, dass dein Konto die Gmail-API nutzt.
- Abgerufene Mails betreffen Dritte (Absender). Gespeichert wird nur, was zu deinen Kontakten gehört (Datenminimierung). Löschst du einen Kontakt, verschwinden auch seine übernommenen Mails.
