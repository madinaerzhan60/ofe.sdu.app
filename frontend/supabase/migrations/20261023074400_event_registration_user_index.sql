-- Cover the auth.users foreign key and user registration lookup path.
create index event_registrations_user_idx
on public.event_registrations(user_id);
