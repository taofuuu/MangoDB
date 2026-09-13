# Phase 1 — Agree the vocabulary

**Status: done.** Ships [docs/conventions.md](../conventions.md). No code
changed and no migration ran.

## What this phase is

Every later phase renames something. This one writes down what the names will
be, so the renames happen once and Sprint 2's 66 engineering tasks are written
against the answer instead of against whatever file the author happened to open.

The split between the two documents:

| Document                                 | What it is                                                          |
| ---------------------------------------- | ------------------------------------------------------------------- |
| [docs/conventions.md](../conventions.md) | The standing reference. Outlives the refactor. Quote it in reviews. |
| This page                                | What Phase 1 decided, why, and what is still open.                  |

## Why it had to be first

The plan's ordering rule is that names flow one direction:

```
DB column → backend DTO → shared type → frontend lib → component prop → UI text
```

Agreeing the vocabulary is upstream of all of it. Do it after Phase 2 and the
camelCase flip has to be redone; do it after Sprint 2 starts and 66 tasks have
already been written against four different spellings.

## What got decided

| #   | Decision                                                                                   | Bites at |
| --- | ------------------------------------------------------------------------------------------ | -------- |
| 1   | **camelCase everywhere above the database**, translated once by Prisma `@map`              | Phase 2  |
| 2   | `register`, never `signup` — one word per action                                           | Phase 4  |
| 3   | Plural kebab-case collection nouns                                                         | Sprint 2 |
| 4   | `/me` singular, `/mine` collection → `/certificates/provider` becomes `/certificates/mine` | Phase 4  |
| 5   | Path params carry the resource name: `:serviceId`, not `:id`                               | Sprint 2 |
| 6   | Bare object, bare array, or `{ items, pagination }` — never `{ message, resource }`        | Phase 4  |
| 7   | SCREAMING_SNAKE_CASE status unions in `packages/shared`                                    | Sprint 2 |
| 8   | `listing_type` column, because nothing on a listing says which kind it is                  | Sprint 2 |
| 9   | `Decimal(12,2)` for money, `NOT NULL` on the five mandatory foreign keys                   | Sprint 2 |
| 10  | `z.strictObject` for every update body                                                     | Phase 4  |

The full reasoning for each lives in `conventions.md`. This table is so nobody
re-opens a decision without reading it.

## What is still open

**`GET /providers/search` vs `GET /providers?q=`.** The sprint sheet writes the
first; conventions §2.10 recommends the second, because a search is a filtered
collection and `GET /admin/companies` already works that way. Nine US3 tasks
reference it, so this needs a yes before US3-1 starts — not before the rest of
the sprint.

## Three things the sprint sheet gets wrong

Found while checking this phase against the real backlog. Whoever picks these up
should know before they start, or they will build something that already exists.

1. **US2-1 "ServiceListing table: schema and migration"**, **US2-6 "Job Posting
   table: schema and migration"** and **US2-11 "Project table: schema and
   migration"** all describe tables that already exist — `listing` + `service`,
   `listing` + `job_requirement`, and `project`. These are migrations that add
   columns. Creating parallel tables is the worst outcome available.
2. **US2-8 "Proposal table: schema, unique constraint, and migration" is
   assigned to Frontend.** It is a backend task, and the `proposal` table also
   already exists.
3. **`CLAUDE.md` gives Sprint 2's tab id as `1160186929`.** That is Sprint 1's.
   The real one is `517739515`. Phase 9 fixes the file; until then, use the
   right number or you will read the wrong sprint.

## What did not change

No code, no schema, no migration. Sections 6 and 8–11 of `conventions.md` name
columns and types that do not exist yet — **the migration happens at the sprint
task that needs the column**, not here. Naming them now is free; migrating them
now would mean maintaining columns nothing reads.

`bash scripts/snapshot-api.sh` produces an empty diff, because this phase is a
document.
