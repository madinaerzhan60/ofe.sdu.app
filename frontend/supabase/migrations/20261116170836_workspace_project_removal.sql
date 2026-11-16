-- Reversible administrator removal. Keep project data, consent history and files
-- for restoration; hide removed records through restrictive policies.
create table private.removed_projects (
  project_id text primary key references public.projects(id) on delete cascade,
  removed_at timestamptz not null default now(),
  removed_by uuid references auth.users(id) on delete set null
);
create table private.removed_event_teams (
  team_id uuid primary key references public.event_teams(id) on delete cascade,
  removed_at timestamptz not null default now(),
  removed_by uuid references auth.users(id) on delete set null
);
alter table private.removed_projects enable row level security;
alter table private.removed_event_teams enable row level security;
revoke all on private.removed_projects,private.removed_event_teams from public,anon,authenticated;

create function private.project_removed(target_id text)
returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from private.removed_projects where project_id=target_id) $$;
create function private.event_team_removed(target_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from private.removed_event_teams where team_id=target_id) $$;
revoke all on function private.project_removed(text),private.event_team_removed(uuid) from public;
grant execute on function private.project_removed(text),private.event_team_removed(uuid) to anon,authenticated;

create policy project_not_removed on public.projects as restrictive for all to anon,authenticated
using ((select private.is_admin()) or not private.project_removed(id))
with check ((select private.is_admin()) or not private.project_removed(id));
create policy event_team_not_removed on public.event_teams as restrictive for all to anon,authenticated
using ((select private.is_admin()) or not private.event_team_removed(id))
with check ((select private.is_admin()) or not private.event_team_removed(id));

create function private.set_workspace_project_removed(target_id text,kind text,removed boolean)
returns void language plpgsql security definer set search_path=''
as $$
begin
  if (select auth.uid()) is null or not private.is_admin() then
    raise exception 'Only administrators can remove or restore projects' using errcode='42501';
  end if;
  if kind='project' then
    perform 1 from public.projects where id=target_id for update;
    if not found then raise exception 'Project not found' using errcode='P0002'; end if;
    if removed then
      insert into private.removed_projects(project_id,removed_by) values(target_id,auth.uid()) on conflict do nothing;
    else delete from private.removed_projects where project_id=target_id;
    end if;
  elsif kind='event-team' then
    perform 1 from public.event_teams where id=target_id::uuid for update;
    if not found then raise exception 'Project not found' using errcode='P0002'; end if;
    if removed then
      insert into private.removed_event_teams(team_id,removed_by) values(target_id::uuid,auth.uid()) on conflict do nothing;
    else delete from private.removed_event_teams where team_id=target_id::uuid;
    end if;
  else raise exception 'Invalid project kind' using errcode='22023';
  end if;
end
$$;
revoke all on function private.set_workspace_project_removed(text,text,boolean) from public,anon;
grant execute on function private.set_workspace_project_removed(text,text,boolean) to authenticated;
create function public.set_workspace_project_removed(target_id text,kind text,removed boolean)
returns void language sql security invoker set search_path=''
as $$ select private.set_workspace_project_removed(target_id,kind,removed) $$;
revoke all on function public.set_workspace_project_removed(text,text,boolean) from public,anon;
grant execute on function public.set_workspace_project_removed(text,text,boolean) to authenticated;

create function private.removed_workspace_projects()
returns table(kind text,target_id text) language sql stable security definer set search_path=''
as $$
  select 'project'::text,project_id from private.removed_projects where (select private.is_admin())
  union all select 'event-team'::text,team_id::text from private.removed_event_teams where (select private.is_admin())
$$;
revoke all on function private.removed_workspace_projects() from public,anon;
grant execute on function private.removed_workspace_projects() to authenticated;
create function public.list_removed_workspace_projects()
returns table(kind text,target_id text) language sql stable security invoker set search_path=''
as $$ select * from private.removed_workspace_projects() $$;
revoke all on function public.list_removed_workspace_projects() from public,anon;
grant execute on function public.list_removed_workspace_projects() to authenticated;

-- Storage/member helpers also apply the removal rule, including helpers that
-- read tables with elevated privileges. Administrators retain restoration access.
create or replace function private.is_team_captain(target_team_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.event_teams t where t.id=target_team_id and t.captain_id=(select auth.uid()) and not private.event_team_removed(t.id)) $$;
create or replace function private.can_view_team(target_team_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$
  select private.is_admin() or exists (
    select 1 from public.event_teams t where t.id=target_team_id and not private.event_team_removed(t.id)
    and (t.captain_id=(select auth.uid()) or exists (
      select 1 from public.event_team_members m where m.team_id=t.id and m.email=private.current_email()
    ))
  )
$$;

create or replace function private.event_cover_access(object_name text, action text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.event_teams t join public.events e on e.id=t.event_id
    where t.id=private.event_cover_team(object_name)
      and t.event_id=split_part(object_name,'/',1)
      and (not private.event_team_removed(t.id) or private.is_admin())
      and case action
        when 'read' then private.can_view_team(t.id) or (
          t.cover_path=object_name and t.status='confirmed' and t.consent and e.data->>'published'='true'
        )
        when 'upload' then t.captain_id=(select auth.uid()) and private.registration_open(t.event_id)
        when 'delete' then t.cover_path is distinct from object_name and (
          private.is_admin() or (t.captain_id=(select auth.uid()) and private.registration_open(t.event_id))
        )
        else false
      end
  )
$$;

create or replace function private.confirmed_event_projects()
returns table(id text,event_id text,data jsonb)
language sql stable security definer set search_path = ''
as $$
  select 'event-team-' || t.id::text,t.event_id,
    jsonb_strip_nulls(jsonb_build_object(
      'name',t.product_name,'description',t.tagline,'about',t.description,
      'industry',t.industry,'stage',t.stage,'team',t.team_name,
      'product',coalesce(t.product_url,''),'createdAt',t.created_at,
      'cover',case when t.cover_path is not null then 'event-cover://' || t.cover_path end
    ))
  from public.event_teams t join public.events e on e.id=t.event_id
  where not private.event_team_removed(t.id) and t.status='confirmed' and t.consent and e.data->>'published'='true'
$$;
