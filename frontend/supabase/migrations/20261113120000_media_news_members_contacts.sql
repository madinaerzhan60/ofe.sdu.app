-- Office for Entrepreneurship: media moderators, news, team members by SDU email
-- and private project contacts. Apply after the existing migrations, once.
-- Nothing here changes existing rows. Private data lives outside projects.data,
-- because published project rows are readable by anyone. Privileged helpers live
-- in the private schema, which PostgREST does not expose.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

-- 1. Media moderators -------------------------------------------------------
create table public.app_media_editors (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  added_at timestamptz not null default now()
);
alter table public.app_media_editors enable row level security;
revoke all on table public.app_media_editors from anon, authenticated;

create or replace function private.is_media_editor()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists(select 1 from public.app_media_editors where user_id = (select auth.uid()))
    or private.is_admin()
$$;
revoke all on function private.is_media_editor() from public, anon, authenticated;
grant execute on function private.is_media_editor() to anon, authenticated;

-- API-visible wrapper so the site can ask "may I publish news?".
create or replace function public.is_media_editor()
returns boolean language sql stable security invoker set search_path = ''
as $$ select private.is_media_editor() $$;
revoke all on function public.is_media_editor() from public;
grant execute on function public.is_media_editor() to anon, authenticated;

create or replace function public.list_media_editors()
returns table(email text, added_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Administrator access required';
  end if;
  return query select m.email, m.added_at from public.app_media_editors m order by m.added_at;
end
$$;
revoke all on function public.list_media_editors() from public, anon;
grant execute on function public.list_media_editors() to authenticated;

-- Grants or removes the media role by corporate email. The account must already
-- exist and be confirmed, so the role can never be attached to an unowned address.
create or replace function public.set_media_editor(target_email text, enabled boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  normalized text := lower(btrim(coalesce(target_email, '')));
  target uuid;
begin
  if not private.is_admin() then
    raise exception 'Administrator access required';
  end if;
  if normalized !~ '^[a-z0-9._%+-]+@sdu\.edu\.kz$' then
    raise exception 'Use an @sdu.edu.kz email';
  end if;
  if enabled then
    select u.id into target
    from auth.users u
    where lower(u.email) = normalized and u.email_confirmed_at is not null
    limit 1;
    if target is null then
      raise exception 'No confirmed account uses this email';
    end if;
    insert into public.app_media_editors(user_id, email) values (target, normalized)
    on conflict (user_id) do update set email = excluded.email;
  else
    delete from public.app_media_editors where email = normalized;
  end if;
end
$$;
revoke all on function public.set_media_editor(text, boolean) from public, anon;
grant execute on function public.set_media_editor(text, boolean) to authenticated;

-- 2. News -------------------------------------------------------------------
create table public.news (
  id text primary key,
  author_id uuid references auth.users(id) on delete set null default auth.uid(),
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_news check (
    jsonb_typeof(data) = 'object'
    and data ?& array['id', 'title', 'category', 'published']
    and data->>'id' = id
    and jsonb_typeof(data->'title') = 'string'
    and length(btrim(data->>'title')) between 1 and 200
    and data->>'category' in ('business', 'it', 'hackathons', 'championships', 'champions', 'university')
    and jsonb_typeof(data->'published') = 'boolean'
    and octet_length(data::text) < 200000
  )
);
create index news_published_idx on public.news ((data->>'published'));
alter table public.news enable row level security;
revoke all on table public.news from anon, authenticated;
grant select on table public.news to anon, authenticated;
-- author_id and timestamps are never client-controlled.
grant insert (id, data), update (data), delete on table public.news to authenticated;

create policy news_read on public.news for select
to anon, authenticated
using (data->>'published' = 'true' or (select private.is_media_editor()));
create policy news_insert on public.news for insert
to authenticated
with check ((select private.is_media_editor()) and author_id = (select auth.uid()));
create policy news_update on public.news for update
to authenticated
using ((select private.is_media_editor()))
with check ((select private.is_media_editor()));
create policy news_delete on public.news for delete
to authenticated
using ((select private.is_media_editor()));

create or replace function private.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end
$$;
revoke all on function private.touch_updated_at() from public, anon, authenticated;
create trigger touch_news_updated_at before update on public.news
for each row execute function private.touch_updated_at();

-- Public cover images for news. Anyone can view; only media editors write.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('news-media', 'news-media', true, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;
create policy news_media_insert on storage.objects for insert
to authenticated
with check (bucket_id = 'news-media' and storage.allow_only_operation('object.upload') and (select private.is_media_editor()));
create policy news_media_update on storage.objects for update
to authenticated
using (bucket_id = 'news-media' and storage.allow_only_operation('object.upload_update') and (select private.is_media_editor()))
with check (bucket_id = 'news-media' and (select private.is_media_editor()));
create policy news_media_delete on storage.objects for delete
to authenticated
using (bucket_id = 'news-media' and storage.allow_any_operation(array['object.delete', 'object.delete_many']) and (select private.is_media_editor()));

-- 3. Private project contacts and members ------------------------------------
-- Security-definer helpers avoid policy recursion between projects and members.
create or replace function private.owns_project(target_project_id text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists(
    select 1 from public.projects p
    where p.id = target_project_id and p.owner_id = (select auth.uid())
  )
$$;
revoke all on function private.owns_project(text) from public, anon, authenticated;
grant execute on function private.owns_project(text) to authenticated;

-- The email in the verified JWT. Accounts can only be created with @sdu.edu.kz
-- addresses (see the registration migration), so this is a corporate address.
create or replace function private.current_email()
returns text language sql stable set search_path = ''
as $$
  select lower(coalesce((select auth.jwt()->>'email'), ''))
$$;
revoke all on function private.current_email() from public, anon, authenticated;
grant execute on function private.current_email() to authenticated;

create table public.project_contacts (
  project_id text primary key references public.projects(id) on delete cascade,
  telegram text not null check (telegram ~ '^@[A-Za-z0-9_]{5,32}$'),
  phone text not null check (phone ~ '^\+7[0-9]{10}$'),
  updated_at timestamptz not null default now()
);
alter table public.project_contacts enable row level security;
revoke all on table public.project_contacts from anon, authenticated;
grant select, insert, update on table public.project_contacts to authenticated;

create policy project_contact_read on public.project_contacts for select
to authenticated
using ((select private.owns_project(project_id)) or (select private.is_admin()));
create policy project_contact_insert on public.project_contacts for insert
to authenticated
with check ((select private.owns_project(project_id)));
create policy project_contact_update on public.project_contacts for update
to authenticated
using ((select private.owns_project(project_id)))
with check ((select private.owns_project(project_id)));

create table public.project_members (
  project_id text not null references public.projects(id) on delete cascade,
  email text not null check (email ~ '^[a-z0-9._%+-]+@sdu\.edu\.kz$'),
  role text not null check (length(btrim(role)) between 1 and 40),
  added_at timestamptz not null default now(),
  primary key (project_id, email)
);
create index project_members_email_idx on public.project_members(email);
alter table public.project_members enable row level security;
revoke all on table public.project_members from anon, authenticated;
grant select, insert, delete on table public.project_members to authenticated;

create or replace function private.is_project_member(target_project_id text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists(
    select 1 from public.project_members m
    where m.project_id = target_project_id and m.email = private.current_email()
  )
$$;
revoke all on function private.is_project_member(text) from public, anon, authenticated;
grant execute on function private.is_project_member(text) to authenticated;

create policy project_member_read on public.project_members for select
to authenticated
using (
  (select private.owns_project(project_id))
  or (select private.is_admin())
  or email = (select private.current_email())
);
create policy project_member_insert on public.project_members for insert
to authenticated
with check ((select private.owns_project(project_id)));
create policy project_member_delete on public.project_members for delete
to authenticated
using ((select private.owns_project(project_id)));

-- Team members may see the project they were added to, even before publication.
create policy project_read_member on public.projects for select
to authenticated
using ((select private.is_project_member(id)));
