-- Listing 1 ("Need Firmware Team for Robotic Arm", company 100) has both a
-- service row and a job_requirement row, so it is a service and a job at the
-- same time. It is the only such row, and it is bad seed data, not a real
-- listing.
--
-- Deleting the listing cascades to service, service_portfolio,
-- job_requirement, listing_category and proposal. It does NOT cascade through
-- project: project.proposal_id is ON DELETE RESTRICT, and proposal 4 on this
-- listing has project 9. So the project is deleted first (its
-- project_contract row cascades with it).
--
-- Both statements only fire while listing 1 is still dual-type, so a
-- listing 1 that someone has already fixed by hand is left alone.

DELETE FROM "project"
WHERE "proposal_id" IN (SELECT "proposal_id" FROM "proposal" WHERE "listing_id" = 1)
  AND EXISTS (SELECT 1 FROM "service" WHERE "listing_id" = 1)
  AND EXISTS (SELECT 1 FROM "job_requirement" WHERE "listing_id" = 1);

DELETE FROM "listing"
WHERE "listing_id" = 1
  AND EXISTS (SELECT 1 FROM "service" WHERE "listing_id" = 1)
  AND EXISTS (SELECT 1 FROM "job_requirement" WHERE "listing_id" = 1);
