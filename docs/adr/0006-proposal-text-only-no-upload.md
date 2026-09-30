# 0006. A proposal is text only, with no file upload

**Date:** 2026-09-30

## Status

Accepted

## Context

A proposal is what a Provider sends to answer a job. Today it carries a
budget and free-text terms (`proposal.proposal_budget`,
`proposal.proposal_terms` in `apps/api/prisma/schema.prisma`).

One team member argued that text is not enough, and that the proposal form
should accept an uploaded file, or have more fields. In the discussion it
turned out the concern came from mixing up a **proposal** with a
**quotation**. A quotation is a formal, itemised price document, the kind a
company would attach as a file. A proposal on this platform is the short
answer that says "we can do this job, for this budget, on these terms". The
receiver compares proposals and accepts one; the detailed paperwork comes
after that.

## Decision

The proposal form stays **text only**. No file upload, and no extra fields
for now. (The one new field is duration — see
[0007](0007-proposal-duration-in-months.md).)

**Alternative considered: add a file upload to the proposal.** Rejected for
now. The need for it came from the proposal/quotation mix-up, not from a
use case the proposal itself has. An upload also costs real work: storage,
file type and size limits, and access rules for who may download another
company's file.

## Consequences

**Easier:** the proposal stays a small JSON body, validated by one Zod
schema. No storage bucket, no multipart request, no file access rules.

**Harder, on purpose:**

- **A Provider who wants to send a detailed quotation cannot do it through
  the proposal.** It has to happen outside the platform, or later in the
  project.
- **"For now" means this can come back.** If a real need for a document
  appears — most likely a quotation or contract file after a proposal is
  accepted — it should be a new ADR, and it probably belongs on the
  project, not the proposal. `project_contract.document_link` already
  exists for project documents.
