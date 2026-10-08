-- PIKARTZ.AI Arbeitscockpit – Supabase-Schema
-- Im SQL-Editor des Supabase-Projekts ausführen (Region EU, z. B. Frankfurt). Mehrfaches Ausführen ist unschädlich.
--
-- Gespeichert wird je Konto genau ein Datensatz: der Ende-zu-Ende-verschlüsselte Umschlag.
-- Supabase sieht keinen Klartext: Verschlüsselt wird im Browser (AES-GCM 256), das Passwort
-- und der Wiederherstellungsschlüssel verlassen das Gerät nie.

create table if not exists public.tresor (
  user_id uuid primary key references auth.users (id) on delete cascade,
  umschlag jsonb not null,
  revision bigint not null default 1,
  aktualisiert_am timestamptz not null default now(),
  -- Nur verschlüsselte Umschläge sind erlaubt (Schutz vor versehentlichem Klartext)
  constraint nur_verschluesselt check (
    umschlag ->> 'format' = 'pikartz-verschluesselt'
    and (umschlag ->> 'version')::int = 2
    and umschlag ? 'daten'
    and umschlag ? 'iv'
  )
);

alter table public.tresor enable row level security;

-- Jedes Konto sieht und ändert ausschließlich den eigenen Datensatz
drop policy if exists "tresor_lesen" on public.tresor;
create policy "tresor_lesen" on public.tresor for select using (auth.uid() = user_id);
drop policy if exists "tresor_anlegen" on public.tresor;
create policy "tresor_anlegen" on public.tresor for insert with check (auth.uid() = user_id);
drop policy if exists "tresor_aendern" on public.tresor;
create policy "tresor_aendern" on public.tresor for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "tresor_loeschen" on public.tresor;
create policy "tresor_loeschen" on public.tresor for delete using (auth.uid() = user_id);

-- Kein Zugriff für nicht angemeldete Besucher
revoke all on public.tresor from anon;

-- ============================================================================
-- Mehrbenutzer (Roadmap v7): Profile, Rollen und Bereichsrechte
-- Neue Nutzer kommen nur per Einladung (Selbstregistrierung in Supabase abschalten).
-- Das erste Konto wird automatisch Admin. Jeder Nutzer hat seinen eigenen Tresor.
-- ============================================================================

create table if not exists public.rollen (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) between 1 and 60),
  -- Bereiche, die Nutzer dieser Rolle sehen (z. B. 'projekte', 'kalender')
  bereiche text[] not null default '{}',
  erstellt_am timestamptz not null default now()
);

create table if not exists public.profile (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  anzeigename text not null default '',
  rolle_id uuid references public.rollen (id) on delete set null,
  ist_admin boolean not null default false,
  gesperrt boolean not null default false,
  -- Abweichungen von der Rolle je Nutzer
  bereiche_an text[] not null default '{}',
  bereiche_aus text[] not null default '{}',
  erstellt_am timestamptz not null default now()
);

-- Hilfsfunktionen für die Regeln (security definer: lesen das Profil ohne Rekursion über RLS)
create or replace function public.ist_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select p.ist_admin and not p.gesperrt from public.profile p where p.user_id = auth.uid()), false)
$$;

create or replace function public.ist_gesperrt() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select p.gesperrt from public.profile p where p.user_id = auth.uid()), false)
$$;

-- Profil beim Anlegen eines Kontos (Einladung oder erste Anmeldung) automatisch erzeugen
create or replace function public.profil_anlegen() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  rolle text := new.raw_user_meta_data ->> 'rolle_id';
begin
  insert into public.profile (user_id, email, rolle_id, ist_admin)
  values (
    new.id,
    coalesce(new.email, ''),
    case when rolle ~ '^[0-9a-f-]{36}$' and exists (select 1 from public.rollen r where r.id = rolle::uuid) then rolle::uuid end,
    not exists (select 1 from public.profile)
  );
  return new;
end $$;

drop trigger if exists profil_anlegen on auth.users;
create trigger profil_anlegen after insert on auth.users for each row execute function public.profil_anlegen();

-- Es muss immer mindestens einen aktiven Admin geben
create or replace function public.admin_bleibt() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.profile where ist_admin and not gesperrt) then
    raise exception 'Es muss mindestens einen aktiven Admin geben.';
  end if;
  return null;
end $$;

drop trigger if exists admin_bleibt on public.profile;
create constraint trigger admin_bleibt after update or delete on public.profile
  deferrable initially immediate for each row execute function public.admin_bleibt();

alter table public.rollen enable row level security;
alter table public.profile enable row level security;

-- Rollen: alle Angemeldeten lesen (für die eigenen Rechte), nur der Admin ändert
drop policy if exists "rollen_lesen" on public.rollen;
create policy "rollen_lesen" on public.rollen for select to authenticated using (true);
drop policy if exists "rollen_anlegen" on public.rollen;
create policy "rollen_anlegen" on public.rollen for insert to authenticated with check (public.ist_admin());
drop policy if exists "rollen_aendern" on public.rollen;
create policy "rollen_aendern" on public.rollen for update to authenticated using (public.ist_admin()) with check (public.ist_admin());
drop policy if exists "rollen_loeschen" on public.rollen;
create policy "rollen_loeschen" on public.rollen for delete to authenticated using (public.ist_admin());

-- Profile: jeder sieht das eigene, der Admin alle; ändern darf nur der Admin
drop policy if exists "profile_lesen" on public.profile;
create policy "profile_lesen" on public.profile for select to authenticated using (user_id = auth.uid() or public.ist_admin());
drop policy if exists "profile_aendern" on public.profile;
create policy "profile_aendern" on public.profile for update to authenticated using (public.ist_admin()) with check (public.ist_admin());

revoke all on public.rollen from anon;
revoke all on public.profile from anon;

-- Gesperrte Nutzer erhalten keinen Zugriff mehr auf ihren Tresor
drop policy if exists "tresor_lesen" on public.tresor;
create policy "tresor_lesen" on public.tresor for select using (auth.uid() = user_id and not public.ist_gesperrt());
drop policy if exists "tresor_anlegen" on public.tresor;
create policy "tresor_anlegen" on public.tresor for insert with check (auth.uid() = user_id and not public.ist_gesperrt());
drop policy if exists "tresor_aendern" on public.tresor;
create policy "tresor_aendern" on public.tresor for update using (auth.uid() = user_id and not public.ist_gesperrt()) with check (auth.uid() = user_id);
drop policy if exists "tresor_loeschen" on public.tresor;
create policy "tresor_loeschen" on public.tresor for delete using (auth.uid() = user_id and not public.ist_gesperrt());

-- Startrollen (anpassbar im Admin-Bereich)
insert into public.rollen (name, bereiche) values
  ('Kunde', array['cockpit', 'aufgaben', 'kalender', 'projekte']),
  ('Mitarbeiter', array['cockpit', 'dashboard', 'aufgaben', 'kalender', 'projekte', 'automationen', 'werkzeug', 'kontakte']),
  ('Kursteilnehmer', array['cockpit', 'aufgaben', 'kalender', 'weiterbildung', 'wissen', 'werkzeug']),
  ('Familie/Freunde', array['cockpit', 'aufgaben', 'kalender'])
on conflict (name) do nothing;
