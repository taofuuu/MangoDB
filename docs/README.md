# Docs

## MangoDB API Guide

|           |                                                                       |
| --------- | --------------------------------------------------------------------- |
| Source    | `docs/api-guide.html`                                                 |
| Published | https://claude.ai/code/artifact/d30f680f-78d2-42f3-88bc-a21b695de8b6  |
| Covers    | Ch.1 auth spine. Ch.2–05 planned, see the Coverage table in the page. |

A living explainer for the backend, written for people who have not built an API before.
One chapter per subsystem, added as the sprint lands them.

**The source of truth is the file in this repo, not the published page.** Edit the HTML here,
commit it, then republish. Anyone who edits the published page directly will lose their changes
on the next republish.

### Adding a chapter

1. Open `docs/api-guide.html` and find the `ADDING A CHAPTER` comment block near the bottom.
2. Copy the template out of the comment, paste it above the `<footer>`, fill it in.
3. Update the **Coverage** table near the top of the file — flip the row from
   `not written` to `documented` and link it to your new chapter id.
4. Update the `last updated` date in the masthead.
5. Republish (below).

The left rail builds itself from the markup at page load, so there is no navigation list to keep
in sync. Two rules make that work:

- every `section` element needs a unique `id` and a short `data-nav` label
- every chapter opens with a `div.chapter-head` that has an `id`

### Republishing

The page keeps the same URL as long as you pass that URL when publishing. In Claude Code:

```
republish docs/api-guide.html to https://claude.ai/code/artifact/d30f680f-78d2-42f3-88bc-a21b695de8b6
```

Publishing _without_ the URL creates a second, separate artifact — the team keeps the old link and
never sees your changes. If you lose the URL, `/artifacts` in Claude Code lists everything you own.

### House style

Written for a teammate who has not seen the subsystem before, so:

- explain **why**, not just what — the reasoning is the part that is hard to recover from code
- always include a **"what does not exist yet"** section, so nobody assumes a feature is done
- show verified behavior as a table of real request/response cases, not claims
- reach for a diagram only when it shows a mechanism prose cannot — the file has two examples

Reusable pieces already styled: `pre`/`code` blocks, `.callout` (add `.danger` for warnings),
`.status` chips (`.s-ok` / `.s-warn` / `.s-deny`), `.table-wrap` for scrollable tables,
`.breakout` + `figure` for wide diagrams, `.anatomy` for labelled string breakdowns.
Colors come from CSS custom properties at the top of the file and work in light and dark themes —
use the tokens, never a raw hex value.

### Commits

Docs changes use the `docs` type from [CONTRIBUTING.md](../CONTRIBUTING.md):

```
docs(guide): add chapter 2 on company profiles
```
