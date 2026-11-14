/*
 * Unit tests for src/auth: tokens (jwt.ts), passwords (password.ts), roles
 * (roles.ts) and the logout denylist (tokenDenylist.ts).
 *
 * Covers every reason a token is refused (each missing or wrong claim, a
 * string payload, another algorithm), every password path (empty input, a
 * missing row, a deleted account, a wrong and a right password), the role
 * table's unknown-value guard, and a revoked token before and after it
 * expires.
 *
 * How: real jsonwebtoken and bcrypt; the database is the Prisma fake.
 */
import { describe, expect, it, jest } from '@jest/globals';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { AccountType } from '@mangodb/shared';
import { signAccessToken, verifyAccessToken } from '../../src/auth/jwt';
import {
    assertCurrentPassword,
    dummyPasswordHash,
    fitsBcryptLimit,
    hashPassword,
    verifyCredentials,
    verifyPassword,
} from '../../src/auth/password';
import {
    accountTypeToRole,
    ownsProviderRow,
    ownsReceiverRow,
    roleGrants,
} from '../../src/auth/roles';
import { isTokenRevoked, revokeToken } from '../../src/auth/tokenDenylist';
import { db } from '../helpers/prisma-mock';
import { companyRow } from '../helpers/rows';

const SECRET = 'jest-secret';
const now = () => Math.floor(Date.now() / 1000);

function claims(overrides: Record<string, unknown>): string {
    return jwt.sign(
        { sub: '1', role: 'provider', jti: 'j', ...overrides },
        SECRET,
    );
}

describe('jwt', () => {
    it('a signed token verifies back to its claims', () => {
        const token = signAccessToken({ sub: '7', role: 'both' });

        const verified = verifyAccessToken(token);

        expect(verified.sub).toBe('7');
        expect(verified.role).toBe('both');
        expect(typeof verified.jti).toBe('string');
        expect(verified.exp).toBeGreaterThan(verified.iat);
    });

    it.each([
        ['a string payload', jwt.sign('plain', SECRET)],
        ['a numeric sub', claims({ sub: 1 })],
        ['an unknown role', claims({ role: 'root' })],
        ['no jti', jwt.sign({ sub: '1', role: 'admin' }, SECRET)],
        ['no exp', jwt.sign({ sub: '1', role: 'admin', jti: 'j' }, SECRET)],
        [
            'no iat',
            jwt.sign({ sub: '1', role: 'admin', jti: 'j' }, SECRET, {
                noTimestamp: true,
                expiresIn: 60,
            }),
        ],
    ])('%s is refused', (_name, token) => {
        expect(() => verifyAccessToken(token)).toThrow();
    });

    it('a token with every claim passes', () => {
        const token = jwt.sign(
            { sub: '1', role: 'receiver', jti: 'j' },
            SECRET,
            { expiresIn: 60 },
        );

        expect(verifyAccessToken(token).role).toBe('receiver');
    });

    it('a token signed with another algorithm is refused', () => {
        const token = jwt.sign({ sub: '1', role: 'admin' }, SECRET, {
            algorithm: 'HS512',
            expiresIn: 60,
            jwtid: 'j',
        });

        expect(() => verifyAccessToken(token)).toThrow();
    });
});

describe('password', () => {
    it('counts the bcrypt limit in bytes, not characters', () => {
        expect(fitsBcryptLimit('a'.repeat(72))).toBe(true);
        expect(fitsBcryptLimit('ก'.repeat(25))).toBe(false);
    });

    it('refuses to hash an empty password', () => {
        expect(() => hashPassword('')).toThrow('Password must not be empty');
    });

    it('hashes a password that then verifies', async () => {
        const hash = await hashPassword('secret-1');

        await expect(verifyPassword('secret-1', hash)).resolves.toBe(true);
        await expect(verifyPassword('secret-2', hash)).resolves.toBe(false);
    });

    it('an empty password or hash never verifies', async () => {
        await expect(verifyPassword('', 'x')).resolves.toBe(false);
        await expect(verifyPassword('x', '')).resolves.toBe(false);
    });

    it('the dummy hash is made once and reused', async () => {
        const first = await dummyPasswordHash();

        await expect(dummyPasswordHash()).resolves.toBe(first);
    });

    describe('assertCurrentPassword', () => {
        it('passes for the right password', async () => {
            const password = await bcrypt.hash('right', 4);
            db.company.findUnique.mockResolvedValue({ password });

            await expect(assertCurrentPassword(1, 'right')).resolves.toBe(
                undefined,
            );
        });

        it('refuses a wrong password', async () => {
            const password = await bcrypt.hash('right', 4);
            db.company.findUnique.mockResolvedValue({ password });

            await expect(assertCurrentPassword(1, 'wrong')).rejects.toThrow(
                'Current password is incorrect',
            );
        });

        it('refuses a company that is gone, the same way', async () => {
            db.company.findUnique.mockResolvedValue(null);

            await expect(assertCurrentPassword(1, 'any')).rejects.toThrow(
                'Current password is incorrect',
            );
        });
    });

    describe('verifyCredentials', () => {
        it('returns the profile, without the hash, for the right password', async () => {
            const password = await bcrypt.hash('right', 4);
            db.company.findUnique.mockResolvedValue({
                ...companyRow(),
                password,
                deletedAt: null,
            });

            const profile = await verifyCredentials('a@b.test', 'right');

            expect(profile.companyId).toBe(1);
            expect(profile).not.toHaveProperty('password');
            expect(profile).not.toHaveProperty('deletedAt');
        });

        it('an unknown email fails like a wrong password', async () => {
            db.company.findUnique.mockResolvedValue(null);

            await expect(
                verifyCredentials('nobody@b.test', 'x'),
            ).rejects.toThrow('Invalid email or password');
        });

        it('a deleted account fails like a wrong password', async () => {
            const password = await bcrypt.hash('right', 4);
            db.company.findUnique.mockResolvedValue({
                ...companyRow(),
                password,
                deletedAt: new Date(),
            });

            await expect(
                verifyCredentials('a@b.test', 'right'),
            ).rejects.toThrow('Invalid email or password');
        });

        it('a wrong password fails', async () => {
            const password = await bcrypt.hash('right', 4);
            db.company.findUnique.mockResolvedValue({
                ...companyRow(),
                password,
                deletedAt: null,
            });

            await expect(
                verifyCredentials('a@b.test', 'wrong'),
            ).rejects.toThrow('Invalid email or password');
        });
    });
});

describe('roles', () => {
    it('maps each account type to its role', () => {
        expect(accountTypeToRole('PROVIDER')).toBe('provider');
        expect(accountTypeToRole('RECEIVER')).toBe('receiver');
        expect(accountTypeToRole('BOTH')).toBe('both');
        expect(accountTypeToRole('ADMIN')).toBe('admin');
    });

    it('an unknown account type is a 500, not a token with no role', () => {
        expect(() => accountTypeToRole('OWNER' as AccountType)).toThrow(
            'Unknown accountType: OWNER',
        );
    });

    it('BOTH grants provider and receiver; admin grants only admin', () => {
        expect(roleGrants('both')).toEqual(['provider', 'receiver', 'both']);
        expect(roleGrants('admin')).toEqual(['admin']);
    });

    it('knows which account types own a provider or receiver row', () => {
        expect(ownsProviderRow('PROVIDER')).toBe(true);
        expect(ownsProviderRow('BOTH')).toBe(true);
        expect(ownsProviderRow('RECEIVER')).toBe(false);
        expect(ownsReceiverRow('RECEIVER')).toBe(true);
        expect(ownsReceiverRow('BOTH')).toBe(true);
        expect(ownsReceiverRow('PROVIDER')).toBe(false);
    });
});

describe('tokenDenylist', () => {
    it('an already expired token is not stored', async () => {
        await revokeToken('j', now() - 10);

        expect(db.revokedToken.upsert).not.toHaveBeenCalled();
    });

    it('a live token is stored, after old rows are pruned', async () => {
        await revokeToken('j', now() + 600);

        expect(db.revokedToken.deleteMany).toHaveBeenCalled();
        expect(db.revokedToken.upsert).toHaveBeenCalledWith(
            expect.objectContaining({ where: { jti: 'j' } }),
        );
    });

    it('a jti with no row is not revoked', async () => {
        db.revokedToken.findUnique.mockResolvedValue(null);

        await expect(isTokenRevoked('j')).resolves.toBe(false);
    });

    it('a row still in date is revoked; an old one is not', async () => {
        db.revokedToken.findUnique.mockResolvedValueOnce({
            expiresAt: new Date(Date.now() + 60_000),
        });
        db.revokedToken.findUnique.mockResolvedValueOnce({
            expiresAt: new Date(Date.now() - 60_000),
        });

        await expect(isTokenRevoked('j')).resolves.toBe(true);
        await expect(isTokenRevoked('j')).resolves.toBe(false);
    });
});

jest.setTimeout(30_000);
