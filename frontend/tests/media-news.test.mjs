import { test } from 'node:test'
import assert from 'node:assert/strict'
import { supabaseDatabase } from './helpers/database.mjs'

const users = {
  owner: '00000000-0000-0000-0000-000000000101',
  member: '00000000-0000-0000-0000-000000000102',
  stranger: '00000000-0000-0000-0000-000000000103',
  admin: '00000000-0000-0000-0000-000000000104',
  media: '00000000-0000-0000-0000-000000000105',
}
const emails = {
  owner: 'owner@sdu.edu.kz', member: 'member@sdu.edu.kz', stranger: 'stranger@sdu.edu.kz',
  admin: 'admin@sdu.edu.kz', media: 'media@sdu.edu.kz',
}

async function database() {
  const { db, login: signIn } = await supabaseDatabase({
    users: Object.fromEntries(Object.entries(users).map(([key, id]) => [id, emails[key]])),
    admins: [users.admin],
    before: { '20261113120000_media_news_members_contacts.sql': async db => {
      await db.query("insert into auth.users(id,email) values ('00000000-0000-0000-0000-000000000199','unconfirmed@sdu.edu.kz')")
    } },
  })
  const login = who => signIn(who ? users[who] : null, who ? emails[who] : undefined)
  return { db, login }
}

const project = (id, ownerId) => ({
  id, ownerId, name: 'Campus app', description: 'Helps students', industry: 'EdTech', stage: 'Idea',
  team: 'Founder, Design', product: '', status: 'Pending', publication: false, consentVersion: '2026-10-22',
  consentAt: new Date().toISOString(), feedback: '', createdAt: new Date().toISOString(), visible: false, eventYears: [],
})
const post = (id, published) => ({ id, title: 'Hackathon results', category: 'hackathons', published, excerpt: '', body: '' })

test('only media editors and administrators publish news; visitors read published posts', async () => {
  const { db, login } = await database()
  try {
    await login('admin')
    await assert.rejects(db.query("select public.set_media_editor('someone@gmail.com', true)"), /sdu\.edu\.kz/)
    await assert.rejects(db.query("select public.set_media_editor('unconfirmed@sdu.edu.kz', true)"), /No confirmed account/)
    await db.query('select public.set_media_editor($1, true)', [emails.media.toUpperCase()])
    assert.deepEqual((await db.query('select email from public.list_media_editors()')).rows, [{ email: emails.media }])

    await login('stranger')
    await assert.rejects(db.query('select public.set_media_editor($1, true)', [emails.stranger]), /Administrator access/)
    await assert.rejects(db.query('select * from public.list_media_editors()'), /Administrator access/)
    await assert.rejects(db.query('insert into public.news(id,data) values ($1,$2)', ['n-1', post('n-1', true)]))

    await login('media')
    assert.equal((await db.query('select public.is_media_editor() as ok')).rows[0].ok, true)
    await db.query('insert into public.news(id,data) values ($1,$2),($3,$4)', ['n-1', post('n-1', true), 'n-2', post('n-2', false)])
    await assert.rejects(db.query('insert into public.news(id,author_id,data) values ($1,$2,$3)', ['n-3', users.stranger, post('n-3', true)]))
    await assert.rejects(db.query('insert into public.news(id,data) values ($1,$2)', ['n-4', { ...post('n-4', true), category: 'gossip' }]))
    assert.equal((await db.query('select count(*)::int as n from public.news')).rows[0].n, 2)

    await login(null)
    assert.deepEqual((await db.query('select id from public.news')).rows, [{ id: 'n-1' }])
    await login('stranger')
    assert.equal((await db.query("update public.news set data = jsonb_set(data,'{title}','\"Hacked\"') returning id")).rows.length, 0)
    assert.equal((await db.query('delete from public.news returning id')).rows.length, 0)

    await login('admin')
    await db.query('select public.set_media_editor($1, false)', [emails.media])
    await login('media')
    assert.equal((await db.query('select public.is_media_editor() as ok')).rows[0].ok, false)
    assert.deepEqual((await db.query('select id from public.news')).rows, [{ id: 'n-1' }])
  } finally {
    await db.close()
  }
})

test('project contacts stay private and members are added by SDU email', async () => {
  const { db, login } = await database()
  try {
    await login('owner')
    await db.query('insert into public.projects(id,owner_id,data) values ($1,$2,$3)', ['p-1', users.owner, project('p-1', users.owner)])
    await db.query("insert into public.project_contacts(project_id,telegram,phone) values ('p-1','@campus_app','+77011234567')")
    await assert.rejects(db.query("update public.project_contacts set phone = '87011234567' where project_id = 'p-1'"))
    await db.query("insert into public.project_members(project_id,email,role) values ('p-1',$1,'Design')", [emails.member])
    await assert.rejects(db.query("insert into public.project_members(project_id,email,role) values ('p-1','friend@gmail.com','Design')"))

    await login('stranger')
    assert.equal((await db.query('select * from public.project_contacts')).rows.length, 0)
    assert.equal((await db.query('select * from public.project_members')).rows.length, 0)
    assert.equal((await db.query('select * from public.projects')).rows.length, 0)
    await assert.rejects(db.query("insert into public.project_contacts(project_id,telegram,phone) values ('p-1','@stranger1','+77000000000')"))
    await assert.rejects(db.query("insert into public.project_members(project_id,email,role) values ('p-1',$1,'Founder')", [emails.stranger]))

    await login('member')
    assert.deepEqual((await db.query('select id from public.projects')).rows, [{ id: 'p-1' }])
    assert.deepEqual((await db.query('select email from public.project_members')).rows, [{ email: emails.member }])
    assert.equal((await db.query('select * from public.project_contacts')).rows.length, 0)

    await login('admin')
    assert.deepEqual((await db.query('select telegram, phone from public.project_contacts')).rows, [{ telegram: '@campus_app', phone: '+77011234567' }])

    await login(null)
    await assert.rejects(db.query('select * from public.project_contacts'))
  } finally {
    await db.close()
  }
})
