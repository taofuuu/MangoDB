-- Supabase's Data API can read and write any public table that has RLS off,
-- using only the project's publishable key. RLS on with no policies shuts that
-- door for every role but the owner. The API connects as postgres, which owns
-- these tables and has BYPASSRLS, so it is unaffected.
--
-- A new table needs the same line in its own migration.

ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "certificate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "company" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "company_type" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "job_requirement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "listing" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "listing_category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "project" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "project_contract" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "project_update" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "proposal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "provider" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "quotation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "receiver" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "review" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "revoked_token" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "service" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "service_portfolio" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "service_tech_stack" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tech_stack" ENABLE ROW LEVEL SECURITY;
