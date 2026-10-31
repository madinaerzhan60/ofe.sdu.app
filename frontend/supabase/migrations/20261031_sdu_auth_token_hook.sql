-- Prepared only: applying this migration does not activate the hook.
-- After approval, configure Authentication > Hooks > Custom Access Token
-- to use public.sdu_access_token_hook. Google is the project's only OAuth provider.
-- Fail rather than overwrite an unexpectedly existing function of this name.
create function public.sdu_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  -- Auth supplies both the method and AMR; clients cannot set either. AMR keeps
  -- this restriction on OAuth session refreshes while preserving password auth.
  if event->>'authentication_method' = 'oauth'
    or coalesce(event->'claims'->'amr', '[]'::jsonb) @> '[{"method":"oauth"}]'::jsonb then
    -- identity_data here is Google's server-stored provider response, not the
    -- user-editable user_metadata or the client-controlled hd hint.
    if coalesce(event->'claims'->>'email', '') !~* '^[^@[:space:]]+@sdu\.edu\.kz$'
      or not exists (
        select 1
        from auth.users account
        join auth.identities identity on identity.user_id = account.id
        where account.id = (event->>'user_id')::uuid
          and account.email_confirmed_at is not null
          and lower(account.email) = lower(event->'claims'->>'email')
          and identity.provider = 'google'
          and lower(identity.identity_data->>'email') = lower(account.email)
          and identity.identity_data->>'email_verified' = 'true'
      ) then
      return jsonb_build_object('error', jsonb_build_object(
        'http_code', 403,
        'message', 'Use your verified @sdu.edu.kz Google account.'
      ));
    end if;
  end if;

  -- Preserve the complete claims, including role, expiry and session identity.
  return jsonb_build_object('claims', event->'claims');
end;
$$;

revoke all on function public.sdu_access_token_hook(jsonb) from public, anon, authenticated;
grant usage on schema public to supabase_auth_admin;
grant execute on function public.sdu_access_token_hook(jsonb) to supabase_auth_admin;
