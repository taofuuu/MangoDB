-- AlterTable
-- Nullable with no default: null means the credentials never changed, so no
-- token issued so far is turned away. PATCH /companies/me/credentials sets it.
ALTER TABLE "company" ADD COLUMN "credentials_changed_at" TIMESTAMPTZ(6);
