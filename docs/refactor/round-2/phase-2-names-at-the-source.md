# Phase 2 — Names at the source

**Status: done.** Three commits, each with the snapshot diff it promised.
This is the never-half-done phase: a partial rename does not compile.

## The three commits

| Commit                                                              | What changed                                            | Snapshot diff                       |
| ------------------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------- |
| `refactor(api): Prisma names Job, categoryId, projectId and sender` | `@map` / `@@map` only; the DTOs kept the old wire names | **empty**, and `migrate diff` empty |
| `refactor: the wire says job, service, sender and recipient`        | the API, `packages/shared`, the web app and the script  | the renames below, nothing else     |
| `refactor: job.* files and names, and the snapshots to match`       | files, identifiers and snapshot names                   | **empty**                           |

The first commit is what proves no column moved. `prisma migrate diff` against
the shared database answered "an empty migration" before and after it, and
every one of the 197 snapshots came back identical.

The second commit's diff was read line by line, and then checked by a script
that compares every changed file's key paths before and after, with the
expected renames mapped. It found **no key dropped and none added**. That is
the check the first round's Phase 0 page says only a snapshot can do.

## What got renamed

| Was                                                                         | Now                                                                               |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `/job-postings`, `:jobPostingId`, `jobPostingId`                            | `/jobs`, `:jobId`, `jobId`                                                        |
| `JobPosting`, `ServiceListing` (shared types)                               | `Job`, `Service`                                                                  |
| Prisma `JobRequirement`, `Listing.jobRequirement`                           | `Job`, `Listing.job`                                                              |
| a proposal's `jobPostingId`, `providerId`                                   | `listingId`, `senderId`                                                           |
| `PostingProposal.provider`, `ProviderProposal.receiver`                     | `ReceivedProposal.sender`, `SentProposal.recipient`                               |
| flat `companyId` + `companyName` on a job or service                        | `company: CompanyBrief`                                                           |
| `catId`, `catName`                                                          | `categoryId`, `categoryName`                                                      |
| `projId`, a project's `status`                                              | `projectId`, `projectStatus`                                                      |
| `price-asc`, `price-desc`; `SearchServicesOrder`                            | `priceAsc`, `priceDesc`; `ServiceSortOrder`                                       |
| five `XListResponse` interfaces                                             | one `Paginated<T>`                                                                |
| hand-written unions for roles, account types, project statuses, error codes | derived from `USER_ROLES`, `ACCOUNT_TYPES`, `PROJECT_STATUSES`, `API_ERROR_CODES` |
| bare `'SERVICE'` / `'JOB'`                                                  | `LISTING_TYPES` (the constant exists; Phase 4 replaces the literals)              |
| `ViewMode` in `packages/shared`                                             | beside the toggle that uses it                                                    |
| backend `job-posting.*`, `lib/jobPosting.ts`                                | `job.*`, `lib/job.ts`                                                             |
| snapshot files `job-postings-*`, `posting-proposals-*`                      | `jobs-*`, `job-proposals-*`                                                       |

## Real bugs, not renames

**A `select` written as a constant hides a stale field from `tsc`.**
Renaming the proposal's `company` relation to `sender` compiled cleanly, but
`postingProposalSelect` still asked for `company`. TypeScript only checks
excess properties on an object literal, not on a constant passed in later, so
the first request would have thrown. It was caught by reading the selects, and
the snapshot run would have caught it too. Phase 3 adds `satisfies
Prisma.XSelect` so the compiler sees it.

**An ownerless listing was papered over.** The job DTO said
`companyId: row.companyId!` and `companyName: row.company?.companyName ?? ''`:
a broken row would have shipped an empty name. No listing in the database lacks
an owner (0 of 256 checked) and every create sets one, so `toCompanyBrief` now
turns a missing owner into a 500 that says so. The one visible change: a sent
proposal's `recipient` used to be `null` in that case and is now that 500.

**`CreateServiceRequest` had drifted.** It still had `listingStatus`, which the
schema refuses, and lacked `techStack`, which the schema takes. Nothing
noticed, because nothing imported it: the web app had its own
`CreateServiceBody`. It now matches, the web app uses it, and `contract.ts`
asserts it against `z.input` of the schema (the schema's defaults make its
output stricter than what a client sends).

**A run-specific id slipped past the snapshot rules.** A proposal used to name
its job `jobPostingId`, which the `job_posting_id` placeholder covered. As
`listingId` it recorded the raw number, which changes every run. The script
now names probe jobs under `listing_id` too.

## Done early, moved out

- **Done early:** the one `toCompanyBrief` helper from Phase 3's table. Every
  DTO this phase touched had its own copy, so merging them was cheaper than
  editing four.
- **Moved to Phase 6:** the web app's `lib/` function names
  (`listJobPostings`, `getJobPosting`), its page routes (`/job-postings/*`,
  `/proposal/view?jobPostingId=`) and the `jobPostingId` route folder. Phase 2
  changed only what had to change to compile.
- **Moved to Phase 7:** `CertificateData`. It is not a copy of the wire type
  but a form-state shape with its own field names (`name`, `organize`,
  `credID`), used by the certificate page and three forms. Replacing it is the
  `CertificateForm` merge, so it happens there once. `JobForm`'s
  `jobPostingId` prop goes with the component props.

## Rules this phase leaves behind

1. **A rename starts in `schema.prisma` with `@map`, and its first commit must
   leave the snapshot diff empty.** That is the only proof that no column
   moved.
2. **Read every `select` constant after a Prisma rename.** `tsc` passing is not
   enough until Phase 3 makes them `satisfies Prisma.XSelect`.
3. **A request type in `packages/shared` is asserted in `contract.ts`**, using
   `z.input` when the schema has defaults. An unasserted request type drifts.
4. **A snapshot id rule covers every key the id appears under.** One row can be
   a `jobId` in one response and a `listingId` in another.
