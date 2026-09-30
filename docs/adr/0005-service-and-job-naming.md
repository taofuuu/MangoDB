# 0005. "Service" and "job" are the names for the two kinds of listing

**Date:** 2026-09-30

## Status

Accepted

## Context

One table, `listing`, holds two kinds of thing (see
[`docs/conventions.md` §7](../conventions.md#7-what-a-listing-is)), and the
team used many names for them. A Provider's offer was called "service",
"service listing", "listing" and "service-listing". A Receiver's request was
called "job", "job posting", "job requirement" and "posting". The code shows
the same mix today:

- `routes/service-listing.routes.ts` is mounted at `/listings`, but it only
  handles services.
- `routes/job-posting.routes.ts` is mounted at `/job-postings`, and its child
  table is `job_requirement`.
- `lib/servicelisting.ts` and `lib/jobPosting.ts` use two different casing
  styles for the same idea.

"Listing" alone was the worst case: people used it for a service, but it is
the name of the parent of both.

## Decision

In code and in team talk:

| Say         | Means                          | Not                                             |
| ----------- | ------------------------------ | ----------------------------------------------- |
| **service** | a Provider's service listing   | "listing", "service-listing", "service listing" |
| **job**     | a Receiver's job posting       | "job posting", "posting", "job requirement"     |
| **listing** | the parent table of both, only | a service on its own                            |

`listing_type` already stores exactly these two words: `SERVICE` and `JOB`.

## Consequences

**Easier:** one word per idea, and it matches the value in `listing_type`.

**Harder, on purpose:**

- **Existing names do not match yet.** This ADR does not rename files,
  routes or database tables. Renaming `/listings` or `/job-postings` is a
  breaking API change for the frontend and needs its own decision.
- **New code uses the new names.** New files, functions, types and variables
  say `service` and `job`. Old names are changed only when that code is
  touched anyway.
- **Database names stay.** `service`, `job_requirement` and `listing` are
  table names; renaming them is a migration on the shared database and is out
  of scope.
