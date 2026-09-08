-- 20260907221346_portfolio_fields derived portfolio_name from portfolio_link
-- with regexp_replace(portfolio_link, '^.*/', ''). ^.*/ is greedy, so a link
-- ending in "/" matched through the final slash, leaving portfolio_name = ''.
-- NOT NULL allowed it; the app's own .min(1) check does not. That migration
-- already ran against the shared database, so this is a new migration rather
-- than an edit to it.
UPDATE "service_portfolio"
SET "portfolio_name" = "portfolio_link"
WHERE "portfolio_name" = '';
