-- Optional, immutable cover files. Private until the registration is confirmed;
-- only the referenced cover of a confirmed, published event is publicly readable.
alter table public.event_teams add column cover_path text;
alter table public.event_teams add constraint event_cover_in_team_folder check (
  cover_path is null or (
    split_part(cover_path, '/', 1) = event_id
    and split_part(cover_path, '/', 2) = id::text
    and cover_path ~ '^[a-z0-9-]{1,64}/[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$'
  )
);
grant update(cover_path) on public.event_teams to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('event-covers','event-covers',false,5242880,array['image/webp']);

create function private.event_cover_team(object_name text)
returns uuid language sql immutable set search_path = ''
as $$
  select case when object_name ~ '^[a-z0-9-]{1,64}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$'
    then split_part(object_name,'/',2)::uuid end
$$;
revoke all on function private.event_cover_team(text) from public;
grant execute on function private.event_cover_team(text) to anon,authenticated;

create function private.event_cover_access(object_name text, action text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.event_teams t join public.events e on e.id=t.event_id
    where t.id=private.event_cover_team(object_name)
      and t.event_id=split_part(object_name,'/',1)
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
revoke all on function private.event_cover_access(text,text) from public;
grant execute on function private.event_cover_access(text,text) to anon,authenticated;

create policy event_cover_read on storage.objects for select to anon,authenticated
using (
  bucket_id='event-covers'
  and storage.allow_any_operation(array['object.get_authenticated','object.get_authenticated_info','object.head_authenticated_info','object.upload','object.delete','object.delete_many'])
  and private.event_cover_access(name,'read')
);
create policy event_cover_insert on storage.objects for insert to authenticated
with check (bucket_id='event-covers' and storage.allow_only_operation('object.upload') and private.event_cover_access(name,'upload'));
-- No UPDATE policy: uploaded images cannot change underneath a reviewed cover.
create policy event_cover_delete on storage.objects for delete to authenticated
using (
  bucket_id='event-covers' and storage.allow_any_operation(array['object.delete','object.delete_many'])
  and private.event_cover_access(name,'delete')
);

create function private.guard_event_cover()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.cover_path is not null and (tg_op='INSERT' or new.cover_path is distinct from old.cover_path) then
    if private.event_cover_team(new.cover_path) is distinct from new.id
      or split_part(new.cover_path,'/',1)<>new.event_id
      or not exists (select 1 from storage.objects where bucket_id='event-covers' and name=new.cover_path) then
      raise exception 'Upload the cover to this team’s folder first' using errcode='23514';
    end if;
  end if;
  return new;
end
$$;
revoke all on function private.guard_event_cover() from public,anon,authenticated;
create trigger guard_event_cover before insert or update of cover_path on public.event_teams
for each row execute function private.guard_event_cover();

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
  where t.status='confirmed' and t.consent and e.data->>'published'='true'
$$;
