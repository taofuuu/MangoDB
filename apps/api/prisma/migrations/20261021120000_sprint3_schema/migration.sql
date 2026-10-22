-- Sprint 3 schema (task F.6), the only migration this sprint. ADRs 0015-0018.
--
-- Two DROPs, both decided by an ADR:
-- - The old unique(listing_id, sender_id) index. It is created again below
--   with WHERE proposal_status = 'PENDING' (ADR 0016), so a company can send a
--   new proposal once its earlier one is decided. No rows are lost.
-- - The rating table and its 8 mock rows. review replaces it (ADR 0018), and
--   getRating reads review from the same PR.

-- DropForeignKey
ALTER TABLE "rating" DROP CONSTRAINT "rating_proj_id_fkey";

-- DropIndex
DROP INDEX "proposal_listing_id_sender_id_key";

-- AlterTable
ALTER TABLE "project" ADD COLUMN     "completed_at" TIMESTAMPTZ(6),
ADD COLUMN     "deposit_confirmed_at" TIMESTAMPTZ(6),
ADD COLUMN     "deposit_reported_at" TIMESTAMPTZ(6);

-- DropTable
DROP TABLE "rating";

-- CreateTable
CREATE TABLE "quotation" (
    "quotation_id" SERIAL NOT NULL,
    "proj_id" INTEGER NOT NULL,
    "quotation_file" VARCHAR(255) NOT NULL,
    "quotation_status" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quotation_pkey" PRIMARY KEY ("quotation_id")
);

-- CreateTable
CREATE TABLE "project_update" (
    "project_update_id" SERIAL NOT NULL,
    "proj_id" INTEGER NOT NULL,
    "update_type" VARCHAR(50) NOT NULL,
    "update_text" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_update_pkey" PRIMARY KEY ("project_update_id")
);

-- CreateTable
CREATE TABLE "review" (
    "review_id" SERIAL NOT NULL,
    "proj_id" INTEGER NOT NULL,
    "work_quality_score" INTEGER NOT NULL,
    "service_score" INTEGER NOT NULL,
    "value_for_money_score" INTEGER NOT NULL,
    "delivery_time_score" INTEGER NOT NULL,
    "comment" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_pkey" PRIMARY KEY ("review_id")
);

-- CreateIndex
CREATE INDEX "quotation_proj_id_idx" ON "quotation"("proj_id");

-- CreateIndex
CREATE UNIQUE INDEX "quotation_proj_id_key" ON "quotation"("proj_id") WHERE (quotation_status = 'PENDING');

-- CreateIndex
CREATE INDEX "project_update_proj_id_idx" ON "project_update"("proj_id");

-- CreateIndex
CREATE UNIQUE INDEX "review_proj_id_key" ON "review"("proj_id");

-- CreateIndex
CREATE UNIQUE INDEX "proposal_listing_id_sender_id_key" ON "proposal"("listing_id", "sender_id") WHERE (proposal_status = 'PENDING');

-- AddForeignKey
ALTER TABLE "quotation" ADD CONSTRAINT "quotation_proj_id_fkey" FOREIGN KEY ("proj_id") REFERENCES "project"("proj_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "project_update" ADD CONSTRAINT "project_update_proj_id_fkey" FOREIGN KEY ("proj_id") REFERENCES "project"("proj_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_proj_id_fkey" FOREIGN KEY ("proj_id") REFERENCES "project"("proj_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- ADR 0015. ACTIVE is gone. Those projects have no quotation yet, so they
-- wait for one. COMPLETED and CANCELLED keep their names.
UPDATE "project" SET "status" = 'AWAITING_QUOTATION' WHERE "status" = 'ACTIVE';

-- Older COMPLETED rows only have a date. Checked 2026-10-21: all 4 have one.
UPDATE "project" SET "completed_at" = "end_date" WHERE "status" = 'COMPLETED' AND "completed_at" IS NULL;
