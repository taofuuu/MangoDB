-- Issue #212. project_update now holds every project event, and only PROGRESS
-- and WORK_REJECTED have text. Events like QUOTATION_ACCEPTED have none.
--
-- Must ship with `updateText String?` in schema.prisma, or Prisma types a
-- nullable column as string.
ALTER TABLE "project_update" ALTER COLUMN "update_text" DROP NOT NULL;
