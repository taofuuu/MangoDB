-- AlterTable
-- Columns start nullable so the 8 existing rows can be backfilled below
-- before NOT NULL is enforced. schema.prisma carries no @default for any of
-- them, so once this migration finishes, every future insert must supply
-- its own value — these placeholders exist only to satisfy the constraint
-- for rows that predate the columns.
ALTER TABLE "service_portfolio" ADD COLUMN     "development_date" DATE;
ALTER TABLE "service_portfolio" ADD COLUMN     "portfolio_description" TEXT;
ALTER TABLE "service_portfolio" ADD COLUMN     "portfolio_image" VARCHAR(255);
ALTER TABLE "service_portfolio" ADD COLUMN     "portfolio_name" VARCHAR(255);

-- Backfill: service_portfolio held 8 seed/demo rows (fake companies —
-- codecrafters, appsynth, techconsult, nextgenai, cloudscale, datamind,
-- globaltech) with no name/date/image to draw a real value from. Decision
-- (2026-09-07): derive a name from the existing link, use a fixed date and a
-- clearly-labeled placeholder image. Real values go in later through the app.
UPDATE "service_portfolio"
SET
    "portfolio_name" = regexp_replace("portfolio_link", '^.*/', ''),
    "development_date" = DATE '2024-01-01',
    "portfolio_image" = 'https://placeholder.example.com/no-image.png'
WHERE "portfolio_name" IS NULL;

-- Now that every row has a value, enforce the same NOT NULL schema.prisma
-- declares for new rows going forward.
ALTER TABLE "service_portfolio" ALTER COLUMN "development_date" SET NOT NULL;
ALTER TABLE "service_portfolio" ALTER COLUMN "portfolio_image" SET NOT NULL;
ALTER TABLE "service_portfolio" ALTER COLUMN "portfolio_name" SET NOT NULL;
