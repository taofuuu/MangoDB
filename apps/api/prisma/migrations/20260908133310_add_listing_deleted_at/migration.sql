-- AlterTable
-- Nullable and additive: existing listings remain active because their value
-- is NULL. The API sets this timestamp instead of deleting historical rows.
ALTER TABLE "listing" ADD COLUMN     "deleted_at" TIMESTAMPTZ(6);
