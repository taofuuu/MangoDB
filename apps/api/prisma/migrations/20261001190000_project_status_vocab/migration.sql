-- Normalize legacy project statuses to the ProjectStatus vocabulary
-- (ACTIVE | COMPLETED | CANCELLED, docs/conventions.md §6).
-- Ships with lib/projectEligibility.ts, which now treats only ACTIVE as ongoing.
UPDATE "project" SET "status" = 'COMPLETED' WHERE "status" = 'Delivered';
UPDATE "project" SET "status" = 'ACTIVE' WHERE "status" IN ('In Progress', 'Waiting Deposit');
