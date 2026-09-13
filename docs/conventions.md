# Conventions

How this codebase names things. Sprint 2 adds three new resources and a search
endpoint, written by different people at the same time — this is the page that
keeps them from arriving in four different shapes.

**When this page and the code next to you disagree, this page wins and the code
is somebody's refactor phase.** When this page and the sprint sheet disagree,
this page wins for anything on the wire; the sheet describes the feature, not
the spelling.

If you want to change a rule here, say so before you write the code, not in the
review. See [docs/refactor/README.md](refactor/README.md).

---

## 1. Field names

**snake_case stops at the database. Everything above it is camelCase.**

| Layer               | Case                          |
| ------------------- | ----------------------------- |
| Postgres columns    | `snake_case` — `company_name` |
| Prisma model fields | `camelCase` via `@map`        |
| Controllers, DTOs   | `camelCase`                   |
| JSON request bodies | `camelCase`                   |
| JSON responses      | `camelCase`                   |
| Query + path params | `camelCase`                   |
| `packages/shared`   | `camelCase`                   |
| React props, state  | `camelCase`                   |
| Raw SQL             | `snake_case` — real columns   |

The translation happens **once, declaratively, in `prisma/schema.prisma`** with
`@map`. Never in hand-written mapper functions, one per resource — that is the
thing that would make this expensive forever instead of once.

```prisma
model ServicePortfolio {
  portfolioId   Int    @id @default(autoincrement()) @map("portfolio_id")
  portfolioName String @map("portfolio_name") @db.VarChar(255)

  @@map("service_portfolio")
}
```

`@map` changes no database column. It only changes what Prisma calls one, so no
migration runs and `prisma migrate diff` still reports no drift.

**Why camelCase and not snake_case.** Both are mainstream — Stripe, GitHub and
Slack use snake_case; Google, Microsoft Graph and GraphQL use camelCase — so
convention does not settle it. What settles it is that camelCase is what
TypeScript, React and every code generator produce by default, including the AI
models fourteen people are using. Fighting that default forever costs more than
paying the rename once.

The one place this is still being applied is Phase 2 of the refactor. Until that
lands you will see snake_case on the wire. **Write new code in camelCase
anyway** — Phase 2 is what makes the rest match, and code written the other way
just has to be redone.

---

## 2. URLs and endpoints

### 2.1 One name per action, everywhere

Pick the word once and use it in the route, the page, the function and the
button. Today `components/auth/LoginForm.tsx:115` links to `/signup`, which
404s, because the route is `/register`. Same idea, two names, wrong one shipped.

The word is **`register`**. `signup` appears nowhere.

### 2.2 Plural kebab-case nouns for collections

`/companies`, `/portfolios`, `/certificates`, `/services`, `/job-postings`,
`/proposals`, `/providers`.

Not `/jobPostings`, not `/job_postings`, not `/JobPostings`. Kebab-case is the
only one of the three that is conventional in a URL, and it is what the sprint
sheet already writes.

### 2.3 `/me` is the singular thing that is you. `/mine` is a collection of yours

| Want                     | Path                     |
| ------------------------ | ------------------------ |
| My profile (one object)  | `GET /companies/me`      |
| My services (a list)     | `GET /services/mine`     |
| My proposals (a list)    | `GET /proposals/mine`    |
| My certificates (a list) | `GET /certificates/mine` |

Today there are three spellings for the same idea — `/companies/me`,
`/certificates/provider`, and `/portfolios?companyId=`. Under this rule
`/companies/me` stays, the sprint sheet's two are already right, and
`/certificates/provider` becomes `/certificates/mine` (Phase 4).

### 2.4 Nest scoped collections, keep individual resources top-level

```
GET  /job-postings/:jobPostingId/proposals   the proposals on one posting
POST /job-postings/:jobPostingId/proposals   submit one to that posting
GET  /proposals/:proposalId                  one proposal, by its own id
```

A proposal id names the row on its own, so the posting does not need to be in
the path to find it. `/companies/me/credentials` is already right.

### 2.5 Path params carry the resource name

`:companyId`, `:portfolioId`, `:certificateId`, `:serviceId`, `:jobPostingId`,
`:proposalId`. **Not `:id`.**

The sprint sheet writes `PATCH /services/:id`; read that as `:serviceId`. The
repo already uses the qualified form everywhere, and it is what makes a nested
route readable: `/job-postings/:jobPostingId/proposals` says which id is which,
`/job-postings/:id/proposals` does not.

### 2.6 Admin surfaces live under `/admin/`

Never as a flag on a public endpoint. Already true — written down so it stays
true.

### 2.7 A state change with side effects gets an action endpoint

A plain field edit is a `PATCH`. Something that changes more than the row it
names gets a named action:

```
POST /proposals/:proposalId/accept
POST /proposals/:proposalId/reject
```

Accepting a proposal also creates the Project row, closes the posting and
rejects the other proposals — one transaction. `PATCH /proposals/:id { status }`
would hide all of that behind a field assignment.

### 2.8 One health endpoint

`GET /health`, unauthenticated, at the app root. `/admin/ping` is deleted in
Phase 4: it duplicates `/health` and sits _below_ the admin guard, so it cannot
serve as a probe anyway.

### 2.9 Frontend routes mirror the API nouns

`/register`, `/companies`, `/services`, `/job-postings`. That is what makes the
`/signup` link a convention bug rather than a typo.

### 2.10 Open question — provider search

The sheet writes `GET /providers/search`. Rules 2.2 and 2.3 would make it a
filtered collection instead:

```
GET /providers?q=&category=&techStack=&minPrice=&maxPrice=&sort=&page=&pageSize=
```

**Recommendation: `GET /providers`.** A search is a collection with filters on
it, `GET /admin/companies` already works exactly that way, and it leaves
`/providers/:companyId` free without a `/search` segment sitting in the middle
of the noun. Confirm before US3-1 starts; nine tasks reference it.

---

## 3. Response bodies

| What you are answering with | Body                              |
| --------------------------- | --------------------------------- |
| One resource                | the bare object                   |
| A collection                | a bare array                      |
| A paginated collection      | `{ items, pagination }`           |
| Nothing (204)               | no body — `res.status(204).end()` |

**Never `{ message, resource }`.** It exists in exactly two places
(`certificate.controller.ts:63` and `:175`) and both are among the newest code
in the repo, which is how a convention dies. The status code already says it
worked; the message is the frontend's to write.

`pagination` is the shared `PaginationMeta` type, not an object inlined in a
controller:

```ts
{ items: [...], pagination: { page, pageSize, totalItems, totalPages } }
```

Note `pageSize`, not `page_size`. `GET /admin/companies` currently takes
`pageSize` and answers with `page_size` — one endpoint contradicting itself.
After Phase 2 it answers with what the caller sent.

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

401 and 403 are different answers and must stay different: 401 means _who are
you_, 403 means _I know who you are and no_. Collapsing 403 into 404 is only
right when the existence of the row is itself private.

Use `.end()` for a 204, never `.send()`.

---

## 5. Errors

One envelope, everywhere, produced by `ApiError` and `errorHandler`:

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
- `details[].field` is the field name **as the caller sent it** — it comes from
  the Zod path, so it follows rule 1 automatically.
- Never `throw new Error(...)` from a request path. That is a 500 with no
  message. Throw an `ApiError`.

---

## 6. Status vocabulary

`listing_status`, `proposal_status` and `project.status` are free-text
`VarChar(50)` today, and Sprint 2 is entirely status-driven — filter postings by
status, hide closed postings, block accepting an already-rejected proposal.
Three people writing three endpoints will produce `open`, `OPEN` and `Open`.

SCREAMING_SNAKE_CASE, matching `account_type`'s existing `PROVIDER` / `RECEIVER`
/ `BOTH` / `ADMIN`. Declared as union types in `packages/shared`:

```ts
export type ListingStatus = 'DRAFT' | 'OPEN' | 'CLOSED';
export type ProposalStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';
export type ProjectStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
```

A new job posting defaults to `OPEN`. The sheet's phrase "Open for Proposals" is
the **label the UI shows**, not the stored value — display text lives in the
frontend, never in the column.

---

## 7. What a `listing` is

The one most likely to cost a day if nobody reads it.

`listing` is the shared parent of both a Provider's service and a Receiver's job
posting. `service` and `job_requirement` are 1:1 child tables keyed on
`listing_id`. **Nothing on the row says which kind it is** — the only signal is
which child row happens to exist.

```
listing (listing_id, company_id, listing_title, listing_desc,
         min_budget, max_budget, listing_status)
   |
   +-- service          (listing_id)            -> a Provider's service
   +-- job_requirement  (listing_id, location_pref, duration, deadline)
                                                -> a Receiver's job posting
```

So `GET /services/mine` and `GET /job-postings` **query the same table**, and
each has to filter by the child row it cares about.

**Add a `listing_type` column (`SERVICE | JOB`)** at the first Sprint 2 task
that touches the table, and filter on it. Filtering by "does a child row exist"
works until a listing ends up with neither or both, and then it silently returns
the wrong list.

> **Three sprint tasks say "create a table" for a table that already exists:**
> US2-1 "ServiceListing table: schema and migration", US2-6 "Job Posting table:
> schema and migration", and US2-11 "Project table: schema and migration".
> All three exist — as `listing` + `service`, `listing` + `job_requirement`, and
> `project`. Whoever picks those up is writing a **migration that adds columns**,
> not a new table. Creating parallel tables is the worst outcome available here.

---

## 8. Columns Sprint 2 needs that do not exist

US2-1 asks for an estimated price and a delivery duration on a service. `service`
has neither — it holds only `listing_id`. `listing.min_budget` /
`max_budget` are a budget range on the parent, which is a different thing.

Name them now, migrate at the task that needs them:

| Table      | Column                   | Type             | Why                                      |
| ---------- | ------------------------ | ---------------- | ---------------------------------------- |
| `service`  | `estimated_price`        | `Decimal(12,2)`  | US2-1; sorted on in US3-3                |
| `service`  | `delivery_duration_days` | `Int`            | US2-1; sorted on in US3-3                |
| `listing`  | `listing_type`           | `VarChar(20)`    | section 7                                |
| `listing`  | `created_at`             | `Timestamptz(6)` | US3-3 default ordering                   |
| `proposal` | `created_at`             | `Timestamptz(6)` | US2-9 "track the status of my proposals" |
| `project`  | `created_at`             | `Timestamptz(6)` | same reason                              |
| `company`  | `tos_accepted_at`        | `Timestamptz(6)` | US1-16                                   |

`job_requirement.duration` is a `VarChar(100)`, so "sort by delivery duration"
cannot work against it — that is why the service column is an `Int` of days
rather than more free text.

---

## 9. Money

`Decimal(12,2)` everywhere.

`listing.min_budget` and `max_budget` are `Int` today, while
`proposal.proposal_budget` and `project.total_budget` are already
`Decimal(12,2)`. A proposal answers a listing, so comparing a proposal's budget
to the listing's range crosses types. Never `Float` — it cannot hold money.

---

## 10. Dates and timestamps

| Column type       | On the wire   | Example                      |
| ----------------- | ------------- | ---------------------------- |
| `@db.Date`        | `YYYY-MM-DD`  | `"2026-01-15"`               |
| `@db.Timestamptz` | ISO-8601, UTC | `"2026-09-13T10:11:12.345Z"` |

This is already what the backend does — `toServicePortfolio` slices the ISO
string for `development_date`, and `deleted_at` ships as a full timestamp. Keep
it that way.

A date-only column read with `new Date(...)` in a UTC+7 browser lands on the day
before. Split the string, or build the `Date` at UTC midnight, exactly as
`lib/portfolio.ts` and `components/viewprofile/PortfolioList.tsx` already do.

---

## 11. Foreign keys that are mandatory in reality

`listing.company_id`, `proposal.listing_id`, `proposal.sender_id`,
`project.proposal_id` and `rating.proj_id` are all nullable, and all of them are
required for the row to mean anything. With `strict` and
`noUncheckedIndexedAccess` on, each one forces a null check in every controller
that touches it, forever — and every one of those checks is dead code guarding a
case that should be impossible.

Target: `NOT NULL`. Migrate at the sprint task that touches the table.

---

## 12. Validation

- Request schemas live in `apps/api/src/schemas/`, never inline in a controller.
  `checkAvailabilitySchema` is inline in `auth.controller.ts:117` today, and it
  has drifted from the registration rules it is supposed to predict — it accepts
  a 1-character username and does not lowercase, so it can report
  `"CodeCrafters"` available when `codecrafters` is taken.
- One definition per column, shared by every schema that touches it — see
  `companyFields` in `company.schema.ts`. Registration and the profile edit
  cannot then disagree about what a valid phone number is.
- **Use `z.strictObject` for every update body.** A plain `z.object` silently
  drops keys it does not know, so a typo answers `200` having written half of
  what was asked for. Exactly one schema is strict today
  (`updateCompanyProfileSchema`); eleven are not.
- Parse with `parseBody` / `parseQuery` / `parseParams` from
  `middleware/validate.ts`, so every failure lands in the same envelope.
- Query and path values arrive as strings. Their schemas need `z.coerce`.

---

## 13. Types

`packages/shared` is the source of truth for anything that crosses the wire. If
the backend and the frontend both need to know a shape, it lives there — not
in a component, and not twice.

- A `lib/` module must never import a type from a component. `lib/certificate.ts`
  does today, which makes a data module depend on the UI.
- A resource that has endpoints has a shared type. There is no `Certificate`
  type, and the frontend invented three shapes instead.
- Zod is what actually enforces a request body; the shared type is what the
  frontend writes against. Nothing checks the two agree, so assert it:

    ```ts
    type Assert<T extends U, U> = T;
    type _Check = Assert<
        z.infer<typeof updateCompanyProfileSchema>,
        UpdateCompanyProfileRequest
    >;
    ```

---

## 14. Migrations

Through a migration file and `npm run db:migrate` (`prisma migrate deploy`).

**Never `prisma migrate dev`, and never the Supabase dashboard.** Both produce a
database that no longer matches what is committed, and the next person to run
`db:migrate` finds out the hard way.

`npm run db:pull` is safe to run: re-introspection preserves `@map` renames,
which is documented Prisma behaviour.

---

## 15. Backend file layout

One resource, four files, in this order:

```
src/schemas/<resource>.schema.ts      what a valid request looks like
src/controllers/<resource>.controller.ts   what happens
src/routes/<resource>.routes.ts       the paths, and the guards — no logic
src/lib/<resource>.ts                 the select, the DTO, the shared checks
```

Mounted once in `src/routes/index.ts`.

- Controllers are `async function name(req, res): Promise<void>`. They call
  `res.json(...)` — they do not `return res.json(...)`.
- Every query names its columns with a `select`. Without one, a column added
  later silently ships to the browser — which is how `provider_id` is on every
  certificate response today.
- Every response goes through a DTO function in `lib/`, so the wire shape is a
  decision rather than "whatever the row happened to have".

`admin-company.controller.ts` + `lib/adminCompany.ts` + `admin-company.schema.ts`
is the worked example. See
[docs/adding-a-resource.md](adding-a-resource.md) once Phase 5 writes it.
