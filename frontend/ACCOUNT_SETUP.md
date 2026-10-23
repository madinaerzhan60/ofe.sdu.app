# Real accounts

The app uses Supabase Auth for email/password accounts and Postgres row-level security for ownership and administrator access. No service-role key belongs in the browser.

## Connect

1. Create a Supabase project and apply these migrations once, in order: `supabase/migrations/20261022_accounts.sql`, `supabase/migrations/20261023071333_database_foundation.sql`, `supabase/migrations/20261023074400_event_registration_user_index.sql`, then `supabase/migrations/20261023115503_storage_security_hardening.sql`.
2. Copy `.env.example` to `.env.local`. Fill in the project URL and **publishable** key from the project Connect dialog. Never use a secret or service-role key.
3. In Authentication → URL Configuration, add the final website address as Site URL and add the exact allowed redirect URLs. Add `http://localhost:8443/` only for local development.
4. Enable email/password sign-up and email confirmation. Set a minimum password length of at least 10 characters.
5. Configure a production SMTP provider before inviting the public. The built-in email service is limited and may only deliver to authorized addresses. Keep the SMTP password only in Supabase settings.
6. Restart Vite after changing the environment file. For hosting, set both VITE variables before the production build.

Without both environment values, the existing preview remains in **demo mode**. This is not real registration.

## Appoint the first administrator

Create and confirm your account first. In the Supabase SQL Editor, replace the placeholder UUID with its ID from Authentication → Users:

```sql
insert into public.app_admins(user_id) values ('YOUR_USER_UUID');
```

Only the project owner can grant this role. Account metadata supplied at sign-up cannot grant admin access. Sign out and back in after assigning the role.

## Verify before public launch

Run the automated checks from this `frontend` directory first:

```bash
pnpm test:security
pnpm build
```

- Sign up using a real email, confirm it, sign in, sign out, and use password recovery.
- Submit a project; reload and verify it persists.
- With another account, verify the first account's unpublished project cannot be read or changed through direct API requests.
- With a regular user token, attempt to alter `status`, `visible`, owner, review feedback, or event participation: the database must deny it.
- With an admin account, approve the project. Confirm visitors see it only when the author allowed publication.
- Register for a published event, reload, and verify there is only one registration per user and event.
- Test failed requests: forms must not report successful saves or close after a rejected write.

### Hosted Storage smoke test

Use the private `startup-media` bucket; never make it public. Test through the same publishable-key client the frontend will use:

- Owner: create a project first, then upload `logo.webp` and `cover.webp` below `<owner_uuid>/<project_id>/`. Confirm PNG, JPEG, and WebP files at or below 5 MB work.
- Validation: confirm another UUID prefix, another user's project ID, an unsupported MIME type, and a file above 5 MB are denied.
- Other student: confirm private project media cannot be listed, downloaded, changed, or deleted.
- Administrator: confirm the media can be read for moderation but cannot be rewritten through ordinary browser permissions.
- Guest: confirm Pending, Rejected, hidden, withdrawn-consent, and stale-consent project media cannot be read.
- Publication: approve the project, enable visibility, and keep current granted consent; confirm its media can then be read by a guest through an authenticated or signed request.
- Immutability: while the project is publicly eligible, confirm the owner cannot replace or delete its media.
- Withdrawal: withdraw publication consent and confirm guest media access stops immediately.

Store only the object path in `projects.data.image` or `projects.data.cover`. Public bucket URLs are forbidden because the bucket is private.

## Hosted migration verification (2026-10-23)

Project `ofe-sdu-app` has the `storage_security_hardening` migration applied once. The live catalogue check confirmed:

- `startup-media` is private, limited to 5,242,880 bytes, and allows `image/png`, `image/jpeg`, and `image/webp`.
- The owner INSERT/UPDATE/DELETE policies and shared SELECT policy exist on `storage.objects`.
- `private.is_admin()` and `private.project_has_current_consent(text)` hold the privileged implementations.
- `public.is_admin()` remains available as a `SECURITY INVOKER` compatibility RPC.
- No externally executable `SECURITY DEFINER` function remains in `public`.

The Security Advisor now reports only two informational `RLS enabled, no policy` notices. They are intentional for `app_admins` and `publication_consent_policies`: browser grants are revoked and these administrative tables are deliberately locked. See [Supabase lint 0008](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

The Performance Advisor reports unused-index informational notices because the new database has no application rows yet. Keep the ownership, consent-history, event-link, and registration indexes until representative traffic exists, then reassess with [Supabase lint 0005](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).

Then follow the hosted database checks, role matrix, legacy event-year diagnostic query, and rollback guidance in [`docs/DATABASE_FOUNDATION.md`](docs/DATABASE_FOUNDATION.md).

`localhost` is still only local. A publicly reachable HTTPS hosting address and the configured Supabase project are both required for other people to use accounts.

References: https://supabase.com/docs/guides/auth/passwords and https://supabase.com/docs/guides/auth/auth-smtp
