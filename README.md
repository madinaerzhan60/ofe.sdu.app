# OFE · SDU FOUNDERS CUP

The platform frontend is in `frontend/` (React, Vite, TypeScript).

## Run locally

```sh
cd frontend
npm install
npm run dev
```

For a production build: `npm run build`. For database permission tests: `npm run test:security`.

Account and database connection steps: [frontend/ACCOUNT_SETUP.md](frontend/ACCOUNT_SETUP.md).

The Supabase project owner should review and apply the SQL migration to the intended database and configure the public URL/key and Google sign-in. `.env.example` contains placeholders only. No secrets or existing user data are included.

Without backend configuration the app remains a clearly marked demonstration.

Team discovery, invitations and join requests: [frontend/TEAM_BACKEND_CONTRACT.md](frontend/TEAM_BACKEND_CONTRACT.md). These features currently use local preview data; the Supabase team should connect the backend operations described there.
