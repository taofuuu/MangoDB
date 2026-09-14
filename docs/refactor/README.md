# The refactor, and the rules it left behind

Nine people built this with different AI models, so the same idea existed in
three or four shapes. Sprint 2 adds 66 engineering tasks that will be written by
copying whatever is already in the tree. The point of the refactor was not to
tidy up — it was to leave **one version of each thing**, so the copy is the
right one.

Each phase has a page in this folder. They are reference now rather than
instructions: a page says what its phase settled and what it deliberately left,
so read the one that owns a file before you change how that file works.

| #                                       | Phase                             | Owns                                                 | Status |
| --------------------------------------- | --------------------------------- | ---------------------------------------------------- | ------ |
| [0](phase-0-safety-net.md)              | Safety net                        | `scripts/`, `snapshots/`, `apps/api/src/seed.ts`     | done   |
| [1](phase-1-vocabulary.md)              | Agree the vocabulary              | `docs/conventions.md`                                | done   |
| [2](phase-2-camelcase.md)               | Flip to camelCase                 | `prisma/schema.prisma`, `packages/shared`, both apps | done   |
| [3](phase-3-one-of-each-helper.md)      | Backend: one of each helper       | `apps/api/src/lib`, `apps/api/src/auth`              | done   |
| [4](phase-4-wire-rules.md)              | Backend: apply the wire rules     | `apps/api/src/routes`, `controllers`, `schemas`      | done   |
| [5](phase-5-template.md)                | Publish the template              | `docs/adding-a-resource.md`, `apps/api/README.md`    | done   |
| [6](phase-6-one-way-to-call-the-api.md) | Frontend: one way to call the API | `apps/mangodb/lib`                                   | done   |
| [7](phase-7-primitives.md)              | Frontend: one set of primitives   | `apps/mangodb/components/ui`                         | partly |
| [8](phase-8-design-tokens.md)           | Design tokens                     | `globals.css` and every colour literal               | partly |
| [9](phase-9-docs.md)                    | Docs                              | both READMEs, `CLAUDE.md`, `.env.example`            | done   |

The full plan, with the reasoning behind the order, is in the planning doc the
phases came from. These pages are the short version you actually work from.

**All ten phases have landed on `main`**, as one commit — `refactor: leave one
version of each thing` (#82). Two are marked _partly_: Phase 7 merged the
primitives and fixed the bugs in them but did not convert the 62 raw `<button>`
and 27 raw `<input>` elements, and Phase 8 named all 51 colours but did not
merge the duplicates, which is a design decision. Each page says exactly what it
left.

## The one rule that sets the order

Names flow one direction:

```
DB column → backend DTO → shared type → frontend lib → component prop → UI text
```

Each phase only renames things nothing downstream has been built on yet. Work
with that arrow and nothing gets renamed twice. Work against it — prettify
components before their data shape is settled, sweep colours before the
components merge — and you pay for it twice.

Second rule: **structure before cosmetics.** A colour sweep touches 491 places.
Do it while anything structural is still moving and you redo it.

## Rules that outlived the refactor

These two are about new work, not about the refactor, so they still apply.

1. **Run the snapshot script before and after anything that touches the API**,
   and put the diff in your PR description.
   [Phase 0](phase-0-safety-net.md) explains how, and says which kinds of change
   must produce an _empty_ diff.
2. **New work follows the conventions, not the neighbours.** If the file next to
   yours contradicts [docs/conventions.md](../conventions.md), the doc wins.
   Phases 7 and 8 each left a list of places that have not caught up yet — those
   pages say which, so a file disagreeing with the doc is a known gap rather
   than a second convention.

## How it ran

Kept for the record, and in case a phase is ever reopened to finish what it
left.

1. One phase at a time, one person per phase, announced in the group chat
   before the first commit.
2. No phase started before the one above it had landed. The order is the whole
   design; out of order means renaming twice.
3. The "Owns" column decided who touched a file. A problem visible inside
   someone else's phase got written down on that phase's page instead of fixed
   in passing.
4. Phase 2 was never half-done — a partial case flip does not compile, so the
   date was announced up front and everybody merged or parked their branch that
   day.
5. The work happened on `refactor/full-codebase` and merged to `main` in one
   commit. That branch is behind `main` now; it is kept only as history.
6. Every phase shipped its page in this folder — the conventions it settled, so
   the next person does not have to re-derive them.

## When you disagree with a convention

Once a phase has landed, its page is the answer, and re-litigating it costs more
than the convention is worth. If a convention is genuinely wrong, say so and
change the page — deliberately, and in one place. Writing one file that
disagrees with it is how this codebase got four versions of everything the first
time.
