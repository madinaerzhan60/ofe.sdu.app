# Office for Entrepreneurship · SDU University

The platform frontend is in `frontend/` (React, Vite, TypeScript).

## Run locally

```sh
cd frontend
pnpm install
pnpm dev
```

For a production build: `pnpm build`. To run all tests: `pnpm test` (database permission tests only: `pnpm test:security`).

Account and database connection steps: [frontend/ACCOUNT_SETUP.md](frontend/ACCOUNT_SETUP.md).

The Supabase project owner should review and apply the SQL migration to the intended database and configure the public URL/key and Google sign-in. `.env.example` contains placeholders only. No secrets or existing user data are included.

Without backend configuration the app remains a clearly marked demonstration.

Team discovery, invitations and join requests: [frontend/TEAM_BACKEND_CONTRACT.md](frontend/TEAM_BACKEND_CONTRACT.md). These features currently use local preview data; the Supabase team should connect the backend operations described there.

## Site structure

Multi-page site with real URLs (History API, Vercel rewrites to `index.html`):

| Path | Page |
| --- | --- |
| `/` | Home: hero slider, quick links, news, next event, projects, how it works |
| `/about` (`#mission`, `#services`, `#how`, `#partners`, `#contacts`) | About OFE |
| `/projects`, `/projects/:id` | Project catalog and project page |
| `/events`, `/events/:category`, `/events/news/:id` | Events and news (business, IT, hackathons, championships, winners, university life) |
| `/events/founders-cup` | SDU Founders Cup (Demo Day) |
| `/teams`, `/workspace` | Student teams and workspace |
| `/media` | Media desk for news editors |
| `/admin` | Administration (projects, news moderation, media team) |

Brand: SDU palette (Pantone 2756 C `#212153` with SDU warm accents), SDU Unique / SDU Life display typefaces and Gilroy text, self-hosted from `frontend/src/assets/fonts` (subset to Latin, Cyrillic and Kazakh).

## Media editors, team members and contacts

Apply `frontend/supabase/migrations/20261113120000_media_news_members_contacts.sql` after the existing migrations. It adds:

- `news` with a public `news-media` bucket for covers. Only media editors and administrators can write; visitors read published posts.
- `app_media_editors` with admin-only `set_media_editor(email, enabled)` and `list_media_editors()`. Administrators grant the role from **Admin → Media team** by SDU email.
- `project_members` (teammates by `@sdu.edu.kz` email) and `project_contacts` (Telegram and phone). Both are private: the project owner and administrators see them; members see their own membership. Nothing private is stored in `projects.data`, which is public for published projects.

Until the migration is applied, the site keeps working and these features fall back to empty lists.
