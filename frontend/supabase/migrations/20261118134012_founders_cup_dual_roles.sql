-- A student can captain one team and join one other team per event.
-- The team table already enforces one team per captain.
set local lock_timeout = '5s';

create unique index event_team_members_one_guest_per_event_idx
  on public.event_team_members (event_id, email)
  where not is_captain;

alter table public.event_team_members
  drop constraint event_team_members_event_id_email_key;
