# 0000. camelCase above the database, snake_case stops at the column

**Example ADR** — shows what a filled-out record looks like. Numbered `0000`
so it sits outside the real decision sequence, which starts at `0001`.

**Date:** 2026-09-13

## Status

Accepted

## Context

The codebase was `snake_case` end to end: Postgres columns, Prisma model
fields, controllers, request and response bodies, `packages/shared`, and the
React frontend all used the same casing. Nine people had built parts of it
with different AI models, so nothing forced a choice — it was just the casing
the first files happened to use.

Sprint 2 was about to add several new resources and a search endpoint,
written by different people at the same time. Continuing in `snake_case` was
possible, but every new file, DTO, and shared type would be typed by hand
against TypeScript, React, and code generators that all default to camelCase.
Fighting that default in every file, forever, was the real cost — not the
one-time rename.

## Decision

`snake_case` stops at the Postgres column. Everything above it — Prisma model
fields, controllers, DTOs, JSON request and response bodies, query and path
params, `packages/shared`, and React props and state — is camelCase. See
[`docs/conventions.md` §1](../conventions.md#1-field-names) for the full rule
and the layer-by-layer table.

**Alternative considered: keep `snake_case` everywhere.** Rejected. Both
casings are mainstream (Stripe, GitHub, and Slack use `snake_case`; Google,
Microsoft Graph, and GraphQL use camelCase), so precedent doesn't settle it.
What settles it is that TypeScript, React, and every code generator in this
stack — including the AI models several contributors were using — produce
camelCase by default.

**Mechanism: `@map` and `@@map` in `prisma/schema.prisma`, not hand-written
mappers.** Prisma renames what it _calls_ a column; the column itself does not
move, so no migration runs:

```prisma
model ServicePortfolio {
  portfolioId Int @id @default(autoincrement()) @map("portfolio_id")

  @@map("service_portfolio")
}
```

The rejected alternative here was a hand-written mapper function per
resource, converting case on the way in and out. That is the version of this
change that costs forever instead of once — see
[`docs/refactor/phase-2-camelcase.md`](../refactor/phase-2-camelcase.md) for
why.

## Consequences

**What it made easier:** one casing convention above the database, checked
mechanically rather than by review. `packages/shared` and the Zod schemas in
`schemas/contract.ts` assert against each other, so a mismatch fails `tsc`
instead of surfacing as a bug in the browser.

**What it made harder, on purpose:**

- **A new column needs `@map` at the same time it's added.** A camelCase
  Prisma field with no `@map` is a column that does not exist yet — Prisma
  will look for it under the camelCase name and fail.
- **Raw SQL stays `snake_case`**, because it addresses real columns, not
  Prisma's names for them. `apps/api/src/lib/companyIdentity.ts` is the one
  `$queryRaw` in the codebase and says so in a comment. Any new raw query
  needs the same comment.
- **Anything compared against a database identifier — an index name, a
  constraint name — needs converting back by hand.** `toColumnName` in
  `apps/api/src/lib/prismaErrors.ts` exists only for this. It is a manual step
  that does not go away, and forgetting it doesn't fail loudly: a unique-index
  match that silently never fires turns a 409 into a 500.
- **Multipart field names are wire names, and the compiler cannot see them.**
  `uploadImage('certImage')` is `multer` matching a form part by string; a
  mismatch between the frontend's `FormData.append` key and the backend's
  field name compiles cleanly and fails at runtime. This is why
  `scripts/snapshot-api.sh` sends real multipart bodies rather than JSON only.

**What was verified, not assumed:** `npx prisma migrate diff` reported no
difference before and after adding every `@map`, and the snapshot suite's
before/after diff for the wire flip was checked key-by-key (32 removed fields
matched to 32 camelCase replacements, none dropped) rather than trusted on
line-count alone.
