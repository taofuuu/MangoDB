# Phase 0 — Safety net

**Status: done.** The snapshot baseline is current again, the calls Sprint 2
added without a snapshot have one, and the code Phase 3 is about to merge has
unit tests.

How to run the snapshots has not changed: [the first round's Phase 0
page](../phase-0-safety-net.md) still explains it. This page says what was
wrong with them and what changed.

## What was wrong

| Was                                                                                         | Now                                                   |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 3 snapshots the script wrote but nobody recorded                                            | recorded                                              |
| Baseline from 14 Oct, before the 429 limit and three API fixes                              | re-recorded on `main`, as the first commit of round 2 |
| No snapshot of `GET /categories`, a successful accept, unfiltered `/services/mine` or a 429 | all four                                              |
| The wrong-password probe spent one of the provider's 10 failed sign-ins per run             | an email of the run's own                             |
| Accept, close and the upload rollback had no unit test                                      | 10 tests                                              |
| `npm run verify` skipped the unit tests, which only CI ran                                  | `verify` runs them, and CI runs `verify`              |
| `seed.ts` read `process.env` itself and said it deletes nothing                             | reads `env.ts`; the header says what it deletes       |
| `npm run build` compiled the tests into `dist/`                                             | `tsconfig.build.json` leaves them out                 |

## The baseline commit

`test(snapshots): re-record the baseline on main` is the snapshot of `main`
before round 2 changed anything. **Every later phase diffs against it.** Most
of what it changed is shared-database data that moved since 14 Oct. The one
API change in it is `listingDesc`, which service search results now carry.

**It is stable.** The next run, with the new calls added, left all 189 of its
files unchanged and only added the 8 new ones. So an empty diff in a later
phase means something.

## The accept snapshot

`proposals-accept` is the first snapshot of a successful accept. Two things
about it are not obvious:

- **The project starts today**, a date-only value, and the helper leaves
  `YYYY-MM-DD` alone on purpose. So this one snapshot names today as
  `<today>`. A run-wide rule would also catch any other date that happens to
  be today.
- **Accepting creates a project**, and `project.proposal_id` is `ON DELETE
RESTRICT`. The cleanup deletes that project before the posting, or deleting
  the posting fails.

## The unit tests

| File                                         | What it proves                                                                           |
| -------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `controllers/proposal.controller.test.ts`    | accept creates the project, closes the job, rejects the others; a refusal writes nothing |
| `controllers/job-posting.controller.test.ts` | close rejects only that job's pending proposals; 403 and 409 write nothing               |
| `controllers/portfolio.controller.test.ts`   | a failed save removes the image it uploaded                                              |

Phase 3 merges all three into shared helpers (the accept steps, the close, and
one upload helper for five copies). These tests are how that merge proves it
changed nothing a snapshot cannot see.

## Rules this phase leaves behind

1. **Never commit while the snapshot script runs.** lint-staged stashes and
   restores working files, and a snapshot file being written at that moment
   fails the run.
2. **A run should not spend a real account's failed sign-ins.** Use an email
   of the run's own. The one exception is the admin-at-the-company-door probe,
   which needs the real admin; a full run takes about four minutes, so it cannot
   reach 10 in 15.
3. **A row a snapshot call creates is removed again**, in the order the foreign
   keys need.

## What is left

- **Somebody has put `[demo] … (dummy data)` rows on the `snapshot_` accounts**
  in the shared database: two certificates and several services and jobs. The
  baseline records them. They are stable as long as nobody edits them, but
  the first round's rule was that those accounts are the script's own. Ask
  before adding more.
- `GET /portfolios` with no filter returns every portfolio in the database, so
  `portfolios-list` changes whenever anybody adds one. Phase 4 asks whether it
  should require a filter.
