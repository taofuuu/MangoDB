# 0007. Proposal duration is a number of months, in steps of 0.5

**Date:** 2026-09-30

## Status

Accepted

## Context

The proposal submit form needs a duration: how long the Provider says the
work will take. The team had to decide how a user enters it.

A free unit (days, weeks, months, years) makes proposals hard to compare. One
says "45 days", the next says "6 weeks", the next says "1.5 months", and the
Receiver has to convert them in their head. The job side already shows this
problem: `job_requirement.duration` is a free-text `VarChar(100)`, so any
text is accepted.

There is no duration on `proposal` yet. It needs a new column.

## Decision

A proposal's duration is **a number, and the unit is always months**. The
user cannot change the unit to days, weeks or years.

The number is a **multiple of 0.5**: half months and whole months are
allowed, and the smallest value is 0.5. No other fraction is allowed.

| Value                         | Allowed? |
| ----------------------------- | -------- |
| `0.5`, `1`, `1.5`, `2`, `2.5` | yes      |
| `0`                           | no       |
| `0.1`, `0.2`, `0.25`, `1.3`   | no       |

The Zod schema at the API boundary enforces this. The frontend shows the
unit as the fixed word "months" next to the number input.

**Alternative considered: a free unit (days / months / years).** Rejected,
because proposals must be easy to compare, and one fixed unit makes them
comparable without conversion.

## Consequences

**Easier:** proposals can be sorted and compared by duration directly.
Validation is one rule in one Zod schema.

**Harder, on purpose:**

- **Work shorter than two weeks cannot be expressed exactly.** The smallest
  value is 0.5 months, so a 3-day job is entered as 0.5.
- **A new column on `proposal` is needed.** It must be able to store 0.5, so
  it cannot be a plain `INTEGER` of months. How it is stored (a decimal, or
  a count of half-months) is a schema decision for whoever adds the column.
  The database will not enforce the "multiple of 0.5" rule by itself, so the
  Zod schema is the guard.
- **This rule is for proposals only.** `job_requirement.duration` stays free
  text. If jobs should follow the same rule, that is a separate decision.
