# 0015. A project moves through six statuses, and only by the listed moves

**Date:** 2026-10-21

## Status

Open to Discuss

## Context

Accepting a proposal creates a project, and today it starts as `ACTIVE`
([`lib/project.ts`](../../apps/api/src/lib/project.ts)). The only statuses are
`ACTIVE`, `COMPLETED` and `CANCELLED` (`PROJECT_STATUSES` in
[`packages/shared/index.ts`](../../packages/shared/index.ts)), and nothing moves
a project out of `ACTIVE` yet.

Epic 4 adds the steps of a project: the Provider sends a quotation, the
Receiver accepts it, the deposit is paid, the work is done, and the Receiver
accepts the work. `ACTIVE` cannot say which of those steps a project is in, and
every screen and button in Epic 4 depends on that.

Account deletion also depends on it. A company with an `ACTIVE` project cannot
be deleted, by itself or by an admin
([`lib/project-eligibility.ts`](../../apps/api/src/lib/project-eligibility.ts)).
A project where the Provider never sends a quotation would block both
companies forever. US4-8 (cancel before work starts) was added for this.

## Decision

`project.status` takes one of six values, replacing the three above:

| Status                | Means                                                           |
| --------------------- | --------------------------------------------------------------- |
| `AWAITING_QUOTATION`  | The proposal was accepted. The Provider has to send a quotation |
| `AWAITING_DEPOSIT`    | The Receiver accepted a quotation. The deposit is not confirmed |
| `IN_PROGRESS`         | The Provider confirmed the deposit. The work is going on        |
| `AWAITING_ACCEPTANCE` | The Provider says the work is done. The Receiver checks it      |
| `COMPLETED`           | The Receiver accepted the work. Final                           |
| `CANCELLED`           | A party cancelled before work started. Final                    |

These are the only moves, and who may make each one:

| From                                       | To                    | Who                                                    | Story          |
| ------------------------------------------ | --------------------- | ------------------------------------------------------ | -------------- |
| _(new project)_                            | `AWAITING_QUOTATION`  | The listing owner, by accepting a proposal             | US2-11, US2-17 |
| `AWAITING_QUOTATION`                       | `AWAITING_DEPOSIT`    | Receiver, by accepting a quotation                     | US4-4          |
| `AWAITING_DEPOSIT`                         | `IN_PROGRESS`         | Provider, only after the Receiver reported the deposit | US4-7          |
| `IN_PROGRESS`                              | `AWAITING_ACCEPTANCE` | Provider, by reporting the work complete               | US4-11         |
| `AWAITING_ACCEPTANCE`                      | `IN_PROGRESS`         | Receiver, by rejecting the work with a reason          | US4-12         |
| `AWAITING_ACCEPTANCE`                      | `COMPLETED`           | Receiver, by accepting the work                        | US4-13         |
| `AWAITING_QUOTATION` or `AWAITING_DEPOSIT` | `CANCELLED`           | Either party                                           | US4-8          |

Some actions do not move the status: sending, deleting or rejecting a
quotation (the project stays `AWAITING_QUOTATION`), reporting the deposit (it
only records the time), and posting a progress update.

Any other move is refused with 409 and changes nothing. One helper,
`moveProjectStatus` in `lib/project.ts` (task F.10), holds this table. It
updates `where status = from`, so a double click cannot move a project twice.

**Alternative considered: keep `ACTIVE` and add a timestamp for each step.**
Rejected: the step would have to be worked out from several columns, and every
screen and check would repeat that logic. One status says it directly.

**Alternative considered: cancel at any time.** Rejected: once the Provider
confirms the deposit, money has changed hands outside the system. Undoing that
is a dispute, and the system has no way to settle one.

**Alternative considered: no cancel at all.** Rejected: a stuck project would
block deleting both companies for good, as described above.

## Consequences

**Easier:** each screen reads one field to know what to show. The deletion
check becomes simple: only `COMPLETED` and `CANCELLED` projects stop blocking
it (task F.8).

**Harder, on purpose:**

- **Existing rows must move.** `ACTIVE` projects have no quotation yet, so the
  Sprint 3 migration (F.6) sets them to `AWAITING_QUOTATION`. Accepting a
  proposal writes `AWAITING_QUOTATION` from the same PR, so no code still
  writes `ACTIVE`.
- **A project that stalls after work starts cannot be ended.** There is no
  cancel and no dispute after `IN_PROGRESS`, so it keeps blocking account
  deletion. There was no time for a dispute flow in the last sprint.
- **Cancelling does not reopen the job.** A Receiver who still needs the work
  posts a new job. A service was never closed, so there is nothing to reopen.
- **The column is still free text.** `PROJECT_STATUSES` in `packages/shared`
  and `moveProjectStatus` are the only guards
  ([conventions §6](../conventions.md)). The words a user reads are the
  frontend's; the column stores the values above.
