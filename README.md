# MangoDB

A B2B marketplace where companies hire each other. A company registers as a
**Provider** (offers services), a **Receiver** (posts jobs), or **Both**.
Providers send proposals on jobs, receivers send hire requests on services, and
an accepted proposal becomes a project.

## Tech stack

| Part                                 | Stack                                                   |
| ------------------------------------ | ------------------------------------------------------- |
| [`apps/api`](apps/api)               | Express 5 + TypeScript, Prisma 7, PostgreSQL (Supabase) |
| [`apps/mangodb`](apps/mangodb)       | Next.js 16 App Router, React 19, Tailwind v4            |
| [`packages/shared`](packages/shared) | The request and response types both apps import         |

The browser only talks to the Next server, which proxies `/api/*` to Express.

## Getting started

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
