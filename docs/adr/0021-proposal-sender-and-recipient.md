# 0021. A proposal has a sender and a recipient, and points at a listing

**Date:** 2026-10-17

## Status

Accepted

## Context

A proposal today is always a Provider answering a Receiver's job, and its wire
names say so:

- `Proposal.jobPostingId` and `Proposal.providerId`.
- `ProviderProposal.receiver`: the company that posted the job, on the
  Provider's own list.
- `PostingProposal.provider`: the company that sent it, on the job owner's
  list.

The database never assumed this. The `proposal` table has `listing_id` and
`sender_id`, and Prisma already calls them `listingId` and `senderId`. Only the
DTO renames them to the job-only words.

Sprint 3's draft plan makes a hire request a proposal on a **service**: a
Receiver sends it to a Provider. Under the current names the sender would be
called `providerId` while being a Receiver, and the listing `jobPostingId`
while being a service.

## Decision

| Was                                            | Now         |
| ---------------------------------------------- | ----------- |
| `jobPostingId` on a proposal                   | `listingId` |
| `providerId`                                   | `senderId`  |
| `provider` (the company that sent it)          | `sender`    |
| `receiver` (the company that owns the listing) | `recipient` |

Each name is the role in the proposal, not the account type. Which one is the
Provider depends on the listing type, and that is worked out in one place,
`lib/proposal.ts`.

The other option was `listingOwner` for the recipient. `recipient` won because
it pairs with `sender`, and it says what matters on a proposal: who it was
sent to.

## Consequences

**Easier:** a hire request on a service can reuse the proposal row, the DTO
and the list pages, with nothing renamed again.

**Harder:**

- It is a breaking change on every proposal response. The frontend changes in
  the same branch (round 2, Phase 2).
- Reading a proposal no longer says who the Provider is. Code that needs that
  asks `lib/proposal.ts`, not the field name.
- It assumes Sprint 3 keeps hire requests in the proposal table. If the team
  decides otherwise, nothing here is wrong; the names are just more general
  than they needed to be.
