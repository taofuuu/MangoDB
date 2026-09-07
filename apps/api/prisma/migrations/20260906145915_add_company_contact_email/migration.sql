-- AlterTable
-- Nullable with no default, matching the column that already exists in the
-- shared database. This migration is marked applied rather than run there;
-- it runs normally against any database that does not have the column yet.
ALTER TABLE "company" ADD COLUMN "contact_email" VARCHAR(100);
