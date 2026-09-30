-- ADR 0003. A service has a "starting from" price, a job has an "up to"
-- budget, so neither budget column can be required on the shared listing
-- table. min_budget is already nullable. Which budget a listing needs is
-- checked by its Zod schema.
--
-- Must ship with `maxBudget Int?` in schema.prisma, or Prisma types a
-- nullable column as number.
ALTER TABLE "listing" ALTER COLUMN "max_budget" DROP NOT NULL;
