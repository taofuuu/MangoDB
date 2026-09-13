# The refactor, and the rules while it runs

Fourteen people built this with different AI models, so the same idea exists in
three or four shapes. Sprint 2 adds 66 engineering tasks that will be written by
copying whatever is already in the tree. The point of this refactor is not to
tidy up — it is to leave **one version of each thing**, so the copy is the right
one.

Each phase gets a page in this folder. Read the page for the phase you are
working in before you start, and read the pages for phases you are _not_ working
in before you touch a file they own.

| #                                  | Phase                             | Owns                                                 | Status  |
| ---------------------------------- | --------------------------------- | ---------------------------------------------------- | ------- |
| [0](phase-0-safety-net.md)         | Safety net                        | `scripts/`, `snapshots/`, `apps/api/src/seed.ts`     | done    |
| [1](phase-1-vocabulary.md)         | Agree the vocabulary              | `docs/conventions.md`                                | done    |
| [2](phase-2-camelcase.md)          | Flip to camelCase                 | `prisma/schema.prisma`, `packages/shared`, both apps | done    |
| [3](phase-3-one-of-each-helper.md) | Backend: one of each helper       | `apps/api/src/lib`, `apps/api/src/auth`              | done    |
| 4                                  | Backend: apply the wire rules     | `apps/api/src/routes`, `controllers`, `schemas`      | next    |
| 5                                  | Publish the template              | `docs/adding-a-resource.md`, `apps/api/README.md`    | planned |
| 6                                  | Frontend: one way to call the API | `apps/mangodb/lib`                                   | planned |
| 7                                  | Frontend: one set of primitives   | `apps/mangodb/components/ui`                         | planned |
| 8                                  | Design tokens                     | `globals.css` and every colour literal               | planned |
| 9                                  | Docs                              | both READMEs, `CLAUDE.md`, `.env.example`            | planned |

The full plan, with the reasoning behind the order, is in the planning doc the
phases came from. These pages are the short version you actually work from.

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

## Rules for everybody, for as long as this runs

These exist to keep two people from refactoring the same file in two
directions.

1. **One phase at a time, one person per phase.** Say in the group chat which
   phase you have picked up before your first commit.
2. **Do not start a phase before the one above it has landed on `main`.** The
   order is the whole design; out of order means renaming twice.
3. **Check the "Owns" column before editing a file.** If a later phase owns it,
   leave it alone — even if you can see the problem. Write it down in that
   phase's page instead.
4. **Run the snapshot script before and after every phase**, and put the diff in
   your PR description. [Phase 0](phase-0-safety-net.md) explains how, and says
   which phases must produce an _empty_ diff.
5. **Phase 2 must not be half-done.** A partial case flip does not compile, and
   landing it on top of an in-flight Sprint 2 branch would be the worst merge in
   this project's history. Whoever takes it announces the date first, and
   everyone else merges or parks their branch that day.
6. **New Sprint 2 work follows the conventions, not the neighbours.** If the
   file next to yours contradicts [docs/conventions.md](../conventions.md), the
   doc wins and the file is somebody's phase.
7. **The whole refactor lives on `refactor/full-codebase`**, not on `main`.
   Commits are one concern each, conventional format, short message. `main`
   stays where Sprint 2 branches off from, until the refactor merges.
8. **Every phase ships its page in this folder** — the conventions it settled,
   so the next person does not have to re-derive them.

## When you disagree with a convention

Say so before the phase starts, not during. Once a phase has landed, its page is
the answer and re-litigating it costs more than the convention is worth. Open
the discussion for the _next_ phase instead.
