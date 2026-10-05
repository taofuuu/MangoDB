-- Add missing columns to proposal table per conventions.md §8 and US2-8
ALTER TABLE "proposal" ADD COLUMN IF NOT EXISTS "duration" DECIMAL(4, 1);
ALTER TABLE "proposal" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill legacy proposal durations from terms or default 1.0 month
UPDATE "proposal" SET "duration" = 2.5 WHERE "proposal_id" = 1;
UPDATE "proposal" SET "duration" = 2.0 WHERE "proposal_id" = 2;
UPDATE "proposal" SET "duration" = 0.5 WHERE "proposal_id" IN (5, 9);
UPDATE "proposal" SET "duration" = 3.0 WHERE "proposal_id" IN (11, 14);
UPDATE "proposal" SET "duration" = 1.0 WHERE "duration" IS NULL;

-- Enforce NOT NULL on duration, listing_id, and sender_id
ALTER TABLE "proposal" ALTER COLUMN "duration" SET NOT NULL;
ALTER TABLE "proposal" ALTER COLUMN "listing_id" SET NOT NULL;
ALTER TABLE "proposal" ALTER COLUMN "sender_id" SET NOT NULL;

-- Normalize legacy proposal statuses to uppercase SCREAMING_SNAKE_CASE (conventions.md §6)
UPDATE "proposal" SET "proposal_status" = 'ACCEPTED' WHERE "proposal_status" IN ('Accept', 'Accepted');
UPDATE "proposal" SET "proposal_status" = 'REJECTED' WHERE "proposal_status" IN ('Reject', 'Rejected');
UPDATE "proposal" SET "proposal_status" = 'PENDING' WHERE "proposal_status" IN ('Pending');

-- Enforce one proposal per provider per job posting
CREATE UNIQUE INDEX IF NOT EXISTS "proposal_listing_id_sender_id_key" ON "proposal"("listing_id", "sender_id");
