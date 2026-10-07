import { Route, Routes } from 'react-router'
import { AppShell } from '../components/layout/AppShell.tsx'
import { AufgabenSeite } from '../features/aufgaben/AufgabenSeite.tsx'
import { BewerbungDetailSeite } from '../features/bewerbungen/BewerbungDetailSeite.tsx'
import { BewerbungenSeite } from '../features/bewerbungen/BewerbungenSeite.tsx'
import { ZielrollenSeite } from '../features/bewerbungen/ZielrollenSeite.tsx'
import { CockpitSeite } from '../features/cockpit/CockpitSeite.tsx'
import { AutomationenSeite } from '../features/automationen/AutomationenSeite.tsx'
import { EinstellungenSeite } from '../features/einstellungen/EinstellungenSeite.tsx'
import { KalenderSeite } from '../features/kalender/KalenderSeite.tsx'
import { KontaktDetailSeite } from '../features/kontakte/KontaktDetailSeite.tsx'
import { KontakteSeite } from '../features/kontakte/KontakteSeite.tsx'
import { LeadDetailSeite } from '../features/kontakte/LeadDetailSeite.tsx'
import { LeadsSeite } from '../features/kontakte/LeadsSeite.tsx'
import { UnternehmenDetailSeite } from '../features/kontakte/UnternehmenDetailSeite.tsx'
import { UnternehmenSeite } from '../features/kontakte/UnternehmenSeite.tsx'
import { VorlagenSeite } from '../features/kontakte/VorlagenSeite.tsx'
import { MarkeSeite } from '../features/marke/MarkeSeite.tsx'
import { NichtGefunden } from '../features/NichtGefunden.tsx'
import { WeiterbildungSeite } from '../features/weiterbildung/WeiterbildungSeite.tsx'
import { WissenDetailSeite } from '../features/wissen/WissenDetailSeite.tsx'
import { WissenSeite } from '../features/wissen/WissenSeite.tsx'
import { ProjektDetailSeite } from '../features/projekte/ProjektDetailSeite.tsx'
import { ProjekteSeite } from '../features/projekte/ProjekteSeite.tsx'

/** Alle Routen der App: neun Bereiche, Unterseiten und „Seite nicht gefunden“. */
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
        <Route path="kalender" element={<KalenderSeite />} />
        <Route path="wissen">
          <Route index element={<WissenSeite />} />
          <Route path=":id" element={<WissenDetailSeite />} />
        </Route>
        <Route path="kontakte">
          <Route index element={<KontakteSeite />} />
          <Route path="unternehmen" element={<UnternehmenSeite />} />
          <Route path="unternehmen/:id" element={<UnternehmenDetailSeite />} />
          <Route path="leads" element={<LeadsSeite />} />
          <Route path="leads/:id" element={<LeadDetailSeite />} />
          <Route path="vorlagen" element={<VorlagenSeite />} />
          <Route path=":id" element={<KontaktDetailSeite />} />
        </Route>
        <Route path="bewerbungen">
          <Route index element={<BewerbungenSeite />} />
          <Route path="zielrollen" element={<ZielrollenSeite />} />
          <Route path=":id" element={<BewerbungDetailSeite />} />
        </Route>
        <Route path="einstellungen" element={<EinstellungenSeite />} />
        <Route path="*" element={<NichtGefunden />} />
      </Route>
    </Routes>
  )
}
