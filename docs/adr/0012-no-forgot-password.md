# 0012. No forgot-password feature

**Date:** 2026-10-14

## Status

Accepted

## Context

The login form has a "Forgot Password ?" link
([`components/auth/LoginForm.tsx`](../../apps/mangodb/components/auth/LoginForm.tsx)),
but it points to `/forgot-password`, and that page does not exist. There is
no API for it either.

A real forgot-password flow is not small. It needs a reset token that
expires, a way to send that token to the user (email), a page to enter a new
password, and rules so the token can be used only once. The team has more
work than time in this sprint, so the team had to choose what to build.

## Decision

**We do not build forgot password.** The feature is cut from the project.

The "Forgot Password ?" link on the login form should be removed, so it does
not lead to a page that does not exist.

**Alternative considered: build the full flow.** Rejected: it needs email
sending and a token table, which is a lot of new work for a feature that is
not core to the platform.

**Alternative considered: keep the link and show "coming soon".** Rejected:
it promises a feature we do not plan to build.

## Consequences

**Easier:** less work this sprint. No email service and no reset-token table
to build or test.

**Harder, on purpose:**

- **A user who forgets their password cannot get back in by themselves.**
  They must ask someone with database access (or an admin) to reset it.
- **The login form must change.** The dead link is removed.
- If the team wants this later, it is new work from zero — write a new ADR
  that supersedes this one.
