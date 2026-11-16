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

### Optional event covers

`event_teams.cover_path` is nullable. Captains can add, replace or remove a cover while registration is open; each update returns a confirmed registration to review. The image picker has no source-format/MIME whitelist. Browser-decodable images up to 5 MB are normalized to PNG for compatibility with Safari. Covers use immutable `<event_id>/<team_id>/<uuid>.png` paths (existing `.webp` files remain readable) in private `event-covers`, with RLS restricting uploads to the captain. Only the currently referenced cover of a confirmed registration in a published event is readable by visitors. Staged/old files remain private, overwrites and signed URLs are denied. Presentations and contact information stay private.

The catalogue returns `event-cover://` references only when a cover exists, and `StorageImage` downloads from `event-covers` through the SDK. Without a cover, card/profile components render no cover `<img>`. The wizard preserves its saved team ID through upload failures so retrying does not create another registration.

## Administrator project removal

Admins can remove and restore ordinary submissions and Founders Cup products from the workspace. Removal requires a named-project confirmation dialog and is reversible through the Removed filter. It is not a purge: registration identity, event membership, files and consent history are retained for restoration. Existing event registration uniqueness still applies.

Removal metadata lives in unexposed `private.removed_projects` and `private.removed_event_teams`, without browser table grants. The public invoker RPC delegates to an admin-checked private mutation. Restrictive RLS hides removed records from guests, owners and members, while admins can list them for restoration. Public catalogue and elevated Storage/member helpers enforce the same rule. The `removed` property in frontend submissions is derived/read-only and excluded from JSON project writes.
