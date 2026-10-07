import { Route, Routes } from 'react-router'
import { AppShell } from '../components/layout/AppShell.tsx'
import { EinstellungenSeite } from '../features/einstellungen/EinstellungenSeite.tsx'
import { MarkeSeite } from '../features/marke/MarkeSeite.tsx'
import { NichtGefunden, Platzhalter } from '../features/Platzhalter.tsx'
import { ProjektDetailSeite } from '../features/projekte/ProjektDetailSeite.tsx'
import { ProjekteSeite } from '../features/projekte/ProjekteSeite.tsx'

/** Alle Routen der App. Platzhalter werden durch die Bereichs-Tasks ersetzt. */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route
          index
          element={
            <Platzhalter
              titel="Arbeitscockpit"
              inhalt="Hier siehst du künftig deine Tagesübersicht, nächste Schritte, aktuelle Projekte, die Weiterbildung und die letzten Aktivitäten."
            />
          }
        />
        <Route path="projekte">
          <Route index element={<ProjekteSeite />} />
          <Route path=":id" element={<ProjektDetailSeite />} />
        </Route>
        <Route
          path="automationen"
          element={<Platzhalter titel="Automationen" inhalt="Hier erscheinen künftig deine Automationen nach Plattform und Projekt." />}
        />
        <Route
          path="weiterbildung"
          element={<Platzhalter titel="Weiterbildung" inhalt="Hier begleitest du künftig die Weiterbildung „KI Automations Spezialist“." />}
        />
        <Route path="pikartz-ai" element={<MarkeSeite />} />
        <Route
          path="aufgaben"
          element={<Platzhalter titel="Aufgaben & Termine" inhalt="Hier verwaltest du künftig Aufgaben und Termine mit optionaler Frist und Bezug." />}
        />
        <Route path="kontakte">
          <Route
            index
            element={<Platzhalter titel="Kontakte & Leads" inhalt="Hier pflegst du künftig Kontakte mit Verlauf und nächster Aktion." />}
          />
          <Route path="unternehmen" element={<Platzhalter titel="Unternehmen" inhalt="Hier erscheinen künftig Unternehmen mit verknüpften Kontakten." />} />
          <Route path="leads" element={<Platzhalter titel="Leads" inhalt="Hier verwaltest du künftig optionale Leads rund um PIKARTZ.AI." />} />
          <Route path=":id" element={<Platzhalter titel="Kontakt" inhalt="Hier erscheinen künftig die Details eines Kontakts." />} />
        </Route>
        <Route path="bewerbungen">
          <Route
            index
            element={<Platzhalter titel="Bewerbungen" inhalt="Hier verfolgst du künftig deine Bewerbungen nach Status." />}
          />
          <Route path="zielrollen" element={<Platzhalter titel="Zielrollen" inhalt="Hier erscheinen künftig deine Zielrollen." />} />
        </Route>
        <Route path="einstellungen" element={<EinstellungenSeite />} />
        <Route path="*" element={<NichtGefunden />} />
      </Route>
    </Routes>
  )
}
