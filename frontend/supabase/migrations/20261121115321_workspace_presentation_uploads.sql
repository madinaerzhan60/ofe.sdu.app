-- Allow admins to supply the first PDF for an active Founders Cup entry.
create function private.admin_can_supply_event_pdf(object_name text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select (select private.is_admin()) and exists (
    select 1 from public.event_teams t
    where t.id = private.presentation_team(object_name)
      and t.event_id = split_part(object_name, '/', 1)
      and object_name like '%.pdf'
      and t.presentation_path is null
      and not private.event_team_removed(t.id)
  )
$$;
revoke all on function private.admin_can_supply_event_pdf(text) from public, anon;
grant execute on function private.admin_can_supply_event_pdf(text) to authenticated;

alter policy event_presentation_insert on storage.objects with check (
  bucket_id = 'event-presentations'
  and storage.allow_only_operation('object.upload')
  and (
    (select private.admin_can_supply_event_pdf(name))
    or (
      private.presentation_team(name) is not null
      and (select private.is_team_captain(private.presentation_team(name)))
      and split_part(name, '/', 1) = (select private.team_event(private.presentation_team(name)))
      and (select private.registration_open(split_part(name, '/', 1)))
    )
  )
);

-- Catalog submissions use one immutable PDF per project in the same private bucket.
create policy catalog_presentation_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'event-presentations'
  and storage.allow_only_operation('object.upload')
  and (select private.is_admin())
  and exists (
    select 1 from public.projects p
    where p.id = split_part(name, '/', 3)
      and name = 'catalog/' || p.owner_id::text || '/' || p.id || '/presentation.pdf'
      and not private.project_removed(p.id)
  )
);

create policy catalog_presentation_read on storage.objects for select to authenticated
using (
  bucket_id = 'event-presentations'
  and storage.allow_any_operation(array['object.get_authenticated', 'object.get_authenticated_info', 'object.head_authenticated_info'])
  and exists (
    select 1 from public.projects p
    where p.id = split_part(name, '/', 3)
      and name = 'catalog/' || p.owner_id::text || '/' || p.id || '/presentation.pdf'
      and ((select private.is_admin()) or (p.owner_id = (select auth.uid()) and not private.project_removed(p.id)))
  )
);

create function private.workspace_project_pdfs()
returns table(project_id text) language sql stable security definer set search_path = ''
as $$
  select p.id from public.projects p
  join storage.objects o on o.bucket_id = 'event-presentations' and o.name = 'catalog/' || p.owner_id::text || '/' || p.id || '/presentation.pdf'
  where (select private.is_admin()) or (p.owner_id = (select auth.uid()) and not private.project_removed(p.id))
$$;
revoke all on function private.workspace_project_pdfs() from public, anon;
grant execute on function private.workspace_project_pdfs() to authenticated;

create function public.list_workspace_project_pdfs()
returns table(project_id text) language sql stable security invoker set search_path = ''
as $$ select * from private.workspace_project_pdfs() $$;
revoke all on function public.list_workspace_project_pdfs() from public, anon;
grant execute on function public.list_workspace_project_pdfs() to authenticated;
