/*
 * Tests for validateJobDuration, the duration check on the job form.
 * - Duration is free text (ADR 0007), but a negative number is refused,
 *   matching the API rule in job.schema.ts.
 * - Blank, zero, positive values and plain text pass.
 *
 * Run: node --import tsx --test lib/validation/job.test.ts (in apps/mangodb).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateJobDuration } from './job';

describe('validateJobDuration', () => {
    it('refuses a negative number', () => {
        for (const value of ['-2', ' -0.5', '-2 weeks', '- 3']) {
            assert.equal(
                validateJobDuration(value),
                'Duration cannot be negative',
                value,
            );
        }
    });

    it('accepts blank, zero, positive values and plain text', () => {
        for (const value of [
            undefined,
            '',
            '0',
            '2',
            '3 weeks',
            'about 2 months',
        ]) {
            assert.equal(validateJobDuration(value), null, String(value));
        }
    });

    it('still checks the length first', () => {
        assert.equal(
            validateJobDuration('a'.repeat(101)),
            'Duration cannot exceed 100 characters',
        );
    });
});
