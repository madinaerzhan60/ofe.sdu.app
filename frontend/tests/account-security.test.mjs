import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

const accountMigration = new URL('../supabase/migrations/20261022_accounts.sql', import.meta.url)
const foundationMigration = new URL('../supabase/migrations/20261023071333_database_foundation.sql', import.meta.url)
const storageSecurityMigration = new URL(
  '../supabase/migrations/20261023115503_storage_security_hardening.sql',
  import.meta.url,
)

const foundationProject = (id, ownerId, overrides = {}) => ({
  id,
  ownerId,
  name: 'Community arts',
  description: 'Art classes for the community',
  industry: 'Arts & culture',
  stage: 'Idea',
  team: 'Alice',
  product: 'Weekly workshops',
  status: 'Pending',
  publication: true,
  consentVersion: '2026-10-22',
  consentAt: new Date().toISOString(),
  feedback: '',
  createdAt: '2026-10-23T00:00:00.000Z',
  visible: false,
  eventYears: [],
  ...overrides,
})

const createFoundationDatabase = async () => {
  const db = new PGlite()
  const users = {
    alice: '00000000-0000-0000-0000-000000000021',
    bob: '00000000-0000-0000-0000-000000000022',
    admin: '00000000-0000-0000-0000-000000000023',
  }
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key, raw_user_meta_data jsonb not null default '{}'::jsonb);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth,public to anon,authenticated;
    grant execute on function auth.uid() to anon,authenticated;`)
  await db.query('insert into auth.users(id) values ($1),($2),($3)', [users.alice, users.bob, users.admin])
  await db.exec(await readFile(accountMigration, 'utf8'))
  await db.query('insert into public.app_admins(user_id) values ($1)', [users.admin])
  await db.exec(await readFile(foundationMigration, 'utf8'))
  const login = async (id, role = 'authenticated') => {
    await db.exec('reset role')
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id ?? ''])
    await db.exec(`set role ${role}`)
  }
  return { db, users, login }
}

test('database enforces ownership, moderation, publication and event registration', async () => {
  const db = new PGlite()
  const alice='00000000-0000-0000-0000-000000000001'
  const bob='00000000-0000-0000-0000-000000000002'
  const admin='00000000-0000-0000-0000-000000000003'
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key, raw_user_meta_data jsonb not null default '{}'::jsonb);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth,public to anon,authenticated;
      grant execute on function auth.uid() to anon,authenticated;`)
    await db.query('insert into auth.users(id) values ($1),($2),($3)',[alice,bob,admin])
    await db.exec(await readFile(new URL('../supabase/migrations/20261022_accounts.sql',import.meta.url),'utf8'))
    await db.query('insert into public.app_admins(user_id) values ($1)',[admin])
    const login = async (id,role='authenticated') => {
      await db.exec('reset role')
      await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id ?? ''])
      await db.exec(`set role ${role}`)
    }
    const project={id:'project-a',ownerId:alice,name:'Local arts',description:'Art classes for the community',team:'Alice',industry:'Arts & culture',stage:'Idea',status:'Pending',visible:false,publication:false,feedback:'',createdAt:'2026-10-22'}
    await login(alice)
    await db.query('insert into projects(id,owner_id,data) values ($1,$2,$3)',[project.id,alice,project])
    assert.equal((await db.query('select * from projects')).rows.length,1)
    await assert.rejects(db.query('insert into projects(id,owner_id,data) values ($1,$2,$3)',['forged',bob,{...project,id:'forged',ownerId:bob}]))
    await assert.rejects(db.query('insert into projects(id,owner_id,data) values ($1,$2,$3)',['self-approve',alice,{...project,id:'self-approve',status:'Approved'}]))
    await assert.rejects(db.query('insert into projects(id,owner_id,data) values ($1,$2,$3)',['missing',alice,{id:'missing',ownerId:alice}]))
    await assert.rejects(db.query('insert into projects(id,owner_id,data) values ($1,$2,$3)',['fake-participant',alice,{...project,id:'fake-participant',eventYears:['2026']}]))
    await assert.rejects(db.query("update projects set data=jsonb_set(data,'{status}','\"Approved\"') where id=$1",[project.id]))
    await assert.rejects(db.query("update projects set data=jsonb_set(data,'{visible}','true') where id=$1",[project.id]))
    await assert.rejects(db.query('insert into app_admins(user_id) values ($1)',[alice]))
    assert.equal((await db.query('select is_admin() as value')).rows[0].value,false)
    await assert.rejects(db.exec('truncate projects'))
    await login(bob)
    assert.equal((await db.query('select * from projects')).rows.length,0)
    assert.equal((await db.query("update projects set data=jsonb_set(data,'{name}','\"Stolen\"') where id=$1 returning id",[project.id])).rows.length,0)
    await login(null,'anon')
    assert.equal((await db.query('select * from projects')).rows.length,0)
    await login(admin)
    assert.equal((await db.query('select is_admin() as value')).rows[0].value,true)
    await db.query("update projects set data=data || '{\"status\":\"Approved\",\"visible\":true}'::jsonb where id=$1",[project.id])
    await login(null,'anon')
    assert.equal((await db.query('select * from projects')).rows.length,0,'approval alone must not override publication consent')
    await login(alice)
    await db.query("update projects set data=data || '{\"publication\":true,\"name\":\"Community arts\"}'::jsonb where id=$1",[project.id])
    await login(null,'anon')
    assert.equal((await db.query('select * from projects')).rows.length,1)
    await login(bob)
    assert.equal((await db.query("update projects set data=jsonb_set(data,'{name}','\"Stolen\"') where id=$1 returning id",[project.id])).rows.length,0,'public visibility must not allow editing')
    const event={id:'event-a',title:'Showcase',date:'2026-11-13',place:'Campus',published:true}
    await assert.rejects(db.query('insert into events(id,data) values ($1,$2)',[event.id,event]))
    await login(admin)
    await db.query('insert into events(id,data) values ($1,$2)',[event.id,event])
    await login(alice)
    await db.query('insert into event_registrations(event_id,user_id) values ($1,$2)',[event.id,alice])
    await assert.rejects(db.query('insert into event_registrations(event_id,user_id) values ($1,$2)',[event.id,alice]))
    await assert.rejects(db.query('insert into event_registrations(event_id,user_id) values ($1,$2)',[event.id,bob]))
    await login(bob)
    assert.equal((await db.query('select * from event_registrations')).rows.length,0)
    await login(admin)
    assert.equal((await db.query('select * from event_registrations')).rows.length,1)
    await db.query("update events set data=jsonb_set(data,'{published}','false') where id=$1",[event.id])
    await login(bob)
    await assert.rejects(db.query('insert into event_registrations(event_id,user_id) values ($1,$2)',[event.id,bob]))
  } finally {await db.close()}
})

test('profiles are created automatically and isolated', async () => {
  const db = new PGlite()
  const alice = '00000000-0000-0000-0000-000000000011'
  const bob = '00000000-0000-0000-0000-000000000012'
  const admin = '00000000-0000-0000-0000-000000000013'
  const noName = '00000000-0000-0000-0000-000000000014'
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key, raw_user_meta_data jsonb not null default '{}'::jsonb);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth,public to anon,authenticated;
      grant execute on function auth.uid() to anon,authenticated;`)
    await db.query(
      `insert into auth.users(id, raw_user_meta_data)
       values ($1, '{"display_name":"Alice"}'), ($2, '{}'), ($3, '{"display_name":"Admin"}')`,
      [alice, bob, admin],
    )
    await db.exec(await readFile(new URL('../supabase/migrations/20261022_accounts.sql', import.meta.url), 'utf8'))
    await db.query('insert into public.app_admins(user_id) values ($1)', [admin])
    await db.exec(await readFile(new URL('../supabase/migrations/20261023071333_database_foundation.sql', import.meta.url), 'utf8'))

    const login = async (id, role = 'authenticated') => {
      await db.exec('reset role')
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id ?? ''])
      await db.exec(`set role ${role}`)
    }

    await login(alice)
    assert.deepEqual(
      (await db.query('select user_id, display_name from profiles order by user_id')).rows,
      [{ user_id: alice, display_name: 'Alice' }],
    )
    await db.query("update profiles set display_name='Alicia' where user_id=$1", [alice])
    assert.equal((await db.query('select display_name from profiles')).rows[0].display_name, 'Alicia')

    await login(bob)
    assert.deepEqual(
      (await db.query('select user_id from profiles order by user_id')).rows,
      [{ user_id: bob }],
    )
    assert.equal(
      (await db.query("update profiles set display_name='Stolen' where user_id=$1 returning user_id", [alice])).rows.length,
      0,
    )

    await db.exec('reset role')
    await db.query('insert into auth.users(id) values ($1)', [noName])
    await login(noName)
    assert.equal((await db.query('select display_name from profiles')).rows[0].display_name, '')

    await login(null, 'anon')
    await assert.rejects(db.query('select * from profiles'))

    await login(admin)
    assert.equal((await db.query('select * from profiles')).rows.length, 4)
  } finally {
    await db.close()
  }
})

test('publication consent is versioned append-only and controls public reads', async () => {
  const { db, users, login } = await createFoundationDatabase()
  try {
    const project = foundationProject('consented-project', users.alice)
    await login(users.alice)
    await db.query('insert into projects(id,owner_id,data) values ($1,$2,$3)', [project.id, users.alice, project])
    assert.equal((await db.query('select * from publication_consents')).rows.length, 1)
    assert.equal((await db.query('select project_has_current_consent($1) as value', [project.id])).rows[0].value, true)

    await login(null, 'anon')
    assert.equal((await db.query('select project_has_current_consent($1) as value', [project.id])).rows[0].value, false)
    await login(users.bob)
    assert.equal((await db.query('select project_has_current_consent($1) as value', [project.id])).rows[0].value, false)
    await login(users.alice)

    await db.query("update projects set data=jsonb_set(data,'{name}','\"Arts collective\"') where id=$1", [project.id])
    assert.equal((await db.query('select * from publication_consents')).rows.length, 1)

    await assert.rejects(
      db.query(
        `insert into publication_consents(project_id,user_id,granted,policy_version,policy_document,recorded_at,source)
         values ($1,$2,true,'2026-10-22','startup-publication-consent',now(),'frontend')`,
        [project.id, users.alice],
      ),
    )
    await assert.rejects(db.query('update publication_consents set granted=false where project_id=$1', [project.id]))
    await assert.rejects(db.query('delete from publication_consents where project_id=$1', [project.id]))

    await login(users.admin)
    await db.query("update projects set data=data || '{\"status\":\"Approved\",\"visible\":true}'::jsonb where id=$1", [project.id])
    assert.equal((await db.query('select * from publication_consents')).rows.length, 1)

    await login(null, 'anon')
    assert.equal((await db.query('select id from projects where id=$1', [project.id])).rows.length, 1)

    await login(users.bob)
    assert.equal((await db.query('select * from publication_consents')).rows.length, 0)

    await login(users.alice)
    const withdrawnAt = new Date().toISOString()
    await db.query(
      `update projects
       set data=data || jsonb_build_object('publication',false,'consentAt',$2::text)
       where id=$1`,
      [project.id, withdrawnAt],
    )
    assert.equal((await db.query('select * from publication_consents')).rows.length, 2)
    assert.equal((await db.query('select project_has_current_consent($1) as value', [project.id])).rows[0].value, false)

    await login(null, 'anon')
    assert.equal((await db.query('select id from projects where id=$1', [project.id])).rows.length, 0)

    await login(users.admin)
    assert.equal((await db.query('select * from publication_consents')).rows.length, 2)
    await assert.rejects(
      db.query(
        `update projects
         set data=data || jsonb_build_object('publication',true,'consentAt',$2::text)
         where id=$1`,
        [project.id, new Date().toISOString()],
      ),
    )
  } finally {
    await db.close()
  }
})

test('project payload rejects unsafe keys and invalid consent metadata', async () => {
  const { db, users, login } = await createFoundationDatabase()
  try {
    await login(users.alice)
    const insert = (id, overrides = {}) => {
      const project = foundationProject(id, users.alice, overrides)
      return db.query('insert into projects(id,owner_id,data) values ($1,$2,$3)', [id, users.alice, project])
    }

    await assert.rejects(insert('unknown-key', { internalNotes: 'must stay private' }))
    await assert.rejects(insert('missing-version', { consentVersion: undefined }))
    await assert.rejects(insert('malformed-time', { consentAt: 'not-a-timestamp' }))
    await assert.rejects(insert('relative-time', { consentAt: 'now' }))
    await assert.rejects(insert('infinite-time', { consentAt: '-infinity' }))
    await assert.rejects(insert('date-only', { consentAt: '2020-01-01' }))
    await assert.rejects(insert('stale-policy', { consentVersion: '2026-01-01' }))
    await assert.rejects(insert('future-time', { consentAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() }))
    await insert('valid-consent')
    assert.equal((await db.query("select count(*)::int as count from projects where id='valid-consent'")).rows[0].count, 1)
  } finally {
    await db.close()
  }
})

test('privileged helpers are private without breaking admin checks', async () => {
  const { db, users, login } = await createFoundationDatabase()
  try {
    await db.exec(await readFile(storageSecurityMigration, 'utf8'))

    await login(users.alice)
    assert.equal((await db.query('select private.is_admin() as value')).rows[0].value, false)
    assert.equal((await db.query('select public.is_admin() as value')).rows[0].value, false)

    await login(users.admin)
    assert.equal((await db.query('select private.is_admin() as value')).rows[0].value, true)
    assert.equal((await db.query('select public.is_admin() as value')).rows[0].value, true)

    await db.exec('reset role')
    assert.equal(
      (
        await db.query(
          `select count(*)::int as count
           from pg_proc procedure
           join pg_namespace namespace on namespace.oid = procedure.pronamespace
           where namespace.nspname = 'public'
             and procedure.proname = 'project_has_current_consent'`,
        )
      ).rows[0].count,
      0,
    )
    assert.deepEqual(
      (
        await db.query(
          `select procedure.proname
           from pg_proc procedure
           join pg_namespace namespace on namespace.oid = procedure.pronamespace
           where namespace.nspname = 'public'
             and procedure.prosecdef
             and (
               has_function_privilege('anon', procedure.oid, 'EXECUTE')
               or has_function_privilege('authenticated', procedure.oid, 'EXECUTE')
             )
           order by procedure.proname`,
        )
      ).rows,
      [],
    )
  } finally {
    await db.close()
  }
})

test('migration backfills only valid current-policy consent', async () => {
  const db = new PGlite()
  const alice = '00000000-0000-0000-0000-000000000031'
  const admin = '00000000-0000-0000-0000-000000000032'
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key, raw_user_meta_data jsonb not null default '{}'::jsonb);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth,public to anon,authenticated;
      grant execute on function auth.uid() to anon,authenticated;`)
    await db.query('insert into auth.users(id) values ($1),($2)', [alice, admin])
    await db.exec(await readFile(accountMigration, 'utf8'))
    await db.query('insert into public.app_admins(user_id) values ($1)', [admin])
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [alice])
    await db.exec('set role authenticated')
    for (const project of [
      foundationProject('legacy-grant', alice),
      foundationProject('legacy-withdrawal', alice, { publication: false }),
      foundationProject('legacy-stale', alice, { consentVersion: '2026-01-01' }),
      foundationProject('legacy-malformed', alice, { consentAt: 'not-a-timestamp' }),
      foundationProject('legacy-impossible-date', alice, { consentAt: '2026-99-99T00:00:00Z' }),
    ]) {
      await db.query('insert into projects(id,owner_id,data) values ($1,$2,$3)', [project.id, alice, project])
    }
    await db.exec('reset role')
    await db.exec(await readFile(foundationMigration, 'utf8'))
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [admin])
    await db.exec('set role authenticated')
    assert.deepEqual(
      (await db.query('select project_id, granted from publication_consents order by project_id')).rows,
      [
        { project_id: 'legacy-grant', granted: true },
        { project_id: 'legacy-withdrawal', granted: false },
      ],
    )
  } finally {
    await db.close()
  }
})

test('only admins assign projects to events', async () => {
  const { db, users, login } = await createFoundationDatabase()
  try {
    const project = foundationProject('event-project', users.alice)
    await login(users.alice)
    await db.query('insert into projects(id,owner_id,data) values ($1,$2,$3)', [project.id, users.alice, project])

    await login(users.admin)
    for (const event of [
      { id: 'demo-day', title: 'Demo Day', date: '2026-11-13', place: 'Campus', published: true },
      { id: 'winter-showcase', title: 'Winter Showcase', date: '2026-12-05', place: 'Campus', published: true },
    ]) {
      await db.query('insert into events(id,data) values ($1,$2)', [event.id, event])
    }

    await login(users.alice)
    await assert.rejects(
      db.query('insert into project_events(project_id,event_id,assigned_by) values ($1,$2,$3)', [project.id, 'demo-day', users.alice]),
    )
    await login(users.bob)
    await assert.rejects(
      db.query('insert into project_events(project_id,event_id,assigned_by) values ($1,$2,$3)', [project.id, 'demo-day', users.bob]),
    )

    await login(users.admin)
    await db.query(
      `insert into project_events(project_id,event_id,assigned_by)
       values ($1,$2,$4),($1,$3,$4)`,
      [project.id, 'demo-day', 'winter-showcase', users.admin],
    )

    await login(users.alice)
    assert.equal((await db.query('select * from project_events')).rows.length, 2)
    assert.equal(
      (await db.query('delete from project_events where project_id=$1 returning event_id', [project.id])).rows.length,
      0,
    )
    assert.equal((await db.query('select * from project_events')).rows.length, 2)

    await login(users.bob)
    assert.equal((await db.query('select * from project_events')).rows.length, 0)
    await login(null, 'anon')
    assert.equal((await db.query('select * from project_events')).rows.length, 0)

    await login(users.admin)
    await db.query("update projects set data=data || '{\"status\":\"Approved\",\"visible\":true}'::jsonb where id=$1", [project.id])
    await login(null, 'anon')
    assert.equal((await db.query('select event_id from project_events order by event_id')).rows.length, 2)

    await login(users.admin)
    await db.query("update events set data=jsonb_set(data,'{published}','false') where id='winter-showcase'")
    await login(null, 'anon')
    assert.deepEqual((await db.query('select event_id from project_events')).rows, [{ event_id: 'demo-day' }])

    await login(users.admin)
    assert.equal(
      (await db.query("delete from project_events where project_id=$1 and event_id='winter-showcase' returning event_id", [project.id])).rows.length,
      1,
    )
  } finally {
    await db.close()
  }
})

test('legacy eventYears backfill links only unique event years and is idempotent', async () => {
  const db = new PGlite()
  const alice = '00000000-0000-0000-0000-000000000041'
  const admin = '00000000-0000-0000-0000-000000000042'
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key, raw_user_meta_data jsonb not null default '{}'::jsonb);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth,public to anon,authenticated;
      grant execute on function auth.uid() to anon,authenticated;`)
    await db.query('insert into auth.users(id) values ($1),($2)', [alice, admin])
    await db.exec(await readFile(accountMigration, 'utf8'))
    await db.query('insert into public.app_admins(user_id) values ($1)', [admin])

    for (const event of [
      { id: 'unique-2025', date: '2025-11-10', published: true },
      { id: 'first-2026', date: '2026-05-01', published: true },
      { id: 'second-2026', date: '2026-11-13', published: true },
    ]) {
      await db.query('insert into events(id,data) values ($1,$2)', [event.id, event])
    }
    const project = foundationProject('legacy-event-project', alice, {
      publication: false,
      eventYears: ['2025', '2026', '2027'],
    })
    await db.query('insert into projects(id,owner_id,data) values ($1,$2,$3)', [project.id, alice, project])

    await db.exec(await readFile(foundationMigration, 'utf8'))
    assert.deepEqual(
      (await db.query('select project_id, event_id, assigned_by from project_events')).rows,
      [{ project_id: project.id, event_id: 'unique-2025', assigned_by: null }],
    )
    await db.exec('select public.backfill_legacy_project_events()')
    assert.equal((await db.query('select * from project_events')).rows.length, 1)
  } finally {
    await db.close()
  }
})
