-- AlterTable
-- Nullable with no default: companies registered before the ToS existed never
-- accepted it, and backfilling a timestamp would record a consent that never
-- happened. The register endpoint sets it from T1.13.5 onward.
ALTER TABLE "company" ADD COLUMN "tos_accepted_at" TIMESTAMPTZ(6);
