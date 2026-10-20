# 0018. One review per project: four 1-5 scores and an optional comment

**Date:** 2026-10-21

## Status

Open to Discuss

## Context

US5-1 asks the Receiver to rate a project "using defined criteria", US5-2 adds
a comment, and US5-3 shows a Provider's ratings and comments to other
companies. The stories do not say which criteria, the score range, whether a
review can be edited, or which projects count.

What exists:

- The `rating` table has a title, a score and a project id per row
  ([`schema.prisma`](../../apps/api/prisma/schema.prisma)). It has no comment,
  no author, and nothing stops many rows for one project.
- `getRating` in
  [`lib/admin-company.ts`](../../apps/api/src/lib/admin-company.ts) averages
  every rating row of every project a company is on, whatever its status.

## Decision

**One review per project, by its Receiver, once the project is `COMPLETED`**
([ADR 0015](0015-project-statuses.md)). A second review is 409.

**Four scores, each 1 to 5, all required:** work quality, service, value for
money, and delivery time.

**An optional comment, up to 500 characters.**

**A review is final once submitted.** No edit and no delete.

**A Provider's average counts reviews of `COMPLETED` projects only.** It is the
mean of every score in those reviews. One helper computes it (T5.1.3), and both
the profile and the rating sort call it.

**Alternative considered: one overall score.** Rejected: US5-1 asks for
defined criteria.

**Alternative considered: editable reviews.** Rejected: a review that can
change later is weaker as a record, and editing needs its own endpoint and UI.

## Consequences

**Easier:** one row per project is easy to check for "already reviewed". Every
review has the same four scores, so averages compare fairly.

**Harder, on purpose:**

- **A mistake in a review stays.** The Receiver should check before submitting.
- **Only the Provider is rated.** Receivers get no reviews; no story asks for
  it.
- **Cancelled projects get no review.**
- **The `rating` table is replaced.** The new review table comes in the Sprint
  3 migration (F.6), and `getRating` moves to the new helper.
- **A review outlives its author.** If the Receiver's account is deleted, the
  review stays, like the rest of a company's history (see `Company.deletedAt`).
