/*
 * Runs before every Jest file: no test reaches the shared Supabase database or
 * Supabase Storage, and no test reads a local .env. lib/prisma becomes the
 * fake in helpers/prisma-mock, and createClient hands back the fake in
 * helpers/storage-mock. Both start clean for each test.
 */
import { beforeEach, jest } from '@jest/globals';
import { resetDb } from '../helpers/prisma-mock';
import { resetStorage } from '../helpers/storage-mock';

jest.mock('../../src/lib/prisma', () => ({
    prisma: jest.requireActual<typeof import('../helpers/prisma-mock')>(
        '../helpers/prisma-mock',
    ).db,
}));

// The developer's own .env must not leak into a test: only setup/env.ts counts.
jest.mock('dotenv', () => ({ config: jest.fn() }));

jest.mock('@supabase/supabase-js', () => ({
    createClient: jest.fn(
        () =>
            jest.requireActual<typeof import('../helpers/storage-mock')>(
                '../helpers/storage-mock',
            ).supabaseClient,
    ),
}));

beforeEach(() => {
    resetDb();
    resetStorage();
});
