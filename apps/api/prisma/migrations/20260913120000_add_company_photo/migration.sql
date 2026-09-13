-- AlterTable
-- Nullable with no default: every company that exists has no photo yet, and
-- the column only ever holds a public URL into the `profile` storage bucket.
ALTER TABLE "company" ADD COLUMN "company_photo" VARCHAR(255);
