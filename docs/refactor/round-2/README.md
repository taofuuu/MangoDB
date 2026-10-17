# Round 2 — one version of each thing, before Sprint 3

Sprint 1's refactor left one version of each thing so that Sprint 2 would copy
the right one. Sprint 2 then added about 14k lines, and the copies came back:
six copies of the pagination math, two parallel service and job stacks over
one `listing` table, seven ways a page checks who is signed in, five modals
that skip `ModalShell`. Sprint 3 (20 Oct – 9 Nov) builds projects, quotations
and reviews by copying what is in the tree, so this round has the same goal as
the first: **leave one version to copy**.

The method is Sprint 1's, from [the first round's README](../README.md): the
same ten phases, in the same order, because names flow one way:

```
DB column → backend DTO → shared type → frontend lib → component prop → UI text
```

| #                                   | Phase                           | Owns                                                | Status  |
| ----------------------------------- | ------------------------------- | --------------------------------------------------- | ------- |
| [0](phase-0-safety-net.md)          | Safety net                      | `scripts/`, `snapshots/`, `seed.ts`, tests, tooling | done    |
| [1](phase-1-vocabulary.md)          | Vocabulary                      | `docs/conventions.md`, ADRs 0020–0021               | done    |
| [2](phase-2-names-at-the-source.md) | Names at the source             | `schema.prisma`, `packages/shared`, the wire        | done    |
| [3](phase-3-one-of-each-helper.md)  | Backend: one of each helper     | `apps/api/src/lib`                                  | done    |
| [4](phase-4-wire-rules.md)          | Backend: wire rules             | `routes`, `controllers`, `schemas`                  | done    |
| [5](phase-5-template.md)            | Template                        | `docs/adding-a-resource.md`, `apps/api/README.md`   | done    |
| 6                                   | Frontend: one way to call it    | `apps/mangodb/lib`, `app/` routes and guards        | next    |
| 7                                   | Frontend: one set of primitives | `components/`                                       | pending |
| 8                                   | Design tokens                   | `globals.css` and every colour literal              | pending |
| 9                                   | Docs                            | `ai-brief.md`, READMEs, `CONTRIBUTING.md`           | pending |

## How it runs

The same rules as the first round, with one difference: everything is on one
branch, `refactor/round-2`, and lands as one pull request.

1. No phase starts before the one above it has landed on the branch.
2. A problem seen inside another phase's files goes on that phase's page, not
   fixed in passing.
3. Each phase ships its page here: what it merged, the real bugs it found, the
   rules it leaves behind, and what it left.
4. The snapshot diff is the acceptance test. Each phase says what diff it
   expects, and an unexpected line stops the phase.
5. **Freeze.** From Phase 2 on, `packages/shared` and `apps/api` are frozen
   until the pull request merges, and `apps/mangodb` is frozen from Phase 6.
   Merge or park your branch before then, or it will conflict with the
   renames.
