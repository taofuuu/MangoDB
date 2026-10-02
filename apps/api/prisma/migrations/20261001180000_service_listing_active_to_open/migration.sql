-- Legacy service listings were stored as 'ACTIVE', which is not a ListingStatus
-- (DRAFT | OPEN | CLOSED, docs/conventions.md §6). New services are created as
-- 'OPEN', so these rows are the only ones left. Accepting a proposal requires
-- 'OPEN', so until this runs those listings answer 409.
UPDATE "listing"
SET "listing_status" = 'OPEN'
WHERE "listing_status" = 'ACTIVE';
