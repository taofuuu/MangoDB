-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "category" (
    "cat_id" SERIAL NOT NULL,
    "cat_name" VARCHAR(100) NOT NULL,

    CONSTRAINT "category_pkey" PRIMARY KEY ("cat_id")
);

-- CreateTable
CREATE TABLE "certificate" (
    "cert_id" INTEGER NOT NULL DEFAULT 1,
    "provider_id" INTEGER NOT NULL,
    "cert_title" VARCHAR(255) NOT NULL,
    "cert_desc" TEXT,
    "cert_image" VARCHAR(255) NOT NULL,

    CONSTRAINT "certificate_pkey" PRIMARY KEY ("cert_id","provider_id")
);

-- CreateTable
CREATE TABLE "company" (
    "company_id" SERIAL NOT NULL,
    "company_name" VARCHAR(255) NOT NULL,
    "company_description" TEXT,
    "username" VARCHAR(50) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "address" TEXT,
    "website" VARCHAR(255),
    "account_type" VARCHAR(100) NOT NULL,

    CONSTRAINT "company_pkey" PRIMARY KEY ("company_id")
);

-- CreateTable
CREATE TABLE "company_type" (
    "company_id" INTEGER NOT NULL,
    "company_type" VARCHAR(100) NOT NULL,

    CONSTRAINT "company_type_pkey" PRIMARY KEY ("company_id","company_type")
);

-- CreateTable
CREATE TABLE "job_requirement" (
    "listing_id" INTEGER NOT NULL,
    "location_pref" VARCHAR(100),
    "duration" VARCHAR(100),
    "deadline" DATE,

    CONSTRAINT "job_requirement_pkey" PRIMARY KEY ("listing_id")
);

-- CreateTable
CREATE TABLE "listing" (
    "listing_id" SERIAL NOT NULL,
    "company_id" INTEGER,
    "listing_title" VARCHAR(255) NOT NULL,
    "listing_desc" TEXT NOT NULL,
    "min_budget" INTEGER,
    "max_budget" INTEGER NOT NULL,
    "listing_status" VARCHAR(50) NOT NULL,

    CONSTRAINT "listing_pkey" PRIMARY KEY ("listing_id")
);

-- CreateTable
CREATE TABLE "listing_category" (
    "listing_id" INTEGER NOT NULL,
    "cat_id" INTEGER NOT NULL,

    CONSTRAINT "listing_category_pkey" PRIMARY KEY ("listing_id","cat_id")
);

-- CreateTable
CREATE TABLE "project" (
    "proj_id" SERIAL NOT NULL,
    "proposal_id" INTEGER,
    "total_budget" DECIMAL(12,2) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "comment" TEXT,
    "status" VARCHAR(50) NOT NULL,

    CONSTRAINT "project_pkey" PRIMARY KEY ("proj_id")
);

-- CreateTable
CREATE TABLE "project_contract" (
    "proj_id" INTEGER NOT NULL,
    "document_link" VARCHAR(255) NOT NULL,

    CONSTRAINT "project_contract_pkey" PRIMARY KEY ("proj_id","document_link")
);

-- CreateTable
CREATE TABLE "proposal" (
    "proposal_id" SERIAL NOT NULL,
    "listing_id" INTEGER,
    "sender_id" INTEGER,
    "proposal_budget" DECIMAL(12,2) NOT NULL,
    "proposal_terms" TEXT NOT NULL,
    "proposal_status" VARCHAR(50) NOT NULL,

    CONSTRAINT "proposal_pkey" PRIMARY KEY ("proposal_id")
);

-- CreateTable
CREATE TABLE "provider" (
    "company_id" INTEGER NOT NULL,
    "warranty_policy" TEXT,
    "service_term" TEXT,

    CONSTRAINT "provider_pkey" PRIMARY KEY ("company_id")
);

-- CreateTable
CREATE TABLE "provider_tech_stack" (
    "company_id" INTEGER NOT NULL,
    "tech_stack_name" VARCHAR(100) NOT NULL,

    CONSTRAINT "provider_tech_stack_pkey" PRIMARY KEY ("company_id","tech_stack_name")
);

-- CreateTable
CREATE TABLE "rating" (
    "rating_id" SERIAL NOT NULL,
    "rating_title" VARCHAR(100) NOT NULL,
    "rating_score" DECIMAL(2,1) NOT NULL,
    "proj_id" INTEGER,

    CONSTRAINT "rating_pkey" PRIMARY KEY ("rating_id")
);

-- CreateTable
CREATE TABLE "receiver" (
    "company_id" INTEGER NOT NULL,

    CONSTRAINT "receiver_pkey" PRIMARY KEY ("company_id")
);

-- CreateTable
CREATE TABLE "service" (
    "listing_id" INTEGER NOT NULL,

    CONSTRAINT "service_pkey" PRIMARY KEY ("listing_id")
);

-- CreateTable
CREATE TABLE "service_portfolio" (
    "listing_id" INTEGER NOT NULL,
    "portfolio_link" VARCHAR(255) NOT NULL,

    CONSTRAINT "service_portfolio_pkey" PRIMARY KEY ("listing_id","portfolio_link")
);

-- CreateTable
CREATE TABLE "revoked_token" (
    "jti" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "revoked_token_pkey" PRIMARY KEY ("jti")
);

-- CreateIndex
CREATE UNIQUE INDEX "category_cat_name_key" ON "category"("cat_name");

-- CreateIndex
CREATE UNIQUE INDEX "company_username_key" ON "company"("username");

-- CreateIndex
CREATE UNIQUE INDEX "company_email_key" ON "company"("email");

-- CreateIndex
CREATE UNIQUE INDEX "project_proposal_id_key" ON "project"("proposal_id");

-- CreateIndex
CREATE INDEX "revoked_token_expires_at_idx" ON "revoked_token"("expires_at");

-- AddForeignKey
ALTER TABLE "certificate" ADD CONSTRAINT "certificate_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "provider"("company_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "company_type" ADD CONSTRAINT "company_type_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("company_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "job_requirement" ADD CONSTRAINT "job_requirement_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listing"("listing_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "listing" ADD CONSTRAINT "listing_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("company_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "listing_category" ADD CONSTRAINT "listing_category_cat_id_fkey" FOREIGN KEY ("cat_id") REFERENCES "category"("cat_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "listing_category" ADD CONSTRAINT "listing_category_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listing"("listing_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "project" ADD CONSTRAINT "project_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposal"("proposal_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "project_contract" ADD CONSTRAINT "project_contract_proj_id_fkey" FOREIGN KEY ("proj_id") REFERENCES "project"("proj_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "proposal" ADD CONSTRAINT "proposal_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listing"("listing_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "proposal" ADD CONSTRAINT "proposal_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "company"("company_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "provider" ADD CONSTRAINT "provider_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("company_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "provider_tech_stack" ADD CONSTRAINT "provider_tech_stack_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "provider"("company_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rating" ADD CONSTRAINT "rating_proj_id_fkey" FOREIGN KEY ("proj_id") REFERENCES "project"("proj_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "receiver" ADD CONSTRAINT "receiver_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("company_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "service" ADD CONSTRAINT "service_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listing"("listing_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "service_portfolio" ADD CONSTRAINT "service_portfolio_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "service"("listing_id") ON DELETE CASCADE ON UPDATE NO ACTION;

