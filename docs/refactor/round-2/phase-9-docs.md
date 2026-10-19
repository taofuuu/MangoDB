# Phase 9 — Docs and hygiene

**Status: done.** Documents and three config lines; no code changed, so the
snapshot diff Phase 8 left empty still applies.

## What changed

| Was                                                                                                         | Now                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ai-brief.md` knew `JobPosting`, no `tooManyRequests`, no tests, and "a service has no price"               | job/service and sender/recipient, the page routes, the API and web helpers, the new `ui/` pieces, colour by role, tests in verify; a service's price is its budget range |
| `adding-a-resource.md` stopped at the API                                                                   | steps 9–12 follow the made-up bookmark into `lib/`, the page, the components and the browser                                                                             |
| `conventions.md` §16 named no web helpers                                                                   | it points at `lib/dates`, `money`, `pagination`, `validation/` and the hooks                                                                                             |
| `apps/mangodb/README.md` was the create-next-app text with notes in the middle                              | how to run and check the app, the proxy and the cookie, where things are                                                                                                 |
| `apps/mangodb/.env.example` existed but `.env*` in the app's gitignore hid it                               | committed, with a `!.env.example` exception                                                                                                                              |
| `CONTRIBUTING.md`: `feature/` and `bugfix/` branches, no `test` type, a code of conduct that does not exist | `feat/` and `fix/`, the `test` type and the scopes, a Before You Push section, never `db:pull`, no AI attribution                                                        |
| `image.png` at the root, used by one line of CONTRIBUTING                                                   | `docs/images/github-suggestion-button.png`                                                                                                                               |
| `.gitignore` ignored every `AGENTS.md`                                                                      | `/AGENTS.md` only, like `/CLAUDE.md`; the `next dev` copy in the app goes in `.prettierignore` instead                                                                   |
| `.prettierignore` named a deleted `docs/api-guide.html`; `package.json` had `main: server.js`               | both gone                                                                                                                                                                |
| `docs/refactor/README.md` ended at Sprint 1                                                                 | a round-2 table; Sprint 1's Phase 0 page points at round 2, and its Phase 5 page no longer says `migrate dev --create-only`                                              |

## Branches you can delete

Nothing was deleted. GitHub already removed the merged branches, so the only
remote-tracking ref left is `pr/131`, a local copy of merged #131
(`git update-ref -d refs/remotes/pr/131`).

**46 local branches are fully in `main`** (merged, or squash-merged with no
later commits):

```
claude/frosty-lumiere-0e104b  docs/adr-300926-db-changes  docs/ai-brief
feat/US2-13-edit-jobPosting  feat/my-proposals-page  feat/navbar-profile-menu
feat/submit-proposal-button  feature/B23-job-posting-edit-close
feature/Bind-company-data-to-the-view-profile-page  feature/US3-1-service-search
feature/US3-2-service-filters  feature/US3-4-job-posting-followups
feature/US3-6-company-search  feature/admin-company-search-filter
feature/create-viewpage-cert  feature/delete-account-by-admin-frontend
feature/delete-action-button  feature/edit-company-account
feature/edit-profile-form  feature/front-US2-10-view-proposal
feature/login-frontend  feature/profile-details-hookup
feature/profile-view-frontend  fix/admin-search-wildcards  fix/audit-quick-wins
fixed/front-end-view-restyle  pr-109  pr-130  pr-134  pr-135  pr-137  pr-138
pr-142  pr-149  pr-154  pr-41  pr-58  pr-68  pr-75  pr-81  pr70  pr73
refactor/budget-formatter  refactor/naming-consistency  refactor/snapshot-names
validate-register
```

`claude/frosty-lumiere-0e104b` is checked out in `.claude/worktrees/`, so
remove that worktree first (`git worktree remove .claude/worktrees/frosty-lumiere-0e104b`).

**11 need a look before anyone deletes them:**

| Branch                                                                       | Why                                                                      |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `fix/search-by-role`                                                         | your commit from today, not in `main` and with no PR — keep              |
| `refactor/full-codebase`                                                     | Sprint 1's refactor; #82 squashed its 63 commits, so this is the history |
| `feat/company-profile-details-links`, `feature/US3-2-provider-filters`       | closed without merging (#143, #90)                                       |
| `backup/job-followups-v1`, `backup/job-followups-v2`, `backup/pr80-original` | backups someone made on purpose                                          |
| `feature/admin-edit-company-account`, `test/sprint2-done-snapshots`          | no PR; may hold unmerged work                                            |

## Rules this phase leaves behind

1. **`docs/ai-brief.md` and `docs/conventions.md` change together.** The brief
   restates the rules for a chat that cannot open files; a rule added to one
   and not the other is how the four-versions problem started.
2. **A doc names only what exists.** Every helper, route and component named
   in the brief and the template was checked against the code in this phase.

## What is left

- The Phase 7 sweep of raw `<button>` and `<input>` elements, the `/jobs`
  filters, and the missing Edit link for your own services are recorded on
  the Phase 7 page.
- The `surface` against `surface-white` question is on the Phase 8 page.
