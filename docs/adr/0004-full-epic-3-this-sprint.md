# 0004. Sprint 2 takes all of Epic 3, not three of its stories

**Date:** 2026-09-30

## Status

Accepted

## Context

The Sprint 2 plan had only three user stories from Epic 3 (search). The product
backlog was badly split: other Epic 3 stories were put in Sprint 3, but
they depend on the same search endpoint, the same result shape
([0001](0001-listing-first-search-results.md)) and the same category list
([0002](0002-fixed-categories-with-other.md)). Building three stories now
and the rest later meant building the same base twice, or building on a base
that would change.

## Decision

The Epic 3 work planned for Sprint 3 is moved into Sprint 2. **The team does
every Epic 3 story in Sprint 2**, not only the three first planned.

**Alternative considered: keep the plan, three stories now.** Rejected,
because the remaining stories share the base work with the first three, and
splitting them across sprints would mean designing that base twice.

## Consequences

**Easier:** the search base (result shape, category filter, status filter) is
designed once, for all its users.

**Harder, on purpose:**

- **Sprint 2 is bigger.** Other planned work may have to move out to make
  room. Record what moved in the sprint notes.
- **Sprint 3 loses its planned Epic 3 work** and needs new stories from the
  backlog.
- The backlog itself should be fixed so a later sprint does not split one
  epic's shared base work the same way.
