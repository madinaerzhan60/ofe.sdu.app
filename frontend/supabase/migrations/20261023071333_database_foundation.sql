-- OFE database foundation: profile, consent, and project-event sidecar data.
-- This forward migration preserves the existing projects/events JSONB contract.

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update(display_name) on table public.profiles to authenticated;

create policy profile_read_own_or_admin
on public.profiles for select
to authenticated
using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy profile_update_own
on public.profiles for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles(user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', ''))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user_profile() from public, anon, authenticated;

create trigger create_profile_after_auth_user
after insert on auth.users
for each row execute function public.handle_new_user_profile();

insert into public.profiles(user_id, display_name)
select id, coalesce(raw_user_meta_data->>'display_name', '')
from auth.users
on conflict (user_id) do nothing;

create or replace function public.set_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.set_profile_updated_at() from public, anon, authenticated;

create trigger set_profile_updated_at_before_update
before update on public.profiles
for each row execute function public.set_profile_updated_at();
