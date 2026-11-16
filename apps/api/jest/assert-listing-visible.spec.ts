/*
 * White-box tests for assertListingVisible in lib/listing.ts (demo script,
 * Part 3). The course asks for one backend function at 100% statement
 * coverage, and this one holds the read rule of a listing.
 *
 * Paths through the function:
 * - A missing listing gets 404, with the noun of its kind.
 * - An OPEN listing is returned to anyone.
 * - A non-open listing is returned to its owner only.
 * - A non-open listing gets 404, not 403, for anyone else. That includes a row
 *   with no company, which the column allows.
 *
 * How: lib/prisma is replaced, so loading lib/listing opens no database
 * connection. This function never calls it.
 *
 * Lives outside src/ because `npm test` runs src/**\/*.test.ts with node:test.
 *
 * Run: npm run test:jest (in apps/api).
 */
import { describe, expect, it, jest } from '@jest/globals';
import { ApiError } from '../src/lib/api-error';
import { assertListingVisible } from '../src/lib/listing';

jest.mock('../src/lib/prisma', () => ({ prisma: {} }));

const OWNER = 1;
const OTHER_COMPANY = 2;

function listing(listingStatus: string, companyId: number | null = OWNER) {
    return { listingStatus, companyId };
}

function errorFrom(run: () => unknown): ApiError {
    try {
        run();
    } catch (err) {
        return err as ApiError;
    }
    throw new Error('expected assertListingVisible to throw');
}

describe('assertListingVisible', () => {
    it('WB-01 a missing service gets 404 with the service message', () => {
        const err = errorFrom(() =>
            assertListingVisible(null, OWNER, 'SERVICE'),
        );

        expect(err).toBeInstanceOf(ApiError);
        expect(err.status).toBe(404);
        expect(err.message).toBe('Service not found');
    });

    it('WB-02 a missing job gets 404 with the job message', () => {
        const err = errorFrom(() => assertListingVisible(null, OWNER, 'JOB'));

        expect(err).toBeInstanceOf(ApiError);
        expect(err.status).toBe(404);
        expect(err.message).toBe('Job not found');
    });

    it('WB-03 an OPEN listing is returned to another company', () => {
        const row = listing('OPEN');

        expect(assertListingVisible(row, OTHER_COMPANY, 'SERVICE')).toBe(row);
    });

    it('WB-04 an OPEN listing is returned to its owner', () => {
        const row = listing('OPEN');

        expect(assertListingVisible(row, OWNER, 'JOB')).toBe(row);
    });

    it('WB-05 a CLOSED listing is returned to its owner', () => {
        const row = listing('CLOSED');

        expect(assertListingVisible(row, OWNER, 'JOB')).toBe(row);
    });

    it('WB-06 a CLOSED listing gets 404 for another company', () => {
        const err = errorFrom(() =>
            assertListingVisible(listing('CLOSED'), OTHER_COMPANY, 'JOB'),
        );

        expect(err).toBeInstanceOf(ApiError);
        expect(err.status).toBe(404);
        expect(err.message).toBe('Job not found');
    });

    it('WB-07 a CLOSED listing with no company gets 404', () => {
        const err = errorFrom(() =>
            assertListingVisible(listing('CLOSED', null), OWNER, 'SERVICE'),
        );

        expect(err).toBeInstanceOf(ApiError);
        expect(err.status).toBe(404);
        expect(err.message).toBe('Service not found');
    });
});
