# 0019. A service has an estimated duration; a job's industry is its owner's company types

**Date:** 2026-10-21

## Status

Rejected

## Context

US3-3 lets a Receiver sort services, and US3-5 lets a Provider filter jobs. The
Sprint 3 draft added two things for them:

- A sort by how long the work takes. A service has no duration
  ([`schema.prisma`](../../apps/api/prisma/schema.prisma), `model Service`), so
  there was nothing to sort by.
- A job filter by industry. Neither a job nor a company has an industry field.
  Every company does pick company types at registration, stored in the
  `company_type` table.

## Decision

**Rejected at the team meeting on 2026-10-21: neither is needed.** US3-3 sorts
services by rating. US3-5 filters jobs by budget and deadline, alongside the
keyword and category search from US3-4.

What was proposed, kept so it is not proposed again without a new reason:

- A service gets an optional estimated duration in months, in steps of 0.5,
  the same rule as a proposal duration
  ([ADR 0007](0007-proposal-duration-in-months.md)). Services sort by it,
  shortest or longest first, with no duration last.
- A job's industry is its owner company's company types, and the industry
  filter matches against those tags.

## Consequences

- **No new column on `service`.** The Sprint 3 migration (F.6) adds no
  duration.
- **The tasks for these go.** T3.3.6 and T3.3.7 (service duration and its
  sort) are dropped, and T3.5.2 loses its industry filter.
- **[`docs/ai-brief.md`](../ai-brief.md) §6 stays true.** A service still has
  no delivery duration.
- **This can change.** If a later story needs either one, write a new ADR. This
  one records why they were left out.
