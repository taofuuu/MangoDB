/*
 * Unit tests for env.ts, the one place that reads process.env.
 *
 * Covers: a required variable that is missing stops the import with its name;
 * an optional one falls back to its default; the lazy storage and admin
 * credentials are checked only when asked for; PORT and NODE_ENV defaults.
 *
 * How: env.ts runs its checks while it is imported, so each test changes
 * process.env and loads a fresh copy with jest.isolateModules.
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';

const saved = { ...process.env };

function loadEnv(): typeof import('../../src/env') {
    let mod: typeof import('../../src/env') | undefined;
    jest.isolateModules(() => {
        mod =
            jest.requireActual<typeof import('../../src/env')>('../../src/env');
    });
    return mod!;
}

afterEach(() => {
    process.env = { ...saved };
});

describe('env', () => {
    it('a missing JWT_SECRET stops the import and names it', () => {
        delete process.env.JWT_SECRET;

        expect(loadEnv).toThrow('JWT_SECRET is not set');
    });

    it('unset optional values fall back to their defaults', () => {
        delete process.env.PORT;
        delete process.env.NODE_ENV;
        delete process.env.SESSION_TTL_SECONDS;
        delete process.env.SEED_PASSWORD;

        const env = loadEnv();

        expect(env.PORT).toBe(4000);
        expect(env.NODE_ENV).toBe('development');
        expect(env.IS_PRODUCTION).toBe(false);
        expect(env.SESSION_TTL_SECONDS).toBe(3600);
        expect(env.SEED_PASSWORD).toBe('snapshot-dev-password');
    });

    it('set values win over the defaults', () => {
        process.env.PORT = '5050';
        process.env.NODE_ENV = 'production';
        process.env.SESSION_TTL_SECONDS = '60';
        process.env.FRONTEND_URL = 'https://mango.test';

        const env = loadEnv();

        expect(env.PORT).toBe(5050);
        expect(env.IS_PRODUCTION).toBe(true);
        expect(env.SESSION_TTL_SECONDS).toBe(60);
        expect(env.FRONTEND_URL).toBe('https://mango.test');
    });

    it('storage and admin credentials are read when asked for', () => {
        const env = loadEnv();

        expect(env.supabaseCredentials()).toEqual({
            url: 'https://jest.supabase.test',
            key: 'jest-key',
        });
        expect(env.adminCredentials()).toEqual({
            email: 'admin@jest.test',
            password: 'jest-admin-password',
        });
    });

    it('missing storage keys fail only at first use', () => {
        delete process.env.SUPABASE_URL;

        const env = loadEnv();

        expect(() => env.supabaseCredentials()).toThrow(
            'SUPABASE_URL is not set',
        );
    });
});
