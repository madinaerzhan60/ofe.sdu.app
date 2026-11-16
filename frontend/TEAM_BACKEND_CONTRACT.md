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

## Event project catalogue

Confirmed `event_teams` are a separate, read-only product projection from `list_confirmed_event_projects()`. They appear in the catalogue, home page and their event page, with an event tag. Only registrations with `status = confirmed`, consent and a published parent event are returned. Editing a confirmed registration resets its status and removes its card until reconfirmation. The projection includes product/team names, tagline, description, field, stage and public product URL. It excludes contact details, member/captain emails, decks and moderation notes. It does not manufacture ordinary startup publication consent.

Ordinary projects retain their existing review/publication rules. Their event IDs come from `project_events`, never from matching a calendar year. Administrators can assign events from project details through atomic `set_project_events()`. Event-derived cards stay outside writable `submissions`; editing/removing a registration does not create a duplicate startup application. Public recruitment and private personal-team invitation flows remain separate.
