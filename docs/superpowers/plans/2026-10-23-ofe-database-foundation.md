# OFE Database Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Nucha's first Supabase milestone—profiles, versioned publication consent, and many-to-many project/event assignments—without changing the existing React data contract.

**Architecture:** Keep `projects(id, owner_id, data)` and `events(id, data)` as compatibility tables. A new forward migration adds normalized sidecar tables, trusted triggers, RLS, and a current-consent helper; the existing PGlite suite verifies guest, owner, other-student, and administrator behavior.

**Tech Stack:** PostgreSQL/Supabase SQL, Row Level Security, PL/pgSQL triggers, Node.js test runner, PGlite.

**Spec:** `docs/superpowers/specs/2026-10-23-ofe-compatible-supabase-backend-design.md`

## Global Constraints

- Do not edit `frontend/supabase/migrations/20261022_accounts.sql`; add `20261023_database_foundation.sql`.
- Preserve the frontend's `projects`, `events`, and JSONB field names.
- Seed consent policy version `2026-10-22` with document ID `startup-publication-consent`.
- Never expose or commit Supabase secrets.
- Students cannot alter moderation fields, assign events, edit consent history, or grant admin access.
- This milestone does not add Storage policies or switch the frontend to safe public catalogue views.

## Review Focus

- A project update that leaves consent fields unchanged must not create a duplicate consent-history row; Task 2 tests the history count.
- A missing, malformed, stale-policy, or more-than-five-minutes-future consent timestamp must be rejected; Task 2 tests each class.
- An unknown JSON key must be rejected before it can accidentally reach a later public surface; Task 2 tests an `internalNotes` key.
- A new auth user with no display name metadata must still get an isolated profile with an empty display name; Task 1 tests both creation and visibility.
- Legacy `eventYears` data must not create an assignment when zero or multiple events match the year; Task 3 tests matched, unmatched, and ambiguous years.

---

### Task 1: Self-owned profiles

**Files:**
- Modify: `frontend/tests/account-security.test.mjs`
- Create: `frontend/supabase/migrations/20261023_database_foundation.sql`

**Interfaces:**
- Consumes: `auth.users(id, raw_user_meta_data)` and `public.is_admin()` from the baseline migration/test harness.
- Produces: `public.profiles(user_id, display_name, created_at, updated_at)` and `public.handle_new_user_profile()`.

- [ ] **Step 1: Extend the PGlite auth fixture and write the failing profile test**

Add `raw_user_meta_data jsonb not null default '{}'::jsonb` to the test-only `auth.users` table. Add test `profiles are created automatically and isolated` asserting: metadata display name is copied, missing display name becomes `''`, owners can read/update only themselves, another student cannot read it, and an administrator can read profiles.

- [ ] **Step 2: Run the targeted test and verify the expected failure**

Run: `node --test --test-name-pattern='profiles are created' tests/account-security.test.mjs`

Expected: FAIL because `public.profiles` does not exist.

- [ ] **Step 3: Add the profile schema, trigger, backfill, grants, and RLS**

Create the table and indexes; create `public.handle_new_user_profile() returns trigger` as a `security definer` function with a fixed empty `search_path`; trigger it after insert on `auth.users`; backfill existing users; allow self select/update and administrator select; deny anonymous access and client insert/delete.

- [ ] **Step 4: Run the targeted and baseline security tests**

Run: `node --test --test-name-pattern='profiles are created|database enforces ownership' tests/account-security.test.mjs`

Expected: 2 tests PASS.

- [ ] **Step 5: Commit the profile foundation**

```bash
git add frontend/tests/account-security.test.mjs frontend/supabase/migrations/20261023_database_foundation.sql
git commit -m "feat: add self-owned Supabase profiles"
```

### Task 2: Versioned publication-consent ledger

**Files:**
- Modify: `frontend/tests/account-security.test.mjs`
- Modify: `frontend/supabase/migrations/20261023_database_foundation.sql`

**Interfaces:**
- Consumes: compatibility project JSON fields `publication`, `consentVersion`, and `consentAt`.
- Produces: `publication_consent_policies`, append-only `publication_consents`, `record_project_consent()`, `project_has_current_consent(text) returns boolean`, and stricter project write validation.

- [ ] **Step 1: Write failing consent and JSON-contract tests**

Add test `publication consent is versioned append-only and controls public reads` asserting: an owner grant records one row; an unrelated content edit records none; withdrawal appends a second row and removes anonymous visibility; direct client insert/update/delete is denied; another student cannot read history; an admin can read it but cannot make consent valid without the owner record.

Add test `project payload rejects unsafe keys and invalid consent metadata` asserting: `internalNotes` is rejected; missing/malformed/stale-policy timestamps are rejected when consent is recorded; a timestamp more than five minutes in the future is rejected; and normal current-policy consent succeeds.

- [ ] **Step 2: Run the consent tests and verify failure**

Run: `node --test --test-name-pattern='publication consent|project payload' tests/account-security.test.mjs`

Expected: FAIL because the policy and consent tables/functions do not exist.

- [ ] **Step 3: Implement the policy and audit tables**

Create `publication_consent_policies(version text primary key, document_id text, effective_at timestamptz, is_current boolean)` with a partial unique index allowing exactly one `is_current = true`; seed the specified policy. Create `publication_consents` with identity ID, project/user foreign keys, `granted`, policy version/document, recorded timestamp, and source constrained to `frontend|admin|migration`.

- [ ] **Step 4: Implement trusted consent recording and public eligibility**

Create a trigger function that appends only when the three consent inputs change, verifies the acting user owns the project, requires the current policy, parses the timestamp, rejects values beyond `now() + interval '5 minutes'`, and copies the canonical document ID. Create `project_has_current_consent(project_id text) returns boolean` using the newest row for the current policy. Replace `project_read` so anonymous/public visibility requires Approved + visible + latest granted current-policy consent.

- [ ] **Step 5: Harden the compatibility JSON contract**

Add a write trigger that permits only the exact approved key list; validates the required/optional text and boolean types and lengths from the spec; keeps identity fields immutable; and prevents administrators from altering owner-controlled consent fields. Keep the existing owner/admin moderation guard behavior.

- [ ] **Step 6: Apply grants/RLS and verify all consent tests pass**

Owners can select consent rows for their projects; administrators can select all; browser roles cannot insert, update, or delete policy/consent rows. Run: `node --test tests/account-security.test.mjs`

Expected: all baseline, profile, consent, and payload tests PASS.

- [ ] **Step 7: Commit consent enforcement**

```bash
git add frontend/tests/account-security.test.mjs frontend/supabase/migrations/20261023_database_foundation.sql
git commit -m "feat: add versioned publication consent"
```

### Task 3: Authoritative project-to-event assignments

**Files:**
- Modify: `frontend/tests/account-security.test.mjs`
- Modify: `frontend/supabase/migrations/20261023_database_foundation.sql`

**Interfaces:**
- Consumes: `projects`, `events`, `is_admin()`, and `project_has_current_consent(text)`.
- Produces: `project_events(project_id, event_id, assigned_by, created_at)` with `(project_id, event_id)` primary key and an idempotent legacy-year backfill.

- [ ] **Step 1: Write the failing assignment/RLS test**

Add test `only admins assign projects to events` asserting: owners and other students cannot create/delete links; an administrator can link one project to multiple events; owners can read their own links; another student cannot read a private link; anonymous users see a link only when both project and event are public.

- [ ] **Step 2: Write the failing legacy backfill test**

Seed one uniquely matched event year, one unmatched year, and two events sharing an ambiguous year. Assert that only the unique match creates a `project_events` row and rerunning the migration/backfill logic does not duplicate it.

- [ ] **Step 3: Run the assignment tests and verify failure**

Run: `node --test --test-name-pattern='only admins assign|legacy eventYears' tests/account-security.test.mjs`

Expected: FAIL because `public.project_events` does not exist.

- [ ] **Step 4: Implement the relationship, RLS, and backfill**

Create the table and indexes. Permit administrator insert/delete, administrator and owner reads, and guest reads only for links joining a published event to an Approved, visible, currently consented project. Backfill only exact four-digit `eventYears` values with exactly one event whose `data.date` begins with that year; use `on conflict do nothing`.

- [ ] **Step 5: Run the complete security suite**

Run: `node --test tests/account-security.test.mjs`

Expected: all tests PASS.

- [ ] **Step 6: Commit event assignments**

```bash
git add frontend/tests/account-security.test.mjs frontend/supabase/migrations/20261023_database_foundation.sql
git commit -m "feat: add project event assignments"
```

### Task 4: Database handoff documentation and final verification

**Files:**
- Create: `frontend/docs/DATABASE_FOUNDATION.md`
- Modify: `frontend/ACCOUNT_SETUP.md`

**Interfaces:**
- Consumes: all Task 1–3 schema objects.
- Produces: migration order, ERD, role matrix, legacy diagnostics, Supabase application instructions, and rollback notes for the team.

- [ ] **Step 1: Document the ERD and role matrix**

Document `auth.users -> profiles/projects`, `projects -> publication_consents/project_events`, and `events -> project_events/event_registrations`. Include guest, owner, other-student, and admin permissions and identify `project_events` as authoritative over `data.eventYears`.

- [ ] **Step 2: Document migration and diagnostics**

Update account setup with the two-file migration order, the security-test command, a query listing unmatched/ambiguous legacy event years, a hosted Supabase smoke checklist, and non-destructive rollback guidance.

- [ ] **Step 3: Run formatting checks without rewriting unrelated frontend files**

Run the formatter only against changed Markdown/JavaScript files if supported; inspect `git diff --check` and fix whitespace errors.

- [ ] **Step 4: Run final automated verification**

Run: `corepack pnpm test:security && corepack pnpm build`

Expected: all security tests PASS and Vite production build succeeds; the existing chunk-size warning is acceptable.

- [ ] **Step 5: Inspect the final diff and commit documentation**

```bash
git diff --check
git status --short
git add frontend/docs/DATABASE_FOUNDATION.md frontend/ACCOUNT_SETUP.md docs/superpowers
git commit -m "docs: explain OFE database foundation"
```
