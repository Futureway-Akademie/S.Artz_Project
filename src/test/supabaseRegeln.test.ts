// @vitest-environment node
/// <reference types="node" />
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'

/**
 * Prüft supabase/schema.sql mit einem echten Postgres (PGlite): Zugriffsregeln (RLS), Admin, Rollen,
 * Sperre und den Schutz vor Klartext. Der Teil `auth` von Supabase wird dafür nachgebildet.
 */
const SUPABASE_NACHBILDUNG = `
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb not null default '{}');
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema public, auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  create schema storage;
  create table storage.buckets (id text primary key, name text not null, public boolean not null default false);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets (id), name text not null);
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  alter table storage.objects enable row level security;
  grant usage on schema storage to anon, authenticated;
  grant all on storage.objects to authenticated;
  grant execute on function storage.foldername(text) to authenticated;
`

const SASCHA = '00000000-0000-4000-8000-000000000001'
const KIM = '00000000-0000-4000-8000-000000000002'
const UMSCHLAG = `'{"format":"pikartz-verschluesselt","version":2,"daten":"x","iv":"y"}'::jsonb`

let db: PGlite

/** Führt SQL als angemeldete Person (oder anonym) aus und kehrt danach zur Admin-Rolle der Datenbank zurück. */
async function als<T>(uid: string | null, sql: string): Promise<T[]> {
  await db.exec(uid ? `set request.jwt.claim.sub = '${uid}'; set role authenticated;` : `set request.jwt.claim.sub = ''; set role anon;`)
  try {
    return (await db.query<T>(sql)).rows
  } finally {
    await db.exec('reset role;')
  }
}

async function konto(id: string, email: string, meta = '{}') {
  await db.exec(`insert into auth.users (id, email, raw_user_meta_data) values ('${id}', '${email}', '${meta}'::jsonb)`)
}

beforeAll(async () => {
  db = new PGlite()
  await db.exec(SUPABASE_NACHBILDUNG)
  await db.exec(readFileSync('supabase/schema.sql', 'utf8'))
  await konto(SASCHA, 'admin@example.org')
  const [kunde] = (await db.query<{ id: string }>(`select id from public.rollen where name = 'Kunde'`)).rows
  await konto(KIM, 'kim@example.org', JSON.stringify({ rolle_id: kunde!.id }))
}, 60_000)

afterAll(async () => {
  await db.close()
})

describe('Supabase-Regeln (schema.sql)', () => {
  it('legt Profile automatisch an: das erste Konto ist Admin, Eingeladene bekommen ihre Rolle', async () => {
    const profile = (await db.query<{ email: string; ist_admin: boolean; rolle: string | null }>(
      `select p.email, p.ist_admin, r.name as rolle from public.profile p left join public.rollen r on r.id = p.rolle_id order by p.email`,
    )).rows
    expect(profile).toEqual([
      { email: 'admin@example.org', ist_admin: true, rolle: null },
      { email: 'kim@example.org', ist_admin: false, rolle: 'Kunde' },
    ])
    expect((await db.query(`select name from public.rollen order by name`)).rows).toHaveLength(4)
  })

  it('Nutzer sehen nur das eigene Profil, der Admin alle; Anonyme nichts', async () => {
    expect(await als(KIM, 'select email from public.profile')).toEqual([{ email: 'kim@example.org' }])
    expect(await als(SASCHA, 'select email from public.profile order by email')).toHaveLength(2)
    await expect(als(null, 'select email from public.profile')).rejects.toThrow()
    await expect(als(null, 'select name from public.rollen')).rejects.toThrow()
  })

  it('nur der Admin ändert Rechte und Rollen', async () => {
    await als(KIM, `update public.profile set ist_admin = true, bereiche_an = '{dashboard}' where user_id = '${KIM}'`)
    expect((await db.query(`select ist_admin, bereiche_an from public.profile where user_id = '${KIM}'`)).rows[0]).toEqual({ ist_admin: false, bereiche_an: [] })
    await expect(als(KIM, `insert into public.rollen (name) values ('Hintertür')`)).rejects.toThrow()

    await als(SASCHA, `update public.profile set bereiche_an = '{dashboard}', bereiche_aus = '{projekte}' where user_id = '${KIM}'`)
    expect((await db.query(`select bereiche_an, bereiche_aus from public.profile where user_id = '${KIM}'`)).rows[0]).toEqual({ bereiche_an: ['dashboard'], bereiche_aus: ['projekte'] })
    await als(SASCHA, `insert into public.rollen (name, bereiche) values ('Testrolle', '{cockpit}')`)
    expect(await als(KIM, `select name from public.rollen where name = 'Testrolle'`)).toHaveLength(1)
  })

  it('jeder Tresor gehört nur seinem Konto und nimmt nur Verschlüsseltes an', async () => {
    await als(SASCHA, `insert into public.tresor (user_id, umschlag) values ('${SASCHA}', ${UMSCHLAG})`)
    await als(KIM, `insert into public.tresor (user_id, umschlag) values ('${KIM}', ${UMSCHLAG})`)
    await expect(als(KIM, `insert into public.tresor (user_id, umschlag) values ('${SASCHA}', ${UMSCHLAG})`)).rejects.toThrow()
    expect(await als<{ user_id: string }>(KIM, 'select user_id from public.tresor')).toEqual([{ user_id: KIM }])
    await expect(als(KIM, `update public.tresor set umschlag = '{"klartext":"geheim"}'::jsonb where user_id = '${KIM}'`)).rejects.toThrow(/nur_verschluesselt/)
  })

  it('gesperrte Nutzer verlieren den Zugriff auf ihren Tresor, bis der Admin entsperrt', async () => {
    await als(SASCHA, `update public.profile set gesperrt = true where user_id = '${KIM}'`)
    expect(await als(KIM, 'select user_id from public.tresor')).toEqual([])
    await expect(als(KIM, `update public.tresor set revision = 9 where user_id = '${KIM}' returning revision`)).resolves.toEqual([])
    await als(SASCHA, `update public.profile set gesperrt = false where user_id = '${KIM}'`)
    expect(await als(KIM, 'select user_id from public.tresor')).toHaveLength(1)
  })

  it('KI: Recht je Bereich und Verbrauch nur über die Server-Funktion', async () => {
    const darf = async (uid: string) => (await als<{ d: boolean }>(uid, `select public.darf_bereich('ki') as d`))[0]!.d
    expect(await darf(SASCHA)).toBe(true)
    expect(await darf(KIM)).toBe(false)
    await als(SASCHA, `update public.profile set bereiche_an = '{ki}' where user_id = '${KIM}'`)
    expect(await darf(KIM)).toBe(true)
    await als(SASCHA, `update public.profile set bereiche_aus = '{ki}' where user_id = '${KIM}'`)
    expect(await darf(KIM)).toBe(false)

    await expect(als(KIM, `select public.ki_verbrauch_buchen('${KIM}', 1000)`)).rejects.toThrow()
    await expect(als(KIM, `insert into public.ki_nutzung (user_id, monat, tokens) values ('${KIM}', '2026-10', 0)`)).rejects.toThrow()
    await db.query(`select public.ki_verbrauch_buchen('${KIM}', 1200)`)
    await db.query(`select public.ki_verbrauch_buchen('${KIM}', 300)`)
    expect(await als(KIM, 'select tokens::int, aufrufe from public.ki_nutzung')).toEqual([{ tokens: 1500, aufrufe: 2 }])
    expect(await als(SASCHA, 'select tokens::int from public.ki_nutzung')).toHaveLength(1)
  })

  it('Dokumente: jeder nur im eigenen Ordner, Gesperrte gar nicht', async () => {
    expect((await db.query(`select public from storage.buckets where id = 'dokumente'`)).rows).toEqual([{ public: false }])
    await als(KIM, `insert into storage.objects (bucket_id, name) values ('dokumente', '${KIM}/a.bin')`)
    await expect(als(KIM, `insert into storage.objects (bucket_id, name) values ('dokumente', '${SASCHA}/b.bin')`)).rejects.toThrow()
    expect(await als(SASCHA, `select name from storage.objects`)).toEqual([])
    expect(await als(KIM, `select name from storage.objects`)).toEqual([{ name: `${KIM}/a.bin` }])
    await als(SASCHA, `update public.profile set gesperrt = true where user_id = '${KIM}'`)
    expect(await als(KIM, `select name from storage.objects`)).toEqual([])
    await als(SASCHA, `update public.profile set gesperrt = false where user_id = '${KIM}'`)
  })

  it('Webhooks: Adresse nur schreiben, nie lesen; jeder nur die eigenen', async () => {
    await als(KIM, `insert into public.webhooks (user_id, werkzeug_id, url) values ('${KIM}', 'wf1', 'https://n8n.example/webhook/geheim')`)
    await expect(als(KIM, `select url from public.webhooks`)).rejects.toThrow()
    expect(await als(KIM, `select werkzeug_id, letzter_status from public.webhooks`)).toEqual([{ werkzeug_id: 'wf1', letzter_status: null }])
    expect(await als(SASCHA, `select werkzeug_id from public.webhooks`)).toEqual([])
    await expect(als(KIM, `insert into public.webhooks (user_id, werkzeug_id, url) values ('${KIM}', 'wf2', 'http://unsicher.example')`)).rejects.toThrow()
    await expect(als(KIM, `update public.webhooks set letzter_status = 200 where werkzeug_id = 'wf1'`)).rejects.toThrow()
  })

  it('Freigaben: nur der Admin teilt, Empfänger lesen nur mit gültigem Schlüssel der aktuellen Version', async () => {
    const U = `'{"format":"pikartz-freigabe","version":1,"iv":"a","daten":"b"}'::jsonb`
    // Schlüsselpaare: öffentlicher Teil für alle lesbar, privater nur über die eigene Funktion
    await als(KIM, `insert into public.schluessel (user_id, oeffentlich, privat_verschluesselt) values ('${KIM}', '{"kty":"RSA"}', '{"iv":"x","daten":"y"}')`)
    expect(await als(SASCHA, `select oeffentlich from public.schluessel where user_id = '${KIM}'`)).toEqual([{ oeffentlich: { kty: 'RSA' } }])
    await expect(als(SASCHA, `select privat_verschluesselt from public.schluessel`)).rejects.toThrow()
    expect(await als(KIM, `select public.eigener_privater_schluessel() as p`)).toEqual([{ p: { iv: 'x', daten: 'y' } }])
    expect(await als(SASCHA, `select public.eigener_privater_schluessel() as p`)).toEqual([{ p: null }])

    // Teilen nur durch den Admin, nur verschlüsselt
    await expect(als(KIM, `insert into public.freigaben (besitzer_id, bereich, umschlag) values ('${KIM}', 'projekte', ${U})`)).rejects.toThrow()
    await expect(als(SASCHA, `insert into public.freigaben (besitzer_id, bereich, umschlag) values ('${SASCHA}', 'projekte', '{"klartext":1}'::jsonb)`)).rejects.toThrow()
    await als(SASCHA, `insert into public.freigaben (besitzer_id, bereich, version, umschlag) values ('${SASCHA}', 'projekte', 1, ${U}), ('${SASCHA}', 'wissen', 1, ${U})`)
    await als(SASCHA, `insert into public.freigabe_schluessel (besitzer_id, bereich, empfaenger_id, version, verpackt) values ('${SASCHA}', 'projekte', '${KIM}', 1, 'k')`)
    expect(await als(KIM, `select bereich from public.freigaben`)).toEqual([{ bereich: 'projekte' }])
    expect(await als(KIM, `select verpackt from public.freigabe_schluessel`)).toEqual([{ verpackt: 'k' }])

    // Neue Version ohne Schlüssel für Kim: kein Zugriff mehr (Entzug)
    await als(SASCHA, `update public.freigaben set version = 2 where bereich = 'projekte'`)
    expect(await als(KIM, `select bereich from public.freigaben`)).toEqual([])

    // Gesperrt: auch mit gültigem Schlüssel nichts
    await als(SASCHA, `update public.freigabe_schluessel set version = 2 where empfaenger_id = '${KIM}'`)
    expect(await als(KIM, `select bereich from public.freigaben`)).toEqual([{ bereich: 'projekte' }])
    await als(SASCHA, `update public.profile set gesperrt = true where user_id = '${KIM}'`)
    expect(await als(KIM, `select bereich from public.freigaben`)).toEqual([])
    await als(SASCHA, `update public.profile set gesperrt = false where user_id = '${KIM}'`)
  })

  it('Push-Abos: jeder nur die eigenen, nur https-Endpunkte', async () => {
    await als(KIM, `insert into public.push_abos (user_id, endpoint, p256dh, auth, stunde) values ('${KIM}', 'https://push.example/abc', 'p', 'a', 7)`)
    expect(await als(SASCHA, 'select endpoint from public.push_abos')).toEqual([])
    expect(await als(KIM, 'select stunde from public.push_abos')).toEqual([{ stunde: 7 }])
    await expect(als(KIM, `insert into public.push_abos (user_id, endpoint, p256dh, auth) values ('${SASCHA}', 'https://push.example/x', 'p', 'a')`)).rejects.toThrow()
    await expect(als(KIM, `insert into public.push_abos (user_id, endpoint, p256dh, auth) values ('${KIM}', 'http://push.example/x', 'p', 'a')`)).rejects.toThrow()
  })

  it('lässt sich gefahrlos erneut ausführen (z. B. nach einem Update)', async () => {
    await db.exec(readFileSync('supabase/schema.sql', 'utf8'))
    expect((await db.query(`select count(*)::int as n from public.profile`)).rows[0]).toEqual({ n: 2 })
  })

  it('der letzte aktive Admin kann sich nicht selbst entmachten oder sperren', async () => {
    await expect(als(SASCHA, `update public.profile set ist_admin = false where user_id = '${SASCHA}'`)).rejects.toThrow(/mindestens einen aktiven Admin/)
    await expect(als(SASCHA, `update public.profile set gesperrt = true where user_id = '${SASCHA}'`)).rejects.toThrow(/mindestens einen aktiven Admin/)
  })

  it('Freigabe-Kreis: nur der Admin legt Paare fest; teilen nur mit Recht und nur im Kreis', async () => {
    const LEA = '00000000-0000-4000-8000-000000000003'
    const MAX = '00000000-0000-4000-8000-000000000004'
    const [kunde] = (await db.query<{ id: string }>(`select id from public.rollen where name = 'Kunde'`)).rows
    await konto(LEA, 'lea@example.org', JSON.stringify({ rolle_id: kunde!.id }))
    await konto(MAX, 'max@example.org', JSON.stringify({ rolle_id: kunde!.id }))
    const darf = async (uid: string) => (await als<{ d: boolean }>(uid, `select public.darf_teilen() as d`))[0]!.d
    const mit = async (uid: string, anderer: string) => (await als<{ d: boolean }>(uid, `select public.darf_teilen_mit('${anderer}') as d`))[0]!.d
    const partner = async (uid: string) => (await als<{ email: string }>(uid, `select email from public.meine_kreis_partner()`)).map((p) => p.email)

    // Recht „darf teilen“: Admin immer, sonst Rolle, je Nutzer abweichend
    expect(await darf(SASCHA)).toBe(true)
    expect(await darf(KIM)).toBe(false)
    await als(SASCHA, `update public.rollen set darf_teilen = true where name = 'Kunde'`)
    expect(await darf(KIM)).toBe(true)
    await als(SASCHA, `update public.profile set darf_teilen = false where user_id = '${MAX}'`)
    expect(await darf(MAX)).toBe(false)
    await als(KIM, `update public.profile set darf_teilen = true where user_id = '${MAX}'`)
    expect(await darf(MAX)).toBe(false)

    // Paare: nur der Admin, jedes Paar genau einmal in fester Reihenfolge
    await expect(als(KIM, `insert into public.freigabe_kreis (nutzer_a, nutzer_b) values ('${KIM}', '${LEA}')`)).rejects.toThrow()
    await expect(als(SASCHA, `insert into public.freigabe_kreis (nutzer_a, nutzer_b) values ('${LEA}', '${KIM}')`)).rejects.toThrow(/kreis_reihenfolge/)
    await als(SASCHA, `insert into public.freigabe_kreis (nutzer_a, nutzer_b) values ('${KIM}', '${LEA}')`)
    expect(await als(LEA, `select nutzer_a from public.freigabe_kreis`)).toHaveLength(1)
    expect(await als(MAX, `select nutzer_a from public.freigabe_kreis`)).toEqual([])
    expect(await als(SASCHA, `select nutzer_a from public.freigabe_kreis`)).toHaveLength(1)
    await expect(als(null, `select nutzer_a from public.freigabe_kreis`)).rejects.toThrow()

    // Teilen nur im Kreis (in beide Richtungen), nie mit sich selbst; der Admin mit allen
    expect(await mit(KIM, LEA)).toBe(true)
    expect(await mit(LEA, KIM)).toBe(true)
    expect(await mit(KIM, MAX)).toBe(false)
    expect(await mit(KIM, KIM)).toBe(false)
    expect(await mit(SASCHA, MAX)).toBe(true)
    expect(await partner(KIM)).toEqual(['lea@example.org'])
    expect(await partner(MAX)).toEqual([])
    expect(await partner(SASCHA)).toEqual(['kim@example.org', 'lea@example.org', 'max@example.org'])

    // Empfänger-Schlüssel nur für erlaubte Partner
    await als(SASCHA, `insert into public.freigabe_schluessel (besitzer_id, bereich, empfaenger_id, version, verpackt) values ('${SASCHA}', 'wissen', '${MAX}', 1, 'k')`)
    await expect(als(SASCHA, `insert into public.freigabe_schluessel (besitzer_id, bereich, empfaenger_id, version, verpackt) values ('${SASCHA}', 'wissen', '${SASCHA}', 1, 'k')`)).rejects.toThrow()

    // Gesperrt: darf nichts, taucht bei niemandem als Partner auf, sieht keine Paare
    await als(SASCHA, `update public.profile set gesperrt = true where user_id = '${LEA}'`)
    expect(await darf(LEA)).toBe(false)
    expect(await mit(LEA, KIM)).toBe(false)
    expect(await partner(KIM)).toEqual([])
    expect(await als(LEA, `select nutzer_a from public.freigabe_kreis`)).toEqual([])
    await als(SASCHA, `update public.profile set gesperrt = false where user_id = '${LEA}'`)

    // Paar entfernen: kein Teilen mehr
    await expect(als(KIM, `delete from public.freigabe_kreis returning nutzer_a`)).resolves.toEqual([])
    await als(SASCHA, `delete from public.freigabe_kreis where nutzer_a = '${KIM}'`)
    expect(await mit(KIM, LEA)).toBe(false)

    // Konto gelöscht: Paare verschwinden mit
    await als(SASCHA, `insert into public.freigabe_kreis (nutzer_a, nutzer_b) values ('${KIM}', '${MAX}')`)
    await db.exec(`delete from auth.users where id = '${MAX}'`)
    expect((await db.query(`select count(*)::int as n from public.freigabe_kreis`)).rows[0]).toEqual({ n: 0 })
  })
})
