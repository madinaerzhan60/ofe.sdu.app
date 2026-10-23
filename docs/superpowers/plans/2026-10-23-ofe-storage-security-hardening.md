# OFE Storage and Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete Nucha's remaining Developer 2 scope by adding protected startup media storage and moving privileged database helpers out of the exposed `public` schema.

**Architecture:** Keep the existing project JSON contract and add a private `startup-media` bucket whose object paths are `<owner_uuid>/<project_id>/<kind>.webp`. Storage RLS permits owners to manage media only for their own non-public projects, administrators to moderate it, and guests to read only media linked to approved, visible projects with current publication consent. Privileged helper functions move into a non-exposed `private` schema; a small invoker-only `public.is_admin()` facade preserves the existing frontend RPC contract.

**Tech Stack:** PostgreSQL 17, Supabase Storage, Row Level Security, PL/pgSQL/SQL functions, Node.js test runner, PGlite.

**Spec:** `docs/superpowers/specs/2026-10-23-ofe-compatible-supabase-backend-design.md`

## Global Constraints

- Preserve `projects(id, owner_id, data)` and the existing `image`/`cover` JSON keys.
- Never expose or commit a `service_role`, secret key, database password, or personal access token.
- Keep the `startup-media` bucket private; anonymous reads must pass RLS.
- Accept only PNG, JPEG, and WebP objects up to 5 MB.
- Do not modify tables inside the managed `storage` schema; only insert the bucket row and add policies on `storage.objects`.
- Do not implement the frontend upload adapter in this Developer 2 change; document the object-path contract for Aknur and Zhasulan.

## Review Focus

- A user must not upload into another user's prefix or attach media to another user's project; Task 2 tests both failures.
- Pending, Rejected, hidden, withdrawn-consent, and stale-consent projects must not expose media to guests; Task 2 tests each state.
- An owner must not replace or delete media while the project is publicly visible; Task 2 tests immutable public media.
- Admin checks must still work through the existing `public.is_admin()` frontend RPC after the definer implementation moves private; Task 1 tests both roles.
- The migration must be safe on the already-live project and leave no externally callable `SECURITY DEFINER` helpers in `public`; Task 1 and Task 3 verify catalogs and advisors.

---

### Task 1: Move privileged helpers into a private schema

**Files:**
- Modify: `frontend/tests/account-security.test.mjs`
- Create: `frontend/supabase/migrations/<timestamp>_storage_security_hardening.sql` using `supabase migration new storage_security_hardening`

**Interfaces:**
- Consumes: `public.app_admins`, `public.projects`, `public.publication_consents`, and the current public helper functions/policies.
- Produces: `private.is_admin()`, `private.project_has_current_consent(text)`, updated policies/triggers, and an invoker-only `public.is_admin()` compatibility RPC.

- [ ] **Step 1: Write failing helper-hardening tests**

Add test `privileged helpers are private without breaking admin checks` asserting that `private.is_admin()` returns false for a student and true for an allowlisted admin, `public.is_admin()` preserves those results, `public.project_has_current_consent(text)` no longer exists, and no `SECURITY DEFINER` function remains externally executable in `public`.

- [ ] **Step 2: Run the targeted test and verify failure**

Run: `node --test --test-name-pattern='privileged helpers are private' tests/account-security.test.mjs`

Expected: FAIL because the helpers still live in `public`.

- [ ] **Step 3: Implement the private helper migration**

Create the `private` schema; recreate `is_admin()` and `project_has_current_consent(text)` there with fixed empty search paths and caller-identity checks; update every policy and trigger reference; replace `public.is_admin()` with a `SECURITY INVOKER` facade; revoke public helper privileges; and drop the old public consent helper.

- [ ] **Step 4: Run targeted and complete security tests**

Run: `node --test tests/account-security.test.mjs`

Expected: all existing and new tests PASS.

- [ ] **Step 5: Commit private helper hardening**

```bash
git add frontend/tests/account-security.test.mjs frontend/supabase/migrations
git commit -m "security: move privileged helpers private"
```

### Task 2: Add private startup-media bucket and RLS

**Files:**
- Modify: `frontend/tests/account-security.test.mjs`
- Modify: the generated `frontend/supabase/migrations/<timestamp>_storage_security_hardening.sql`
- Modify: `frontend/docs/DATABASE_FOUNDATION.md`

**Interfaces:**
- Consumes: `private.is_admin()`, `private.project_has_current_consent(text)`, `projects.owner_id`, and project moderation/consent state.
- Produces: private bucket `startup-media`; Storage policies for owner create/read/delete, admin moderation, and public approved-media reads; object path contract `<owner_uuid>/<project_id>/<kind>.webp`.

- [ ] **Step 1: Add a minimal Storage schema fixture and failing RLS tests**

Extend the PGlite fixture only as needed to represent `storage.buckets`, `storage.objects`, object ownership, and RLS. Add test `startup media is owner controlled and public only after approval and consent` covering valid owner upload, forged prefix, foreign project, other-student read, administrator read, guest denial for every non-public state, guest read for the approved/current-consent state, and owner denial for replacing/deleting visible media.

- [ ] **Step 2: Run the targeted test and verify failure**

Run: `node --test --test-name-pattern='startup media is owner controlled' tests/account-security.test.mjs`

Expected: FAIL because the bucket and policies do not exist.

- [ ] **Step 3: Add the bucket and policies**

Insert/upsert the private `startup-media` bucket with a 5 MB limit and MIME allowlist. Add narrowly named `storage.objects` policies that validate bucket, owner UUID prefix, project ID segment, project ownership, moderation visibility, and current consent. Grant no direct access to `storage.buckets` beyond Supabase defaults.

- [ ] **Step 4: Run the complete security suite**

Run: `node --test tests/account-security.test.mjs`

Expected: all tests PASS.

- [ ] **Step 5: Document the media contract and frontend handoff**

Document that project JSON stores an object path, not a data URL; the frontend must insert the project first, upload `<user>/<project>/<kind>.webp`, update `image`/`cover`, and request authenticated or signed URLs for display. Record that public bucket URLs are forbidden.

- [ ] **Step 6: Commit Storage controls and documentation**

```bash
git add frontend/tests/account-security.test.mjs frontend/supabase/migrations frontend/docs/DATABASE_FOUNDATION.md
git commit -m "feat: protect startup media in storage"
```

### Task 3: Apply and verify the hosted migration

**Files:**
- Modify: `frontend/ACCOUNT_SETUP.md`

**Interfaces:**
- Consumes: the reviewed migration from Tasks 1–2 and Supabase project `ofe-sdu-app`.
- Produces: matching hosted schema, advisor evidence, and a documented smoke-test checklist for Zhasulan/Nurislam.

- [ ] **Step 1: Run local final verification**

Run: `npm run test:security`, `npm run build`, and `git diff --check`.

Expected: all tests PASS, Vite builds successfully, and the diff has no whitespace errors.

- [ ] **Step 2: Apply the migration to the hosted project**

Use the Supabase migration tool with the exact reviewed SQL and verify the new migration appears once in migration history.

- [ ] **Step 3: Verify hosted catalogs and advisors**

Verify the bucket configuration, Storage policies, private helper definitions, public facade, and absence of externally executable public `SECURITY DEFINER` helpers. Rerun security and performance advisors; document any intentional informational notices with remediation links.

- [ ] **Step 4: Update setup/smoke-test documentation**

Add the migration order and hosted checks for owner, other student, administrator, guest, allowed MIME types, oversize files, approved publication, consent withdrawal, and public-media immutability.

- [ ] **Step 5: Commit, push, and update PR #1**

```bash
git add frontend/ACCOUNT_SETUP.md docs/superpowers/plans/2026-10-23-ofe-storage-security-hardening.md
git commit -m "docs: add hosted storage verification"
git push
```

Confirm PR #1 contains the new commits and still targets `main`.
