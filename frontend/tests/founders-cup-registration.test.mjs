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
    // A designer on one team can register a separate solo project.
    const soloId = (await db.query(team())).rows[0].id
    assert.deepEqual(new Set((await db.query('select id from public.event_teams')).rows.map(row => row.id)), new Set([teamId, soloId]))
    assert.deepEqual((await db.query('select email, is_captain from public.event_team_members where team_id=$1', [soloId])).rows, [
      { email: people.member[1], is_captain: true },
    ])
    await assert.rejects(db.query(team()), /event_teams_event_id_captain_id_key/)
    assert.equal((await db.query("update public.event_teams set team_name='My Solo Project' where id=$1 returning id", [soloId])).rows.length, 1)

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

    await as('other')
    const otherTeamId = (await db.query(team())).rows[0].id
    // A second joined team is still blocked, regardless of the role label.
    await assert.rejects(db.query("insert into public.event_team_members(team_id,email,role) values ($1,$2,'Co-founder')", [otherTeamId, people.member[1]]), /event_team_members_one_guest_per_event_idx/)
    // The reverse order also works: an existing captain can join a team.
    await db.query("insert into public.event_team_members(team_id,email,role) values ($1,$2,'Co-founder')", [otherTeamId, people.captain[1]])
    await as('captain')
    assert.deepEqual(new Set((await db.query('select id from public.event_teams')).rows.map(row => row.id)), new Set([teamId, otherTeamId]))
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

test('catalogue publishes confirmed products with exact event IDs, never private registration data', async () => {
  const {db,as,login} = await setup()
  try {
    await as('captain')
    const first = (await db.query(team())).rows[0].id
    await as('other')
    const pending = (await db.query(team())).rows[0].id
    await as('admin')
    await db.query("update public.event_teams set status='confirmed',admin_note='Private reviewer note' where id=$1",[first])
    await login(null)
    const rows = (await db.query('select * from public.list_confirmed_event_projects()')).rows
    assert.equal(rows.length,1)
    assert.equal(rows[0].id,`event-team-${first}`)
    assert.equal(rows[0].event_id,'current')
    assert.deepEqual(Object.keys(rows[0].data).sort(),['about','createdAt','description','industry','name','product','stage','team'])
    assert.equal(rows[0].data.name,'Campus Eats')
    await assert.rejects(db.query('select * from public.event_teams'))
    await assert.rejects(db.query('select * from public.event_team_members'))

    await as('admin')
    // Same calendar year is not an event relationship.
    await db.query("insert into public.events(id,data) values ('second',$1)", [{id:'second',title:'Second event',date:'2099-12-01',place:'SDU',published:true}])
    await as('captain')
    const second = (await db.query(team('second'))).rows[0].id
    await as('admin')
    await db.query("update public.event_teams set status='confirmed' where id=$1",[second])
    await login(null)
    assert.deepEqual((await db.query('select event_id from public.list_confirmed_event_projects() order by event_id')).rows,[{event_id:'current'},{event_id:'second'}])
    await as('admin')
    await db.query("update public.events set data=jsonb_set(data,'{published}','false') where id='second'")
    await db.query("update public.event_teams set status='rejected' where id=$1",[pending])
    await login(null)
    assert.equal((await db.query('select * from public.list_confirmed_event_projects()')).rows.length,1)
    // An edit resets confirmation and removes the public card immediately.
    await as('captain')
    await db.query("update public.event_teams set tagline='Updated product needs another review' where id=$1",[first])
    await login(null)
    assert.equal((await db.query('select * from public.list_confirmed_event_projects()')).rows.length,0)
  } finally {await db.close()}
})

test('project event assignment is admin-only and rolls back invalid changes', async () => {
  const {db,as,login} = await setup()
  try {
    await as('captain')
    await db.query("insert into public.projects(id,owner_id,data) values ('assigned-project',$1,$2)", [people.captain[0], {
      id:'assigned-project',ownerId:people.captain[0],name:'Project',description:'Description',industry:'EdTech',stage:'Idea',team:'Team',product:'',
      status:'Pending',visible:false,publication:false,consentVersion:'2026-10-22',consentAt:new Date().toISOString(),feedback:''
    }])
    await login(null)
    await assert.rejects(db.query("select public.set_project_events('assigned-project',array['current'])"), /permission/)
    await as('captain')
    await assert.rejects(db.query("select public.set_project_events('assigned-project',array['current'])"), /administrators/)
    await as('admin')
    await db.query("select public.set_project_events('assigned-project',array['current','current'])")
    assert.deepEqual((await db.query("select event_id from public.project_events where project_id='assigned-project'")).rows,[{event_id:'current'}])
    await assert.rejects(db.query("select public.set_project_events('assigned-project',array['missing-event'])"), /foreign key/)
    assert.deepEqual((await db.query("select event_id from public.project_events where project_id='assigned-project'")).rows,[{event_id:'current'}])
    await db.query("select public.set_project_events('assigned-project',array[]::text[])")
    assert.equal((await db.query('select * from public.project_events')).rows.length,0)
  } finally {await db.close()}
})

test('optional event covers stay private until confirmation and cannot be overwritten or shared across teams', async () => {
  const {db,as,login,operation} = await setup()
  const imageId = '91c2831b-10f5-43f1-9199-f421a368aa12'
  try {
    await as('captain')
    const teamId = (await db.query(team())).rows[0].id
    const image = `current/${teamId}/${imageId}.webp`
    const replacement = `current/${teamId}/91c2831b-10f5-43f1-9199-f421a368aa13.png`
    const staged = `current/${teamId}/91c2831b-10f5-43f1-9199-f421a368aa14.webp`
    await operation('storage.object.upload')
    await db.query("insert into storage.objects(bucket_id,name) values ('event-covers',$1),('event-covers',$2),('event-covers',$3)",[image,replacement,staged])
    await assert.rejects(db.query("insert into storage.objects(bucket_id,name) values ('event-covers',$1)",[`closed/${teamId}/${imageId}.webp`]))
    await assert.rejects(db.query("insert into storage.objects(bucket_id,name) values ('event-covers',$1)",[`current/${teamId}/${imageId}.svg`]))
    await db.query('update public.event_teams set cover_path=$1 where id=$2',[image,teamId])
    await db.query("insert into public.event_team_members(team_id,email,role) values ($1,$2,'Design')",[teamId,people.member[1]])
    await assert.rejects(db.query('update public.event_teams set cover_path=$1 where id=$2',[`current/${teamId}/91c2831b-10f5-43f1-9199-f421a368aa15.webp`,teamId]),/Upload the cover/)
    await as('member')
    await operation('storage.object.get_authenticated')
    assert.equal((await db.query("select name from storage.objects where bucket_id='event-covers'")).rows.length,3)
    await operation('storage.object.upload')
    await assert.rejects(db.query("insert into storage.objects(bucket_id,name) values ('event-covers',$1)",[`current/${teamId}/91c2831b-10f5-43f1-9199-f421a368aa16.webp`]))
    await as('stranger')
    await operation('storage.object.get_authenticated')
    assert.equal((await db.query("select name from storage.objects where bucket_id='event-covers'")).rows.length,0)
    await login(null)
    assert.equal((await db.query("select name from storage.objects where bucket_id='event-covers'")).rows.length,0)
    await as('admin')
    await db.query("update public.event_teams set status='confirmed' where id=$1",[teamId])
    await login(null)
    assert.deepEqual((await db.query("select name from storage.objects where bucket_id='event-covers'")).rows,[{name:image}])
    assert.equal((await db.query('select data from public.list_confirmed_event_projects()')).rows[0].data.cover,`event-cover://${image}`)
    await operation('storage.object.sign')
    assert.equal((await db.query("select name from storage.objects where bucket_id='event-covers'")).rows.length,0)
    await as('captain')
    await operation('storage.object.upload')
    assert.equal((await db.query("update storage.objects set name=$1 where bucket_id='event-covers' and name=$1 returning name",[image])).rows.length,0)
    await operation('storage.object.delete')
    assert.equal((await db.query("delete from storage.objects where name=$1 returning name",[image])).rows.length,0)
    await db.query('update public.event_teams set cover_path=$1 where id=$2',[replacement,teamId])
    assert.equal((await db.query('select status from public.event_teams where id=$1',[teamId])).rows[0].status,'submitted')
    assert.equal((await db.query("delete from storage.objects where name=$1 returning name",[image])).rows.length,1)
    await login(null)
    await operation('storage.object.get_authenticated')
    assert.equal((await db.query("select name from storage.objects where bucket_id='event-covers'")).rows.length,0)
    await as('admin')
    await db.query("update public.event_teams set status='confirmed' where id=$1",[teamId])
    await login(null)
    assert.deepEqual((await db.query("select name from storage.objects where bucket_id='event-covers'")).rows,[{name:replacement}])
    await as('captain')
    await db.query('update public.event_teams set cover_path=null where id=$1',[teamId])
    await as('admin')
    await db.query("update public.event_teams set status='confirmed' where id=$1",[teamId])
    await login(null)
    const data = (await db.query('select data from public.list_confirmed_event_projects()')).rows[0].data
    assert.equal(Object.hasOwn(data,'cover'),false)
    assert.equal((await db.query("select name from storage.objects where bucket_id='event-covers'")).rows.length,0)
  } finally {await db.close()}
})

test('only administrators remove and restore ordinary projects; public data and media disappear together', async () => {
  const {db,as,login,operation} = await setup()
  const projectId='removal-project'
  const image=`${people.captain[0]}/${projectId}/cover.webp`
  try {
    await as('captain')
    const payload={id:projectId,ownerId:people.captain[0],name:'Project to remove',description:'A project with consent and a cover',team:'Team',industry:'EdTech',stage:'Idea',product:'',status:'Pending',visible:false,publication:true,consentVersion:'2026-10-22',consentAt:new Date().toISOString(),feedback:''}
    await db.query('insert into public.projects(id,owner_id,data) values ($1,$2,$3)',[projectId,people.captain[0],payload])
    await operation('storage.object.upload')
    await db.query("insert into storage.objects(bucket_id,name) values ('startup-media',$1)",[image])
    await as('admin')
    await db.query("update public.projects set data=data||'{\"status\":\"Approved\",\"visible\":true}' where id=$1",[projectId])
    await login(null)
    assert.equal((await db.query('select id from public.projects')).rows.length,1)
    await assert.rejects(db.query("select public.set_workspace_project_removed($1,'project',true)",[projectId]),/permission/)
    await as('captain')
    await assert.rejects(db.query("select public.set_workspace_project_removed($1,'project',true)",[projectId]),/administrators/)
    await assert.rejects(db.query('insert into private.removed_projects(project_id) values ($1)',[projectId]),/permission/)
    await as('admin')
    await db.query("select public.set_workspace_project_removed($1,'project',true)",[projectId])
    await db.query("select public.set_workspace_project_removed($1,'project',true)",[projectId])
    assert.deepEqual((await db.query('select * from public.list_removed_workspace_projects()')).rows,[{kind:'project',target_id:projectId}])
    assert.equal((await db.query('select id from public.publication_consents')).rows.length,1)
    await login(null)
    await operation('storage.object.get_authenticated')
    assert.equal((await db.query('select id from public.projects')).rows.length,0)
    assert.equal((await db.query("select name from storage.objects where bucket_id='startup-media'")).rows.length,0)
    await as('captain')
    assert.equal((await db.query('select id from public.projects')).rows.length,0)
    assert.equal((await db.query('select * from public.list_removed_workspace_projects()')).rows.length,0)
    assert.equal((await db.query("update public.projects set data=jsonb_set(data,'{name}','\"Bypass\"') where id=$1 returning id",[projectId])).rows.length,0)
    await assert.rejects(db.query("select public.set_workspace_project_removed($1,'project',false)",[projectId]),/administrators/)
    await as('admin')
    await db.query("select public.set_workspace_project_removed($1,'project',false)",[projectId])
    await assert.rejects(db.query("select public.set_workspace_project_removed('missing','project',true)"),/not found/)
    await login(null)
    assert.equal((await db.query('select id from public.projects')).rows.length,1)
    assert.deepEqual((await db.query("select name from storage.objects where bucket_id='startup-media'")).rows,[{name:image}])
  } finally {await db.close()}
})

test('removed Founders Cup projects, member data, covers and presentations stay hidden until admin restoration', async()=>{
  const {db,as,login,operation}=await setup()
  try{
    await as('captain')
    const teamId=(await db.query(team())).rows[0].id
    const cover=`current/${teamId}/91c2831b-10f5-43f1-9199-f421a368aa12.png`
    const deck=`current/${teamId}/91c2831b-10f5-43f1-9199-f421a368aa13.pdf`
    await operation('storage.object.upload')
    await db.query("insert into storage.objects(bucket_id,name) values ('event-covers',$1),('event-presentations',$2)",[cover,deck])
    await db.query('update public.event_teams set cover_path=$1,presentation_path=$2 where id=$3',[cover,deck,teamId])
    await db.query("insert into public.event_team_members(team_id,email,role) values ($1,$2,'Design')",[teamId,people.member[1]])
    await assert.rejects(db.query("select public.set_workspace_project_removed($1,'event-team',true)",[teamId]),/administrators/)
    await as('admin')
    await db.query("update public.event_teams set status='confirmed' where id=$1",[teamId])
    await db.query("select public.set_workspace_project_removed($1,'event-team',true)",[teamId])
    assert.equal((await db.query('select * from public.list_removed_workspace_projects()')).rows[0].target_id,teamId)
    await login(null)
    await operation('storage.object.get_authenticated')
    assert.equal((await db.query('select * from public.list_confirmed_event_projects()')).rows.length,0)
    assert.equal((await db.query("select name from storage.objects where bucket_id='event-covers'")).rows.length,0)
    for(const actor of ['captain','member']){
      await as(actor)
      assert.equal((await db.query('select id from public.event_teams')).rows.length,0)
      assert.equal((await db.query('select email from public.event_team_members')).rows.length,0)
      assert.equal((await db.query("select name from storage.objects where bucket_id in ('event-covers','event-presentations')")).rows.length,0)
      await assert.rejects(db.query("select public.set_workspace_project_removed($1,'event-team',false)",[teamId]),/administrators/)
    }
    await as('admin')
    assert.equal((await db.query("select name from storage.objects where bucket_id in ('event-covers','event-presentations')")).rows.length,2)
    await db.query("select public.set_workspace_project_removed($1,'event-team',false)",[teamId])
    await login(null)
    assert.equal((await db.query('select * from public.list_confirmed_event_projects()')).rows.length,1)
    assert.deepEqual((await db.query("select name from storage.objects where bucket_id='event-covers'")).rows,[{name:cover}])
  }finally{await db.close()}
})
