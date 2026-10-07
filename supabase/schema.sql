-- PIKARTZ.AI Arbeitscockpit – Supabase-Schema
-- Einmal im SQL-Editor des Supabase-Projekts ausführen (Region EU, z. B. Frankfurt).
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
create policy "tresor_lesen" on public.tresor for select using (auth.uid() = user_id);
create policy "tresor_anlegen" on public.tresor for insert with check (auth.uid() = user_id);
create policy "tresor_aendern" on public.tresor for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "tresor_loeschen" on public.tresor for delete using (auth.uid() = user_id);

-- Kein Zugriff für nicht angemeldete Besucher
revoke all on public.tresor from anon;
