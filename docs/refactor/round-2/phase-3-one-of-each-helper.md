# Phase 3 — Backend: one of each helper

**Status: done.** Nothing here changes a response. The snapshot diff stayed
empty after every batch of commits, and that is the acceptance test.

## What got merged

| Was                                                              | Now                                                                                                  |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `lib/` files in camelCase (`jobPosting`, `prismaErrors`, …)      | kebab-case, as §15 says                                                                              |
| `select` constants checked by nothing                            | each `satisfies Prisma.XSelect`                                                                      |
| the page math (`skip`, `take`, `Math.ceil`) written 6 times      | `pageArgs` + `toPagination` in `lib/pagination.ts`                                                   |
| the word split written 3 times, a keyword matcher per controller | `splitWords`, `containsWord`; each matcher in its own lib; the company search reuses the service one |
| `assertServiceOwned` and `assertJobOwned`                        | `assertListingOwned(id, type, companyId)`                                                            |
| "OPEN, or the owner's, else 404" in both GET-one handlers        | `assertListingVisible`                                                                               |
| the PATCH budget rule written twice                              | `assertBudgetRange`                                                                                  |
| the category write written 4 times                               | `categoryCreate` / `categoryReplace`                                                                 |
| close-the-listing and reject-pending, in close and in accept     | `closeOpenListing`, `rejectPendingProposals`                                                         |
| the project select and DTO inside `lib/proposal.ts`              | `lib/project.ts`, with `createProjectFromProposal`                                                   |
| accept as one 80-line transaction                                | a list of steps; reject shares the read                                                              |
| upload, write, roll back, clean up: 5 copies                     | `saveWithUpload` in `lib/upload.ts`                                                                  |
| the image type list in two files                                 | `IMAGE_EXTENSIONS`                                                                                   |
| P2025 try/catch around a single write                            | `orNotFound(write, message)`                                                                         |
| the same 409 written twice, three times over                     | `identityConflict`, `companyTypeRepeat`, `portfolioLinkConflict`                                     |
| `T00:00:00Z` ×3, `.slice(0, 10)` ×4                              | `fromDateOnly`, `toDateOnly`                                                                         |
| row types named `SelectedX` in some files, `XRow` in others      | `XRow`                                                                                               |
| 24 exports no other file imports                                 | not exported; `ProposalListQuery` deleted                                                            |
| the `if (!proposal.listing)` checks that cannot fail             | gone (Prisma types the relation as required)                                                         |

`toCompanyBrief`, also on this phase's list, was done in Phase 2.

## Accept, as steps

Accept used to be one transaction that always closed the listing. Sprint 3's
hire request is a proposal on a service, and accepting one must leave the
service open. Now:

```ts
const proposal = await findPendingProposalFor(tx, proposalId, callerId);
await closeOpenListing(tx, proposal.listingId, '…'); // a service hire leaves this out
await setProposalStatus(tx, proposalId, 'ACCEPTED');
await rejectPendingProposals(tx, proposal.listingId, proposalId);
return createProjectFromProposal(tx, { proposalId, proposalBudget });
```

The order of the checks and the messages are unchanged, and the five accept
unit tests from Phase 0 pass against the new version.

## One real bug

**The certificate year limits froze at startup.** `issueYear` was
`.max(currentYear())`. The comment above `currentYear()` explained why it had
to be a function, and then `.max()` called it once, when the file loaded. A
server left running over New Year would have refused certificates issued in
January. Both limits are now `.refine()` checks, which read the year per
request, with the same messages. The new test in
`schemas/certificate.schema.test.ts` moves the clock a year ahead after the
schema loads; it fails on the old schema and passes on the new one.

## Rules this phase leaves behind

1. **A `select` constant ends in `as const satisfies Prisma.XSelect`.**
   Without it, a field the model no longer has compiles fine and throws on
   the first request.
2. **A list endpoint uses `pageArgs` and `toPagination`.** Not the math.
3. **Anything a service and a job both do goes in `lib/listing.ts`.** If the
   function would be the same with `'SERVICE'` swapped for `'JOB'`, it is one
   function with a `listingType` parameter.
4. **An upload goes through `saveWithUpload`.** It is the only place that
   knows to remove the new file on failure and the old one on success.
5. **A value the schema checks against "now" goes in a `.refine()`.** A
   number passed to `.max()` is computed once, at startup.
6. **A transaction step that a later feature might skip is its own helper.**
   That is what makes accept reusable.

## What this phase deliberately left

- **Messages that differ for the same rule.** `assertListingOwned` still says
  "Service listing not found" for one kind and "Job posting not found" for
  the other, and the two budget messages differ. Making them one is a visible
  change, so it is Phase 4's.
- **The portfolio create's own ownership check.** Its 403 says "This service
  belongs to another company", unlike `assertListingOwned`. No snapshot
  records it, but the frontend shows it, so it moves with the wording in
  Phase 4.
- **The admin company search does not split its keyword into words**, unlike
  every other search. Splitting it changes which companies it finds, so it is
  a behaviour change, not a helper. Recorded for Phase 4.
- **One shared fake Prisma for the tests.** Each test's fake answers only the
  queries its controller sends, which keeps each test readable on its own. A
  shared fake would have to understand most of Prisma's `where` language to
  serve all four. The repeated part is a three-line `moduleUrl`, which is not
  worth a module and a build exclusion.
- **`projectSelect` and `toProject` stay exported** with no importer yet: they
  are what the project endpoints will use.
