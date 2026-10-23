-- Keep privileged authorization helpers outside the API-exposed public schema.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.app_admins
    where user_id = (select auth.uid())
  )
$$;

revoke all on function private.is_admin() from public, anon, authenticated;
grant execute on function private.is_admin() to anon, authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$ select private.is_admin() $$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create or replace function private.project_has_current_consent(target_project_id text)
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
        or (select private.is_admin())
        or (
          project.data->>'status' = 'Approved'
          and project.data->>'visible' = 'true'
          and latest_consent.granted
        )
      )
  ), false)
$$;

revoke all on function private.project_has_current_consent(text) from public, anon, authenticated;
grant execute on function private.project_has_current_consent(text) to anon, authenticated;

drop policy profile_read_own_or_admin on public.profiles;
create policy profile_read_own_or_admin
on public.profiles for select
to authenticated
using (user_id = (select auth.uid()) or (select private.is_admin()));

drop policy publication_consent_read_own_or_admin on public.publication_consents;
create policy publication_consent_read_own_or_admin
on public.publication_consents for select
to authenticated
using (user_id = (select auth.uid()) or (select private.is_admin()));

drop policy project_read on public.projects;
create policy project_read
on public.projects for select
to anon, authenticated
using (
  owner_id = (select auth.uid())
  or (select private.is_admin())
  or (
    data->>'status' = 'Approved'
    and data->>'visible' = 'true'
    and (select private.project_has_current_consent(id))
  )
);

drop policy project_update on public.projects;
create policy project_update
on public.projects for update
to authenticated
using (owner_id = (select auth.uid()) or (select private.is_admin()))
with check (owner_id = (select auth.uid()) or (select private.is_admin()));

create or replace function public.guard_project_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id or new.owner_id is distinct from old.owner_id then
    raise exception 'Project identity cannot change';
  end if;
  if not private.is_admin() then
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
end
$$;

drop policy event_read on public.events;
create policy event_read
on public.events for select
to anon, authenticated
using (data->>'published' = 'true' or (select private.is_admin()));

drop policy event_insert on public.events;
create policy event_insert
on public.events for insert
to authenticated
with check ((select private.is_admin()));

drop policy event_update on public.events;
create policy event_update
on public.events for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

drop policy registration_read on public.event_registrations;
create policy registration_read
on public.event_registrations for select
to authenticated
using (user_id = (select auth.uid()) or (select private.is_admin()));

drop policy project_event_read on public.project_events;
create policy project_event_read
on public.project_events for select
to anon, authenticated
using (
  (select private.is_admin())
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
        and (select private.project_has_current_consent(project.id))
    )
    and exists (
      select 1
      from public.events event
      where event.id = event_id
        and event.data->>'published' = 'true'
    )
  )
);

drop policy project_event_insert_admin on public.project_events;
create policy project_event_insert_admin
on public.project_events for insert
to authenticated
with check (
  (select private.is_admin())
  and assigned_by = (select auth.uid())
);

drop policy project_event_delete_admin on public.project_events;
create policy project_event_delete_admin
on public.project_events for delete
to authenticated
using ((select private.is_admin()));

drop function public.project_has_current_consent(text);
