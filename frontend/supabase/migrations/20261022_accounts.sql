-- Apply in the project's Supabase SQL editor. Never put a service-role key in Vite.
create table public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.app_admins enable row level security;
revoke all on public.app_admins from anon, authenticated;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.app_admins where user_id = (select auth.uid())) $$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create table public.projects (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  constraint valid_project check (
    jsonb_typeof(data) = 'object'
    and data ?& array['id','ownerId','name','description','team','status','publication','visible']
    and jsonb_typeof(data->'id') = 'string'
    and jsonb_typeof(data->'ownerId') = 'string'
    and jsonb_typeof(data->'status') = 'string'
    and jsonb_typeof(data->'name') = 'string'
    and jsonb_typeof(data->'description') = 'string'
    and jsonb_typeof(data->'team') = 'string'
    and data->>'id' = id
    and data->>'ownerId' = owner_id::text
    and length(btrim(data->>'name')) between 1 and 100
    and length(btrim(data->>'description')) between 1 and 300
    and length(btrim(data->>'team')) between 1 and 10000
    and data->>'status' in ('Pending','Approved','Rejected')
    and jsonb_typeof(data->'publication') = 'boolean'
    and jsonb_typeof(data->'visible') = 'boolean'
    and octet_length(data::text) < 10000000
  )
);
create index projects_owner_idx on public.projects(owner_id);
alter table public.projects enable row level security;
revoke all on public.projects from anon,authenticated;
grant select,insert,update on public.projects to authenticated;
grant select on public.projects to anon;
revoke delete on public.projects from anon,authenticated;

create policy project_read on public.projects for select using (
  owner_id = (select auth.uid()) or (select public.is_admin())
  or (data->>'status' = 'Approved' and data->>'publication' = 'true' and data->>'visible' = 'true')
);
create policy project_create on public.projects for insert to authenticated
with check (owner_id = (select auth.uid()) and data->>'status' = 'Pending' and data->>'visible' = 'false' and coalesce(data->>'feedback','') = '' and coalesce(data->'eventYears','[]'::jsonb) = '[]'::jsonb and not (data ? 'year'));
create policy project_update on public.projects for update to authenticated
using (owner_id = (select auth.uid()) or (select public.is_admin()))
with check (owner_id = (select auth.uid()) or (select public.is_admin()));

create or replace function public.guard_project_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.id is distinct from old.id or new.owner_id is distinct from old.owner_id then
    raise exception 'Project identity cannot change';
  end if;
  if not public.is_admin() then
    if new.data->>'visible' is distinct from old.data->>'visible'
      or new.data->'eventYears' is distinct from old.data->'eventYears'
      or new.data->'year' is distinct from old.data->'year'
      or new.data->'createdAt' is distinct from old.data->'createdAt'
      or not (
        (new.data->>'status' = old.data->>'status' and new.data->>'feedback' is not distinct from old.data->>'feedback')
        or (old.data->>'status' = 'Rejected' and new.data->>'status' = 'Pending' and coalesce(new.data->>'feedback','') = '')
      ) then
      raise exception 'Only administrators can change moderation fields';
    end if;
  end if;
  return new;
end $$;
create trigger guard_project_update before update on public.projects for each row execute function public.guard_project_update();

create table public.events (
  id text primary key,
  data jsonb not null,
  constraint valid_event check (jsonb_typeof(data) = 'object' and data ?& array['id','published'] and jsonb_typeof(data->'id') = 'string' and data->>'id' = id and jsonb_typeof(data->'published') = 'boolean' and octet_length(data::text) < 6000000)
);
alter table public.events enable row level security;
revoke all on public.events from anon,authenticated;
grant select on public.events to anon,authenticated;
grant insert,update on public.events to authenticated;
revoke delete on public.events from anon,authenticated;
create policy event_read on public.events for select using (data->>'published' = 'true' or (select public.is_admin()));
create policy event_insert on public.events for insert to authenticated with check ((select public.is_admin()));
create policy event_update on public.events for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create table public.event_registrations (
  event_id text not null references public.events(id),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(event_id,user_id)
);
alter table public.event_registrations enable row level security;
revoke all on public.event_registrations from anon,authenticated;
grant select,insert on public.event_registrations to authenticated;
revoke update,delete on public.event_registrations from anon,authenticated;
create policy registration_read on public.event_registrations for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy registration_insert on public.event_registrations for insert to authenticated with check (
  user_id = (select auth.uid()) and exists(select 1 from public.events e where e.id = event_id and e.data->>'published' = 'true')
);

-- Published sample content is intentionally not imported. The administrator can
-- create real events, and users can submit real projects after signing in.
