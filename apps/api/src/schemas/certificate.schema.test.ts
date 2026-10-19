/*
 * Tests for the year limits in certificate.schema.ts.
 *
 * What they cover:
 * - "This year" is read when a request is checked, not when the server
 *   started. The limits used to be .max(currentYear()), which ran once at
 *   load, so a server left running over New Year rejected certificates
 *   issued in January. The test loads the schema, then moves the clock a
 *   year ahead, and checks that the new year is allowed.
 *
 * How:
 * - mock.timers moves Date only; nothing else in the schema needs time.
 *
 * Run: npm test (in apps/api).
 */
import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createCertificateSchema } from './certificate.schema';

const body = { certTitle: 'Cloud Architect', organization: 'Mango Academy' };

afterEach(() => mock.timers.reset());

describe('certificate year limits', () => {
    it('allows this year, read when the request is checked', () => {
        const nextYear = new Date().getFullYear() + 1;
        mock.timers.enable({ apis: ['Date'], now: new Date(nextYear, 0, 2) });

        const result = createCertificateSchema.safeParse({
            ...body,
            issueYear: String(nextYear),
        });

        assert.equal(result.success, true);
    });

    it('still refuses an issue year in the future', () => {
        const result = createCertificateSchema.safeParse({
            ...body,
            issueYear: String(new Date().getFullYear() + 1),
        });

        assert.equal(result.success, false);
        assert.equal(
            result.error?.issues[0]?.message,
            'Issue year cannot be in the future',
        );
    });
});
