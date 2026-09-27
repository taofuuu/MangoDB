# Architecture Decision Records

A record of the decisions that were hard to reverse or easy to re-litigate,
written down once so the next person does not have to reconstruct the
argument from a Slack thread or a PR comment.

## When to write one

Not every choice needs an ADR. Write one when the decision:

- **Is expensive to reverse** — a wire format, a schema convention, a shared
  workflow like the database process in [`CONTRIBUTING.md`](../../CONTRIBUTING.md).
- **Was genuinely contested** — two reasonable people could have picked
  differently, and someone will ask "why not the other way" later.
- **Constrains future code** — anyone adding a resource, a column, or an
  endpoint needs to know the rule before they start, not after review.

A bug fix, a naming nitpick, or a decision with one obvious answer does not
need one. [`docs/conventions.md`](../conventions.md) is still where day-to-day
naming and shape rules live — an ADR is for the _why_ behind a rule like that,
not a restatement of it.

## Format

One file per decision, using [`template.md`](template.md). Keep it short: a
decision nobody can find because it is buried in prose is worse than no
record at all.

- **Filename:** `NNNN-kebab-case-title.md`, numbered sequentially — `0001-`,
  `0002-`, and so on. Numbers are never reused, even for a superseded or
  rejected decision. `0000` is reserved for the worked example below and
  isn't part of this sequence.
- **Status** is one of:

    | Status            | Means                                                                                                                                                                                |
    | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
    | `WIP`             | The ADR itself is still being drafted. Not ready for anyone else to weigh in yet.                                                                                                    |
    | `Open to Discuss` | Drafted and posted for input. The decision is not made — this is the record of the debate.                                                                                           |
    | `Waiting`         | Direction is settled but blocked on something outside this decision — a spike, a dependency, another team — before it can be marked `Accepted`. Say what it's waiting on in Context. |
    | `Accepted`        | Decided. The codebase should match it.                                                                                                                                               |
    | `Rejected`        | Considered and turned down. Kept so it doesn't get re-proposed.                                                                                                                      |
    | `Superseded`      | Replaced by a later ADR — link it both ways.                                                                                                                                         |

    That's the usual path — `WIP` → `Open to Discuss` → maybe `Waiting` →
    `Accepted` or `Rejected`, and possibly `Superseded` much later — but skip
    stages that don't apply. A decision nobody contested can go straight from
    `WIP` to `Accepted`.

- **An ADR is not edited to match new code.** If a decision changes, write a
  new ADR with `Superseded` status and link back to the one it replaces. The
  old one stays as the record of what was true, and why, at the time.

## Index

| #                                     | Title                                                                    | Status   |
| ------------------------------------- | ------------------------------------------------------------------------ | -------- |
| [0000](0000-camelcase-wire-format.md) | _(example)_ camelCase above the database, snake_case stops at the column | Accepted |
