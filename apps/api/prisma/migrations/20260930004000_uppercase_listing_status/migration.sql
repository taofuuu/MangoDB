-- Normalize legacy mixed-case listing_status to SCREAMING_SNAKE_CASE (docs/conventions.md §6)
UPDATE "listing"
SET "listing_status" = UPPER("listing_status")
WHERE "listing_status" <> UPPER("listing_status");
