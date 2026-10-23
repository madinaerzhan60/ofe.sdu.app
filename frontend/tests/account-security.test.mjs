import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

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
