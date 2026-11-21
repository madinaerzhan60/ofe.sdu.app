-- A team that submitted a PPTX can keep it alongside a PDF supplied by OFE.
create policy team_supplemental_pdf_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'event-presentations'
  and storage.allow_only_operation('object.upload')
  and (select private.is_admin())
  and exists (
    select 1 from public.event_teams t
    where t.event_id = split_part(name, '/', 2)
      and name = 'team-pdf/' || t.event_id || '/' || t.id::text || '/presentation.pdf'
      and t.presentation_path like '%.pptx'
      and not private.event_team_removed(t.id)
  )
);

create policy team_supplemental_pdf_read on storage.objects for select to authenticated
using (
  bucket_id = 'event-presentations'
  and storage.allow_any_operation(array['object.get_authenticated', 'object.get_authenticated_info', 'object.head_authenticated_info'])
  and exists (
    select 1 from public.event_teams t
    where t.event_id = split_part(name, '/', 2)
      and name = 'team-pdf/' || t.event_id || '/' || t.id::text || '/presentation.pdf'
      and (select private.can_view_team(t.id))
  )
);

create function private.workspace_team_pdfs(target_event_id text)
returns table(team_id uuid) language sql stable security definer set search_path = ''
as $$
  select t.id from public.event_teams t
  join storage.objects o on o.bucket_id = 'event-presentations'
    and o.name = 'team-pdf/' || t.event_id || '/' || t.id::text || '/presentation.pdf'
  where t.event_id = target_event_id and private.can_view_team(t.id)
$$;
revoke all on function private.workspace_team_pdfs(text) from public, anon;
grant execute on function private.workspace_team_pdfs(text) to authenticated;

create function public.list_workspace_team_pdfs(target_event_id text)
returns table(team_id uuid) language sql stable security invoker set search_path = ''
as $$ select * from private.workspace_team_pdfs(target_event_id) $$;
revoke all on function public.list_workspace_team_pdfs(text) from public, anon;
grant execute on function public.list_workspace_team_pdfs(text) to authenticated;
