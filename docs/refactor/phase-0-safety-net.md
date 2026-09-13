# Phase 0 — Safety net

**Status: done.** Ships `scripts/snapshot-api.sh`, its node helper,
`apps/api/src/seed.ts`, and the 46-file `snapshots/` baseline.

## What problem this solves

There are no automated tests. The 75 "Test: Done" rows in the sprint sheet are
manual test cases, not code.

Prettier, ESLint and `tsc` all pass happily while `company_name` becomes
`companyName` on the wire and the frontend quietly reads `undefined`. That is
exactly the mistake the next nine phases can make. So before renaming anything,
we record what every endpoint answers today.

`apps/api/src/app.ts:8` already says _"Builds the app without listening so tests
can drive it with supertest"_ — the seam is there, the tests never got written.
This is the cheap version: `curl` and `node`, no new dependency, no test runner.

## Running it

**One-time setup**

1. Have the API running (`npm run dev -w api`) against a database you are
   allowed to write to. **Never point this at production.**
2. Create the accounts the script signs in as:

    ```bash
    npm run db:seed -w api
    ```

    It prints the six lines to paste into `scripts/.env.snapshot` (copy
    `scripts/.env.snapshot.example` first — that file is gitignored).

Why a seed script rather than the companies already in the database: all 20 of
those store the literal string `hash123` in `password` instead of a bcrypt
hash, so `verifyPassword` rejects every one and nothing can sign in as them.
`src/seed.ts` adds three accounts of its own — a provider, a receiver and an
admin — plus a service listing with a portfolio and a certificate, which
`POST /portfolios` and the certificate calls need something to attach to. An
admin cannot be created through `/auth/register` at all (the enum only takes
`PROVIDER`, `RECEIVER` and `BOTH`), which is the other reason this exists.

Everything it writes is named `snapshot_`, it upserts rather than inserts, and
it deletes nothing except spent probe accounts (below). Run it as often as you
like — a second run repairs the accounts rather than duplicating them, and it
resets the passwords, so it is also how you recover an account someone broke.

**Every time**

```bash
bash scripts/snapshot-api.sh
```

```bash
git diff snapshots/
```

Two flags, for when you cannot run the whole thing:

| Flag           | Effect                                                               |
| -------------- | -------------------------------------------------------------------- |
| `--read-only`  | Stops before the first write. Creates and changes nothing.           |
| `--no-uploads` | Skips the portfolio and certificate lifecycles, which need Supabase. |

A partial run writes fewer files, so `git diff snapshots/` will show deletions.
That is a partial run, not a regression — say which flag you used in the PR.

## What it covers

46 snapshots over all 24 endpoints, plus every error envelope the frontend
branches on: `VALIDATION_FAILED`, `BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`,
`NOT_FOUND` and `CONFLICT`.

Each file is one call:

```json
{
    "request": "POST /auth/register",
    "status": 201,
    "body": { "accessToken": "<jwt>", "company": { "...": "..." } }
}
```

Files are numbered in call order, so `git diff snapshots/` reads top to bottom
like the session it recorded.

## The rules that make the diff readable

These are the conventions to keep if you add a call or change the script.

1. **Values that change every run are replaced with a placeholder** — `<jwt>`,
   `<timestamp>`, `<storage-url>`, `<run>`, `<company_id>`. Without this the
   whole file is a diff every run and nobody reads it. The request line gets the
   same treatment, so `PATCH /portfolios/27` records as
   `PATCH /portfolios/<portfolio_id>`.
2. **The placeholders match on the _value_, never on the key name.** A rule
   keyed on `cert_image` would stop working the moment Phase 2 renamed it to
   `certImage`, and the diff would fill with noise. If you add a rule, write it
   as a pattern over the value.
3. **`YYYY-MM-DD` strings are left alone on purpose.** The wire format of a date
   is something this refactor is supposed to pin down (Phase 1i), so a date that
   turns into a full ISO timestamp must show up as a diff.
4. **Object keys are sorted.** A reordered `select` is then not a diff, and a
   renamed field still is.
5. **Status codes are part of the snapshot.** A 200 that becomes a 204 is a
   breaking change even when the body is identical.
6. **An id placeholder matches on the key as well as the number.** A new
   `portfolio_id` of 25 and a seeded `listing_id` of 25 are the same number
   meaning two different things, and a value-only rule would put a placeholder
   on the one that never changes. Keys are compared with case and underscores
   ignored, so the rules survive Phase 2.
7. **The script cleans up after itself.** It creates two throwaway companies and
   deletes them again, including on failure, via a `trap`. Anything you add that
   creates a row must remove it, or every later run's admin listing drifts.
   Company deletion is a _soft_ delete, so those rows stay in the table
   forever — `npm run db:seed -w api` prunes the spent ones, and that is the
   only thing in this repo that hard-deletes anything.
8. **Keep the numbering.** New calls get the next free number, or the file order
   stops matching the call order.

## What it does not cover

Say so out loud rather than trusting it further than it goes:

- **Cookies and headers.** It authenticates with `Authorization: Bearer`, so a
  break in the `Set-Cookie` path is invisible here. The manual walk covers it.
- **Anything the frontend renders.** Same reason.
- **Concurrency, and anything timing-dependent** — the login timing defence in
  `verifyCredentials`, for one.
- **Rows other people changed.** The three `snapshot_` accounts are the script's
  own, so nobody should be editing them — but `20-admin-companies.json` is the
  unfiltered first page of every company in the database, so it legitimately
  changes whenever somebody registers or renames one. Read a diff there as news
  about the data, not about the code. Everything else is pinned to rows this
  script or the seed created.

## What each phase should produce

| Phase           | Expected `git diff snapshots/`                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------ |
| 2, first commit | **Empty.** `@map` renames what Prisma calls a column, not the column — an empty diff is what proves it |
| 2, third commit | **The big one.** Every response field changes case at once. Review it line by line                     |
| 3, 6, 7, 8      | **Empty.** That is the acceptance test for those phases: they were internal                            |
| 4               | **Small and expected**: one endpoint path renamed, one endpoint deleted                                |

Read the Phase 2 third-commit diff carefully. It is the single most important
review in the whole refactor, and the snapshot is the only thing that can show
you a field that got **dropped** rather than renamed.

## If you need to change the script itself

Phase 2 renames response fields, and the script reads a few of them to chain
calls together (`accessToken`, `company_id`, `listing_id`). The `get` helper
looks a key up in both snake_case and camelCase on purpose, so the script
survives that flip without a rename commit of its own. Keep that property.

Everything else lives in three files:

- `scripts/snapshot-api.sh` — the list of calls, in order.
- `scripts/lib/snapshot-json.mjs` — reads one field out of a response (`get`),
  and turns a response into a snapshot file (`normalize`).
- `apps/api/src/seed.ts` — the accounts and rows the calls run against. It is
  under `src/` rather than `prisma/` so `npm run typecheck` covers it: Phase 2
  renames every Prisma field, and a seed the compiler cannot see is a seed that
  breaks silently.

One Windows note, since most of the team is on it: `winpath` in the shell script
converts `/tmp/...` to a real Windows path before handing it to curl. Git Bash
normally does that for you, but not inside curl's `-F "field=@path"` form, where
the `@` hides the path from it. On Linux and macOS the function is a no-op.
