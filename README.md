# MangoDB

A B2B marketplace where companies hire each other for IT work, from the first
offer to a finished, reviewed project.

A company signs up as a **Provider** (offers services), a **Receiver** (posts
jobs), or **Both**. Providers bid on jobs, Receivers send hire requests to
services, and an accepted offer becomes a project that both sides run through
the site.

> **Status:** in the last of three sprints, which ends 9 Nov 2026. The project
> flow works through the API; its pages are still being built.

## Features

- **Services and jobs.** Providers list services with a category, tech stack
  and price range. Receivers post jobs with a budget and a deadline.
- **Search.** Find services, jobs and companies by keyword. Services also
  filter by category and price, and sort.
- **Proposals and hire requests.** Either side makes an offer on the other's
  listing, and the owner accepts or rejects it.
- **Projects.** An accepted offer becomes a project: a PDF quotation, a deposit
  the Receiver reports and the Provider confirms, progress updates, then
  delivered work the Receiver accepts or sends back.
- **Reviews.** One review per finished project, scored on work quality,
  service, value for money and delivery time.
- **Company profiles.** Portfolio, certificates and completed projects.
- **Admin.** A separate admin sign-in to view, edit and remove companies.

## How it fits together

```
Browser ──► Next.js web app ──/api/*──► Express API ──► PostgreSQL + file storage
            (apps/mangodb)              (apps/api)      (Supabase)
```

| Part                                 | Stack                                                   |
| ------------------------------------ | ------------------------------------------------------- |
| [`apps/api`](apps/api)               | Express 5 + TypeScript, Prisma 7, PostgreSQL (Supabase) |
| [`apps/mangodb`](apps/mangodb)       | Next.js 16 App Router, React 19, Tailwind v4            |
| [`packages/shared`](packages/shared) | The request and response types both apps import         |

## Engineering highlights

- **Page scripts can't read the session.** It lives in an httpOnly cookie, and
  because Next.js proxies `/api/*` to Express, every request is same-origin
  and needs no CORS. Logging out revokes the token, and failed sign-ins are
  rate-limited per email.
- **One set of types for both apps.** `packages/shared` defines every request
  and response, so renaming a field breaks the TypeScript build, not a page.
- **A predictable API.** Zod validates every request, every error has the same
  `{ error: { code, message, details } }` shape, and status codes keep 401
  (not signed in) apart from 403 (not allowed).
- **Role-based access.** Each route says whether a Provider, Receiver or Admin
  may call it, and a company that is Both passes either check.
- **Tests and CI.** Unit tests run on Node's test runner with a mocked
  database, and a recorded snapshot of every API response makes any change
  show up in review. Every pull request runs format, lint, typecheck, tests
  and build.
- **Decisions written down.** 22 [decision records](docs/adr/README.md) say
  what was chosen and why.

## Team

Nine university students built MangoDB over three Scrum sprints (25 Aug to
9 Nov 2026), working from a product backlog of user stories with acceptance
criteria. See the
[contributors](https://github.com/taofuuu/MangoDB/graphs/contributors).

## Running it locally

You need Node 22 or newer, and the team's Supabase keys for the API's `.env`.
There is no local database: everyone shares one, so read
[CONTRIBUTING.md § Database](CONTRIBUTING.md#database) before touching the
schema.

```bash
npm install
cp apps/api/.env.example apps/api/.env          # then fill in the blanks
cp apps/mangodb/.env.example apps/mangodb/.env
npm run db:generate -w api                      # again after every pull
```

Run each app in its own terminal:

```bash
npm run dev -w api       # http://localhost:4000
npm run dev -w mangodb   # http://localhost:3000
```

Or run both in Docker with `docker compose up --build`, also at
http://localhost:3000. Hosting it that way is in
[docs/deploy.md](docs/deploy.md#docker-on-one-vm).

To get accounts to sign in with, run `npm run db:seed -w api`. It creates
`snapshot_` and `demo_` provider, receiver and admin accounts, with the password
set by `SEED_PASSWORD` in `apps/api/.env`.

## Scripts

Run from the repository root.

| Command                      | What it does                                         |
| ---------------------------- | ---------------------------------------------------- |
| `npm run verify`             | Prettier, ESLint, typecheck and unit tests, as CI    |
| `npm test`                   | Unit tests only                                      |
| `npm run build`              | Production build of both apps                        |
| `npm run format`             | Format every file with Prettier                      |
| `npm run db:generate -w api` | Regenerate the Prisma Client from `schema.prisma`    |
| `npm run db:seed -w api`     | Create the sign-in accounts (safe to run repeatedly) |

## Project layout

```
apps/api/          Express API: routes, controllers, Prisma schema
apps/mangodb/      Next.js web app: pages, components, API calls
packages/shared/   Types shared by both apps
docs/              Conventions, decision records (ADRs), guides
scripts/           API snapshot script
snapshots/         Recorded API responses, diffed when a response changes
```

## Documentation

| Read                                                                   | For                                                 |
| ---------------------------------------------------------------------- | --------------------------------------------------- |
| [CONTRIBUTING.md](CONTRIBUTING.md)                                     | Branches, commits, pull requests, database rules    |
| [docs/conventions.md](docs/conventions.md)                             | The coding rules in full                            |
| [docs/adding-a-resource.md](docs/adding-a-resource.md)                 | Adding an API endpoint, step by step                |
| [docs/adr/](docs/adr/README.md)                                        | Decisions that were made, and why                   |
| [apps/api](apps/api/README.md), [apps/mangodb](apps/mangodb/README.md) | Running and checking each app                       |
| [docs/links.md](docs/links.md)                                         | Project doc, backlog, daily meeting sheet and Figma |
