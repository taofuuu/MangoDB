# Phase 4 — Backend: wire rules

**Status: done.** First the moves that change nothing (the snapshot diff
stayed empty), then the changes a caller can see, each listed below. The final
snapshot diff is exactly those lines.

## Moves that change nothing

| Was                                                     | Now                                                                                                                |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| ~125 lines of service search building in the controller | `serviceSearchWhere`, `serviceFilterWhere`, `serviceOrderBy` in `lib/service.ts`; `jobSearchWhere` in `lib/job.ts` |
| accept and reject written whole in `lib/proposal.ts`    | the controller shows the steps; the lib keeps the select, the DTOs and the steps                                   |
| `GET /categories` returning raw rows                    | `categorySelect` + `toCategory` in `lib/category.ts`                                                               |
| `verifyCredentials` inside the auth controller          | in `auth/password.ts`, beside `assertCurrentPassword`                                                              |

## Changes a caller can see

| Change                                                                 | Before                                                                                                                                                 | After                                                                                                                  |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Listing errors, one wording                                            | "Service listing not found", "Listing not found", "Job posting not found"; "This listing belongs…", "Insufficient permissions to access this resource" | "Service not found", "Job not found"; "This service belongs to another company", "This job belongs to another company" |
| Job messages say job                                                   | "Only an open job posting can be closed", "Cannot submit a proposal to your own job posting", …                                                        | "Only an open job can be closed", "You cannot send a proposal to your own job", …                                      |
| One budget message                                                     | services: "minBudget must be less than or equal to maxBudget"                                                                                          | "Minimum budget cannot exceed maximum budget" everywhere                                                               |
| An ongoing project blocks a delete                                     | 409 for the company itself, 400 for an admin                                                                                                           | 409 on both, one message                                                                                               |
| An expiry before the issue date (certificate edit)                     | 400 `BAD_REQUEST`, no field                                                                                                                            | 400 `VALIDATION_FAILED` on `expireYear`, like create                                                                   |
| A failed image upload                                                  | 400, with Supabase's message                                                                                                                           | 500 `INTERNAL`; the cause is logged                                                                                    |
| A missing image (portfolio create, company photo)                      | 400 `BAD_REQUEST`, two wordings                                                                                                                        | 400 `VALIDATION_FAILED` on the field: "Choose an image first"                                                          |
| Paging                                                                 | five schemas; proposals default 6 with a `limit` alias; `?page=` a 400 on services                                                                     | one `pageQueryFields`: default 12, at most 50, blank means absent; no `limit`                                          |
| `?companyId=` / `?serviceId=` filters                                  | digits only on two routes, `int4Id` (which accepts `0x10`) on two                                                                                      | digits only everywhere (`optionalQueryId`)                                                                             |
| Service fields                                                         | no description limit, no category limit, default zod messages                                                                                          | the job's rules: description ≤ 10000, ≤ 10 categories, the same messages; budgets coerce                               |
| Unknown keys                                                           | `PATCH /companies/me/credentials` and `POST /services` dropped them                                                                                    | a 400 naming the key                                                                                                   |
| `GET /portfolios` with no filter                                       | every portfolio in the database, public, unpaged                                                                                                       | 400 "Provide companyId or serviceId"                                                                                   |
| Admin reads of listings                                                | refused on `/services`, allowed on `/services/:id` and `/jobs`                                                                                         | refused on all of them (company accounts only)                                                                         |
| Owner-only writes (edit, delete of services, portfolios, certificates) | the role checked first, so a Receiver got "Insufficient permissions"                                                                                   | sign-in plus ownership, like jobs: the ownership 403                                                                   |
| Job edit, certificate delete                                           | the owner checked only before the write                                                                                                                | again in the write; a 404 if it changed between                                                                        |

Smaller ones nobody should notice: `POST /services` takes `minBudget: null`,
like jobs; `/services/mine` reads the route's guard instead of checking
`req.auth` by hand; the two `res.status(200)` calls are `res.json`; the token
denylist queries name their columns; Prisma literals use `satisfies`.

## Decisions Toa made for this phase

1. `GET /portfolios` requires a filter. No page in the app calls it without
   one; the snapshot script now reads the seeded provider's portfolios, which
   also made `portfolios-one` stable.
2. Listing reads are for company accounts only, matching the rule `/services`
   and `/companies` already stated.
3. The role is checked on create only. Owning a service, job, portfolio or
   certificate already means the role.

## Rules this phase leaves behind

1. **One rule, one status code, one wording.** A second route enforcing the
   same rule reuses the first one's message (`LISTING_MESSAGES`,
   `BUDGET_RANGE_ERROR`, `ONGOING_PROJECT_BLOCKS_DELETE`).
2. **A list's paging is `...pageQueryFields`.** An id filter is
   `optionalQueryId(name)`, which keeps `.optional()` inside the blank check —
   an outer `.optional()` does not see `''` as absent.
3. **A cleared field is `blankToNull`, a param not sent is
   `blankToUndefined`.** Two meanings, two names, both in
   `schemas/common.schema.ts`.
4. **Every body schema is a `strictObject`.**
5. **The owner goes in the write's `where` too**, wrapped in `orNotFound`, so
   a row that changed between the check and the write is a 404.
6. **The role goes on create; ownership guards the rest.**

## What is left

- **The admin company search does not split its keyword into words**, unlike
  every other search. Splitting changes which companies an admin finds, so it
  needs a yes first.
- `ai-brief.md` still lists the old messages and codes; Phase 9 updates it.
