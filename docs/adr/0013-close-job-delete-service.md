# 0013. Jobs are closed, not deleted; services can still be deleted

**Date:** 2026-10-14

## Status

Accepted

## Context

There are two kinds of listing: a job and a service
([ADR 0005](0005-service-and-job-naming.md)). A listing is only `OPEN` or
`CLOSED` ([ADR 0010](0010-listing-status-open-and-closed-only.md)).

What the API had at the time:

- Job: `POST /job-postings/:jobPostingId/close`
  ([`routes/job-posting.routes.ts`](../../apps/api/src/routes/job-posting.routes.ts)).
  There is no delete route.
- Service: `DELETE /services/...`
  ([`routes/service.routes.ts`](../../apps/api/src/routes/service.routes.ts)).

The team had to decide if a job also needs a delete button, and if a service
also needs one.

## Decision

**A job has a Close button and no Delete button.** For a job, delete and
close do the same job from the user's point of view: the job stops taking
proposals and leaves the search results. Having both is redundant, and it
makes the user choose between two buttons that seem the same.

**A service keeps its Delete button.** A service is something a company
offers. When the company stops offering it, removing it makes sense, so
delete is kept.

**Alternative considered: Delete for both.** Rejected for jobs: a job can
have proposals. Close keeps those proposals and their history; delete would
not add anything that close does not already do.

**Alternative considered: Close only for both.** Not chosen for now: for a
service, delete matches what users expect. The team is open to change this
later.

## Consequences

**Easier:** one clear action for a job. Proposals on a closed job are kept,
so nobody loses their history.

**Harder, on purpose:**

- **Job and service work differently.** A developer or user who knows one
  may expect the other to work the same way. This is on purpose.
- **A company cannot remove a job from its own list.** Closed jobs stay
  there.
- **This can change.** If there is a good reason later (for example, users
  ask to delete jobs, or a service should be closed instead), write a new
  ADR that supersedes this one.
