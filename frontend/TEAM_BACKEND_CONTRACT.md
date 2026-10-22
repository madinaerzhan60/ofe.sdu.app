# Personal teams: frontend handoff

Current scope: students create their own teams and manage invitation drafts from My workspace → My teams. Public team discovery and Apply to team were removed at the product owner's request. Do not reintroduce them when connecting the backend.

`src/teams.tsx` currently uses sessionStorage per preview actor. Invitations are drafts: no email is sent and invitees are not members until acceptance. Keep the short demo notice until real persistence and delivery are connected.

## Backend operations

1. List the signed-in user's teams. Never return another owner's private member emails.
2. Create a team and its owner membership atomically. Derive owner_id from the authenticated server session.
3. Validate that any linked project belongs to the same owner.
4. Create/cancel invitation drafts with normalized email and role. Enforce uniqueness.
5. Send expiring, single-use invitations. Show delivery success only after confirmed delivery.
6. Accept an invitation only as the verified matching email; create membership atomically.
7. Let the owner remove another participant or invitation, preserving owner membership.

Enforce ownership with RLS/server functions. Client actor IDs are not authorization. Keep invitations separate from memberships and never expose email lists publicly. Legacy discovery/request types in the local store are unused; no public recruitment endpoints are required.
