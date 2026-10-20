# 0019. A service has an estimated duration; a job's industry is its owner's company types

**Date:** 2026-10-21

## Status

Open to Discuss

## Context

US3-3 lets a Receiver sort services by rating and by how long the work takes.
A service has no duration today
([`schema.prisma`](../../apps/api/prisma/schema.prisma), `model Service`), so
there is nothing to sort by.

US3-5 lets a Provider filter jobs by industry. Neither a job nor a company has
an industry field. Every company does pick company types at registration,
stored in the `company_type` table.

## Decision

**A service gets an optional estimated duration in months, in steps of 0.5.**
It is the same rule as a proposal duration
([ADR 0007](0007-proposal-duration-in-months.md)) and reuses that Zod rule. It
is nullable, so existing services and Providers who leave it blank are fine.

**Both new sorts work in both directions:**

| Sort     | Values                        | Missing value          |
| -------- | ----------------------------- | ---------------------- |
| Rating   | highest first, lowest first   | Unrated Providers last |
| Duration | shortest first, longest first | No duration last       |

**A job's industry is its owner company's company types.** The industry filter
matches against those tags. There is no new field on the job.

**Alternative considered: free-text duration, like `job_requirement.duration`.**
Rejected: text cannot be sorted.

**Alternative considered: duration in days.** Rejected: proposals are already
in months, and one unit lets a service and a proposal be compared.

**Alternative considered: an industry field on each job.** Rejected: the
Receiver would fill it on every job, and existing jobs have none. Company types
are already set for every company.

## Consequences

**Easier:** no new unit, no new validation, and the industry filter needs no
new column.

**Harder, on purpose:**

- **A nullable column on `service` (F.6).** Old services sort last on duration
  until their owner edits them.
- **Industry describes the company, not the job.** A job for something outside
  the company's usual types still matches on the company's tags.
- **[`docs/ai-brief.md`](../ai-brief.md) §6 lists a service duration as not
  existing.** That line goes when the column ships.
