-- AlterTable
ALTER TABLE "service_portfolio" DROP CONSTRAINT "service_portfolio_pkey",
ADD COLUMN     "portfolio_id" SERIAL NOT NULL,
ADD CONSTRAINT "service_portfolio_pkey" PRIMARY KEY ("portfolio_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_portfolio_listing_id_portfolio_link_key" ON "service_portfolio"("listing_id", "portfolio_link");

