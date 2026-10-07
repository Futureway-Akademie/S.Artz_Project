import { Route, Routes } from 'react-router'
import { AppShell } from '../components/layout/AppShell.tsx'
import { AufgabenSeite } from '../features/aufgaben/AufgabenSeite.tsx'
import { CockpitSeite } from '../features/cockpit/CockpitSeite.tsx'
import { AutomationenSeite } from '../features/automationen/AutomationenSeite.tsx'
import { EinstellungenSeite } from '../features/einstellungen/EinstellungenSeite.tsx'
import { KontaktDetailSeite } from '../features/kontakte/KontaktDetailSeite.tsx'
import { KontakteSeite } from '../features/kontakte/KontakteSeite.tsx'
import { UnternehmenDetailSeite } from '../features/kontakte/UnternehmenDetailSeite.tsx'
import { UnternehmenSeite } from '../features/kontakte/UnternehmenSeite.tsx'
import { MarkeSeite } from '../features/marke/MarkeSeite.tsx'
import { NichtGefunden, Platzhalter } from '../features/Platzhalter.tsx'
import { WeiterbildungSeite } from '../features/weiterbildung/WeiterbildungSeite.tsx'
import { ProjektDetailSeite } from '../features/projekte/ProjektDetailSeite.tsx'
import { ProjekteSeite } from '../features/projekte/ProjekteSeite.tsx'

/** Alle Routen der App. Platzhalter werden durch die Bereichs-Tasks ersetzt. */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<CockpitSeite />} />
        <Route path="projekte">
          <Route index element={<ProjekteSeite />} />
          <Route path=":id" element={<ProjektDetailSeite />} />
        </Route>
        <Route path="automationen" element={<AutomationenSeite />} />
        <Route path="weiterbildung" element={<WeiterbildungSeite />} />
        <Route path="pikartz-ai" element={<MarkeSeite />} />
        <Route path="aufgaben" element={<AufgabenSeite />} />
        <Route path="kontakte">
          <Route index element={<KontakteSeite />} />
          <Route path="unternehmen" element={<UnternehmenSeite />} />
          <Route path="unternehmen/:id" element={<UnternehmenDetailSeite />} />
          <Route path="leads" element={<Platzhalter titel="Leads" inhalt="Hier verwaltest du künftig optionale Leads rund um PIKARTZ.AI." />} />
          <Route path=":id" element={<KontaktDetailSeite />} />
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
