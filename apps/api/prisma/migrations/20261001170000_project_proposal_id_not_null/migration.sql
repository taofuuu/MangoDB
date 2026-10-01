-- A project exists only because a proposal was accepted, so proposal_id is
-- required in reality (docs/conventions.md section 11). Checked 2026-10-01:
-- 0 project rows have a null proposal_id.
ALTER TABLE "project" ALTER COLUMN "proposal_id" SET NOT NULL;
