# Supabase einrichten (Login und verschlüsselte Synchronisierung)

Ohne diese Einrichtung arbeitet das Arbeitscockpit nur auf deinem Gerät und hat **keinerlei Verbindung nach außen**. Mit der Einrichtung kannst du dich anmelden und deine Daten Ende-zu-Ende-verschlüsselt zwischen Geräten synchronisieren.

## Was Supabase zu sehen bekommt

| Daten | bei Supabase |
|---|---|
| E-Mail-Adresse (für den Login) | ja |
| Deine Projekte, Kontakte, Wissen … | **nur verschlüsselt**, unlesbar für Supabase |
| Dein Passwort | nein, es verlässt das Gerät nie |
| Wiederherstellungsschlüssel | nein, er steht nur im Link in deiner eigenen Mail |

Die Tabelle lässt per Regel nur verschlüsselte Umschläge zu. Jede Person sieht ausschließlich den eigenen Datensatz (Row Level Security).

## Schritte

1. **Projekt anlegen:**
   - auf [supabase.com](https://supabase.com) ein kostenloses Projekt anlegen
   - **Region: EU (Frankfurt)**
   - ein sicheres Datenbankpasswort vergeben und im Passwortmanager ablegen
2. **Vertrag zur Auftragsverarbeitung (DSGVO):** unter *Organization → Legal Documents* den DPA abschließen.
3. **Tabelle anlegen:** *SQL Editor → New query*, den Inhalt von [`supabase/schema.sql`](../supabase/schema.sql) einfügen und ausführen.
4. **Login per E-Mail-Link erlauben:** *Authentication → Sign In / Providers → Email* aktivieren.
   - „Confirm email“ kann aktiv bleiben.
   - Passwort-Login wird nicht gebraucht.
5. **Rücksprung erlauben:** *Authentication → URL Configuration*
   - **Site URL:** `http://localhost:5173`
   - **Redirect URLs:** `http://localhost:5173/**` (und später die Adresse, unter der die App läuft)
6. **Fremde Anmeldungen verhindern (empfohlen):** Nachdem du dich einmal angemeldet hast, unter *Authentication → Sign In / Providers* „Allow new users to sign up“ ausschalten.
7. **Werte eintragen:**
   - Datei `.env.example` nach `.env.local` kopieren (wird nicht committet).
   - aus *Project Settings → API* eintragen:
     - `VITE_SUPABASE_URL` = Project URL
     - `VITE_SUPABASE_ANON_KEY` = anon public key
   - **Niemals** den `service_role`-Key eintragen.
8. **App neu starten:** `npm run dev`. In den Einstellungen erscheint „Konto und Synchronisierung“ mit Anmeldung.

## Hinweise

- **Begrenzte Mails:** Der eingebaute Mailversand von Supabase ist für wenige Mails pro Stunde gedacht. Für den Eigengebrauch reicht das. Für mehr lässt sich unter *Authentication → SMTP* ein eigener Mailserver eintragen.
- **Konto löschen:** Löschst du dein Konto in Supabase (*Authentication → Users*), wird der verschlüsselte Datensatz automatisch mitgelöscht.

## Mehrbenutzer: Admin, Rollen und Einladungen

Das Schema aus Schritt 3 legt zusätzlich Rollen, Profile und Zugriffsregeln an. Das Skript lässt sich gefahrlos erneut ausführen, z. B. nach einem Update.

1. **Du wirst Admin:** Das **erste Konto**, das sich anmeldet, wird automatisch Admin. Melde dich deshalb als Erste/r an (Schritt 8), bevor du jemanden einlädst.
2. **Selbstregistrierung abschalten:** direkt danach, wie in Schritt 6. Neue Nutzer kommen dann nur noch per Einladung.
3. **Einladungs-Funktion bereitstellen:**
   - mit der [Supabase CLI](https://supabase.com/docs/guides/cli): `supabase functions deploy einladen` (der Code liegt in `supabase/functions/einladen`)
   - Secret setzen: `supabase secrets set ERLAUBTE_URSPRUENGE=http://localhost:5173` (weitere Adressen durch Komma getrennt)
   - Die Funktion prüft, dass nur du als Admin einlädst. Den nötigen Server-Schlüssel stellt Supabase ihr selbst bereit; er steht nie in der App.
4. **Einladungsmail anpassen (optional):** unter *Authentication → Emails → Invite user*, z. B. auf Deutsch.

**Was eingeladene Nutzer sehen:**
- Jeder hat einen **eigenen Tresor** mit eigenem Passwort. Weder du noch Supabase können ihn lesen.
- Welche Bereiche sie sehen, legst du über Rollen und Freigaben im Admin-Bereich fest.
- **Gesperrte** Nutzer kommen nicht mehr an ihre Cloud-Daten.

**Ein Gerät, mehrere Konten:** Für jedes Konto ein eigenes Browserprofil nutzen. Meldet sich auf einem Gerät ein anderes Konto an, gleicht das Cockpit nicht ab und weist darauf hin.
