-- ADR 0009. Tech stack moves from the Provider to each service, linked like
-- listing_category: a tech_stack list, and a join table to service.
--
-- DROPS provider_tech_stack and its rows. They were mock data no endpoint ever
-- wrote, and a company-wide stack cannot say which service uses which tech.
-- Agreed by the team before this was applied.

-- DropForeignKey
ALTER TABLE "provider_tech_stack" DROP CONSTRAINT "provider_tech_stack_company_id_fkey";

-- DropTable
DROP TABLE "provider_tech_stack";

-- CreateTable
CREATE TABLE "service_tech_stack" (
    "listing_id" INTEGER NOT NULL,
    "tech_stack_id" INTEGER NOT NULL,

    CONSTRAINT "service_tech_stack_pkey" PRIMARY KEY ("listing_id","tech_stack_id")
);

-- CreateTable
CREATE TABLE "tech_stack" (
    "tech_stack_id" SERIAL NOT NULL,
    "tech_stack_name" VARCHAR(100) NOT NULL,

    CONSTRAINT "tech_stack_pkey" PRIMARY KEY ("tech_stack_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tech_stack_tech_stack_name_key" ON "tech_stack"("tech_stack_name");

-- AddForeignKey
ALTER TABLE "service_tech_stack" ADD CONSTRAINT "service_tech_stack_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "service"("listing_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "service_tech_stack" ADD CONSTRAINT "service_tech_stack_tech_stack_id_fkey" FOREIGN KEY ("tech_stack_id") REFERENCES "tech_stack"("tech_stack_id") ON DELETE CASCADE ON UPDATE NO ACTION;
