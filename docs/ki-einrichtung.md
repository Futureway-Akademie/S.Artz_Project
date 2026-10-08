# KI-Assistent einrichten (Claude über AWS Bedrock, Frankfurt)

Der KI-Assistent nutzt Claude über **Amazon Bedrock in der Region Frankfurt (eu-central-1)**. Das Cockpit spricht nie direkt mit AWS. Es geht über die Supabase-Funktion `ki`, die den Zugang hält, Rechte und Budget prüft und nichts speichert.

## Was passiert mit den Daten?

| | |
|---|---|
| **Gesendet wird** | nur der Text, den du im Freigabe-Dialog siehst und bestätigst |
| **Verarbeitet** | in der EU (Frankfurt); bei einem EU-Inferenzprofil innerhalb von EU-Regionen |
| **Gespeichert** | keine Inhalte; nur die Anzahl verbrauchter Tokens je Nutzer und Monat (für das Budget) |
| **Zugangsdaten** | nur als Secrets bei Supabase, nie im Browser oder im Repository |
| **AVV** | Die DSGVO-Datenverarbeitungsbedingungen von AWS (GDPR DPA) gelten automatisch mit den AWS-Servicebedingungen |

## Schritte

1. **AWS-Konto anlegen** auf [aws.amazon.com](https://aws.amazon.com). Für die Root-Anmeldung die Zwei-Faktor-Anmeldung einschalten.
2. **Region wählen:** oben rechts **Europe (Frankfurt) eu-central-1**.
3. **Claude freischalten:** *Amazon Bedrock → Model access* → die gewünschten Anthropic-Claude-Modelle anfragen.
   - Die Freischaltung kann etwas dauern, deshalb früh erledigen.
   - Notiere die **Modell-ID** bzw. das **EU-Inferenzprofil** (unter *Cross-region inference*, Präfix `eu.`). Das ist später `BEDROCK_MODEL_ID`.
4. **Eigenen Zugang nur für Bedrock anlegen:** *IAM → Users → Create user*, z. B. `arbeitscockpit-ki`, ohne Konsolenzugang.
   - Als Berechtigung eine eigene Richtlinie, die nur `bedrock:InvokeModel` (und für Inferenzprofile `bedrock:InvokeModel` auf das Profil) erlaubt.
   - Dann *Security credentials → Create access key* (Anwendungsfall: Anwendung außerhalb von AWS).
   - Schlüssel-ID und Secret **sofort im Passwortmanager** speichern und nirgends sonst ablegen.
5. **Kostenschutz:** *Billing → Budgets* ein Monatsbudget mit E-Mail-Warnung anlegen, z. B. 10 €. Zusätzlich begrenzt das Cockpit jeden Nutzer (Standard: 300 000 Tokens pro Monat, anpassbar in `profile.ki_limit_tokens`).
6. **Secrets bei Supabase setzen** (mit der Supabase CLI, Werte aus dem Passwortmanager):
   ```
   supabase secrets set AWS_ACCESS_KEY_ID=… AWS_SECRET_ACCESS_KEY=… AWS_REGION=eu-central-1 BEDROCK_MODEL_ID=… ERLAUBTE_URSPRUENGE=http://localhost:5173
   ```
7. **Funktion bereitstellen:** `supabase functions deploy ki`
8. **Freigeben:** Admins haben den KI-Assistenten immer. Anderen Nutzern gibst du im Admin-Bereich (*Nutzer & Rollen*) den Bereich **„KI-Assistent“** frei.

## Kosten

Abgerechnet wird nach Verbrauch über dein AWS-Konto. Das ist getrennt von deinem Claude-Pro-Abo, das keinen API-Zugang enthält. Für die Nutzung durch eine Person sind das meist wenige Euro im Monat; die aktuellen Preise stehen in der Bedrock-Preisübersicht.
