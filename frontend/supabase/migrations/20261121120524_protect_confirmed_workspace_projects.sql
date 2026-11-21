-- The workspace cannot remove a project while it is approved or confirmed.
create or replace function private.set_workspace_project_removed(target_id text,kind text,removed boolean)
returns void language plpgsql security definer set search_path=''
as $$
declare
  current_status text;
begin
  if (select auth.uid()) is null or not private.is_admin() then
    raise exception 'Only administrators can remove or restore projects' using errcode='42501';
  end if;
  if kind='project' then
    select p.data->>'status' into current_status from public.projects p where p.id = target_id for update;
    if not found then raise exception 'Project not found' using errcode='P0002'; end if;
    if removed then
      if current_status = 'Approved' then
        raise exception 'Approved projects cannot be removed' using errcode = '42501';
      end if;
      insert into private.removed_projects(project_id,removed_by) values(target_id,auth.uid()) on conflict do nothing;
    else delete from private.removed_projects where project_id=target_id;
    end if;
  elsif kind='event-team' then
    select t.status into current_status from public.event_teams t where t.id = target_id::uuid for update;
    if not found then raise exception 'Project not found' using errcode='P0002'; end if;
    if removed then
      if current_status = 'confirmed' then
        raise exception 'Confirmed teams cannot be removed' using errcode = '42501';
      end if;
      insert into private.removed_event_teams(team_id,removed_by) values(target_id::uuid,auth.uid()) on conflict do nothing;
    else delete from private.removed_event_teams where team_id=target_id::uuid;
    end if;
  else raise exception 'Invalid project kind' using errcode='22023';
  end if;
end
$$;

-- Preserve the existing participant withdrawal flow. Administrators cannot
-- bypass the workspace rule via a direct delete.
create policy event_team_admin_preserve_confirmed on public.event_teams
  as restrictive for delete to authenticated
  using (status <> 'confirmed' or not (select private.is_admin()));
