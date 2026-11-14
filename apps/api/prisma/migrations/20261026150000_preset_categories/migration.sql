-- ADR 0002's eight pre-set categories. They came from the original seed data,
-- not a migration, so a database built from migrations alone had only "Other".
-- cat_name is unique, so this does nothing on a database that has them.
INSERT INTO "category" ("cat_name")
VALUES
    ('Web Development'),
    ('Mobile App Development'),
    ('Hardware & IoT'),
    ('IT Consulting & Security'),
    ('Artificial Intelligence (AI)'),
    ('UI/UX Design'),
    ('ERP & CRM Systems'),
    ('Digital Marketing & SEO')
ON CONFLICT ("cat_name") DO NOTHING;
