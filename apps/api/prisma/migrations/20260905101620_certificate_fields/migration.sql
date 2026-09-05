-- AlterTable
ALTER TABLE "certificate" DROP CONSTRAINT "certificate_pkey",
DROP COLUMN "cert_desc",
DROP COLUMN "cert_id",
ADD COLUMN     "certificate_id" SERIAL NOT NULL,
ADD COLUMN     "credential_id" VARCHAR(255) NOT NULL DEFAULT '',
ADD COLUMN     "credential_url" VARCHAR(255) NOT NULL DEFAULT '',
ADD COLUMN     "expire_month" INTEGER,
ADD COLUMN     "expire_year" INTEGER,
ADD COLUMN     "issue_month" INTEGER,
ADD COLUMN     "issue_year" INTEGER,
ADD COLUMN     "organization" VARCHAR(255) NOT NULL DEFAULT '',
ADD CONSTRAINT "certificate_pkey" PRIMARY KEY ("certificate_id");

-- The defaults above exist only to satisfy NOT NULL on the 8 rows that
-- predate these columns (they had no organization/credential data before
-- this migration). Dropping the default here, not in schema.prisma, means
-- those rows keep their backfilled '' but every future insert must supply a
-- real value or fail — a default in the Prisma schema would silently let the
-- app omit them instead.
ALTER TABLE "certificate" ALTER COLUMN "credential_id" DROP DEFAULT;
ALTER TABLE "certificate" ALTER COLUMN "credential_url" DROP DEFAULT;
ALTER TABLE "certificate" ALTER COLUMN "organization" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "certificate_provider_id_idx" ON "certificate"("provider_id");
