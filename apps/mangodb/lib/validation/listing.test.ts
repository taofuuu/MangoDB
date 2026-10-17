/*
 * Tests for validateBudgets, the budget rule the service and job forms share.
 * - A job needs a maximum; a service may leave both boxes blank.
 * - Budgets are whole baht, as the API's int4 columns are.
 * - The range is compared only when both sides are valid, so a box never
 *   shows two problems at once.
 *
 * Run: node --import tsx --test lib/validation/listing.test.ts (in apps/mangodb).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateBudgets } from './listing';

describe('validateBudgets', () => {
    it('lets a service leave both boxes blank', () => {
        assert.deepEqual(validateBudgets('', '', { maxRequired: false }), {});
    });

    it('asks a job for a maximum', () => {
        assert.deepEqual(validateBudgets('', '', { maxRequired: true }), {
            maxBudget: 'Maximum budget is required',
        });
    });

    it('refuses a fraction of a baht', () => {
        assert.deepEqual(validateBudgets('10.5', '', { maxRequired: false }), {
            minBudget: 'Minimum budget must be an integer',
        });
    });

    it('puts a reversed range on the minimum', () => {
        assert.deepEqual(validateBudgets('500', '100', { maxRequired: true }), {
            minBudget: 'Minimum budget cannot exceed maximum budget',
        });
    });
});
