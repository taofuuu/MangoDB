-- AlterTable
ALTER TABLE "listing" ADD COLUMN     "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "listing_type" VARCHAR(20);

-- Backfill existing service listings and job requirements
UPDATE "listing" SET "listing_type" = 'SERVICE' WHERE "listing_id" IN (SELECT "listing_id" FROM "service");
UPDATE "listing" SET "listing_type" = 'JOB' WHERE "listing_type" IS NULL;

-- Enforce NOT NULL without default
ALTER TABLE "listing" ALTER COLUMN "listing_type" SET NOT NULL;


