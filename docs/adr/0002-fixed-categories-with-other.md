# 0002. Categories are a fixed list, with an "Other" row for the rest

**Date:** 2026-09-30

## Status

Accepted

## Context

`category` holds eight pre-set rows (Web Development, Mobile App Development,
Hardware & IoT, IT Consulting & Security, Artificial Intelligence (AI), UI/UX
Design, ERP & CRM Systems, Digital Marketing & SEO). Listings link to them
through `listing_category`, so search can filter a listing by category (see
[0001](0001-listing-first-search-results.md)).

Some work does not fit any of the eight. The team had to choose between
letting users create their own categories, or keeping the list fixed.

## Decision

The list stays **fixed**. A new row, **`Other`**, is added to `category`. A
listing whose work is not in the pre-set list links to `Other`.

Migration: `apps/api/prisma/migrations/20260930140100_add_other_category/`.

**Alternative considered: users add their own categories.** Rejected. A
category only helps search if many listings share it. Free input gives
`Web Dev`, `web development` and `Website` as three different rows, and each
one filters to a few listings. Keeping the list fixed keeps
`listing_category` useful as a filter.

## Consequences

**Easier:** the category filter always shows a short, known list. No
moderation of user-made names, and no duplicate-cleanup job.

**Harder, on purpose:**

- **`Other` tells you nothing about the work.** A user who filters by
  `Other` must read each listing. That is the cost of a fixed list.
- **Adding a real category is a data change**, not a user action: a new
  `INSERT` in a migration. If `Other` grows large, that is the signal to
  look at its listings and add a category, then move them to it.
- Frontend code should not hardcode the `Other` id. Look it up by name,
  because ids on the shared database depend on insert order.
