-- AlterTable
ALTER TABLE "service_portfolio" ADD COLUMN     "development_date" DATE NOT NULL,
ADD COLUMN     "portfolio_description" TEXT,
ADD COLUMN     "portfolio_image" VARCHAR(255) NOT NULL,
ADD COLUMN     "portfolio_name" VARCHAR(255) NOT NULL;
