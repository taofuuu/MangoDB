# 0011. Search page: gray scrollbar, brand-blue Next button

**Date:** 2026-10-07

## Status

Accepted

## Context

The team discussed how the search page should look. The result list scrolls
inside its own box, and the page has a pagination footer with Previous and
Next buttons ([`components/ui/Pagination.tsx`](../../apps/mangodb/components/ui/Pagination.tsx)).

Before this, the search page had no design of its own for these two parts.
The admin "view company" page in Figma already has a design for a scrolling
list with a Next button. Without a decision, each page could pick its own
colours, and the app would look different from page to page.

What the code had at the time:

- Scrollbar: `--color-scrollbar: #afafaf` in `app/globals.css`, used by every
  native scrollbar in the app.
- Next button: `variant="outline"` with a gray `border-pagination-border`,
  the same as Previous.

## Decision

**The search page follows the admin "view company" design in Figma:**

| Part      | Colour            | Token in `globals.css` |
| --------- | ----------------- | ---------------------- |
| Scrollbar | gray              | `--color-scrollbar`    |
| Next      | main blue, filled | `--color-brand`        |

"Main blue" means the app's brand colour, `--color-brand` (`#497b93`). A new
blue is not added.

**Alternative considered: keep the Next button as a gray outline**, like
Previous. Rejected: Next is the main action in the footer, and a gray button
does not stand out. The admin design already makes it blue.

**Alternative considered: a blue scrollbar.** Rejected: the scrollbar is not
an action, so it should not draw the eye. Gray also matches every other
scrollbar in the app.

## Consequences

**Easier:** the search page and the admin page look like one app. Both
colours already exist as tokens, so no new colour is added.

**Harder, on purpose:**

- **The change reaches more than the search page.** `Pagination` is shared by
  the service search, the job postings page, `job/view-all` and `companies`.
  A blue Next button there makes it blue on all four pages. This is what
  keeps the app consistent, but those pages must be checked after the
  change.
- **Previous and Next no longer look the same.** Previous stays a gray
  outline, so the two buttons have different styles on purpose.
- **The scrollbar needs no code change** — it is already gray. This ADR
  records that it should stay gray, so nobody changes it to match the blue.
