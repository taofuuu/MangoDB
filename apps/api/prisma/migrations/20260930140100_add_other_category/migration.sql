-- ADR 0002. Categories are a fixed list; work outside the pre-set list links
-- to "Other". cat_name is unique, so this is safe to run on a database that
-- already has the row.
INSERT INTO "category" ("cat_name")
VALUES ('Other')
ON CONFLICT ("cat_name") DO NOTHING;
