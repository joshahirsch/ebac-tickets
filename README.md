# EBAC Projects

A lightweight, Jira-style internal ticketing and project-operations tool for East Bay Agency for Children (EBAC). Built for speed, clarity, and low maintenance — not enterprise Jira parity.

**Stack:** Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Prisma · Supabase (Postgres, Auth, Storage) · Vercel.

---

## Build status

This repository contains **all five MVP phases**: Foundation, Core ticketing, Project operations, Notifications & attachments, and Admin polish.

**Phase 1 — Foundation**
- App shell with sidebar navigation and top bar
- Supabase Auth (email/password) with SSR session handling and route protection
- Full Prisma schema, indexes, and seed data
- Centralized role model (ADMIN / MANAGER / MEMBER / VIEWER) and first-admin bootstrap
- Dashboard: open / due-soon / overdue / blocked counts, by-status, by-assignee, due-soon and recently-updated lists

**Phase 2 — Core ticketing**
- Create ticket (validated form, per-project ticket numbers)
- Ticket list: sortable columns, filters (project/status/priority/type/assignee), search, and quick filters (My tickets, Due this week, Overdue, Blocked, High priority, Recently updated)
- Ticket detail: inline-editable metadata, description/title editors, comments thread with @mentions, activity log, attachments list, archive/reopen
- Activity records on every meaningful change; in-app notifications generated for assignment, mention, status change, and blocked
- AI extension points (summarize, suggest priority, detect duplicates, weekly report, notes→tickets) as safe no-op placeholders

**Phase 3 — Project operations**
- Projects list with per-project progress rollups (open/done, % complete)
- Project detail: overview, metrics, open/blocked/completed ticket buckets, team members, and recent activity
- Kanban board: columns by status, ticket cards, **drag-and-drop** status changes (optimistic, with revert on error), and the full filter bar
- My Work view: tickets assigned to me grouped by status, plus open tickets I reported

**Phase 4 — Notifications & attachments**
- Notifications inbox: read/unread list, mark-one and mark-all-read, deep links to tickets; unread badge in the sidebar
- File attachments: upload/download/delete via Supabase Storage (server-action route, 10 MB cap, signed download URLs), wired into the ticket detail page with activity logging
- @mention detection on comments (from Phase 2) feeds the notifications
- Due-soon notification job with a protected `/api/cron/due-soon` endpoint (Vercel Cron config in `vercel.json`)

**Phase 5 — Admin polish**
- Settings area (Managers and Admins) with Projects, Labels, Reports, and Users tabs
- User management (Admin): create a team member (provisions a Supabase Auth login + app record), change roles, activate/deactivate — with last-admin safeguards
- Project management: create, edit, set status, archive/unarchive
- Label management: create, recolor, rename, delete (with usage counts)
- Basic reporting: workspace snapshot, 30-day created/completed throughput, and breakdowns by type, priority, and project

Every navigation route is now backed by real functionality — nothing is a placeholder or mock data.

---

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local   # fill in Supabase values (see below)
#   Prisma CLI reads DATABASE_URL / DIRECT_URL — copy the same into .env
cp .env.example .env

# 3. Create the database schema + seed data
npm run prisma:generate
npm run prisma:migrate       # creates tables (dev migration)
npm run db:seed              # seeds workspace, users, projects, tickets

# 4. Run
npm run dev                  # http://localhost:3000
```

Other scripts: `npm run typecheck`, `npm run test` (Vitest unit tests), `npm run prisma:studio`.

### EBAC kickoff cards seed

Seeds the initial EBAC project-management kickoff tickets into an existing project
board (does not create a second board). Safe to run repeatedly: tickets are matched
by **project + title**; existing non-archived cards are updated or skipped, never
duplicated.

| Command | Purpose |
| --- | --- |
| `npm run seed:ebac-kickoff-cards -- --dry-run` | Preview creates/updates without writing |
| `npm run seed:ebac-kickoff-cards` | Apply the seed |
| `npm run seed:ebac-kickoff-cards -- --ensure-project` | Create the PMGT project if missing, then seed |

**Target board:** workspace slug `ebac`, project key from `EBAC_KICKOFF_PROJECT_KEY`
(default `PMGT`, with fallbacks `EBAC` and a name match on "Project Management").
Use `--ensure-project` for a first local run after `db:seed` when PMGT does not exist yet.

**Phase mapping:** the app uses fixed ticket statuses (not custom board lists). Kickoff
phases are stored as workspace labels (`kickoff-ready`, `discovery-decisions`, etc.)
and mapped to statuses: Kickoff Ready / Discovery → **Backlog**; Build / UAT / Launch /
Post-Launch → **To Do**. Checklists and acceptance criteria are embedded in the
ticket description (no separate checklist model).

---

## Environment variables

See `.env.example` for the full list. The essentials:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Pooled Postgres connection (runtime; port 6543, `pgbouncer=true`). |
| `DIRECT_URL` | Direct Postgres connection (Prisma migrate/seed; port 5432). |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key for the browser/SSR clients. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key (do not expose to the client). |
| `SUPABASE_STORAGE_BUCKET` | Bucket for ticket attachments (Phase 4). |
| `NEXT_PUBLIC_APP_URL` | App base URL, used for auth email redirects. |
| `BOOTSTRAP_ADMIN_EMAIL` | Email promoted to ADMIN on first sign-in (see below). |
| `OPENAI_API_KEY` / `AI_PROVIDER` | Optional. Leave unset to keep AI features as no-ops. |

---

## Supabase setup

1. **Create a project** at supabase.com. Note the project ref, region, and database password.
2. **Connection strings** — Project Settings → Database:
   - `DATABASE_URL` = the *Connection pooling* string (port `6543`), add `?pgbouncer=true&connection_limit=1`.
   - `DIRECT_URL` = the *Direct connection* string (port `5432`).
3. **API keys** — Project Settings → API: copy the project URL, `anon` key, and `service_role` key.
4. **Auth** — Authentication → Providers → Email: enable Email. For local testing you can disable "Confirm email" so seeded users can sign in immediately.
5. **Create users** — Authentication → Users → Add user, for each seeded email (`admin@`, `manager@`, `member@`, `viewer@ebac.org`). Their app rows link automatically on first sign-in by matching email.
6. **Storage** (required for attachments) — Storage → New bucket named to match `SUPABASE_STORAGE_BUCKET` (e.g. `ticket-attachments`), **private**. The app uploads and generates signed download URLs server-side with the service-role key, so no bucket policies are needed.
7. Run `npm run prisma:migrate` then `npm run db:seed`.

### First admin bootstrap

Auth identities live in Supabase; application rows live in Postgres. On first sign-in:

- The app matches your Supabase identity to a `User` row by `authId`, then by `email` (linking a seeded/invited row).
- If your email equals `BOOTSTRAP_ADMIN_EMAIL` and no ADMIN exists yet, you're promoted to **ADMIN**.
- Unknown, unmatched users are created as **VIEWER** (least privilege) — they never get broad access by default.

So: set `BOOTSTRAP_ADMIN_EMAIL`, create that user in Supabase Auth, sign in once, and you're the admin.

---

## Roles & permissions

Permissions are centralized in `src/lib/rbac.ts`.

| Capability | ADMIN | MANAGER | MEMBER | VIEWER |
| --- | :---: | :---: | :---: | :---: |
| View tickets/projects | ✓ | ✓ | ✓ | ✓ |
| Create / update tickets | ✓ | ✓ | ✓ | — |
| Comment | ✓ | ✓ | ✓ | — |
| Assign / archive tickets | ✓ | ✓ | — | — |
| Manage projects / labels | ✓ | ✓ | — | — |
| Manage users / settings | ✓ | — | — | — |

Access is enforced in server actions (`assertCan`) and reflected in the UI (controls hidden/disabled for read-only roles).

---

## Deployment (Vercel)

1. Push this repo to GitHub and import it into Vercel.
2. Add all environment variables from `.env.example` in the Vercel project (Production + Preview).
3. Build command is `npm run build` (runs `prisma generate` then `next build`).
4. Apply migrations against your Supabase database from CI/locally with `npm run prisma:deploy` (uses `DIRECT_URL`). Run the seed once if desired.
5. Set `NEXT_PUBLIC_APP_URL` to your production URL and add it to Supabase Auth → URL Configuration (redirect URLs).

---

## Project structure

```
prisma/
  schema.prisma          # models, enums, indexes
  seed.ts                # EBAC workspace, users, projects, tickets
src/
  app/
    login/               # auth screen + server actions
    auth/signout/        # sign-out route handler
    (app)/               # authenticated shell (layout, dashboard, tickets, placeholders)
  components/
    ui/                  # shadcn/ui primitives
    ticket/              # ticket form, filters, table, inline editors, comment form
  lib/
    auth.ts              # session → app user + bootstrap
    rbac.ts              # centralized permissions
    prisma.ts            # Prisma client singleton
    supabase/            # browser + server + middleware clients
    validations/         # zod schemas
    ai/service.ts        # AI extension points (no-op)
  server/
    actions/             # ticket + comment server actions
    queries/             # dashboard, tickets, lookups
    activity.ts          # activity log helper
    notifications.ts     # in-app notification helper + mention parsing
```

---

## Known limitations

- Attachments and user creation require the `SUPABASE_SERVICE_ROLE_KEY` (secret key) and, for files, a Supabase Storage bucket (see setup step 6).
- Board drag-and-drop uses native HTML5 DnD (no touch-drag on mobile yet; use the ticket detail status control there).
- Email notifications are intentionally not implemented (single `dispatch` seam in `notifications.ts`); notifications are in-app only.
- The due-soon job must be triggered by a scheduler (Vercel Cron in `vercel.json`) or called manually; it isn't a background worker.
- AI features return a "not configured" result until `AI_PROVIDER` + a key are set.
- Sprints/Milestones exist in the schema but have no UI yet.
- Tests cover pure logic (RBAC, validation, utils); action/DB integration tests are a next step.

## Future enhancements (post-MVP)

- Email notifications via the `dispatch` seam in `notifications.ts` (Resend/SES)
- Sprint/Milestone UI (the model already exists)
- Saved views/filters and bulk actions on the ticket list
- Cycle-time and burndown reporting; CSV export
- Touch-friendly drag-and-drop for the board
- Related-ticket linking (placeholder on the ticket detail page)
- Integration tests for server actions and permission flows
