# Authenticated project media

Use `.env.local` with VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY and VITE_SUPABASE_STORAGE_BUCKET=startup-media. Only public publishable/anon keys belong in Vite. The local configuration is ignored by Git.

## Existing backend policy contract

The supplied startup-media policies accept exactly `<owner UUID>/<existing project ID>/logo.webp` and `cover.webp`. Owner INSERT rejects a project that is Approved, visible and has current publication consent. SELECT permits the owner, admin, or a project that is Approved, visible and has current consent. The anon role alone does not imply unrestricted access: the policy condition still applies. The frontend requires a signed-in session for Storage downloads.

New application flow: select images immediately in the form. Compressed image Blobs stay in the in-memory draft and previews use temporary Blob URLs. On submit, save the project first, then upload images and attach their Storage references. If upload/attachment fails, keep the draft and existing project ID for retry, avoiding a duplicate project. Rejected existing applications use the same flow. This avoids weakening RLS or storing image data in database JSON. The UI conservatively locks uploads for approved, visible projects with publication permission. Backend RLS remains authoritative.

Uploads convert accepted PNG/JPEG/WebP (maximum 5 MB) to WebP. They use `.upload(path, blob, {upsert:true})`, so replacement also requires the backend UPDATE policy and SELECT access. The supplied UPDATE USING and WITH CHECK conditions enforce the same owner/path/publication restrictions as INSERT. The client verifies the signed-in user matches the target owner. Admin uploads and event uploads are disabled: the supplied INSERT policy does not grant these operations.

Database image/cover fields contain `storage://<path>#<revision>`. The revision refreshes previews after replacing a fixed object path and is stripped before `.download(path)`. Downloads use the session-aware SDK and temporary Blob URLs, revoked on source/auth changes and unmount. No signed URLs or embedded data URLs are generated. Legacy base64 images must be re-uploaded.

Uploading replaces the Storage object immediately; cancelling the editor does not undo that replacement. Removing an image clears only its database reference after saving and does not delete the object. Do not treat removal of a reference as revocation of Storage access; that is controlled by backend policies and publication consent.

## Verification

Run `node --test tests/media-storage.test.mjs tests/account-security.test.mjs`, TypeScript checking and the Vite build. Media tests cover exact paths, reference version parsing, binary upload options, missing session, different owner and RLS denial.

On staging with a test user: submit a project, open My project, upload both images, save and reload. Check fixed Storage paths and binary requests, then replace each image and confirm the preview refreshes. Verify unrelated users are denied private downloads; sign out during a pending download. Verify the approved/published upload restriction. Confirm there are no signed URL requests. Authenticated upload/download has not yet been tested against the live project; no test-user session was provided.

No SQL migrations or deployed bucket/policy settings were changed.

The November 26, 2026 event remains visible as an announcement when there is no published event returned by the database. Registration stays disabled until a real event is published. Administrator access is available at #admin and still requires the server-verified role; the frontend does not grant it.
