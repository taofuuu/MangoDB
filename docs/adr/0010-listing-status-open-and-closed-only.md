# 0010. A listing is only OPEN or CLOSED; there is no DRAFT

**Date:** 2026-10-07

## Status

Accepted

## Context

`docs/conventions.md` §6 set the listing statuses to `DRAFT | OPEN | CLOSED`,
and `packages/shared/index.ts` has `LISTING_STATUSES = ['DRAFT', 'OPEN',
'CLOSED']`. `DRAFT` was put in the first list as placeholder data. No story in
the Sprint 2 backlog asks for drafts, and no endpoint ever creates one:
`POST /services` and `POST /job-postings` both create listings as `OPEN`.

Supporting `DRAFT` for real would add work to every listing feature:

- a way to save a draft and a way to publish it,
- hiding drafts from search, browse, and the detail page for everyone except
  the owner,
- blocking proposals on a draft,
- a rule for what editing and closing a draft mean.

The team does not have time for this, and nobody asked for it.

## Decision

**A listing has two statuses: `OPEN` and `CLOSED`.** A new service or job is
created `OPEN`. It becomes `CLOSED` when the owner closes it or when a
proposal on it is accepted. `DRAFT` is removed from the vocabulary.

**Alternative considered: keep `DRAFT` in the type and just never use it.**
Rejected. A value that is in the type but never stored still makes every
`switch`, filter, and Zod schema handle it, and makes readers think drafts
exist. `GET /job-postings?status=DRAFT` would pass validation and always
return nothing.

**Alternative considered: build drafts now.** Rejected for the workload
listed above.

## Consequences

**Easier:** every listing that exists is either visible (`OPEN`) or finished
(`CLOSED`). Search, detail, and proposal code only check for `OPEN`.

**Harder, on purpose:**

- **An owner cannot save a half-written listing.** The form must be filled
  and posted in one go. If drafts are needed later, that is a new ADR that
  supersedes this one.
- **Code that still names `DRAFT` must change** in the same PR that removes
  it from `LISTING_STATUSES`:
    - `packages/shared/index.ts` — the `LISTING_STATUSES` array.
    - `apps/api/src/lib/service.ts` — `DEFAULT_LISTING_STATUS` is
      `LISTING_STATUSES[1]`. With `DRAFT` gone, index 1 is `CLOSED`, so new
      services would be created closed. Use `'OPEN'` by name instead.
    - `apps/api/src/schemas/job-posting.schema.ts` — the status filter comment.
    - `apps/api/src/seed.ts` — the comment above `listingStatus`.
    - `apps/api/src/controllers/job-posting.controller.ts` — the visibility
      comments above `listJobPostings` and `getJobPosting`.
    - `docs/conventions.md` §6.
    - `snapshots/error-job-postings-list-invalid-status.json` — the error
      message lists the allowed values.
- **Rows already stored as `DRAFT`**, if any, need a migration before the
  type change. The column is free-text `VarChar(50)`, so the database will
  not catch them.
