# 0020. Only "service" and "job" above the database

**Date:** 2026-10-17

## Status

Accepted. Supersedes the "existing names do not match yet" consequence of
[ADR 0005](0005-service-and-job-naming.md); the rest of 0005 stands.

## Context

[ADR 0005](0005-service-and-job-naming.md) chose the words "service" and
"job" for the two kinds of listing, but on purpose renamed nothing: old names
were to change only when that code was touched anyway.

Two sprints later the job side still has three names for one thing:

- The route is `/job-postings`, the param `:jobPostingId`, the shared type
  `JobPosting`, the backend files `job-posting.*` and `lib/jobPosting.ts`.
- The Prisma model is `JobRequirement`, after the child table.
- New code written since 0005 still says `JobPosting` and `ServiceListing`,
  because it copied what was next to it. "Rename when touched" did not happen,
  since the old names were what everyone copied.

Sprint 3 builds projects, quotations and reviews on top of both kinds of
listing. Whatever the names are when it starts is what it copies.

## Decision

Above the database, there are only the two words:

| Was                                        | Now                   |
| ------------------------------------------ | --------------------- |
| `/job-postings`, `:jobPostingId`           | `/jobs`, `:jobId`     |
| `JobPosting` (shared type), `jobPostingId` | `Job`, `jobId`        |
| `ServiceListing` (shared type)             | `Service`             |
| Prisma model `JobRequirement`              | `Job`, via `@@map`    |
| `job-posting.*`, `lib/jobPosting.ts`       | `job.*`, `lib/job.ts` |
| frontend `/job-postings` pages             | `/jobs`               |

All of it is renamed at once, in round 2 of the refactor, before Sprint 3
starts.

**Table names stay.** `listing`, `service` and `job_requirement` are tables on
a database nine people share. `@@map` and `@map` rename what Prisma calls
them, so no migration runs.

The alternative was to keep renaming as code is touched. It lost because two
sprints showed that it does not happen: the old name is the one next to the
new code, so it is the one that gets copied.

## Consequences

**Easier:** one word per idea, the same in the URL, the type, the file and the
UI, and the same as the value `listing_type` stores.

**Harder, on purpose:**

- It is a breaking change for every caller of `/job-postings`. The frontend
  changes in the same branch. Anything else calling the API (a script, a saved
  request) has to change too.
- Every open branch that touches a job file conflicts. Round 2 announces a
  freeze for that reason.
- The child table is still called `job_requirement` in SQL and migrations.
  That is the one place the old word stays.
