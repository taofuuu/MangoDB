-- #264. Deleting a service deletes its proposals. A rejection notice now
-- outlives its proposal: proposal_id goes null instead of the notice being
-- deleted, and the listing's title and type are copied onto it first.

-- DropForeignKey
ALTER TABLE "notification" DROP CONSTRAINT "notification_proposal_id_fkey";

-- AlterTable
ALTER TABLE "notification" ADD COLUMN     "listing_title" VARCHAR(255),
ADD COLUMN     "listing_type" VARCHAR(20),
ALTER COLUMN "proposal_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposal"("proposal_id") ON DELETE SET NULL ON UPDATE NO ACTION;
