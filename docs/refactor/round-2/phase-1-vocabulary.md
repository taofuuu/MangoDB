# Phase 1 — Vocabulary

**Status: done.** Ships the changes to [docs/conventions.md](../../conventions.md)
and two ADRs. No code changed.

## What this phase is

Every later phase renames something. This one writes down what the names will
be, so each rename happens once, and Sprint 3 is written against the answer
rather than against whatever file it copies.

**`conventions.md` now describes where round 2 ends up, not where the code is
today.** The code catches up phase by phase: the names in Phase 2, the helpers
and status codes in Phases 3–4, the routes and folders in Phases 6–7. Until
then, a file that disagrees with the page is on that list, not a second
convention.

## What got decided

| #   | Decision                                                                                                         | Where it is written                                                       | Bites at    |
| --- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ----------- |
| 1   | Only "service" and "job" above the database: `/jobs`, `Job`, `jobId`, `Service`; Prisma `JobRequirement` → `Job` | [ADR 0020](../../adr/0020-only-service-and-job-above-the-database.md), §7 | Phase 2     |
| 2   | A proposal has a `sender` and a `recipient`, and points at `listingId`                                           | [ADR 0021](../../adr/0021-proposal-sender-and-recipient.md)               | Phase 2     |
| 3   | Spell the word out: `categoryId`, `categoryName`, `projectId`; `certTitle` stays                                 | §1                                                                        | Phase 2     |
| 4   | The owning company is `company: CompanyBrief`, never a flat `companyName`                                        | §1                                                                        | Phase 2     |
| 5   | One `Paginated<T>`; a `/mine` list is paginated only when the page pages it                                      | §3                                                                        | Phase 2     |
| 6   | Every union derives from a const array; status fields are `listingStatus` / `proposalStatus` / `projectStatus`   | §6                                                                        | Phase 2     |
| 7   | A value never stored is camelCase: `priceAsc`, not `price-asc`                                                   | §6                                                                        | Phase 2     |
| 8   | State conflict 409; a rule across two fields 400 `VALIDATION_FAILED` on the field; storage failure 500           | §4                                                                        | Phase 4     |
| 9   | Another company's pages are `/companies/[companyId]/*`; yours stay `/profile/view` and `/profile/edit`           | §2.9                                                                      | Phase 6     |
| 10  | Backend `lib/` files are kebab-case; component folders are the plural API nouns; components are default exports  | §15, §16                                                                  | Phases 3, 7 |
| 11  | Never `db:pull` to update `schema.prisma`; one migration recipe, CONTRIBUTING's `migrate diff`                   | §14                                                                       | now         |

## What was already false, and is fixed

- **§2.4** cited `GET /proposals/:proposalId`, which has never existed. The
  example is now `POST /proposals/:proposalId/accept`.
- **§6** showed `ProposalStatus` as a hand-written union, the opposite of the
  rule it was illustrating.
- **§8** said a duration is an `Int` of days. A proposal's is a number of
  months (ADR 0007), and a job's is free text. The page says that now; the
  job column is left for Sprint 3.
- **§11** listed five nullable foreign keys. Three were made `NOT NULL` in
  Sprint 2; `listing.company_id` and `rating.proj_id` are left.
- **§14** said `db:pull` is safe. PR #156 committed a pulled schema by
  accident and lost every comment and an `onDelete: Restrict`.
- **§10** pointed at `PortfolioList.tsx`, which Phase 7 moves. It points at
  `formatDateOnly` in `lib/dates.ts` now.

## What did not change

No code, no schema, no migration, and the snapshot diff is empty, because this
phase is documents.

`docs/ai-brief.md` restates parts of `conventions.md` and still says the old
names. Phase 9 updates it, once the code it describes exists.
