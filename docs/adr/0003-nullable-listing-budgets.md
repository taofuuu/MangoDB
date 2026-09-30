# 0003. Both listing budgets are nullable

**Date:** 2026-09-30

## Status

Accepted

## Context

`listing` is the shared parent of a service and a job (see
[`docs/conventions.md` §7](../conventions.md#7-what-a-listing-is)). It has
two budget columns: `min_budget` (already nullable) and `max_budget`
(`INTEGER NOT NULL` since `0_init`).

The two kinds of listing need different budgets:

- A **service** says "starting from" — a minimum price makes sense; a
  maximum often does not.
- A **job** says "up to" — a maximum budget makes sense; a minimum often
  does not.

With `max_budget NOT NULL`, every service must invent a maximum it does not
have.

## Decision

**`max_budget` becomes nullable**, so both budget columns allow `NULL`.
Which budget a listing must have is checked by the Zod schema for that kind
of listing, not by the database.

Migration: `apps/api/prisma/migrations/20260930120000_nullable_max_budget/`.

**Alternative considered: move the budgets to the child tables** (`min_budget`
on `service`, `max_budget` on `job_requirement`). This is the more correct
model, but it changes the schema, both controllers, both `lib` mappers,
the shared types and the seed. Rejected **for now** as too big for this
sprint. This ADR is the quick fix; the move can be a later ADR that
supersedes this one.

## Consequences

**Easier:** one `ALTER COLUMN`, no data moves, and no existing row changes
(no row has a null `max_budget` today).

**Harder, on purpose:**

- **The database no longer stops a listing with no budget at all.** The Zod
  schemas are the only guard, so each one must decide which budget its kind
  of listing requires.
- **`schema.prisma` must change with the SQL:** `maxBudget Int?` at
  `apps/api/prisma/schema.prisma:104`. Without it, Prisma's type says
  `number` but the value can be `null`.
- **Code that assumes `maxBudget: number` must handle `null`:**
  `lib/servicelisting.ts`, `lib/jobPosting.ts`, `schemas/service-listing.schema.ts`
  (the `minBudget <= maxBudget` check), and `JobPosting` in
  `packages/shared`.
