# Conventions

> **If you change this page, check `docs/ai-brief.md`.** It restates parts of
> this page for chat AIs that cannot follow a link.

How this project names and shapes things. Every rule applies to all code, old
and new.

- **This page vs the code:** this page wins. Code that disagrees needs fixing.
- **This page vs the backlog sheet:** the sheet describes the feature; this
  page decides how anything on the wire is spelled.
- **Changing a rule:** say so before writing the code, not in review. If the
  rule is hard to reverse, write an ADR — see [docs/adr/](adr/README.md).

---

## 1. Field names

**snake_case stops at the database. Everything above it is camelCase.**

| Layer                                  | Case                          |
| -------------------------------------- | ----------------------------- |
| Postgres columns, raw SQL              | `snake_case` — `company_name` |
| Prisma fields                          | `camelCase` via `@map`        |
| Controllers, DTOs, JSON bodies         | `camelCase`                   |
| Query and path params                  | `camelCase`                   |
| `packages/shared`, React props + state | `camelCase`                   |

Rename once, in `prisma/schema.prisma` with `@map` — never in a hand-written
mapper per resource. `@map` changes no column, so no migration runs.

```prisma
model ServicePortfolio {
  portfolioId Int @id @default(autoincrement()) @map("portfolio_id")

  @@map("service_portfolio")
}
```

Why camelCase: it is what TypeScript, React and AI tools write by default. See
[ADR 0000](adr/0000-camelcase-wire-format.md).

**Spell the word out.** `categoryId`, `categoryName`, `projectId` — not
`catId`, `catName`, `projId`. The column can keep its short name; `@map` does
the rest. `certTitle` is the one abbreviation kept, because renaming it changes
a lot and nothing new builds on it.

**The company that owns a row is `company`**, a `CompanyBrief` —
`{ companyId, companyName, companyPhoto }` — never a flat `companyName` beside
the row's own fields.

---

## 2. URLs and endpoints

### 2.1 One name per action, everywhere

The same word in the route, the page, the function and the button. Creating an
account is **`register`** — never `signup`.

### 2.2 Plural kebab-case nouns for collections

`/companies`, `/portfolios`, `/certificates`, `/services`, `/jobs`,
`/proposals`. Not `/jobPostings`, not `/job_postings`.

### 2.3 `/me` is one thing that is you. `/mine` is a list of yours

| Want                     | Path                     |
| ------------------------ | ------------------------ |
| My profile (one object)  | `GET /companies/me`      |
| My certificates (a list) | `GET /certificates/mine` |

### 2.4 Nest scoped collections, keep single resources top-level

```
GET  /jobs/:jobId/proposals              the proposals on one job
POST /jobs/:jobId/proposals              send one to that job
POST /proposals/:proposalId/accept       one proposal, by its own id
```

An id that names its row on its own does not need the parent in the path.

### 2.5 Path params carry the resource name

`:companyId`, `:serviceId`, `:jobId` — **never `:id`**. When the backlog
writes `:id`, read it as the qualified name.

### 2.6 Admin surfaces live under `/admin/`

Never as a flag on a public endpoint.

### 2.7 A state change with side effects gets an action endpoint

A plain field edit is a `PATCH`. A change that touches more than its own row is
a named action:

```
POST /proposals/:proposalId/accept
POST /proposals/:proposalId/reject
```

Accepting also creates a project and rejects the other proposals —
`PATCH { status }` would hide that.

### 2.8 One health endpoint

`GET /health`, unauthenticated, at the app root. Do not add a second one.

### 2.9 Frontend routes mirror the API nouns

`/register`, `/companies`, `/services`, `/jobs`. A page that lists a row's
children nests the way the API does: `/jobs/[jobId]/proposals`.

| Page                    | Route                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| Your own profile        | `/profile/view`, `/profile/edit`                                                            |
| Another company's pages | `/companies/[companyId]`, and `/services`, `/jobs`, `/portfolios`, `/certificates` under it |

### 2.10 Search is a filtered collection

No `/search` segment. Filters and paging go in the query string, the way
`GET /admin/companies` already works:

```
GET /companies?q=&orderBy=nameAsc&page=&pageSize=
```

---

## 3. Response bodies

| Answering with         | Body                              |
| ---------------------- | --------------------------------- |
| One resource           | the bare object                   |
| A collection           | a bare array                      |
| A paginated collection | `{ items, pagination }`           |
| Nothing (204)          | no body — `res.status(204).end()` |

- Never `{ message, resource }`. The status code says it worked; the message is
  the frontend's to write.
- `pagination` is the shared `PaginationMeta`:
  `{ page, pageSize, totalItems, totalPages }`. The whole body is the one
  generic shared type `Paginated<T>`, not a new `XListResponse` per resource.
- **A `/mine` list is paginated when the page shows it in pages**, and a bare
  array otherwise. `/proposals/mine` pages; `/services/mine` does not.

---

## 4. Status codes

| Code | When                                                         |
| ---- | ------------------------------------------------------------ |
| 200  | read, or a write that answers with the resource              |
| 201  | created — answer with the new resource                       |
| 204  | done, nothing to say — delete, logout                        |
| 400  | the request is malformed or a rule about the body was broken |
| 401  | not signed in, or the credential was wrong                   |
| 403  | signed in, but not allowed                                   |
| 404  | no such row, or the caller has no business knowing it exists |
| 409  | a unique constraint, or a state conflict                     |
| 429  | too many failed logins — only the login limit sends it       |

401 is _who are you_; 403 is _I know who you are, and no_. Keep them apart.
Fold 403 into 404 only when the row's existence is itself private.

One rule, one code, everywhere:

- **A state conflict is 409** — closed, not pending, already done. The same
  rule on two routes never answers 409 on one and 400 on the other.
- **A rule across two fields is 400 `VALIDATION_FAILED`**, with the field in
  `details` — `minBudget` over `maxBudget`, an expiry before the issue date.
- **A storage failure is 500.** An upload that fails on our side is not the
  caller's fault.

---

## 5. Errors

One envelope, from `ApiError` and `errorHandler`:

```json
{
    "error": {
        "code": "VALIDATION_FAILED",
        "message": "Request body is invalid",
        "details": [{ "field": "email", "message": "Invalid email address" }]
    }
}
```

- `code` is the frontend's contract. Renaming one is a breaking change.
- `details[].field` is the field name as the caller sent it.
- Never `throw new Error(...)` on a request path — that is a 500 with no
  message. Throw an `ApiError`.

---

## 6. Status vocabulary

Stored values are SCREAMING_SNAKE_CASE, like `account_type`'s `PROVIDER` /
`RECEIVER` / `BOTH` / `ADMIN`. The status columns are free-text `VarChar(50)`,
so the types in `packages/shared` are the only enforcement.

**Every union is derived from a const array**, so the frontend can loop over
the values — filter chips, a dropdown — without writing a second copy:

```ts
export const LISTING_STATUSES = ['OPEN', 'CLOSED'] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];
```

- Each status field is named after its table: `listingStatus`,
  `proposalStatus`, `projectStatus`.
- A value that is never stored — a sort order — is camelCase: `nameAsc`,
  `priceAsc`.
- No bare string literal for a stored value in code: `LISTING_TYPES`, or
  `'OPEN' satisfies ListingStatus`.

The column stores the value (`OPEN`); the UI shows the label ("Open for
Proposals"). Display text lives in the frontend, never in the column.

---

## 7. What a `listing` is

`listing` is the parent of both a Provider's service and a Receiver's job.
`listing_type` says which one it is.

```
listing (listing_id, company_id, listing_type, listing_status, ...)
   +-- service          (listing_id)        -> listing_type = SERVICE
   +-- job_requirement  (listing_id, ...)   -> listing_type = JOB
```

**Above the database there are only two words: service and job**
([ADR 0020](adr/0020-only-service-and-job-above-the-database.md)) —
`/services` and `/jobs`, `Service` and `Job`, `serviceId` and `jobId`. The
table `job_requirement` is the Prisma model `Job`, through `@@map`. Not "job
posting", not "service listing".

`listing` is only ever the parent. A proposal says `listingId`, because it can
be sent to either kind
([ADR 0021](adr/0021-proposal-sender-and-recipient.md)).

- Services and jobs **query the same table**. Always filter on
  `listing_type`, not on which child row exists.
- Before creating a table for a kind of listing, check it is not already
  `listing` plus a child. Usually the task is a migration that adds columns.

---

## 8. New columns

- snake_case column, camelCase field, and the `@map` added at the same time.
- Anything users sort or filter on is a number or a date, not free text. A
  proposal's `duration` is a number of months
  ([ADR 0007](adr/0007-proposal-duration-in-months.md)).
  `job_requirement.duration` is still free text — a known exception, not a
  pattern to copy.
- A table whose rows are listed by time gets
  `created_at Timestamptz(6) @default(now())`.

---

## 9. Money

`Decimal(12,2)`. Never `Float` — it cannot hold money exactly.

`listing.min_budget` and `max_budget` are still `Int`. That is a known
exception, not a pattern to copy.

---

## 10. Dates and timestamps

| Column type       | On the wire   | Example                      |
| ----------------- | ------------- | ---------------------------- |
| `@db.Date`        | `YYYY-MM-DD`  | `"2026-01-15"`               |
| `@db.Timestamptz` | ISO-8601, UTC | `"2026-09-13T10:11:12.345Z"` |

Never turn a date-only value into a local `Date` and back: local midnight in
UTC+7 is the day before in UTC. Split the string, or build the `Date` at UTC
midnight (see `formatDateOnly` in `apps/mangodb/lib/dates.ts`).

---

## 11. Required foreign keys are `NOT NULL`

A foreign key the row means nothing without is `NOT NULL`. A nullable one forces
a dead null check in every controller that touches it.

Still nullable, to fix in the next migration that touches each table:
`listing.company_id` and `rating.proj_id`.

---

## 12. Validation

- Request schemas live in `apps/api/src/schemas/`, never inline in a controller.
- One definition per column, shared by every schema that uses it — see
  `companyFields` in `company.schema.ts`.
- **`z.strictObject` for every update body.** A plain `z.object` drops unknown
  keys, so a typo answers `200` having written nothing.
- Parse with `parseBody` / `parseQuery` / `parseParams` from
  `middleware/validate.ts`, so every failure lands in the same envelope.
- Query and path values arrive as strings, so their schemas need `z.coerce`.

---

## 13. Types

`packages/shared` is the source of truth for anything that crosses the wire.

- A resource with endpoints has one shared type — not a shape per component.
- A shape only the UI uses — a view mode, a tab — stays in the web app. It is
  not a wire type.
- A `lib/` module never imports a type from a component.
- Assert each request schema against its shared type in
  `apps/api/src/schemas/contract.ts`, so `tsc` fails when they drift.

---

## 14. Migrations

A committed migration file, applied with `npm run db:migrate`. **Never
`prisma migrate dev`, never the Supabase dashboard** — both leave the shared
database different from what is committed. Step by step:
[CONTRIBUTING.md](../CONTRIBUTING.md#database).

**Never `npm run db:pull` to bring `schema.prisma` up to date.** It rewrites
the file from the database: it keeps `@map`, but drops every comment and some
relation options, like `onDelete: Restrict` (PR #156 committed one by
accident). Edit `schema.prisma` by hand and write the migration with
`prisma migrate diff`, as CONTRIBUTING describes.

---

## 15. Backend file layout

One resource, four files, mounted once in `src/routes/index.ts`:

```
src/schemas/<resource>.schema.ts          what a valid request looks like
src/controllers/<resource>.controller.ts  what happens
src/routes/<resource>.routes.ts           paths and guards — no logic
src/lib/<resource>.ts                     the select, the DTO, shared checks
```

- The four files share one kebab-case name: `job.schema.ts`,
  `job.controller.ts`, `job.routes.ts`, `lib/job.ts`. Every file in `lib/` is
  kebab-case, helpers too: `prisma-errors.ts`, `admin-company.ts`.
- Controllers are `async function name(req, res): Promise<void>` and call
  `res.json(...)`, not `return res.json(...)`.
- Every query has a `select`, so a new column never ships by accident.
- Every response goes through a DTO in `lib/`.

Step by step, with a worked example: [adding-a-resource.md](adding-a-resource.md).

---

## 16. Frontend file layout

```
app/<route>/page.tsx      a page; its URL mirrors the API (§2.9)
components/<noun>/        one folder per API noun, plural
components/ui/            generic pieces only: Button, ModalShell, Input, …
lib/<noun>.ts             the requests for that noun
```

- Folders are the plural API nouns: `services`, `jobs`, `proposals`,
  `companies`, `portfolios`, `certificates`, plus `profile`, `auth`,
  `register`, `nav` and `ui`. A component for one resource does not go in
  `ui/`.
- One component per file, a default export, and the file named after it.
- `lib/` also holds the shared helpers: `dates`, `money`, `pagination`, the
  form rules in `validation/<schema>.ts`, and the hooks `useMyCompany`,
  `useSearchServices` and `useCategories`. A component formats a date or an
  amount through them, never on its own.
- An add form and an edit form for one thing are one component with a mode,
  mounted only while open.
