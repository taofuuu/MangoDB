/*
 * Environment for every Jest file. env.ts reads these while it is imported,
 * so they are set before any source file loads. The database URL is never
 * dialled: lib/prisma is replaced in prisma.ts next to this file.
 */
process.env.JWT_SECRET = 'jest-secret';
process.env.DATABASE_URL = 'postgresql://jest:jest@localhost:5432/jest';
process.env.SUPABASE_URL = 'https://jest.supabase.test';
process.env.SUPABASE_SECRET_KEY = 'jest-key';
process.env.ADMIN_EMAIL = 'admin@jest.test';
process.env.ADMIN_PASSWORD = 'jest-admin-password';
