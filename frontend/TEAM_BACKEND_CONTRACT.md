# Teams: frontend handoff for the Supabase owner

The new team screens are in `src/teams.tsx`. The UI is functional locally, using `sessionStorage` per current user or demo role. It does not send email, notify another person or modify Supabase. Example teams are explicitly marked as examples.

Do not remove the preview notice until real persistence, invitations and join requests are connected and tested. Keep the existing project/account schemas if the backend already has them; adapt the frontend to those schemas rather than blindly applying another schema.

## Current frontend types

- `Team`: id, ownerId, name, description, field, roles (open specialties), members, optional projectId, open, optional sample.
- `TeamMember`: id, name, email, role, status (`member` or `invited`). The owner is a member. Invitees do not count as members before acceptance.
- `JoinRequest`: id, teamId, userId, name, email, role, message, status (`pending`, `accepted`, `declined`).

Import the types directly from `src/teams.tsx`. Replace the local `readStore`/`commit` persistence behind `TeamProvider` with a backend adapter. Store team rows, memberships, invitations and join requests separately rather than putting private email lists in a public team JSON column.

## Required backend operations

1. List open teams (public name, description, field, roles and accepted-member count only).
2. List the authenticated user's owned/member teams and their own join requests.
3. Create a team; derive owner_id from the verified session on the server and create the owner membership atomically.
4. Owner updates team details, project link, open roles and recruiting status. A linked project must be owned by that owner or explicitly authorized.
5. Owner creates/cancels an invitation by normalized email and role. Backend sends an email with an expiring, one-use acceptance token; the recipient must sign in as the matching verified email. Do not let the frontend mark invitation delivery as successful before sending succeeds.
6. Recipient accepts or declines an invitation. Accepting creates one membership atomically; enforce unique team/user membership.
7. Authenticated user submits a join request (one pending request per team/user). Owner lists requests for their team and accepts/declines. Acceptance and membership creation must be atomic.
8. Owner removes a member, preserving the owner's membership. Add voluntary leave if desired.

## Access rules

- Never expose participant or invitee email addresses through public team discovery.
- Only the verified owner or a server-verified administrator can edit a team, manage invitations, remove members or decide join requests.
- A user can create/read their own request. Only its recipient team owner/admin may read another user's request.
- Invitation acceptance must be checked on the server against the signed-in email, expiry and token; knowing a team ID or email is insufficient.
- Closed teams reject new join requests. Duplicate invitations, memberships and pending requests must be constrained in the database.
- The current actor from client state is a UI convenience, not proof of ownership. Enforce permissions with RLS/server functions.
- Replace the local demo sample data with actual public teams in live mode.

## Project discovery

`Directory` in `src/App.tsx` now has a card grid, localized text search, field tabs, stage filter, sorting, pagination and empty states. Recruiting is shown only when an open team with at least one open role is linked through `Team.projectId`.

After connecting, test two separate accounts: create a team, invite/accept, submit/accept a join request, reload, reject cross-user edits, verify private email addresses are absent from public responses, and check the project recruiting filter.
