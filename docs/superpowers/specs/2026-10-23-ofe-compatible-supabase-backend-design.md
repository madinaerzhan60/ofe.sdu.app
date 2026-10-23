# OFE Compatible Supabase Backend Design

Date: 2026-10-23
Owner: Nucha (Developer 2, Database and RLS)

## Intent

Build Nucha's database portion of the OFE MVP without redesigning the finished frontend. The current React application expects `projects` and `events` records whose user-facing fields live in a `data` JSONB object. This design preserves that interface while adding the relational records, security boundaries, audit history, public read surface, and tests required by the updated team plan.

## Goals

- Keep the existing frontend's project and event data shape working.
- Make ownership, moderation, publication, and event participation enforceable in PostgreSQL rather than trusting the browser.
- Record publication-consent changes as an auditable history with policy version and timestamp.
- Model the many-to-many relationship between projects and Demo Day events.
- Provide a safe, intentionally limited public catalogue query.
- Add Supabase Storage policies for startup media.
- Test guest, owner, other-student, and administrator access.
- Deliver migrations that can be reviewed and applied through Supabase CLI or SQL Editor.

## Non-goals

- No visual or layout changes.
- No replacement of the existing React data model in this milestone.
- No implementation of Google OAuth or server API handlers; those belong to Developer 3.
- No deployment, backup, or CI configuration; those belong to Developer 4.
- Team invitations and email delivery remain outside this first database milestone. The existing `TEAM_BACKEND_CONTRACT.md` stays a later integration contract unless the team lead explicitly moves it into the launch scope.
- No service-role key or real secret will be committed.

## Constraints

- The frontend currently reads and writes `projects(id, owner_id, data)` and `events(id, data)` directly with the Supabase browser client.
- Existing project JSON uses `status`, `publication`, `consentVersion`, `consentAt`, `visible`, and `eventYears`.
- Existing deployments may already have applied `20261022_accounts.sql`; therefore this work must be a new forward migration, not an edit to the old migration.
- Public records must require all three conditions: approved status, current publication consent, and administrator-controlled visibility.
- Students must never be able to assign admin privileges or change moderation/event-assignment fields.

## Approaches considered

### 1. Compatible relational sidecar - selected

Keep `projects` and `events` as the frontend compatibility tables. Add normalized side tables, triggers, views, policies, and tests around them. This minimizes frontend breakage while satisfying the database/security responsibilities.

Trade-off: project content remains JSONB for the MVP, so some application-level fields are not fully normalized.

### 2. Full normalized replacement

Replace the current tables with normalized `startups`, `submissions`, and content tables, then rewrite frontend and API integration.

Trade-off: cleaner long-term model, but too disruptive for the November 10 launch and outside Nucha's database-only boundary.

### 3. Harden the current migration only

Keep the existing schema and add more policies/tests without relational consent or event links.

Trade-off: quickest, but it would leave major assigned requirements incomplete.

## Data design

### Existing compatibility tables retained

- `public.app_admins(user_id)` remains the explicit admin allowlist.
- `public.projects(id, owner_id, data)` remains the frontend's startup/submission record.
- `public.events(id, data)` remains the frontend's event record.
- `public.event_registrations(event_id, user_id, created_at)` remains the attendee relation.

### New `profiles` table

- `user_id uuid primary key references auth.users(id)`
- `display_name text`
- `created_at timestamptz`
- `updated_at timestamptz`

Profiles are created automatically by an `auth.users` insert trigger. `display_name` is copied from `raw_user_meta_data.display_name` when present and otherwise starts as an empty string. The migration backfills profiles for existing users. Users may read/update their own profile. Administrators may read profiles needed for moderation. No public profile list is exposed in this milestone.

### New `project_events` table

- `project_id text references projects(id)`
- `event_id text references events(id)`
- `assigned_by uuid references auth.users(id)`
- `created_at timestamptz`
- Primary key `(project_id, event_id)`

Only administrators may create or remove assignments. Owners may read assignments for their own projects. Guests may read assignments only when both the event is published and the linked project is publicly publishable. The frontend's existing `eventYears` field remains accepted temporarily but is not authoritative.

### New `publication_consents` table

- `id bigint generated always as identity primary key`
- `project_id text references projects(id)`
- `user_id uuid references auth.users(id)`
- `granted boolean`
- `policy_version text`
- `policy_document text`
- `recorded_at timestamptz`
- `source text` constrained to known values such as `frontend`, `admin`, or `migration`

Rows are append-only. Client roles cannot insert, update, or delete them directly; the project compatibility trigger is the single write path for this milestone. Owners may read their own history, and administrators may read all consent records. This prevents the audit table and frontend-visible JSON from diverging.

Add `publication_consent_policies(version, document_id, effective_at, is_current)`. Seed version `2026-10-22` with document ID `startup-publication-consent`. Policy rows are maintained only through trusted migration/manual SQL, not browser clients. Exactly one policy is current. Public eligibility requires the newest consent decision for the current policy version to be granted, so a future policy version requires fresh consent.

A trigger on project insert/update records a consent event whenever `publication`, `consentVersion`, or `consentAt` changes. `publication` is a JSON boolean; `true` records a grant and `false` records a withdrawal. `consentVersion` is a nonblank string that must identify the current seeded policy, and `consentAt` is an ISO timestamp. This preserves compatibility with the current frontend. The trigger rejects missing policy versions, invalid timestamps, timestamps more than five minutes in the future, or attempts to record consent for another owner.

The project JSON is the canonical compatibility write model. Direct audit-table writes are denied, so bidirectional synchronization is unnecessary.

### Project JSON contract

Allowed keys are `id`, `ownerId`, `name`, `description`, `industry`, `stage`, `team`, `product`, `status`, `publication`, `consentVersion`, `consentAt`, `feedback`, `createdAt`, `visible`, `image`, `cover`, `about`, `year`, and `eventYears`. Unknown keys are rejected so private or unreviewed data cannot accidentally become public.

Owners may change `name`, `description`, `industry`, `stage`, `team`, `product`, `image`, `cover`, `about`, `publication`, `consentVersion`, and `consentAt`. `id`, `ownerId`, and `createdAt` are immutable. `status`, `visible`, `feedback`, `year`, and `eventYears` are administrator-only. `project_events`, not `eventYears`, is the authoritative event assignment.

### Safe public read surface

Create `public.published_projects` and `public.published_events` views (or equivalent stable SQL functions if required by PostgreSQL security semantics).

The project public surface returns only catalogue fields used by the frontend: ID, name, description, industry, stage, team display text, product, optional image/cover references, optional about text, and published event IDs. It excludes `owner_id`, moderation feedback, private timestamps, and consent audit data.

The effective publication rule is:

1. `data.status = 'Approved'`;
2. `data.visible = true`;
3. the latest consent record is granted; and
4. `name`, `description`, `industry`, `stage`, `team`, and `product` are JSON strings whose trimmed values are nonblank. Limits are: name 100 characters, description 300, industry 100, stage 50, team 10,000, product 10,000, and optional about 10,000.

An event is public only when `data.published` is the JSON boolean `true`. The public event surface exposes `id`, `title`, `date`, `place`, and optional `image`; all required text fields must be nonblank.

Direct anonymous access to private project rows remains denied. During integration, Developer 3 or Developer 1 should switch anonymous catalogue reads to the public surface. Authenticated owners/admins continue using `projects` for workspace and moderation screens.

## RLS rules

### Projects

- Guest: read only public projects.
- Student owner: create a Pending, non-visible project; read/update their own record.
- Other student: no access to another student's private project.
- Administrator: read all and change moderation fields.
- Owner updates may change content and consent inputs but never owner, ID, moderation status, visibility, review feedback, created time, or event assignments.

### Events and registrations

- Guest: read published events only.
- Student: read published events and create one registration for themselves.
- Administrator: create/update events and read registrations.
- No user may register another user or register for an unpublished event.

### Profiles, project events, and consent

- Profiles are self-owned; admins have moderation read access.
- Project-event links are admin-written.
- Consent is owner-written, append-only, and admin-readable.
- Public access uses the derived public surfaces, never the consent history.
- Browser clients cannot add or remove `app_admins`. Admin assignment remains a Supabase project-owner/service-role/manual SQL action.

## Storage

Create a private `startup-media` bucket. Object paths use `<owner_uuid>/<project_id>/<random-file-name>`.

- Owners may upload/update/delete objects only below their own UUID prefix and only for projects they own.
- Other students cannot list or read private objects.
- Administrators may read objects for moderation.
- Public display uses a controlled public-media mechanism only for approved, visible, consented projects. If signed URLs are required, Developer 3 supplies them server-side; the bucket itself stays private.

## Migration and compatibility strategy

1. Add a new dated migration; do not rewrite `20261022_accounts.sql`.
2. Create tables, constraints, indexes, helper functions, triggers, RLS policies, public surfaces, and Storage policies.
3. Seed the canonical `2026-10-22` publication policy and backfill one consent record for existing projects whose boolean, version, and timestamp are valid. Invalid or incomplete legacy consent is treated as not granted.
4. Parse a legacy event year from the first four characters of `events.data.date`. Backfill `project_events` only when one `eventYears` value matches exactly one event. Skip unmatched or ambiguous values and expose a diagnostic query in the database contract so the team can resolve them manually.
5. Keep `eventYears` during the compatibility period, but document `project_events` as authoritative.
6. Provide rollback notes. Destructive automatic rollback is not included because consent history must not be silently discarded.

## Testing

Extend the existing database test suite test-first. Tests must cover:

- owner creation of Pending/non-visible projects;
- rejection of forged ownership and self-approval;
- private-project isolation between students;
- admin moderation and project-event assignment;
- public visibility requiring approval, visibility, and latest granted consent;
- consent grant, withdrawal, history immutability, and owner isolation;
- safe public surface excluding private fields;
- published/unpublished event registration rules and uniqueness;
- profile isolation;
- Storage path ownership and admin moderation access where the local test environment can represent Supabase Storage.

PGlite tests verify PostgreSQL behavior. A separate Supabase smoke-test checklist documents Storage and hosted RLS checks that PGlite cannot faithfully emulate.

## Deliverables

- New forward migration under `frontend/supabase/migrations/`.
- Expanded automated database tests under `frontend/tests/`.
- ERD/database contract document under `frontend/docs/`.
- Updated setup instructions describing migration order, public views, tests, and environment-variable names.
- No frontend UI edits and no secrets.

## Acceptance criteria

- Existing frontend types remain representable without a UI rewrite.
- All automated database tests pass.
- The project builds successfully.
- Anonymous users cannot read Pending, Rejected, hidden, or non-consented projects.
- Another student cannot read or modify private project, profile, consent, registration, or media records.
- Owners cannot self-approve, publish, or assign Demo Day participation.
- Administrators can moderate without bypassing consent.
- Consent history is append-only and public queries use the latest decision.
- A startup can be linked to multiple real event IDs.
- Public catalogue output excludes private fields.

## Builder decisions left open

- Exact index names and helper-function names may follow existing conventions.
- Public read surfaces may be views or stable SQL functions, whichever gives the clearest secure privilege model in the tested PostgreSQL/Supabase version.
- The Storage public-delivery mechanism may be signed URLs or a later approved media proxy; direct bucket public access is not required.
