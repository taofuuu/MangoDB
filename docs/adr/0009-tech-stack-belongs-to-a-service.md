# 0009. Tech stack belongs to a service, not to the Provider

**Date:** 2026-10-02

## Status

Accepted

## Context

Service search ([0001](0001-listing-first-search-results.md)) shows one card
per service, and US3-2 filters those cards by technical stack. The only stack
in the database was `provider_tech_stack (company_id, tech_stack_name)`, one
list per company.

A company-wide list cannot say which service uses which tech. A company with
a web service and a mobile service showed the same stack on both, and
`techStack=Flutter` returned both. Its 24 rows were mock data: no endpoint
ever wrote to the table.

## Decision

**Tech stack is stored per service**, linked the same way categories are
linked to listings:

```
tech_stack          (tech_stack_id, tech_stack_name UNIQUE)
service_tech_stack  (listing_id → service, tech_stack_id → tech_stack)
```

The join table points at `service`, not `listing`, so a job can never carry
a stack. `provider_tech_stack` and its rows are dropped.

Migration: `apps/api/prisma/migrations/20261002090000_service_tech_stack/`.

**Unlike categories ([0002](0002-fixed-categories-with-other.md)), the list
is open.** `POST /services` takes `techStack` as names. A name already in
`tech_stack` is reused whatever its case, so `react` links to `React`. A new
name is added as typed.

**Alternative considered: keep the name on the join table**, as
`provider_tech_stack` did, with no lookup table. Rejected: nothing would stop
`React` and `react` becoming two techs, and there would be no single list for
a filter panel to offer.

**Alternative considered: copy each company's stack onto its services.**
Rejected because the rows were mock data. The new tables start empty.

## Consequences

**Easier:** a service's card and filters show its own stack. A Provider's
search card shows every tech its services use, built the same way as its
categories.

**Harder, on purpose:**

- **Every existing stack is gone** after the migration. Search shows
  `techStack: []` until services are created or edited with one.
- **Writing a service is two steps:** look up the stored spelling of each
  name, then link or create it. `resolveTechStack` in `lib/service.ts` does
  the first.
- **Two names created at the same moment in different cases** can still
  become two rows. The unique index is case-sensitive.
- **Editing a stack waits for `PATCH /services`** (T2.3.4), which should take
  `techStack` the same way `POST` does.
