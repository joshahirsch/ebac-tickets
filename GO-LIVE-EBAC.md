# EBAC Projects — Go-Live Guide

Everything below stands up **EBAC Projects** (the ticketing/PM app) on a fresh
Supabase database and deploys it to Vercel. Follow in order. Steps 0–2 are local;
steps 3–8 take it live.

Admin bootstrap email is already set to **admin@ebac.org** in `.env`. The seed
creates admin@ / manager@ / member@ / viewer@ **ebac.org** and starter projects
(DEV, COMMS, PROG, OPS) with labels and sample tickets.

---

## 0. Clean install (local)

> Note: if a `_node_modules_delete_me` folder shipped in this project, delete it first.

```
npm install
```

## 1. Create the Supabase project
- supabase.com → **New project**. Save the generated **database password**. Pick a region.

## 2. Fill in `.env` and `.env.local` (both files)
Copy these from Supabase into BOTH files (Prisma reads `.env`, Next reads `.env.local`):

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | Connect → ORMs. Pooler string on **port 6543**, append `?pgbouncer=true&connection_limit=1`. Replace `[YOUR-PASSWORD]`. |
| `DIRECT_URL` | Same, but **port 5432** (used by migrate/seed). Replace `[YOUR-PASSWORD]`. |
| `NEXT_PUBLIC_SUPABASE_URL` | Settings → API → Project URL (`https://<ref>.supabase.co`). |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Settings → API → publishable key (`sb_publishable_...`). |
| `SUPABASE_SERVICE_ROLE_KEY` | Settings → API → secret key (`sb_secret_...`). **Server only — never expose.** |
| `SUPABASE_STORAGE_BUCKET` | `ticket-attachments` (default, matches step 5). |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` for now; the Vercel URL later. |
| `BOOTSTRAP_ADMIN_EMAIL` | already `admin@ebac.org` — leave as is. |
| `CRON_SECRET` | any long random string. |

## 3. Auth
- Authentication → Providers → **Email**: enable. For first testing, turn **off** "Confirm email".
- Authentication → Users → **Add user**: email `admin@ebac.org`, set a password, **Auto Confirm ON**.
  (Once this admin is in, add all other EBAC staff in-app via Settings → Users — that
  provisions their login automatically. Use their real @ebac.org emails.)

## 4. Storage
- Storage → **New bucket** named `ticket-attachments`, **Private**. No policies needed —
  the app uploads and signs URLs server-side with the secret key.

## 5. Create schema + seed data (local, also provisions prod)
```
npm run prisma:generate
npm run prisma:migrate      # name it: init
npm run db:seed
npm run build               # type-checks everything BEFORE deploy
npm run dev                 # open http://localhost:3000, sign in as admin@ebac.org
```

## 6. Push to GitHub + import to Vercel
- Push this folder to a new GitHub repo.
- Vercel → New Project → import the repo (auto-detects Next.js).
- Add **every** variable from step 2 to Vercel (Production + Preview).
  Build command is `npm run build` (runs `prisma generate` then `next build`).

## 7. Finalize URLs
- After first deploy, copy the Vercel URL → set `NEXT_PUBLIC_APP_URL` to it in Vercel → redeploy.
- Supabase → Authentication → **URL Configuration**: set Site URL to the Vercel URL and add
  `https://<your-app>/**` to Redirect URLs.

## 8. Cron
- `vercel.json` already declares the daily "due-soon" notification job. Just make sure
  `CRON_SECRET` is set in Vercel (Vercel Cron sends it as a Bearer token).

---

## What was customized for EBAC
- **Brand:** product name "EBAC Projects", logo initials "EB", primary color teal
  (`hsl(183 74% 30%)`) to match EBAC's identity.
- **Ticket types:** Task, Milestone, Event, Request, Maintenance, Other (general PM set).
- **Statuses (board columns):** Backlog → To Do → In Progress → Blocked → In Review → Done
  (+ Archived). Priorities: Low / Medium / High / Urgent.
- **Roles:** Admin, Manager, Member, Viewer (standard).
- **Seed projects:** DEV (Development & Fundraising), COMMS (Communications & Marketing),
  PROG (Program Operations), OPS (Facilities & IT), each with sample tickets + labels
  (urgent, quick-win, grant-deadline, needs-review, waiting-external, board).

## Troubleshooting
- "Invalid login credentials" → auth user missing/unconfirmed, or wrong password (Auth → Users).
- Prisma can't connect → `[YOUR-PASSWORD]` still in a URL, or `DIRECT_URL` missing.
- Upload fails → bucket name mismatch, or `SUPABASE_SERVICE_ROLE_KEY` not set in Vercel.

## Security
- Rotate the DB password + secret key if they were ever pasted into a chat/log.
- Keep the secret key server-side only — never prefix it with `NEXT_PUBLIC_`.
