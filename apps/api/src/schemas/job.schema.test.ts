/*
 * Tests for the duration rule in job.schema.ts.
 *
 * What they cover:
 * - Job duration is free text (ADR 0007), but a negative number such as
 *   "-2" or "-2 weeks" is rejected with "Duration cannot be negative".
 * - Zero, positive values and plain text still pass, on POST and PATCH.
 *
 * Run: npm test (in apps/api).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createJobSchema, updateJobSchema } from './job.schema';

const body = {
    listingTitle: 'Build a site',
    listingDesc: 'A small site',
    maxBudget: 1000,
};

function durationError(duration: string): string | undefined {
    const result = createJobSchema.safeParse({ ...body, duration });
    return result.success ? undefined : result.error.issues[0]?.message;
}

describe('job duration', () => {
    it('rejects a negative number', () => {
        assert.equal(durationError('-2'), 'Duration cannot be negative');
        assert.equal(durationError(' -0.5 '), 'Duration cannot be negative');
        assert.equal(durationError('-2 weeks'), 'Duration cannot be negative');
        assert.equal(durationError('- 3'), 'Duration cannot be negative');
    });

    it('accepts zero, positive values and plain text', () => {
        for (const duration of [
            '0',
            '2',
            '1.5',
            '3 weeks',
            'about 2 months',
            '',
        ]) {
            assert.equal(durationError(duration), undefined, duration);
        }
    });

    it('applies the same rule on PATCH', () => {
        const result = updateJobSchema.safeParse({ duration: '-2' });
        assert.equal(result.success, false);
        assert.equal(
            result.error?.issues[0]?.message,
            'Duration cannot be negative',
        );
    });
});
