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

  it('lässt sich gefahrlos erneut ausführen (z. B. nach einem Update)', async () => {
    await db.exec(readFileSync('supabase/schema.sql', 'utf8'))
    expect((await db.query(`select count(*)::int as n from public.profile`)).rows[0]).toEqual({ n: 2 })
  })

  it('der letzte aktive Admin kann sich nicht selbst entmachten oder sperren', async () => {
    await expect(als(SASCHA, `update public.profile set ist_admin = false where user_id = '${SASCHA}'`)).rejects.toThrow(/mindestens einen aktiven Admin/)
    await expect(als(SASCHA, `update public.profile set gesperrt = true where user_id = '${SASCHA}'`)).rejects.toThrow(/mindestens einen aktiven Admin/)
  })
})
