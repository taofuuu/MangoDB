# 0004. This sprint takes all of Epic 3, not three of its stories

**Date:** 2026-09-30

## Status

Accepted

## Context

The sprint plan had only three user stories from Epic 3 (search). The product
backlog was badly split: other Epic 3 stories were put in the next sprint, but
they depend on the same search endpoint, the same result shape
([0001](0001-listing-first-search-results.md)) and the same category list
([0002](0002-fixed-categories-with-other.md)). Building three stories now
and the rest later meant building the same base twice, or building on a base
that would change.

## Decision

The work planned for next sprint is moved into this sprint. **The team does
every Epic 3 story this sprint**, not only the three first planned.

**Alternative considered: keep the plan, three stories now.** Rejected,
because the remaining stories share the base work with the first three, and
splitting them across sprints would mean designing that base twice.

## Consequences

**Easier:** the search base (result shape, category filter, status filter) is
designed once, for all its users.

**Harder, on purpose:**

- **This sprint is bigger.** Other planned work may have to move out to make
  room. Record what moved in the sprint notes.
- **Next sprint loses its planned Epic 3 work** and needs new stories from the
  backlog.
- The backlog itself should be fixed so a later sprint does not split one
  epic's shared base work the same way.
