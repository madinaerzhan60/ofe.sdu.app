import { test } from 'node:test'
import assert from 'node:assert/strict'
import { supabaseDatabase } from './helpers/database.mjs'

const id = n => `00000000-0000-0000-0000-0000000002${String(n).padStart(2, '0')}`
const people = {
  captain: [id(1), '250107056@sdu.edu.kz'],
  member: [id(2), '250107057@sdu.edu.kz'],
  stranger: [id(3), '250107058@sdu.edu.kz'],
  admin: [id(4), 'ofe.admin@sdu.edu.kz'],
  other: [id(5), '250107059@sdu.edu.kz'],
}

async function setup() {
  const env = await supabaseDatabase({ users: Object.fromEntries(Object.values(people)), admins: [people.admin[0]] })
  const { db } = env
  await db.query(`insert into public.events(id,data) values
    ('current', $1), ('closed', $2), ('hidden', $3)`, [
    { id: 'current', title: 'SDU FOUNDERS CUP', date: '2099-11-21', place: 'SDU', published: true },
    { id: 'closed', title: 'Past cup', date: '2020-11-21', place: 'SDU', published: true },
    { id: 'hidden', title: 'Draft', date: '2099-11-21', place: 'SDU', published: false },
  ])
  const as = who => env.login(...people[who])
  return { ...env, as }
}

const team = (event = 'current', extra = '') => `insert into public.event_teams(event_id, team_name, product_name, tagline, description, industry, stage, telegram, phone, consent${extra ? ',' + extra : ''})
  values ('${event}', 'Campus Eats', 'Campus Eats', 'Food from campus cafes to your classroom', '${'A delivery service for SDU students that brings food from campus cafes. '.repeat(2)}', 'FoodTech', 'MVP', '@campus_eats', '+77011234567', true) returning id, captain_email, status`

test('only @sdu.edu.kz accounts can exist', async () => {
  const { db } = await setup()
  try {
    await assert.rejects(db.query("insert into auth.users(id,email) values ($1,'someone@gmail.com')", [id(50)]), /sdu\.edu\.kz/)
    await assert.rejects(db.query("insert into auth.users(id,email) values ($1,'x@sdu.edu.kz.evil.com')", [id(51)]), /sdu\.edu\.kz/)
    await assert.rejects(db.query("insert into auth.users(id,email) values ($1,null)", [id(52)]), /sdu\.edu\.kz/)
    await db.query("insert into auth.users(id,email) values ($1,'New.Student@SDU.edu.kz')", [id(53)])
    await assert.rejects(db.query("update auth.users set email='moved@mail.ru' where id=$1", [id(53)]), /sdu\.edu\.kz/)
    const hook = async email => (await db.query('select public.sdu_before_user_created_hook($1) as r', [{ user: { email } }])).rows[0].r
    assert.deepEqual(await hook('250107056@sdu.edu.kz'), {})
    assert.equal((await hook('a@gmail.com')).error.http_code, 403)
  } finally { await db.close() }
})

test('captains register teams by SDU email; teams stay private', async () => {
  const { db, as, login } = await setup()
  try {
    await as('captain')
    const created = (await db.query(team())).rows[0]
    assert.equal(created.captain_email, '250107056@sdu.edu.kz')
    assert.equal(created.status, 'submitted')
    const teamId = created.id
    // Server-owned fields cannot be supplied.
    await assert.rejects(db.query("insert into public.event_teams(event_id,team_name,product_name,tagline,description,industry,stage,telegram,phone,consent,status) values ('current','Team B','Product','Short product tagline',$1,'IT','Idea','@team_b1','+77011234567',true,'confirmed')", ['x'.repeat(60)]), /permission/)
    await assert.rejects(db.query("insert into public.event_teams(event_id,team_name,product_name,tagline,description,industry,stage,telegram,phone,consent,captain_id) values ('current','Team B','Product','Short product tagline',$1,'IT','Idea','@team_b1','+77011234567',true,$2)", ['x'.repeat(60), people.stranger[0]]), /permission/)
    await assert.rejects(db.query(team()), /duplicate|unique/i)
    await assert.rejects(db.query(team('hidden')))
    await assert.rejects(db.query(team('closed')))

    await db.query("insert into public.event_team_members(team_id,email,role) values ($1,'250107057@SDU.edu.kz','Design')", [teamId])
    await assert.rejects(db.query("insert into public.event_team_members(team_id,email,role) values ($1,'friend@gmail.com','Design')", [teamId]))
    for (let i = 60; i < 64; i++) await db.query("insert into public.event_team_members(team_id,email,role) values ($1,$2,'Development')", [teamId, `2501070${i}@sdu.edu.kz`])
    await assert.rejects(db.query("insert into public.event_team_members(team_id,email,role) values ($1,'250107099@sdu.edu.kz','Design')", [teamId]), /at most 6/)
    await assert.rejects(db.query("delete from public.event_team_members where team_id=$1 and is_captain", [teamId]), /captain/)
    await assert.rejects(db.query("update public.event_teams set status='confirmed' where id=$1", [teamId]), /administrators/)
    await db.query("update public.event_teams set tagline='Fresh food from campus cafes, delivered fast' where id=$1", [teamId])

    await as('member')
    assert.equal((await db.query('select id from public.event_teams')).rows.length, 1)
    assert.equal((await db.query('select email from public.event_team_members')).rows.length, 6)
    assert.equal((await db.query("update public.event_teams set team_name='Hijacked' where id=$1 returning id", [teamId])).rows.length, 0)
    // A member of one team cannot captain another team in the same event.
    await assert.rejects(db.query(team()), /duplicate|unique/i)

    await as('stranger')
    assert.equal((await db.query('select id from public.event_teams')).rows.length, 0)
    assert.equal((await db.query('select email from public.event_team_members')).rows.length, 0)
    await assert.rejects(db.query("insert into public.event_team_members(team_id,email,role) values ($1,'250107058@sdu.edu.kz','Design')", [teamId]))
    assert.equal((await db.query('delete from public.event_teams returning id')).rows.length, 0)

    await login(null)
    await assert.rejects(db.query('select id from public.event_teams'))

    await as('admin')
    assert.equal((await db.query("update public.event_teams set status='confirmed', admin_note='See you on stage' where id=$1 returning status", [teamId])).rows[0].status, 'confirmed')
    await as('captain')
    assert.equal((await db.query("update public.event_teams set tagline='Campus food delivered to classrooms' where id=$1 returning status", [teamId])).rows[0].status, 'submitted')
  } finally { await db.close() }
})

test('registrations accept valid product URLs and enforce URL boundaries', async () => {
  const { db, as } = await setup()
  try {
    await as('captain')
    const { rows: [created] } = await db.query(`
      insert into public.event_teams (
        event_id, team_name, product_name, tagline, description,
        industry, stage, telegram, phone, consent, product_url
      ) values (
        'current', 'Campus Eats', 'Campus Eats', 'Food delivered across campus',
        $1, 'FoodTech', 'MVP', '@campus_eats', '+77011234567', true, $2
      ) returning id, product_url
    `, ['A campus delivery service connecting students with nearby cafes.'.repeat(2), 'https://campus.example'])
    assert.equal(created.product_url, 'https://campus.example')

    for (const url of [
      'https://abc',
      `https://${'a'.repeat(500)}`,
      `https://campus.example/${'a'.repeat(300)}`,
      'https://campus.example/product?lang=kk&tab=team#about',
      null,
    ]) {
      const result = await db.query('update public.event_teams set product_url=$1 where id=$2 returning product_url', [url, created.id])
      assert.equal(result.rows[0].product_url, url)
    }

    for (const url of [
      '',
      'https://ab',
      `https://${'a'.repeat(501)}`,
      'http://campus.example',
      'https://campus.example/white space',
      'https://campus.example/<script>',
      'https://campus.example/"quoted"',
    ]) {
      await assert.rejects(
        db.query('update public.event_teams set product_url=$1 where id=$2', [url, created.id]),
        /event_teams_product_url_check/,
      )
    }
  } finally { await db.close() }
})

test('presentations are private files in the team folder', async () => {
  const { db, as, operation, asOwner } = await setup()
  try {
    await as('captain')
    const teamId = (await db.query(team())).rows[0].id
    const file = `current/${teamId}/3f1c2b8a-1d2e-4f5a-9b8c-7d6e5f4a3b2c.pdf`
    await operation('storage.object.upload')
    await assert.rejects(db.query("insert into storage.objects(bucket_id,name) values ('event-presentations',$1)", [`current/${teamId}/deck.exe`]))
    await assert.rejects(db.query("insert into storage.objects(bucket_id,name) values ('event-presentations',$1)", [`closed/${teamId}/3f1c2b8a-1d2e-4f5a-9b8c-7d6e5f4a3b2c.pdf`]))
    await db.query("insert into storage.objects(bucket_id,name) values ('event-presentations',$1)", [file])
    await db.query('update public.event_teams set presentation_path=$1, presentation_name=$2 where id=$3', [file, 'Campus Eats.pdf', teamId])
    await assert.rejects(db.query('update public.event_teams set presentation_path=$1 where id=$2', ['current/other/evil.pdf', teamId]))
    await db.query("insert into public.event_team_members(team_id,email,role) values ($1,'250107057@sdu.edu.kz','Design')", [teamId])

    await operation('storage.object.get_authenticated')
    assert.equal((await db.query("select name from storage.objects where bucket_id='event-presentations'")).rows.length, 1)
    await operation('storage.object.get_signed')
    assert.equal((await db.query("select name from storage.objects where bucket_id='event-presentations'")).rows.length, 0)

    await as('member')
    await operation('storage.object.get_authenticated')
    assert.equal((await db.query("select name from storage.objects where bucket_id='event-presentations'")).rows.length, 1)
    await operation('storage.object.upload')
    await assert.rejects(db.query("insert into storage.objects(bucket_id,name) values ('event-presentations',$1)", [`current/${teamId}/0f1c2b8a-1d2e-4f5a-9b8c-7d6e5f4a3b2c.pdf`]))

    await as('stranger')
    await operation('storage.object.get_authenticated')
    assert.equal((await db.query("select name from storage.objects where bucket_id='event-presentations'")).rows.length, 0)
    await operation('storage.object.delete')
    assert.equal((await db.query("delete from storage.objects where bucket_id='event-presentations' returning id")).rows.length, 0)

    await as('admin')
    await operation('storage.object.get_authenticated')
    assert.equal((await db.query("select name from storage.objects where bucket_id='event-presentations'")).rows.length, 1)

    // After the deadline the team is locked for the captain.
    await asOwner()
    await db.query("update public.events set data = jsonb_set(data,'{registrationDeadline}','\"2020-01-01T00:00:00+05:00\"') where id='current'")
    await as('captain')
    await assert.rejects(db.query("update public.event_teams set team_name='Late change' where id=$1", [teamId]), /closed/)
    await operation('storage.object.upload')
    await assert.rejects(db.query("insert into storage.objects(bucket_id,name) values ('event-presentations',$1)", [`current/${teamId}/1f1c2b8a-1d2e-4f5a-9b8c-7d6e5f4a3b2c.pdf`]))
    assert.equal((await db.query('select public.event_registration_open($1) as open', ['current'])).rows[0].open, false)
  } finally { await db.close() }
})
