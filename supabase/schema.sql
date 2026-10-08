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

-- ============================================================================
-- KI-Assistent (Roadmap v7): Recht „ki“ und Monatsbudget je Nutzer
-- Inhalte werden nie gespeichert – nur die Anzahl verbrauchter Tokens je Monat.
-- ============================================================================

alter table public.profile add column if not exists ki_limit_tokens integer not null default 300000 check (ki_limit_tokens >= 0);

-- Darf der angemeldete Nutzer diesen Bereich nutzen? (Admin immer, Gesperrte nie)
create or replace function public.darf_bereich(bereich text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select not p.gesperrt and (
      p.ist_admin
      or (bereich = any (coalesce(r.bereiche, '{}')) or bereich = any (p.bereiche_an)) and not bereich = any (p.bereiche_aus)
    )
    from public.profile p left join public.rollen r on r.id = p.rolle_id
    where p.user_id = auth.uid()
  ), false)
$$;

create table if not exists public.ki_nutzung (
  user_id uuid not null references auth.users (id) on delete cascade,
  monat text not null check (monat ~ '^\d{4}-\d{2}$'),
  tokens bigint not null default 0,
  aufrufe integer not null default 0,
  primary key (user_id, monat)
);

alter table public.ki_nutzung enable row level security;
-- Lesen: eigene Nutzung, der Admin alle. Schreiben nur die KI-Funktion (mit Server-Rechten).
drop policy if exists "ki_nutzung_lesen" on public.ki_nutzung;
create policy "ki_nutzung_lesen" on public.ki_nutzung for select to authenticated using (user_id = auth.uid() or public.ist_admin());
revoke all on public.ki_nutzung from anon;
revoke insert, update, delete on public.ki_nutzung from authenticated;

-- Verbrauch buchen (nur für die KI-Funktion; prüft und erhöht in einem Schritt)
create or replace function public.ki_verbrauch_buchen(nutzer uuid, verbrauch bigint) returns void
language sql security definer set search_path = public as $$
  insert into public.ki_nutzung (user_id, monat, tokens, aufrufe)
  values (nutzer, to_char(now() at time zone 'Europe/Berlin', 'YYYY-MM'), greatest(verbrauch, 0), 1)
  on conflict (user_id, monat) do update set tokens = public.ki_nutzung.tokens + excluded.tokens, aufrufe = public.ki_nutzung.aufrufe + 1
$$;
revoke all on function public.ki_verbrauch_buchen(uuid, bigint) from public, anon, authenticated;

-- ============================================================================
-- Dokumente (Roadmap v7): privater Speicher-Bucket, je Konto ein eigener Ordner.
-- Hochgeladen werden nur im Browser verschlüsselte Dateien.
-- ============================================================================

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public) values ('dokumente', 'dokumente', false) on conflict (id) do nothing;

    execute 'drop policy if exists "dokumente_lesen" on storage.objects';
    execute 'drop policy if exists "dokumente_anlegen" on storage.objects';
    execute 'drop policy if exists "dokumente_aendern" on storage.objects';
    execute 'drop policy if exists "dokumente_loeschen" on storage.objects';
    execute $p$create policy "dokumente_lesen" on storage.objects for select to authenticated
      using (bucket_id = 'dokumente' and (storage.foldername(name))[1] = auth.uid()::text and not public.ist_gesperrt())$p$;
    execute $p$create policy "dokumente_anlegen" on storage.objects for insert to authenticated
      with check (bucket_id = 'dokumente' and (storage.foldername(name))[1] = auth.uid()::text and not public.ist_gesperrt())$p$;
    execute $p$create policy "dokumente_aendern" on storage.objects for update to authenticated
      using (bucket_id = 'dokumente' and (storage.foldername(name))[1] = auth.uid()::text and not public.ist_gesperrt())$p$;
    execute $p$create policy "dokumente_loeschen" on storage.objects for delete to authenticated
      using (bucket_id = 'dokumente' and (storage.foldername(name))[1] = auth.uid()::text and not public.ist_gesperrt())$p$;
  end if;
end $$;

-- ============================================================================
-- Workflows (Roadmap v7): Webhooks zu n8n/Make. Die Adresse wirkt wie ein Schlüssel:
-- Der Browser darf sie eintragen, aber nie wieder lesen. Ausgelöst wird nur über die Funktion „workflow“.
-- ============================================================================

create table if not exists public.webhooks (
  user_id uuid not null references auth.users (id) on delete cascade,
  werkzeug_id text not null check (length(werkzeug_id) between 1 and 64),
  url text not null check (url ~ '^https://'),
  letzte_ausfuehrung timestamptz,
  letzter_status integer,
  letzte_meldung text not null default '',
  primary key (user_id, werkzeug_id)
);

alter table public.webhooks enable row level security;
drop policy if exists "webhooks_lesen" on public.webhooks;
drop policy if exists "webhooks_anlegen" on public.webhooks;
drop policy if exists "webhooks_aendern" on public.webhooks;
drop policy if exists "webhooks_loeschen" on public.webhooks;
create policy "webhooks_lesen" on public.webhooks for select to authenticated using (user_id = auth.uid() and not public.ist_gesperrt());
create policy "webhooks_anlegen" on public.webhooks for insert to authenticated with check (user_id = auth.uid() and not public.ist_gesperrt());
create policy "webhooks_aendern" on public.webhooks for update to authenticated using (user_id = auth.uid() and not public.ist_gesperrt()) with check (user_id = auth.uid());
create policy "webhooks_loeschen" on public.webhooks for delete to authenticated using (user_id = auth.uid());

-- Spaltenrechte: Adresse nur schreiben, nie lesen
revoke all on public.webhooks from anon, authenticated;
grant select (user_id, werkzeug_id, letzte_ausfuehrung, letzter_status, letzte_meldung) on public.webhooks to authenticated;
grant insert (user_id, werkzeug_id, url) on public.webhooks to authenticated;
grant update (url) on public.webhooks to authenticated;
grant delete on public.webhooks to authenticated;

-- ============================================================================
-- Geteilte Bereiche (Roadmap v7): Der Admin gibt Bereiche seiner Daten an Nutzer frei.
-- Alles bleibt Ende-zu-Ende-verschlüsselt: Der Inhalt ist mit einem Bereichsschlüssel verschlüsselt,
-- dieser ist je Empfänger mit dessen öffentlichem Schlüssel verpackt. Supabase sieht nur Chiffretext.
-- ============================================================================

create table if not exists public.schluessel (
  user_id uuid primary key references auth.users (id) on delete cascade,
  oeffentlich jsonb not null,
  -- privater Schlüssel, verschlüsselt mit dem Datenschlüssel des eigenen Tresors
  privat_verschluesselt jsonb not null check (privat_verschluesselt ? 'iv' and privat_verschluesselt ? 'daten')
);

alter table public.schluessel enable row level security;
drop policy if exists "schluessel_lesen" on public.schluessel;
drop policy if exists "schluessel_anlegen" on public.schluessel;
drop policy if exists "schluessel_aendern" on public.schluessel;
create policy "schluessel_lesen" on public.schluessel for select to authenticated using (true);
create policy "schluessel_anlegen" on public.schluessel for insert to authenticated with check (user_id = auth.uid());
create policy "schluessel_aendern" on public.schluessel for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
-- Öffentliche Schlüssel darf jeder Angemeldete lesen, den verschlüsselten privaten nur sein Besitzer (über die Funktion)
revoke all on public.schluessel from anon, authenticated;
grant select (user_id, oeffentlich) on public.schluessel to authenticated;
grant insert (user_id, oeffentlich, privat_verschluesselt) on public.schluessel to authenticated;
grant update (oeffentlich, privat_verschluesselt) on public.schluessel to authenticated;

create or replace function public.eigener_privater_schluessel() returns jsonb
language sql stable security definer set search_path = public as $$
  select privat_verschluesselt from public.schluessel where user_id = auth.uid()
$$;

create table if not exists public.freigaben (
  besitzer_id uuid not null references auth.users (id) on delete cascade,
  bereich text not null check (bereich in ('projekte', 'aufgaben', 'wissen', 'werkzeug')),
  version integer not null default 1,
  umschlag jsonb not null check (umschlag ->> 'format' = 'pikartz-freigabe' and umschlag ? 'iv' and umschlag ? 'daten'),
  aktualisiert_am timestamptz not null default now(),
  primary key (besitzer_id, bereich)
);

create table if not exists public.freigabe_schluessel (
  besitzer_id uuid not null,
  bereich text not null,
  empfaenger_id uuid not null references auth.users (id) on delete cascade,
  version integer not null,
  verpackt text not null,
  primary key (besitzer_id, bereich, empfaenger_id),
  foreign key (besitzer_id, bereich) references public.freigaben (besitzer_id, bereich) on delete cascade
);

alter table public.freigaben enable row level security;
alter table public.freigabe_schluessel enable row level security;
drop policy if exists "freigaben_lesen" on public.freigaben;
drop policy if exists "freigaben_schreiben" on public.freigaben;
drop policy if exists "freigabe_schluessel_lesen" on public.freigabe_schluessel;
drop policy if exists "freigabe_schluessel_schreiben" on public.freigabe_schluessel;
-- Lesen: Besitzer, oder Empfänger mit gültigem Schlüssel für die aktuelle Version (und nicht gesperrt)
create policy "freigaben_lesen" on public.freigaben for select to authenticated using (
  besitzer_id = auth.uid()
  or (not public.ist_gesperrt() and exists (
    select 1 from public.freigabe_schluessel s
    where s.besitzer_id = freigaben.besitzer_id and s.bereich = freigaben.bereich and s.empfaenger_id = auth.uid() and s.version = freigaben.version
  ))
);
-- Schreiben: nur ein aktiver Admin für die eigenen Daten
create policy "freigaben_schreiben" on public.freigaben for all to authenticated
  using (besitzer_id = auth.uid() and public.ist_admin()) with check (besitzer_id = auth.uid() and public.ist_admin());
create policy "freigabe_schluessel_lesen" on public.freigabe_schluessel for select to authenticated
  using (besitzer_id = auth.uid() or (empfaenger_id = auth.uid() and not public.ist_gesperrt()));
create policy "freigabe_schluessel_schreiben" on public.freigabe_schluessel for all to authenticated
  using (besitzer_id = auth.uid() and public.ist_admin()) with check (besitzer_id = auth.uid() and public.ist_admin());
revoke all on public.freigaben from anon;
revoke all on public.freigabe_schluessel from anon;

-- ============================================================================
-- Erinnerungen per Push (Roadmap v7): Der Server kennt keine Inhalte (Ende-zu-Ende-Verschlüsselung),
-- er verschickt nur zur gewählten Uhrzeit „Schau, was heute ansteht“. Gespeichert wird nur das Push-Abo.
-- ============================================================================

create table if not exists public.push_abos (
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null check (endpoint ~ '^https://'),
  p256dh text not null,
  auth text not null,
  -- Stunde der täglichen Erinnerung (Zeitzone Berlin), 0–23
  stunde smallint not null default 8 check (stunde between 0 and 23),
  letzter_versand date,
  primary key (user_id, endpoint)
);

alter table public.push_abos enable row level security;
drop policy if exists "push_abos_eigene" on public.push_abos;
create policy "push_abos_eigene" on public.push_abos for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and not public.ist_gesperrt());
revoke all on public.push_abos from anon;
