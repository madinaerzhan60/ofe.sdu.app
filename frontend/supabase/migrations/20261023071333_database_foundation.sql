-- OFE database foundation: profile, consent, and project-event sidecar data.
-- This forward migration preserves the existing projects/events JSONB contract.

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update(display_name) on table public.profiles to authenticated;

create policy profile_read_own_or_admin
on public.profiles for select
to authenticated
using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy profile_update_own
on public.profiles for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles(user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', ''))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user_profile() from public, anon, authenticated;

create trigger create_profile_after_auth_user
after insert on auth.users
for each row execute function public.handle_new_user_profile();

insert into public.profiles(user_id, display_name)
select id, coalesce(raw_user_meta_data->>'display_name', '')
from auth.users
on conflict (user_id) do nothing;

create or replace function public.set_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.set_profile_updated_at() from public, anon, authenticated;

create trigger set_profile_updated_at_before_update
before update on public.profiles
for each row execute function public.set_profile_updated_at();

create table public.publication_consent_policies (
  version text primary key,
  document_id text not null,
  effective_at timestamptz not null,
  is_current boolean not null default false,
  constraint publication_consent_policy_version_not_blank check (length(btrim(version)) > 0),
  constraint publication_consent_policy_document_not_blank check (length(btrim(document_id)) > 0)
);

create unique index publication_consent_one_current_idx
on public.publication_consent_policies(is_current)
where is_current;

alter table public.publication_consent_policies enable row level security;
revoke all on table public.publication_consent_policies from anon, authenticated;

insert into public.publication_consent_policies(version, document_id, effective_at, is_current)
values ('2026-10-22', 'startup-publication-consent', '2026-10-22T00:00:00+05:00', true);

create table public.publication_consents (
  id bigint generated always as identity primary key,
  project_id text not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  granted boolean not null,
  policy_version text not null references public.publication_consent_policies(version),
  policy_document text not null,
  recorded_at timestamptz not null,
  source text not null,
  constraint publication_consent_document_not_blank check (length(btrim(policy_document)) > 0),
  constraint publication_consent_source_known check (source in ('frontend', 'admin', 'migration'))
);

create index publication_consents_project_latest_idx
on public.publication_consents(project_id, id desc);
create index publication_consents_user_idx
on public.publication_consents(user_id);
create index publication_consents_policy_version_idx
on public.publication_consents(policy_version);

alter table public.publication_consents enable row level security;
revoke all on table public.publication_consents from anon, authenticated;
grant select on table public.publication_consents to authenticated;

create policy publication_consent_read_own_or_admin
on public.publication_consents for select
to authenticated
using (user_id = (select auth.uid()) or (select public.is_admin()));

create or replace function public.parse_consent_timestamp(raw_value text)
returns timestamptz
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  parsed_value timestamptz;
begin
  if raw_value !~ '^[0-9]{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[0-1])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\.[0-9]{1,6})?(Z|[+-]((0[0-9]|1[0-3]):[0-5][0-9]|14:00))$' then
    return null;
  end if;

  begin
    parsed_value := raw_value::timestamptz;
  exception when others then
    return null;
  end;

  if not isfinite(parsed_value) then
    return null;
  end if;

  return parsed_value;
end;
$$;

revoke all on function public.parse_consent_timestamp(text) from public, anon, authenticated;

with candidates as (
  select
    p.id as project_id,
    p.owner_id as user_id,
    (p.data->>'publication')::boolean as granted,
    public.parse_consent_timestamp(
      case
        when jsonb_typeof(p.data->'consentAt') = 'string' then p.data->>'consentAt'
      end
    ) as consent_at
  from public.projects p
  where jsonb_typeof(p.data->'publication') = 'boolean'
    and jsonb_typeof(p.data->'consentVersion') = 'string'
    and p.data->>'consentVersion' = '2026-10-22'
), valid_candidates as (
  select *
  from candidates
  where consent_at is not null
    and consent_at <= now() + interval '5 minutes'
)
insert into public.publication_consents(
  project_id,
  user_id,
  granted,
  policy_version,
  policy_document,
  recorded_at,
  source
)
select
  project_id,
  user_id,
  granted,
  '2026-10-22',
  'startup-publication-consent',
  consent_at,
  'migration'
from valid_candidates;

create or replace function public.validate_project_payload()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  allowed_keys constant text[] := array[
    'id', 'ownerId', 'name', 'description', 'industry', 'stage', 'team',
    'product', 'status', 'publication', 'consentVersion', 'consentAt',
    'feedback', 'createdAt', 'visible', 'image', 'cover', 'about', 'year',
    'eventYears'
  ];
begin
  if jsonb_typeof(new.data) is distinct from 'object' then
    raise exception 'Project data must be a JSON object';
  end if;

  if not (new.data ?& array['id','ownerId','name','description','team','status','publication','visible']) then
    raise exception 'Project data is missing required fields';
  end if;

  if exists (
    select 1
    from jsonb_object_keys(new.data) as supplied(key)
    where not supplied.key = any(allowed_keys)
  ) then
    raise exception 'Project data contains an unsupported field';
  end if;

  if jsonb_typeof(new.data->'id') <> 'string'
    or jsonb_typeof(new.data->'ownerId') <> 'string'
    or new.data->>'id' <> new.id
    or new.data->>'ownerId' <> new.owner_id::text then
    raise exception 'Project identity is invalid';
  end if;

  if jsonb_typeof(new.data->'name') <> 'string'
    or length(btrim(new.data->>'name')) not between 1 and 100
    or jsonb_typeof(new.data->'description') <> 'string'
    or length(btrim(new.data->>'description')) not between 1 and 300
    or jsonb_typeof(new.data->'team') <> 'string'
    or length(btrim(new.data->>'team')) not between 1 and 10000 then
    raise exception 'Project required text is invalid';
  end if;

  if jsonb_typeof(new.data->'status') <> 'string'
    or new.data->>'status' not in ('Pending', 'Approved', 'Rejected')
    or jsonb_typeof(new.data->'publication') <> 'boolean'
    or jsonb_typeof(new.data->'visible') <> 'boolean' then
    raise exception 'Project state is invalid';
  end if;

  if (new.data ? 'industry' and (
      jsonb_typeof(new.data->'industry') <> 'string'
      or length(btrim(new.data->>'industry')) > 100
    ))
    or (new.data ? 'stage' and (
      jsonb_typeof(new.data->'stage') <> 'string'
      or length(btrim(new.data->>'stage')) > 50
    ))
    or (new.data ? 'product' and (
      jsonb_typeof(new.data->'product') <> 'string'
      or length(btrim(new.data->>'product')) > 10000
    ))
    or (new.data ? 'about' and (
      jsonb_typeof(new.data->'about') <> 'string'
      or length(new.data->>'about') > 10000
    )) then
    raise exception 'Project optional content is invalid';
  end if;

  if exists (
    select 1
    from unnest(array['image','cover','feedback','createdAt','year','consentVersion','consentAt']) as optional_key
    where new.data ? optional_key
      and jsonb_typeof(new.data->optional_key) <> 'string'
  ) then
    raise exception 'Project optional metadata is invalid';
  end if;

  if new.data ? 'eventYears' and (
    jsonb_typeof(new.data->'eventYears') <> 'array'
    or exists (
      select 1
      from jsonb_array_elements(new.data->'eventYears') as event_year(value)
      where jsonb_typeof(event_year.value) <> 'string'
    )
  ) then
    raise exception 'Project event years must be an array of strings';
  end if;

  if octet_length(new.data::text) >= 10000000 then
    raise exception 'Project data is too large';
  end if;

  if tg_op = 'UPDATE'
    and (
      new.data->'publication' is distinct from old.data->'publication'
      or new.data->'consentVersion' is distinct from old.data->'consentVersion'
      or new.data->'consentAt' is distinct from old.data->'consentAt'
    )
    and (select auth.uid()) is distinct from new.owner_id then
    raise exception 'Only the project owner can change publication consent';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_project_payload() from public, anon, authenticated;

create trigger validate_project_payload_before_write
before insert or update on public.projects
for each row execute function public.validate_project_payload();

create or replace function public.record_project_consent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_version text;
  current_document text;
  consent_time timestamptz;
begin
  if tg_op = 'UPDATE'
    and new.data->'publication' is not distinct from old.data->'publication'
    and new.data->'consentVersion' is not distinct from old.data->'consentVersion'
    and new.data->'consentAt' is not distinct from old.data->'consentAt' then
    return new;
  end if;

  if (select auth.uid()) is distinct from new.owner_id then
    raise exception 'Only the project owner can record publication consent';
  end if;

  if jsonb_typeof(new.data->'publication') is distinct from 'boolean'
    or jsonb_typeof(new.data->'consentVersion') is distinct from 'string'
    or length(btrim(new.data->>'consentVersion')) = 0
    or jsonb_typeof(new.data->'consentAt') is distinct from 'string' then
    raise exception 'Publication consent metadata is required';
  end if;

  select version, document_id
  into current_version, current_document
  from public.publication_consent_policies
  where is_current;

  if current_version is null or new.data->>'consentVersion' <> current_version then
    raise exception 'Publication consent policy is not current';
  end if;

  consent_time := public.parse_consent_timestamp(new.data->>'consentAt');
  if consent_time is null then
    raise exception 'Publication consent timestamp is invalid';
  end if;

  if consent_time > now() + interval '5 minutes' then
    raise exception 'Publication consent timestamp is in the future';
  end if;

  insert into public.publication_consents(
    project_id,
    user_id,
    granted,
    policy_version,
    policy_document,
    recorded_at,
    source
  ) values (
    new.id,
    new.owner_id,
    (new.data->>'publication')::boolean,
    current_version,
    current_document,
    consent_time,
    'frontend'
  );

  return new;
end;
$$;

revoke all on function public.record_project_consent() from public, anon, authenticated;

create trigger record_project_consent_after_write
after insert or update on public.projects
for each row execute function public.record_project_consent();

create or replace function public.project_has_current_consent(target_project_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select latest_consent.granted
    from public.projects project
    cross join lateral (
      select consent.granted
      from public.publication_consents consent
      join public.publication_consent_policies policy
        on policy.version = consent.policy_version
        and policy.document_id = consent.policy_document
        and policy.is_current
      where consent.project_id = project.id
      order by consent.id desc
      limit 1
    ) latest_consent
    where project.id = target_project_id
      and (
        project.owner_id = (select auth.uid())
        or (select public.is_admin())
        or (
          project.data->>'status' = 'Approved'
          and project.data->>'visible' = 'true'
          and latest_consent.granted
        )
      )
  ), false)
$$;

revoke all on function public.project_has_current_consent(text) from public;
grant execute on function public.project_has_current_consent(text) to anon, authenticated;

drop policy project_read on public.projects;
create policy project_read
on public.projects for select
to anon, authenticated
using (
  owner_id = (select auth.uid())
  or (select public.is_admin())
  or (
    data->>'status' = 'Approved'
    and data->>'visible' = 'true'
    and (select public.project_has_current_consent(id))
  )
);

create table public.project_events (
  project_id text not null references public.projects(id) on delete cascade,
  event_id text not null references public.events(id) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (project_id, event_id)
);

create index project_events_event_idx on public.project_events(event_id);
create index project_events_assigned_by_idx
on public.project_events(assigned_by)
where assigned_by is not null;

alter table public.project_events enable row level security;
revoke all on table public.project_events from anon, authenticated;
grant select on table public.project_events to anon, authenticated;
grant insert, delete on table public.project_events to authenticated;

create policy project_event_read
on public.project_events for select
to anon, authenticated
using (
  (select public.is_admin())
  or exists (
    select 1
    from public.projects project
    where project.id = project_id
      and project.owner_id = (select auth.uid())
  )
  or (
    exists (
      select 1
      from public.projects project
      where project.id = project_id
        and project.data->>'status' = 'Approved'
        and project.data->>'visible' = 'true'
        and (select public.project_has_current_consent(project.id))
    )
    and exists (
      select 1
      from public.events event
      where event.id = event_id
        and event.data->>'published' = 'true'
    )
  )
);

create policy project_event_insert_admin
on public.project_events for insert
to authenticated
with check (
  (select public.is_admin())
  and assigned_by = (select auth.uid())
);

create policy project_event_delete_admin
on public.project_events for delete
to authenticated
using ((select public.is_admin()));

create or replace function public.backfill_legacy_project_events()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_count bigint;
begin
  with expanded_years as (
    select
      project.id as project_id,
      years.event_year
    from public.projects project
    cross join lateral jsonb_array_elements_text(
      case
        when jsonb_typeof(project.data->'eventYears') = 'array' then project.data->'eventYears'
        else '[]'::jsonb
      end
    ) as years(event_year)
    where years.event_year ~ '^[0-9]{4}$'
  ), unique_matches as (
    select
      expanded.project_id,
      expanded.event_year,
      min(event.id) as event_id
    from expanded_years expanded
    join public.events event
      on jsonb_typeof(event.data->'date') = 'string'
      and left(event.data->>'date', 4) = expanded.event_year
    group by expanded.project_id, expanded.event_year
    having count(*) = 1
  )
  insert into public.project_events(project_id, event_id, assigned_by)
  select project_id, event_id, null
  from unique_matches
  on conflict (project_id, event_id) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

revoke all on function public.backfill_legacy_project_events() from public, anon, authenticated;

select public.backfill_legacy_project_events();
