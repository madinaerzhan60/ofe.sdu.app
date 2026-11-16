-- A deliberately public, read-only projection. The registration tables remain
-- private: no emails, contacts, member records, decks or moderation notes leave
-- this function. Confirmation publishes product information for its own event;
-- it does not fabricate a startup publication-consent record.
create function private.confirmed_event_projects()
returns table(id text, event_id text, data jsonb)
language sql stable security definer set search_path = ''
as $$
  select 'event-team-' || t.id::text, t.event_id,
    jsonb_build_object(
      'name', t.product_name, 'description', t.tagline, 'about', t.description,
      'industry', t.industry, 'stage', t.stage, 'team', t.team_name,
      'product', coalesce(t.product_url, ''), 'createdAt', t.created_at
    )
  from public.event_teams t
  join public.events e on e.id = t.event_id
  where t.status = 'confirmed' and t.consent
    and e.data->>'published' = 'true'
$$;
revoke all on function private.confirmed_event_projects() from public;
grant execute on function private.confirmed_event_projects() to anon, authenticated;

create function public.list_confirmed_event_projects()
returns table(id text, event_id text, data jsonb)
language sql stable security invoker set search_path = ''
as $$ select * from private.confirmed_event_projects() $$;
revoke all on function public.list_confirmed_event_projects() from public;
grant execute on function public.list_confirmed_event_projects() to anon, authenticated;

-- Atomic, administrator-only event assignment for ordinary project submissions.
-- Existing RLS and foreign keys still apply, including draft-event visibility.
create function public.set_project_events(target_project_id text, event_ids text[])
returns void language plpgsql security invoker set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can assign project events' using errcode = '42501';
  end if;
  if not exists (select 1 from public.projects where id = target_project_id) then
    raise exception 'Project not found' using errcode = '23503';
  end if;
  delete from public.project_events where project_id = target_project_id;
  insert into public.project_events(project_id, event_id, assigned_by)
    select target_project_id, event_id, auth.uid()
    from (select distinct unnest(event_ids) as event_id) selected;
end;
$$;
revoke all on function public.set_project_events(text, text[]) from public, anon;
grant execute on function public.set_project_events(text, text[]) to authenticated;
