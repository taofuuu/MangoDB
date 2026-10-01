# 0001. Search results are listings, shown with the owner's company profile

**Date:** 2026-09-30

## Status

Accepted

## Context

Epic 3 is search. The only search endpoint today is `GET /providers`
(`apps/api/src/controllers/provider.controller.ts`), and it is
company-first: each result is a `ProviderSummary` in `packages/shared`, one
card per company, with the categories of that company's services collapsed
into a list.

A company-first result answers "who does web development?" but not "which
offer matches what I need?". Two services from the same company, with
different prices and descriptions, become one card. A Receiver who is looking
for a price or a scope must open each company to find the right listing.

The team needed one layout for search before several people started building
Epic 3 stories in parallel.

## Decision

Search follows the JobsDB style. **Each result is one listing** — a service
or a job, see [0005](0005-service-and-job-naming.md) — and each result
**carries a short profile of the company that owns it** (name, photo, and
enough to render the card). The listing is the main thing on the card. The
company is attached to it, not the other way round.

**Alternative considered: keep company-first results (the current
`/providers` shape).** Rejected for listing search, because it hides the
differences between one company's listings, and the price and scope are what
a user compares. `/providers` can stay for "browse companies"; it is not the
model for listing search.

## Consequences

**Easier:** one card shape for both services and jobs. Filtering by
category, budget and status works directly on `listing` columns, because the
result row _is_ a listing.

**Harder, on purpose:**

- **The same company can appear many times** in one page of results, once
  per listing. This is expected, not a bug.
- **Every search query joins `company`.** Use `select` for only the fields
  the card needs — never the whole company row, which holds the sign-in
  email and password hash.
- **Soft-deleted companies must be filtered out** (`company.deleted_at IS
NULL`), or their listings will still show in search.
- A shared response type for "listing + owner" is needed in
  `packages/shared`. It does not exist yet.
