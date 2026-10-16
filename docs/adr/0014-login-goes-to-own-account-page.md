# 0014. After login, go to your own account page; no new landing page

**Date:** 2026-10-14

## Status

Accepted

## Context

After a successful login, the login form sends the user to `?next=` if it is
set, or else to `/`
([`components/auth/LoginForm.tsx`](../../apps/mangodb/components/auth/LoginForm.tsx)).

`/` ([`app/page.tsx`](../../apps/mangodb/app/page.tsx)) is not a real home
page. It is a temporary list of links so the pages built so far are easy to
reach. So after login, the user lands on a page that is not part of the
product.

The team could build a new landing page for logged-in users, but that is a
new page to design and build, on top of the pages the backlog already needs.

## Decision

**After login, the user goes to their own account page.** We do not build a
new landing page.

The `?next=` rule stays: if the user was sent to login from another page,
they still go back to that page after login. Only the default (no `?next=`)
changes.

**Alternative considered: build a new landing page.** Rejected: it adds a new
page to design and build, and the account page already exists and is useful
as a first page.

## Consequences

**Easier:** no new page to build. The user lands on a real page they own.

**Harder, on purpose:**

- **There is no dashboard or summary page.** The first page after login is
  only the account page.
- **The temporary `/` link list is still not the home page.** This ADR does
  not decide what `/` becomes.
- If the team wants a landing page later, write a new ADR that supersedes
  this one.
