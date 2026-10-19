# Phase 5 — Template

**Status: done.** Two documents. No code changed and the snapshot diff is
empty.

## What was wrong

| Was                                                                                                                                                              | Now                                                                                    |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `adding-a-resource.md`'s example used `createServiceSchema`, `serviceSelect`, `toService`, `assertServiceOwned` — real names, with shapes that no longer matched | a made-up `bookmark`, whose names collide with nothing; every helper it calls exists   |
| It wrote ids, paging and blank handling by hand                                                                                                                  | `int4Id`, `pageQueryFields`, `optionalQueryId`, `blankToNull`                          |
| It knew none of the Phase 3 helpers                                                                                                                              | a table of them: `assertListingOwned`, `orNotFound`, `saveWithUpload`, `splitWords`, … |
| No tests step; `snap services-mine`, which did not exist then                                                                                                    | a unit-test step, real snapshot names, the id and "today" rules                        |
| `apps/api/README.md`: 524 lines, most of it an endpoint catalogue                                                                                                | 118 lines: run it, check it, the database, storage, auth, roles                        |
| The README said to run `prisma migrate dev`                                                                                                                      | `migrate diff`, as CONTRIBUTING says; never `migrate dev`, never `db:pull`             |

## Why a made-up resource

The old example used the real service names, so a reader could not tell the
example from the code. When the code changed, the example quietly became a
second, older version of it, which is what this refactor exists to remove. A
`bookmark` will never be confused with a real file. For a real resource built
the same way, the page points at the job files.

## Why the catalogue went

`apps/api/CLAUDE.md` already said it: there is no endpoint catalogue to
update, `src/routes/` is the list. The README's per-endpoint sections were
that catalogue, written once and then left behind by every change since,
including Phase 4's. What a route does is in the comment beside it; what the
rules are is in `conventions.md`. The README keeps only what neither says: how
to run things, the shared database, the buckets, how a request is
authenticated, and what an account type is.

## Rules this phase leaves behind

1. **An example in a doc never uses a real resource's names.** It becomes a
   second version of that resource the day the resource changes.
2. **A doc names only helpers that exist.** Every one in
   `adding-a-resource.md` was checked against the code when this phase
   landed; do the same when you edit it.
3. **One rulebook.** A README says how to run a thing and links to
   `conventions.md` for how to write it.

## What is left

- **A frontend half of the template.** The page guard and the request
  helpers are settled in Phase 6; the frontend steps get written then, in
  Phase 9, so they describe code that exists.
- The first round's [phase-5 page](../phase-5-template.md) still shows
  `migrate dev --create-only`. It is history; Phase 9 adds a pointer here.
