# MangoDB API

Express 5 + TypeScript. Prisma 7 against Postgres (Supabase), through the
`@prisma/adapter-pg` driver adapter.

This page is how to run and check the API. **The rules for writing it are in
one place, [docs/conventions.md](../../docs/conventions.md)**, and the order to
apply them in is [docs/adding-a-resource.md](../../docs/adding-a-resource.md).
There is no endpoint catalogue: `src/routes/` is the list, with the _why_ in a
comment beside each route.

## Run it

Node 22.

```bash
cp .env.example .env   # then fill JWT_SECRET, DATABASE_URL, DIRECT_URL
npm run db:generate    # regenerate Prisma Client (src/generated/prisma)
npm run dev            # tsx watch, http://localhost:4000
```

The web app reaches the API at `/api/*`, proxied by `apps/mangodb/next.config.ts`,
so its requests are same-origin and need no CORS.

## Check it

| Command                        | What it checks                                                         |
| ------------------------------ | ---------------------------------------------------------------------- |
| `npm run verify` (repo root)   | Prettier, ESLint, `tsc --noEmit` and the unit tests. CI runs this.     |
| `npm test`                     | The unit tests only: `node:test` with a fake Prisma, no database       |
| `bash scripts/snapshot-api.sh` | What every endpoint answers, against a running API and a real database |

The snapshots need the accounts the seed creates:

```bash
npm run db:seed        # snapshot_ and demo_ provider, receiver and admin, idempotent
npm run db:seed -- --reset-demo   # also puts the demo projects back as seeded
```

How the snapshots work and which diff each kind of change should produce:
[docs/refactor/phase-0-safety-net.md](../../docs/refactor/phase-0-safety-net.md).

## The database

The database is shared by the whole team, so a migration changes everyone's
database the moment it runs.

- Edit `prisma/schema.prisma` by hand, then write the migration with
  `prisma migrate diff`, as [CONTRIBUTING.md](../../CONTRIBUTING.md#database)
  shows step by step. Commit the migration folder.
- **Never `prisma migrate dev`.** It can read the shared database as drift and
  offer to reset it.
- **Never `db:pull` to update the schema.** It rewrites `schema.prisma` from the
  database and drops every comment and some relation options.
- Say so in the group chat before applying one, and have people pull the new
  folder and run `npm run db:generate` afterwards.

`0_init` is a baseline: the database as it was before migrations existed,
marked applied rather than run.

## Image storage

Certificates, portfolios and profile photos keep their bytes in Supabase
Storage and only the public URL in Postgres. One bucket per kind, named in
`src/lib/storage.ts`:

| Bucket        | Folder          | Column                              |
| ------------- | --------------- | ----------------------------------- |
| `certificate` | `certificates/` | `certificate.cert_image`            |
| `portfolio`   | `portfolios/`   | `service_portfolio.portfolio_image` |
| `profile`     | `companies/`    | `company.company_photo`             |

All three are **public** buckets: the URL in the column is served straight to
an image, with no signing step. Create a missing one in the Supabase dashboard
under Storage → New bucket, with "Public bucket" on. Nothing in the app creates
buckets, so an upload into a missing one answers 500 and logs
`Bucket not found`.

Uploads are capped at 5 MB and limited to PNG, JPEG and WebP
(`IMAGE_EXTENSIONS` in `src/lib/storage.ts`), not `image/*`: an SVG is a
document the browser runs scripts from when its public URL is opened directly.
Every upload goes through `saveWithUpload` (`src/lib/upload.ts`), which removes
the new file if the row cannot be written and the replaced one once it is.

## How a request is authenticated

`requireAuth` takes the token from an `Authorization: Bearer` header or, failing
that, the `access_token` cookie, and puts the claims on `req.auth`.
`requireRole(...roles)` runs after it.

- **The web app uses the cookie.** `sendSession` sets it `httpOnly` (page
  scripts cannot read the token) and `SameSite=Lax` (it is not sent on a
  cross-site POST, which stops CSRF). The frontend stores nothing. The header
  is for callers that are not a browser: curl, Postman, the snapshot script.
- **Two login doors, mirrors of each other.** `POST /auth/login` refuses an
  admin and `POST /auth/admin/login` refuses a company, both with 403: the
  password checked out, so the caller is known, and the answer is no. A wrong
  credential is 401 with the same message and timing on both.
- **Logout and a credential change revoke one token** through the denylist in
  `public.revoked_token`. There is no per-company token version, so another
  device stays signed in until its token expires.
- **Failed sign-ins are limited per email**: 10 in 15 minutes, then 429. The
  count lives in memory, so a restart clears it.

## Account types and roles

`company.accountType` is `PROVIDER`, `RECEIVER`, `BOTH` or `ADMIN`. It is a
discriminator: a `PROVIDER` company has a row in `provider`, a `RECEIVER` one
in `receiver`, `BOTH` has both, and `ADMIN` has neither. There is no admin
table; an administrator is a company row with `ADMIN`, which is why
registration refuses that value.

`accountType` is not the token role. `src/auth/roles.ts` maps one to the other
and says what a role may act as: `both` grants `provider` and `receiver`, so
`requireRole('provider')` lets a BOTH company through. `admin` grants only
`admin`.

`companyType` is a different thing again: repeatable industry tags (`SME`,
`Software House`), at least one per company.
