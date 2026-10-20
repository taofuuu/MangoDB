# 0016. A hire request is a proposal on a service

**Date:** 2026-10-21

## Status

Open to Discuss

## Context

US2-15 to US2-18 add hire requests: a Receiver asks a Provider for one of its
services, and the Provider accepts or rejects it. Accepting starts a project,
the same way accepting a proposal on a job does.

The `proposal` table never assumed it was on a job. It has `listing_id` and
`sender_id`, and [ADR 0021](0021-proposal-sender-and-recipient.md) already
renamed its wire fields to `listingId`, `senderId`, `sender` and `recipient`
to get ready for this.

Two things in the current code do not fit a service:

- `proposal` has `@@unique([listingId, senderId])`
  ([`schema.prisma`](../../apps/api/prisma/schema.prisma)). A company can send
  one proposal per listing, ever. A Receiver could hire a service only once,
  and a Provider whose job proposal was rejected can never send a better one.
- Accepting a proposal closes the listing and rejects the other pending
  proposals (`acceptProposal` in
  [`proposal.controller.ts`](../../apps/api/src/controllers/proposal.controller.ts)).
  That is right for a job, which is one piece of work. A service is offered to
  many Receivers.

## Decision

**A hire request is a row in `proposal` whose listing is a service.** It has
the same fields as a job proposal: budget, terms, and a duration in months
([ADR 0007](0007-proposal-duration-in-months.md)). The Receiver is the sender
and the service's owner is the recipient. There is no new table.

**A company may have only one PENDING proposal per listing.** This replaces
`unique(listing, sender)`, for jobs as well as services. Once the earlier one
is accepted or rejected, the same company may send a new one. A second pending
one is 409.

**Accepting a hire request keeps the service open.** The other pending
requests on it are left alone, and only the accepted one starts a project
(`AWAITING_QUOTATION`, [ADR 0015](0015-project-statuses.md)).

**Alternative considered: a separate `hire_request` table.** Rejected: it would
copy every column of `proposal`, and the list, accept, reject and count
endpoints would all be written twice.

**Alternative considered: keep `unique(listing, sender)`.** Rejected: a
Receiver could hire a service only once, and a rejected Provider could never
try again on the same job.

## Consequences

**Easier:** hire requests reuse the proposal Zod schema, the DTO, and the
accept and reject helpers. The accept helper already lets a caller leave out
`closeOpenListing`.

**Harder, on purpose:**

- **Who the Provider is depends on the listing type.** On a job the sender is
  the Provider; on a service the sender is the Receiver. Code asks
  `lib/proposal.ts`, never the field name (ADR 0021).
- **The unique constraint changes in a migration (F.6).** The database has to
  allow two rows for the same listing and sender, but not two pending ones. A
  partial unique index (`where proposal_status = 'PENDING'`) does that; F.6
  decides the exact form. The old repeat-submission test (T2.8.6) changes with
  it (F.15).
- **A Provider can get the same request again after rejecting it.** Only one is
  pending at a time, so it cannot pile up.
