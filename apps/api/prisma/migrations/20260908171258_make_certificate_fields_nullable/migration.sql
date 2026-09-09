-- AlterTable
ALTER TABLE "certificate" ALTER COLUMN "cert_image" DROP NOT NULL,
ALTER COLUMN "credential_id" DROP NOT NULL,
ALTER COLUMN "credential_url" DROP NOT NULL;
