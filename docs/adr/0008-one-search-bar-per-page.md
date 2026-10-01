# 0008. No search bar in the navbar; one search bar per page, one thing per bar

**Date:** 2026-09-30

## Status

Accepted

## Context

The design had a search bar in the navbar, on every page. Nobody had decided
what it searches. The platform has three things a user may look for:
companies, services and jobs (see [0005](0005-service-and-job-naming.md)).

One navbar search bar would have to do one of two things:

- **Search everything at once.** One input calls several endpoints and mixes
  companies, services and jobs in one result list. That is hard to build, and
  hard to read.
- **Search one thing only.** Then the user cannot tell which one from a
  search bar that looks the same on every page.

Both are bad for the user. Each search bar in this app searches one kind of
thing, so it should sit on the page for that thing.

## Decision

**The navbar has no search bar.** Search lives on the pages:

| Page                | Search bar searches | Result shape                                                                                |
| ------------------- | ------------------- | ------------------------------------------------------------------------------------------- |
| Landing / main page | **companies** only  | company cards; big, central search bar in the JobsDB style                                  |
| Service page        | **services** only   | one card per service, with the owner company ([0001](0001-listing-first-search-results.md)) |
| Job page            | **jobs** only       | one card per job, with the owner company ([0001](0001-listing-first-search-results.md))     |

Each search bar calls **one** endpoint.

This does not replace [0001](0001-listing-first-search-results.md). 0001
decides what a service or job result looks like; this ADR decides where each
search bar is, and what it searches.

**Alternative considered: one navbar search bar for everything.** Rejected:
mixing several endpoints behind one input is hard to build, and one bar that
searches one thing at a time confuses the user when it sits in the navbar on
every page.

## Consequences

**Easier:** one search bar, one endpoint, one result shape. Each page owns
its own search, so the three can be built by different people at the same
time.

**Harder, on purpose:**

- **No "search from anywhere".** A user on a profile page must go to the
  landing, service or job page to search. This is the cost of clear search
  bars.
- **The landing page needs a company search endpoint.** `GET /providers` is
  the closest today, but it only returns Provider companies. Whether the
  landing page also finds Receiver companies is still open.
- **The navbar design must change** to remove the search bar.
