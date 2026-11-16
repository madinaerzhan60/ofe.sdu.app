-- SDU-only accounts and team registration for SDU Founders Cup (21 November 2026).
-- Apply once, after 20261113120000_media_news_members_contacts.sql.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

-- 1. Only corporate @sdu.edu.kz accounts -------------------------------------
create or replace function private.is_sdu_email(value text)
returns boolean language sql immutable set search_path = ''
as $$ select coalesce(value ~ '^[a-z0-9._%+-]+@sdu\.edu\.kz$', false) $$;
revoke all on function private.is_sdu_email(text) from public, anon, authenticated;
grant execute on function private.is_sdu_email(text) to anon, authenticated;

-- Database guard: no account (email, Google or any other provider) can be
-- created with, or changed to, an address outside sdu.edu.kz. This holds even
-- if the Auth hook below is not configured. Existing rows are not touched.
create or replace function private.enforce_sdu_account()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if not private.is_sdu_email(lower(btrim(coalesce(new.email, '')))) then
    raise exception 'Only @sdu.edu.kz accounts are allowed' using errcode = 'check_violation';
  end if;
  return new;
end
$$;
revoke all on function private.enforce_sdu_account() from public, anon, authenticated;
create trigger enforce_sdu_account
before insert or update of email on auth.users
for each row execute function private.enforce_sdu_account();

-- Auth hook (Authentication → Hooks → Before User Created) with a clear message.
create or replace function public.sdu_before_user_created_hook(event jsonb)
returns jsonb language plpgsql stable security invoker set search_path = ''
as $$
begin
  if not private.is_sdu_email(lower(btrim(coalesce(event->'user'->>'email', '')))) then
    return jsonb_build_object('error', jsonb_build_object(
      'http_code', 403,
      'message', 'Use your corporate @sdu.edu.kz email.'
    ));
  end if;
  return '{}'::jsonb;
end
$$;
revoke all on function public.sdu_before_user_created_hook(jsonb) from public, anon, authenticated;
grant usage on schema private to supabase_auth_admin;
grant execute on function private.is_sdu_email(text) to supabase_auth_admin;
grant execute on function public.sdu_before_user_created_hook(jsonb) to supabase_auth_admin;

-- 2. Event date ----------------------------------------------------------------
update public.events
set data = jsonb_set(data, '{date}', '"2026-11-21"'::jsonb)
where id = 'current' and data->>'date' in ('2026-11-25', '2026-11-26');

-- Registration is open while the event is published, not closed by an
-- administrator and before the deadline (default: start of the event day in Almaty).
create or replace function private.registration_open(target_event_id text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce((
    select e.data->>'published' = 'true'
      and coalesce(e.data->>'registration', 'open') <> 'closed'
      and now() < case
        when coalesce(e.data->>'registrationDeadline', '') ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$'
          then (e.data->>'registrationDeadline')::timestamptz
        when coalesce(e.data->>'date', '') ~ '^\d{4}-\d{2}-\d{2}$'
          then ((e.data->>'date')::date)::timestamp at time zone 'Asia/Almaty'
        else '-infinity'::timestamptz
      end
    from public.events e
    where e.id = target_event_id
  ), false)
$$;
revoke all on function private.registration_open(text) from public, anon, authenticated;
grant execute on function private.registration_open(text) to anon, authenticated;

create or replace function public.event_registration_open(target_event_id text)
returns boolean language sql stable security invoker set search_path = ''
as $$ select private.registration_open(target_event_id) $$;
revoke all on function public.event_registration_open(text) from public;
grant execute on function public.event_registration_open(text) to anon, authenticated;

-- 3. Teams -------------------------------------------------------------------
create table public.event_teams (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.events(id) on delete cascade,
  captain_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  captain_email text not null,
  team_name text not null check (length(btrim(team_name)) between 2 and 80),
  product_name text not null check (length(btrim(product_name)) between 2 and 100),
  tagline text not null check (length(btrim(tagline)) between 10 and 160),
  description text not null check (length(btrim(description)) between 50 and 3000),
  industry text not null check (length(btrim(industry)) between 2 and 60),
  stage text not null check (stage in ('Idea', 'Prototype', 'MVP', 'Seed', 'Growth')),
  product_url text check (product_url is null or product_url ~ '^https://[^[:space:]<>"]{3,500}$'),
  telegram text not null check (telegram ~ '^@[A-Za-z0-9_]{5,32}$'),
  phone text not null check (phone ~ '^\+7[0-9]{10}$'),
  presentation_path text,
  presentation_name text check (presentation_name is null or length(presentation_name) between 1 and 200),
  status text not null default 'submitted' check (status in ('submitted', 'confirmed', 'rejected')),
  admin_note text not null default '' check (length(admin_note) <= 1000),
  consent boolean not null check (consent),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, captain_id),
  constraint presentation_in_team_folder check (
    presentation_path is null
    or presentation_path = event_id || '/' || id::text || '/' || split_part(presentation_path, '/', 3)
       and split_part(presentation_path, '/', 3) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|pptx)$'
  )
);
create index event_teams_event_idx on public.event_teams(event_id);

-- Captain row included: one email takes part in one team per event.
create table public.event_team_members (
  team_id uuid not null references public.event_teams(id) on delete cascade,
  event_id text not null,
  email text not null check (private.is_sdu_email(email)),
  role text not null check (length(btrim(role)) between 1 and 40),
  is_captain boolean not null default false,
  added_at timestamptz not null default now(),
  primary key (team_id, email),
  unique (event_id, email)
);
create index event_team_members_email_idx on public.event_team_members(email);

create or replace function private.is_team_captain(target_team_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.event_teams t where t.id = target_team_id and t.captain_id = (select auth.uid())) $$;
create or replace function private.can_view_team(target_team_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select private.is_admin()
    or exists(select 1 from public.event_teams t where t.id = target_team_id and t.captain_id = (select auth.uid()))
    or exists(select 1 from public.event_team_members m where m.team_id = target_team_id and m.email = private.current_email())
$$;
create or replace function private.team_event(target_team_id uuid)
returns text language sql stable security definer set search_path = ''
as $$ select event_id from public.event_teams where id = target_team_id $$;
revoke all on function private.is_team_captain(uuid), private.can_view_team(uuid), private.team_event(uuid) from public, anon, authenticated;
grant execute on function private.is_team_captain(uuid), private.can_view_team(uuid), private.team_event(uuid) to authenticated;

-- Server-owned fields and moderation guard.
create or replace function private.guard_event_team()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  admin boolean := private.is_admin();
begin
  if tg_op = 'INSERT' then
    new.captain_id := (select auth.uid());
    new.captain_email := private.current_email();
    new.status := 'submitted';
    new.admin_note := '';
    new.created_at := now();
    if new.captain_id is null or not private.is_sdu_email(new.captain_email) then
      raise exception 'Sign in with your @sdu.edu.kz account' using errcode = 'insufficient_privilege';
    end if;
    if not private.registration_open(new.event_id) then
      raise exception 'Registration is closed' using errcode = 'insufficient_privilege';
    end if;
  else
    if new.id is distinct from old.id or new.event_id is distinct from old.event_id
      or new.captain_id is distinct from old.captain_id or new.captain_email is distinct from old.captain_email
      or new.created_at is distinct from old.created_at then
      raise exception 'Team identity cannot change' using errcode = 'insufficient_privilege';
    end if;
    if not admin then
      if new.status is distinct from old.status or new.admin_note is distinct from old.admin_note then
        raise exception 'Only administrators can change the status' using errcode = 'insufficient_privilege';
      end if;
      if not private.registration_open(old.event_id) then
        raise exception 'Registration is closed' using errcode = 'insufficient_privilege';
      end if;
      -- Edits after confirmation send the team back for review.
      if old.status = 'confirmed' then new.status := 'submitted'; end if;
    end if;
  end if;
  new.updated_at := now();
  return new;
end
$$;
revoke all on function private.guard_event_team() from public, anon, authenticated;
create trigger guard_event_team before insert or update on public.event_teams
for each row execute function private.guard_event_team();

create or replace function private.add_captain_member()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.event_team_members(team_id, event_id, email, role, is_captain)
  values (new.id, new.event_id, new.captain_email, 'Captain', true);
  return new;
end
$$;
revoke all on function private.add_captain_member() from public, anon, authenticated;
create trigger add_captain_member after insert on public.event_teams
for each row execute function private.add_captain_member();

create or replace function private.guard_team_member()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.email := lower(btrim(new.email));
    new.event_id := private.team_event(new.team_id);
    new.added_at := now();
    if new.is_captain and (select count(*) from public.event_team_members m where m.team_id = new.team_id and m.is_captain) > 0 then
      raise exception 'A team has one captain' using errcode = 'insufficient_privilege';
    end if;
    if (select count(*) from public.event_team_members m where m.team_id = new.team_id) >= 6 then
      raise exception 'A team has at most 6 people' using errcode = 'check_violation';
    end if;
    if not new.is_captain and not private.is_admin() and not private.registration_open(new.event_id) then
      raise exception 'Registration is closed' using errcode = 'insufficient_privilege';
    end if;
    return new;
  end if;
  -- DELETE
  if old.is_captain and exists(select 1 from public.event_teams t where t.id = old.team_id) then
    raise exception 'The captain cannot be removed' using errcode = 'insufficient_privilege';
  end if;
  if not private.is_admin() and not private.registration_open(old.event_id)
    and exists(select 1 from public.event_teams t where t.id = old.team_id) then
    raise exception 'Registration is closed' using errcode = 'insufficient_privilege';
  end if;
  return old;
end
$$;
revoke all on function private.guard_team_member() from public, anon, authenticated;
create trigger guard_team_member before insert or delete on public.event_team_members
for each row execute function private.guard_team_member();

alter table public.event_teams enable row level security;
alter table public.event_team_members enable row level security;
revoke all on table public.event_teams, public.event_team_members from anon, authenticated;
grant select, delete on table public.event_teams to authenticated;
grant insert (event_id, team_name, product_name, tagline, description, industry, stage, product_url, telegram, phone, presentation_path, presentation_name, consent)
  on table public.event_teams to authenticated;
grant update (team_name, product_name, tagline, description, industry, stage, product_url, telegram, phone, presentation_path, presentation_name, status, admin_note)
  on table public.event_teams to authenticated;
grant select, delete on table public.event_team_members to authenticated;
grant insert (team_id, email, role) on table public.event_team_members to authenticated;

create policy event_team_read on public.event_teams for select to authenticated
using (captain_id = (select auth.uid()) or (select private.can_view_team(id)));
create policy event_team_insert on public.event_teams for insert to authenticated
with check (captain_id = (select auth.uid()) and (select private.registration_open(event_id)));
create policy event_team_update on public.event_teams for update to authenticated
using (captain_id = (select auth.uid()) or (select private.is_admin()))
with check (captain_id = (select auth.uid()) or (select private.is_admin()));
create policy event_team_delete on public.event_teams for delete to authenticated
using ((captain_id = (select auth.uid()) and (select private.registration_open(event_id))) or (select private.is_admin()));

create policy event_member_read on public.event_team_members for select to authenticated
using ((select private.can_view_team(team_id)));
create policy event_member_insert on public.event_team_members for insert to authenticated
with check (not is_captain and ((select private.is_team_captain(team_id)) or (select private.is_admin())));
create policy event_member_delete on public.event_team_members for delete to authenticated
using ((select private.is_team_captain(team_id)) or (select private.is_admin()));

-- 4. Presentations: private bucket, PDF or PPTX up to 25 MB ------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-presentations', 'event-presentations', false, 26214400,
  array['application/pdf', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'])
on conflict (id) do nothing;

-- Path: <event_id>/<team_id>/<uuid>.(pdf|pptx)
create or replace function private.presentation_team(object_name text)
returns uuid language sql immutable set search_path = ''
as $$
  select case when object_name ~ '^[a-z0-9-]{1,64}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|pptx)$'
    then split_part(object_name, '/', 2)::uuid end
$$;
revoke all on function private.presentation_team(text) from public, anon, authenticated;
grant execute on function private.presentation_team(text) to authenticated;

create policy event_presentation_read on storage.objects for select to authenticated
using (
  bucket_id = 'event-presentations'
  and storage.allow_any_operation(array['object.get_authenticated', 'object.get_authenticated_info', 'object.head_authenticated_info', 'object.upload', 'object.delete', 'object.delete_many'])
  and private.presentation_team(name) is not null
  and (select private.can_view_team(private.presentation_team(name)))
);
create policy event_presentation_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'event-presentations'
  and storage.allow_only_operation('object.upload')
  and private.presentation_team(name) is not null
  and (select private.is_team_captain(private.presentation_team(name)))
  and split_part(name, '/', 1) = (select private.team_event(private.presentation_team(name)))
  and (select private.registration_open(split_part(name, '/', 1)))
);
create policy event_presentation_delete on storage.objects for delete to authenticated
using (
  bucket_id = 'event-presentations'
  and storage.allow_any_operation(array['object.delete', 'object.delete_many'])
  and private.presentation_team(name) is not null
  and (
    (select private.is_admin())
    or ((select private.is_team_captain(private.presentation_team(name))) and (select private.registration_open(split_part(name, '/', 1))))
  )
);
