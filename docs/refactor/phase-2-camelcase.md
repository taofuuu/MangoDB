# Phase 2 — Flip to camelCase

**Status: done.** `snake_case` now stops at the database, exactly as
[conventions §1](../conventions.md) says.

## What moved

| Layer                                    | Before       | After     |
| ---------------------------------------- | ------------ | --------- |
| Postgres columns                         | `snake_case` | unchanged |
| Prisma models and fields                 | `snake_case` | camelCase |
| Request bodies, response bodies          | `snake_case` | camelCase |
| Multipart field names                    | `snake_case` | camelCase |
| `packages/shared`                        | `snake_case` | camelCase |
| Frontend components, forms, local shapes | `snake_case` | camelCase |

17 models, 75 columns, 23 backend files, 23 frontend files.

## The thing that made it affordable

`@map` and `@@map`. Prisma renames what it _calls_ a column; the column itself
does not move.

```prisma
model ServicePortfolio {
  portfolioId Int @id @default(autoincrement()) @map("portfolio_id")

  @@map("service_portfolio")
}
```

Proof, not assertion:

```bash
npx prisma migrate diff --from-schema prisma/schema.prisma --to-config-datasource
```

```
No difference detected.
```

No migration ran and nothing touched Supabase. `npm run db:pull` preserves these
renames too, which is documented Prisma behaviour — re-introspecting is safe.

**The wrong turn, for the record:** hand-written mapper functions, one per
resource, converting case on the way in and out. That is the version of this
change that costs forever instead of once. If anyone proposes it, this is the
paragraph to point at.

## The commits, and why they are three and not four

The plan called for four. Two of them had to merge, because a commit that flips
`packages/shared` while the backend DTOs still emit `snake_case` **does not
compile** — the mappers are typed as the shared types.

| Commit                             | Snapshot diff | What it proves                                         |
| ---------------------------------- | ------------- | ------------------------------------------------------ |
| `@map` the schema + Prisma callers | **empty**     | the Prisma rename is invisible from outside            |
| flip the wire                      | 367 each way  | the rename, and only the rename                        |
| flip the frontend                  | none          | the frontend is not snapshotted; verified in a browser |

The empty first diff is the point of splitting them. Without it, a problem in
the big diff could be the `@map` flip or the DTO flip and you would not know
which.

## How the big diff was reviewed

367 insertions and 367 deletions is suggestive, not proof — a dropped field and
an added one would balance too. So every removed key was converted to camelCase
and matched against the added keys, with counts:

```
removed keys: 32   added keys: 32
Every removed field has a camelCase replacement with the same count.
added keys with no snake_case origin: none
```

No status code changed. `details[].field` in validation errors followed on its
own, because it comes from the Zod path.

**If you do a rename like this again, do that check.** It is the one thing that
separates "renamed" from "dropped", and reading 734 lines by eye does not.

## Two things the compiler could not have caught

1. **Multipart field names are wire names.** `uploadImage('cert_image')` is
   multer matching a form part by name, so it had to become `certImage` on both
   sides at once. `tsc` sees a string on one side and a string on the other. The
   snapshot script sends real multipart bodies, which is why this was covered.
2. **A unique index is named after the real columns.** `uniqueViolationFields`
   matched `PORTFOLIO_UNIQUE_FIELDS` against the index name
   `service_portfolio_listing_id_portfolio_link_key`. Once the field list became
   `['portfolioLink']` that match would silently never fire, and a duplicate
   link would have returned a 500 instead of a 409. `lib/prismaErrors.ts`
   converts back to a column name before comparing.

## What the shared package gained and lost

**Added:** `Certificate` (there was none, and the frontend had invented three
incompatible shapes), `ListingStatus` / `ProposalStatus` / `ProjectStatus`
(conventions §6), and `IdentityAvailability`.

**Removed:** `User` — unused, and still carrying `// TODO: add more fields` —
and `RegisterResponse`, an alias of `SessionResponse` that nothing imported.

**Added `schemas/contract.ts`.** Zod enforces a request body at runtime; the
shared type is what the frontend codes against; nothing made the two agree. Four
of the shared request types were imported by no file in `apps/api` at all. That
file asserts each Zod schema against its shared type in both directions, so
`tsc` fails if they drift.

It earned its place immediately: it caught three `exactOptionalPropertyTypes`
mismatches. Zod's `.optional()` produces `field?: T | undefined`; the shared
types said `field?: T`, which under that flag is a different type. The shared
types now say `| undefined`, which is what actually happens on the wire.

## Rules this phase leaves behind

1. **New code is camelCase, everywhere above the database.** No exceptions to
   negotiate.
2. **`@map` in `schema.prisma` is the only translation.** Never a mapper
   function per resource.
3. **A new column gets `@map` at the same time it gets added.** A camelCase
   Prisma field with no `@map` is a column that does not exist.
4. **Raw SQL stays snake_case**, because it addresses real columns.
   `lib/companyIdentity.ts` is the only `$queryRaw` in the codebase and says so
   in a comment. If you add another, say it there too.
5. **Anything compared against a database identifier** — an index name, a
   constraint name, a column in raw SQL — needs converting back. See
   `toColumnName` in `lib/prismaErrors.ts`.
6. **A request body with a shared type gets a line in `schemas/contract.ts`.**
   With no test runner, that file is the only thing checking the contract.

## Found in passing, not fixed here

**The certificate page crashes on a certificate whose image is on an unexpected
host.** `next/image` throws while rendering when the src host is missing from
`remotePatterns`, and that takes the whole page down rather than one card.
The portfolio path already has `portfolioImageSrc` for exactly this; the
certificate path has nothing. **Phase 7 owns it** — it is one of the two file
upload paths that phase merges.

The seeded certificate now stores a null image so the seed does not trip it.
That is a workaround for the seed, not a fix for the page.
