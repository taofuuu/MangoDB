-- Soft delete for company accounts.
--
-- Deleting an account must not take its history with it. Rather than removing
-- the row - which would cascade into listings and proposals, and orphan the
-- projects and reviews built on them - the account is marked deleted and left
-- in place.
--
-- deleted_at is nullable on purpose: NULL is the normal state, and a timestamp
-- records when the account went away, which a boolean could not.
--
-- The index exists because every company-facing query will filter on this.
--
-- The rule this creates, which lives in application code rather than here:
-- discovery queries (company search, browse, find a provider) must exclude
-- rows where deleted_at IS NOT NULL; history queries (past projects, reviews)
-- must NOT, or they would hide exactly the history this column exists to keep.

-- AlterTable
ALTER TABLE "company" ADD COLUMN     "deleted_at" TIMESTAMPTZ(6);

-- CreateIndex
CREATE INDEX "company_deleted_at_idx" ON "company"("deleted_at");
