# 0017. A quotation is a PDF on the project; notices are in-app only

**Date:** 2026-10-21

## Status

Open to Discuss

## Context

After a proposal is accepted, the Provider sends a quotation (US4-1). The
Receiver views it (US4-3), then accepts or rejects it (US4-4, US4-5). US4-2
lets the Provider delete one the Receiver has not answered yet, to replace a
wrong file.

A proposal is text only ([ADR 0006](0006-proposal-text-only-no-upload.md)), so
the quotation is where the formal costs go. The stories say the Receiver is
"informed" of it, but the system has no email or notification service.

What exists for files:

- Uploads are images only, 5 MB max
  ([`middleware/upload.ts`](../../apps/api/src/middleware/upload.ts)), stored in
  Supabase storage ([`lib/storage.ts`](../../apps/api/src/lib/storage.ts)) for
  portfolios, certificates and profile photos.
- `project_contract` has a document link per project, but no status, and no
  code uses it.

## Decision

**A quotation is one PDF, up to 5 MB, attached to the project.** Only the
project's Provider uploads it, and only while the project is
`AWAITING_QUOTATION` ([ADR 0015](0015-project-statuses.md)). It goes through
the same storage helper as portfolios and certificates; there is no second
upload path.

Each quotation has a status: `PENDING`, `ACCEPTED` or `REJECTED`. Only one can
be pending at a time. A rejected quotation leaves the project
`AWAITING_QUOTATION`, so the Provider can send a new one. An accepted one moves
the project to `AWAITING_DEPOSIT`.

**The Provider can delete a quotation only while it is pending.** Accepted and
rejected quotations stay, because US4-3 shows them as the record of what was
agreed or turned down. Deleting also removes the PDF from storage.

**"Notify" means a "New quotation" badge in My Projects.** No email and no
push notification.

**Alternative considered: a quotation as form fields (amount, line items).**
Rejected: companies already write quotations as documents, and a line-item
editor would take a sprint by itself.

**Alternative considered: delete at any time.** Rejected: it would remove the
record of what the Receiver accepted.

**Alternative considered: email notices.** Rejected: there is no email service
in the stack, and adding one (sending, templates, failures) does not fit in the
last sprint.

## Consequences

**Easier:** one file type to accept and show. Every decided quotation is kept,
so both parties can see the history.

**Harder, on purpose:**

- **The upload filter is image-only today.** Quotations need a PDF-only filter
  with the same 5 MB limit (T4.1.2).
- **The Receiver only learns of a quotation by opening the app.**
- **The system does not read the PDF.** The amount inside is not checked
  against the project's `totalBudget`, which stays the proposal's budget.
- **Delete and decide can happen at the same moment.** Delete runs
  `where status = PENDING`, so whichever is second gets 409 (T4.2.2).
