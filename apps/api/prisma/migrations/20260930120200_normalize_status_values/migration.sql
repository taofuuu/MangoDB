-- Bring every status column down to the closed sets in packages/shared
-- (docs/conventions.md §6). Values seen on the shared database on 2026-09-30:
--
--   listing.listing_status   OPEN, ACTIVE, CLOSED
--   proposal.proposal_status Pending, Accepted, Accept, Rejected
--   project.status           Waiting Deposit, In Progress, Delivered
--
-- Every value is mapped explicitly rather than with UPPER(), because several
-- old values are not just a casing difference.

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
-- becomes ACTIVE with In Progress. Both are "not finished", which is how
-- lib/projectEligibility.ts already treats them. This loses the difference
-- between the two, on purpose.
UPDATE "project"
SET "status" = CASE "status"
    WHEN 'Waiting Deposit' THEN 'ACTIVE'
    WHEN 'In Progress'     THEN 'ACTIVE'
    WHEN 'Delivered'       THEN 'COMPLETED'
END
WHERE "status" IN ('Waiting Deposit', 'In Progress', 'Delivered');
