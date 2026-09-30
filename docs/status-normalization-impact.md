# Status normalization: what breaks, and what must change with it

**Status:** not decided. The migration was drafted and then taken out of the
branch so the team can discuss it first. The SQL is kept at the bottom of this
file.

## Why this is needed

`listing.listing_status`, `proposal.proposal_status` and `project.status` are
plain `VarChar(50)`. Nothing in the database stops a wrong value, so code
that compares against the wrong word gets **no error, just the wrong rows**.

`packages/shared/index.ts` already says which values are allowed
([`conventions.md` §6](conventions.md#6-status-vocabulary)):

```ts
ListingStatus = 'DRAFT' | 'OPEN' | 'CLOSED';
ProposalStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';
ProjectStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
```

The shared database does not match it. Values seen on 2026-09-30:

| Column                     | Live value        | Rows | Proposed new value |
| -------------------------- | ----------------- | ---: | ------------------ |
| `listing.listing_status`   | `OPEN`            |   23 | (no change)        |
|                            | `ACTIVE`          |   18 | `OPEN`             |
|                            | `CLOSED`          |    2 | (no change)        |
| `proposal.proposal_status` | `Pending`         |    5 | `PENDING`          |
|                            | `Accepted`        |    9 | `ACCEPTED`         |
|                            | `Accept` (typo)   |    3 | `ACCEPTED`         |
|                            | `Rejected`        |    4 | `REJECTED`         |
| `project.status`           | `Waiting Deposit` |    3 | `ACTIVE`           |
|                            | `In Progress`     |    2 | `ACTIVE`           |
|                            | `Delivered`       |    4 | `COMPLETED`        |

Counts include listing 1 and its proposal and project, which are being
deleted separately (see migration `20260930120200_delete_dual_type_listing`).

## Questions for the team

1. **`Waiting Deposit` → `ACTIVE` loses information.** After this, "waiting
   for the deposit" and "work in progress" are the same value. Is that OK,
   or should `ProjectStatus` get a new value (for example
   `WAITING_DEPOSIT`)? If a new value is added, it must be added to
   `packages/shared` first.
2. **Services say `ACTIVE`, jobs say `OPEN`.** Do we agree `OPEN` is the one
   word for both (as `packages/shared` already says)?
3. **Who changes which file**, so the code and the SQL go out in the same
   deploy?

## Files that break

"Breaks" means: works today, and gives wrong results if **only one side**
changes — the data without the code, or the code without the data. Every row
here must ship in the **same PR** as the migration.

### Backend — breaks for sure

| File                                                          | What it does now                                                                                  | What goes wrong                                                                                                                                                                                                                                                                                              | Change needed                                                                                                          |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `apps/api/src/lib/projectEligibility.ts:9`                    | `DELIVERED_STATUS = 'Delivered'`; a project is "ongoing" if its status is **not** `Delivered`.    | After the migration no row is `Delivered`. Every `COMPLETED` project counts as ongoing, so `hasOngoingProject` is `true` for any company that ever finished a project. Both deletes are then blocked: `company.controller.ts:266` (delete own account) and `admin-company.controller.ts:241` (admin delete). | Compare against `'COMPLETED'` (typed as `ProjectStatus`). Update the comment above it.                                 |
| `apps/api/src/lib/servicelisting.ts:4-12`                     | Own `LISTING_STATUS = { ACTIVE, CLOSED }`, own type also named `ListingStatus`, default `ACTIVE`. | The migration fixes old rows, but each new service is written as `ACTIVE` again, so the mismatch comes back. Any filter `listingStatus: 'OPEN'` (like `job-posting.controller.ts:109`, and the Epic 3 search in ADR 0001) returns **no services**. No error — they just disappear.                           | Delete the local constant and type. Use `ListingStatus` / `LISTING_STATUSES` from `@mangodb/shared`, default `'OPEN'`. |
| `apps/api/src/controllers/service-listing.controller.ts:5,49` | Imports `DEFAULT_LISTING_STATUS` from the file above.                                             | Follows from the row above.                                                                                                                                                                                                                                                                                  | Import from the new place / use `'OPEN'`.                                                                              |
| `apps/api/src/lib/servicelisting.ts:38,57,76`                 | `listingStatus: string` in the row and response types.                                            | Not a runtime bug, but the compiler cannot catch a wrong value.                                                                                                                                                                                                                                              | Type as `ListingStatus` from shared, like `lib/jobPosting.ts:61` does.                                                 |

### Backend — work in progress (stash on `feat/accept-proposal`)

The accept-proposal code already uses the new values, so it **needs** this
migration. Without it:

| Where                                | What goes wrong without the migration                                                                                        |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `proposalStatus !== "PENDING"` check | All 5 live `Pending` proposals fail with 409 "Proposal is not pending". No proposal can be accepted.                         |
| `listingStatus != "OPEN"` check      | Every service (`ACTIVE`) fails with 409 "listing is already closed".                                                         |
| `listingStatus : " CLOSED"`          | **Separate bug, even with the migration:** leading space. Writes `' CLOSED'`, which matches no status. Should be `'CLOSED'`. |

### Tests and snapshots

| File                       | What changes                                                                                                                                                                     |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `snapshots/*.json`         | Any snapshot that returns a service will show `"listingStatus": "OPEN"` instead of `"ACTIVE"`. Expected diff — re-run `scripts/snapshot-api.sh` and check the diff is only this. |
| `apps/api/src/seed.ts:138` | Already writes `'OPEN'`. No change.                                                                                                                                              |

### Not affected (checked)

- `apps/api/src/lib/jobPosting.ts`, `controllers/job-posting.controller.ts`,
  `schemas/job-posting.schema.ts` — already use `OPEN` / `LISTING_STATUSES`
  from shared.
- `apps/api/prisma/migrations/20260930004000_uppercase_listing_status` — only
  changed casing; already applied.
- Frontend (`apps/mangodb`) — no code reads these columns yet.
  `components/viewprofile/ProjectTimeline.tsx:40,48` shows `'In Progress'`,
  but it is hardcoded mock data, not from the API. When it is wired up, it
  must map `ACTIVE` → a label; the column will not hold `In Progress`.
- `packages/shared/index.ts` — already has the target values. No change.

## The dropped migration

To bring it back: create
`apps/api/prisma/migrations/<new timestamp>_normalize_status_values/migration.sql`
with this content, in the same PR as the code changes above.

```sql
-- ACTIVE is the default lib/servicelisting.ts writes for a new service. It
-- means the same as OPEN, which is what jobs and packages/shared use.
UPDATE "listing"
SET "listing_status" = 'OPEN'
WHERE "listing_status" = 'ACTIVE';

-- "Accept" is a typo of "Accepted" in older rows.
UPDATE "proposal"
SET "proposal_status" = CASE "proposal_status"
    WHEN 'Pending'  THEN 'PENDING'
    WHEN 'Accepted' THEN 'ACCEPTED'
    WHEN 'Accept'   THEN 'ACCEPTED'
    WHEN 'Rejected' THEN 'REJECTED'
END
WHERE "proposal_status" IN ('Pending', 'Accepted', 'Accept', 'Rejected');

-- ProjectStatus has no "waiting for deposit" state, so Waiting Deposit
-- becomes ACTIVE with In Progress (see question 1 above).
UPDATE "project"
SET "status" = CASE "status"
    WHEN 'Waiting Deposit' THEN 'ACTIVE'
    WHEN 'In Progress'     THEN 'ACTIVE'
    WHEN 'Delivered'       THEN 'COMPLETED'
END
WHERE "status" IN ('Waiting Deposit', 'In Progress', 'Delivered');
```

The mapping was checked read-only against the live database on 2026-09-30:
every row lands on a value in `packages/shared`.
