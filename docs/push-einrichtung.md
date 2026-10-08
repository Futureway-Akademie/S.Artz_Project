# Erinnerungen per Push einrichten

Einmal am Tag zur gewählten Uhrzeit erscheint auf dem Handy oder PC der Hinweis **„Guten Morgen! Schau, was heute ansteht.“**

Mehr Inhalt gibt es bewusst nicht: Deine Daten sind Ende-zu-Ende-verschlüsselt, der Server kennt also weder Fristen noch Termine. Push-Nachrichten laufen außerdem technisch über Apple bzw. Google.

## Voraussetzungen

- Supabase ist eingerichtet (`docs/supabase-einrichtung.md`).
- Das Cockpit läuft über **https** (task-18-1) und ist als App installiert. Auf dem iPhone geht Push nur für installierte Web-Apps (iOS 16.4 oder neuer).

## Schritte

1. **VAPID-Schlüssel erzeugen** (einmalig, auf dem eigenen Rechner):
   ```
   npx web-push generate-vapid-keys
   ```
   Den **privaten** Schlüssel sofort im Passwortmanager speichern.
2. **Öffentlichen Schlüssel eintragen** in `.env.local`:
   ```
   VITE_VAPID_PUBLIC_KEY=…
   ```
   Der öffentliche Schlüssel ist kein Geheimnis.
3. **Secrets bei Supabase setzen:**
   ```
   supabase secrets set VAPID_PUBLIC_KEY=… VAPID_PRIVATE_KEY=… VAPID_KONTAKT=mailto:deine@adresse CRON_GEHEIMNIS=…
   ```
   `CRON_GEHEIMNIS` ist eine lange Zufallsfolge, z. B. aus dem Passwortmanager.
4. **Funktion bereitstellen:** `supabase functions deploy erinnern --no-verify-jwt`. Geschützt ist sie über das Cron-Geheimnis statt über eine Anmeldung.
5. **Stündlich auslösen:** *Integrations → Cron* → neuer Job „Erinnerungen“
   - Zeitplan `5 * * * *`, also jede Stunde zur Minute 5
   - Typ **Supabase Edge Function** `erinnern`
   - Header `x-cron-geheimnis` = dein Cron-Geheimnis
6. **Einschalten:** in der App *Einstellungen → Erinnerungen aufs Handy* Uhrzeit wählen und **Erinnerung einschalten**. Der Browser fragt nach der Erlaubnis für Benachrichtigungen.

## Datenschutz

Gespeichert wird nur das Push-Abo des Geräts (Adresse des Push-Dienstes und dessen Schlüssel) und die gewählte Stunde. Abgelaufene Abos löscht die Funktion automatisch.
