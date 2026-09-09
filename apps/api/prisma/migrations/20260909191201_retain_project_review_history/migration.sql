-- Retain project and review history when an account is deleted (US: account deletion).
--
-- Three things happen here:
--   1. company.deleted_at            soft delete, so an account is never removed
--   2. project.provider_id/receiver_id  the two parties, stored instead of derived
--   3. rating stops cascading         a project delete can no longer erase reviews
--
-- Written with `prisma migrate diff`, then extended by hand with the backfill
-- and the CHECK constraint, neither of which Prisma can generate.

-- DropForeignKey
ALTER TABLE "rating" DROP CONSTRAINT "rating_proj_id_fkey";

-- AlterTable
ALTER TABLE "company" ADD COLUMN     "deleted_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "project" ADD COLUMN     "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "provider_id" INTEGER,
ADD COLUMN     "receiver_id" INTEGER,
ADD COLUMN     "reviewed_at" TIMESTAMPTZ(6);

-- ---------------------------------------------------------------------------
-- Backfill. Hand-written: `migrate diff` compares shapes, not data.
-- Runs before the foreign keys below, so the keys validate what we wrote.
-- ---------------------------------------------------------------------------

-- created_at was never recorded, so start_date is the closest thing to the
-- truth. It is a plan rather than a fact, but it keeps the ordering sensible;
-- the alternative is stamping all rows with the migration time.
UPDATE "project" SET "created_at" = "start_date";

-- The fork. A listing is either a job request (a buyer asking for work) or a
-- service ad (a seller offering it), and the two put the parties on opposite
-- sides. Which one it is shows only in whether a job_requirement or a service
-- row exists, so both are checked explicitly rather than assumed.

-- Job request: the listing owner is the buyer, the proposal sender is the seller.
UPDATE "project" p
SET "receiver_id" = l."company_id",
    "provider_id" = pr."sender_id"
FROM "proposal" pr
JOIN "listing" l ON l."listing_id" = pr."listing_id"
WHERE p."proposal_id" = pr."proposal_id"
  AND EXISTS     (SELECT 1 FROM "job_requirement" j WHERE j."listing_id" = l."listing_id")
  AND NOT EXISTS (SELECT 1 FROM "service"         s WHERE s."listing_id" = l."listing_id");

-- Service ad: the other way round.
UPDATE "project" p
SET "provider_id" = l."company_id",
    "receiver_id" = pr."sender_id"
FROM "proposal" pr
JOIN "listing" l ON l."listing_id" = pr."listing_id"
WHERE p."proposal_id" = pr."proposal_id"
  AND EXISTS     (SELECT 1 FROM "service"         s WHERE s."listing_id" = l."listing_id")
  AND NOT EXISTS (SELECT 1 FROM "job_requirement" j WHERE j."listing_id" = l."listing_id");

-- A listing carrying both subtype rows, or neither, is left null on purpose:
-- there is no correct answer to guess at. Today that is listing 1, which is
-- dummy data. The columns stay nullable until such rows are cleaned up, at
-- which point a follow-up migration can set NOT NULL.

-- ---------------------------------------------------------------------------

-- AlterTable
ALTER TABLE "rating" ALTER COLUMN "proj_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "company_deleted_at_idx" ON "company"("deleted_at");

-- CreateIndex
CREATE INDEX "project_provider_id_idx" ON "project"("provider_id");

-- CreateIndex
CREATE INDEX "project_receiver_id_idx" ON "project"("receiver_id");

-- CreateIndex
-- proj_id leads this index, so it also answers "all ratings for project X".
-- A separate index on proj_id alone would be redundant.
CREATE UNIQUE INDEX "rating_proj_id_rating_title_key" ON "rating"("proj_id", "rating_title");

-- AddForeignKey
ALTER TABLE "project" ADD CONSTRAINT "project_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "company"("company_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "project" ADD CONSTRAINT "project_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "company"("company_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rating" ADD CONSTRAINT "rating_proj_id_fkey" FOREIGN KEY ("proj_id") REFERENCES "project"("proj_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- ---------------------------------------------------------------------------
-- Hand-written: Prisma cannot express CHECK constraints, so this lives only
-- here and will not appear in schema.prisma. DECIMAL(2,1) limits the shape,
-- not the range - it accepts anything from -9.9 to 9.9.
-- ---------------------------------------------------------------------------
ALTER TABLE "rating" ADD CONSTRAINT "rating_score_range"
  CHECK ("rating_score" >= 0 AND "rating_score" <= 5);
