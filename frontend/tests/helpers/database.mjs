import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

// Applies every migration in order to a PGlite database with a minimal stand-in
// for the Supabase auth and storage schemas.
const migrations = [
  '20261022_accounts.sql',
  '20261023071333_database_foundation.sql',
  '20261023074400_event_registration_user_index.sql',
  '20261023115503_storage_security_hardening.sql',
  '20261023120625_storage_token_guards.sql',
  '20261023123211_storage_update_operation.sql',
  '20261031150000_sdu_auth_token_hook.sql',
  '20261104150000_correct_founders_cup_date.sql',
  '20261113120000_media_news_members_contacts.sql',
  '20261114120000_founders_cup_registration.sql',
  '20261116151731_fix_founders_cup_product_url.sql',
  '20261116155726_event_project_catalog.sql',
  '20261116162556_founders_cup_cover.sql',
]
const migration = name => readFile(new URL(`../../supabase/migrations/${name}`, import.meta.url), 'utf8')

export async function supabaseDatabase({ users = {}, admins = [], before } = {}) {
  const db = new PGlite()
  await db.exec(`create role anon; create role authenticated; create role supabase_auth_admin; create schema auth;
    create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, raw_user_meta_data jsonb not null default '{}'::jsonb);
    create table auth.identities(id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id), provider text, identity_data jsonb);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
    create schema storage;
    create table storage.buckets(id text primary key, name text not null, public boolean not null default false, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(id bigint generated always as identity primary key, bucket_id text not null references storage.buckets(id), name text not null unique);
    create function storage.allow_only_operation(expected_operation text) returns boolean language sql stable set search_path = '' as $$
      select coalesce(regexp_replace(current_setting('storage.operation',true),'^storage\\.','') = regexp_replace(expected_operation,'^storage\\.',''), false) $$;
    create function storage.allow_any_operation(expected_operations text[]) returns boolean language sql stable set search_path = '' as $$
      select coalesce(bool_or(storage.allow_only_operation(expected_operation)),false) from unnest(expected_operations) as expected(expected_operation) $$;
    alter table storage.objects enable row level security;
    grant usage on schema auth,public,storage to anon,authenticated;
    grant execute on function auth.uid(), auth.jwt() to anon,authenticated;
    grant select on storage.objects to anon,authenticated;
    grant insert,update,delete on storage.objects to authenticated;
    grant usage,select on sequence storage.objects_id_seq to authenticated;`)
  for (const [id, email] of Object.entries(users)) {
    await db.query('insert into auth.users(id,email,email_confirmed_at) values ($1,$2,now())', [id, email])
  }
  await db.exec(await migration(migrations[0]))
  for (const id of admins) await db.query('insert into public.app_admins(user_id) values ($1)', [id])
  for (const name of migrations.slice(1)) {
    if (before?.[name]) await before[name](db)
    await db.exec(await migration(name))
  }
  const login = async (id, email) => {
    await db.exec('reset role')
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id ?? ''])
    await db.query("select set_config('request.jwt.claims',$1,false)", [id ? JSON.stringify({ sub: id, email }) : ''])
    await db.exec(`set role ${id ? 'authenticated' : 'anon'}`)
  }
  const operation = value => db.query("select set_config('storage.operation',$1,false)", [value])
  const asOwner = () => db.exec('reset role')
  return { db, login, operation, asOwner }
}
