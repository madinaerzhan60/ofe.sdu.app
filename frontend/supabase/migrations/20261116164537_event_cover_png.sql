-- Canvas PNG encoding is supported across browsers, including Safari. Keep
-- existing WebP covers readable while new uploads use normalized PNG files.
update storage.buckets set allowed_mime_types=array['image/webp','image/png'] where id='event-covers';
alter table public.event_teams drop constraint event_cover_in_team_folder;
alter table public.event_teams add constraint event_cover_in_team_folder check (
  cover_path is null or (
    split_part(cover_path,'/',1)=event_id
    and split_part(cover_path,'/',2)=id::text
    and cover_path ~ '^[a-z0-9-]{1,64}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(webp|png)$'
  )
);
create or replace function private.event_cover_team(object_name text)
returns uuid language sql immutable set search_path = ''
as $$
  select case when object_name ~ '^[a-z0-9-]{1,64}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|png)$'
    then split_part(object_name,'/',2)::uuid end
$$;
