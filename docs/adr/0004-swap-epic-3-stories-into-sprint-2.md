# 0004. Sprint 2 swaps some Epic 3 stories in, and other stories out

**Date:** 2026-09-30

## Status

Accepted

## Context

The Sprint 2 plan had only three user stories from Epic 3 (search). The product
backlog was badly split: other Epic 3 stories were put in Sprint 3, but some
of them depend on the same search endpoint, the same result shape
([0001](0001-listing-first-search-results.md)) and the same category list
([0002](0002-fixed-categories-with-other.md)) as the three already planned.
Building those later meant building the same base twice, or building on a base
that would change.

## Decision

The team **swaps stories**, and keeps the size of Sprint 2 about the same:

- **In:** the Epic 3 stories from Sprint 3 that share the search base with
  the three already planned.
- **Out:** other Sprint 2 stories of about the same size, moved to Sprint 3.

The exact stories that moved in and out are recorded in the sprint backlog,
not here.

**Alternative considered: take all of Epic 3 into Sprint 2.** Rejected. It
makes Sprint 2 much bigger than the team can finish, and not every Epic 3
story shares the search base.

**Alternative considered: keep the plan, three stories now.** Rejected,
because the stories that share the base with those three would then be
designed twice.

## Consequences

**Easier:** the stories that need the search base are built together, in one
sprint. Sprint 2 does not grow.

**Harder, on purpose:**

- **Some planned Sprint 2 work waits until Sprint 3.** Anyone waiting for
  those stories should know they moved.
- **Epic 3 is still split across two sprints.** Stories that stay in Sprint 3
  must build on the Sprint 2 search base, not change it.
- The backlog itself should be fixed, so a later sprint does not split one
  epic's shared base work in the same way.
